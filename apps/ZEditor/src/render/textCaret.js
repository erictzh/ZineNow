// Caret, selection and hit-testing for text laid out by the composer (render/composer.js).
//
// All functions take a `layout` from layoutText (scale 1): `layout.typesetLines`
// are the composer's lines (each with source range, `top`, `x` and positioned
// word `pieces`), `layout.measure(str)` measures a string in the box's font, and
// `padX`/`padY`/`lineHeight` place everything inside the box. Coordinates are
// editor px from the box's outer top-left corner.

// The index of the line a caret at `index` sits on. A caret at the end of a
// wrapped line (after the space that was consumed by the break) is the start
// of the next line; at the end of a paragraph it stays on that paragraph's last line.
export function lineIndexAt(layout, index) {
  const lines = layout.typesetLines;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (index >= l.start && (index < l.end || (l.last && index <= l.end))) return l.hidden ? lastVisibleLine(lines) : i;
  }
  return lastVisibleLine(lines);
}
// Text past the last column is hidden; the caret there rests on the last line you can see.
function lastVisibleLine(lines) {
  for (let i = lines.length - 1; i >= 0; i--) if (!lines[i].hidden) return i;
  return 0;
}

// The x of the caret at `index` on line `tl`.
function xOnLine(layout, tl, index) {
  const lineX = layout.padX + tl.x;
  const pieces = tl.pieces;
  if (!pieces.length) return lineX;
  if (index <= pieces[0].start) return lineX + pieces[0].x;
  for (let k = 0; k < pieces.length; k++) {
    const p = pieces[k];
    if (index >= p.start && index <= p.end) {
      const raw = p.hyphen ? p.text.slice(0, -1) : p.text;
      return lineX + p.x + layout.measure(raw.slice(0, index - p.start), p.start);
    }
    const next = pieces[k + 1];
    if (next && index > p.end && index < next.start) {
      // Inside the spaces between two words: spread across the gap.
      const from = lineX + p.x + p.width, to = lineX + next.x;
      return from + (to - from) * ((index - p.end) / (next.start - p.end));
    }
  }
  const last = pieces[pieces.length - 1];
  return lineX + last.x + last.width;
}

// Where to draw the caret for `index`: { x, y, height, line }.
export function caretRect(layout, index) {
  const line = lineIndexAt(layout, index);
  const tl = layout.typesetLines[line];
  return { x: xOnLine(layout, tl, index), y: layout.padY + tl.top, height: tl.height || layout.lineHeight, line };
}

// The text index at x on line `lineIndex` (the closest gap between letters).
export function indexAtX(layout, lineIndex, x) {
  const tl = layout.typesetLines[lineIndex];
  const pieces = tl.pieces;
  const lineEnd = tl.last ? tl.end : tl.visibleEnd; // past the end of a wrapped line: before the space that ended it
  if (!pieces.length) return tl.start;
  const lineX = layout.padX + tl.x;
  const first = pieces[0];
  if (x <= lineX + first.x) return first.start;
  for (let k = 0; k < pieces.length; k++) {
    const p = pieces[k];
    const left = lineX + p.x, right = left + p.width;
    if (x >= left && x <= right) {
      const raw = p.hyphen ? p.text.slice(0, -1) : p.text;
      let best = p.start, bestDist = Infinity;
      for (let n = 0; n <= raw.length; n++) {
        const dist = Math.abs(left + layout.measure(raw.slice(0, n), p.start) - x);
        if (dist < bestDist) { bestDist = dist; best = p.start + n; }
      }
      return Math.min(best, p.end);
    }
    const next = pieces[k + 1];
    if (next && x > right && x < lineX + next.x) {
      // In the gap: the nearest boundary among the spaces.
      const f = (x - right) / (lineX + next.x - right);
      return Math.round(p.end + f * (next.start - p.end));
    }
  }
  return lineEnd;
}

// The text index under (x, y) in box coordinates.
export function indexAtPoint(layout, x, y) {
  const lines = layout.typesetLines;
  // In a multi-column frame the columns have lines at the same heights, so the column under the pointer comes first.
  const columns = layout.columns || 1;
  const column = columns > 1 && layout.columnStride > 0 ? Math.max(0, Math.min(columns - 1, Math.floor((x - layout.padX) / layout.columnStride))) : null;
  let best = -1, bestDist = Infinity;
  const consider = (onlyColumn) => lines.forEach((tl, i) => {
    if (tl.hidden) return;
    if (onlyColumn !== null && (tl.col || 0) !== onlyColumn) return;
    const top = layout.padY + tl.top, bottom = top + (tl.height || layout.lineHeight);
    const dist = y < top ? top - y : y > bottom ? y - bottom : 0;
    if (dist < bestDist) { bestDist = dist; best = i; }
  });
  consider(column);
  if (best < 0) consider(null); // that column is empty: any line will do
  return indexAtX(layout, Math.max(0, best), x);
}

// Where the caret goes one line up (-1) or down (1), keeping to `goalX`.
export function moveVertical(layout, index, direction, goalX, textLength) {
  const line = lineIndexAt(layout, index);
  const target = line + direction;
  if (target < 0) return 0;
  if (target >= layout.typesetLines.length) return textLength;
  return indexAtX(layout, target, goalX);
}

// The start / end of the line `index` is on (End stops before a wrapped line's trailing space).
export function lineStartAt(layout, index) { return layout.typesetLines[lineIndexAt(layout, index)].start; }
export function lineEndAt(layout, index) {
  const tl = layout.typesetLines[lineIndexAt(layout, index)];
  return tl.last ? tl.end : tl.visibleEnd;
}

// Rectangles to paint for the selection [start, end): { x, y, width, height }.
export function selectionRects(layout, start, end) {
  const rects = [];
  if (end <= start) return rects;
  layout.typesetLines.forEach((tl) => {
    if (tl.hidden) return;
    const lineEnd = tl.last ? tl.end : tl.end; // the consumed space or newline belongs to this line
    if (end <= tl.start || start >= lineEnd + (tl.last ? 1 : 0)) return;
    const a = Math.max(start, tl.start);
    const b = Math.min(end, tl.last ? tl.end : tl.visibleEnd);
    let x0 = xOnLine(layout, tl, a);
    let x1 = xOnLine(layout, tl, Math.max(a, b));
    // A selection that runs on past the end of the line shows the line break (a little extra width).
    const runsOn = end > (tl.last ? tl.end : tl.visibleEnd);
    if (runsOn) x1 += layout.fontSize * 0.35;
    if (x1 - x0 < 1 && !runsOn) return;
    rects.push({ x: x0, y: layout.padY + tl.top, width: Math.max(1, x1 - x0), height: tl.height || layout.lineHeight });
  });
  return rects;
}

// The word (run of letters, digits or marks) around `index`, as [start, end].
export function wordRangeAt(text, index) {
  const isWord = (ch) => /[\p{L}\p{N}\p{M}'’_-]/u.test(ch);
  let s = Math.min(index, text.length), e = s;
  while (s > 0 && isWord(text[s - 1])) s--;
  while (e < text.length && isWord(text[e])) e++;
  if (s === e && index < text.length) e = index + 1; // on a space or punctuation: select that one character
  return [s, e];
}

// The paragraph around `index` as [start, end] (without its newline).
export function paragraphRangeAt(text, index) {
  const s = text.lastIndexOf("\n", index - 1) + 1;
  let e = text.indexOf("\n", index);
  if (e < 0) e = text.length;
  return [s, e];
}
