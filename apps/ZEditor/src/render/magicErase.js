// The magic eraser on an image's pixels: erases the clicked colour and every pixel close enough to it.
//
// The work happens on a "coverage" map: one 0–1 number per pixel saying how
// much of it to erase (1 = all, 0 = none). It's built from the colour match,
// then tidied (specks, edge shift, feather), and only then turned into alpha.
// Settings are documented in model/magicEraser.js.

// The largest possible colour (hue/saturation) difference between two RGB
// colours is about 360; a colour tolerance of 255 is scaled to reach it, so
// 255 means "any colour".
const COLOR_SCALE = 1.5;

// Makes matching pixels of `imageData` fully (or, with soft edges, partly)
// transparent, in place, and returns how many pixels changed. Already
// transparent pixels never match and always count as erased for the edge
// steps, so shifting or feathering doesn't eat into an earlier erase.
//
// It's two stages so a live preview can redo only the cheap one: the
// colour match (slow, depends on the settings in magicMatchKey) and the edge
// finishing (specks, shift, feather, defringe, opacity).
export function magicErase(imageData, x, y, settings) {
  const cov = magicMatch(imageData, x, y, settings);
  if (!cov) return 0;
  return magicFinish(imageData, cov, x, y, settings);
}

// The settings the colour match depends on. While these are unchanged, a
// match result can be reused and only magicFinish needs to run again.
export function magicMatchKey(s) {
  if (s.clickMode === "refine") return "refine"; // no colour match at all: the image's own transparency is the starting point
  return [s.tolerance, s.colorTolerance, s.smoothing, s.contiguous, s.diagonal, s.softness].join("|");
}

