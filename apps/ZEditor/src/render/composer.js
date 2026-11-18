// The paragraph composer: breaks text into lines the way a page-layout program does, and places the words on each line.
//
// It's pure (no canvas, no DOM): it's handed a `measure(string)` function, so
// the editor, Export and the tests all compose identically. Positions are in
// whatever unit `measure` returns.
//
// Two composers, as in InDesign:
//  - "single": greedy, one line at a time. Fast and predictable.
//  - "paragraph": the Knuth–Plass algorithm. It chooses all of a paragraph's
//    line breaks together so no line is much looser or tighter than the rest
//    (and, for ragged text, so the right edge is even). It can use hyphens.
// Both lay out the same tokens (boxes = word pieces, glue = spaces, penalties =
// places a break is allowed), so justification, indents and caret mapping work
// the same for either.

// Characters a browser may break a line between (each one on its own, no
// spaces needed): Chinese, Japanese kana, Korean, and full-width forms.
const WRAP_CJK_RE = /[⺀-〿぀-ヿ㄀-ㄯ㐀-䶿一-鿿가-힯豈-﫿︰-﹏＀-￯\u{20000}-\u{3FFFF}]/u;
// Closing punctuation never starts a line, so it sticks to the character before it.
const WRAP_NO_LINE_START = "，。、．：；！？）］｝】〕〉》」』”’…ー";

// Splits one space-free word into pieces a line may break between: each
// CJK character alone, any other run of characters kept whole.
export function wrapAtoms(word) {
  const atoms = [];
  let run = "";
  for (const ch of Array.from(word)) {
    if (WRAP_CJK_RE.test(ch)) {
      if (run) { atoms.push(run); run = ""; }
      if (atoms.length && WRAP_NO_LINE_START.includes(ch)) atoms[atoms.length - 1] += ch;
      else atoms.push(ch);
    } else {
      run += ch;
    }
  }
  if (run) atoms.push(run);
  return atoms;
}

// How elastic a space is when a line is justified. InDesign's defaults are
// word spacing 80% / 100% / 133%: a space may shrink to 80% or grow to 133%
// before the line counts as badly set.
const SPACE_STRETCH = 0.33;
const SPACE_SHRINK = 0.2;
// Cost parameters of the paragraph composer (TeX's names and defaults).
const LINE_PENALTY = 10;
const HYPHEN_PENALTY = 50;
const FLAGGED_DEMERITS = 3000;   // two hyphenated lines in a row
const FITNESS_DEMERITS = 3000;   // a tight line next to a loose one
const BREAK_ANYWHERE_PENALTY = 300; // cutting a word that's wider than a whole line
const INFINITY = 1e9;
// A ragged line may fall short by up to this fraction of the width before it's
// counted as bad as a fully stretched justified line.
const RAGGED_STRETCH = 0.5;

// ---- Tokens -----------------------------------------------------------------

// One paragraph's text (source indices start at `offset` in the whole text) as
// boxes, glue and penalties.
function tokenize(para, offset, measure, spaceWidth, hyphenWidth, opts, maxLineWidth) {
  const items = [];
  const push = (item) => items.push(item);
  const widthOf = (s) => measure(s);
  // A word piece: cut into single characters (with a costly break between
  // each) when it alone is wider than any line could be.
  const pushBox = (text, start) => {
    const width = widthOf(text);
    if (width <= maxLineWidth || Array.from(text).length < 2) {
      push({ type: "box", width, start, end: start + text.length });
      return;
    }
    let at = start;
    const chars = Array.from(text);
    chars.forEach((ch, k) => {
      push({ type: "box", width: widthOf(ch), start: at, end: at + ch.length });
      at += ch.length;
      if (k < chars.length - 1) push({ type: "penalty", width: 0, penalty: BREAK_ANYWHERE_PENALTY, flagged: false });
    });
  };
  let i = 0;
  while (i < para.length) {
    if (para[i] === " ") {
      push({ type: "glue", width: spaceWidth, stretch: spaceWidth * SPACE_STRETCH, shrink: spaceWidth * SPACE_SHRINK, start: offset + i, end: offset + i + 1 });
      i += 1;
      continue;
    }
    let j = i;
    while (j < para.length && para[j] !== " ") j++;
    const word = para.slice(i, j);
    const atoms = wrapAtoms(word);
    let at = offset + i;
    atoms.forEach((atom, k) => {
      if (k > 0) push({ type: "penalty", width: 0, penalty: 0, flagged: false }); // between CJK characters
      // Hyphenate the letters of a word; punctuation around it ("(typography,") stays attached to its end.
      let fragments = null;
      if (opts.hyphenate) {
        const lead = atom.match(/^[^\p{L}]*/u)[0], trail = atom.match(/[^\p{L}]*$/u)[0];
        const core = atom.slice(lead.length, atom.length - trail.length);
        const pieces = core && /^\p{L}+$/u.test(core) ? opts.hyphenate(core) : null;
        if (pieces && pieces.length > 1) {
          fragments = pieces.slice();
          fragments[0] = lead + fragments[0];
          fragments[fragments.length - 1] += trail;
        }
      }
      if (fragments && fragments.length > 1) {
        let fragAt = at;
        fragments.forEach((frag, f) => {
          pushBox(frag, fragAt);
          fragAt += frag.length;
          if (f < fragments.length - 1) push({ type: "penalty", width: hyphenWidth, penalty: HYPHEN_PENALTY, flagged: true });
        });
      } else {
        pushBox(atom, at);
      }
      at += atom.length;
    });
    i = j;
  }
  return items;
}

