// The soft-eraser swipe: fades the pixels of the image under the pointer, live, and saves the result on release.

import { SOFT_ERASER_DABS_PER_RADIUS } from "../../model/softEraser.js";
import { loadImageElement } from "../../render/drawImage.js";
import { imagePixelAt, stampSoftErase } from "../../render/softErase.js";
import { trackPointerDrag } from "../pointer.js";

// A soft-eraser swipe works on one image: the topmost one under the
// pointer when the swipe first reaches an image. The image is copied
// to a canvas, erased there (shown in place of the image while
// dragging), and saved back as one undo step on release.
//
// `toPagePoint(event)` turns a mouse event into page coordinates;
// `layerEl` is the annotation layer element (to find the image on screen).
export function startSoftEraseGesture(e, { annotations, softEraser, layerEl, toPagePoint, onEraseImagePixels }) {
  e.preventDefault();
  const { size, softness, strength } = softEraser;
  const dabAlpha = 1 - Math.pow(1 - strength / 100, 1 / SOFT_ERASER_DABS_PER_RADIUS);
  const session = { ann: null, canvas: null, ctx: null, img: null, last: null, pending: [], touched: false, done: false };

  function pickImage(p) {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.type === "image" && !a.hidden && !a.locked && imagePixelAt(a, p.x, p.y).inside) return a;
    }
    return null;
  }

  function dab(p) {
    const hit = imagePixelAt(session.ann, p.x, p.y);
    stampSoftErase(session.ctx, hit.x, hit.y, size / 2 * hit.scaleX, size / 2 * hit.scaleY, softness, dabAlpha);
    session.touched = true;
  }

  // Dabs spaced along the path from the last one, so a fast swipe
  // still leaves a smooth line rather than separate spots.
  function eraseTo(p) {
    if (!session.last) { dab(p); session.last = p; return; }
    const step = Math.max(0.5, size / 2 / SOFT_ERASER_DABS_PER_RADIUS);
    const from = session.last;
    const dist = Math.hypot(p.x - from.x, p.y - from.y);
    if (dist < step) return;
    const n = Math.floor(dist / step);
    for (let k = 1; k <= n; k++) {
      const t = (k * step) / dist;
      dab({ x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t });
    }
    const t = (n * step) / dist;
    session.last = { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t };
  }

  async function begin(ann) {
    const source = await loadImageElement(ann.src);
    const canvas = document.createElement("canvas");
    canvas.width = ann.naturalWidth;
    canvas.height = ann.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    session.canvas = canvas;
    session.ctx = ctx;
    // Live view: the working canvas sits exactly where the <img> is.
    // (A filtered image draws through its own canvas; it updates on release.)
    const img = layerEl && layerEl.querySelector(`[data-ann-id="${ann.id}"] .ze-ann-image-frame > img`);
    if (img) {
      canvas.style.cssText = img.style.cssText;
      canvas.style.pointerEvents = "none";
      img.parentNode.insertBefore(canvas, img.nextSibling);
      img.style.visibility = "hidden";
      session.img = img;
    }
    session.pending.forEach(eraseTo);
    session.pending = [];
    if (session.done) finish();
  }

  function handlePoint(p) {
    if (!session.ann) {
      const ann = pickImage(p);
      if (!ann) return;
      session.ann = ann;
      session.pending.push(p);
      begin(ann).catch(() => { session.ann = null; });
      return;
    }
    if (!session.ctx) { session.pending.push(p); return; }
    eraseTo(p);
  }

  function finish() {
    const { canvas, img, ann } = session;
    if (!canvas) return;
    if (session.touched) onEraseImagePixels(ann.id, canvas.toDataURL("image/png"));
    if (!img) return;
    // Keep the live canvas up until the <img> shows the erased
    // picture, so the old one doesn't flash in between.
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      canvas.remove();
      img.style.visibility = "";
    };
    if (!session.touched) { cleanup(); return; }
    img.addEventListener("load", cleanup, { once: true });
    setTimeout(cleanup, 1500);
  }

  handlePoint(toPagePoint(e));
  trackPointerDrag((ev) => handlePoint(toPagePoint(ev)), () => {
    session.done = true;
    if (session.ctx) finish();
  });
}
