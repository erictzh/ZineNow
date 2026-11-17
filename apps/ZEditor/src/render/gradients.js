// Gradient fills for shapes and text, as CSS (live) and canvas (export) from one set of stops.

import { hexToRgb } from "../model/color.js";
import { controlValues } from "../model/controls.js";
import { RECT_CONTROLS } from "../model/rect.js";

// The colour stops of a rectangle's gradient. When the two ends differ
// in opacity, the in-between stops are worked out here with
// premultiplied-alpha blending and written out densely: CSS blends that
// way but canvas gradients don't, so two bare end stops would look
// different on screen and in Export PDF. Dense explicit stops make both
// paint the same ramp.
export function rectGradientStops(ann) {
  const v = controlValues(ann, RECT_CONTROLS);
  const c1 = hexToRgb(v.fillColor), c2 = hexToRgb(v.gradientColor);
  const a1 = v.fillAlpha / 100, a2 = v.gradientAlpha / 100;
  const start = v.gradientStart, end = Math.max(v.gradientStart, v.gradientEnd);
  const steps = a1 === a2 ? 1 : 16;
  const stops = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a1 + (a2 - a1) * t;
    const channel = (p, q) => {
      const premultiplied = p * a1 + (q * a2 - p * a1) * t;
      return Math.round(a > 0 ? premultiplied / a : p + (q - p) * t);
    };
    stops.push({
      percent: start + (end - start) * t,
      color: `rgba(${channel(c1.r, c2.r)},${channel(c1.g, c2.g)},${channel(c1.b, c2.b)},${+a.toFixed(4)})`,
    });
  }
  return stops;
}

// A rectangle's fill as a CSS background, for the live editor.
export function rectFillCss(ann) {
  const v = controlValues(ann, RECT_CONTROLS);
  if (v.fillType === "solid") {
    const { r, g, b } = hexToRgb(v.fillColor);
    return `rgba(${r},${g},${b},${v.fillAlpha / 100})`;
  }
  const stops = rectGradientStops(ann).map((s) => `${s.color} ${s.percent}%`).join(", ");
  return v.fillType === "linear"
    ? `linear-gradient(${v.gradientAngle}deg, ${stops})`
    : `radial-gradient(ellipse farthest-corner at 50% 50%, ${stops})`;
}

// A canvas linear gradient over the box (x, y, w, h), placed like CSS's
// `linear-gradient(<angle>deg, ...)`: through the centre, long enough that
// the corners land exactly on its two ends.
export function makeLinearGradient(ctx, angleDegrees, stops, x, y, w, h) {
  const radians = angleDegrees * Math.PI / 180;
  const dx = Math.sin(radians), dy = -Math.cos(radians);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const centerX = x + w / 2, centerY = y + h / 2;
  const gradient = ctx.createLinearGradient(centerX - dx * half, centerY - dy * half, centerX + dx * half, centerY + dy * half);
  stops.forEach((s) => gradient.addColorStop(s.percent / 100, s.color));
  return gradient;
}

// The same fill painted onto a canvas, in the box's own 0..width/
// 0..height space.
export function paintRectFill(ctx, ann) {
  const v = controlValues(ann, RECT_CONTROLS);
  const w = ann.width, h = ann.height;
  if (v.fillType === "solid") {
    const { r, g, b } = hexToRgb(v.fillColor);
    ctx.fillStyle = `rgba(${r},${g},${b},${v.fillAlpha / 100})`;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const stops = rectGradientStops(ann);
  if (v.fillType === "linear") {
    ctx.fillStyle = makeLinearGradient(ctx, v.gradientAngle, stops, 0, 0, w, h);
    ctx.fillRect(0, 0, w, h);
  } else {
    // CSS "ellipse farthest-corner": an ellipse with the box's aspect
    // ratio reaching the corners. Drawn as a unit circle, stretched.
    const reach = Math.SQRT2;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(w / 2 * reach, h / 2 * reach);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    stops.forEach((s) => gradient.addColorStop(s.percent / 100, s.color));
    ctx.fillStyle = gradient;
    ctx.fillRect(-1 / reach, -1 / reach, 2 / reach, 2 / reach);
    ctx.restore();
  }
}