// ---- Breaking ---------------------------------------------------------------

// The break opportunities: a space after a word piece, or any penalty that isn't a "never".
function isBreak(items, i) {
  const it = items[i];
  if (it.type === "glue") return i > 0 && items[i - 1].type === "box";
  return it.type === "penalty" && it.penalty < INFINITY;
}

// The index of the first item that belongs to the line after a break at `index`:
// the glue and penalties right after a break are dropped.
function lineStartAfter(items, index) {
  let k = index + 1;
  while (k < items.length && items[k].type !== "box") k++;
  return k;
}

// Greedy breaking: fill each line as full as it'll go. Returns the break item indices.
function greedyBreaks(items, lineWidth) {
  const EPS = 1e-6;
  const breaks = [];
  let line = 0;
  let width = 0;       // natural width of the current line so far
  let lastFit = -1;    // the last break opportunity that still fits on the current line
  let i = 0;
  // Ends the current line at item `at` and starts the next after it.
  const breakAt = (at) => {
    breaks.push(at);
    line++;
    width = 0;
    lastFit = -1;
    i = lineStartAfter(items, at);
  };
  while (i < items.length) {
    const it = items[i];
    const forced = it.type === "penalty" && it.penalty === -INFINITY;
    if (forced || isBreak(items, i)) {
      const total = width + (it.type === "penalty" ? it.width : 0);
      const fits = total <= lineWidth(line) + EPS;
      if (fits && !forced) lastFit = i;
      else if (!fits && lastFit >= 0) { breakAt(lastFit); continue; }
      else if (!fits && !forced) { breakAt(i); continue; } // one piece wider than the line: it overflows alone
      if (forced) break;
    }
    if (it.type !== "penalty") width += it.width;
    i++;
  }
  return breaks;
}

