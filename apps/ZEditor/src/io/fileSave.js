// Saving files: native save picker, writing back to a remembered file, download fallback.

import { downloadBlob } from "../../../../shared/js/download.js";

export function canvasToArrayBuffer(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error("Couldn't encode a page image.")); return; }
      resolve(await blob.arrayBuffer());
    }, "image/png");
  });
}

// Same native Save-As pattern Markdown-to-PDF and Zine Arranger use —
// falls back to a forced download for browsers without the File
// System Access API (Firefox, Safari). Shared by Export PDF and Save
// Project — `data` can be bytes, a string, or a Blob. Resolves to the
// chosen file's handle (so Save Project can write to it again without
// asking), "cancelled" if the dialog was closed, or null after the
// download fallback (no handle to keep).
export async function saveFile(data, filename, mimeType, description, extensions) {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description, accept: { [mimeType]: extensions } }],
      });
      await writeFileHandle(handle, data);
      return handle;
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled"; // user closed the dialog — not an error
      // fall through to the download fallback below
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  downloadBlob(blob, filename);
  return null;
}

// Overwrites a file picked earlier (File System Access API). The browser
// may ask once per session to allow editing it; if that's refused this
// throws, and the caller falls back to Save As.
export async function writeFileHandle(handle, data) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
    if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted") {
      throw Object.assign(new Error("Permission to edit the file was refused"), { name: "NotAllowedError" });
    }
  }
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function savePdfBytes(bytes, filename) {
  return saveFile(bytes, filename, "application/pdf", "PDF file", [".pdf"]);
}