// Stage 1: reads `imageData` (doesn't change it) and returns the coverage
// map for a click at (x, y), or null if the click can't erase anything
// (off the image, or on an already transparent pixel). Pass the result, as a
// copy (.slice()), to magicFinish, which changes it.
//
// With `settings.clickMode === "refine"` there's no colour match: the
// "erased" area is simply the image's existing fully transparent pixels, so
// the edge steps clean up the boundary between transparent and coloured
// pixels. (x, y are unused; null if the image has no transparent pixel.)
export function magicMatch(imageData, x, y, settings) {
  const { data, width, height } = imageData;
  if (settings.clickMode === "refine") {
    const cov = new Float32Array(width * height);
    let any = false;
    for (let i = 0; i < cov.length; i++) if (data[i * 4 + 3] === 0) { cov[i] = 1; any = true; }
    return any ? cov : null;
  }
  const px = Math.floor(x), py = Math.floor(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return null;
  const start = py * width + px;
  if (data[start * 4 + 3] === 0) return null; // clicked on an already transparent pixel
  const cov = matchCoverage(data, width, height, start, settings);
  for (let i = 0; i < width * height; i++) if (data[i * 4 + 3] === 0) cov[i] = 1;
  return cov;
}

// Stage 2: finishes the edge and writes the result into `imageData` (alpha,
// and colour for defringe), consuming `cov`. `imageData` must be the same
// pixels magicMatch saw. Returns how many pixels changed.
export function magicFinish(imageData, cov, x, y, settings) {
  const { data, width, height } = imageData;
  const start = settings.clickMode === "refine" ? -1 : Math.floor(y) * width + Math.floor(x); // -1: no clicked pixel to protect
  const N = width * height;

  // (Small erased islands are only put back in whole-image mode; refining an
  // existing edge can't put back pixels that are already transparent.)
  const clearIslands = !settings.contiguous && settings.clickMode !== "refine";
  if (settings.specks > 0) removeSpecks(cov, width, height, settings.specks, clearIslands, start);
  if (settings.edgeShift) shiftEdge(cov, width, height, settings.edgeShift);
  if (settings.feather > 0) featherEdge(cov, width, height, settings.feather);
  if (settings.defringe > 0) defringeEdge(data, cov, width, height, settings.defringe / 100);

  // Turn coverage into alpha. Opacity is applied last so the shape steps
  // above always work on the full-strength mask.
  const strength = Math.min(1, Math.max(0, settings.opacity / 100));
  let changed = 0;
  for (let i = 0; i < N; i++) {
    const c = cov[i];
    if (c <= 0) continue;
    const o = i * 4 + 3, a = data[o];
    const next = Math.round(a * (1 - Math.min(1, c) * strength));
    if (next !== a) { data[o] = next; changed++; }
  }
  return changed;
}

// Step 1: how much each pixel matches the clicked colour. Returns the
// coverage map (not yet including the already-transparent pixels).
function matchCoverage(data, width, height, start, settings) {
  const { tolerance, colorTolerance, smoothing, contiguous, diagonal, softness } = settings;
  const radius = Math.max(0, Math.round(smoothing));
  const colorLimit = colorTolerance * COLOR_SCALE;
  const fade = Math.max(0, softness) / 100;   // fade zone, as a fraction of the tolerance
  const reach = 1 + fade;                     // how far past the tolerance a pixel can still be partly erased
  const N = width * height;

  // Alpha-weighted mean colour of the window around pixel i, so already
  // erased (transparent) pixels don't drag the average toward black.
  const mean = [0, 0, 0];
  const smooth = (i) => {
    const cx = i % width, cy = (i - cx) / width;
    const x0 = Math.max(0, cx - radius), x1 = Math.min(width - 1, cx + radius);
    const y0 = Math.max(0, cy - radius), y1 = Math.min(height - 1, cy + radius);
    let r = 0, g = 0, b = 0, w = 0;
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const o = (yy * width + xx) * 4, a = data[o + 3];
        if (a === 0) continue;
        r += data[o] * a; g += data[o + 1] * a; b += data[o + 2] * a; w += a;
      }
    }
    mean[0] = r / w; mean[1] = g / w; mean[2] = b / w; // w > 0: pixel i itself is visible
  };

  smooth(start);
  const r0 = mean[0], g0 = mean[1], b0 = mean[2];
  // How far a difference is, in units of its tolerance (1 = right at the limit).
  const ratio = (diff, limit) => (limit > 0 ? diff / limit : diff > 0 ? Infinity : 0);

  // 1 = erase fully (within tolerance), fading to 0 across the fade zone.
  const score = (i) => {
    if (data[i * 4 + 3] === 0) return 0;
    smooth(i);
    const dr = mean[0] - r0, dg = mean[1] - g0, db = mean[2] - b0;
    const dLuma = (dr + dg + db) / 3; // brightness shift
    // What's left after removing the brightness shift is the colour shift.
    const dChroma = Math.hypot(dr - dLuma, dg - dLuma, db - dLuma);
    const d = Math.max(ratio(Math.abs(dLuma), tolerance), ratio(dChroma, colorLimit));
    if (d <= 1) return 1;
    if (d >= reach) return 0;
    return (reach - d) / fade; // fade > 0 here, since reach > d > 1
  };

  const cov = new Float32Array(N);
  if (!contiguous) {
    for (let i = 0; i < N; i++) cov[i] = score(i);
    return cov;
  }

  // Flood fill from the clicked pixel through every pixel that matches at
  // all (fully or partly). `seen` keeps each pixel from being queued twice.
  const seen = new Uint8Array(N);
  const stack = [start];
  seen[start] = 1;
  const push = (j) => { if (!seen[j]) { seen[j] = 1; stack.push(j); } };
  while (stack.length) {
    const i = stack.pop();
    const s = score(i);
    if (s <= 0) continue;
    cov[i] = s;
    const cx = i % width, cy = (i - cx) / width;
    const left = cx > 0, right = cx < width - 1, up = cy > 0, down = cy < height - 1;
    if (left) push(i - 1);
    if (right) push(i + 1);
    if (up) push(i - width);
    if (down) push(i + width);
    if (diagonal) {
      if (left && up) push(i - width - 1);
      if (right && up) push(i - width + 1);
      if (left && down) push(i + width - 1);
      if (right && down) push(i + width + 1);
    }
  }
  return cov;
}

// Step 2: flips small islands. A small patch of kept pixels inside the
// erased area (a speck the match missed) is erased; with `clearIslands`
// (whole-image mode), a small patch of erased pixels is kept again, except
// the one holding the clicked pixel. "Small" = at most `maxSize` pixels.
function removeSpecks(cov, width, height, maxSize, clearIslands, protect) {
  const N = width * height;
  const seen = new Uint8Array(N);
  const stack = [], members = [];
  for (let s = 0; s < N; s++) {
    if (seen[s]) continue;
    const erasedPatch = cov[s] >= 0.5;
    seen[s] = 1;
    stack.push(s);
    members.length = 0;
    let size = 0, hasProtect = false;
    while (stack.length) {
      const i = stack.pop();
      size++;
      if (size <= maxSize) members.push(i);
      if (i === protect) hasProtect = true;
      const cx = i % width, cy = (i - cx) / width;
      const visit = (j) => { if (!seen[j] && (cov[j] >= 0.5) === erasedPatch) { seen[j] = 1; stack.push(j); } };
      if (cx > 0) visit(i - 1);
      if (cx < width - 1) visit(i + 1);
      if (cy > 0) visit(i - width);
      if (cy < height - 1) visit(i + width);
    }
    if (size > maxSize) continue;
    if (!erasedPatch) for (const i of members) cov[i] = 1;
    else if (clearIslands && !hasProtect) for (const i of members) cov[i] = 0;
  }
}

