// The Marquee tool's work: draws the marquee's region into a new image layer, and for a cut takes it out of the source.

import { EXPORT_SCALE, MAIN_SCALE } from "../constants.js";
import { rotatePoint } from "../model/geometry.js";
import { pointsBounds, regionPolygon } from "../model/marquee.js";
import { isThreaded } from "../model/text/threads.js";
import { rasterizedRectPatch, rasterizedTextPatch, rasterizedTracePatch, trimmedImageFromCanvas } from "./bake.js";
import { drawPageItem } from "./clipMask.js";
import { loadImageElement } from "./drawImage.js";
import { getPageDisplaySize, renderPageToCanvas } from "./pageRender.js";
import { resolvePageText } from "./pageText.js";
import { imagePixelAt } from "./softErase.js";

const LAYER_NAMES = { copy: "Layer via Copy", cut: "Layer via Cut" };
const COVER_NAME = "Cut fill";

// Works out what "make layer" does, without changing anything. Returns
//   { layer, cover, sourceId, sourcePatch, notice }
// where `layer` is the new image item (without its id), `cover` an item to put just under it (a cut
// from everything visible), `sourceId` the item the layer goes above (null = on top of everything),
// `sourcePatch` fields to change on that item (a cut), and `notice` a line to tell the user. When
// there's nothing to make, `layer` is missing and `notice` says why (model/marquee.js
// applyMarqueeResult puts the result on the page).
//
// `mode` is "copy" or "cut"; `settings` the panel's settings (model/marquee.js MARQUEE_DEFAULTS);
// `targetId` the selected layer, used when the settings say to work on that layer alone.
export async function buildMarqueeLayer({ page, pdfDocsRef, pageFilter, marquee, settings, mode, targetId }) {
  const annotations = page.annotations || [];
  const fromLayer = settings.source === "layer";
  const target = fromLayer ? annotations.find((a) => a.id === targetId) : null;
  if (fromLayer && (!target || target.hidden)) return { notice: "Select a visible layer first (Move tool or Layers panel, then M), or choose All visible." };
  if (target && target.locked) return { notice: "That layer is locked." };
  if (mode === "cut" && target && target.type === "stroke") return { notice: "A pen or highlighter stroke can't be cut in part. Use Layer via Copy." };
  if (mode === "cut" && target && target.type === "text" && isThreaded(annotations, target.id)) return { notice: "Text in a linked chain can't be cut in part. Use Layer via Copy." };

  // What the region is cut from: the whole page as seen (paper per the setting), or the one layer alone,
  // at export resolution so the new layer stays sharp in the PDF.
  const picture = fromLayer
    ? await drawLayerAlone(page, pdfDocsRef, pageFilter, target)
    : await renderPageToCanvas(page, pdfDocsRef, EXPORT_SCALE, pageFilter, null, !settings.includePaper);
  const scale = EXPORT_SCALE / MAIN_SCALE;

  const layer = layerFromRegion(picture, marquee, scale, LAYER_NAMES[mode]);
  if (!layer) return { notice: "Nothing is visible inside the marquee." };
  const result = { layer, cover: null, sourceId: target ? target.id : null, sourcePatch: null, notice: null };
  if (mode !== "cut") return result;

  if (fromLayer) {
    // Cutting takes the pixels out of the layer's own picture, so a text box or shape becomes an image first.
    let base = target;
    let rasterized = null;
    if (target.type !== "image") {
      const view = resolvePageText(annotations).find((a) => a.id === target.id);
      rasterized = target.type === "text" ? await rasterizedTextPatch(view) : target.type === "trace" ? await rasterizedTracePatch(target) : await rasterizedRectPatch(target);
      if (!rasterized) return { notice: "Nothing is visible on that layer to cut." };
      base = { ...target, ...rasterized };
    }
    result.sourcePatch = { ...(rasterized || {}), src: await cutFromImage(base, regionPolygon(marquee), settings) };
    if (rasterized) result.notice = "The layer was turned into an image so part of it could be cut.";
  } else {
    // Everything visible can't be erased as one picture, so the spot is covered instead: the cover hides
    // whatever lay there (any kind of layer), and the new layer sits on top of it.
    result.cover = await coverForRegion(marquee, settings.fillColor, scale);
  }
  return result;
}

// ---- Drawing the picture the region is cut from ------------------------------------------------

// One layer, drawn the way the page does (its filter, effects, opacity), on a see-through canvas the
// size of the page at export resolution.
async function drawLayerAlone(page, pdfDocsRef, pageFilter, target) {
  const size = await getPageDisplaySize(page, pdfDocsRef, EXPORT_SCALE);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size.width);
  canvas.height = Math.round(size.height);
  // A text box is laid out with the rest of its page (threads, text wrap), so draw its resolved view; a
  // clipped image is cut to the layer it is clipped to, as the page shows it.
  const items = resolvePageText(page.annotations || []);
  const index = items.findIndex((a) => a.id === target.id);
  if (index >= 0) await drawPageItem(canvas.getContext("2d"), items, index, EXPORT_SCALE / MAIN_SCALE, pageFilter);
  return canvas;
}

