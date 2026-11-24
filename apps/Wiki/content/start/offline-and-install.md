## Intro

The apps can be **installed** like phone apps and work **offline** once visited. This is called a **PWA**, a *progressive web app*: an ordinary website plus two small extras: a **manifest** (a card describing the app: name, colours, icons) and a **service worker** (a background script that sits between the page and the network and can answer from saved copies).

## How to use

- **Install:** open an app over `https://` (the live site) in Chrome, Edge or a phone browser and choose *Install* / *Add to home screen*. It then opens in its own window, with no browser bar.
- **Offline:** after one visit the app's files are saved; you can open it with no connection. (Markdown to PDF and some libraries need internet the *first* time, since they come from a CDN; ZEditor and ZineArranger are fully local. AI models are saved only when you download them.)
- **Updates:** each time you open the app online, the newest files are fetched, so a new version arrives on your next visit.
- Opened straight from disk (`file://`) none of this applies: service workers only exist over `http(s)`. The apps still work, just without offline caching.

## How it works

### Registering

`register.js` runs only over `http(s)`. It adds the manifest `<link>` and registers `sw.js`. After the worker is ready, the page sends it a list of everything it has loaded (`performance.getEntriesByType("resource")`) so files fetched *before* the worker took control (fonts, CDN scripts) are saved too. `updateViaCache: "none"` makes the browser check `sw.js` against the server every time, ignoring its ordinary HTTP cache.

### Strategies

A **strategy** is a rule for answering a request:
- **Own files: network first.** Ask the server (with `cache: "no-cache"`, so even GitHub Pages' 10-minute HTTP cache cannot serve a stale copy). If the network is slow (over **4 seconds**) or fails, use the saved copy. A good copy is saved after every successful fetch.
- **Pinned CDN files: cache first.** A library at a fixed address, such as `onnxruntime-web@1.31.1`, never changes, so a saved copy is used at once.
- **Unpinned CDN files** (Tailwind's CDN, Google Fonts CSS): serve the saved copy, and **refresh it in the background** (*stale-while-revalidate*).

### Install and activate

On **install**, the worker saves the app's own listed files (all must succeed or the install fails) and, best effort, its CDN libraries; `skipWaiting()` takes over at once. On **activate** it deletes the caches of older versions (`zinenow-<app>-v<number>`), then `clients.claim()` takes control of open pages. A bumped `CACHE_VERSION` in an app's `sw.js` is how a changed file list is rolled out.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `register.js`

```js file=shared/js/pwa/register.js
(function () {
  "use strict";
  var protocol = window.location.protocol;
  if (protocol !== "http:" && protocol !== "https:") return;

  var link = document.createElement("link");
  link.rel = "manifest";
  link.href = "manifest.webmanifest";
  document.head.appendChild(link);

  if (!("serviceWorker" in navigator)) return;

  function cacheWhatThisPageLoaded(registration) {
    var worker = registration.active;
    if (!worker || !window.performance || !performance.getEntriesByType) return;
    var urls = performance.getEntriesByType("resource").map(function (e) { return e.name; });
    urls.push(window.location.href.split("#")[0]);
    worker.postMessage({ type: "zinenow-cache-urls", urls: urls });
  }

  function register() {
    // updateViaCache "none": the browser checks sw.js and its importScripts() files
    // against the server on every navigation, ignoring the HTTP cache.
    navigator.serviceWorker
      .register("sw.js", { updateViaCache: "none" })
      .then(function () { return navigator.serviceWorker.ready; })
      .then(cacheWhatThisPageLoaded)
      .catch(function (err) {
        // Offline support is optional; the app itself works without it.
        console.warn("ZineNow: offline support unavailable (" + (err && err.message) + ")");
      });
  }

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
})();

```

**The Logic:** `window.location.protocol` is `"https:"`, `"http:"` or `"file:"`; any other returns early. A `<link rel="manifest">` is created and appended to `<head>`. `"serviceWorker" in navigator` is a **feature test** (older browsers lack it). `navigator.serviceWorker.register("sw.js", …)` returns a **Promise**; `.then` chains the next step, `.catch` only logs a warning: offline support is optional. `cacheWhatThisPageLoaded` posts a message to the worker with the list of resource addresses plus the page's own address without `#…`.

### Answering requests: `networkFirst`

```js file=shared/js/pwa/sw-core.js fn=fetchFresh,networkFirst,fromCdn
```

**The Logic:** `fetchFresh` asks the server with `cache: "no-cache"` (revalidate with the server, never trust the HTTP cache blindly). A page **navigation** request cannot be copied with new options, so it is re-requested by address. `networkFirst` starts the fetch and **races** it (`Promise.race`) against a 4-second timer that, when it fires, looks the answer up in the cache. Whichever finishes first wins; if the timer wins but nothing is saved, the network answer is still waited for (`slow.then(hit => hit || network)`). A failed network falls back to the cache (and for a page navigation, to `index.html`). `event.waitUntil(network.catch(() => {}))` keeps the worker alive until the saved copy is updated. `fromCdn` is cache-first: a hit is returned, optionally refreshing behind it for the *revalidate* hosts.

**Worked example.** You open ZineArranger on a train with no signal: `fetchFresh` fails at once → `cachedLookup()` → the saved `index.html` and files are returned, and the app opens. On good WiFi after a new release: the network answer arrives within 4 s, is saved, and **replaces** the old copy: this load already shows the new version. On a slow connection (6 s): the timer fires at 4 s and the saved version is shown; the new copy is still saved when it arrives for the next visit.

### One app's list

```js file=apps/AiToolsLocal/sw.js
// Bump CACHE_VERSION when FILES or CDN change.
const CACHE_VERSION = 2;

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
```

**The Logic:** each app lists its own files (`FILES`) and CDN files (`CDN`), then calls the shared `startZineNowServiceWorker`. `importScripts(...)` loads the shared script (a service worker is a classic script, so no `import`). Raising `CACHE_VERSION` changes the cache name, which makes old caches get deleted on activate.
