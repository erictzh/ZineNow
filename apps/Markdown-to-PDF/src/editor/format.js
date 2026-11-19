// The editor toolbar's formatting edits (bold, headings, lists, links…) as pure text operations.
//
// Every function takes the Markdown and the selection [start, end) and returns one edit:
//   { from, to, insert, selStart, selEnd }
// meaning "replace text[from, to) with `insert`, then select [selStart, selEnd)". The editor applies it
// as a single typed edit (EditorTab.jsx), so Ctrl+Z undoes it, and selStart/selEnd are positions in
// the text after the edit. Most actions toggle: bold on bold text takes the bold off, a heading level
// on a line already at that level makes it a paragraph again, and so on.

/* --------------------------------------------------------------------------
   Inline styles: **bold**, *italic*, ~~strikethrough~~, `code`
   -------------------------------------------------------------------------- */

export const INLINE = {
  bold: "**",
  italic: "*",
  strike: "~~",
  code: "`",
};

// How many `ch` characters run back from `pos` (exclusive) / forward from `pos` (inclusive).
function runBefore(text, pos, ch) {
  let n = 0;
  while (pos - n - 1 >= 0 && text[pos - n - 1] === ch) n++;
  return n;
}
function runAfter(text, pos, ch) {
  let n = 0;
  while (pos + n < text.length && text[pos + n] === ch) n++;
  return n;
}

// Is the span [s, e) already wearing `marker` just outside it? Bold and italic share the * character,
// so they read the run of stars: 2 or 3 means bold is on, 1 or 3 means italic is on (***both***).
function wrappedBy(text, s, e, marker) {
  if (marker === "**" || marker === "*") {
    const n = Math.min(runBefore(text, s, "*"), runAfter(text, e, "*"));
    return marker === "**" ? n >= 2 : n % 2 === 1;
  }
  return text.slice(s - marker.length, s) === marker && text.slice(e, e + marker.length) === marker;
}

export function toggleInline(text, start, end, kind) {
  const m = INLINE[kind];
  const len = m.length;
  // Nothing selected: an empty pair with the caret between, or step out of an empty pair just typed.
  if (start === end) {
    if (text.slice(start - len, start) === m && text.slice(start, start + len) === m && wrappedBy(text, start, start, m)) {
      return { from: start - len, to: start + len, insert: "", selStart: start - len, selEnd: start - len };
    }
    return { from: start, to: end, insert: m + m, selStart: start + len, selEnd: start + len };
  }
  // Leave spaces at the edges of the selection outside the markers ("** bold **" isn't bold in Markdown).
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  if (s === e) return { from: start, to: end, insert: text.slice(start, end), selStart: start, selEnd: end };
  const inner = text.slice(s, e);
  // Markers just outside the selection: take them off.
  if (wrappedBy(text, s, e, m)) {
    return { from: s - len, to: e + len, insert: inner, selStart: s - len, selEnd: e - len };
  }
  // Markers inside the selection (the user selected "**word**" itself): take them off.
  if (inner.length >= 2 * len && inner.startsWith(m) && inner.endsWith(m) && wrappedBy(inner, len, inner.length - len, m)) {
    const bare = inner.slice(len, inner.length - len);
    return { from: s, to: e, insert: bare, selStart: s, selEnd: s + bare.length };
  }
  return { from: s, to: e, insert: m + inner + m, selStart: s + len, selEnd: e + len };
}

/* --------------------------------------------------------------------------
   Block styles: paragraph, headings, quote, bulleted and numbered lists
   -------------------------------------------------------------------------- */

const HEADING_RE = /^(#{1,6})[ \t]+/;
const QUOTE_RE = /^>[ \t]?/;
const BULLET_RE = /^[ \t]*[-*+][ \t]+/;
const NUMBER_RE = /^[ \t]*\d+[.)][ \t]+/;

