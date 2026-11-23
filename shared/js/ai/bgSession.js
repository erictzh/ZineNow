// "AI Background Removal": starts a model (once per model, released after a quiet minute) and cuts the subject out of a picture.
// The model must already be saved (shared/js/ai/manager.js); nothing here downloads by itself.

import { BG_CACHE, bgModel } from "./bgModel.js";
import { getModelBytes, isModelSaved } from "./modelStore.js";
import { createSession, loadOrt } from "./runtime.js";
import { SEG_PREP, maskToAlpha, segInput, segMask } from "./segment.js";

const IDLE_MS = 60000;
const sessions = new Map(); // model key -> session, or the promise while it starts
let timer = 0;

export function releaseBgSession() {
  clearTimeout(timer);
  const all = [...sessions.values()]; sessions.clear();
  for (const s of all) Promise.resolve(s).then((x) => { if (x && x.release) { try { x.release(); } catch (e) { /* already gone */ } } }, () => {});
}
const touch = () => { clearTimeout(timer); timer = setTimeout(releaseBgSession, IDLE_MS); };

function acquire(key, onStatus) {
  touch();
  if (!sessions.has(key)) {
    const m = bgModel(key);
    sessions.set(key, (async () => {
      if (!(await isModelSaved(m.url, BG_CACHE))) throw new Error(m.name + " is not downloaded. Download it first (Image panel, AI Background Removal).");
      onStatus && onStatus("Starting " + m.name + "…");
      const { bytes } = await getModelBytes(m.url, undefined, undefined, BG_CACHE);
      // these models are quick on the processor; the graphics chip would spend longer compiling than it saves (and some operations are unsupported there)
      return (await createSession(bytes, false)).session;
    })().catch((e) => { sessions.delete(key); throw e; }));
  }
  return sessions.get(key);
}

// The subject mask of `canvas` for model `key`: { mask: Float32Array (0..1, side x side), side }.
export async function segmentCanvas(canvas, key, onStatus) {
  const prep = SEG_PREP[bgModel(key).key];
  const session = await acquire(key, onStatus);
  const ort = await loadOrt();
  const small = document.createElement("canvas"); small.width = small.height = prep.size;
  const sx = small.getContext("2d", { willReadFrequently: true });
  sx.imageSmoothingQuality = "high"; sx.drawImage(canvas, 0, 0, prep.size, prep.size);
  const input = new ort.Tensor("float32", segInput(sx.getImageData(0, 0, prep.size, prep.size).data, prep), [1, 3, prep.size, prep.size]);
  onStatus && onStatus("Finding the subject…");
  const out = await session.run({ [session.inputNames[0]]: input });
  const first = out[session.outputNames[0]];
  const side = Math.round(Math.sqrt(first.data.length));
  touch();
  return { mask: segMask(first.data, prep.mask), side };
}

// A copy of `canvas` where only the subject is left (everything else see-through). cutoff 0..1, soft 0..1 (see segment.js softCut).
export function cutOutCanvas(canvas, mask, side, cutoff, soft) {
  const m = document.createElement("canvas"); m.width = m.height = side;
  const mx = m.getContext("2d");
  const img = mx.createImageData(side, side);
  const alpha = maskToAlpha(mask, cutoff, soft);
  for (let i = 0; i < side * side; i++) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = alpha[i]; }
  mx.putImageData(img, 0, 0);
  const out = document.createElement("canvas"); out.width = canvas.width; out.height = canvas.height;
  const ox = out.getContext("2d");
  ox.drawImage(canvas, 0, 0);
  ox.globalCompositeOperation = "destination-in";
  ox.imageSmoothingQuality = "high";
  ox.drawImage(m, 0, 0, canvas.width, canvas.height);
  return out;
}
