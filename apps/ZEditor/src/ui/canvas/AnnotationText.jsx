// One text box on the page: typing, display, resize.

import { rgbaCss } from "../../model/color.js";
import { angleOf, blendOf, controlValues } from "../../model/controls.js";
import { MIN_RESIZE_SIZE, resizedBox, rotatePoint } from "../../model/geometry.js";
import { SHADOW_EFFECT } from "../../model/imageEffects.js";
import { adjustRunsForEdit, colorSegments } from "../../model/text/colorRuns.js";
import { AUTO_TEXT_MAX_WIDTH, TEXT_BORDER_PX } from "../../model/text/textControls.js";
import { photoPlacement, textGradientView, textLook, usesCanvasText } from "../../model/text/textLook.js";
import { drawTextOnCanvas } from "../../render/drawText.js";
import { rectFillCss } from "../../render/gradients.js";
import { measureTextBox, textCanvasMargin } from "../../render/textLayout.js";
import { rotationCss } from "./boxStyles.js";
import { ResizeHandles, TEXT_RESIZE_HANDLES } from "./ResizeHandles.jsx";
import { dragDeltaFrom, textOffsetAtPoint, trackPointerDrag } from "../pointer.js";
import { textSelectionStore } from "../textSelection.js";
const { useRef, useEffect, useLayoutEffect } = React;

// ---- One text annotation --------------------------------------------
// The text itself always lays out the box. While editing it's hidden
// and a transparent <textarea> fills that same box, so typing looks
// exactly like the finished text and the box grows as it would.
export function AnnotationText({ ann, tool, isSelected, isEditing, showHandles, zoom, onPress, onStartEdit, onFinishEdit, onUpdate }) {
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const pendingCaretRef = useRef(null);
  const liveCanvasRef = useRef(null);

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
    if (isEditing) { e.stopPropagation(); return; }
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
  const canvasMode = usesCanvasText(ann) && !isEditing && Boolean(ann.text);
  const liveBox = canvasMode ? measureTextBox(ann) : null;
  const canvasMargin = canvasMode ? textCanvasMargin(ann, look) : 0;
  const liveDrawKey = canvasMode
    ? JSON.stringify({ ...ann, x: 0, y: 0, angle: 0, id: 0, locked: undefined, hidden: undefined, name: undefined, blend: undefined })
    : "";
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
  }, [liveDrawKey, zoom, canvasMode]);

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
      className={"ze-ann-text" + (isSelected ? " is-selected" : "") + (isEditing ? " is-editing" : "") + (ann.locked ? " is-locked" : "")}
      style={style}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (tool === "select" && !isEditing) startEditingAt(e.clientX, e.clientY);
      }}
    >
      {isEditing ? (
        <React.Fragment>
          {/* The zero-width space gives a trailing blank line some height. */}
          {/* With recoloured letters the mirror is shown (in their colours)
              under a see-through textarea, which keeps the caret and selection. */}
          <span className={"ze-ann-text-mirror" + (hasLetterColors ? " is-visible" : "")}>
            {hasLetterColors
              ? colorSegments(ann.text + "​", ann.colorRuns).map((seg, i) => <span key={i} style={seg.color ? { color: seg.color } : undefined}>{seg.text}</span>)
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
      {showHandles && !isEditing && <ResizeHandles handles={TEXT_RESIZE_HANDLES} onStart={startResize} onRotate={(angle) => onUpdate(ann.id, { angle })} />}
    </div>
  );
}
