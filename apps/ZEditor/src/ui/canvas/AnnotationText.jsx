// One text box on the page: typing, display, resize.

import { rgbaCss } from "../../model/color.js";
import { angleOf, blendOf, controlValues, opacityOf } from "../../model/controls.js";
import { MIN_RESIZE_SIZE, resizedBox, rotatePoint } from "../../model/geometry.js";
import { SHADOW_EFFECT } from "../../model/imageEffects.js";
import { adjustRunsForEdit, colorSegments } from "../../model/text/colorRuns.js";
import { AUTO_TEXT_MAX_WIDTH, TEXT_BORDER_PX } from "../../model/text/textControls.js";
import { photoPlacement, pxToPt, textGradientView, textLook, usesCanvasText, usesTypeset } from "../../model/text/textLook.js";
import { drawTextOnCanvas } from "../../render/drawText.js";
import { rectFillCss } from "../../render/gradients.js";
import { caretRect, indexAtPoint, lineEndAt, lineStartAt, moveVertical, paragraphRangeAt, selectionRects, wordRangeAt } from "../../render/textCaret.js";
import { layoutTextBox, measureTextBox, textCanvasMargin } from "../../render/textLayout.js";
import { rotationCss } from "./boxStyles.js";
import { ResizeHandles, TEXT_RESIZE_HANDLES } from "./ResizeHandles.jsx";
import { dragDeltaFrom, textOffsetAtPoint, trackPointerDrag } from "../pointer.js";
import { textSelectionStore } from "../textSelection.js";
const { useRef, useState, useMemo, useEffect, useLayoutEffect } = React;

// ---- One text annotation --------------------------------------------
// The text itself always lays out the box. While editing it's hidden
// and a transparent <textarea> fills that same box, so typing looks
// exactly like the finished text and the box grows as it would.
// CSS for one stretch of the editing mirror: a custom span's colour and its own underline / strike-through.
function spanCss(seg) {
  const span = seg.span || {};
  if (!seg.color && span.underline == null && span.strike == null) return undefined;
  const lines = [span.underline && "underline", span.strike && "line-through"].filter(Boolean);
  return { color: seg.color || undefined, textDecorationLine: span.underline != null || span.strike != null ? (lines.join(" ") || "none") : undefined };
}

