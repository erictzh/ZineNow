// Makes a ZineNow app installable: links its manifest and registers its service worker.
// Loaded by each app's index.html as a plain classic script:
//   <script src="../../shared/js/pwa/register.js" defer></script>
// and expects manifest.webmanifest and sw.js next to that index.html.
//
// Only runs over http(s). Opened straight from disk (file://) it does nothing at all:
// service workers don't exist there, and even linking the manifest would log a CORS
// error, which is why the manifest <link> is added here rather than in the HTML.
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
