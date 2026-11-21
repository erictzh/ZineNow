// Draws clipping masks: a clipped layer is drawn only where the layer it is clipped to has pixels.

import { blendOf } from "../model/controls.js";
import { clipBaseIndex, isClipped } from "../model/clipping.js";
import { SHADOW_EFFECT, STROKE_EFFECT, TEXTURE_EFFECT } from "../model/imageEffects.js";
import { TEXT_LABEL_EFFECT } from "../model/text/textControls.js";
import { drawAnnotationOnCanvas } from "./drawAnnotation.js";

// What a layer's own look adds to its outline but isn't its shape: stroke, shadow, texture, a text label.
// The mask is the layer's shape alone (its edge shape, rotation and crop count), at full strength.
const NOT_SHAPE_PROPS = [STROKE_EFFECT, SHADOW_EFFECT, TEXTURE_EFFECT, TEXT_LABEL_EFFECT].flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]);

export function maskShapeOf(base) {
  const shape = { ...base, opacity: undefined, blend: undefined, hidden: undefined, filter: { type: "none" } };
  for (const prop of NOT_SHAPE_PROPS) shape[prop] = undefined;
  return shape;
}

function newCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

// The mask for a page: a canvas of `width` x `height` px with the base's shape drawn on it, `scaleFactor`
// canvas px per page px. Shared by Export (drawClippedItem) and the live editor (ui/canvas/ClipWrap.jsx).
export async function clipMaskCanvas(base, width, height, scaleFactor, pageFilter) {
  const canvas = newCanvas(width, height);
  await drawAnnotationOnCanvas(canvas.getContext("2d"), maskShapeOf(base), scaleFactor, pageFilter);
  return canvas;
}

// A clipped item (of any kind) drawn on `ctx` (a page-sized canvas): drawn on its own layer, cut to the mask, then
// blended onto the page with its own blend mode (its opacity is part of its drawing).
export async function drawClippedItem(ctx, item, base, scaleFactor, pageFilter) {
  const { width, height } = ctx.canvas;
  const layer = newCanvas(width, height);
  const layerCtx = layer.getContext("2d");
  await drawAnnotationOnCanvas(layerCtx, { ...item, blend: undefined }, scaleFactor, pageFilter);
  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(await clipMaskCanvas(base, width, height, scaleFactor, pageFilter), 0, 0);
  ctx.save();
  const blend = blendOf(item);
  if (blend !== "normal") ctx.globalCompositeOperation = blend;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

// One item of a page's list drawn the way the page shows it: hidden items skipped, and a clipped layer
// cut to the layer below. A clipped layer with no layer to clip to is drawn as an ordinary one, and one
// whose base is hidden isn't drawn at all (it disappears with it).
export async function drawPageItem(ctx, items, index, scaleFactor, pageFilter) {
  const item = items[index];
  if (item.hidden) return;
  if (isClipped(item)) {
    const baseIndex = clipBaseIndex(items, index);
    if (baseIndex >= 0) {
      if (!items[baseIndex].hidden) await drawClippedItem(ctx, item, items[baseIndex], scaleFactor, pageFilter);
      return;
    }
  }
  await drawAnnotationOnCanvas(ctx, item, scaleFactor, pageFilter);
}
