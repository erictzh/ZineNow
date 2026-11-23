// Runs the model with ONNX Runtime Web (loaded from a CDN the first time, then kept offline by the service worker).
// Uses the graphics chip (WebGPU) when the device has one that works, otherwise the processor (WebAssembly).

import { MODEL_SIZE, buildInput, findMaskSign, outputToRgba } from "./fill.js";

export const ORT_VERSION = "1.31.1";
export const ORT_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VERSION + "/dist/ort.all.min.js";

let ortPromise = null;
export function loadOrt() {
  if (self.ort) return Promise.resolve(self.ort);
  if (!ortPromise) {
    ortPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = ORT_URL;
      s.onload = () => resolve(self.ort);
      s.onerror = () => { ortPromise = null; reject(new Error("Couldn't load the AI runtime. It needs the internet the first time.")); };
      document.head.append(s);
    });
  }
  return ortPromise;
}

export async function gpuUsable() {
  try { return Boolean(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch (e) { return false; }
}

// A model session on the best available chip. Returns { session, backend: "gpu" | "cpu" }.
export async function createSession(modelBytes, preferGpu) {
  const ort = await loadOrt();
  ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
  if (preferGpu && (await gpuUsable())) {
    try { return { session: await ort.InferenceSession.create(modelBytes, { executionProviders: ["webgpu"], graphOptimizationLevel: "all" }), backend: "gpu" }; }
    catch (e) { /* fall through to the processor */ }
  }
  return { session: await ort.InferenceSession.create(modelBytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" }), backend: "cpu" };
}

// One fill: `rgba` is the 512 x 512 window (RGBA bytes), `hole` its mask. Returns the answer as 512 x 512 RGBA bytes.
export async function runModel(session, rgba, hole, sign = 1) {
  const ort = await loadOrt();
  const input = new ort.Tensor("float32", buildInput(rgba, hole, sign), [1, 4, MODEL_SIZE, MODEL_SIZE]);
  const out = await session.run({ [session.inputNames[0]]: input });
  return outputToRgba(out[session.outputNames[0]].data);
}

// Which way round the model wants its mask channel: see findMaskSign in fill.js.
export const findSign = (session) => findMaskSign((rgba, hole, sign) => runModel(session, rgba, hole, sign));
