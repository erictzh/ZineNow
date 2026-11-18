// The opaque rows of an image, for "Text wrap: around object shape" (model/text/textWrap.js).
//
// Layout is synchronous but reading pixels needs the image decoded, so each image's rows are
// worked out once in the background and cached by its src. Until they're ready the image wraps
// as its bounding box; `onWrapShapesChange` lets the editor redraw when they arrive, and Export
// calls `prepareWrapShapes` first so it never lays out with a missing shape.

const ROWS = 96;            // the shape is read as this many horizontal bands
const ALPHA_CUTOFF = 24;    // a pixel this opaque (0-255) or more counts as part of the object

const cache = new Map();    // src -> rows ([{ y0, y1, x0, x1 }] in natural px) | Promise while loading
const listeners = new Set();
let version = 0;

export const wrapShapesVersion = () => version;
export function onWrapShapesChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Pure: an alpha channel (`data` RGBA, w x h) as one span per band of `bandH` rows, scaled by k to natural px.
export function opaqueRows(data, w, h, bandH, k) {
  const rows = [];
  for (let b0 = 0; b0 < h; b0 += bandH) {
    let x0 = Infinity, x1 = -Infinity;
    const b1 = Math.min(h, b0 + bandH);
    for (let y = b0; y < b1; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] >= ALPHA_CUTOFF) { if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1; }
      }
    }
    if (x1 > x0) rows.push({ y0: b0 * k, y1: b1 * k, x0: x0 * k, x1: x1 * k });
  }
  return rows;
}

function load(src) {
  const job = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const natW = img.naturalWidth, natH = img.naturalHeight;
      const k = Math.max(1, Math.max(natW, natH) / 400); // read at most 400px across
      const w = Math.max(1, Math.round(natW / k)), h = Math.max(1, Math.round(natH / k));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      resolve(opaqueRows(data, w, h, Math.max(1, Math.ceil(h / ROWS)), natW / w));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  }).then((rows) => {
    cache.set(src, rows);
    version++;
    listeners.forEach((fn) => fn());
    return rows;
  });
  cache.set(src, job);
  // Old picture versions (every magic-eraser apply makes a new src) don't need to stay around.
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  return job;
}

// The image's rows if they're ready (starting the work if not), else null.
export function wrapRowsFor(ann) {
  if (!ann.src) return null;
  const hit = cache.get(ann.src);
  if (hit === undefined) { load(ann.src); return null; }
  return hit instanceof Promise ? null : hit;
}

// Waits until every image on these pages that wraps by its shape has its rows.
export async function prepareWrapShapes(pages) {
  const jobs = [];
  for (const page of pages) {
    for (const a of page.annotations || []) {
      if (a.type !== "image" || a.textWrap !== "shape" || !a.src) continue;
      const hit = cache.get(a.src);
      jobs.push(hit === undefined ? load(a.src) : hit);
    }
  }
  await Promise.all(jobs);
}
