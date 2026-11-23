// Remove & fill, style "AI (on-device)": the model fills the marked area. The picture maths (windows, grouping, pasting) is shared with
// Ai Tools (Local): shared/js/ai/fill.js; the model session (started on use, released when idle) is shared/js/ai/session.js.
// The model itself is an opt-in download (shared/js/ai/manager.js, the AI model box in the Marquee panel).

import { MODEL_SIZE, blendWeights, groupMask, groupPieces, labelPieces, paste, windowMask } from "../../../../shared/js/ai/fill.js";
import { runOnSession } from "../../../../shared/js/ai/session.js";
import { paintArea } from "./regionArea.js";

const FEATHER = 3; // px of soft join round the filled area
const MAX_GROUPS = 12;

// "Try another" for the AI: the model gives the same answer for the same input, so each press shows it a slightly different view.
// A fixed cycle (press N always gives variation N): the window is moved by a fraction of its size, made a bit bigger or smaller,
// and the area is grown by a few px (never shrunk, which could leave a ring of the old object). Variation 0 = the normal fill.
export const AI_VARIATIONS = [
  { dx: 0, dy: 0, scale: 1, grow: 0 },
  { dx: -0.12, dy: 0, scale: 1, grow: 0 },
  { dx: 0.12, dy: 0, scale: 1, grow: 0 },
  { dx: 0, dy: -0.12, scale: 1, grow: 1 },
  { dx: 0, dy: 0.12, scale: 1, grow: 2 },
  { dx: 0, dy: 0, scale: 1.25, grow: 0 },
  { dx: 0.08, dy: 0.08, scale: 0.85, grow: 3 },
];
export function variationFor(n) { return AI_VARIATIONS[((Math.round(n) || 0) % AI_VARIATIONS.length + AI_VARIATIONS.length) % AI_VARIATIONS.length]; }

// Moves / resizes a window (kept inside the picture, and still covering the whole area `bounds`).
export function varyCrop(crop, v, bounds, w, h) {
  let side = Math.min(Math.min(w, h), Math.max(1, Math.round(crop.side * v.scale)));
  const need = Math.max(bounds.x1 - bounds.x0 + 1, bounds.y1 - bounds.y0 + 1);
  if (side < need) side = Math.min(Math.min(w, h), crop.side);
  const cx = crop.x + crop.side / 2 + v.dx * crop.side, cy = crop.y + crop.side / 2 + v.dy * crop.side;
  let x = Math.round(cx - side / 2), y = Math.round(cy - side / 2);
  x = Math.min(Math.max(0, x), w - side); y = Math.min(Math.max(0, y), h - side);
  // the area must stay inside the window
  x = Math.min(Math.max(x, bounds.x1 + 1 - side), bounds.x0); y = Math.min(Math.max(y, bounds.y1 + 1 - side), bounds.y0);
  x = Math.min(Math.max(0, x), w - side); y = Math.min(Math.max(0, y), h - side);
  if (x > bounds.x0 || y > bounds.y0 || x + side < bounds.x1 + 1 || y + side < bounds.y1 + 1) return crop;
  return { x, y, side };
}

// Fills `area` (render/regionArea.js, canvas px, grown by `grow` px) on `ctx`'s canvas. Returns false when nothing was marked.
export async function aiFillCanvas(ctx, area, grow, onStatus, variation = 0) {
  const v = variationFor(variation);
  grow += v.grow;
  const canvas = ctx.canvas, w = canvas.width, h = canvas.height;
  // the marked area as a mask over the whole picture
  const m = document.createElement("canvas"); m.width = w; m.height = h;
  const mx = m.getContext("2d", { willReadFrequently: true });
  paintArea(mx, area, { grow });
  const alpha = mx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = alpha[i * 4 + 3] > 0 ? 1 : 0;

  const { labels, boxes } = labelPieces(mask, w, h);
  if (!boxes.length) return false;
  const groups = groupPieces(boxes, w, h);
  if (groups.some((g) => !g.crop)) throw new Error("That area is too big for the AI: draw a smaller marquee, or do it in a few steps.");
  if (groups.length > MAX_GROUPS) throw new Error("That is " + groups.length + " separate areas: do at most " + MAX_GROUPS + " at a time.");

  for (let i = 0; i < groups.length; i++) {
    const crop = variation ? varyCrop(groups[i].crop, v, groups[i].bounds, w, h) : groups[i].crop;
    const gm = groups.length === 1 ? mask : groupMask(labels, groups[i].ids);
    // the window, shrunk or enlarged to the model's size
    const win = document.createElement("canvas"); win.width = win.height = MODEL_SIZE;
    const wx = win.getContext("2d", { willReadFrequently: true });
    wx.imageSmoothingQuality = "high";
    wx.drawImage(canvas, crop.x, crop.y, crop.side, crop.side, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const rgba = wx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
    const answer = await runOnSession(rgba, windowMask(gm, w, crop), onStatus);
    // the answer back to the window's size, pasted over the marked area only
    const ac = document.createElement("canvas"); ac.width = ac.height = MODEL_SIZE;
    ac.getContext("2d").putImageData(new ImageData(answer, MODEL_SIZE, MODEL_SIZE), 0, 0);
    const sc = document.createElement("canvas"); sc.width = sc.height = crop.side;
    const sx = sc.getContext("2d", { willReadFrequently: true }); sx.imageSmoothingQuality = "high"; sx.drawImage(ac, 0, 0, crop.side, crop.side);
    const region = ctx.getImageData(crop.x, crop.y, crop.side, crop.side);
    paste(region.data, crop.side, { x: 0, y: 0, side: crop.side }, sx.getImageData(0, 0, crop.side, crop.side).data, blendWeights(gm, w, crop, FEATHER));
    ctx.putImageData(region, crop.x, crop.y);
  }
  return true;
}