// ---- The new layer ----------------------------------------------------------------------------

// Cuts the marquee's region out of `picture` (a page-sized canvas at `scale` px per page px) and returns
// the new image item, or null when nothing in it is visible.
//
// A rectangle is cut in its own turned frame, so the new image is upright in its own axes with no
// transparent corners, and the item is turned to match. A polygon is cut as an upright picture of its
// bounding box, with everything outside the polygon see-through.
function layerFromRegion(picture, marquee, scale, name) {
  const isRect = marquee.kind === "rect";
  const angle = isRect ? (marquee.angle || 0) : 0;
  const polygon = regionPolygon(marquee);
  const frame = isRect
    ? { x: marquee.x, y: marquee.y, width: marquee.width, height: marquee.height }
    : pointsBounds(polygon);
  const width = Math.max(1, Math.round(frame.width * scale));
  const height = Math.max(1, Math.round(frame.height * scale));
  let centerX = frame.x + frame.width / 2, centerY = frame.y + frame.height / 2;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (angle === 0) {
    // Upright: a whole-pixel shift, so the copy is the page's own pixels with no blurred edge.
    const shiftX = Math.round(centerX * scale - width / 2), shiftY = Math.round(centerY * scale - height / 2);
    ctx.translate(-shiftX, -shiftY);
    centerX = (shiftX + width / 2) / scale;
    centerY = (shiftY + height / 2) / scale;
  } else {
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-angle * Math.PI / 180);
    ctx.translate(-centerX * scale, -centerY * scale);
  }
  if (!isRect) {
    ctx.beginPath();
    polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * scale, y * scale) : ctx.lineTo(x * scale, y * scale)));
    ctx.closePath();
    ctx.clip();
  }
  ctx.drawImage(picture, 0, 0);

  const trimmed = trimmedImageFromCanvas(out);
  if (!trimmed) return null;
  // The trimmed picture's middle, relative to the frame's middle, in the frame's own axes -> on the page.
  const [offsetX, offsetY] = rotatePoint((trimmed.left + trimmed.width / 2 - width / 2) / scale, (trimmed.top + trimmed.height / 2 - height / 2) / scale, angle);
  const itemWidth = trimmed.width / scale, itemHeight = trimmed.height / scale;
  return {
    type: "image",
    name,
    src: trimmed.src,
    x: centerX + offsetX - itemWidth / 2,
    y: centerY + offsetY - itemHeight / 2,
    width: itemWidth,
    height: itemHeight,
    angle: angle || undefined,
    naturalWidth: trimmed.width,
    naturalHeight: trimmed.height,
    filter: { type: "none" }, // the page's filter is already in these pixels
  };
}

// ---- Cutting ----------------------------------------------------------------------------------

// The image's own pixels with the region taken out (transparent) or painted over (fill). The page-px
// outline is mapped into the image's pixels with imagePixelAt, which allows for the image's rotation,
// scale and crop. Returns a PNG data URL.
async function cutFromImage(image, polygon, settings) {
  const source = await loadImageElement(image.src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || source.naturalWidth;
  canvas.height = image.naturalHeight || source.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  polygon.forEach(([px, py], i) => {
    const at = imagePixelAt(image, px, py);
    if (i === 0) ctx.moveTo(at.x, at.y); else ctx.lineTo(at.x, at.y);
  });
  ctx.closePath();
  if (settings.cutLeaves === "fill") {
    ctx.fillStyle = settings.fillColor;
  } else {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
  }
  ctx.fill();
  return canvas.toDataURL("image/png");
}

// The shape that covers the spot after a cut from everything visible: a plain rectangle for a rectangle
// marquee, an image of the polygon for a polygon.
async function coverForRegion(marquee, color, scale) {
  if (marquee.kind === "rect") {
    return {
      type: "rect", name: COVER_NAME,
      x: marquee.x, y: marquee.y, width: marquee.width, height: marquee.height,
      angle: marquee.angle || undefined,
      fillType: "solid", fillColor: color,
    };
  }
  const polygon = regionPolygon(marquee);
  const bounds = pointsBounds(polygon);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bounds.width * scale));
  canvas.height = Math.max(1, Math.round(bounds.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  polygon.forEach(([x, y], i) => {
    const px = (x - bounds.x) * scale, py = (y - bounds.y) * scale;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  return {
    type: "image", name: COVER_NAME, src: canvas.toDataURL("image/png"),
    x: bounds.x, y: bounds.y, width: canvas.width / scale, height: canvas.height / scale,
    naturalWidth: canvas.width, naturalHeight: canvas.height, filter: { type: "none" },
  };
}
