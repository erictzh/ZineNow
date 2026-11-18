// Resizing an image's crop window with one of its eight handles. Pure.
//
// A crop is { x, y, w, h } in the source image's own pixels, and always stays inside the image
// (0..natW, 0..natH) and at least `min` pixels wide and tall. `handle` is a compass name ("nw", "n",
// "ne", "e", "se", "s", "sw", "w"); the opposite side or corner stays put. `dx` and `dy` are how far
// the pointer moved, in the same source pixels.
//
// Free by default. With `keepRatio` (Shift) the window keeps its width-to-height ratio: a corner
// scales from the opposite corner, a side scales from the opposite side, growing evenly about the
// middle of the other axis.

export const MIN_CROP_SIZE = 20; // source px: keeps a crop drag from collapsing to nothing

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function resizedCrop(crop, natW, natH, handle, dx, dy, keepRatio, min = MIN_CROP_SIZE) {
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const { x, y, w, h } = crop;

  if (!keepRatio) {
    let left = x, right = x + w, top = y, bottom = y + h;
    if (sx > 0) right = clamp(right + dx, left + min, natW);
    else if (sx < 0) left = clamp(left + dx, 0, right - min);
    if (sy > 0) bottom = clamp(bottom + dy, top + min, natH);
    else if (sy < 0) top = clamp(top + dy, 0, bottom - min);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  // One scale applies to both sides of the window. A corner follows whichever axis the pointer
  // went further along; a side follows its own axis.
  const wantW = w + sx * dx, wantH = h + sy * dy;
  let scale = sx && sy ? Math.max(wantW / w, wantH / h) : sx ? wantW / w : wantH / h;
  // How far the window can grow before it meets the image's edge (centred on an untouched axis).
  const cx = x + w / 2, cy = y + h / 2;
  const roomW = sx > 0 ? natW - x : sx < 0 ? x + w : 2 * Math.min(cx, natW - cx);
  const roomH = sy > 0 ? natH - y : sy < 0 ? y + h : 2 * Math.min(cy, natH - cy);
  scale = Math.max(Math.min(scale, roomW / w, roomH / h), min / Math.min(w, h));
  const nw = w * scale, nh = h * scale;
  return {
    x: sx > 0 ? x : sx < 0 ? x + w - nw : cx - nw / 2,
    y: sy > 0 ? y : sy < 0 ? y + h - nh : cy - nh / 2,
    w: nw, h: nh,
  };
}