// Knuth–Plass. Returns the break item indices, or null if no acceptable set exists.
function optimalBreaks(items, lineWidth, justify, hasHyphens) {
  const n = items.length;
  // Totals of everything before each item (penalties take no space of their own).
  const W = new Array(n + 1).fill(0), Y = new Array(n + 1).fill(0), Z = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    const it = items[i];
    W[i + 1] = W[i] + (it.type === "penalty" ? 0 : it.width);
    Y[i + 1] = Y[i] + (it.type === "glue" ? it.stretch : 0);
    Z[i + 1] = Z[i] + (it.type === "glue" ? it.shrink : 0);
  }
  for (const tolerance of [2, 5, 30]) {
    let active = [{ index: -1, line: 0, fit: 1, demerits: 0, prev: null, W: 0, Y: 0, Z: 0 }];
    let final = null;
    for (let i = 0; i < n && active.length; i++) {
      if (!isBreak(items, i)) continue;
      const it = items[i];
      const forced = it.type === "penalty" && it.penalty === -INFINITY;
      const best = new Map();
      const alive = [];
      for (const a of active) {
        const L = lineWidth(a.line);
        const w = W[i] - a.W + (it.type === "penalty" ? it.width : 0);
        const y = Y[i] - a.Y, z = Z[i] - a.Z;
        const isLast = forced;
        let ratio;
        if (w < L) {
          const stretch = isLast ? INFINITY : justify ? y : y + L * RAGGED_STRETCH;
          ratio = stretch > 0 ? (L - w) / stretch : Infinity;
        } else if (w > L) {
          ratio = z > 0 ? (L - w) / z : -Infinity;
        } else {
          ratio = 0;
        }
        if (ratio >= -1 && !forced) alive.push(a);
        if (ratio < -1 || ratio > tolerance) continue;
        const absRatio = Math.abs(ratio);
        const badness = 100 * absRatio * absRatio * absRatio;
        let demerits;
        if (it.type === "penalty" && it.penalty >= 0) { const d = LINE_PENALTY + badness + it.penalty; demerits = d * d; }
        else if (it.type === "penalty" && it.penalty > -INFINITY) { const d = LINE_PENALTY + badness; demerits = d * d - it.penalty * it.penalty; }
        else { const d = LINE_PENALTY + badness; demerits = d * d; }
        if (hasHyphens && it.type === "penalty" && it.flagged && a.index >= 0 && items[a.index].type === "penalty" && items[a.index].flagged) demerits += FLAGGED_DEMERITS;
        const fit = ratio < -0.5 ? 0 : ratio <= 0.5 ? 1 : ratio <= 1 ? 2 : 3;
        if (Math.abs(fit - a.fit) > 1) demerits += FITNESS_DEMERITS;
        const total = demerits + a.demerits;
        const key = (a.line + 1) * 4 + fit;
        const cur = best.get(key);
        if (!cur || total < cur.demerits) {
          best.set(key, { index: i, line: a.line + 1, fit, demerits: total, prev: a, W: 0, Y: 0, Z: 0 });
        }
      }
      if (forced) {
        let min = null;
        for (const node of best.values()) if (!min || node.demerits < min.demerits) min = node;
        final = min;
        break;
      }
      // Each new node's line starts after its break, dropping the glue that follows.
      for (const node of best.values()) {
        const s = lineStartAfter(items, i);
        node.W = W[s]; node.Y = Y[s]; node.Z = Z[s];
        alive.push(node);
      }
      active = alive;
    }
    if (final) {
      const breaks = [];
      for (let node = final; node && node.index >= 0; node = node.prev) breaks.push(node.index);
      return breaks.reverse();
    }
  }
  return null;
}

// ---- Public -----------------------------------------------------------------

