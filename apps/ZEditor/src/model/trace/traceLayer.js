// A vectorized layer: how it is made from an image, what it draws, recolouring and Expand.

import { normalizeTraceSettings } from "./traceSettings.js";

// A trace layer is a box item like a rectangle (x, y, width, height, angle, opacity, blend) with:
//   trace:       its settings (traceSettings.js); after Expand only the drawing ones are used
//   traceSource: the picture it was traced from (PNG data URL), so settings can be changed later;
//                gone after Expand
//   traceW/H:    that picture's size: the paths' own coordinates
//   paths:       [{ color, d }], bottom first
//   recolor:     { "#traced": "#chosen" | "none" }: colours changed (or hidden) in the panel;
//                kept by colour, so they survive a re-trace that finds the same colour
export const TRACE_LAYER_PROPS = ["trace", "traceSource", "traceW", "traceH", "paths", "recolor"];

export const isLiveTrace = (ann) => ann.type === "trace" && Boolean(ann.traceSource);

export function traceColorOf(ann, color) {
  const changed = ann.recolor && ann.recolor[color];
  return changed || color;
}

// What to draw, in order: [{ d, fill, stroke, strokeWidth }] (fill/stroke null when off).
export function traceDrawList(ann) {
  const s = normalizeTraceSettings(ann.trace);
  const list = [];
  for (const p of ann.paths || []) {
    const color = traceColorOf(ann, p.color);
    if (color === "none") continue;
    const fill = s.fills === "on" ? color : null;
    const stroke = s.strokes === "on" ? color : null;
    if (fill || stroke) list.push({ d: p.d, fill, stroke, strokeWidth: s.strokeWidth });
  }
  return list;
}

// The new layer for a trace of `image`, placed exactly over it.
export function newTraceLayer(id, image, traceSource, settings, result) {
  return {
    id, type: "trace",
    x: image.x, y: image.y, width: image.width, height: image.height, angle: image.angle,
    trace: normalizeTraceSettings(settings), traceSource, ...result,
  };
}

// The settings after the panel changes `patch`. Picking a preset loads all its settings but keeps the View.
export function patchedTraceSettings(current, patch, presetSettings) {
  const now = normalizeTraceSettings(current);
  if (patch.preset && patch.preset !== now.preset) return normalizeTraceSettings({ ...presetSettings(patch.preset), view: now.view });
  return normalizeTraceSettings({ ...now, ...patch });
}

// Expand: the shapes stay as they are now (colour changes baked in) and the source picture goes,
// so the layer no longer re-traces and the project file is smaller.
export function expandedTracePatch(ann) {
  const paths = (ann.paths || [])
    .map((p) => ({ ...p, color: traceColorOf(ann, p.color) }))
    .filter((p) => p.color !== "none");
  return { paths, recolor: undefined, traceSource: undefined, trace: { ...normalizeTraceSettings(ann.trace), view: "result" } };
}

// The page area the layer's visible shapes cover (hidden colours left out), allowing for its rotation:
// { x, y, width, height }, or null when nothing is visible. Path points (curve control points
// included) are what's measured, so it can be a touch generous around curves, never too small.
export function traceContentBounds(ann) {
  const list = traceDrawList(ann);
  if (!list.length || !ann.traceW || !ann.traceH) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const item of list) {
    const nums = item.d.match(/-?\d+(?:\.\d+)?/g) || [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const px = Number(nums[i]), py = Number(nums[i + 1]);
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    const pad = item.stroke ? item.strokeWidth / 2 : 0;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  }
  if (!(x1 > x0 && y1 > y0)) return null;
  const sx = ann.width / ann.traceW, sy = ann.height / ann.traceH;
  // Corners of that area in the layer's own frame (from its middle), turned with the layer.
  const cx = ann.width / 2, cy = ann.height / 2;
  const rad = ((ann.angle || 0) * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const xs = [], ys = [];
  for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
    const lx = px * sx - cx, ly = py * sy - cy;
    xs.push(ann.x + cx + lx * cos - ly * sin);
    ys.push(ann.y + cy + lx * sin + ly * cos);
  }
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