export function AnnotationText({ ann, tool, isSelected, isEditing, showHandles, zoom, onPress, onStartEdit, onFinishEdit, onUpdate, onLinkNext }) {
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const pendingCaretRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const dragRef = useRef(null);      // an in-progress mouse selection in a typeset box: { anchor }
  const goalXRef = useRef(null);     // the column an Up/Down run keeps to
  const [sel, setSel] = useState({ start: 0, end: 0, dir: "forward" }); // selection shown by the typeset caret

  useLayoutEffect(() => {
    if (!isEditing || !inputRef.current) return;
    const caret = pendingCaretRef.current != null ? pendingCaretRef.current : ann.text.length;
    pendingCaretRef.current = null;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(caret, caret);
  }, [isEditing]);

  function startEditingAt(x, y) {
    pendingCaretRef.current = textOffsetAtPoint(x, y, boxRef.current, ann.text.length);
    onStartEdit(ann.id);
  }

  function handleMouseDown(e) {
    if (isEditing) { e.preventDefault(); e.stopPropagation(); return; } // keeps the typing focus
    if (tool !== "select" && tool !== "text") return; // other tools (pen/highlighter/etc.) work straight through text boxes
    const { clientX, clientY } = e;
    onPress(e, ann, () => { if (tool === "text") startEditingAt(clientX, clientY); });
  }

  function startResize(handle, e) {
    const orig = { x: ann.x, y: ann.y, width: boxRef.current.offsetWidth, height: boxRef.current.offsetHeight };
    const origFontSize = ann.fontSize || 16;
    const hasSetWidth = Boolean(ann.width);
    const angle = angleOf(ann);
    const dragDelta = dragDeltaFrom(e, zoom, angle);
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      if (handle === "s" || handle === "n") {
        // The top / bottom middle handles make the box a fixed-height frame: the dragged edge sets its
        // height (in pt) and the opposite edge stays put.
        const box = resizedBox(orig, handle, dx, dy, false, MIN_RESIZE_SIZE, angle);
        onUpdate(ann.id, { x: box.x, y: box.y, frameHeight: Math.max(1, Math.round(pxToPt(box.height))) });
        return;
      }
      if (handle === "e" || handle === "w") {
        const box = resizedBox(orig, handle, dx, dy, false, MIN_RESIZE_SIZE, angle);
        onUpdate(ann.id, { x: box.x, y: box.y, width: box.width });
        return;
      }
      // Corners scale the text; the box's width scales along with it.
      const box = resizedBox(orig, handle, dx, dy, true, MIN_RESIZE_SIZE, angle);
      const scaled = { x: box.x, y: box.y, fontSize: Math.max(6, Math.round(origFontSize * box.width / orig.width)) };
      onUpdate(ann.id, hasSetWidth ? { ...scaled, width: box.width } : scaled);
    });
  }

  const look = textLook(ann);
  const hasLetterColors = Boolean(ann.colorRuns && ann.colorRuns.length);

  function rememberSelection(input) {
    textSelectionStore.annId = ann.id;
    textSelectionStore.start = input.selectionStart;
    textSelectionStore.end = input.selectionEnd;
  }

  // Ransom lettering and distress are drawn on a canvas by Export's own
  // text renderer, so what you see is exactly what exports. (Plain text
  // is shown while typing.) The box is sized from that renderer's layout,
  // and the canvas extends past it for strokes, shadows and tilted letters.
  // A justified / indented box (see usesTypeset) stays on the canvas while it's edited, with
  // its own caret and selection, so the text doesn't reflow when you start typing.
  const typesetEditing = isEditing && usesTypeset(ann);
  // A frame of a threaded story keeps its size even with no text in it yet.
  const storyFrame = ann.storyHeadId != null;
  const canvasMode = usesCanvasText(ann) && (!isEditing || typesetEditing) && (Boolean(ann.text) || typesetEditing || storyFrame);
  const liveBox = canvasMode ? measureTextBox(ann) : null;
  const canvasMargin = canvasMode ? textCanvasMargin(ann, look) : 0;
  const liveDrawKey = canvasMode
    ? JSON.stringify({ ...ann, x: 0, y: 0, angle: 0, id: 0, locked: undefined, hidden: undefined, name: undefined, blend: undefined, opacity: undefined })
    : "";
  const typesetLayout = useMemo(() => (typesetEditing ? layoutTextBox(ann) : null), [typesetEditing ? liveDrawKey : ""]);

  function syncSel(input) {
    setSel({ start: input.selectionStart, end: input.selectionEnd, dir: input.selectionDirection || "forward" });
    rememberSelection(input);
  }
  // Selects [anchor..focus] in the hidden input (a backward range when focus < anchor).
  function setRange(input, anchor, focus) {
    input.setSelectionRange(Math.min(anchor, focus), Math.max(anchor, focus), focus < anchor ? "backward" : "forward");
    syncSel(input);
  }
  const pointOf = (e) => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  function handleSurfaceDown(e) {
    if (e.button !== 0 || !typesetLayout || !inputRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const input = inputRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = pointOf(e);
    const index = indexAtPoint(typesetLayout, x, y);
    input.focus();
    const backward = input.selectionDirection === "backward";
    const anchor = e.shiftKey ? (backward ? input.selectionEnd : input.selectionStart) : index;
    dragRef.current = { anchor };
    goalXRef.current = null;
    setRange(input, anchor, index);
  }
  function handleSurfaceMove(e) {
    if (!dragRef.current || !typesetLayout || !inputRef.current) return;
    const { x, y } = pointOf(e);
    setRange(inputRef.current, dragRef.current.anchor, indexAtPoint(typesetLayout, x, y));
  }
  function handleSurfaceUp(e) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function handleSurfaceDoubleClick(e) {
    if (!typesetLayout || !inputRef.current) return;
    e.stopPropagation();
    const { x, y } = pointOf(e);
    const [s, end] = wordRangeAt(ann.text, indexAtPoint(typesetLayout, x, y));
    setRange(inputRef.current, s, end);
  }
  function handleSurfaceClick(e) {
    if (e.detail < 3 || !typesetLayout || !inputRef.current) return;
    const { x, y } = pointOf(e);
    const [s, end] = paragraphRangeAt(ann.text, indexAtPoint(typesetLayout, x, y));
    setRange(inputRef.current, s, end);
  }
  // Up/Down/Home/End follow the composed lines, not the (hidden) input's own wrapping.
  function handleTypesetKey(e) {
    if (!typesetEditing || !typesetLayout || e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.target;
    const backward = input.selectionDirection === "backward";
    const anchor = backward ? input.selectionEnd : input.selectionStart;
    const focus = backward ? input.selectionStart : input.selectionEnd;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const goal = goalXRef.current != null ? goalXRef.current : caretRect(typesetLayout, focus).x;
      goalXRef.current = goal;
      const target = moveVertical(typesetLayout, focus, e.key === "ArrowUp" ? -1 : 1, goal, ann.text.length);
      setRange(input, e.shiftKey ? anchor : target, target);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      goalXRef.current = null;
      const target = e.key === "Home" ? lineStartAt(typesetLayout, focus) : lineEndAt(typesetLayout, focus);
      setRange(input, e.shiftKey ? anchor : target, target);
      return;
    }
    goalXRef.current = null;
  }

  useEffect(() => {
    if (!canvasMode) return undefined;
    let cancelled = false;
    (async () => {
      const scale = Math.min(4, Math.max(1, zoom * (window.devicePixelRatio || 1)));
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.ceil((liveBox.width + canvasMargin * 2) * scale);
      offscreen.height = Math.ceil((liveBox.height + canvasMargin * 2) * scale);
      // The box turns with CSS, which would also turn a shadow painted
      // into the canvas; the direction is pre-turned so it stays fixed on the page.
      const shadowDirection = controlValues(ann, SHADOW_EFFECT.controls).shadowDirection - angleOf(ann);
      await drawTextOnCanvas(offscreen.getContext("2d"), { ...ann, x: canvasMargin, y: canvasMargin, angle: 0, shadowDirection }, scale);
      const canvas = liveCanvasRef.current;
      if (cancelled || !canvas) return;
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      canvas.getContext("2d").drawImage(offscreen, 0, 0);
    })();
    return () => { cancelled = true; };
  }, [liveDrawKey, zoom, canvasMode, typesetEditing]); // typesetEditing: the canvas element is replaced when editing starts or ends

  const decorations = [ann.underline && "underline", look.strike !== "none" && "line-through"].filter(Boolean);
  const style = {
    left: ann.x,
    top: ann.y,
    fontFamily: ann.fontFamily ? `'${ann.fontFamily}', sans-serif` : undefined,
    fontSize: (ann.fontSize || 16) + "px",
    fontWeight: ann.bold ? 700 : 400,
    fontStyle: ann.italic ? "italic" : "normal",
    lineHeight: look.lineHeight,
    letterSpacing: look.letterSpacingPx ? look.letterSpacingPx + "px" : undefined,
    textTransform: { upper: "uppercase", lower: "lowercase", title: "capitalize" }[look.textCase],
    fontVariantCaps: look.textCase === "small" ? "small-caps" : undefined,
    textDecorationLine: decorations.length ? decorations.join(" ") : "none",
    textDecorationStyle: look.strike === "double" || look.strike === "wavy" ? look.strike : "solid",
    textDecorationColor: look.color,
    color: ann.color,
    textAlign: ann.align || "left",
    padding: `${look.padY}px ${look.padX}px`,
    mixBlendMode: blendOf(ann) !== "normal" ? blendOf(ann) : undefined,
    opacity: opacityOf(ann) < 1 ? opacityOf(ann) : undefined, // the whole box, like Export's layer (drawAnnotation.js)
    transform: rotationCss(ann),
  };
  if (look.label && !canvasMode) {
    style.background = rgbaCss(look.label.labelColor, look.label.labelAlpha);
    style.borderRadius = look.label.labelRadius;
  }
  if (ann.width) style.width = ann.width;
  else style.maxWidth = AUTO_TEXT_MAX_WIDTH;
  if (canvasMode) {
    style.width = liveBox.width;
    style.height = liveBox.height;
    style.maxWidth = undefined;
    style.color = "transparent";
  }

  // Fill, stroke and shadow go on an inner block rather than the box, so
  // the label background isn't clipped away by a gradient fill and the
  // gradient spans the text area. They're left off while typing, which
  // shows plain text in the box's own colour.
  // backgroundImage, not the `background` shorthand: when only the
  // colours change, React re-sets just that property, and the
  // shorthand would reset background-clip and fill the whole box.
  const gradientStyle = look.gradient ? {
    backgroundImage: rectFillCss(textGradientView(ann, look)),
    WebkitBackgroundClip: "text", backgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } : null;
  const fillStyle = {};
  if (look.photo) {
    const area = measureTextBox(ann);
    const place = photoPlacement(look.photo, area.contentWidth, area.contentHeight);
    Object.assign(fillStyle, {
      backgroundImage: `url("${look.photo.src}")`,
      backgroundSize: `${place.width}px ${place.height}px`,
      backgroundPosition: `${place.left}px ${place.top}px`,
      backgroundRepeat: "no-repeat",
      WebkitBackgroundClip: "text", backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      // Fades only the photo letters: when faded, this block is always the
      // copy laid over the text-colour copy (see `layered`).
      opacity: look.photo.fillPhotoAlpha < 100 ? look.photo.fillPhotoAlpha / 100 : undefined,
    });
  } else if (gradientStyle) {
    Object.assign(fillStyle, gradientStyle);
  } else if (look.fillAlpha < 100) {
    fillStyle.color = rgbaCss(look.color, look.fillAlpha);
  }
  const outlineStyle = {};
  if (look.stroke) {
    outlineStyle.WebkitTextStroke = `${look.stroke.strokeThickness}px ${look.stroke.strokeColor}`;
    outlineStyle.paintOrder = "stroke fill";
  }
  if (look.shadow) {
    // Drawn inside the rotated box, so the offset is turned back: the
    // light stays fixed on the page, as in Export. Faded with the fill, as Export's is.
    const [shadowX, shadowY] = rotatePoint(look.shadow.x, look.shadow.y, -angleOf(ann));
    outlineStyle.textShadow = `${shadowX}px ${shadowY}px ${look.shadow.blur}px ${rgbaCss(look.shadow.color, look.fillAlpha)}`;
  }
  // A gradient is a background clipped to the letters, and browsers paint
  // a text's stroke and shadow on top of such a background, which would
  // bury the gradient. So with a gradient the outline and shadow go on a
  // copy of the text underneath and the gradient copy sits on top, as in
  // Export (stroke first, fill over it).
  // A faded photo also needs a copy underneath in the text's own fill
  // (its gradient, or its colour), so that shows through the photo
  // rather than the page.
  const fadedPhoto = Boolean(look.photo && look.photo.fillPhotoAlpha < 100);
  const baseFillStyle = fadedPhoto ? (gradientStyle || { color: rgbaCss(look.color, look.fillAlpha) }) : null;
  const layered = Boolean((look.gradient || look.photo) && (look.stroke || look.shadow || fadedPhoto) && ann.text);
  const bodyStyle = layered ? { display: "block", position: "relative" } : { display: "block", ...fillStyle, ...outlineStyle };

  return (
    <div
      ref={boxRef}
      data-ann-id={ann.id}
      className={"ze-ann-text" + (isSelected ? " is-selected" : "") + (isEditing ? " is-editing" : "") + (ann.locked ? " is-locked" : "") + (storyFrame ? " is-story-frame" : "")}
      style={style}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (tool === "select" && !isEditing) startEditingAt(e.clientX, e.clientY);
      }}
    >
      {typesetEditing && typesetLayout ? (
        <React.Fragment>
          <canvas
            ref={liveCanvasRef}
            className="ze-ann-text-canvas"
            style={{ left: -(canvasMargin + TEXT_BORDER_PX), top: -(canvasMargin + TEXT_BORDER_PX), width: liveBox.width + canvasMargin * 2, height: liveBox.height + canvasMargin * 2 }}
          />
          {/* The caret and selection are drawn from the composer's own lines. The real
              <textarea> below stays invisible: it only receives typing, IME input and the clipboard. */}
          <div
            className="ze-typeset-surface"
            style={{ left: -TEXT_BORDER_PX, top: -TEXT_BORDER_PX, width: liveBox.width, height: liveBox.height }}
            onPointerDown={handleSurfaceDown}
            onPointerMove={handleSurfaceMove}
            onPointerUp={handleSurfaceUp}
            onPointerCancel={handleSurfaceUp}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDoubleClick={handleSurfaceDoubleClick}
            onClick={handleSurfaceClick}
          >
            {selectionRects(typesetLayout, sel.start, sel.end).map((r, i) => (
              <div key={i} className="ze-typeset-selection" style={{ left: r.x, top: r.y, width: r.width, height: r.height }} />
            ))}
            {sel.start === sel.end && (() => {
              const c = caretRect(typesetLayout, sel.end);
              return <div key={sel.end + ":" + ann.text.length} className="ze-typeset-caret" style={{ left: c.x, top: c.y, height: c.height, background: ann.color || "#1a1a1a" }} />;
            })()}
          </div>
          <textarea
            ref={inputRef}
            className="ze-ann-text-input ze-typeset-input"
            value={ann.text}
            spellCheck="false"
            onChange={(e) => {
              const text = e.target.value;
              const patch = { text };
              if (hasLetterColors) patch.colorRuns = adjustRunsForEdit(ann.colorRuns, ann.text, text);
              goalXRef.current = null;
              syncSel(e.target);
              onUpdate(ann.id, patch);
            }}
            onSelect={(e) => syncSel(e.target)}
            onFocus={(e) => syncSel(e.target)}
            onBlur={(e) => { rememberSelection(e.target); onFinishEdit(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.stopPropagation(); onFinishEdit(); return; }
              handleTypesetKey(e);
            }}
          />
        </React.Fragment>
      ) : isEditing ? (
        <React.Fragment>
          {/* The zero-width space gives a trailing blank line some height. */}
          {/* With recoloured letters the mirror is shown (in their colours)
              under a see-through textarea, which keeps the caret and selection. */}
          <span className={"ze-ann-text-mirror" + (hasLetterColors ? " is-visible" : "")}>
            {hasLetterColors
              ? colorSegments(ann.text + "​", ann.colorRuns).map((seg, i) => <span key={i} style={spanCss(seg)}>{seg.text}</span>)
              : ann.text + "​"}
          </span>
          <textarea
            ref={inputRef}
            className="ze-ann-text-input"
            style={hasLetterColors ? { color: "transparent", caretColor: ann.color } : undefined}
            value={ann.text}
            spellCheck="false"
            onChange={(e) => {
              const text = e.target.value;
              const patch = { text };
              if (hasLetterColors) patch.colorRuns = adjustRunsForEdit(ann.colorRuns, ann.text, text);
              rememberSelection(e.target);
              onUpdate(ann.id, patch);
            }}
            onSelect={(e) => rememberSelection(e.target)}
            onBlur={(e) => { rememberSelection(e.target); onFinishEdit(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.stopPropagation(); onFinishEdit(); }
            }}
          />
        </React.Fragment>
      ) : canvasMode ? (
        <canvas
          ref={liveCanvasRef}
          className="ze-ann-text-canvas"
          style={{ left: -(canvasMargin + TEXT_BORDER_PX), top: -(canvasMargin + TEXT_BORDER_PX), width: liveBox.width + canvasMargin * 2, height: liveBox.height + canvasMargin * 2 }}
        />
      ) : (
        <span style={bodyStyle}>
          {layered && (
            <span aria-hidden="true" style={{ display: "block", position: "absolute", left: 0, top: 0, width: "100%", color: "transparent", ...outlineStyle }}>{ann.text}</span>
          )}
          {layered && baseFillStyle && (
            <span aria-hidden="true" style={{ display: "block", position: "absolute", left: 0, top: 0, width: "100%", ...baseFillStyle }}>{ann.text}</span>
          )}
          {layered ? <span style={{ display: "block", position: "relative", ...fillStyle }}>{ann.text}</span> : (ann.text ? ann.text : <span className="ze-ann-text-placeholder">Text</span>)}
        </span>
      )}
      {(() => {
        // Thread ports. Out (bottom-right): an arrow when the text flows on into a next frame; red + when
        // text doesn't fit; grey + on a selected frame. Clicking a + makes the next frame (state/textFrameActions.js).
        const overflow = canvasMode && liveBox && liveBox.overflow;
        const canLink = onLinkNext && !ann.ransom && !ann.curve && ann.vertical !== "stacked";
        const isFrame = usesTypeset(ann) && (ann.frameHeight > 0 || storyFrame);
        const linkNext = (e) => { e.preventDefault(); e.stopPropagation(); onLinkNext(ann); };
        const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
        if (ann.storyNextId != null) {
          return isSelected ? <span className="ze-text-port ze-text-port-out is-linked" title="The text continues in the next frame">▸</span> : null;
        }
        if (overflow) {
          return canLink
            ? <span className="ze-text-port ze-text-port-out is-overflow" title="This text doesn't fit. Click to continue it in a new frame (or make the frame taller, add columns, or shorten the text)." onMouseDown={stop} onClick={linkNext}>+</span>
            : <span className="ze-text-overflow" title="This text doesn't fit: the rest is hidden. Make the frame taller, add columns, or shorten the text.">+</span>;
        }
        if (isSelected && isFrame && canLink && !isEditing) {
          return <span className="ze-text-port ze-text-port-out" title="Link to a new frame the text can continue into" onMouseDown={stop} onClick={linkNext}>+</span>;
        }
        return null;
      })()}
      {storyFrame && ann.storyPrevId != null && isSelected && (
        <span className="ze-text-port ze-text-port-in is-linked" title="Continued from the previous frame">▸</span>
      )}
      {isEditing && !ann.locked && (
        // While typing, the box's edges move it (the text inside keeps the caret and selection).
        ["n", "e", "s", "w"].map((side) => (
          <div key={side} className={"ze-text-move-edge ze-text-move-edge-" + side} title="Drag to move" onMouseDown={(e) => onPress(e, ann)} />
        ))
      )}
      {showHandles && (
        <ResizeHandles handles={!ann.ransom && !ann.curve && ann.vertical !== "stacked" ? [...TEXT_RESIZE_HANDLES, "n", "s"] : TEXT_RESIZE_HANDLES} onStart={startResize} onRotate={(angle) => onUpdate(ann.id, { angle })} />
      )}
    </div>
  );
}
