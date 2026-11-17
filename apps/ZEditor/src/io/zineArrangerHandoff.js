// "Send to ZineArranger": opens ZineArranger in a new tab and hands it a PDF.

// Skips the manual export-then-reopen round trip: opens ZineArranger
// in a new tab, waits for it to announce it's ready (its own script
// posts back once loaded — see its "ZEditor handoff" block), then
// hands the exported bytes over via postMessage. ZineArranger feeds
// them into its own file input under the hood, so from there it's
// exactly as if the user had picked the file themselves.
//
// Must be called straight from a click handler: window.open runs before
// the first await, so the browser doesn't treat the tab as a popup.
// `buildBytes()` makes the PDF; throws with a readable message on failure.
export async function sendPdfToZineArranger(buildBytes, filename) {
  const win = window.open("../ZineArranger/index.html", "_blank");
  if (!win) throw new Error("The browser blocked the new tab — allow popups for this page and try again.");

  // Attach the listener BEFORE any other await — ZineArranger starts
  // loading the instant window.open() returns, and can finish and
  // fire its "ready" ping while we're still off rendering pages for
  // export. postMessage doesn't queue for a listener that isn't
  // attached yet, so arriving early would mean losing it for good.
  // (ZineArranger also repeats its ready ping for a few seconds
  // rather than sending it once, as a second line of defense.)
  const readyPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("ZineArranger didn't respond — it may still be loading, or didn't open as a new tab."));
    }, 15000);
    function onMessage(event) {
      if (event.source !== win || !event.data || event.data.type !== "zinearranger-ready") return;
      clearTimeout(timeoutId);
      window.removeEventListener("message", onMessage);
      resolve();
    }
    window.addEventListener("message", onMessage);
  });

  const pdfBytes = await buildBytes();
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

  await readyPromise;
  win.postMessage({ type: "zeditor-handoff-pdf", buffer, filename }, "*", [buffer]);
}
