// Bevel and Emboss for pictures and shapes: a lit, raised (or pressed) edge, drawn from the shape's outline alone.
//
// The outline is filled into a mask, the mask is blurred into a smooth "height" (0 outside, 1 well inside, rising across the edge), and the
// slope of that height says how much each pixel faces the light: pixels turned toward it get the highlight colour, pixels turned away the
// shadow colour. Pure maths on pixel arrays (bevelPixels) plus the canvas wrapper (bevelCanvas) the live editor and Export both use.

import { hexToRgb } from "../model/color.js";
import { gaussianBlur } from "./gaussianBlur.js";

// `alpha`: the mask, one byte per pixel (255 inside the shape), width x height.
// o: { sigma (px: how wide the sloped edge is, about 2 x sigma), depth (0..100), lightDeg (the direction the light comes FROM: 0 top, 90 right,
//      180 bottom, 270 left), hardness (0..100: 0 fades the light smoothly across the edge, 100 makes crisp flat bands), soften (px: blurs the
//      finished highlight and shadow), raised (true: the edge stands up; false: it is pressed in), insideOnly (bevel: only on the shape; emboss: spills
//      past the edge too), highlight: { r, g, b, a (0..1) }, shadow: { r, g, b, a } }
// Returns RGBA bytes (not premultiplied) of the highlight and shadow colours with their strength as alpha.
export function bevelPixels(alpha, width, height, o) {
  const n = width * height;
  const px = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) { const a = alpha[i]; px[i * 4] = a; px[i * 4 + 1] = a; px[i * 4 + 2] = a; px[i * 4 + 3] = 255; }
  gaussianBlur(px, width, height, Math.max(0.5, o.sigma));
  const out = new Uint8ClampedArray(n * 4);
  const rad = (o.lightDeg * Math.PI) / 180;
  const lx = Math.sin(rad), ly = -Math.cos(rad); // unit vector pointing toward the light (y grows downward)
  const sign = o.raised ? 1 : -1;
  const slopeMax = 0.4 / Math.max(0.5, o.sigma); // the steepest slope a blurred step edge has: shading is measured against it
  // Hardness steepens how fast the light reaches full strength: soft bevels fade across the whole edge, hard ones are crisp flat facets.
  const strength = (o.depth / 100) * 1.4 * (1 + ((o.hardness || 0) / 100) * 8);
  const h = (x, y) => px[(Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (o.insideOnly && alpha[i] === 0) continue;
      const gx = (h(x + 1, y) - h(x - 1, y)) / 2, gy = (h(x, y + 1) - h(x, y - 1)) / 2;
      // The edge's outward direction is down the slope (-gradient); facing the light means it points the way the light comes from.
      const facing = (-(gx * lx + gy * ly) / slopeMax) * strength * sign;
      const c = facing >= 0 ? o.highlight : o.shadow;
      let a = Math.min(1, Math.abs(facing)) * c.a;
      if (o.insideOnly) a *= alpha[i] / 255;
      if (a <= 0) continue;
      out[i * 4] = c.r; out[i * 4 + 1] = c.g; out[i * 4 + 2] = c.b; out[i * 4 + 3] = Math.round(a * 255);
    }
  }
  if (o.soften > 0.3) {
    gaussianBlur(out, width, height, o.soften); // blurs colour and strength together (premultiplied inside)
    if (o.insideOnly) for (let i = 0; i < n; i++) out[i * 4 + 3] = (out[i * 4 + 3] * alpha[i]) / 255; // a bevel stays on the shape
  }
  return out;
}

// The settings of the Bevel effect as the numbers bevelPixels wants (see BEVEL_EFFECT in model/imageEffects.js).
export function bevelOptions(s, scale) {
  const emboss = s.bevelStyle === "emboss";
  const hi = hexToRgb(s.bevelHighlightColor), sh = hexToRgb(s.bevelShadowColor);
  return {
    sigma: ((emboss ? s.bevelSize : s.bevelSize / 2) || 1) * scale,
    depth: s.bevelDepth, hardness: s.bevelHardness, soften: s.bevelSoften * scale, lightDeg: s.bevelLight, raised: s.bevelRaised !== "down", insideOnly: !emboss,
    highlight: { ...hi, a: s.bevelHighlightOpacity / 100 }, shadow: { ...sh, a: s.bevelShadowOpacity / 100 },
  };
}

// The overlay for a box `w` x `h` page px, drawn at `scale` canvas px per page px, from its outline path (an SVG path string in the box's own
// coordinates). Returns { canvas, pad }: `pad` canvas px of margin on every side, so the overlay is drawn at (-pad / scale, -pad / scale).
export function bevelCanvas(outline, w, h, scale, settings) {
  const o = bevelOptions(settings, scale);
  const pad = Math.ceil(o.sigma * 3) + 2;
  const cw = Math.max(1, Math.ceil(w * scale)) + pad * 2, ch = Math.max(1, Math.ceil(h * scale)) + pad * 2;
  const mask = document.createElement("canvas");
  mask.width = cw; mask.height = ch;
  const mctx = mask.getContext("2d");
  mctx.translate(pad, pad);
  mctx.scale(scale, scale);
  mctx.fillStyle = "#000";
  mctx.fill(new Path2D(outline));
  const data = mctx.getImageData(0, 0, cw, ch).data;
  const alpha = new Uint8ClampedArray(cw * ch);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(cw, ch);
  image.data.set(bevelPixels(alpha, cw, ch, o));
  ctx.putImageData(image, 0, 0);
  return { canvas, pad };
}
