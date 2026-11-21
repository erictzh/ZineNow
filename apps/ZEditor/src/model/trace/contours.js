// Image Trace, step 2: the outlines of a pixel mask, as closed loops along the pixel edges.

// Directions on the vertex grid, clockwise on screen (y points down).
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // R, D, L, U
const BIT = [1, 2, 4, 8];

// `mask` is a Uint8Array of width × height (non-zero = inside). Returns the loops, each a flat
// array [x0, y0, x1, y1, ...] of the grid points where the outline turns. Every loop keeps the
// inside on its right as it is walked, so outer edges run clockwise on screen and holes the other
// way: filled with the nonzero rule, the loops of one mask give back exactly that mask.
// Pixels that touch only at a corner belong to separate loops.
export function traceMaskLoops(mask, width, height) {
  const gw = width + 1;
  const out = new Uint8Array(gw * (height + 1)); // per grid point: which directions an edge leaves by
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] !== 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (!inside(x, y - 1)) out[y * gw + x] |= 1;               // top edge, going right
      if (!inside(x + 1, y)) out[y * gw + x + 1] |= 2;           // right edge, going down
      if (!inside(x, y + 1)) out[(y + 1) * gw + x + 1] |= 4;     // bottom edge, going left
      if (!inside(x - 1, y)) out[(y + 1) * gw + x] |= 8;         // left edge, going up
    }
  }

  // The next edge after arriving at a point heading `dir`: turn right if an edge leaves that way,
  // else straight on, else left. Decided on all edges (used or not), so every edge has exactly one
  // successor and following them always comes back round to the edge a loop started from.
  const all = out.slice();
  const nextDir = (here, dir) => {
    const right = (dir + 1) % 4, left = (dir + 3) % 4;
    return here & BIT[right] ? right : here & BIT[dir] ? dir : here & BIT[left] ? left : -1;
  };

  const loops = [];
  for (let start = 0; start < out.length; start++) {
    while (out[start]) {
      const sx = start % gw, sy = (start - sx) / gw;
      const startDir = out[start] & 1 ? 0 : out[start] & 2 ? 1 : out[start] & 4 ? 2 : 3;
      let x = sx, y = sy, dir = startDir;
      const points = [];
      let prevDir = -1;
      for (let guard = 0; guard < all.length * 4; guard++) {
        out[y * gw + x] &= ~BIT[dir];
        if (dir !== prevDir) points.push(x, y);
        prevDir = dir;
        x += DX[dir]; y += DY[dir];
        dir = nextDir(all[y * gw + x], dir);
        if (dir < 0 || (x === sx && y === sy && dir === startDir)) break;
      }
      // The start point is only a turn if the loop's last edge came in along another direction.
      if (prevDir === startDir) points.splice(0, 2);
      if (points.length >= 6) loops.push(points);
    }
  }
  return loops;
}

// Signed area of a loop (shoelace): positive for loops running clockwise on screen.
export function loopArea(points) {
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 2) % n;
    sum += points[i] * points[j + 1] - points[j] * points[i + 1];
  }
  return sum / 2;
}
