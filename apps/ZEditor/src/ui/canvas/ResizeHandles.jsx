// Resize handles and the rotate knob around a selected item.

import { trackPointerDrag } from "../pointer.js";

// Selection handles, positioned by their compass name.
export const ALL_RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
// A text box's height always follows its text, so it has no top/bottom handles.
export const TEXT_RESIZE_HANDLES = ["nw", "ne", "e", "se", "sw", "w"];

export function ResizeHandles({ handles, onStart, onRotate }) {
  return (
    <React.Fragment>
      {handles.map((handle) => (
        <div
          key={handle}
          className={"ze-resize-handle ze-resize-handle-" + handle}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onStart(handle, e); }}
        />
      ))}
      {onRotate && <div className="ze-rotate-handle" title="Rotate (hold Shift to snap to 15°)" onMouseDown={(e) => startRotateDrag(e, onRotate)} />}
    </React.Fragment>
  );
}

// Dragging the rotate knob turns the item toward the pointer: straight up
// from the item's centre is 0°. The knob sits inside the item's own
// (rotated) box, so its parent's bounding box is centred on the item.
function startRotateDrag(e, onRotate) {
  e.preventDefault();
  e.stopPropagation();
  const box = e.currentTarget.parentElement.getBoundingClientRect();
  const centerX = box.left + box.width / 2, centerY = box.top + box.height / 2;
  trackPointerDrag((ev) => {
    let degrees = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180 / Math.PI + 90;
    degrees = ev.shiftKey ? Math.round(degrees / 15) * 15 : Math.round(degrees);
    onRotate(((degrees % 360) + 360) % 360);
  });
}
