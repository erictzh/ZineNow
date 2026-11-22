// Service worker for this app: offline copy + installability. The caching logic is shared by every ZineNow app and lives in
// ../../shared/js/pwa/sw-core.js; see docs/MAINTAINING.md ("Offline / PWA") before changing anything here.
//
// The AI runtime (onnxruntime-web) comes from a CDN: its small script is precached below, and its big .wasm files are cached the
// first time they are used (the shared worker keeps version-pinned CDN files cache-first). The model file itself is kept by the
// page in the Cache API (src/modelStore.js), not here.
// Bump CACHE_VERSION when FILES or CDN change.
const CACHE_VERSION = 1;

const FILES = [
  "index.html",
  "dist/app.js",
  "style.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "../../shared/js/pwa/register.js",
  "../../shared/styles/tokens.css",
  "../../shared/styles/buttons.css",
  "../../shared/styles/topbar.css",
  "../../shared/styles/numberFields.css",
];
const CDN = ["https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.all.min.js"];

importScripts("../../shared/js/pwa/sw-core.js");
startZineNowServiceWorker({ app: "aitoolslocal", version: CACHE_VERSION, files: FILES, cdn: CDN });
