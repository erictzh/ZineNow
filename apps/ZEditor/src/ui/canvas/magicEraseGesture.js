// The magic eraser click: finds the image under the pointer, erases the matching pixels, and saves the result.

import { loadImageElement } from "../../render/drawImage.js";
import { magicErase } from "../../render/magicErase.js";
import { imagePixelAt } from "../../render/softErase.js";

// Works on the topmost visible, unlocked image under the click. The colour
// compared is the image's own pixel (before any filter or photo
// adjustment), same as the soft eraser erases the image's own pixels.
// One click = one undo step (saved through onEraseImagePixels).
//
// `toPagePoint(event)` turns a mouse event into page coordinates.
export async function magicEraseAt(e, { annotations, magicEraser, toPagePoint, onEraseImagePixels }) {
  e.preventDefault();
  const p = toPagePoint(e);
  let ann = null, hit = null;
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i];
    if (a.type !== "image" || a.hidden || a.locked) continue;
    const h = imagePixelAt(a, p.x, p.y);
    if (h.inside) { ann = a; hit = h; break; }
  }
  if (!ann) return;

  const source = await loadImageElement(ann.src);
  const canvas = document.createElement("canvas");
  canvas.width = ann.naturalWidth;
  canvas.height = ann.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const x = Math.min(canvas.width - 1, Math.max(0, hit.x));
  const y = Math.min(canvas.height - 1, Math.max(0, hit.y));
  const erased = magicErase(imageData, x, y, magicEraser.tolerance, magicEraser.contiguous);
  if (erased === 0) return;
  ctx.putImageData(imageData, 0, 0);
  onEraseImagePixels(ann.id, canvas.toDataURL("image/png"));
}
