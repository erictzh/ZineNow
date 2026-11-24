// Service worker for the wiki: offline copy + installability. The caching logic is shared by every ZineNow app and lives in
// ../../shared/js/pwa/sw-core.js; see docs/MAINTAINING.md ("Offline / PWA") before changing anything here.
//
// The wiki is one page plus one generated script (content.js, all the pages), so the whole wiki works offline after one visit.
// Own files are served network-first (a new deploy reaches you on your next visit); the cache is the offline copy.
// Bump CACHE_VERSION when FILES change (a file added, renamed or removed).
const CACHE_VERSION = 1;

// Must all exist: install fails if any of these 404s.
const FILES = [
  "index.html",
  "content.js",
  "wiki.js",
  "wiki.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "../../shared/js/pwa/register.js",
  "../../shared/styles/tokens.css",
  "../../shared/styles/scrollbars.css",
];

importScripts("../../shared/js/pwa/sw-core.js");
startZineNowServiceWorker({ app: "wiki", version: CACHE_VERSION, files: FILES, cdn: [] });
