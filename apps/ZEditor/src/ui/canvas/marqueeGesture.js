// The Marquee tool's press on empty page: drag out a rectangle (a plain click drops the marquee).

import { dragBox, isUsableMarquee, polygonPressAction, polygonWithPoint, rectMarquee, startPolygon } from "../../model/marquee.js";
import { constrainTo45 } from "../../model/rulers.js";
import { DRAG_THRESHOLD, trackPointerDrag } from "../pointer.js";

// `toPagePoint(event)` turns a mouse event into page coordinates; `onChange(next)` stores the marquee
// (a value, or a function of the current one). Shift draws a square, Alt draws out from the centre.
export function startMarqueeDraw(e, { toPagePoint, zoom, onChange }) {
  e.preventDefault();
  const start = toPagePoint(e);
  let drawn = false;
  trackPointerDrag((ev) => {
    const p = toPagePoint(ev);
    if (!drawn && Math.hypot(p.x - start.x, p.y - start.y) * zoom <= DRAG_THRESHOLD) return;
    drawn = true;
    onChange(rectMarquee(dragBox(start, p, ev.shiftKey, ev.altKey)));
  }, () => {
    // A click, or a drag too small to be a box, leaves no marquee.
    if (!drawn) onChange(null);
    else onChange((m) => (isUsableMarquee(m) ? m : null));
  });
}

// The Marquee tool's press on empty page in Polygon mode: each press adds a point (Shift: on a 45° line
// from the last one). A press on the first point, or a double click / double tap, closes the shape. A press
// after it is closed starts a new polygon. `region` is the current marquee.
export function pressPolygon(e, { toPagePoint, zoom, region, onChange }) {
  e.preventDefault();
  const raw = toPagePoint(e);
  const open = region && region.kind === "polygon" && !region.closed ? region : null;
  if (!open) { onChange(startPolygon(raw)); return; }
  const action = polygonPressAction(open, raw, zoom);
  if (action === "close") { onChange({ ...open, closed: true }); return; }
  if (action === "ignore") return;
  const last = open.points[open.points.length - 1];
  onChange(polygonWithPoint(open, e.shiftKey ? constrainTo45({ x: last[0], y: last[1] }, raw) : raw));
}
