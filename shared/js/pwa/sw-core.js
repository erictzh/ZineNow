// Service-worker logic shared by every ZineNow app. Each app's own sw.js lists its files
// and calls startZineNowServiceWorker(); this file is pulled in with importScripts(), so it
// is a plain classic worker script (no import/export) and is never bundled into dist/app.js.
//
// Strategy (see docs/MAINTAINING.md, "Offline / PWA"):
//   - Install: precache the app's own files (must all succeed) and, best effort, the
//     pinned CDN libraries it loads (a failure there doesn't block install).
//   - Same-origin requests: network first, checked with the server every time (fetchFresh, so the
//     browser's 10-minute HTTP cache can't hold back a deploy), so a deploy reaches users on their next load;
//     the cache is only the offline fallback (and the answer if the network takes longer
//     than NETWORK_TIMEOUT_MS while a cached copy exists).
//   - CDN requests (CDN_HOSTS): cache first for version-pinned URLs and font files,
//     stale-while-revalidate for unpinned ones (Tailwind's CDN, Google Fonts CSS).
//   - Activate: delete this app's caches from older versions, then take control of open
//     pages straight away.
//   - The page posts {type: "zinenow-cache-urls", urls} after load (shared/js/pwa/register.js)
//     so files it fetched before this worker controlled it (fonts, CDN scripts) get cached too.

/* eslint-env serviceworker */

const CDN_HOSTS = [
  "unpkg.com",
  "cdn.jsdelivr.net",
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];
// Unpinned URLs whose content can change under the same URL: serve cached, refresh behind.
const REVALIDATE_HOSTS = ["cdn.tailwindcss.com", "fonts.googleapis.com"];
const NETWORK_TIMEOUT_MS = 4000;

// eslint-disable-next-line no-unused-vars
function startZineNowServiceWorker({ app, version, files, cdn = [] }) {
  const prefix = `zinenow-${app}-`;
  const CACHE = `${prefix}v${version}`;
  const abs = (u) => new URL(u, self.location).href;

  const isCdn = (url) => CDN_HOSTS.includes(url.hostname);
  const isSameOrigin = (url) => url.origin === self.location.origin;

  // CDN files are fetched in CORS mode so the cache holds a real (non-opaque) response;
  // that response can also answer a page's no-cors <script>/<link> request. Falls back to
  // an opaque no-cors response for a host that doesn't send CORS headers (Tailwind's CDN),
  // which still works for a plain <script> tag.
  async function fetchCdn(request) {
    try {
      const res = await fetch(new Request(request.url, { mode: "cors", credentials: "omit" }));
      if (res.ok) return res;
    } catch (_) { /* fall through */ }
    return fetch(new Request(request.url, { mode: "no-cors", credentials: "omit" }));
  }

  async function cachePut(cache, request, res) {
    if (res && (res.ok || res.type === "opaque")) {
      try { await cache.put(request, res); } catch (_) { /* quota etc.: not fatal */ }
    }
  }

  self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      // Bypass the HTTP cache so a new version never precaches an old copy.
      await cache.addAll(files.map((f) => new Request(abs(f), { cache: "reload" })));
      await Promise.all(cdn.map(async (u) => {
        try {
          if (!(await cache.match(u))) await cachePut(cache, u, await fetchCdn(new Request(u)));
        } catch (_) { /* best effort */ }
      }));
      await self.skipWaiting();
    })());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(prefix) && n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })());
  });

  // The app's own files, checked with the server every time (cache: "no-cache") rather than taken
  // from the browser's HTTP cache. GitHub Pages lets browsers reuse a file for 10 minutes
  // (max-age=600), so without this a device could keep running the old version for that long
  // after a deploy. An unchanged file costs only a quick "not modified" reply. A page navigation
  // can't be copied with new options, so that one is re-requested by URL.
  function fetchFresh(request) {
    if (request.mode === "navigate") return fetch(request.url, { cache: "no-cache", credentials: "same-origin" });
    return fetch(new Request(request, { cache: "no-cache" }));
  }

  async function networkFirst(event) {
    const { request } = event;
    const cache = await caches.open(CACHE);
    const network = fetchFresh(request).then(async (res) => {
      if (res.ok && res.type === "basic") await cachePut(cache, request, res.clone());
      return res;
    });
    event.waitUntil(network.catch(() => {}));

    const cachedLookup = () =>
      cache.match(request, { ignoreSearch: request.mode === "navigate" }).then(
        (hit) => hit || (request.mode === "navigate" ? cache.match(abs("index.html")) : undefined)
      );

    let timer;
    const slow = new Promise((resolve) => {
      timer = setTimeout(async () => resolve(await cachedLookup()), NETWORK_TIMEOUT_MS);
    });
    try {
      const winner = await Promise.race([network, slow.then((hit) => hit || network)]);
      return winner;
    } catch (err) {
      const hit = await cachedLookup();
      if (hit) return hit;
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fromCdn(event, url) {
    const { request } = event;
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request.url);
    const refresh = () => fetchCdn(request).then(async (res) => {
      await cachePut(cache, request.url, res.clone());
      return res;
    });
    if (cached) {
      if (REVALIDATE_HOSTS.includes(url.hostname)) event.waitUntil(refresh().catch(() => {}));
      return cached;
    }
    return refresh();
  }

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET" || request.headers.has("range")) return;
    const url = new URL(request.url);
    if (isSameOrigin(url)) event.respondWith(networkFirst(event));
    else if (isCdn(url)) event.respondWith(fromCdn(event, url));
    // anything else: not intercepted
  });

  self.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "zinenow-cache-urls" || !Array.isArray(data.urls)) return;
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      for (const u of data.urls) {
        let url;
        try { url = new URL(u); } catch (_) { continue; }
        if (!isCdn(url) && !isSameOrigin(url)) continue;
        if (url.protocol !== "http:" && url.protocol !== "https:") continue;
        try {
          if (await cache.match(url.href)) continue;
          const res = isCdn(url) ? await fetchCdn(new Request(url.href)) : await fetch(url.href);
          if (isCdn(url) || res.type === "basic") await cachePut(cache, url.href, res);
        } catch (_) { /* offline or blocked: skip */ }
      }
    })());
  });
}
