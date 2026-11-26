// Vectorize's pixels: the picture a trace starts from (an image as it looks, at trace size) and running the tracer on it.

import { IMAGE_EFFECTS } from "../model/imageEffects.js";
import { TRACE_MAX_SIDE } from "../model/trace/traceSettings.js";
import { traceImage } from "../model/trace/traceImage.js";
import { drawImageOnCanvas, loadImageElement } from "./drawImage.js";

// The image with its crop, photo adjustments and filter (what you see), but not its rotation,
// opacity or effects, at most TRACE_MAX_SIDE px on its long side and never bigger than its own
// pixels. Returns a PNG data URL: the trace layer keeps it so its settings can be changed later.
export async function traceSourceFromImage(ann, pageFilter) {
  const natural = Math.max(ann.cropW || ann.naturalWidth || ann.width, ann.cropH || ann.naturalHeight || ann.height);
  const long = Math.min(TRACE_MAX_SIDE, natural);
  const scale = long / Math.max(ann.width, ann.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(ann.width * scale));
  canvas.height = Math.max(1, Math.round(ann.height * scale));
  const plain = {
    ...ann, x: 0, y: 0, angle: undefined, opacity: undefined, blend: undefined,
    ...Object.fromEntries(IMAGE_EFFECTS.map((effect) => [effect.key, undefined])), // flags off: the stroke and shadow lists are then ignored
  };
  await drawImageOnCanvas(canvas.getContext("2d"), plain, scale, pageFilter);
  return canvas.toDataURL("image/png");
}

// Decoded pixels per source, kept for the last few so dragging a slider doesn't decode every time.
const pixelCache = new Map();
async function pixelsOf(src) {
  if (pixelCache.has(src)) return pixelCache.get(src);
  const img = await loadImageElement(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pixelCache.set(src, pixels);
  if (pixelCache.size > 3) pixelCache.delete(pixelCache.keys().next().value);
  return pixels;
}

// Traces a source picture with `settings`: the trace layer's fields { traceW, traceH, paths }.
export async function runTrace(src, settings) {
  const result = traceImage(await pixelsOf(src), settings);
  return { traceW: result.width, traceH: result.height, paths: result.paths };
}
