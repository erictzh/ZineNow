// What the apps need to offer "download the AI model" / "delete it" as an opt-in: what a download is made of, whether it is saved,
// downloading it (with progress and Cancel), and deleting it. Used by ZEditor's AI fill style (Ai Tools (Local) has its own, simpler flow).
//
// A download = the model file (kept by modelStore.js in the Cache API) + the AI runtime (onnxruntime-web: a small script plus a
// large .wasm file, fetched from a CDN; the app's service worker keeps them, shared/js/pwa/sw-core.js).

import { DEFAULT_MODEL_URL, forgetModel, forgetModelUrl, getModelBytes, isModelSaved } from "./modelStore.js";
import { ORT_VERSION, gpuUsable } from "./runtime.js";
import { releaseSession } from "./session.js";
import { BG_CACHE, BG_MODELS, bgModel } from "./bgModel.js";
import { releaseBgSession } from "./bgSession.js";

const CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VERSION + "/dist/";
// Sizes in MB (as published for runtime 1.31.1 and the model file); the numbers in the dialog are rounded from these.
export const SIZES = { model: 28.2, runtimeGpu: 30.4, runtimeCpu: 15.7 };
export const MODEL_SOURCE = { model: "huggingface.co", runtime: "cdn.jsdelivr.net" };

export function runtimeUrls(gpu) {
  return (gpu ? ["ort.all.min.js", "ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"] : ["ort.all.min.js", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]).map((f) => CDN + f);
}

// { gpu, modelMb, runtimeMb, totalMb } for this device (the graphics-chip runtime is the bigger one).
export async function downloadPlan() {
  const gpu = await gpuUsable();
  const runtimeMb = gpu ? SIZES.runtimeGpu : SIZES.runtimeCpu;
  return { gpu, modelMb: SIZES.model, runtimeMb, totalMb: Math.round(SIZES.model + runtimeMb) };
}

// { model: bool, runtime: bool } is each part saved on this device.
export async function aiSaved() {
  const plan = await downloadPlan();
  const runtimeSaved = await Promise.all(runtimeUrls(plan.gpu).map(async (u) => { try { return Boolean(await caches.match(u)); } catch (e) { return false; } }));
  return { model: await isModelSaved(DEFAULT_MODEL_URL), runtime: runtimeSaved.every(Boolean) };
}

// Downloads whatever is missing. `onProgress(doneMb, totalMb)`; `signal` (an AbortSignal) cancels it (the model is only kept once it
// is complete). Resolves when both parts are saved. `which`: "fill" (MI-GAN, the default) or "background" (U²-Netp).
export async function downloadAi({ onProgress, signal, which = "fill", model = "u2netp" } = {}) {
  const bg = which === "background";
  const plan = await downloadPlan();
  const saved = bg ? await bgSaved(model) : await aiSaved();
  const modelMb = bg ? bgModel(model).mb : plan.modelMb;
  const total = (saved.runtime ? 0 : plan.runtimeMb) + (saved.model ? 0 : modelMb);
  let doneMb = 0;
  const report = (extra) => onProgress && onProgress(Math.min(total, doneMb + extra), total);
  if (!saved.runtime) {
    // fetched through the page, so the app's service worker (which caches pinned CDN files) keeps them
    for (const url of runtimeUrls(plan.gpu)) {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("Couldn't download the AI runtime (HTTP " + res.status + ").");
      const copy = res.clone();
      const reader = res.body.getReader(); let got = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; got += value.length; report(got / 1048576); }
      doneMb += got / 1048576;
      // the service worker normally keeps it; when it has not (no worker, or private mode) this app keeps its own copy, so "downloaded" is true
      try { if (!(await caches.match(url))) await (await caches.open("zinenow-ai-runtime")).put(url, copy); } catch (e) { /* the browser said no: it will be fetched again when needed */ }
    }
  }
  if (!saved.model) {
    if (bg) await getModelBytes(bgModel(model).url, (got) => report(got / 1048576), signal, BG_CACHE);
    else await getModelBytes(DEFAULT_MODEL_URL, (got) => report(got / 1048576), signal);
  }
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* the browser decides */ }
  onProgress && onProgress(total, total);
}

// A background-removal model (key "u2netp" or "modnet"): { gpu, modelMb, runtimeMb, totalMb } (the runtime is shared with the others).
export async function bgPlan(key) {
  const plan = await downloadPlan();
  const mb = bgModel(key).mb;
  return { gpu: plan.gpu, modelMb: mb, runtimeMb: plan.runtimeMb, totalMb: Math.round(mb + plan.runtimeMb) };
}
export async function bgSaved(key) {
  const saved = await aiSaved();
  return { model: await isModelSaved(bgModel(key).url, BG_CACHE), runtime: saved.runtime };
}
// Is any AI model saved (the fill model or a background-removal one)? The runtime is only deleted when none is.
async function anyModelSaved(except) {
  if (except !== "fill" && (await isModelSaved(DEFAULT_MODEL_URL))) return true;
  for (const m of BG_MODELS) if (m.key !== except && (await isModelSaved(m.url, BG_CACHE))) return true;
  return false;
}

async function deleteRuntime() {
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) if (/onnxruntime-web/.test(req.url)) await cache.delete(req);
    }
  } catch (e) { /* nothing more to delete */ }
}

// Deletes one background-removal model. The runtime goes too only when no other AI model is saved.
export async function deleteBg(key) {
  releaseBgSession();
  await forgetModelUrl(bgModel(key).url, BG_CACHE);
  if (!(await anyModelSaved(key))) await deleteRuntime();
}

// Deletes the model and the AI runtime files from this device (the other app that uses them will download them again if needed).
export async function deleteAi() {
  releaseSession();
  await forgetModel();
  if (!(await anyModelSaved("fill"))) await deleteRuntime();
}
