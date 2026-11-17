// The artboard: lays out the page's items and routes mouse input for each tool.

import { MAIN_SCALE } from "../../constants.js";
import { withGroupMates } from "../../model/annotations.js";
import { blendOf } from "../../model/controls.js";
import { DEFAULT_RECT_SIZE } from "../../model/rect.js";
import { SOFT_ERASER_DABS_PER_RADIUS } from "../../model/softEraser.js";
import { smoothPathD, strokeHitTest, taperedPathD } from "../../model/strokes.js";
import { loadImageElement } from "../../render/drawImage.js";
import { applyPageFilter } from "../../render/filters/applyFilter.js";
import { annotationBounds } from "../../render/itemGeometry.js";
import { docFor } from "../../render/pageRender.js";
import { imagePixelAt, stampSoftErase } from "../../render/softErase.js";
import { AnnotationImage } from "./AnnotationImage.jsx";
import { AnnotationRect } from "./AnnotationRect.jsx";
import { AnnotationText } from "./AnnotationText.jsx";
import { GuidesOverlay } from "./GuidesOverlay.jsx";
import { StrokeShape } from "./StrokeShape.jsx";
import { DRAG_THRESHOLD, dragDeltaFrom, trackPointerDrag } from "../pointer.js";
const { useState, useRef, useEffect } = React;

