// The magic eraser on an image's pixels: erases the clicked colour and every pixel within the tolerance of it.

// Makes matching pixels of `imageData` fully transparent, in place, and
// returns how many were erased. A pixel matches when its red, green and
// blue each differ from the clicked pixel's by no more than `tolerance`
// (0–255), and it isn't already transparent. With `contiguous`, only
// matching pixels connected to (x, y) through other matching pixels go
// (4-neighbour flood fill); otherwise every matching pixel does.
export function magicErase(imageData, x, y, tolerance, contiguous) {
  const { data, width, height } = imageData;
  const px = Math.floor(x), py = Math.floor(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return 0;
  const start = py * width + px;
  if (data[start * 4 + 3] === 0) return 0; // clicked on an already transparent pixel
  const r0 = data[start * 4], g0 = data[start * 4 + 1], b0 = data[start * 4 + 2];
  const matches = (i) => {
    const o = i * 4;
    return data[o + 3] !== 0
      && Math.abs(data[o] - r0) <= tolerance
      && Math.abs(data[o + 1] - g0) <= tolerance
      && Math.abs(data[o + 2] - b0) <= tolerance;
  };

  let erased = 0;
  if (!contiguous) {
    for (let i = 0; i < width * height; i++) {
      if (matches(i)) { data[i * 4 + 3] = 0; erased++; }
    }
    return erased;
  }

  // Flood fill from the clicked pixel. `seen` keeps each pixel from being
  // queued twice; a pixel is erased as it's taken off the stack, which also
  // stops it matching again (it's transparent by then).
  const seen = new Uint8Array(width * height);
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop();
    if (!matches(i)) continue;
    data[i * 4 + 3] = 0;
    erased++;
    const cx = i % width, cy = (i - cx) / width;
    if (cx > 0 && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
    if (cx < width - 1 && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
    if (cy > 0 && !seen[i - width]) { seen[i - width] = 1; stack.push(i - width); }
    if (cy < height - 1 && !seen[i + width]) { seen[i + width] = 1; stack.push(i + width); }
  }
  return erased;
}
