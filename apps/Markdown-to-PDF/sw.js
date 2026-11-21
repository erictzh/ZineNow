// Service worker for this app: offline copy + installability. The caching logic is
// shared by every ZineNow app and lives in ../../shared/js/pwa/sw-core.js; see
// docs/MAINTAINING.md ("Offline / PWA") before changing anything here.
//
// HTML/JS/CSS are served network-first, so ordinary deploys reach users without touching
// this file. Bump CACHE_VERSION when FILES or CDN change (a file added, renamed or
// removed), so the old cache is dropped and the new list is precached.
const CACHE_VERSION = 3;

// Must all exist: install fails if any of these 404s.
const FILES = [
  "index.html",
  "dist/app.js",
  "styles.css",
  "component-kit.css",
  "defaultConfig.json",
  "sample.md",
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
  "../../shared/styles/displaySettings.css",
];

// Best effort (install still succeeds without them). Keep in step with index.html and
// the Paged.js / html2canvas URLs in src/document/previewDocument.js and
// src/export/rasterDocument.js.
const CDN = [
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://cdn.tailwindcss.com/",
  "https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js",
  "https://cdn.jsdelivr.net/combine/npm/prismjs@1.29.0/components/prism-core.min.js,npm/prismjs@1.29.0/components/prism-markup.min.js,npm/prismjs@1.29.0/components/prism-css.min.js,npm/prismjs@1.29.0/components/prism-clike.min.js,npm/prismjs@1.29.0/components/prism-javascript.min.js,npm/prismjs@1.29.0/components/prism-json.min.js,npm/prismjs@1.29.0/components/prism-markup-templating.min.js,npm/prismjs@1.29.0/components/prism-php.min.js,npm/prismjs@1.29.0/components/prism-liquid.min.js,npm/prismjs@1.29.0/components/prism-python.min.js,npm/prismjs@1.29.0/components/prism-bash.min.js,npm/prismjs@1.29.0/components/prism-yaml.min.js,npm/prismjs@1.29.0/components/prism-excel-formula.min.js,npm/prismjs@1.29.0/components/prism-markdown.min.js",
  "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js",
  "https://cdn.jsdelivr.net/npm/turndown@7.2.0/dist/turndown.js",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js",
  "https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
];

importScripts("../../shared/js/pwa/sw-core.js");
startZineNowServiceWorker({ app: "md2pdf", version: CACHE_VERSION, files: FILES, cdn: CDN });
