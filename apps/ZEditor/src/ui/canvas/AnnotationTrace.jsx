// One vectorized layer on the page: its traced shapes in a box that moves, resizes and turns like an image.

import { angleOf } from "../../model/controls.js";
import { MIN_RESIZE_SIZE, resizedBox } from "../../model/geometry.js";
import { boxGroupStyle, boxOuterStyle } from "./boxStyles.js";
import { ALL_RESIZE_HANDLES, ResizeHandles } from "./ResizeHandles.jsx";
import { TraceSvg } from "./TraceSvg.jsx";
import { dragDeltaFrom, trackPointerDrag } from "../pointer.js";

// Like an image: a corner keeps the proportions, Shift stretches freely.
export function AnnotationTrace({ ann, tool, isSelected, showHandles, onPress, onUpdate, zoom }) {
  function startResize(handle, e) {
    const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
    const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      onUpdate(ann.id, resizedBox(orig, handle, dx, dy, !ev.shiftKey, MIN_RESIZE_SIZE, angleOf(ann)));
    });
  }
  return (
    <div
      data-ann-id={ann.id}
      className={"ze-ann-image ze-ann-trace" + (isSelected ? " is-selected" : "") + (ann.locked ? " is-locked" : "")}
      style={boxOuterStyle(ann)}
      onMouseDown={(e) => { if (tool === "select") onPress(e, ann); }}
    >
      <div className="ze-ann-image-shadow" style={{ ...boxGroupStyle(ann), position: "absolute", inset: 0 }}>
        <TraceSvg ann={ann} />
      </div>
      {showHandles && <ResizeHandles handles={ALL_RESIZE_HANDLES} onStart={startResize} onRotate={(angle) => onUpdate(ann.id, { angle })} />}
    </div>
  );
}
