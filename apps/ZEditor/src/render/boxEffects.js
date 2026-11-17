// Everything around a box when drawn: rotation, opacity/blend layer, stroke, shadow, texture.

import { angleOf, effectSettings } from "../model/controls.js";
import { STROKE_EFFECT, STROKE_MITER_LIMIT, TEXTURE_EFFECT, imageEdgeOutline, imageShadowOffset } from "../model/imageEffects.js";
import { noiseStream } from "../model/noise.js";
import { rectOutline } from "../model/outlines.js";

// ---- Texture marks — grit, dust and scratches, drawn in the image's
// own coordinate space. Counts depend only on the amounts and positions
// are relative to the image, so the pattern scales with it instead of
// reshuffling on resize, and the preview and export get the same marks.
export function drawTextureMarks(ctx, ann) {
  const { width: w, height: h } = ann;
  const shortSide = Math.min(w, h);
  const longSide = Math.max(w, h);
  const { textureColor, textureGrit, textureDust, textureScratches, textureVariation } = effectSettings(ann, TEXTURE_EFFECT);
  const atLeast = (minimum, size) => Math.max(minimum, size);

  // Marks of one kind share a path, painted once at that kind's opacity.
  const paintMarks = (stream, count, alpha, paint, addMark) => {
    const noise = noiseStream(textureVariation, stream);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < Math.round(count); i++) addMark(noise);
    paint();
  };
  const fill = () => ctx.fill();
  const stroke = () => ctx.stroke();

  ctx.save();
  ctx.fillStyle = textureColor;
  ctx.strokeStyle = textureColor;
  ctx.lineCap = "round";

  paintMarks(1, textureGrit * 60, 0.85, fill, (noise) => {
    const size = atLeast(0.5, shortSide * (0.002 + noise() * 0.006));
    ctx.rect(noise() * w, noise() * h, size, size);
  });

  paintMarks(2, textureDust * 1.5, 0.75, fill, (noise) => {
    const radius = atLeast(0.4, shortSide * (0.002 + noise() ** 2 * 0.012));
    const x = noise() * w, y = noise() * h;
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  });

  // A stray hair or fibre: short and strongly curved.
  ctx.lineWidth = atLeast(0.4, shortSide * 0.002);
  paintMarks(3, textureDust * 0.8, 0.75, stroke, (noise) => {
    const x = noise() * w, y = noise() * h;
    const heading = noise() * Math.PI * 2;
    const length = shortSide * (0.02 + noise() * 0.08);
    const bend = (noise() - 0.5) * 1.6;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(heading + bend) * length * 0.6, y + Math.sin(heading + bend) * length * 0.6,
      x + Math.cos(heading) * length, y + Math.sin(heading) * length,
    );
  });

  // Long and nearly straight, running mostly up and down the image.
  ctx.lineWidth = atLeast(0.4, shortSide * 0.0015);
  paintMarks(4, textureScratches * 0.3, 0.6, stroke, (noise) => {
    const x = noise() * w, y = noise() * h;
    const heading = -Math.PI / 2 + (noise() - 0.5) * 0.7;
    const length = longSide * (0.15 + noise() * 0.6);
    const bend = (noise() - 0.5) * 0.08;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(heading + bend) * length * 0.5, y + Math.sin(heading + bend) * length * 0.5,
      x + Math.cos(heading) * length, y + Math.sin(heading) * length,
    );
  });
  ctx.restore();
}

// Turns what's drawn next by the item's angle, about its centre (in canvas px).
export function rotateAboutCenter(ctx, ann, centerX, centerY) {
  const angle = angleOf(ann);
  if (!angle) return;
  ctx.translate(centerX, centerY);
  ctx.rotate(angle * Math.PI / 180);
  ctx.translate(-centerX, -centerY);
}

// Draws a box's content with its edge shape, stroke, shadow and texture.
// `paintContent` paints into the box's own 0..width/0..height space.
export function drawBoxWithEffects(ctx, ann, scaleFactor, paintContent) {
  const x = ann.x * scaleFactor, y = ann.y * scaleFactor;
  const w = ann.width * scaleFactor, h = ann.height * scaleFactor;
  ctx.save();
  // Canvas shadows are measured on the page, not in the rotated box, so
  // the shadow direction stays fixed while the item turns.
  rotateAboutCenter(ctx, ann, x + w / 2, y + h / 2);
  const shadow = imageShadowOffset(ann);
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowOffsetX = shadow.x * scaleFactor;
    ctx.shadowOffsetY = shadow.y * scaleFactor;
    ctx.shadowBlur = shadow.blur * scaleFactor;
  }
  const outline = imageEdgeOutline(ann);
  const stroke = ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null;
  if (outline || stroke || ann.texture) {
    // Composed on its own canvas first: clipping on the page's context
    // would also clip away the shadow, and this way the shadow falls
    // from the stroke too. Drawn in the image's own coordinate space,
    // where the outline is defined; `pad` leaves room for the stroke.
    const pad = stroke ? Math.ceil(stroke.strokeThickness * STROKE_MITER_LIMIT / 2 * scaleFactor) + 2 : 0;
    const cut = document.createElement("canvas");
    cut.width = Math.max(1, Math.ceil(w)) + pad * 2;
    cut.height = Math.max(1, Math.ceil(h)) + pad * 2;
    const cctx = cut.getContext("2d");
    cctx.translate(pad, pad);
    cctx.scale(scaleFactor, scaleFactor);
    cctx.save();
    if (outline) cctx.clip(new Path2D(outline));
    paintContent(cctx);
    if (ann.texture) drawTextureMarks(cctx, ann);
    cctx.restore();
    if (stroke) {
      cctx.strokeStyle = stroke.strokeColor;
      cctx.lineWidth = stroke.strokeThickness;
      cctx.lineJoin = "miter";
      cctx.miterLimit = STROKE_MITER_LIMIT;
      cctx.stroke(new Path2D(outline || rectOutline(ann)));
    }
    ctx.drawImage(cut, x - pad, y - pad);
  } else {
    ctx.translate(x, y);
    ctx.scale(scaleFactor, scaleFactor);
    paintContent(ctx);
  }
  ctx.restore();
}

// Fades and blends a finished item as one piece, on its own layer, so a
// shadow doesn't show through a see-through image and the blend mixes the
// whole item with the page under it. Matches CSS `opacity` and `mix-blend-mode`.
export async function drawWithOpacity(ctx, opacity, draw, blend) {
  const mixes = blend && blend !== "normal";
  if (opacity >= 1 && !mixes) { await draw(ctx); return; }
  const layer = document.createElement("canvas");
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  await draw(layer.getContext("2d"));
  ctx.save();
  ctx.globalAlpha = opacity;
  if (mixes) ctx.globalCompositeOperation = blend;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}