// What a single line is: "h1".."h6", "quote", "ul", "ol" or "p".
export function lineKind(line) {
  const h = HEADING_RE.exec(line);
  if (h) return "h" + h[1].length;
  if (QUOTE_RE.test(line)) return "quote";
  if (BULLET_RE.test(line)) return "ul";
  if (NUMBER_RE.test(line)) return "ol";
  return "p";
}

// The kind of the line the caret is on (for the toolbar's dropdown and button states).
export function blockAt(text, pos) {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  let lineEnd = text.indexOf("\n", pos);
  if (lineEnd === -1) lineEnd = text.length;
  return lineKind(text.slice(lineStart, lineEnd));
}

// The line's text without any heading / quote / list marker in front.
function stripPrefix(line) {
  return line.replace(HEADING_RE, "").replace(QUOTE_RE, "").replace(BULLET_RE, "").replace(NUMBER_RE, "");
}

// Turns every line touched by the selection into `kind` ("p", "h1"–"h3", "quote", "ul", "ol"). If they
// all already are that kind, they go back to plain paragraphs instead. Blank lines are left alone, and a
// numbered list is numbered 1, 2, 3… across the lines it covers.
export function setBlock(text, start, end, kind) {
  const from = text.lastIndexOf("\n", start - 1) + 1;
  // A selection ending right at the start of a line doesn't take that line along.
  const lastPos = end > start && text[end - 1] === "\n" ? end - 1 : end;
  let to = text.indexOf("\n", lastPos);
  if (to === -1) to = text.length;
  const lines = text.slice(from, to).split("\n");
  const content = lines.filter((l) => l.trim() !== "");
  const allAlready = content.length > 0 && content.every((l) => lineKind(l) === kind);
  const target = allAlready ? "p" : kind;
  let number = 0;
  const prefixFor = () => {
    if (target === "h1" || target === "h2" || target === "h3") return "#".repeat(Number(target[1])) + " ";
    if (target === "quote") return "> ";
    if (target === "ul") return "- ";
    if (target === "ol") return ++number + ". ";
    return "";
  };
  const out = lines.map((l) => (l.trim() === "" ? l : prefixFor() + stripPrefix(l)));
  const insert = out.join("\n");
  if (start === end) {
    // Keep the caret on the same character of the line's text.
    const oldLine = lines[0];
    const oldPrefix = oldLine.length - stripPrefix(oldLine).length;
    const newPrefix = out[0].length - stripPrefix(out[0]).length;
    const caret = from + Math.max(newPrefix, start - from - oldPrefix + newPrefix);
    return { from, to, insert, selStart: caret, selEnd: caret };
  }
  return { from, to, insert, selStart: from, selEnd: from + insert.length };
}

/* --------------------------------------------------------------------------
   Link and divider
   -------------------------------------------------------------------------- */

// Wraps the selection as [selection](url) and selects "url" ready to type over; with nothing selected,
// inserts [link text](url) and selects "link text".
export function insertLink(text, start, end) {
  const label = text.slice(start, end);
  if (label === "") {
    const insert = "[link text](url)";
    return { from: start, to: end, insert, selStart: start + 1, selEnd: start + 10 };
  }
  const insert = "[" + label + "](url)";
  const urlAt = start + label.length + 3;
  return { from: start, to: end, insert, selStart: urlAt, selEnd: urlAt + 3 };
}

// Puts `line` on its own line with a blank line either side (only adding the blank lines that are
// missing), replacing the selection, with the caret after it. Used for the divider (---) and for the
// \toc, \pagebreak and \space{N} markers.
export function insertBlockLine(text, start, end, line) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const prefix = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = after.length === 0 ? "" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const insert = prefix + line + suffix;
  const caret = start + insert.length;
  return { from: start, to: end, insert, selStart: caret, selEnd: caret };
}

// The \space{N} height the user typed, kept within 1–200 lines (default 5).
export function clampSpaceLines(value) {
  return Math.min(200, Math.max(1, parseInt(value, 10) || 5));
}

// Applies an edit to a string (what the textarea ends up holding) — for tests and fallbacks.
export function applyEdit(text, edit) {
  return text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
}
