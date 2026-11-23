// "Face blur": starts the face detector (once, released after a quiet minute) and finds the faces in a picture. The model must already be saved
// (shared/js/ai/manager.js); nothing here downloads by itself. It runs on the processor (the model is tiny and quick).

import { FACE_CACHE, FACE_MODEL } from "./faceModel.js";
import { FACE_SIZE, decodeYunet, yunetInput } from "./faces.js";
import { getModelBytes, isModelSaved } from "./modelStore.js";
import { createSession, loadOrt } from "./runtime.js";

const IDLE_MS = 60000;
let session = null, starting = null, timer = 0;

export function releaseFaceSession() {
  clearTimeout(timer);
  const s = session; session = null; starting = null;
  if (s && s.release) { try { s.release(); } catch (e) { /* already gone */ } }
}
const touch = () => { clearTimeout(timer); timer = setTimeout(releaseFaceSession, IDLE_MS); };

async function acquire(onStatus) {
  touch();
  if (session) return session;
  if (!starting) {
    starting = (async () => {
      if (!(await isModelSaved(FACE_MODEL.url, FACE_CACHE))) throw new Error(FACE_MODEL.name + " is not downloaded. Download it first (Models page, or the Face blur tool).");
      onStatus && onStatus("Starting " + FACE_MODEL.name + "…");
      const { bytes } = await getModelBytes(FACE_MODEL.url, undefined, undefined, FACE_CACHE);
      session = (await createSession(bytes, false)).session;
      return session;
    })().catch((e) => { starting = null; throw e; });
  }
  return starting;
}

// Finds the faces in `canvas`: { faces: [{ x, y, w, h, score }] in picture pixels (score 0..1, everything from 10 % up), info }.
export async function detectFaces(canvas, onStatus) {
  const sess = await acquire(onStatus);
  const ort = await loadOrt();
  const W = FACE_SIZE, H = FACE_SIZE;
  const k = Math.min(W / canvas.width, H / canvas.height);
  const w = Math.round(canvas.width * k), h = Math.round(canvas.height * k);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#000"; x.fillRect(0, 0, W, H); x.drawImage(canvas, 0, 0, w, h);
  const input = new ort.Tensor("float32", yunetInput(x.getImageData(0, 0, W, H).data, W, H), [1, 3, H, W]);
  onStatus && onStatus("Finding faces…");
  const t0 = performance.now();
  const out = await sess.run({ [sess.inputNames[0]]: input });
  const runMs = Math.round(performance.now() - t0);
  const names = sess.outputNames;
  const get = (p, s) => { const n = names.find((q) => q === p + "_" + s) || names.find((q) => q.includes(p) && q.includes(String(s))); return n ? out[n].data : null; };
  const faces = decodeYunet(get, W, H, k, 0.1);
  touch();
  return { faces, info: { model: FACE_MODEL.label, inputSize: W + "x" + H, fitScale: k, outputNames: names.join(","), runMs, found10pct: faces.length } };
}
