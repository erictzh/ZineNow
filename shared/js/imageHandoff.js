// "Send to ZEditor" for pictures: the hand-off between apps, same idea as zineArrangerHandoff.js (which sends PDFs to ZineArranger).
// Ai Tools (Local) sends with sendImageToZEditor; ZEditor receives with listenForHandoffImage (apps/ZEditor/src/state/useImageHandoff.js).
// Only pages of the same site (same origin) are listened to.

// ZEditor -> its opener, repeated every 500 ms for a few seconds once it has loaded.
export const ZEDITOR_READY_MESSAGE = "zeditor-ready";
// Sender -> ZEditor: { type, buffer (ArrayBuffer, transferred), filename, mime }.
export const HANDOFF_IMAGE_MESSAGE = "zinenow-handoff-image";

// Opens ZEditor in a new tab, waits for it to say it is ready, and hands the picture over. The path is relative to the calling page,
// which must be an app in apps/<App>/index.html. Must be called straight from a click handler (window.open runs before the first
// await, so the browser doesn't take the tab for a popup). `getBlob()` makes the picture (a Blob).
export async function sendImageToZEditor(getBlob, filename) {
  const win = window.open("../ZEditor/index.html", "_blank");
  if (!win) throw new Error("The browser blocked the new tab. Allow pop-ups for this page and try again.");
  // listen BEFORE any other await: ZEditor can be ready before the picture is
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { window.removeEventListener("message", onMessage); reject(new Error("ZEditor didn't answer. It may still be loading: try again in a moment.")); }, 20000);
    function onMessage(e) {
      if (e.source !== win || e.origin !== location.origin || !e.data || e.data.type !== ZEDITOR_READY_MESSAGE) return;
      clearTimeout(timer); window.removeEventListener("message", onMessage); resolve();
    }
    window.addEventListener("message", onMessage);
  });
  const blob = await getBlob();
  const buffer = await blob.arrayBuffer();
  await ready;
  win.postMessage({ type: HANDOFF_IMAGE_MESSAGE, buffer, filename, mime: blob.type || "image/png" }, location.origin, [buffer]);
}

// For the receiving app: tells the opener this page is ready (every 500 ms, up to 20 s, until a picture has arrived) and calls
// `onImage(file)` with the picture as a File. Does nothing if the page was not opened by another page. Returns a function that stops it.
export function listenForHandoffImage(onImage) {
  if (!window.opener || window.opener === window) return () => {};
  let ping = 0, stopped = false;
  const stop = () => { stopped = true; clearInterval(ping); window.removeEventListener("message", onMessage); };
  function onMessage(e) {
    if (e.source !== window.opener || e.origin !== location.origin || !e.data || e.data.type !== HANDOFF_IMAGE_MESSAGE) return;
    stop();
    onImage(new File([e.data.buffer], e.data.filename || "picture.png", { type: e.data.mime || "image/png" }));
  }
  window.addEventListener("message", onMessage);
  let n = 0;
  const send = () => {
    if (stopped) return;
    try { window.opener.postMessage({ type: ZEDITOR_READY_MESSAGE }, location.origin); } catch (err) { /* the opener went away */ }
    if (++n > 40) stop();
  };
  ping = setInterval(send, 500); send();
  return stop;
}
