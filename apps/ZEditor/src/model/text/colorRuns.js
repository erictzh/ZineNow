// Per-letter colour ranges, and keeping them right while the text is edited.

// ---- Per-letter colours. A text box keeps its words as plain text and the
// recoloured stretches as `colorRuns`: [{ start, end, color }] over the
// text's character positions (end exclusive), sorted and never
// overlapping. Where a run is absent the box's own colour shows.
export function normalizeRuns(runs) {
  const sorted = (runs || []).filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const run of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.end === run.start && last.color === run.color) last.end = run.end;
    else merged.push({ ...run });
  }
  return merged;
}

// `runs` with [start, end) given `color`, or cleared when color is null.
export function setRunColor(runs, start, end, color) {
  const next = [];
  for (const run of runs || []) {
    if (run.end <= start || run.start >= end) { next.push(run); continue; }
    if (run.start < start) next.push({ ...run, end: start });
    if (run.end > end) next.push({ ...run, start: end });
  }
  if (color) next.push({ start, end, color });
  return normalizeRuns(next);
}

// `runs` after the text changed from oldText to newText. The edit is
// found as what's left between the shared start and shared end of the two;
// runs before it stay, runs after it shift, runs inside it shrink, and text
// typed inside (or at the end of) a coloured stretch takes its colour.
export function adjustRunsForEdit(runs, oldText, newText) {
  if (!runs || !runs.length) return runs;
  let start = 0;
  const maxStart = Math.min(oldText.length, newText.length);
  while (start < maxStart && oldText[start] === newText[start]) start++;
  let tail = 0;
  const maxTail = maxStart - start;
  while (tail < maxTail && oldText[oldText.length - 1 - tail] === newText[newText.length - 1 - tail]) tail++;
  const removedEnd = oldText.length - tail;
  const insertedLength = newText.length - start - tail;
  const delta = insertedLength - (removedEnd - start);
  // A run starting where text is inserted stays after it; one ending
  // there grows to take it in.
  const mapStart = (pos) => (pos < start ? pos : pos >= removedEnd ? pos + delta : start + insertedLength);
  const mapEnd = (pos) => (pos >= removedEnd ? pos + delta : pos <= start ? pos : start);
  return normalizeRuns(runs.map((run) => ({ ...run, start: mapStart(run.start), end: mapEnd(run.end) })));
}

// The text cut into stretches of one colour each: [{ text, color }], with
// color null where no run applies.
export function colorSegments(text, runs) {
  const segments = [];
  let position = 0;
  for (const run of runs || []) {
    if (run.start > position) segments.push({ text: text.slice(position, run.start), color: null });
    segments.push({ text: text.slice(run.start, run.end), color: run.color });
    position = run.end;
  }
  if (position < text.length) segments.push({ text: text.slice(position), color: null });
  return segments.filter((s) => s.text.length > 0);
}

export function colorAtIndex(runs, index) {
  for (const run of runs || []) if (index >= run.start && index < run.end) return run.color;
  return null;
}
