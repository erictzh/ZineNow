// The artboard: shows the page at its zoom with its items on top, and routes mouse presses for each tool.

import { withGroupMates } from "../../model/annotations.js";
import { DEFAULT_RECT_SIZE } from "../../model/rect.js";
import { strokeHitTest } from "../../model/strokes.js";
import { DRAG_THRESHOLD, dragDeltaFrom, trackPointerDrag } from "../pointer.js";
import { AnnotationItem } from "./AnnotationItem.jsx";
import { BrushCursor, LiveStroke, PageOverlays } from "./CanvasOverlays.jsx";
import { SelectionTurnKnob, selectionTurnFor } from "./SelectionTurn.jsx";
import { magicEraseAt } from "./magicEraseGesture.js";
import { startSoftEraseGesture } from "./softEraseGesture.js";
import { usePageBackground } from "./usePageBackground.js";

const { useState, useRef } = React;

export function ComposeCanvas({
  pdfDocsRef, page, guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn, tool,
  pageFilter, onionGhostSrc, onionSkinOpacity, pageNumberSpec: numberSpec,
  penColor, penWidth, penTaper, highlighterColor, highlighterWidth, highlighterTaper,
  annotations, selectedAnnId, selectedAnnIds, editingAnnId, croppingAnnId,
  onSelectAnnotation, onSelectAnnotations, onMoveAnnotations, onRotateAnnotations, onAddText, onAddRect, onAddStroke, onUpdateAnnotation, onEraseStroke, onToggleCrop,
  onStartTextEdit, onFinishTextEdit,
  eraserMode, softEraser, onEraseImagePixels, magicPreview, onMagicClick,
  zoom,
}) {
  const { canvasRef, canvasSize } = usePageBackground(page, pdfDocsRef, pageFilter);
  const layerRef = useRef(null);
  const [dragRect, setDragRect] = useState(null); // the box being dragged out on empty page
  const drawingRef = useRef(null); // in-progress stroke points while the mouse is down
  const [brushPos, setBrushPos] = useState(null); // soft eraser's on-page cursor circle
  const softErasing = tool === "eraser" && eraserMode === "soft";
  const magicErasing = tool === "eraser" && eraserMode === "magic";
  const [, setDrawTick] = useState(0); // bumped on every drawing mousemove to force a repaint

  function overlayPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  }

  function handleOverlayMouseDown(e) {
    if (!page) return;
    if (tool === "pen" || tool === "highlighter") {
      startDrawing(e);
      return;
    }
    if (softErasing) {
      startSoftEraseGesture(e, { annotations, softEraser, layerEl: layerRef.current, toPagePoint: overlayPoint, onEraseImagePixels });
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
    else if (e.shiftKey || !wasSelected) onSelectAnnotation(ann.id, e.shiftKey);
    if (e.shiftKey && wasSelected) return; // that press just took it out of the selection
    const mates = withGroupMates(annotations, [ann.id]);
    const movingIds = single ? [ann.id] : wasSelected ? current : e.shiftKey ? [...current, ...mates] : mates;
    const originals = annotations.filter((a) => movingIds.includes(a.id));
    const dragDelta = dragDeltaFrom(e, zoom);
    let moved = false;
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      if (!moved && Math.hypot(dx, dy) * zoom > DRAG_THRESHOLD) moved = true;
      if (moved) onMoveAnnotations(originals, dx, dy);
    }, () => {
      if (moved) return;
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

  const showHandlesFor = (a) => tool === "select" && a.id === selectedAnnId && selectedAnnIds.length === 0;
  const selectionTurn = selectionTurnFor({ tool, annotations, selectedAnnId, selectedAnnIds, editingAnnId });
  const cursorClass =
    tool === "text" ? "ze-tool-text" :
    (tool === "pen" || tool === "highlighter" || tool === "rect" || tool === "ellipse") ? "ze-tool-draw" :
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
        {(magicPreview ? annotations.map((a) => (a.id === magicPreview.annId ? { ...a, src: magicPreview.src } : a)) : annotations).filter((a) => !a.hidden).map((a) => (
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
            onPress={pressAnnotation}
            onUpdate={onUpdateAnnotation}
            onToggleCrop={onToggleCrop}
            onStartTextEdit={onStartTextEdit}
            onFinishTextEdit={onFinishTextEdit}
          />
        ))}
        <LiveStroke drawing={drawingRef.current} pageSize={canvasSize} />
        {selectionTurn && (
          <SelectionTurnKnob turn={selectionTurn} zoom={zoom} toPagePoint={overlayPoint} onRotateAnnotations={onRotateAnnotations} />
        )}
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
