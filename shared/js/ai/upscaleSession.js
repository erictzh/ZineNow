// "Upscale": starts the model (once, released after a quiet 2 minutes) and enlarges a picture tile by tile. The model must already be saved
// (shared/js/ai/manager.js); nothing here downloads by itself.

import { UPSCALE_CACHE, UPSCALE_MODEL } from "./upscaleModel.js";
import { getModelBytes, isModelSaved } from "./modelStore.js";
import { createSession, loadOrt } from "./runtime.js";
import { tileInput, tilePlan, tileToRgba } from "./upscale.js";

const IDLE_MS = 120000;
let current = null, starting = null, timer = 0;

export function releaseUpscaleSession() {
  clearTimeout(timer);
  const c = current; current = null; starting = null;
  if (c && c.session && c.session.release) { try { c.session.release(); } catch (e) { /* gone */ } }
}
const touch = () => { clearTimeout(timer); timer = setTimeout(releaseUpscaleSession, IDLE_MS); };

async function acquire(gpu, onStatus) {
  touch();
  if (current && current.wantGpu === gpu) return current;
  if (current) releaseUpscaleSession();
  if (!starting) {
    starting = (async () => {
      if (!(await isModelSaved(UPSCALE_MODEL.url, UPSCALE_CACHE))) throw new Error(UPSCALE_MODEL.name + " is not downloaded. Download it first (Models page, or the Upscale tool).");
      onStatus && onStatus("Starting " + UPSCALE_MODEL.name + "…");
      const { bytes } = await getModelBytes(UPSCALE_MODEL.url, undefined, undefined, UPSCALE_CACHE);
      const made = await createSession(bytes, gpu);
      current = { session: made.session, backend: made.backend, bytes, wantGpu: gpu };
      return current;
    })().catch((e) => { starting = null; throw e; });
  }
  const c = await starting; starting = null; return c;
}

const sizeOf = (session) => {
  try {
    const m = session.inputMetadata, sh = Array.isArray(m) ? m[0].shape : m && m[session.inputNames[0]] && m[session.inputNames[0]].shape;
    const ok = (v) => Number.isFinite(v) && v > 0 && v < 4096; // a dynamic size shows up as -1 or 4294967295
    if (sh && ok(sh[2]) && ok(sh[3])) return [sh[3], sh[2]];
  } catch (e) { /* any size */ }
  return null;
};

// Enlarges `canvas` (any size) with the model: the result is the model's own scale (4x) bigger. Options: tile (source px per tile), pad (border), gpu (try the
// graphics chip), onProgress(done, total, avgMs), shouldCancel(), onStatus(text). Returns { canvas, info } (or { cancelled: true } if cancelled).
export async function upscaleCanvas(canvas, { tile = 128, pad = 12, gpu = false, onProgress, shouldCancel, onStatus } = {}) {
  let c = await acquire(gpu, onStatus);
  const ort = await loadOrt();
  const W = canvas.width, H = canvas.height;
  const fixed = sizeOf(c.session);
  let T = tile + 2 * pad;
  if (fixed) { T = fixed[0]; tile = Math.max(8, T - 2 * pad); }
  const src = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const tiles = tilePlan(W, H, tile);
  let out = null, S = 0, outX = null;
  const times = [];
  const info = { backend: c.backend, tile, pad, input: T + "x" + T, fixedInput: Boolean(fixed), tiles: tiles.length };
  for (let k = 0; k < tiles.length; k++) {
    if (shouldCancel && shouldCancel()) return { cancelled: true, info: { ...info, doneTiles: k } };
    const t = tiles[k];
    const feed = new ort.Tensor("float32", tileInput(src, W, H, t.x0 - pad, t.y0 - pad, T), [1, 3, T, T]);
    const t1 = performance.now();
    let res;
    try { res = await c.session.run({ [c.session.inputNames[0]]: feed }); }
    catch (e) {
      if (c.backend !== "gpu") throw e;
      onStatus && onStatus("The graphics chip failed; continuing on the processor (slower)…");
      const cpu = await createSession(c.bytes, false);
      try { c.session.release && c.session.release(); } catch (err) { /* gone */ }
      c.session = cpu.session; c.backend = "cpu"; info.backend = "cpu (the graphics chip failed)";
      res = await c.session.run({ [c.session.inputNames[0]]: feed });
    }
    const o = res[c.session.outputNames[0]], OT = o.dims[3];
    if (!out) {
      S = OT / T;
      if (!Number.isInteger(S) || S < 1) throw new Error("Unexpected model output size " + o.dims.join("x") + " for an input of " + T + "x" + T + ".");
      out = document.createElement("canvas"); out.width = W * S; out.height = H * S; outX = out.getContext("2d");
      let lo = Infinity, hi = -Infinity; for (let i = 0; i < o.data.length; i += 11) { if (o.data[i] < lo) lo = o.data[i]; if (o.data[i] > hi) hi = o.data[i]; }
      info.outputDims = o.dims.join("x"); info.scale = S; info.valueRange = lo.toFixed(3) + " to " + hi.toFixed(3);
    }
    const rgba = tileToRgba(o.data, OT, S, pad, t.w, t.h);
    outX.putImageData(new ImageData(rgba, t.w * S, t.h * S), t.x0 * S, t.y0 * S);
    times.push(Math.round(performance.now() - t1));
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    onProgress && onProgress(k + 1, tiles.length, avg);
    await new Promise((r) => setTimeout(r, 0)); // let the page breathe
  }
  touch();
  info.firstTileMs = times[0]; info.slowestTileMs = Math.max(...times); info.avgTileMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  return { canvas: out, info };
}
