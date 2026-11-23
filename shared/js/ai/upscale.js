// The picture maths of the upscaler (no browser parts, so it can be tested). A picture is enlarged piece by piece ("tiles"): each tile is cut out
// with an extra border (`pad`) so the joins do not show, given to the model (it makes it S times bigger), and only the middle of the answer is kept.

// The tiles that cover a W x H picture: [{ x0, y0, w, h }] (w and h are smaller at the right and bottom edges).
export function tilePlan(W, H, tile) {
  const list = [];
  for (let y0 = 0; y0 < H; y0 += tile) for (let x0 = 0; x0 < W; x0 += tile) list.push({ x0, y0, w: Math.min(tile, W - x0), h: Math.min(tile, H - y0) });
  return list;
}

// The model's input for the square T x T that starts at (ox, oy) in the picture (`rgba` W x H x 4): 3 x T x T floats 0..1 (red, green, blue planes).
// Pixels outside the picture copy the nearest edge pixel.
export function tileInput(rgba, W, H, ox, oy, T) {
  const out = new Float32Array(3 * T * T), n = T * T;
  for (let y = 0; y < T; y++) {
    const sy = Math.min(H - 1, Math.max(0, oy + y));
    for (let x = 0; x < T; x++) {
      const sx = Math.min(W - 1, Math.max(0, ox + x)), i = (sy * W + sx) * 4, o = y * T + x;
      out[o] = rgba[i] / 255; out[n + o] = rgba[i + 1] / 255; out[2 * n + o] = rgba[i + 2] / 255;
    }
  }
  return out;
}

// The model's answer for a tile (`od`: 3 x OT x OT floats 0..1) -> the RGBA bytes of the tile's own part (w x h pixels, S times bigger, without the border):
// (w*S) x (h*S) x 4. `pad`: the border that was added round the tile (in source pixels). Alpha is 255.
export function tileToRgba(od, OT, S, pad, w, h) {
  const cw = w * S, ch = h * S, n = OT * OT, out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = (pad * S + y) * OT + (pad * S + x), di = (y * cw + x) * 4;
    for (let c = 0; c < 3; c++) { const v = od[c * n + si]; out[di + c] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255); }
    out[di + 3] = 255;
  }
  return out;
}

// How big the result is: `scale` is the model's own enlargement (4), `want` 2 or 4. Returns { w, h, tooBig } with a longest-side limit.
export function resultSize(W, H, want, maxSide) {
  const w = W * want, h = H * want;
  return { w, h, tooBig: Math.max(w, h) > maxSide };
}
