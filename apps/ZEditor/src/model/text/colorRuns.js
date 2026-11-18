// Custom text spans (colour, font, size, bold, italic, underline, strike, paragraph align), and keeping them right while the text is edited.

// ---- Custom text spans. A text box keeps its words as plain text and the
// restyled stretches as `colorRuns` (the name is kept from when they only held a
// colour, so older projects open unchanged): [{ start, end, ...props }] over the
// text's character positions (end exclusive), sorted and never overlapping.
// `props` are any of SPAN_KEYS; where a prop is absent the box's own setting
// shows. `align` is a paragraph setting: it's read at each paragraph's start.
export const SPAN_KEYS = ["color", "fontFamily", "fontSize", "bold", "italic", "underline", "strike", "align"];
// Props that change the letters' shapes and widths (so the box is laid out by the composer).
export const SPAN_LAYOUT_KEYS = ["fontFamily", "fontSize", "bold", "italic", "align"];

const hasProps = (run) => SPAN_KEYS.some((k) => run[k] != null);
const sameProps = (a, b) => SPAN_KEYS.every((k) => (a[k] == null ? b[k] == null : a[k] === b[k]));

export function normalizeRuns(runs) {
  const sorted = (runs || []).filter((r) => r.end > r.start && hasProps(r)).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const run of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.end === run.start && sameProps(last, run)) last.end = run.end;
    else merged.push({ ...run });
  }
  return merged;
}

// `runs` with `patch` applied over [start, end): each key in the patch is set,
// or cleared where its value is null/undefined. Other props are kept.
export function setRunProps(runs, start, end, patch) {
  if (!(end > start)) return normalizeRuns(runs);
  const apply = (run) => {
    const out = { ...run };
    for (const [key, value] of Object.entries(patch)) {
      if (value == null) delete out[key]; else out[key] = value;
    }
    return out;
  };
  const next = [];
  let pos = start;
  for (const run of [...(runs || [])].sort((a, b) => a.start - b.start)) {
    if (run.end <= start || run.start >= end) { next.push(run); continue; }
    if (run.start < start) next.push({ ...run, end: start });
    if (run.end > end) next.push({ ...run, start: end });
    const s = Math.max(run.start, start), e = Math.min(run.end, end);
    if (s > pos) next.push(apply({ start: pos, end: s }));
    next.push(apply({ ...run, start: s, end: e }));
    pos = e;
  }
  if (pos < end) next.push(apply({ start: pos, end }));
  return normalizeRuns(next);
}

// `runs` with [start, end) given `color`, or cleared when color is null.
export function setRunColor(runs, start, end, color) {
  return setRunProps(runs, start, end, { color: color || null });
}

// `runs` with every custom prop cleared over [start, end).
export function clearRunProps(runs, start, end) {
  return setRunProps(runs, start, end, Object.fromEntries(SPAN_KEYS.map((k) => [k, null])));
}

// The span covering `index`, or null.
export function runAt(runs, index) {
  for (const run of runs || []) if (index >= run.start && index < run.end) return run;
  return null;
}

// True when some span changes the letters' font or a paragraph's alignment.
export function hasLayoutSpans(runs) {
  return Boolean(runs && runs.some((r) => SPAN_LAYOUT_KEYS.some((k) => r[k] != null)));
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

// The text cut into stretches of one span each: [{ text, color, span }], with
// color null and span null where no run applies.
export function colorSegments(text, runs) {
  const segments = [];
  let position = 0;
  for (const run of runs || []) {
    if (run.start > position) segments.push({ text: text.slice(position, run.start), color: null, span: null });
    segments.push({ text: text.slice(run.start, run.end), color: run.color || null, span: run });
    position = run.end;
  }
  if (position < text.length) segments.push({ text: text.slice(position), color: null, span: null });
  return segments.filter((s) => s.text.length > 0);
}

export function colorAtIndex(runs, index) {
  const run = runAt(runs, index);
  return run && run.color ? run.color : null;
}
