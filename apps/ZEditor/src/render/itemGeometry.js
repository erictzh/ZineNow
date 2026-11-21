// Item bounds and rotation that depend on measured text size.

import { bboxOf } from "../model/annotations.js";
import { angleOf } from "../model/controls.js";
import { rotatePoint } from "../model/geometry.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS, strokeHitTest } from "../model/strokes.js";
import { measureTextBox } from "./textLayout.js";

// The page area an item covers (x, y, width, height), allowing for its
// own rotation. Used to find the middle of a selection.
export function annotationBounds(ann) {
  if (ann.type === "stroke") {
    const box = bboxOf(ann);
    const pad = (ann.strokeWidth || (ann.tool === "highlighter" ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width)) / 2;
    return { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  }
  const size = ann.type === "text" ? measureTextBox(ann) : ann;
  const centerX = ann.x + size.width / 2, centerY = ann.y + size.height / 2;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const [rx, ry] = rotatePoint(sx * size.width / 2, sy * size.height / 2, angleOf(ann));
    return [centerX + rx, centerY + ry];
  });
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

// Whether the page point {x, y} is on the item: inside its (turned) box, or near a stroke.
export function hitsItem(ann, point) {
  if (ann.type === "stroke") return strokeHitTest([point.x, point.y], ann);
  const size = ann.type === "text" ? measureTextBox(ann) : ann;
  const [lx, ly] = rotatePoint(point.x - (ann.x + size.width / 2), point.y - (ann.y + size.height / 2), -angleOf(ann));
  return Math.abs(lx) <= size.width / 2 && Math.abs(ly) <= size.height / 2;
}

// An item turned `degrees` about the page point (cx, cy). A stroke has no
// angle of its own, so its points are moved; a box keeps its shape, turns
// about its own centre and swings that centre around (cx, cy).
export function rotatedAnnotation(ann, degrees, cx, cy) {
  if (ann.type === "stroke") {
    return { ...ann, points: ann.points.map(([px, py]) => { const [rx, ry] = rotatePoint(px - cx, py - cy, degrees); return [cx + rx, cy + ry]; }) };
  }
  const size = ann.type === "text" ? measureTextBox(ann) : ann;
  const [rx, ry] = rotatePoint(ann.x + size.width / 2 - cx, ann.y + size.height / 2 - cy, degrees);
  return { ...ann, x: cx + rx - size.width / 2, y: cy + ry - size.height / 2, angle: (((angleOf(ann) + degrees) % 360) + 360) % 360 };
}
