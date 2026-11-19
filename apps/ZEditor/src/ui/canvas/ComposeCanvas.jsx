// The artboard: shows the page at its zoom with its items on top, and routes mouse presses for each tool.

import { MAIN_SCALE } from "../../constants.js";
import { withGroupMates } from "../../model/annotations.js";
import { DEFAULT_RECT_SIZE } from "../../model/rect.js";
import { constrainTo45, snapToGuides } from "../../model/rulers.js";
import { strokeHitTest } from "../../model/strokes.js";
import { resolvePageText } from "../../render/pageText.js";
import { onWrapShapesChange } from "../../render/wrapShapes.js";
import { DRAG_THRESHOLD, dragDeltaFrom, trackPointerDrag } from "../pointer.js";
import { AnnotationItem } from "./AnnotationItem.jsx";
import { MeasureOverlay } from "./MeasureOverlay.jsx";
import { ThreadLinks } from "./ThreadLinks.jsx";
import { BrushCursor, LiveStroke, PageOverlays } from "./CanvasOverlays.jsx";
import { SelectionTurnKnob, selectionTurnFor } from "./SelectionTurn.jsx";
import { magicEraseAt } from "./magicEraseGesture.js";
import { startSoftEraseGesture, topImageAt } from "./softEraseGesture.js";
import { usePageBackground } from "./usePageBackground.js";

const SNAP_PX = 6; // screen px: how close an edge must come to a ruler guide to snap onto it

const { useState, useRef, useEffect } = React;

