// Text from image (OCR) with Tesseract.js: downloading (opt-in, with progress), keeping, deleting and running it.
// Tesseract.js keeps each language file itself (IndexedDB "keyval-store", key "./<code>.traineddata"); this file keeps a flag for the reader's code
// (the service worker / browser cache keeps that) and removes both on Delete. Nothing is downloaded unless downloadOcr() is called.

import { CORE_URL, OCR_ENGINE_MB, TJS_URL, WORKER_URL, ocrLang, ocrLangUrl } from "./ocrLangs.js";

const FLAG = "zinenow.ocr.engineSaved";
const IDLE_MS = 60000;
const workers = new Map(); // language code -> worker (or the promise while it starts)
let timer = 0;

export const ocrEngineSaved = () => { try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return false; } };
const setEngineFlag = (on) => { try { if (on) localStorage.setItem(FLAG, "1"); else localStorage.removeItem(FLAG); } catch (e) { /* not kept */ } };

function idb(fn) {
  return new Promise((resolve) => {
    let q;
    try { q = indexedDB.open("keyval-store"); } catch (e) { resolve(null); return; }
    q.onupgradeneeded = () => { try { q.result.createObjectStore("keyval"); } catch (e) { /* exists */ } };
    q.onerror = () => resolve(null);
    q.onsuccess = async () => { const db = q.result; try { resolve(await fn(db)); } catch (e) { resolve(null); } finally { db.close(); } };
  });
}
export async function ocrLangSaved(code) {
  const r = await idb((db) => new Promise((res) => {
    if (!db.objectStoreNames.contains("keyval")) { res(false); return; }
    const q = db.transaction("keyval").objectStore("keyval").getKey("./" + code + ".traineddata");
    q.onsuccess = () => res(q.result !== undefined); q.onerror = () => res(false);
  }));
  return Boolean(r);
}

let scriptPromise = null;
export function loadTesseract() {
  if (self.Tesseract) return Promise.resolve(self.Tesseract);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script"); s.src = TJS_URL;
      s.onload = () => resolve(self.Tesseract);
      s.onerror = () => { scriptPromise = null; reject(new Error("Couldn't load the text reader. It needs the internet the first time.")); };
      document.head.append(s);
    });
  }
  return scriptPromise;
}

const makeWorker = async (code, logger = () => {}) => (await loadTesseract()).createWorker(code, 1, { workerPath: WORKER_URL, corePath: CORE_URL, langPath: ocrLangUrl(code), logger });

// Downloads the reader's code (if missing) and the language file: starts a reader once, which fetches and keeps both. `onProgress(doneMb, totalMb)`.
export async function downloadOcr(code, { onProgress, signal } = {}) {
  const lang = ocrLang(code);
  const engine = ocrEngineSaved() ? 0 : OCR_ENGINE_MB;
  const total = engine + lang.mb;
  let aborted = false;
  if (signal) signal.addEventListener("abort", () => { aborted = true; });
  const report = (done) => onProgress && onProgress(Math.min(total, done), total);
  report(0);
  const worker = await makeWorker(code, (m) => {
    if (typeof m.progress !== "number") return;
    if (/core/.test(m.status)) report(m.progress * engine);
    else if (/language/.test(m.status)) report(engine + m.progress * lang.mb);
    else if (/initializing/.test(m.status)) report(engine + (m.status.includes("api") ? lang.mb : 0));
  });
  try { await worker.terminate(); } catch (e) { /* already gone */ }
  setEngineFlag(true);
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* the browser decides */ }
  report(total);
  if (aborted) { const err = new Error("Cancelled"); err.name = "AbortError"; throw err; } // (the files that had arrived are kept)
}

export function releaseOcr() {
  clearTimeout(timer);
  const all = [...workers.values()]; workers.clear();
  for (const w of all) Promise.resolve(w).then((x) => { if (x && x.terminate) { try { x.terminate(); } catch (e) { /* gone */ } } }, () => {});
}
const touch = () => { clearTimeout(timer); timer = setTimeout(releaseOcr, IDLE_MS); };

async function deleteEngineFiles() {
  setEngineFlag(false);
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) if (/tesseract/i.test(req.url)) await cache.delete(req);
    }
  } catch (e) { /* nothing more to delete */ }
}
// Deletes one language file; the reader's code goes too when no language is left. `savedCodes`: all language codes (to check what remains).
export async function deleteOcrLang(code, allCodes) {
  releaseOcr();
  await idb((db) => new Promise((res) => { const t = db.transaction("keyval", "readwrite"); t.objectStore("keyval").delete("./" + code + ".traineddata"); t.oncomplete = () => res(true); t.onerror = () => res(false); }));
  let any = false;
  for (const c of allCodes) if (c !== code && (await ocrLangSaved(c))) any = true;
  if (!any) await deleteEngineFiles();
}

// Reads the text in `canvas`: { text, confidence (0..100), words: [{ text, confidence, bbox: {x0,y0,x1,y1} }], runMs }. The language must be downloaded.
// `psm`: Tesseract's page layout mode ("3" automatic, "6" one block, "7" one line, "11" scattered text).
export async function recognizeText(canvas, { lang = "eng", psm = "3" } = {}, onStatus) {
  if (!(await ocrLangSaved(lang))) throw new Error(ocrLang(lang).name + " is not downloaded. Download it first (Models page, or the Text from image tool).");
  touch();
  if (!workers.has(lang)) {
    onStatus && onStatus("Starting the text reader…");
    workers.set(lang, makeWorker(lang).catch((e) => { workers.delete(lang); throw e; }));
  }
  const worker = await workers.get(lang);
  await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
  onStatus && onStatus("Reading the text…");
  const t0 = performance.now();
  const { data } = await worker.recognize(canvas);
  touch();
  return { text: (data.text || "").trim(), confidence: data.confidence || 0, words: (data.words || []).filter((w) => w.text && w.text.trim()), runMs: Math.round(performance.now() - t0) };
}
