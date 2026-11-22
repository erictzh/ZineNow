// Loads and draws a placed image with its crop, adjustments and filter.

import { effectiveImageFilter } from "../model/pageFilters.js";
import { imageEdgeOutline } from "../model/imageEffects.js";
import { hasPhotoAdjust } from "../model/photoAdjust.js";
import { drawBoxWithEffects } from "./boxEffects.js";
import { applyPageFilter } from "./filters/applyFilter.js";
import { applyFeather } from "./feather.js";
import { applyLomo } from "./lomo.js";
import { applyPhotoAdjust } from "./photoAdjust.js";

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load a placed image for export."));
    img.src = src;
  });
}

export async function drawImageOnCanvas(ctx, ann, scaleFactor, pageFilter) {
  const img = await loadImageElement(ann.src);
  const x = ann.x * scaleFactor, y = ann.y * scaleFactor;
  const w = ann.width * scaleFactor, h = ann.height * scaleFactor;

  // Crop is just a source rect into the natural image — undefined
  // fields mean "no crop" (the whole image), matching AnnotationImage.
  let sx = ann.cropX || 0, sy = ann.cropY || 0;
  let sw = ann.cropW || img.naturalWidth || w, sh = ann.cropH || img.naturalHeight || h;
  let source = img;

  // An image's own filter (if it has one) takes over from the page
  // filter entirely, rather than the two combining — see
  // effectiveImageFilter. Rendered on its own offscreen canvas, sized
  // to the image's TARGET on-page size (not its natural resolution) —
  // that matters for halftone specifically, so its dot cells come out
  // the same physical size as the background's. Doing this before
  // compositing also means a torn edge's clip never leaks the filter
  // into surrounding page pixels.
  const imgFilter = effectiveImageFilter(ann, pageFilter);
  const filterType = imgFilter.type;
  const adjusted = hasPhotoAdjust(ann);
  const lomo = Boolean(ann.lomo), feathered = Boolean(ann.feather); // pixel looks: drawn on the offscreen canvas too
  if ((filterType && filterType !== "none") || adjusted || lomo || feathered) {
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(w));
    off.height = Math.max(1, Math.round(h));
    const octx = off.getContext("2d");
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
    if (adjusted) applyPhotoAdjust(octx, off, ann); // before the filter, so the filter sees the adjusted photo
    if (lomo) applyLomo(octx, off, ann); // after the adjustments, before the filter
    applyPageFilter(octx, off, imgFilter, scaleFactor);
    if (feathered) applyFeather(octx, off, ann, imageEdgeOutline(ann), off.width / ann.width); // last: it only changes the alpha
    source = off;
    sx = 0; sy = 0; sw = off.width; sh = off.height;
  }

  drawBoxWithEffects(ctx, ann, scaleFactor, (target) => {
    target.drawImage(source, sx, sy, sw, sh, 0, 0, ann.width, ann.height);
  });
}
