// Snapping an item onto other things on the page: the page's edges and middle, ruler guides and the edges and middles
// of the other visible items. Pure: the lines come in as { x: [...], y: [...] } in page px.

// How far to nudge a box (moving it) so an edge or its middle lands on a line. Returns the nudge and the lines it
// landed on (for drawing): { dx, dy, x: line | null, y: line | null }.
export function snapBox(box, lines, threshold) {
  const pick = (edges, candidates) => {
    let best = null, dist = threshold;
    for (const edge of edges) for (const line of candidates) {
      const d = Math.abs(line - edge);
      if (d <= dist) { dist = d; best = { shift: line - edge, line }; }
    }
    return best;
  };
  const hx = pick([box.x0, (box.x0 + box.x1) / 2, box.x1], lines.x || []);
  const hy = pick([box.y0, (box.y0 + box.y1) / 2, box.y1], lines.y || []);
  return { dx: hx ? hx.shift : 0, dy: hy ? hy.shift : 0, x: hx ? hx.line : null, y: hy ? hy.line : null };
}

// The same for resizing an item that is not turned: only the edge(s) the handle drags snap. `orig` is the box at the
// start { x, y, width, height }, (dx, dy) how far the handle has been dragged. Returns the new (dx, dy) and the lines hit.
export function snapResize(orig, handle, dx, dy, lines, threshold) {
  const nearest = (edge, candidates) => {
    let best = null, dist = threshold;
    for (const line of candidates) { const d = Math.abs(line - edge); if (d <= dist) { dist = d; best = line; } }
    return best;
  };
  let hitX = null, hitY = null;
  if (handle.includes("e")) { hitX = nearest(orig.x + orig.width + dx, lines.x || []); if (hitX !== null) dx = hitX - (orig.x + orig.width); }
  else if (handle.includes("w")) { hitX = nearest(orig.x + dx, lines.x || []); if (hitX !== null) dx = hitX - orig.x; }
  if (handle.includes("s")) { hitY = nearest(orig.y + orig.height + dy, lines.y || []); if (hitY !== null) dy = hitY - (orig.y + orig.height); }
  else if (handle.includes("n")) { hitY = nearest(orig.y + dy, lines.y || []); if (hitY !== null) dy = hitY - orig.y; }
  return { dx, dy, x: hitX, y: hitY };
}
