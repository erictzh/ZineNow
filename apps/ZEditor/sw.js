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
  "styles/base.css",
  "styles/layout.css",
  "styles/topbar.css",
  "styles/overlays.css",
  "styles/sidebar.css",
  "styles/compose.css",
  "styles/format-panel.css",
  "styles/layers.css",
  "styles/font-combobox.css",
  "styles/dialogs.css",
  "styles/responsive.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "../../shared/js/pwa/register.js",
  "../../shared/styles/tokens.css",
  "../../shared/styles/buttons.css",
  "../../shared/styles/topbar.css",
  "../../shared/styles/tabs.css",
  "../../shared/styles/toggle.css",
  "../../shared/styles/scrollbars.css",
  "../../shared/vendor/pdfjs/build/pdf.js",
  "../../shared/vendor/pdfjs/build/pdf.worker.js",
  "../../shared/vendor/pdf-lib/pdf-lib.min.js",
  "../../shared/vendor/fontkit/fontkit.umd.min.js",
];

// Best effort (install still succeeds without them). Keep in step with index.html.
const CDN = [
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
];

importScripts("../../shared/js/pwa/sw-core.js");
startZineNowServiceWorker({ app: "zeditor", version: CACHE_VERSION, files: FILES, cdn: CDN });
