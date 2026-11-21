// Clipping masks: an image marked `clipToBelow` shows only where the layer below it has pixels.

// The items are a page's list in stacking order (first = bottom). Only images can be clipped; the layer
// they are clipped to can be anything (an image with see-through parts, a shape, text...).
// Several clipped layers in a row all clip to the same layer: the nearest one below that isn't clipped itself.
export const isClippedImage = (a) => Boolean(a) && a.type === "image" && Boolean(a.clipToBelow);

// The index of the layer the item at `index` is (or would be) clipped to: the nearest layer below it that
// isn't itself a clipped image. -1 when there is none (the item is at the bottom, or only clipped
// images lie below it).
export function clipBaseIndex(items, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (!isClippedImage(items[i])) return i;
  }
  return -1;
}

// Whether the image at `index` can be clipped: it must be an image, with a layer to clip to below it.
export function canClipAt(items, index) {
  const item = items[index];
  return Boolean(item) && item.type === "image" && clipBaseIndex(items, index) >= 0;
}
