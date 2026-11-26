// Gaussian blur of RGBA pixels, in place. A real Gaussian is approximated by three box blurs of well-chosen sizes (the usual fast
// method), horizontal then vertical. Colours are blurred premultiplied by alpha, so a see-through edge does not grow a dark or white
// halo. Pure: works on any Uint8ClampedArray of w * h * 4 bytes (ImageData.data).

// The three box sizes whose blurs together look like a Gaussian of `sigma`.
function boxSizes(sigma, n = 3) {
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let low = Math.floor(ideal);
  if (low % 2 === 0) low--;
  const high = low + 2;
  const m = Math.round((12 * sigma * sigma - n * low * low - 4 * n * low - 3 * n) / (-4 * low - 4));
  return Array.from({ length: n }, (_, i) => (i < m ? low : high));
}

// One box blur of radius r along a line of `count` pixels, `step` bytes apart (4 = across a row, 4 * w = down a column); edges repeat.
function boxLine(src, dst, start, count, step, r) {
  const div = 2 * r + 1, lastIdx = count - 1;
  for (let ch = 0; ch < 4; ch++) {
    const at = (i) => src[start + Math.min(lastIdx, Math.max(0, i)) * step + ch]; // outside the line the edge pixel repeats
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += at(k); // the window around pixel 0
    for (let i = 0; i < count; i++) {
      dst[start + i * step + ch] = Math.round(sum / div);
      sum += at(i + r + 1) - at(i - r);
    }
  }
}

export function gaussianBlur(data, w, h, sigma) {
  if (!(sigma > 0.3) || w < 2 || h < 2) return;
  // Premultiply.
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 255) { data[i] = (data[i] * a) / 255; data[i + 1] = (data[i + 1] * a) / 255; data[i + 2] = (data[i + 2] * a) / 255; }
  }
  const tmp = new Uint8ClampedArray(data.length);
  let a = data, b = tmp;
  for (const size of boxSizes(sigma)) {
    const r = (size - 1) / 2;
    for (let y = 0; y < h; y++) boxLine(a, b, y * w * 4, w, 4, r);
    [a, b] = [b, a];
    for (let x = 0; x < w; x++) boxLine(a, b, x * 4, h, w * 4, r);
    [a, b] = [b, a];
  }
  if (a !== data) data.set(a);
  // Un-premultiply.
  for (let i = 0; i < data.length; i += 4) {
    const al = data[i + 3];
    if (al > 0 && al < 255) { const k = 255 / al; data[i] = data[i] * k; data[i + 1] = data[i + 1] * k; data[i + 2] = data[i + 2] * k; }
  }
}
