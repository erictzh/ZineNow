// Service worker for this app: offline copy + installability. The caching logic is
// shared by every ZineNow app and lives in ../../shared/js/pwa/sw-core.js; see
// docs/MAINTAINING.md ("Offline / PWA") before changing anything here.
//
// HTML/JS/CSS are served network-first, so ordinary deploys reach users without touching
// this file. Bump CACHE_VERSION when FILES or CDN change (a file added, renamed or
// removed), so the old cache is dropped and the new list is precached.
const CACHE_VERSION = 1;

// Must all exist: install fails if any of these 404s.
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
  "../../shared/vendor/pdfjs/build/pdf.js",
  "../../shared/vendor/pdfjs/build/pdf.worker.js",
];

importScripts("../../shared/js/pwa/sw-core.js");
startZineNowServiceWorker({ app: "zinearranger", version: CACHE_VERSION, files: FILES });