// Composes `text` into lines. `opts`:
//   width        total line width available (before indents)
//   align        "left" | "center" | "right" | "justify"
//   lastLine     for justify, how a paragraph's last line sits: "left" | "center" | "right" | "all"
//   indentFirst, indentLeft, indentRight   in the same unit as width
//   composer     "single" | "paragraph"
//   hyphenate    (word) => ["hy", "phen", ...] or null/undefined to turn hyphenation off
//   hyphenWidth  width of a hyphen (defaults to measure("-"))
//   continued    the text starts in the middle of a paragraph (a threaded frame's
//                continuation): its first line gets no first-line indent and isn't `first`
//   slotFor      (paraIndex, lineIndex) => { x, width }: where line `lineIndex` of paragraph
//                `paraIndex` may go (text wrap); x is added to the line's left edge and width
//                replaces `width` for that line. Lines are numbered within their paragraph.
//   onParagraph  (paraIndex, lineCount) => void, called after each paragraph is composed
//                (so `slotFor` knows where the next paragraph starts)
// Returns [{ start, end, visibleEnd, para, first, last, x, width, natural, pieces, hyphenated }] where
// x is the line's left edge and pieces = [{ text, x, width, start, end }] are the words,
// x relative to the line's left edge of the text area.
export function composeText(text, measure, opts) {
  const spaceWidth = measure(" ");
  const hyphenWidth = opts.hyphenWidth != null ? opts.hyphenWidth : measure("-");
  const indentLeft = opts.indentLeft || 0, indentRight = opts.indentRight || 0, indentFirst = opts.indentFirst || 0;
  const justify = opts.align === "justify";
  const lastLine = opts.lastLine || "left";
  const paragraphs = text.split("\n");
  const lines = [];
  let offset = 0;
  paragraphs.forEach((para, paraIndex) => {
    const opensPara = !(opts.continued && paraIndex === 0); // a continued paragraph's first line is not its first
    const startsAt = (first) => indentLeft + (first ? indentFirst : 0);
    const slot = opts.slotFor ? (lineIndex) => opts.slotFor(paraIndex, lineIndex) : null;
    const availAt = (lineIndex) => Math.max(1, (slot ? slot(lineIndex).width : opts.width) - startsAt(opensPara && lineIndex === 0) - indentRight);
    const maxLineWidth = Math.max(1, opts.width - Math.min(startsAt(true), startsAt(false)) - indentRight);
    let items = tokenize(para, offset, measure, spaceWidth, hyphenWidth, opts, maxLineWidth);
    const fillLast = !(justify && lastLine === "all");
    if (items.length) {
      // The paragraph's last line may be any length (unless justify-all asks it to fill).
      if (fillLast) items.push({ type: "glue", width: 0, stretch: INFINITY, shrink: 0, start: offset + para.length, end: offset + para.length });
      items.push({ type: "penalty", width: 0, penalty: -INFINITY, flagged: false });
    }
    let breaks = [];
    if (items.length) {
      const wantOptimal = opts.composer === "paragraph";
      breaks = (wantOptimal && optimalBreaks(items, availAt, justify, Boolean(opts.hyphenate))) || greedyBreaks(items, availAt);
      if (!breaks.length || breaks[breaks.length - 1] !== items.length - 1) breaks.push(items.length - 1);
    }

    if (!items.length) {
      lines.push({ start: offset, end: offset + para.length, visibleEnd: offset, para: paraIndex, first: opensPara, last: true, x: startsAt(opensPara) + (slot ? slot(0).x : 0), width: 0, natural: 0, pieces: [], hyphenated: false });
    }
    let from = 0;
    breaks.forEach((b, lineIndex) => {
      const isLast = b === items.length - 1;
      const lineItems = [];
      for (let k = from; k < b; k++) lineItems.push(items[k]);
      // Drop the closing parfill glue and trailing spaces from the measured line.
      while (lineItems.length && lineItems[lineItems.length - 1].type !== "box") lineItems.pop();
      const hyphenated = !isLast && items[b].type === "penalty" && items[b].flagged;
      const pieces = [];
      let natural = 0;
      let glueCount = 0;
      let afterGlue = true; // the last real item was a space (or this is the line's start)
      for (const it of lineItems) {
        if (it.type === "penalty") continue;
        if (it.type === "glue") { natural += it.width; glueCount++; afterGlue = true; continue; }
        natural += it.width;
        // Boxes with no space between them are pieces of one word (a hyphenation
        // fragment, a CJK character): they're drawn as one piece.
        const prev = pieces[pieces.length - 1];
        if (prev && !afterGlue && prev.end === it.start) { prev.end = it.end; prev.width += it.width; }
        else pieces.push({ start: it.start, end: it.end, width: it.width, gapBefore: glueCount });
        afterGlue = false;
      }
      if (hyphenated) natural += hyphenWidth;
      const first = lineIndex === 0 && opensPara;
      const avail = availAt(lineIndex);
      let align = opts.align === "justify" ? "left" : opts.align || "left";
      let stretch = 0;
      if (justify) {
        if (!isLast || lastLine === "all") { if (glueCount) stretch = (avail - natural) / glueCount; }
        else align = lastLine;
      }
      // Position the pieces: words at their natural spacing plus this line's justification share.
      const lineWidth = justify && stretch !== 0 ? avail : natural;
      let x = 0;
      let gluesSeen = 0;
      const placed = pieces.map((p) => {
        // Spaces before this piece (consecutive spaces each take a share).
        const spaces = p.gapBefore - gluesSeen;
        x += spaces * (spaceWidth + stretch);
        gluesSeen = p.gapBefore;
        const text0 = text.slice(p.start, p.end);
        const out = { text: text0, x, width: p.width, start: p.start, end: p.end };
        x += p.width;
        return out;
      });
      if (hyphenated && placed.length) placed[placed.length - 1].text += "-", placed[placed.length - 1].width += hyphenWidth, placed[placed.length - 1].hyphen = true;
      const left = startsAt(first) + (slot ? slot(lineIndex).x : 0);
      let lineX = left;
      if (align === "center") lineX = left + (avail - lineWidth) / 2;
      else if (align === "right") lineX = left + avail - lineWidth;
      // Lines' source range: from the first word to where the next line starts (the break space is consumed).
      const nextStart = isLast ? offset + para.length : (() => { const s = lineStartAfter(items, b); return s < items.length ? items[s].start : offset + para.length; })();
      const lineStart = lineIndex === 0 ? offset : (lines.length ? lines[lines.length - 1].end : offset);
      lines.push({
        start: lineStart,
        end: nextStart,
        visibleEnd: placed.length ? placed[placed.length - 1].end : lineStart,
        para: paraIndex, first, last: isLast,
        x: lineX, width: lineWidth, natural, pieces: placed, hyphenated,
      });
      from = lineStartAfter(items, b);
    });
    if (opts.onParagraph) opts.onParagraph(paraIndex, Math.max(1, breaks.length));
    offset += para.length + 1;
  });
  return lines;
}
