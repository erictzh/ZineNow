// Turns items into images: flatten, rasterize text/shape, reset crop.

import { EXPORT_SCALE, MAIN_SCALE } from "../constants.js";
import { angleOf, effectSettings } from "../model/controls.js";
import { IMAGE_EFFECTS, STROKE_EFFECT, STROKE_MITER_LIMIT, imageShadowOffset } from "../model/imageEffects.js";
import { effectiveImageFilter } from "../model/pageFilters.js";
import { PHOTO_ADJUST_CONTROLS } from "../model/photoAdjust.js";
import { RECT_FILL_PROPS } from "../model/rect.js";
import { TEXT_EFFECTS, TEXT_PHOTO_PROPS } from "../model/text/textControls.js";
import { drawImageOnCanvas } from "./drawImage.js";
import { drawRectOnCanvas } from "./drawShapes.js";
import { drawTextOnCanvas } from "./drawText.js";
import { measureTextBox } from "./textLayout.js";

// Bakes an image's crop, filter and effects into one new image and
// returns the annotation fields to apply, or null if nothing would
// remain. Uses the export renderer, so the result is what Export PDF
// would have drawn; the box grows to fit a shadow or stroke and shrinks
// to the visible pixels, keeping the artwork where it was on the page.
export async function flattenedImagePatch(ann, pageFilter) {
  const filter = effectiveImageFilter(ann, pageFilter);
  const exportScale = EXPORT_SCALE / MAIN_SCALE;
  // Effects and filters are drawn at export resolution. With neither,
  // there's no point upscaling a source smaller than that.
  const hasLook = filter.type !== "none" || IMAGE_EFFECTS.some((effect) => ann[effect.key]);
  const sourceScale = (ann.cropW || ann.naturalWidth || ann.width) / ann.width;
  const scale = hasLook ? exportScale : Math.min(exportScale, sourceScale);

  const baked = await bakeBoxToImage(ann, scale, (ctx, box) => drawImageOnCanvas(ctx, box, scale, pageFilter));
  if (!baked) return null;

  const clearedEffects = Object.fromEntries(IMAGE_EFFECTS.flatMap((effect) => [
    [effect.key, undefined],
    ...effect.controls.map((c) => [c.prop, undefined]),
  ]));
  return {
    ...clearedEffects,
    ...Object.fromEntries(PHOTO_ADJUST_CONTROLS.map((c) => [c.prop, undefined])), // baked in now
    ...baked,
    cropX: undefined, cropY: undefined, cropW: undefined, cropH: undefined,
    // Any filter is baked in now; an unfiltered image can keep following the page.
    filter: filter.type === "none" ? ann.filter : { type: "none" },
  };
}

// The patch that removes an image's crop. The box keeps the on-page size of
// one source pixel and grows to show the whole image around the cropped
// window, which stays where it is. (Just clearing the crop fields would
// squeeze the full image into the cropped box, at the wrong proportions.)
export function cropResetPatch(ann) {
  const cleared = { cropX: undefined, cropY: undefined, cropW: undefined, cropH: undefined };
  if (ann.cropW == null || !ann.naturalWidth || !ann.naturalHeight) return cleared;
  const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
  const sx = ann.width / ann.cropW, sy = ann.height / (ann.cropH || ann.naturalHeight);
  const width = ann.naturalWidth * sx, height = ann.naturalHeight * sy;
  // Shift of the box's centre, in its own (unrotated) frame, then turned by its rotation.
  const lx = -cropX * sx + width / 2 - ann.width / 2;
  const ly = -cropY * sy + height / 2 - ann.height / 2;
  const rad = angleOf(ann) * Math.PI / 180;
  const cx = ann.x + ann.width / 2 + lx * Math.cos(rad) - ly * Math.sin(rad);
  const cy = ann.y + ann.height / 2 + lx * Math.sin(rad) + ly * Math.cos(rad);
  return { ...cleared, x: cx - width / 2, y: cy - height / 2, width, height };
}

// Turns a rectangle into an ordinary image annotation holding what it
// looks like now — fill, gradient, edge shape, stroke, shadow, texture —
// so image-only tools (filters, crop, effects stacked on top) apply to
// it. Its Opacity setting is kept; it applies to the image the same way.
export async function rasterizedRectPatch(ann) {
  const scale = EXPORT_SCALE / MAIN_SCALE;
  const baked = await bakeBoxToImage(ann, scale, (ctx, box) => drawRectOnCanvas(ctx, box, scale));
  if (!baked) return null;
  // `shape` must go too: an image with shape "ellipse" would be clipped to one.
  const cleared = Object.fromEntries([
    "shape",
    ...RECT_FILL_PROPS,
    ...IMAGE_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]),
  ].map((prop) => [prop, undefined]));
  // A rectangle never followed the page filter, so neither should the image.
  return { ...cleared, ...baked, type: "image", filter: { type: "none" } };
}

