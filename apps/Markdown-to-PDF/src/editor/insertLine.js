// Inserting a marker line (\pagebreak, \toc, \space{n}) into the Markdown on its own line.

// Returns the new text and caret position for putting `line` at the
// selection [start, end), on its own line with blank lines both sides.
// The padding only adds what's actually missing on each side (start of
// document, mid paragraph, already-blank surroundings), so it never piles
// up extra blank lines.
export function insertStandaloneLine(markdown, start, end, line) {
  const before = markdown.slice(0, start);
  const after = markdown.slice(end);
  const prefix = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = after.length === 0 ? "" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const insertion = prefix + line + suffix;
  return { text: before + insertion + after, caret: (before + insertion).length };
}

// The \space{N} height the user typed, kept within 1–200 lines (default 5).
export function clampSpaceLines(value) {
  return Math.min(200, Math.max(1, parseInt(value, 10) || 5));
}
