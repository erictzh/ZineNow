// The marked part of a picture as an "area", whatever drew it, and how to paint it into a mask. An area is in the picture's own
// pixels (a page at export scale, or an image's pixels) and is one of
//   { points: [[x, y], ...] }                                  a polygon (the Rectangle and Polygon marquees)
//   { strokes: [{ erase, size, points: [[x, y], ...] }, ...] } painted strokes (the Brush marquee), in the order they were made
// Make layer, Cut, Remove & fill and the AI fill all take an area, so a new marquee shape only has to make one.

import { brushBounds, regionPolygon } from "../model/marquee.js";
import { imagePixelAt } from "./softErase.js";

// The marquee region (page px) as an area in pixels of a picture drawn at `scale` px per page px.
export function areaFromRegion(region, scale = 1) {
  if (region.kind === "brush") {
    return { strokes: region.strokes.map((s) => ({ erase: Boolean(s.erase), size: s.size * scale, points: s.points.map(([x, y]) => [x * scale, y * scale]) })) };
  }
  return { points: regionPolygon(region).map(([x, y]) => [x * scale, y * scale]) };
}

// The box round the area, { x0, y0, x1, y1 } (float px, brush width included), or null for an empty one.
export function areaBounds(area) {
  if (area.strokes) return brushBounds({ strokes: area.strokes });
  if (!area.points || !area.points.length) return null;
  const xs = area.points.map((p) => p[0]), ys = area.points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// The same area in an image's own pixels (through the image's place, scale, rotation and crop). Brush widths are scaled by the image's
// average scale.
export function mapAreaToImage(area, image) {
  const p0 = imagePixelAt(image, 0, 0), p1 = imagePixelAt(image, 1, 0), p2 = imagePixelAt(image, 0, 1);
  const k = (Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p0.x, p2.y - p0.y)) / 2 || 1;
  const map = ([x, y]) => { const q = imagePixelAt(image, x, y); return [q.x, q.y]; };
  if (area.strokes) return { strokes: area.strokes.map((s) => ({ erase: s.erase, size: s.size * k, points: s.points.map(map) })) };
  return { points: area.points.map(map) };
}

function strokePath(g, s, dx, dy) {
  g.beginPath();
  s.points.forEach(([x, y], i) => (i === 0 ? g.moveTo(x + dx, y + dy) : g.lineTo(x + dx, y + dy)));
  if (s.points.length === 1) g.lineTo(s.points[0][0] + dx + 0.01, s.points[0][1] + dy);
}

// Paints the area solid black into `ctx` (everything it covers, nothing else; paint what you need around it). `grow` swells it by that
// many px all round; `dx`, `dy` move it (to draw part of a bigger picture). A polygon also takes in every pixel its edge touches.
export function paintArea(ctx, area, { grow = 0, dx = 0, dy = 0 } = {}) {
  if (area.strokes) {
    const needsLayer = area.strokes.some((s) => s.erase);
    const canvas = ctx.canvas;
    let g = ctx, temp = null;
    if (needsLayer) { temp = document.createElement("canvas"); temp.width = canvas.width; temp.height = canvas.height; g = temp.getContext("2d"); }
    g.save();
    g.lineCap = g.lineJoin = "round"; g.fillStyle = g.strokeStyle = "#000";
    for (const s of area.strokes) {
      g.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      g.lineWidth = Math.max(1, s.size + (s.erase ? 0 : 2 * grow));
      strokePath(g, s, dx, dy); g.stroke();
    }
    g.restore();
    if (temp) ctx.drawImage(temp, 0, 0);
    return;
  }
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = "#000"; ctx.lineJoin = "round"; ctx.lineWidth = 2 + 2 * grow;
  ctx.beginPath();
  area.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x + dx, y + dy) : ctx.lineTo(x + dx, y + dy)));
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
