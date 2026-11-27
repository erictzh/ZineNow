// A QR code as a picture (PNG data URL), made with qrcode-generator (MIT, Kazuhiko Arase). Black modules on white with the standard 4-module quiet
// zone, error correction "M" (about 15% of the code can be damaged). Text is encoded as UTF-8. Drawn big (16 px a module) so it stays sharp when scaled.

import qrcode from "qrcode-generator";

qrcode.stringToBytes = (text) => Array.from(new TextEncoder().encode(text));
const cache = new Map();

// { src, width, height }, or null when the text is too long for a QR code.
export function qrDataUrl(text, moduleSize = 16) {
  if (cache.has(text)) return cache.get(text);
  let result = null;
  try {
    const qr = qrcode(0, "M");
    qr.addData(text, "Byte");
    qr.make();
    const count = qr.getModuleCount(), quiet = 4, size = (count + quiet * 2) * moduleSize;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000";
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) ctx.fillRect((col + quiet) * moduleSize, (row + quiet) * moduleSize, moduleSize, moduleSize);
    result = { src: canvas.toDataURL("image/png"), width: size, height: size };
  } catch { result = null; }
  if (cache.size > 500) cache.clear();
  cache.set(text, result);
  return result;
}

// A grey square with "QR", for a QR picture that has no code yet (no text, or text with {{fields}} that only data can fill).
let placeholder = null;
export function qrPlaceholder() {
  if (placeholder) return placeholder;
  const size = 330, canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e3e3e3"; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#9a9a9a"; ctx.lineWidth = 6; ctx.strokeRect(24, 24, size - 48, size - 48);
  ctx.fillStyle = "#777"; ctx.font = "bold 110px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("QR", size / 2, size / 2 + 6);
  placeholder = { src: canvas.toDataURL("image/png"), width: size, height: size };
  return placeholder;
}

// What to store on a picture item that is a QR code of `text`: the text and the picture to show. Text with {{fields}} (or no text) shows the grey
// placeholder until data is merged; plain text shows its code right away, so a static QR works without any data.
export function qrPatch(text) {
  const t = String(text || "");
  const image = !t.trim() || t.includes("{{") ? qrPlaceholder() : qrDataUrl(t.trim()) || qrPlaceholder();
  return { qrText: t, src: image.src, naturalWidth: image.width, naturalHeight: image.height, cropX: undefined, cropY: undefined, cropW: undefined, cropH: undefined };
}