// Step 3: moves the edge of the erased area by `shift` pixels: positive
// grows it, negative shrinks it. One pixel per pass, alternating between
// 4- and 8-neighbour passes so the result is roughly round, not diamond or
// square. Coverage values are grown/shrunk with max/min, so soft edges move too.
function shiftEdge(cov, width, height, shift) {
  const grow = shift > 0;
  const steps = Math.abs(shift);
  let src = cov, dst = new Float32Array(cov.length);
  for (let k = 0; k < steps; k++) {
    const diag = k % 2 === 1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let v = src[i];
        const take = (j) => { const n = src[j]; if (grow ? n > v : n < v) v = n; };
        if (x > 0) take(i - 1);
        if (x < width - 1) take(i + 1);
        if (y > 0) take(i - width);
        if (y < height - 1) take(i + width);
        if (diag) {
          if (x > 0 && y > 0) take(i - width - 1);
          if (x < width - 1 && y > 0) take(i - width + 1);
          if (x > 0 && y < height - 1) take(i + width - 1);
          if (x < width - 1 && y < height - 1) take(i + width + 1);
        }
        dst[i] = v;
      }
    }
    [src, dst] = [dst, src];
  }
  if (src !== cov) cov.set(src);
}

// Step 4: softens the edge of the erased area by blurring the coverage map
// (two box-blur passes each way, which approximates a smooth fade). The fade
// reaches about `feather` pixels either side of the edge.
function featherEdge(cov, width, height, feather) {
  const radius = Math.max(1, Math.round(feather / 2));
  const tmp = new Float32Array(cov.length);
  for (let pass = 0; pass < 2; pass++) {
    boxBlurRows(cov, tmp, width, height, radius);
    boxBlurColumns(tmp, cov, width, height, radius);
  }
}

function boxBlurRows(src, dst, width, height, r) {
  const n = 2 * r + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(width - 1, Math.max(0, k))];
    for (let x = 0; x < width; x++) {
      dst[row + x] = sum / n;
      sum += src[row + Math.min(width - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
}

function boxBlurColumns(src, dst, width, height, r) {
  const n = 2 * r + 1;
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[Math.min(height - 1, Math.max(0, k)) * width + x];
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum / n;
      sum += src[Math.min(height - 1, y + r + 1) * width + x] - src[Math.max(0, y - r) * width + x];
    }
  }
}

// Step 5: cleans the background colour off the half-erased edge pixels. Each
// one is pulled toward the average colour of the fully-kept pixels around it
// (within 3px) by `strength` (0–1, more for pixels that are mostly erased),
// so a cutout doesn't keep a halo of the old background.
function defringeEdge(data, cov, width, height, strength) {
  const R = 3;
  for (let i = 0; i < cov.length; i++) {
    const c = cov[i];
    if (c <= 0.02 || c >= 0.98 || data[i * 4 + 3] === 0) continue;
    const cx = i % width, cy = (i - cx) / width;
    const x0 = Math.max(0, cx - R), x1 = Math.min(width - 1, cx + R);
    const y0 = Math.max(0, cy - R), y1 = Math.min(height - 1, cy + R);
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const j = yy * width + xx;
        if (cov[j] > 0.02 || data[j * 4 + 3] === 0) continue; // only fully kept, visible pixels
        r += data[j * 4]; g += data[j * 4 + 1]; b += data[j * 4 + 2]; n++;
      }
    }
    if (n === 0) continue;
    const k = strength * Math.sqrt(c), o = i * 4;
    data[o] += (r / n - data[o]) * k;
    data[o + 1] += (g / n - data[o + 1]) * k;
    data[o + 2] += (b / n - data[o + 2]) * k;
  }
}
