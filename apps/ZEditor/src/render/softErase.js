// Soft eraser on an image's pixels: hit point and feathered dabs.

import { angleOf } from "../model/controls.js";
import { rotatePoint } from "../model/geometry.js";

// Where page point (px, py) lands on an image, in the image's own natural
// pixels, allowing for its rotation (about its centre) and crop.
// `inside` is false when the point is off the image.
export function imagePixelAt(ann, px, py) {
  const cx = ann.x + ann.width / 2, cy = ann.y + ann.height / 2;
  const [lx, ly] = rotatePoint(px - cx, py - cy, -angleOf(ann));
  const u = lx + ann.width / 2, v = ly + ann.height / 2;
  const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
  const cropW = ann.cropW || ann.naturalWidth, cropH = ann.cropH || ann.naturalHeight;
  return {
    inside: u >= 0 && v >= 0 && u <= ann.width && v <= ann.height,
    x: cropX + u * cropW / ann.width,
    y: cropY + v * cropH / ann.height,
    // Natural px per page px, so the brush keeps its on-page size.
    scaleX: cropW / ann.width, scaleY: cropH / ann.height,
  };
}

// One round dab of the soft eraser at natural pixel (x, y). `softness`
// is how much of the radius fades out (0 = hard edge); `alpha` is how
// much this one dab removes at its centre.
export function stampSoftErase(ctx, x, y, radiusX, radiusY, softness, alpha) {
  const inner = Math.min(0.99, Math.max(0, 1 - softness / 100));
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.translate(x, y);
  ctx.scale(radiusX, radiusY);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(inner, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