// Turns a text box into an image of how it looks now — spacing, stroke,
// shadow, gradient, label, rotation — so image filters (halftone, xerox,
// threshold), crop and effects can be applied to it. The words can't be
// edited afterwards; Undo brings the text box back.
export async function rasterizedTextPatch(ann) {
  if (!ann.text) return null;
  const scale = EXPORT_SCALE / MAIN_SCALE;
  const size = measureTextBox(ann);
  // The measured width, plus a little slack so a line that just fits can't
  // wrap differently at export scale; the height comes from the lines.
  const box = { ...ann, width: size.width + 1, height: size.height };
  const baked = await bakeBoxToImage(box, scale, (ctx, boxAtOrigin) => drawTextOnCanvas(ctx, boxAtOrigin, scale));
  if (!baked) return null;
  const textProps = ["text", "fontFamily", "fontSize", "bold", "italic", "underline", "color", "align", "lineSpacing", "letterSpacing", "strike", "textCase", "vertical", "fitHeight", "fillAlpha", "colorRuns", ...TEXT_PHOTO_PROPS];
  const effectProps = TEXT_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]);
  const cleared = Object.fromEntries([...textProps, ...effectProps].map((prop) => [prop, undefined]));
  // Text never followed the page filter, so the image shouldn't either.
  return { ...cleared, ...baked, type: "image", filter: { type: "none" } };
}

// Draws a box with `draw` at `scale`, trims it to the visible pixels and
// returns the image fields to store. The canvas has room around the box
// for a shadow or stroke that spills past it; the new box shrinks or
// grows to match, keeping the artwork where it was on the page. Returns
// null when nothing visible remains.
async function bakeBoxToImage(ann, scale, draw) {
  const shadow = imageShadowOffset(ann);
  const strokeReach = ann.stroke ? effectSettings(ann, STROKE_EFFECT).strokeThickness * STROKE_MITER_LIMIT / 2 : 0;
  const shadowReach = shadow ? Math.hypot(shadow.x, shadow.y) + shadow.blur * 2 : 0;
  const marginPx = Math.ceil((strokeReach + shadowReach + 1) * scale);

  // Snapped to whole canvas pixels: an edge landing partway across a
  // pixel would be slightly transparent, ruling out JPEG for a photo.
  const widthPx = Math.max(1, Math.round(ann.width * scale));
  const heightPx = Math.max(1, Math.round(ann.height * scale));
  // A rotated box's corners reach past its own width and height, so the
  // canvas is sized for the rotated outline, with the box at its centre.
  const radians = angleOf(ann) * Math.PI / 180;
  const turnedWidth = Math.ceil(Math.abs(widthPx * Math.cos(radians)) + Math.abs(heightPx * Math.sin(radians)));
  const turnedHeight = Math.ceil(Math.abs(widthPx * Math.sin(radians)) + Math.abs(heightPx * Math.cos(radians)));
  const boxLeft = marginPx + (turnedWidth - widthPx) / 2;
  const boxTop = marginPx + (turnedHeight - heightPx) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = turnedWidth + marginPx * 2;
  canvas.height = turnedHeight + marginPx * 2;
  const ctx = canvas.getContext("2d");
  await draw(ctx, { ...ann, x: boxLeft / scale, y: boxTop / scale, width: widthPx / scale, height: heightPx / scale });

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const alphaAt = (x, y) => data[(y * canvas.width + x) * 4 + 3];
  let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (alphaAt(x, y) === 0) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;
  let opaque = true;
  for (let y = top; y <= bottom && opaque; y++) {
    for (let x = left; x <= right && opaque; x++) opaque = alphaAt(x, y) === 255;
  }
  const trimmedW = right - left + 1, trimmedH = bottom - top + 1;
  const trimmed = document.createElement("canvas");
  trimmed.width = trimmedW;
  trimmed.height = trimmedH;
  trimmed.getContext("2d").drawImage(canvas, -left, -top);

  // PNG keeps transparency and suits hard-edged screens; JPEG is far
  // smaller for photos. Keep whichever comes out lighter.
  const png = trimmed.toDataURL("image/png");
  const jpeg = opaque ? trimmed.toDataURL("image/jpeg", 0.92) : null;
  const src = jpeg && jpeg.length < png.length ? jpeg : png;

  return {
    src,
    x: ann.x + (left - boxLeft) / scale,
    y: ann.y + (top - boxTop) / scale,
    angle: undefined, // the rotation is part of the pixels now
    width: trimmedW / scale,
    height: trimmedH / scale,
    naturalWidth: trimmedW,
    naturalHeight: trimmedH,
  };
}
