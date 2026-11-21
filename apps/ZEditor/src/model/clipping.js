// Clipping masks: a layer marked `clipToBelow` shows only where the layer below it has pixels.

// The items are a page's list in stacking order (first = bottom). Any kind of layer can be clipped (an image,
// text, a shape, a stroke), and any kind can be what it is clipped to.
// Several clipped layers in a row all clip to the same layer: the nearest one below that isn't clipped itself.
export const isClipped = (a) => Boolean(a) && Boolean(a.clipToBelow);

// The index of the layer the item at `index` is (or would be) clipped to: the nearest layer below it that
// isn't itself clipped. -1 when there is none (the item is at the bottom, or only clipped layers lie
// below it).
export function clipBaseIndex(items, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (!isClipped(items[i])) return i;
  }
  return -1;
}

// Whether the layer at `index` can be clipped: there must be a layer to clip to below it.
export function canClipAt(items, index) {
  return Boolean(items[index]) && clipBaseIndex(items, index) >= 0;
}
