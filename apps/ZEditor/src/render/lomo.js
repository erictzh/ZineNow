// The Lomo look: punchy contrast and colour, a cross-processed tint (one colour in the shadows, another in the highlights),
// dark vignetted corners and a little film grain. Applied to an image's pixels (after the photo adjustments, before the
// filter); the live editor and Export run the same code, so what you see is what exports.

import { hexToRgb } from "../model/color.js";
import { LOMO_CONTROLS } from "../model/imageEffects.js";
import { controlValues } from "../model/controls.js";

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1))); return t * t * (3 - 2 * t); };

// A repeatable random number (0..1) for a pixel: the same picture always gets the same grain.
function hash(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// `p`: { strength, contrast, saturation, tintAmount, shadowTint [r,g,b 0-255], highlightTint, vignette, vignetteSize,
// vignetteRound, grain } with the 0-100 settings as stored. Edits `data` (RGBA, w*h*4) in place.
export function lomoPixels(data, w, h, p) {
  const strength = p.strength / 100;
  if (strength <= 0) return;
  const contrast = p.contrast / 100;
  const saturation = 1 + p.saturation / 100;
  const tintAmount = p.tintAmount / 100;
  const chroma = (rgb) => { const l = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114); return [rgb[0] - l, rgb[1] - l, rgb[2] - l]; }; // the tint's colour with its brightness taken out
  const shadowChroma = chroma(p.shadowTint), highlightChroma = chroma(p.highlightTint);
  const vignette = p.vignette / 100;
  const vStart = 1 - (p.vignetteSize / 100) * 0.9; // where (0 = middle, 1 = corner) the darkening begins
  const round = p.vignetteRound / 100;
  const grain = (p.grain / 100) * 60;
  const cx = w / 2, cy = h / 2, halfDiag = Math.hypot(w, h) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) continue;
      const o0 = data[i], o1 = data[i + 1], o2 = data[i + 2];
      let r = o0 / 255, g = o1 / 255, b = o2 / 255;
      // contrast: an S curve
      if (contrast > 0) {
        const s = (v) => v * v * (3 - 2 * v);
        r += (s(r) - r) * contrast * 1.4; g += (s(g) - g) * contrast * 1.4; b += (s(b) - b) * contrast * 1.4;
      }
      // saturation
      let l = r * 0.299 + g * 0.587 + b * 0.114;
      if (saturation !== 1) { r = l + (r - l) * saturation; g = l + (g - l) * saturation; b = l + (b - l) * saturation; }
      // cross-process tint: the shadows lean to one colour and the highlights to another, brightness unchanged
      if (tintAmount > 0) {
        l = Math.min(1, Math.max(0, l));
        const ws = (1 - l) * (1 - l) * tintAmount / 255, wh = l * l * tintAmount / 255;
        r += shadowChroma[0] * ws + highlightChroma[0] * wh;
        g += shadowChroma[1] * ws + highlightChroma[1] * wh;
        b += shadowChroma[2] * ws + highlightChroma[2] * wh;
      }
      // vignette: darker towards the corners; roundness blends an oval that fits the picture with a true circle
      if (vignette > 0) {
        const dx = (x + 0.5 - cx) / cx, dy = (y + 0.5 - cy) / cy;
        const oval = Math.hypot(dx, dy) / Math.SQRT2;
        const circle = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / halfDiag;
        const d = oval + (circle - oval) * round;
        const k = 1 - vignette * smoothstep(vStart, 1, d);
        r *= k; g *= k; b *= k;
      }
      // grain: strongest in the mid-tones
      if (grain > 0) {
        const mid = 1 - Math.abs(l - 0.5) * 1.2;
        const n = (hash(x, y, 1) + hash(x, y, 2) - 1) * grain * mid / 255;
        r += n; g += n; b += n;
      }
      // strength mixes it with the original
      data[i] = o0 + (r * 255 - o0) * strength;
      data[i + 1] = o1 + (g * 255 - o1) * strength;
      data[i + 2] = o2 + (b * 255 - o2) * strength;
    }
  }
}

// The Lomo settings of an image as lomoPixels wants them.
export function lomoParams(ann) {
  const v = controlValues(ann, LOMO_CONTROLS);
  const rgb = (hex) => { const c = hexToRgb(hex); return [c.r, c.g, c.b]; };
  return {
    strength: v.lomoStrength, contrast: v.lomoContrast, saturation: v.lomoSaturation, tintAmount: v.lomoTint,
    shadowTint: rgb(v.lomoShadowTint), highlightTint: rgb(v.lomoHighlightTint),
    vignette: v.lomoVignette, vignetteSize: v.lomoVignetteSize, vignetteRound: v.lomoVignetteRound, grain: v.lomoGrain,
  };
}

// Edits the canvas's pixels in place.
export function applyLomo(ctx, canvas, ann) {
  const { width, height } = canvas;
  if (width === 0 || height === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  lomoPixels(imageData.data, width, height, lomoParams(ann));
  ctx.putImageData(imageData, 0, 0);
}
