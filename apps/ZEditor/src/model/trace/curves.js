// Vectorize, step 3: turns a stair-stepped pixel outline into a smooth SVG path.

// A loop from traceMaskLoops (grid points where it turns) → the middle of every unit pixel edge
// along it. Taking the middles turns one-pixel steps into diagonals, so the stairs smooth out.
export function edgeMidpoints(corners) {
  const pts = [];
  const n = corners.length;
  for (let i = 0; i < n; i += 2) {
    const x0 = corners[i], y0 = corners[i + 1];
    const x1 = corners[(i + 2) % n], y1 = corners[(i + 3) % n];
    const len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
    for (let t = 0; t < len; t++) pts.push([x0 + sx * (t + 0.5), y0 + sy * (t + 0.5)]);
  }
  return pts;
}

// Distance from p to the segment a–b.
function segmentDistance(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Douglas–Peucker on an open polyline: keeps the fewest points that stay within `tolerance`.
function simplifyOpen(pts, tolerance) {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1, worstD = tolerance;
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistance(pts[i], pts[a], pts[b]);
      if (d > worstD) { worstD = d; worst = i; }
    }
    if (worst >= 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// The same for a closed loop: split at the first point and the point furthest from it.
export function simplifyClosed(pts, tolerance) {
  if (pts.length <= 4) return pts.slice();
  let far = 0, farD = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > farD) { farD = d; far = i; }
  }
  const first = simplifyOpen(pts.slice(0, far + 1), tolerance);
  const second = simplifyOpen([...pts.slice(far), pts[0]], tolerance);
  const out = [...first, ...second.slice(1, -1)];
  return out.length >= 3 ? out : pts.slice();
}

// How sharply the outline turns at b, in degrees (0 = straight on).
function turnAngle(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
  const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
  if (!lu || !lv) return 0;
  const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)));
  return Math.acos(cos) * 180 / Math.PI;
}

const num = (v) => String(Math.round(v * 10) / 10); // a tenth of a trace pixel is plenty

// A closed polygon → SVG path data. A point whose bend is more than `cornerAngle` is a sharp corner;
// any other is rounded by a curve that starts and ends on its two sides. How far along each side the
// curve reaches is capped by the bend: a point on a real curve, simplified to within `tolerance`,
// bends a little and gets long arms (the whole curve stays smooth), while a sharp bend between two
// long straight sides only rounds off its tip (the sides stay straight).
export function smoothPathD(poly, cornerAngle, tolerance = 1) {
  const n = poly.length;
  if (n < 3) return "";
  const at = (p, q, len) => { const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [p[0] + (q[0] - p[0]) * len / l, p[1] + (q[1] - p[1]) * len / l]; };
  const joins = poly.map((p, i) => {
    const prev = poly[(i + n - 1) % n], next = poly[(i + 1) % n];
    const bend = turnAngle(prev, p, next);
    if (bend > cornerAngle || bend === 0) return { corner: true, a: p, b: p };
    // On a circle simplified to within `tolerance`, a bend of `bend` comes with half-sides about
    // tolerance / tan(bend / 4) long; arms may grow to twice that.
    const reach = 2 * tolerance / Math.tan((bend * Math.PI / 180) / 4);
    const arm = (q) => Math.min(Math.hypot(q[0] - p[0], q[1] - p[1]) / 2, reach);
    return { corner: false, a: at(p, prev, arm(prev)), b: at(p, next, arm(next)) };
  });
  const xy = (q) => num(q[0]) + " " + num(q[1]);
  let d = "M" + xy(joins[n - 1].b);
  for (let i = 0; i < n; i++) {
    const j = joins[i];
    d += "L" + xy(j.a);
    if (!j.corner) d += "Q" + xy(poly[i]) + " " + xy(j.b);
  }
  return d + "Z";
}
