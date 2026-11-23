// "Click-to-select": starts MobileSAM's two parts (once, released after a quiet minute), reads a picture (the slow step, once per picture) and
// outlines what is clicked (fast). Both files must already be saved (shared/js/ai/manager.js); nothing here downloads by itself.
// The reader runs on the graphics chip when there is one that works (about 7 s here), else on the processor (about 11 s); the mask maker on the processor.

import { SAM_CACHE, SAM_MODEL } from "./samModel.js";
import { getModelBytes, isModelSaved } from "./modelStore.js";
import { createSession, gpuUsable, loadOrt } from "./runtime.js";
import { samDims, samInput, samPoints, pickMask } from "./sam.js";

const IDLE_MS = 90000;
let parts = null, starting = null, timer = 0;

export function releaseSamSession() {
  clearTimeout(timer);
  const p = parts; parts = null; starting = null;
  if (p) for (const s of [p.enc, p.dec]) { try { s.release && s.release(); } catch (e) { /* gone */ } }
}
const touch = () => { clearTimeout(timer); timer = setTimeout(releaseSamSession, IDLE_MS); };

async function acquire(onStatus) {
  touch();
  if (parts) return parts;
  if (!starting) {
    starting = (async () => {
      if (!(await isModelSaved(SAM_MODEL.encoderUrl, SAM_CACHE)) || !(await isModelSaved(SAM_MODEL.decoderUrl, SAM_CACHE))) throw new Error(SAM_MODEL.name + " is not downloaded. Download it first (Models page, or the Click-to-select tool).");
      onStatus && onStatus("Starting " + SAM_MODEL.name + "…");
      const encBytes = (await getModelBytes(SAM_MODEL.encoderUrl, undefined, undefined, SAM_CACHE)).bytes;
      const decBytes = (await getModelBytes(SAM_MODEL.decoderUrl, undefined, undefined, SAM_CACHE)).bytes;
      const enc = await createSession(encBytes, true); // graphics chip if it works, else the processor
      const dec = await createSession(decBytes, false);
      parts = { enc: enc.session, encBackend: enc.backend, encBytes, dec: dec.session };
      return parts;
    })().catch((e) => { starting = null; throw e; });
  }
  return starting;
}

// Reads `canvas` (the picture, or a shrunk copy of it). Returns { embeddings, k, w, h, backend, ms }: keep it and pass it to outline() for each click.
export async function prepareSam(canvas, onStatus) {
  const p = await acquire(onStatus);
  const ort = await loadOrt();
  const d = samDims(canvas.width, canvas.height);
  const c = document.createElement("canvas"); c.width = d.w; c.height = d.h;
  const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high"; x.drawImage(canvas, 0, 0, d.w, d.h);
  const input = new ort.Tensor("float32", samInput(x.getImageData(0, 0, d.w, d.h).data, d.w, d.h), [d.h, d.w, 3]);
  onStatus && onStatus("Reading the picture (about 10 seconds, once per picture)…");
  await new Promise((r) => setTimeout(r, 40)); // let the message show
  const t0 = performance.now();
  let out;
  try { out = await p.enc.run({ [p.enc.inputNames[0]]: input }); }
  catch (e) {
    if (p.encBackend !== "gpu") throw e;
    onStatus && onStatus("The graphics chip failed; reading the picture on the processor (slower)…");
    const cpu = await createSession(p.encBytes, false);
    try { p.enc.release && p.enc.release(); } catch (err) { /* gone */ }
    p.enc = cpu.session; p.encBackend = "cpu";
    out = await p.enc.run({ [p.enc.inputNames[0]]: input });
  }
  touch();
  return { embeddings: out[p.enc.outputNames[0]], k: d.k, w: canvas.width, h: canvas.height, backend: p.encBackend, ms: Math.round(performance.now() - t0) };
}

// Outlines what the clicks mark. `points`: [{ x, y, label }] in the canvas passed to prepareSam (label 1 = add, 0 = take away).
// Returns { mask: Uint8Array (1 = selected), w, h, coverage, iou, ms } at the prepared picture's size.
export async function outline(prep, points) {
  const p = await acquire();
  const ort = await loadOrt();
  const pt = samPoints(points, prep.k);
  const has = (n) => p.dec.inputNames.includes(n);
  const feeds = { image_embeddings: prep.embeddings, point_coords: new ort.Tensor("float32", pt.coords, [1, pt.n, 2]), point_labels: new ort.Tensor("float32", pt.labels, [1, pt.n]) };
  if (has("mask_input")) feeds.mask_input = new ort.Tensor("float32", new Float32Array(256 * 256), [1, 1, 256, 256]);
  if (has("has_mask_input")) feeds.has_mask_input = new ort.Tensor("float32", new Float32Array([0]), [1]);
  if (has("orig_im_size")) feeds.orig_im_size = new ort.Tensor("float32", new Float32Array([prep.h, prep.w]), [2]);
  const t0 = performance.now();
  const out = await p.dec.run(feeds);
  const ms = Math.round(performance.now() - t0);
  const masks = out[p.dec.outputNames.find((q) => /^masks?$/.test(q)) || p.dec.outputNames[0]];
  const iouT = out[p.dec.outputNames.find((q) => /iou/.test(q))];
  const r = pickMask(masks.data, masks.dims, iouT ? iouT.data : null);
  touch();
  return { mask: r.mask, w: r.w, h: r.h, coverage: r.coverage, iou: iouT ? Array.from(iouT.data) : [], ms };
}