// ---- Compose canvas — renders the selected page at full size, plus
// the annotation layer (images + text boxes + freehand strokes) on
// top of it.
export function ComposeCanvas({
  pdfDocsRef, page, guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn, tool,
  pageFilter, onionGhostSrc, onionSkinOpacity, pageNumberSpec: numberSpec,
  penColor, penWidth, penTaper, highlighterColor, highlighterWidth, highlighterTaper,
  annotations, selectedAnnId, selectedAnnIds, editingAnnId, croppingAnnId,
  onSelectAnnotation, onSelectAnnotations, onMoveAnnotations, onRotateAnnotations, onAddText, onAddRect, onAddStroke, onUpdateAnnotation, onEraseStroke, onToggleCrop,
  onStartTextEdit, onFinishTextEdit,
  eraserMode, softEraser, onEraseImagePixels,
  zoom,
}) {
  const canvasRef = useRef(null);
  const layerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragRect, setDragRect] = useState(null); // the box being dragged out on empty page
  const drawingRef = useRef(null); // in-progress stroke points while the mouse is down
  const [brushPos, setBrushPos] = useState(null); // soft eraser's on-page cursor circle
  const softErasing = tool === "eraser" && eraserMode === "soft";
  const [drawTick, setDrawTick] = useState(0); // bumped on every drawing mousemove to force a repaint

  useEffect(() => {
    if (!page) return;
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      let w, h;
      if (page.isBlank) {
        const swapped = page.rotation % 180 !== 0;
        w = Math.round((swapped ? page.height : page.width) * MAIN_SCALE);
        h = Math.round((swapped ? page.width : page.height) * MAIN_SCALE);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      } else {
        const doc = docFor(pdfDocsRef, page);
        if (!doc) return;
        const pdfPage = await doc.getPage(page.pageNumber);
        const viewport = pdfPage.getViewport({ scale: MAIN_SCALE, rotation: page.rotation });
        if (cancelled) return;
        w = viewport.width;
        h = viewport.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      }
      if (cancelled) return;
      applyPageFilter(canvas.getContext("2d"), canvas, pageFilter, 1); // background only, same as Export
      setCanvasSize({ width: w, height: h });
    })();
    return () => { cancelled = true; };
  }, [page && page.key, page && page.rotation, pageFilter]);

  function overlayPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  }

  function handleOverlayMouseDown(e) {
    if (!page) return;
    if (tool === "pen" || tool === "highlighter") {
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
      return;
    }
    if (softErasing) {
      startSoftErase(e);
      return;
    }
    if (tool === "eraser") {
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

  // A soft-eraser swipe works on one image: the topmost one under the
  // pointer when the swipe first reaches an image. The image is copied
  // to a canvas, erased there (shown in place of the image while
  // dragging), and saved back as one undo step on release.
  function startSoftErase(e) {
    e.preventDefault();
    const { size, softness, strength } = softEraser;
    const dabAlpha = 1 - Math.pow(1 - strength / 100, 1 / SOFT_ERASER_DABS_PER_RADIUS);
    const session = { ann: null, canvas: null, ctx: null, img: null, last: null, pending: [], touched: false, done: false };

    function pickImage(p) {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        if (a.type === "image" && !a.hidden && !a.locked && imagePixelAt(a, p.x, p.y).inside) return a;
      }
      return null;
    }

    function dab(p) {
      const hit = imagePixelAt(session.ann, p.x, p.y);
      stampSoftErase(session.ctx, hit.x, hit.y, size / 2 * hit.scaleX, size / 2 * hit.scaleY, softness, dabAlpha);
      session.touched = true;
    }

    // Dabs spaced along the path from the last one, so a fast swipe
    // still leaves a smooth line rather than separate spots.
    function eraseTo(p) {
      if (!session.last) { dab(p); session.last = p; return; }
      const step = Math.max(0.5, size / 2 / SOFT_ERASER_DABS_PER_RADIUS);
      const from = session.last;
      const dist = Math.hypot(p.x - from.x, p.y - from.y);
      if (dist < step) return;
      const n = Math.floor(dist / step);
      for (let k = 1; k <= n; k++) {
        const t = (k * step) / dist;
        dab({ x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t });
      }
      const t = (n * step) / dist;
      session.last = { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t };
    }

    async function begin(ann) {
      const source = await loadImageElement(ann.src);
      const canvas = document.createElement("canvas");
      canvas.width = ann.naturalWidth;
      canvas.height = ann.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      session.canvas = canvas;
      session.ctx = ctx;
      // Live view: the working canvas sits exactly where the <img> is.
      // (A filtered image draws through its own canvas; it updates on release.)
      const img = layerRef.current && layerRef.current.querySelector(`[data-ann-id="${ann.id}"] .ze-ann-image-frame > img`);
      if (img) {
        canvas.style.cssText = img.style.cssText;
        canvas.style.pointerEvents = "none";
        img.parentNode.insertBefore(canvas, img.nextSibling);
        img.style.visibility = "hidden";
        session.img = img;
      }
      session.pending.forEach(eraseTo);
      session.pending = [];
      if (session.done) finish();
    }

    function handlePoint(p) {
      if (!session.ann) {
        const ann = pickImage(p);
        if (!ann) return;
        session.ann = ann;
        session.pending.push(p);
        begin(ann).catch(() => { session.ann = null; });
        return;
      }
      if (!session.ctx) { session.pending.push(p); return; }
      eraseTo(p);
    }

    function finish() {
      const { canvas, img, ann } = session;
      if (!canvas) return;
      if (session.touched) onEraseImagePixels(ann.id, canvas.toDataURL("image/png"));
      if (!img) return;
      // Keep the live canvas up until the <img> shows the erased
      // picture, so the old one doesn't flash in between.
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        canvas.remove();
        img.style.visibility = "";
      };
      if (!session.touched) { cleanup(); return; }
      img.addEventListener("load", cleanup, { once: true });
      setTimeout(cleanup, 1500);
    }

    handlePoint(overlayPoint(e));
    trackPointerDrag((ev) => handlePoint(overlayPoint(ev)), () => {
      session.done = true;
      if (session.ctx) finish();
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

  // Strokes and groups have no rotate knob of their own (a box does), so a
  // selection of several items, or of one stroke, gets one here, turning
  // everything about the middle of the whole selection.
  const selectedItems = tool === "select"
    ? annotations.filter((a) => (a.id === selectedAnnId || selectedAnnIds.includes(a.id)) && !a.hidden && !a.locked)
    : [];
  const needsSelectionKnob = selectedItems.length > 1 || (selectedItems.length === 1 && selectedItems[0].type === "stroke");
  let selectionTurn = null;
  if (needsSelectionKnob && !editingAnnId) {
    const bounds = selectedItems.map(annotationBounds);
    const x0 = Math.min(...bounds.map((b) => b.x)), y0 = Math.min(...bounds.map((b) => b.y));
    const x1 = Math.max(...bounds.map((b) => b.x + b.width)), y1 = Math.max(...bounds.map((b) => b.y + b.height));
    selectionTurn = { items: selectedItems, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function startSelectionTurn(e) {
    e.preventDefault();
    e.stopPropagation();
    const { items, cx, cy } = selectionTurn;
    const pointerAngle = (ev) => { const p = overlayPoint(ev); return Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI; };
    const startAngle = pointerAngle(e);
    trackPointerDrag((ev) => {
      let delta = pointerAngle(ev) - startAngle;
      delta = ev.shiftKey ? Math.round(delta / 15) * 15 : delta;
      onRotateAnnotations(items, delta, cx, cy);
    });
  }
  const cursorClass =
    tool === "text" ? "ze-tool-text" :
    (tool === "pen" || tool === "highlighter" || tool === "rect" || tool === "ellipse") ? "ze-tool-draw" :
    softErasing ? "ze-tool-soft-erase" :
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
        {annotations.filter((a) => !a.hidden).map((a) => {
          const isSelected = a.id === selectedAnnId || selectedAnnIds.includes(a.id);
          if (a.type === "image") {
            return (
              <AnnotationImage
                key={a.id}
                ann={a}
                tool={tool}
                isSelected={isSelected}
                showHandles={showHandlesFor(a)}
                isCropping={a.id === croppingAnnId}
                onPress={pressAnnotation}
                onUpdate={onUpdateAnnotation}
                onToggleCrop={onToggleCrop}
                pageFilter={pageFilter}
                zoom={zoom}
              />
            );
          }
          if (a.type === "rect") {
            return (
              <AnnotationRect
                key={a.id}
                ann={a}
                tool={tool}
                isSelected={isSelected}
                showHandles={showHandlesFor(a)}
                onPress={pressAnnotation}
                onUpdate={onUpdateAnnotation}
                zoom={zoom}
              />
            );
          }
          if (a.type === "text") {
            return (
              <AnnotationText
                key={a.id}
                ann={a}
                tool={tool}
                isSelected={isSelected}
                isEditing={a.id === editingAnnId}
                showHandles={showHandlesFor(a)}
                onPress={pressAnnotation}
                onStartEdit={onStartTextEdit}
                onFinishEdit={onFinishTextEdit}
                onUpdate={onUpdateAnnotation}
                zoom={zoom}
              />
            );
          }
          return (
            <svg key={a.id} className="ze-stroke-svg" width={canvasSize.width} height={canvasSize.height} style={blendOf(a) !== "normal" ? { mixBlendMode: blendOf(a) } : undefined}>
              <StrokeShape ann={a} tool={tool} isSelected={isSelected} onPress={pressAnnotation} />
            </svg>
          );
        })}
        <svg className="ze-stroke-svg" width={canvasSize.width} height={canvasSize.height}>
          {drawingRef.current && (drawingRef.current.taper > 0 ? (
            <path
              d={taperedPathD(drawingRef.current.points, drawingRef.current.width, drawingRef.current.taper)}
              fill={drawingRef.current.color}
              fillOpacity={drawingRef.current.tool === "highlighter" ? 0.45 : 1}
              stroke="none"
            />
          ) : (
            <path
              d={smoothPathD(drawingRef.current.points)}
              fill="none"
              stroke={drawingRef.current.color}
              strokeWidth={drawingRef.current.width}
              strokeOpacity={drawingRef.current.tool === "highlighter" ? 0.45 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {selectionTurn && (
          <React.Fragment>
            {selectionTurn.items.length > 1 && (
              <div className="ze-group-outline" style={{ left: selectionTurn.box.x, top: selectionTurn.box.y, width: selectionTurn.box.width, height: selectionTurn.box.height }} />
            )}
            <div
              className="ze-rotate-handle"
              title="Rotate the selection (hold Shift to snap to 15°)"
              style={{ left: selectionTurn.cx, top: selectionTurn.box.y - 22 / zoom }}
              onMouseDown={startSelectionTurn}
            />
          </React.Fragment>
        )}
        {softErasing && brushPos && (
          <div className="ze-brush-cursor" style={{ left: brushPos.x, top: brushPos.y, width: softEraser.size, height: softEraser.size }}>
            {softEraser.softness > 0 && softEraser.softness < 100 && (
              <div className="ze-brush-cursor-core" style={{ width: `${100 - softEraser.softness}%`, height: `${100 - softEraser.softness}%` }} />
            )}
          </div>
        )}
        {dragRect && (
          <div className="ze-drag-rect" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.width, height: dragRect.height, borderRadius: tool === "ellipse" ? "50%" : undefined }} />
        )}
      </div>
      {numberSpec && canvasSize.width > 0 && (
        // Shows where the page number will print; the real one is drawn at Export.
        <div
          className="ze-page-number"
          style={{
            fontSize: numberSpec.size * MAIN_SCALE,
            color: numberSpec.color,
            [numberSpec.vertical]: numberSpec.marginIn * 72 * MAIN_SCALE,
            ...(numberSpec.horizontal === "center"
              ? { left: 0, right: 0, textAlign: "center" }
              : { [numberSpec.horizontal]: numberSpec.marginIn * 72 * MAIN_SCALE }),
          }}
        >{numberSpec.text}</div>
      )}
      {guidesOn && canvasSize.width > 0 && (
        <GuidesOverlay
          width={canvasSize.width}
          height={canvasSize.height}
          format={guideFormat}
          marginIn={guideMarginIn}
          bleedIn={guideBleedIn}
        />
      )}
      {centerGuideOn && canvasSize.width > 0 && (
        // The page's vertical middle — where a two-page spread folds.
        // Editor-only, like the other guides; never drawn into Export.
        <svg className="ze-guides-overlay" width={canvasSize.width} height={canvasSize.height} aria-hidden="true">
          <line
            x1={canvasSize.width / 2} y1={0} x2={canvasSize.width / 2} y2={canvasSize.height}
            stroke="#1d9bf0" strokeDasharray="6 4" strokeWidth="1.25"
          />
        </svg>
      )}
    </div>
    </div>
  );
}
