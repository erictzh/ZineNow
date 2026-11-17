// One rectangle or ellipse on the page.

import { angleOf } from "../../model/controls.js";
import { resizedBox } from "../../model/geometry.js";
import { imageEdgeOutline } from "../../model/imageEffects.js";
import { MIN_RECT_SIZE } from "../../model/rect.js";
import { rectFillCss } from "../../render/gradients.js";
import { BoxEffectOverlays } from "./BoxEffectOverlays.jsx";
import { boxGroupStyle, boxOuterStyle } from "./boxStyles.js";
import { ALL_RESIZE_HANDLES, ResizeHandles } from "./ResizeHandles.jsx";
import { dragDeltaFrom, trackPointerDrag } from "../pointer.js";

// ---- One rectangle --------------------------------------------------
// Resizes freely on every handle; Shift keeps its proportions.
export function AnnotationRect({ ann, tool, isSelected, showHandles, onPress, onUpdate, zoom }) {
  function startResize(handle, e) {
    const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
    const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      onUpdate(ann.id, resizedBox(orig, handle, dx, dy, ev.shiftKey, MIN_RECT_SIZE, angleOf(ann)));
    });
  }

  const edgeOutline = imageEdgeOutline(ann);
  return (
    <div
      data-ann-id={ann.id}
      className={"ze-ann-image" + (isSelected ? " is-selected" : "") + (ann.locked ? " is-locked" : "")}
      style={boxOuterStyle(ann)}
      onMouseDown={(e) => { if (tool === "select") onPress(e, ann); }}
    >
      <div className="ze-ann-image-shadow" style={boxGroupStyle(ann)}>
        <div className="ze-ann-rect-fill" style={{ background: rectFillCss(ann), clipPath: edgeOutline ? `path("${edgeOutline}")` : undefined }} />
        <BoxEffectOverlays ann={ann} edgeOutline={edgeOutline} />
      </div>
      {showHandles && <ResizeHandles handles={ALL_RESIZE_HANDLES} onStart={startResize} onRotate={(angle) => onUpdate(ann.id, { angle })} />}
    </div>
  );
}
