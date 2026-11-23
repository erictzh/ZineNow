// "Remove background": starts the model (once, released after a quiet minute) and cuts the subject out of a picture.
// The model must already be saved (shared/js/ai/manager.js); nothing here downloads by itself.

import { BG_CACHE, BG_MODEL_URL } from "./bgModel.js";
import { getModelBytes, isModelSaved } from "./modelStore.js";
import { createSession, loadOrt } from "./runtime.js";
import { SEG_SIZE, maskToAlpha, segInput, segMask } from "./segment.js";

const IDLE_MS = 60000;
let current = null, starting = null, timer = 0;

export function releaseBgSession() {
  clearTimeout(timer);
  const c = current; current = null; starting = null;
  if (c && c.release) { try { c.release(); } catch (e) { /* already gone */ } }
}
const touch = () => { clearTimeout(timer); timer = setTimeout(releaseBgSession, IDLE_MS); };

async function acquire(onStatus) {
  if (current) { touch(); return current; }
  if (!starting) {
    starting = (async () => {
      if (!(await isModelSaved(BG_MODEL_URL, BG_CACHE))) throw new Error("The background-removal model is not downloaded. Download it first (Image panel, Remove background).");
      onStatus && onStatus("Starting the model…");
      const { bytes } = await getModelBytes(BG_MODEL_URL, undefined, undefined, BG_CACHE);
      // the small model is quick on the processor; the graphics chip would spend longer compiling than it saves
      current = (await createSession(bytes, false)).session;
      return current;
    })().catch((e) => { starting = null; throw e; });
  }
  const s = await starting; touch(); return s;
}

// The subject mask of `canvas`: { mask: Float32Array (0..1, side x side), side }.
export async function segmentCanvas(canvas, onStatus) {
  const session = await acquire(onStatus);
  const ort = await loadOrt();
  const small = document.createElement("canvas"); small.width = small.height = SEG_SIZE;
  const sx = small.getContext("2d", { willReadFrequently: true });
  sx.imageSmoothingQuality = "high"; sx.drawImage(canvas, 0, 0, SEG_SIZE, SEG_SIZE);
  const input = new ort.Tensor("float32", segInput(sx.getImageData(0, 0, SEG_SIZE, SEG_SIZE).data), [1, 3, SEG_SIZE, SEG_SIZE]);
  onStatus && onStatus("Finding the subject…");
  const out = await session.run({ [session.inputNames[0]]: input });
  const first = out[session.outputNames[0]];
  const side = Math.round(Math.sqrt(first.data.length));
  touch();
  return { mask: segMask(first.data), side };
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
