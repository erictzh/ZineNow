// The model file: downloaded once (with progress), then kept in the browser's cache so the app works offline afterwards.

export const DEFAULT_MODEL_URL = "https://huggingface.co/lxfater/inpaint-web/resolve/main/migan.onnx";
const CACHE_NAME = "zinenow-ai-tools-model";

export async function isModelSaved(url, cacheName = CACHE_NAME) {
  try { return Boolean(await (await caches.open(cacheName)).match(url)); } catch (e) { return false; }
}

// The model's bytes. `onProgress(doneBytes, totalBytes)` while it downloads; not called when it is already saved.
export async function getModelBytes(url, onProgress, signal, cacheName = CACHE_NAME) {
  let cache = null;
  try { cache = await caches.open(cacheName); } catch (e) { /* no cache storage: it downloads every time */ }
  if (cache) {
    const saved = await cache.match(url);
    if (saved) return { bytes: await saved.arrayBuffer(), downloaded: false };
  }
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) throw new Error("Couldn't download the model (HTTP " + res.status + "). Check your internet connection.");
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    if (onProgress) onProgress(got, total);
  }
  const bytes = new Uint8Array(got); let off = 0;
  for (const c of chunks) { bytes.set(c, off); off += c.length; }
  if (cache) { try { await cache.put(url, new Response(bytes.buffer, { headers: { "content-type": "application/octet-stream" } })); } catch (e) { /* too big for the quota: not kept */ } }
  return { bytes: bytes.buffer, downloaded: true };
}

export async function forgetModel(cacheName = CACHE_NAME) {
  try { await caches.delete(cacheName); } catch (e) { /* nothing to forget */ }
}

// Deletes one saved model (its file only), leaving the others in the same cache.
export async function forgetModelUrl(url, cacheName = CACHE_NAME) {
  try { await (await caches.open(cacheName)).delete(url); } catch (e) { /* nothing to forget */ }
}
