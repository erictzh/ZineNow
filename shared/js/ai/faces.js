// YuNet's picture maths (no browser parts, so it can be tested): the model's input and decoding its answer into face boxes.
// Input: 1 x 3 x H x W, colours as B, G, R in 0..255 (no scaling), the picture fitted inside the model's square (top left, rest black).
// Output: for strides 8, 16 and 32: cls_s and obj_s (one score per cell), bbox_s (4 numbers: centre offsets and log size), kps_s (landmarks, unused).

export const FACE_SIZE = 640;

// `rgba`: W x H x 4 bytes (the fitted picture). Returns the model's input floats.
export function yunetInput(rgba, W, H) {
  const n = W * H, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { out[i] = rgba[i * 4 + 2]; out[n + i] = rgba[i * 4 + 1]; out[2 * n + i] = rgba[i * 4]; }
  return out;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// `get(prefix, stride)` returns the Float32Array of that output ("cls", "obj", "bbox"), or null. `k` = how much the picture was shrunk to fit the
// square (boxes are returned in picture pixels). Returns [{ x, y, w, h, score }] best first, overlapping boxes merged (IoU 0.3).
export function decodeYunet(get, W, H, k, minScore) {
  const faces = [];
  for (const s of [8, 16, 32]) {
    const cls = get("cls", s), obj = get("obj", s), bb = get("bbox", s);
    if (!cls || !obj || !bb) throw new Error("Unexpected model outputs (stride " + s + ").");
    const cols = Math.ceil(W / s), rows = Math.ceil(H / s);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const score = Math.sqrt(clamp01(cls[i]) * clamp01(obj[i]));
      if (score < minScore) continue;
      const cx = (c + bb[i * 4]) * s, cy = (r + bb[i * 4 + 1]) * s, w = Math.exp(bb[i * 4 + 2]) * s, h = Math.exp(bb[i * 4 + 3]) * s;
      faces.push({ x: (cx - w / 2) / k, y: (cy - h / 2) / k, w: w / k, h: h / k, score });
    }
  }
  return nms(faces, 0.3);
}

export function nms(faces, thr) {
  faces.sort((a, b) => b.score - a.score);
  const keep = [];
  for (const f of faces) {
    const clear = keep.every((g) => {
      const x1 = Math.max(f.x, g.x), y1 = Math.max(f.y, g.y), x2 = Math.min(f.x + f.w, g.x + g.w), y2 = Math.min(f.y + f.h, g.y + g.h);
      const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
      return inter / (f.w * f.h + g.w * g.h - inter) < thr;
    });
    if (clear) keep.push(f);
  }
  return keep;
}

// The box to hide for a face: grown by `padPct` % of its size on each side, kept inside the picture.
export function paddedBox(f, padPct, W, H) {
  const px = f.w * padPct / 100, py = f.h * padPct / 100;
  const x0 = Math.max(0, Math.floor(f.x - px)), y0 = Math.max(0, Math.floor(f.y - py));
  const x1 = Math.min(W, Math.ceil(f.x + f.w + px)), y1 = Math.min(H, Math.ceil(f.y + f.h + py));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