export function ComposeCanvas({
  pdfDocsRef, page, guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn, tool,
  pageFilter, onionGhostSrc, onionSkinOpacity, pageNumberSpec: numberSpec,
  penColor, penWidth, penTaper, highlighterColor, highlighterWidth, highlighterTaper,
  annotations, selectedAnnId, selectedAnnIds, editingAnnId, croppingAnnId,
  onSelectAnnotation, onSelectAnnotations, onMoveAnnotations, onRotateAnnotations, onAddText, onAddRect, onAddStroke, onUpdateAnnotation, onEraseStroke, onToggleCrop,
  onStartTextEdit, onFinishTextEdit, onLinkNextFrame, onUnlinkNextFrame, snapGuides,
  eraserMode, softEraser, onEraseImagePixels, magicPreview, onMagicClick,
  zoom, rulerUnit,
}) {
  const { canvasRef, canvasSize } = usePageBackground(page, pdfDocsRef, pageFilter);
  const layerRef = useRef(null);
  // An image's wrap shape is read in the background; redraw once it's ready.
  const [, setWrapTick] = useState(0);
  useEffect(() => onWrapShapesChange(() => setWrapTick((t) => t + 1)), []);
  const [dragRect, setDragRect] = useState(null); // the box being dragged out on empty page
  const drawingRef = useRef(null); // in-progress stroke points while the mouse is down
  const [brushPos, setBrushPos] = useState(null); // soft eraser's on-page cursor circle
  const softErasing = tool === "eraser" && eraserMode === "soft";
  const magicErasing = tool === "eraser" && eraserMode === "magic";
  const [, setDrawTick] = useState(0); // bumped on every drawing mousemove to force a repaint
  const [measure, setMeasure] = useState(null); // Measure tool: { a, b, pending } in page px; `pending` = waiting for the second click
  const measureGesture = useRef(null); // the press now being tracked (a stale release must not act)
  const measuring = tool === "measure";
  // A measurement belongs to the page and tool it was made on.
  const pageKey = page && page.key;
  useEffect(() => setMeasure(null), [measuring, pageKey]);
  // Soft eraser: Shift+click an image to aim the brush at it alone (until Shift+click again on it,
  // or on anything else, or the tool, mode or page changes).
  const [eraseTargetId, setEraseTargetId] = useState(null);
  useEffect(() => setEraseTargetId(null), [softErasing, pageKey]);
  const eraseTarget = eraseTargetId !== null && annotations.some((a) => a.id === eraseTargetId && a.type === "image" && !a.hidden && !a.locked) ? eraseTargetId : null;

  function overlayPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  }

  // Ruler guides (ui/canvas/Rulers.jsx), as page px, for snapping onto.
  function guideLinesPx() {
    return snapGuides && snapGuides.length ? {
      x: snapGuides.filter((g) => g.axis === "x").map((g) => g.pos * MAIN_SCALE),
      y: snapGuides.filter((g) => g.axis === "y").map((g) => g.pos * MAIN_SCALE),
    } : null;
  }

  // The point a measurement lands on: under the pointer, pulled onto a close ruler guide (Alt
  // for none), or with Shift onto the nearest 45° line from `from`.
  function measurePoint(ev, from) {
    let p = overlayPoint(ev);
    const lines = guideLinesPx();
    if (lines && !ev.altKey) {
      const snap = snapToGuides({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }, lines, SNAP_PX / zoom);
      p = { x: p.x + snap.dx, y: p.y + snap.dy };
    }
    return ev.shiftKey && from ? constrainTo45(from, p) : p;
  }

  // Measure tool, one click at a time: the 1st click sets point a, the 2nd sets point b (the line
  // and distance appear), the 3rd clears it all, the 4th sets a again, and so on. Pressing and
  // dragging from a to b works too. Once a line is shown, either end can be dragged to adjust.
  function startMeasure(e) {
    e.preventDefault();
    measureGesture.current = null; // so an earlier click's release can't act on this one
    if (measure && measure.pending) { // the 2nd click
      setMeasure({ ...measure, b: measurePoint(e, measure.a), pending: false });
      return;
    }
    if (measure) { // the 3rd click
      setMeasure(null);
      return;
    }
    const a = measurePoint(e, null);
    const gesture = (measureGesture.current = {});
    let moved = false;
    setMeasure({ a, b: a, pending: false });
    trackPointerDrag((ev) => {
      if (measureGesture.current !== gesture) return;
      if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) <= DRAG_THRESHOLD) return;
      moved = true;
      setMeasure({ a, b: measurePoint(ev, a), pending: false });
    }, () => {
      // A plain click (no drag) fixes point a; the next click fixes point b.
      if (!moved && measureGesture.current === gesture) setMeasure({ a, b: a, pending: true });
    });
  }

  function dragMeasureEnd(e, which) {
    e.preventDefault();
    e.stopPropagation();
    const other = which === "a" ? "b" : "a";
    trackPointerDrag((ev) => {
      setMeasure((m) => (m ? { ...m, pending: false, [which]: measurePoint(ev, m[other]) } : m));
    });
  }

  function handleOverlayMouseDown(e) {
    if (!page) return;
    if (measuring) {
      startMeasure(e);
      return;
    }
    if (tool === "pen" || tool === "highlighter") {
      startDrawing(e);
      return;
    }
    if (softErasing && e.shiftKey) { // choose (or let go of) the image the brush is aimed at; no erasing
      e.preventDefault();
      const hit = topImageAt(annotations, overlayPoint(e));
      setEraseTargetId(hit && hit.id !== eraseTarget ? hit.id : null);
      return;
    }
    if (softErasing) {
      startSoftEraseGesture(e, { annotations, softEraser, layerEl: layerRef.current, toPagePoint: overlayPoint, onEraseImagePixels, onlyId: eraseTarget });
      return;
    }
    if (magicErasing) {
      magicEraseAt(e, { annotations, toPagePoint: overlayPoint, onMagicClick });
      return;
    }
    if (tool === "eraser") {
      startStrokeErase(e);
      return;
    }
    // Move, Text or Rectangle tool, pressing empty page (the other tools
    // returned above). A click that ends a text edit does only that.
    e.preventDefault();
    if (editingAnnId !== null) {
      onFinishTextEdit();
      onSelectAnnotation(null);
      return;
    }
    const additive = e.shiftKey;
    if (!additive) onSelectAnnotation(null);
    const start = overlayPoint(e);
    let rect = null;
    trackPointerDrag((ev) => {
      const p = overlayPoint(ev);
      if (!rect && Math.hypot(p.x - start.x, p.y - start.y) * zoom <= DRAG_THRESHOLD) return;
      rect = {
        x: Math.min(start.x, p.x), y: Math.min(start.y, p.y),
        width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y),
      };
      setDragRect(rect);
    }, () => {
      setDragRect(null);
      if (tool === "text") {
        // A click makes a text box that fits its text; a drag sets its width.
        if (rect) onAddText(rect.x, rect.y, Math.max(40, rect.width));
        else onAddText(start.x, start.y);
      } else if (tool === "rect" || tool === "ellipse") {
        onAddRect(rect || {
          ...DEFAULT_RECT_SIZE,
          x: start.x - DEFAULT_RECT_SIZE.width / 2,
          y: start.y - DEFAULT_RECT_SIZE.height / 2,
        });
      } else if (rect) {
        onSelectAnnotations(annotationIdsTouching(rect), additive);
      }
    });
  }

  // Pen/highlighter: collect points while the mouse is down, add the stroke on release.
  function startDrawing(e) {
    const start = overlayPoint(e);
    const color = tool === "highlighter" ? highlighterColor : penColor;
    const width = tool === "highlighter" ? highlighterWidth : penWidth;
    const taper = tool === "highlighter" ? highlighterTaper : penTaper;
    drawingRef.current = { tool, color, width, taper, points: [[start.x, start.y]] };
    setDrawTick((t) => t + 1);
    trackPointerDrag((ev) => {
      const p = overlayPoint(ev);
      drawingRef.current.points.push([p.x, p.y]);
      setDrawTick((t) => t + 1);
    }, () => {
      if (drawingRef.current && drawingRef.current.points.length > 1) {
        onAddStroke({
          tool: drawingRef.current.tool,
          points: drawingRef.current.points,
          color: drawingRef.current.color,
          strokeWidth: drawingRef.current.width,
          taper: drawingRef.current.taper,
        });
      }
      drawingRef.current = null;
      setDrawTick((t) => t + 1);
    });
  }

  // Stroke eraser: removes every unlocked, visible stroke the pointer passes over.
  function startStrokeErase(e) {
    const erasedIds = new Set();
    const tryErase = (pt) => {
      annotations.forEach((a) => {
        if (a.type === "stroke" && !a.hidden && !a.locked && !erasedIds.has(a.id) && strokeHitTest(pt, a)) {
          erasedIds.add(a.id);
          onEraseStroke(a.id);
        }
      });
    };
    tryErase([overlayPoint(e).x, overlayPoint(e).y]);
    trackPointerDrag((ev) => {
      const p = overlayPoint(ev);
      tryErase([p.x, p.y]);
    });
  }

  // Measured from what's on screen, so every item type uses its true
  // drawn shape without each needing its own size calculation.
  function annotationIdsTouching(rect) {
    const page = canvasRef.current.getBoundingClientRect();
    const left = page.left + rect.x * zoom, top = page.top + rect.y * zoom;
    const right = left + rect.width * zoom, bottom = top + rect.height * zoom;
    return [...layerRef.current.querySelectorAll("[data-ann-id]")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.left < right && box.right > left && box.top < bottom && box.bottom > top;
      })
      .map((el) => Number(el.dataset.annId))
      .filter((id) => !annotations.find((a) => a.id === id).locked);
  }

  // The on-page box (page px) around the given items, from where they're drawn.
  function itemsBox(ids) {
    const layer = layerRef.current.getBoundingClientRect();
    let box = null;
    for (const id of ids) {
      const el = layerRef.current.querySelector(`[data-ann-id="${id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const b = { x0: (r.left - layer.left) / zoom, y0: (r.top - layer.top) / zoom, x1: (r.right - layer.left) / zoom, y1: (r.bottom - layer.top) / zoom };
      box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b;
    }
    return box;
  }

  // The shared press on any item: select it, then drag to move the
  // whole selection. `onPlainClick` runs if the press never became a drag.
  function pressAnnotation(e, ann, onPlainClick) {
    e.preventDefault();
    e.stopPropagation();
    if (editingAnnId !== null && editingAnnId !== ann.id) onFinishTextEdit();
    const current = [selectedAnnId, ...selectedAnnIds].filter((id) => id !== null);
    const wasSelected = current.includes(ann.id);
    // Alt + click takes one member out of its group.
    const single = e.altKey && !e.shiftKey && Boolean(ann.groupId);
    if (single) onSelectAnnotation(ann.id, false, true);
    else if (!wasSelected) onSelectAnnotation(ann.id, e.shiftKey);
    // Shift on an item that's already selected: a drag moves the selection (the touch bar's Shift
    // stays on, so a finger couldn't move a selection otherwise); only a tap without dragging takes
    // it out of the selection, at the end of the press below.
    const shiftDeselect = e.shiftKey && wasSelected && !single;
    const mates = withGroupMates(annotations, [ann.id]);
    const movingIds = single ? [ann.id] : wasSelected ? current : e.shiftKey ? [...current, ...mates] : mates;
    const originals = annotations.filter((a) => movingIds.includes(a.id));
    const dragDelta = dragDeltaFrom(e, zoom);
    // Ruler guides (ui/canvas/Rulers.jsx): the moved items' edges and middle snap onto them.
    const guideLines = guideLinesPx();
    const startBox = guideLines ? itemsBox(movingIds) : null;
    let moved = false;
    trackPointerDrag((ev) => {
      let { dx, dy } = dragDelta(ev);
      if (!moved && Math.hypot(dx, dy) * zoom > DRAG_THRESHOLD) moved = true;
      if (moved && startBox && !ev.altKey) { // Alt moves freely
        const snap = snapToGuides({ x0: startBox.x0 + dx, y0: startBox.y0 + dy, x1: startBox.x1 + dx, y1: startBox.y1 + dy }, guideLines, SNAP_PX / zoom);
        dx += snap.dx; dy += snap.dy;
      }
      if (moved) onMoveAnnotations(originals, dx, dy);
    }, () => {
      if (moved) return;
      if (shiftDeselect) { onSelectAnnotation(ann.id, true); return; } // Shift + tap: out of the selection
      // Clicking one member of a group, without dragging, narrows to it.
      if (wasSelected && !e.shiftKey && !single && current.length > 1) onSelectAnnotation(ann.id, false);
      if (onPlainClick) onPlainClick();
    });
  }

  if (!page) {
    return (
      <div className="preview-empty">
        No pages yet — load a PDF or start a new document to get started.
      </div>
    );
  }

  const pageViews = resolvePageText(magicPreview ? annotations.map((a) => (a.id === magicPreview.annId ? { ...a, src: magicPreview.src } : a)) : annotations);
  // A text box being typed in shows its handles too (from the moment it's made), so it can be resized right away.
  const showHandlesFor = (a) => (tool === "select" || a.id === editingAnnId) && a.id === selectedAnnId && selectedAnnIds.length === 0;
  const selectionTurn = selectionTurnFor({ tool, annotations, selectedAnnId, selectedAnnIds, editingAnnId });
  const cursorClass =
    tool === "text" ? "ze-tool-text" :
    (tool === "pen" || tool === "highlighter" || tool === "rect" || tool === "ellipse" || measuring) ? "ze-tool-draw" :
    softErasing || magicErasing ? "ze-tool-soft-erase" : // both work on image pixels: crosshair over everything
    tool === "eraser" ? "ze-tool-erase" : "";

  // The page is scaled visually; this outer box takes up the scaled
  // size, which is what gives the pane something to scroll.
  return (
    <div className="ze-artboard-zoom" style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom }}>
    <div className="ze-page ze-page--rendered" style={{ transform: zoom === 1 ? undefined : `scale(${zoom})`, "--ze-zoom": zoom }}>
      <canvas ref={canvasRef} />
      {onionGhostSrc && (
        <img className="ze-onion-ghost" src={onionGhostSrc} alt="" style={{ opacity: onionSkinOpacity }} />
      )}
      <div
        ref={layerRef}
        className={"ze-annotation-layer " + cursorClass}
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onMouseDown={handleOverlayMouseDown}
        onMouseMove={softErasing ? (e) => setBrushPos(overlayPoint(e)) : undefined}
        onMouseLeave={softErasing ? () => setBrushPos(null) : undefined}
      >
        {/* While the magic eraser has a preview open, that image is drawn from it
            instead of from the document, which stays untouched until Apply. */}
        {/* Text is laid out for the whole page (threaded stories, text wrap: render/pageText.js). */}
        {pageViews.filter((a) => !a.hidden).map((a) => (
          <AnnotationItem
            key={a.id}
            ann={a}
            tool={tool}
            zoom={zoom}
            pageSize={canvasSize}
            pageFilter={pageFilter}
            isSelected={a.id === selectedAnnId || selectedAnnIds.includes(a.id)}
            showHandles={showHandlesFor(a)}
            isEditing={a.id === editingAnnId}
            isCropping={a.id === croppingAnnId}
            isEraseTarget={a.id === eraseTarget}
            onPress={pressAnnotation}
            onUpdate={onUpdateAnnotation}
            onToggleCrop={onToggleCrop}
            onStartTextEdit={onStartTextEdit}
            onFinishTextEdit={onFinishTextEdit}
            onLinkNextFrame={onLinkNextFrame}
          />
        ))}
        <ThreadLinks views={pageViews} pageSize={canvasSize} selectedIds={[selectedAnnId, ...selectedAnnIds]} zoom={zoom} onUnlink={onUnlinkNextFrame} />
        <LiveStroke drawing={drawingRef.current} pageSize={canvasSize} />
        {selectionTurn && (
          <SelectionTurnKnob turn={selectionTurn} zoom={zoom} toPagePoint={overlayPoint} onRotateAnnotations={onRotateAnnotations} />
        )}
        {measuring && measure && <MeasureOverlay measure={measure} pageSize={canvasSize} zoom={zoom} unit={rulerUnit} onHandleDown={dragMeasureEnd} />}
        {softErasing && brushPos && <BrushCursor pos={brushPos} softEraser={softEraser} />}
        {dragRect && (
          <div className="ze-drag-rect" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.width, height: dragRect.height, borderRadius: tool === "ellipse" ? "50%" : undefined }} />
        )}
      </div>
      <PageOverlays
        pageSize={canvasSize}
        numberSpec={numberSpec}
        guidesOn={guidesOn}
        guideFormat={guideFormat}
        guideMarginIn={guideMarginIn}
        guideBleedIn={guideBleedIn}
        centerGuideOn={centerGuideOn}
      />
    </div>
    </div>
  );
}
