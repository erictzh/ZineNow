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

// The kind of the line the caret is on (for the toolbar's dropdown and button states); "code" inside
// a fenced code block.
export function blockAt(text, pos) {
  if (codeBlockAt(text, pos)) return "code";
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
   Fenced code blocks: ```lang … ```
   -------------------------------------------------------------------------- */

const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;

// Every fenced block in the text: { open: [start, end), close: [start, end) or null when it runs to the
// end of the text unclosed, lang, fence }. Line ranges leave out the line's "\n".
function fencedBlocks(text) {
  const blocks = [];
  let open = null;
  let pos = 0;
  while (pos <= text.length) {
    let end = text.indexOf("\n", pos);
    if (end === -1) end = text.length;
    const line = text.slice(pos, end);
    if (!open) {
      const m = FENCE_OPEN_RE.exec(line);
      if (m) open = { open: [pos, end], close: null, lang: m[2], fence: m[1] };
    } else {
      const t = line.trim();
      if (t.length >= open.fence.length && t === open.fence[0].repeat(t.length) && /^ {0,3}\S/.test(line)) {
        open.close = [pos, end];
        blocks.push(open);
        open = null;
      }
    }
    if (end === text.length) break;
    pos = end + 1;
  }
  if (open) blocks.push(open);
  return blocks;
}

// The fenced block the position sits in (its fence lines count), or null.
export function codeBlockAt(text, pos) {
  return fencedBlocks(text).find((b) => pos >= b.open[0] && pos <= (b.close ? b.close[1] : text.length)) || null;
}

// A fence long enough not to be closed by any run of backticks inside `content`.
function fenceFor(content) {
  const longest = (String(content).match(/`+/g) || []).reduce((n, run) => Math.max(n, run.length), 0);
  return "`".repeat(Math.max(3, longest + 1));
}

// The toolbar's code block button with language `lang` ("" = plain). Inside a block already: the same
// language takes the fences off; another one changes the block's language. Elsewhere: the selected
// lines are wrapped in a block (and stay selected), or with nothing selected an empty block goes in on
// its own lines with the caret inside it.
export function toggleCodeBlock(text, start, end, lang) {
  const tag = lang || "";
  const block = codeBlockAt(text, start);
  if (block) {
    const [oStart, oEnd] = block.open;
    if (block.lang === tag) {
      const innerStart = Math.min(oEnd + 1, text.length);
      const innerEnd = block.close ? Math.max(innerStart, block.close[0] - 1) : text.length;
      const to = block.close ? block.close[1] : text.length;
      const insert = text.slice(innerStart, innerEnd);
      if (start === end) {
        const caret = oStart + Math.min(insert.length, Math.max(0, start - innerStart));
        return { from: oStart, to, insert, selStart: caret, selEnd: caret };
      }
      return { from: oStart, to, insert, selStart: oStart, selEnd: oStart + insert.length };
    }
    const openLine = text.slice(oStart, oEnd);
    const m = FENCE_OPEN_RE.exec(openLine);
    const insert = openLine.slice(0, m.index + m[0].length - m[2].length) + tag;
    const shift = (p) => (p > oEnd ? p + insert.length - openLine.length : Math.min(p, oStart + insert.length));
    return { from: oStart, to: oEnd, insert, selStart: shift(start), selEnd: shift(end) };
  }
  if (start === end) {
    const edit = insertBlockLine(text, start, end, "```" + tag + "\n\n```");
    const caret = edit.from + edit.insert.indexOf("```") + 3 + tag.length + 1;
    return { ...edit, selStart: caret, selEnd: caret };
  }
  const from = text.lastIndexOf("\n", start - 1) + 1;
  const lastPos = text[end - 1] === "\n" ? end - 1 : end;
  let to = text.indexOf("\n", lastPos);
  if (to === -1) to = text.length;
  const content = text.slice(from, to);
  const fence = fenceFor(content);
  const edit = insertBlockLine(text, from, to, fence + tag + "\n" + content + "\n" + fence);
  const selStart = edit.from + edit.insert.indexOf(fence) + fence.length + tag.length + 1;
  return { ...edit, selStart, selEnd: selStart + content.length };
}

// A whole file's text as a code block on its own lines at the caret (replacing any selection), with
// the caret after it. Line endings become "\n" and trailing blank lines are dropped.
export function insertCodeBlock(text, start, end, content, lang) {
  const body = String(content).replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  const fence = fenceFor(body);
  return insertBlockLine(text, start, end, fence + (lang || "") + "\n" + body + "\n" + fence);
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

/* --------------------------------------------------------------------------
   Images
   -------------------------------------------------------------------------- */

// The next free image reference name: image-1, image-2… (one more than the highest already used).
export function nextImageRef(text) {
  let n = 0;
  for (const m of text.matchAll(/^\[image-(\d+)\]:/gm)) n = Math.max(n, Number(m[1]));
  return "image-" + (n + 1);
}

// A picture from a file: `![alt][image-N]` on its own line at the caret (replacing any selection),
// and its (long) data URL as a reference at the very end, `[image-N]: data:…`, so the text being
// edited stays readable while the .md file still carries the picture. One edit (one undo step),
// caret after the image line. Brackets in `alt` are dropped (they would end the alt text).
export function insertImageFile(text, start, end, alt, url) {
  const ref = nextImageRef(text);
  const cleanAlt = String(alt || "image").replace(/[\[\]\n]/g, " ").trim() || "image";
  const line = insertBlockLine(text, start, end, "![" + cleanAlt + "][" + ref + "]");
  const withLine = applyEdit(text, line);
  const tail = withLine.replace(/\s+$/, "");
  const full = tail + "\n\n[" + ref + "]: " + url + "\n";
  return { from: start, to: text.length, insert: full.slice(start), selStart: line.selStart, selEnd: line.selEnd };
}

// A picture linked by its web address, `![alt](url)` on its own line at the caret (a dropped picture
// from a site that doesn't allow copying it). Brackets in `alt` are dropped; spaces and brackets
// in the address are %-encoded so they can't end the link early.
export function insertImageLink(text, start, end, alt, url) {
  const cleanAlt = String(alt || "image").replace(/[\[\]\n]/g, " ").replace(/\s+/g, " ").trim() || "image";
  const safeUrl = String(url).trim().replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
  return insertBlockLine(text, start, end, "![" + cleanAlt + "](" + safeUrl + ")");
}

// A picture from the web: `![alt text](https://)` on its own line with "https://" selected, ready
// to paste the address over.
export function insertImageUrl(text, start, end) {
  const line = "![" + (text.slice(start, end).replace(/[\[\]\n]/g, " ").trim() || "image") + "](https://)";
  const edit = insertBlockLine(text, start, end, line);
  const urlAt = edit.from + edit.insert.indexOf("](https://)") + 2;
  return { ...edit, selStart: urlAt, selEnd: urlAt + "https://".length };
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
