// Mouse helpers for the canvas: drag threshold, drag tracking, drag distance, click → text position.

import { rotatePoint } from "../model/geometry.js";

// `angle` is the rotation of the thing being dragged: the delta then comes
// back in that thing's own (unrotated) axes, which is what resizing needs.
export function dragDeltaFrom(startEvent, zoom, angle = 0) {
  const { clientX: startX, clientY: startY } = startEvent;
  return (ev) => {
    const [dx, dy] = rotatePoint((ev.clientX - startX) / zoom, (ev.clientY - startY) / zoom, -angle);
    return { dx, dy };
  };
}

export const DRAG_THRESHOLD = 4; // screen px of movement before a press counts as a drag

// Follows the mouse until release, wherever it goes on the page.
export function trackPointerDrag(onMove, onUp) {
  const move = (ev) => onMove(ev);
  const up = (ev) => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    if (onUp) onUp(ev);
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

// The character position under a screen point inside `element`.
export function textOffsetAtPoint(x, y, element, textLength) {
  let node = null, offset = 0;
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position) { node = position.offsetNode; offset = position.offset; }
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range) { node = range.startContainer; offset = range.startOffset; }
  }
  return node && node.nodeType === Node.TEXT_NODE && element.contains(node) ? offset : textLength;
}
