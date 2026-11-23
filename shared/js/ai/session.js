// One model session, shared by the page: created the first time it is needed, kept while it is being used, and released after a quiet
// minute so a big document does not have the model sitting in memory. (Ai Tools (Local) keeps its own.)

import { findMaskSign } from "./fill.js";
import { DEFAULT_MODEL_URL, getModelBytes, isModelSaved } from "./modelStore.js";
import { createSession, runModel } from "./runtime.js";

const IDLE_MS = 60000;
let current = null;       // { session, backend, sign } once started
let starting = null;      // the promise while it starts
let timer = 0;

const SIGN_KEY = "zinenow.ai.maskSign:" + DEFAULT_MODEL_URL;
const savedSign = () => { try { const v = Number(localStorage.getItem(SIGN_KEY)); return v === 1 || v === -1 ? v : null; } catch (e) { return null; } };

export function releaseSession() {
  clearTimeout(timer);
  const c = current; current = null; starting = null;
  if (c && c.session && c.session.release) { try { c.session.release(); } catch (e) { /* already gone */ } }
}
const touch = () => { clearTimeout(timer); timer = setTimeout(releaseSession, IDLE_MS); };

// The running session (starting it if needed: the model must already be saved, see manager.js). `onStatus(text)` for the slow parts.
export async function acquireSession(onStatus) {
  if (current) { touch(); return current; }
  if (!starting) {
    starting = (async () => {
      // never downloads by itself: the download is an opt-in (shared/js/ai/manager.js)
      if (!(await isModelSaved(DEFAULT_MODEL_URL))) throw new Error("The AI model is not downloaded. Download it first (Marquee panel, AI model box).");
      onStatus && onStatus("Starting the AI model…");
      const { bytes } = await getModelBytes(DEFAULT_MODEL_URL);
      const made = await createSession(bytes, true);
      let sign = savedSign();
      if (!sign) {
        onStatus && onStatus("Checking the AI model (one time)…");
        sign = (await findMaskSign((rgba, hole, s) => runModel(made.session, rgba, hole, s))).sign;
        try { localStorage.setItem(SIGN_KEY, String(sign)); } catch (e) { /* asked again next time */ }
      }
      current = { session: made.session, backend: made.backend, sign, bytes };
      return current;
    })().catch((e) => { starting = null; throw e; });
  }
  const c = await starting; touch(); return c;
}

// Runs the model; if the graphics chip fails, retries once on the processor.
export async function runOnSession(rgba, hole, onStatus) {
  const c = await acquireSession(onStatus);
  try { const out = await runModel(c.session, rgba, hole, c.sign); touch(); return out; }
  catch (e) {
    if (c.backend !== "gpu") throw e;
    onStatus && onStatus("The graphics chip failed; trying the processor…");
    const cpu = await createSession(c.bytes, false);
    try { c.session.release && c.session.release(); } catch (err) { /* ignore */ }
    current = { session: cpu.session, backend: "cpu", sign: c.sign, bytes: c.bytes };
    touch();
    return runModel(cpu.session, rgba, hole, c.sign);
  }
}
