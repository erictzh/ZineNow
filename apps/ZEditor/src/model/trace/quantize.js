// Image Trace, step 1: reduces a picture's pixels to a few colours (a label per pixel and a palette).

// `pixels` is { width, height, data } with RGBA bytes, like ImageData. Returns
//   { labels: Int16Array (one per pixel; -1 = see-through), palette: [[r, g, b], ...] }
// with the palette sorted by how many pixels use each colour, most first.
// Pixels under half opacity are always see-through; with `ignoreWhite`, near-white ones too.
export function quantizePixels(pixels, settings) {
  const { width, height, data } = pixels;
  const count = width * height;
  const labels = new Int16Array(count).fill(-1);
  const opaque = (i) => data[i * 4 + 3] >= 128;
  const lum = (i) => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];

  let palette;
  if (settings.mode === "bw") {
    palette = [[0, 0, 0], [255, 255, 255]];
    for (let i = 0; i < count; i++) if (opaque(i)) labels[i] = lum(i) < settings.threshold ? 0 : 1;
  } else {
    const gray = settings.mode === "gray";
    const colorOf = gray
      ? (i) => { const l = lum(i); return [l, l, l]; }
      : (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    const centers = kMeans(samplePixels(count, opaque, colorOf), settings.colors);
    palette = centers.map((c) => c.map((x) => Math.round(x)));
    for (let i = 0; i < count; i++) if (opaque(i)) labels[i] = nearest(palette, colorOf(i));
  }

  if (settings.ignoreWhite === "drop") {
    const white = palette.map(([r, g, b]) => r > 225 && g > 225 && b > 225);
    for (let i = 0; i < count; i++) if (labels[i] >= 0 && white[labels[i]]) labels[i] = -1;
  }
  return sortedByUse(labels, palette);
}

// Up to ~20,000 evenly spread opaque pixels: plenty to find the colours, and quick.
function samplePixels(count, opaque, colorOf) {
  const step = Math.max(1, Math.floor(count / 20000));
  const samples = [];
  for (let i = 0; i < count; i += step) if (opaque(i)) samples.push(colorOf(i));
  return samples;
}

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
function nearest(centers, c) {
  let best = 0, bestD = Infinity;
  for (let k = 0; k < centers.length; k++) {
    const d = dist2(centers[k], c);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

// k-means with a fixed start (samples spread by brightness), so the same picture always
// gives the same colours. An emptied cluster restarts at the sample furthest from its centre.
export function kMeans(samples, k) {
  if (!samples.length) return [[0, 0, 0]];
  const byLum = samples.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const n = Math.min(k, samples.length);
  let centers = Array.from({ length: n }, (_, j) => byLum[Math.floor(((j + 0.5) / n) * byLum.length)].slice());
  for (let iter = 0; iter < 12; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    let far = null, farD = -1;
    for (const s of samples) {
      const k2 = nearest(centers, s);
      const d = dist2(centers[k2], s);
      if (d > farD) { farD = d; far = s; }
      const sum = sums[k2];
      sum[0] += s[0]; sum[1] += s[1]; sum[2] += s[2]; sum[3]++;
    }
    let moved = 0;
    centers = centers.map((c, j) => {
      const [r, g, b, m] = sums[j];
      const next = m ? [r / m, g / m, b / m] : far.slice();
      moved = Math.max(moved, dist2(c, next));
      return next;
    });
    if (moved < 0.25) break;
  }
  return centers;
}

// Renumbers labels so colour 0 is the most used; drops unused and merges identical colours.
function sortedByUse(labels, palette) {
  const keyOf = (c) => c.join(",");
  const merged = new Map(); // colour key → first index
  const remap = palette.map((c, i) => {
    const key = keyOf(c);
    if (!merged.has(key)) merged.set(key, i);
    return merged.get(key);
  });
  const uses = new Array(palette.length).fill(0);
  for (let i = 0; i < labels.length; i++) if (labels[i] >= 0) uses[remap[labels[i]]]++;
  const order = palette.map((_, i) => i).filter((i) => uses[i] > 0).sort((a, b) => uses[b] - uses[a] || a - b);
  const rank = new Int16Array(palette.length).fill(-1);
  order.forEach((i, r) => { rank[i] = r; });
  const out = new Int16Array(labels.length);
  for (let i = 0; i < labels.length; i++) out[i] = labels[i] >= 0 ? rank[remap[labels[i]]] : -1;
  return { labels: out, palette: order.map((i) => palette[i]) };
}
