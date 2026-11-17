// Opening and saving files with the browser's native dialogs (falling back to a hidden input / a download), and copying text.

// Each dialog passes an `id`: the browser remembers, per id, the folder
// last used with it — so Open and Save sharing one id share one folder.
// No web page can point a dialog at a folder by itself.

// Opens a native "Open" dialog for one file. Resolves to the File, to
// null if the dialog was closed, or to "fallback" when the native dialog
// isn't available (Firefox, Safari) or failed — the caller then clicks
// its hidden <input type="file"> instead.
export async function pickFile({ id, description, accept }) {
  if (typeof window.showOpenFilePicker !== "function") return "fallback";
  try {
    const handles = await window.showOpenFilePicker({ id, multiple: false, types: [{ description, accept }] });
    return await handles[0].getFile();
  } catch (err) {
    if (err && err.name === "AbortError") return null;
    return "fallback";
  }
}

// Saves text through a native "Save As" dialog, so it can go into (or
// overwrite a file in) any folder. Works from file:// in Chrome, which
// treats it as a secure context; the call must come straight from a
// click. Browsers without the dialog get a forced download instead.
// Resolves to { saved: fileName }, { downloaded: fileName }, or null if
// the dialog was closed. Throws if even the download failed.
export async function saveTextFile(text, { id, filename, mimeType, description, extensions }) {
  if (typeof window.showSaveFilePicker !== "function") return downloadText(text, filename, mimeType);
  try {
    const handle = await window.showSaveFilePicker({
      id,
      suggestedName: filename,
      types: [{ description, accept: { [mimeType]: extensions } }],
    });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return { saved: handle.name };
  } catch (err) {
    // The user closed the Save As dialog without picking a file — not an error.
    if (err && err.name === "AbortError") return null;
    return downloadText(text, filename, mimeType);
  }
}

function downloadText(text, filename, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { downloaded: filename };
}

// Copies text to the clipboard. navigator.clipboard needs a secure
// context (file:// already is one); execCommand('copy') covers the rest.
export async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("The browser blocked the copy.");
}
