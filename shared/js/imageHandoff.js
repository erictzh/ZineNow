// Sending a picture from one ZineNow app to another: ZEditor <-> Ai Tools (Local). Same idea as zineArrangerHandoff.js (which sends
// PDFs to ZineArranger), but both ways, and only between pages of the same site (same origin).
//
//   - sendImageToApp / sendImageToZEditor / sendImageToAiTools: open the other app in a new tab, wait for it to say it is ready, hand
//     the picture over. Must be called straight from a click handler (window.open runs before the first await).
//   - sendImageToOpener: the tab that opened this one is still there (e.g. ZEditor opened Ai Tools): send the picture back to it.
//   - listenForHandoffImage: for the receiving app: say "ready" to whoever opened this tab, and call onImage(file) for every picture
//     that arrives.

export const ZEDITOR_READY_MESSAGE = "zeditor-ready";
export const AITOOLS_READY_MESSAGE = "aitools-ready";
// Sender -> receiver: { type, buffer (ArrayBuffer, transferred), filename, mime, meta }. `meta` (optional, a plain object) travels with the
// picture and is handed back with it: ZEditor puts a layer's page and box there, so the result lands exactly where the original was.
export const HANDOFF_IMAGE_MESSAGE = "zinenow-handoff-image";

export async function sendImageToApp(path, readyType, getBlob, filename, meta) {
  const win = window.open(path, "_blank");
  if (!win) throw new Error("The browser blocked the new tab. Allow pop-ups for this page and try again.");
  // listen BEFORE any other await: the other app can be ready before the picture is
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { window.removeEventListener("message", onMessage); reject(new Error("The other app didn't answer. It may still be loading: try again in a moment.")); }, 20000);
    function onMessage(e) {
      if (e.source !== win || e.origin !== location.origin || !e.data || e.data.type !== readyType) return;
      clearTimeout(timer); window.removeEventListener("message", onMessage); resolve();
    }
    window.addEventListener("message", onMessage);
  });
  const made = await getBlob(); // a Blob, or { blob, meta } when the meta is only known once the picture is made
  const blob = made.blob || made;
  const buffer = await blob.arrayBuffer();
  await ready;
  win.postMessage({ type: HANDOFF_IMAGE_MESSAGE, buffer, filename, mime: blob.type || "image/png", meta: made.blob ? made.meta : meta }, location.origin, [buffer]);
}
export const sendImageToZEditor = (getBlob, filename, meta) => sendImageToApp("../ZEditor/index.html", ZEDITOR_READY_MESSAGE, getBlob, filename, meta);
export const sendImageToAiTools = (getBlob, filename, meta) => sendImageToApp("../AiToolsLocal/index.html", AITOOLS_READY_MESSAGE, getBlob, filename, meta);

// Whether the tab that opened this one is still open and on this site.
export function hasOpener() {
  try { return Boolean(window.opener && window.opener !== window && !window.opener.closed && window.opener.location.origin === location.origin); } catch (e) { return false; }
}
export async function sendImageToOpener(getBlob, filename, meta) {
  if (!hasOpener()) throw new Error("The app that opened this one has been closed.");
  const made = await getBlob();
  const blob = made.blob || made;
  const buffer = await blob.arrayBuffer();
  window.opener.postMessage({ type: HANDOFF_IMAGE_MESSAGE, buffer, filename, mime: blob.type || "image/png", meta: made.blob ? made.meta : meta }, location.origin, [buffer]);
}

// For the receiving app. `readyType` is the message this app answers with (ZEDITOR_READY_MESSAGE or AITOOLS_READY_MESSAGE). It says
// "ready" to the opener every 500 ms for up to 20 s (until the first picture has come), and calls `onImage(file, fromOpener, meta)` for every
// picture that arrives from the opener or from a tab it opened itself. Returns a function that stops listening.
export function listenForHandoffImage(readyType, onImage) {
  let ping = 0, n = 0, pinging = true;
  const stopPing = () => { pinging = false; clearInterval(ping); };
  function onMessage(e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== HANDOFF_IMAGE_MESSAGE || !(e.data.buffer instanceof ArrayBuffer)) return;
    stopPing();
    onImage(new File([e.data.buffer], e.data.filename || "picture.png", { type: e.data.mime || "image/png" }), e.source === window.opener, e.data.meta);
  }
  window.addEventListener("message", onMessage);
  if (window.opener && window.opener !== window) {
    const send = () => {
      if (!pinging) return;
      try { window.opener.postMessage({ type: readyType }, location.origin); } catch (err) { /* the opener went away */ }
      if (++n > 40) stopPing();
    };
    ping = setInterval(send, 500); send();
  }
  return () => { stopPing(); window.removeEventListener("message", onMessage); };
}
