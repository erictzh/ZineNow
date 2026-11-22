// Feather: fades an image's edge to see-through over a width you choose. The fade follows the image's edge shape (a plain
// rectangle, or Rounded / Ellipse / Torn edge / Scissor cut when one is on). It changes only the alpha of the pixels; the
// live editor and Export run the same code.

import { effectSettings } from "../model/controls.js";
import { FEATHER_EFFECT } from "../model/imageEffects.js";

const curve = (t, kind) => { const c = Math.min(1, Math.max(0, t)); return kind === "linear" ? c : c * c * (3 - 2 * c); };

// How far (px, roughly Euclidean) each inside pixel is from the nearest pixel that is not inside; the picture's own border
// counts as outside. `inside`: Uint8Array w*h (1 = part of the shape). A two-pass chamfer transform (3-4 weights).
export function distanceToOutside(inside, w, h) {
  const W = w + 2, H = h + 2, INF = 1e9;
  const d = new Float32Array(W * H).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[(y + 1) * W + x + 1] = inside[y * w + x] ? INF : 0;
  for (let y = 1; y <= h; y++) for (let x = 1; x <= w; x++) {
    const i = y * W + x;
    if (d[i] === 0) continue;
    d[i] = Math.min(d[i], d[i - 1] + 1, d[i - W] + 1, d[i - W - 1] + 1.4142, d[i - W + 1] + 1.4142);
  }
  for (let y = h; y >= 1; y--) for (let x = w; x >= 1; x--) {
    const i = y * W + x;
    if (d[i] === 0) continue;
    d[i] = Math.min(d[i], d[i + 1] + 1, d[i + W] + 1, d[i + W + 1] + 1.4142, d[i + W - 1] + 1.4142);
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = d[(y + 1) * W + x + 1];
  return out;
}

// The alpha multiplier (0..1) for each pixel. `shape`: an `inside` mask (the edge shape) or null for a plain rectangle;
// `sides`: "all", "tb", "lr", "top", "bottom", "left", "right" (only for a plain rectangle: a shape is always faded all round).
export function featherAlpha(w, h, widthPx, kind, sides, shape) {
  const f = Math.max(1, widthPx);
  const out = new Float32Array(w * h);
  if (shape) {
    const dist = distanceToOutside(shape, w, h);
    for (let i = 0; i < out.length; i++) out[i] = shape[i] ? curve((dist[i] - 0.5) / f, kind) : 0;
    return out;
  }
  const on = { top: false, bottom: false, left: false, right: false };
  if (sides === "tb") { on.top = on.bottom = true; } else if (sides === "lr") { on.left = on.right = true; } else if (on[sides] === false) { on[sides] = true; } else { on.top = on.bottom = on.left = on.right = true; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 1;
    if (on.top) a *= curve((y + 0.5) / f, kind);
    if (on.bottom) a *= curve((h - y - 0.5) / f, kind);
    if (on.left) a *= curve((x + 0.5) / f, kind);
    if (on.right) a *= curve((w - x - 0.5) / f, kind);
    out[y * w + x] = a;
  }
  return out;
}

// Edits the canvas's alpha in place. `outline` is the image's edge shape as an SVG path in the image's own units, drawn
// `unitScale` canvas px per unit; null for a plain rectangle.
export function applyFeather(ctx, canvas, ann, outline, unitScale) {
  const { width, height } = canvas;
  if (width === 0 || height === 0) return;
  const s = effectSettings(ann, FEATHER_EFFECT);
  let shape = null;
  if (outline) {
    const m = document.createElement("canvas");
    m.width = width; m.height = height;
    const mctx = m.getContext("2d");
    mctx.scale(unitScale, unitScale);
    mctx.fillStyle = "#000";
    mctx.fill(new Path2D(outline));
    const a = mctx.getImageData(0, 0, width, height).data;
    shape = new Uint8Array(width * height);
    for (let i = 0; i < shape.length; i++) shape[i] = a[i * 4 + 3] > 127 ? 1 : 0;
  }
  const alpha = featherAlpha(width, height, (s.featherAmount / 100) * Math.min(width, height), s.featherFade, s.featherSides, shape);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < alpha.length; i++) data[i * 4 + 3] = data[i * 4 + 3] * alpha[i];
  ctx.putImageData(imageData, 0, 0);
}
