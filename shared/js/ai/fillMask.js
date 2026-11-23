// Fills a marked area of a canvas with the on-device MI-GAN model: used by ZEditor's Marquee (AI style) and by Ai Tools (Local).
// The picture maths (windows, grouping, pasting) is fill.js; the model session (started on use, released when idle) is session.js;
// the model itself is an opt-in download (manager.js).

import { MODEL_SIZE, blendWeights, groupMask, groupPieces, labelPieces, paste, windowMask } from "./fill.js";
import { runOnSession } from "./session.js";
import { variationFor, varyCrop } from "./variations.js";

const FEATHER = 3; // px of soft join round the filled area
const MAX_GROUPS = 12;

// `ctx`: the 2D context of the picture's canvas. `buildMask(extraGrow)`: returns the marked pixels (Uint8Array, 1 = fill, width*height, already
// grown by the caller's own amount plus `extraGrow` px, which "Try another" adds). `variation`: 0 = normal, N = the Nth "Try another".
// Returns false when nothing was marked.
export async function aiFillMask(ctx, buildMask, variation, onStatus) {
  const v = variationFor(variation);
  const canvas = ctx.canvas, w = canvas.width, h = canvas.height;
  const mask = buildMask(v.grow);
  const { labels, boxes } = labelPieces(mask, w, h);
  if (!boxes.length) return false;
  const groups = groupPieces(boxes, w, h);
  if (groups.some((g) => !g.crop)) throw new Error("That area is too big for the AI: mark a smaller part, or do it in a few steps.");
  if (groups.length > MAX_GROUPS) throw new Error("That is " + groups.length + " separate areas: do at most " + MAX_GROUPS + " at a time.");

  for (let i = 0; i < groups.length; i++) {
    if (groups.length > 1) onStatus && onStatus("Removing area " + (i + 1) + " of " + groups.length + "…");
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
