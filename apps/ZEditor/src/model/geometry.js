// Plain geometry: rotating points and resizing a (possibly rotated) box.

// For a drag started by `startEvent`: turns a later mouse event into how
// far the pointer has moved in artboard px (annotations' own space),
// whatever the current zoom is.
// A point turned `degrees` clockwise about the origin (y points down).
export function rotatePoint(x, y, degrees) {
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  return [x * cos - y * sin, x * sin + y * cos];
}
export const MIN_RESIZE_SIZE = 20;

// A box after dragging one of its handles. `handle` is a compass name
// ("e", "nw"...); the opposite side or corner stays where it is.
// For a rotated box, pass its `angle` and `dx`/`dy` measured in its own
// axes (dragDeltaFrom does that): the box rotates about its centre, so
// the anchored side is kept fixed on the page by moving the centre.
export function resizedBox(box, handle, dx, dy, keepAspect, minSize = MIN_RESIZE_SIZE, angle = 0) {
  const signX = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const signY = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  let width = box.width + signX * dx;
  let height = box.height + signY * dy;
  if (keepAspect) {
    const scaleX = width / box.width, scaleY = height / box.height;
    const minScale = minSize / Math.min(box.width, box.height);
    const scale = Math.max(minScale, signX && signY ? Math.max(scaleX, scaleY) : signX ? scaleX : scaleY);
    width = box.width * scale;
    height = box.height * scale;
  } else {
    width = Math.max(minSize, width);
    height = Math.max(minSize, height);
  }
  // The anchor is the side or corner opposite the handle, as a fraction
  // of the box (0 = left/top, 1 = right/bottom, 0.5 = untouched axis).
  const anchorX = signX > 0 ? 0 : signX < 0 ? 1 : 0.5;
  const anchorY = signY > 0 ? 0 : signY < 0 ? 1 : 0.5;
  const [oldOffsetX, oldOffsetY] = rotatePoint((anchorX - 0.5) * box.width, (anchorY - 0.5) * box.height, angle);
  const [newOffsetX, newOffsetY] = rotatePoint((anchorX - 0.5) * width, (anchorY - 0.5) * height, angle);
  const centerX = box.x + box.width / 2 + oldOffsetX - newOffsetX;
  const centerY = box.y + box.height / 2 + oldOffsetY - newOffsetY;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}
