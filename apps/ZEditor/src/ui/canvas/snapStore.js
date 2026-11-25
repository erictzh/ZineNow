// What the page's items snap to while they are resized. ComposeCanvas fills this in on every render (it knows the other
// items, the guides and the zoom); the items' resize code asks for a snapper at the start of a drag.

import { snapResize } from "../../model/snapTargets.js";

export const snapStore = {
  collect: null,   // (excludeIds) => { x: [...], y: [...] } in page px, or null when snapping is off
  threshold: 0,    // page px
  report: () => {}, // (hits | null) => draws the lines snapped onto
};

// Call at the start of a resize drag. Returns (handle, dx, dy, event) => { dx, dy }, snapping the dragged edge onto a
// nearby line (Alt: free). Turned items are not snapped: their edges are not straight lines on the page.
export function startResizeSnap(ann, orig, angle) {
  const lines = !angle && snapStore.collect ? snapStore.collect([ann.id]) : null;
  const threshold = snapStore.threshold;
  return (handle, dx, dy, ev) => {
    if (!lines || ev.altKey) { snapStore.report(null); return { dx, dy }; }
    const s = snapResize(orig, handle, dx, dy, lines, threshold);
    snapStore.report(s.x !== null || s.y !== null ? { x: s.x, y: s.y } : null);
    return { dx: s.dx, dy: s.dy };
  };
}
export const endResizeSnap = () => snapStore.report(null);
