// The magic eraser click: finds the image under the pointer and hands it to the preview session.

import { imagePixelAt } from "../../render/softErase.js";

// Works on the topmost visible, unlocked image under the click. The colour
// compared is the image's own pixel (before any filter or photo
// adjustment), same as the soft eraser erases the image's own pixels. The
// click only opens a live preview (state/useMagicErase.js); nothing changes
// in the document until that's applied.
//
// `toPagePoint(event)` turns a mouse event into page coordinates;
// `onMagicClick(image, hit)` is the session's start, where `hit` is the
// clicked pixel in the image's natural pixels.
export function magicEraseAt(e, { annotations, toPagePoint, onMagicClick }) {
  e.preventDefault();
  const p = toPagePoint(e);
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i];
    if (a.type !== "image" || a.hidden || a.locked) continue;
    const hit = imagePixelAt(a, p.x, p.y);
    if (hit.inside) { onMagicClick(a, hit); return; }
  }
}
