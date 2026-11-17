// Draws pen/highlighter strokes and rectangles/ellipses on a canvas.

import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS, smoothPathD, taperedPathD } from "../model/strokes.js";
import { drawBoxWithEffects } from "./boxEffects.js";
import { paintRectFill } from "./gradients.js";

export function drawStrokeOnCanvas(ctx, ann, scaleFactor) {
  const isHi = ann.tool === "highlighter";
  const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
  const width = (ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width)) * scaleFactor;
  const taper = ann.taper || 0;
  const pts = ann.points.map((p) => [p[0] * scaleFactor, p[1] * scaleFactor]);
  ctx.save();
  ctx.globalAlpha = isHi ? 0.45 : 1;
  if (taper > 0) {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(taperedPathD(pts, width, taper)));
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(smoothPathD(pts)));
  }
  ctx.restore();
}

export function drawRectOnCanvas(ctx, ann, scaleFactor) {
  drawBoxWithEffects(ctx, ann, scaleFactor, (target) => paintRectFill(target, ann));
}
