// Text layout: line wrapping (incl. CJK rules), shrink-to-fit, measuring a text box.

import { AUTO_TEXT_MAX_WIDTH, TEXT_BORDER_PX } from "../model/text/textControls.js";
import { caseText, stackText, textLook, usesTypeset } from "../model/text/textLook.js";
import { MIN_SLOT_EMS, freeSlot } from "../model/text/textWrap.js";
import { composeText, wrapAtoms } from "./composer.js";
import { currentHyphenator } from "./hyphenation.js";

// Composes typeset text line by line into columns of height H (Infinity = one growing column),
// with each line set in the widest stretch the wrap obstacles leave free. A line that has no
// stretch at least `minSlot` wide moves down in quarter-line steps until it fits. Returns the
// composer's lines with `col`, `top`, `x` (column offset included) and `hidden` set, plus
// `overflow`, `bottom` (lowest line bottom) and `textHeight`.
export function flowAroundObstacles(text, measure, composeOpts, { columns, columnWidth, columnGap, lineHeight, paraGap, padX, padY, wrap, scale, minSlot, H }) {
  const stride = columnWidth + columnGap;
  const step = Math.max(1, lineHeight / 4);
  const pos = [];                                // pos[para][k]: where line k of a paragraph goes
  let after = { col: 0, y: 0, started: false };  // where the next paragraph starts
  const place = (p, k) => {
    const arr = pos[p] || (pos[p] = []);
    while (arr.length <= k) {
      let col, top;
      if (arr.length === 0) { col = after.col; top = after.y + (after.started && after.y > 0 ? paraGap : 0); }
      else { const prev = arr[arr.length - 1]; col = prev.col; top = prev.top + lineHeight; }
      let slot = null;
      for (let guard = 0; guard < 4000; guard++) {
        if (col >= columns) { top = H; break; }
        if (top > 0 && top + lineHeight > H + 0.01) { col++; top = 0; continue; }
        const left = padX + col * stride;
        slot = freeSlot(wrap, left, left + columnWidth, padY + top, padY + top + lineHeight, minSlot, scale);
        if (slot) break;
        top += step;
      }
      if (!slot) slot = { x: 0, width: columnWidth };
      arr.push({ col, top, x: slot.x, width: slot.width });
    }
    return arr[k];
  };
  const lines = composeText(text, measure, {
    ...composeOpts,
    slotFor: place,
    onParagraph: (p, n) => { const last = place(p, n - 1); after = { col: last.col, y: last.top + lineHeight, started: true }; },
  });
  const seen = [];
  let overflow = false, bottom = 0;
  for (const l of lines) {
    const k = seen[l.para] = (seen[l.para] == null ? 0 : seen[l.para] + 1);
    const at = pos[l.para][k];
    l.col = at.col;
    l.top = at.top;
    if (at.col >= columns) { l.hidden = true; overflow = true; l.x += (columns - 1) * stride; continue; }
    l.x += at.col * stride;
    bottom = Math.max(bottom, at.top + lineHeight);
  }
  const textHeight = Number.isFinite(H) ? H : Math.max(lineHeight, bottom);
  return { lines, overflow, bottom, textHeight };
}

// `ann` with its font size reduced just enough to fit its Fit Height.
function fitText(ann) {
  if (!ann.fitHeight || !ann.text) return ann;
  const base = { ...ann, fitHeight: undefined };
  if (measureTextBox(base).height <= ann.fitHeight) return base;
  let lo = 4, hi = ann.fontSize || 16;
  for (let i = 0; i < 12 && hi - lo > 0.25; i++) {
    const mid = (lo + hi) / 2;
    if (measureTextBox({ ...base, fontSize: mid }).height <= ann.fitHeight) lo = mid; else hi = mid;
  }
  return { ...base, fontSize: Math.floor(lo * 4) / 4 };
}

// Word-based wrapping (canvas has no auto-wrap) — also respects
// explicit newlines, matching the editor's `white-space: pre-wrap`, and
// its `word-break: break-word`: CJK text breaks between characters, and
// a single word wider than the box is cut to fit rather than running on
// in one endless line.
function wrapTextLines(ctx, text, maxWidth, measure = (s) => ctx.measureText(s).width) {
  const lines = [];
  // Cuts a too-wide piece into lines that fit; the last chunk becomes the line in progress.
  const cutToFit = (piece) => {
    let chunk = "";
    for (const ch of Array.from(piece)) {
      if (chunk && measure(chunk + ch) > maxWidth) { lines.push(chunk); chunk = ch; }
      else chunk += ch;
    }
    return chunk;
  };
  for (const para of (text || "").split("\n")) {
    if (para === "") { lines.push(""); continue; }
    let current = "";
    para.split(" ").forEach((word, wordIndex) => {
      const atoms = word === "" ? [""] : wrapAtoms(word);
      atoms.forEach((atom, atomIndex) => {
        // A space goes before a word's first piece only (not the paragraph's first word).
        const joiner = atomIndex === 0 && wordIndex > 0 ? " " : "";
        const test = current + joiner + atom;
        if (current && measure(test) > maxWidth) {
          lines.push(current);
          current = measure(atom) > maxWidth ? cutToFit(atom) : atom;
        } else if (!current && measure(test) > maxWidth) {
          current = cutToFit(test);
        } else {
          current = test;
        }
      });
    });
    lines.push(current);
  }
  return lines;
}

// Where a text box's lines fall, in canvas px at `scaleFactor`: sets the
// font on `ctx` (callers draw with it afterwards) and returns the box's
// size, padding, wrapped lines and baseline. Shared by Export and by the
// measuring that Rasterize needs.
export function layoutText(ctx, ann, scaleFactor) {
  ann = fitText(ann);
  const look = textLook(ann);
  const cased = caseText(ann.text || "", look.textCase);
  const shownText = look.stacked ? stackText(cased) : cased;
  const fontSize = (ann.fontSize || 16) * scaleFactor;
  const weight = ann.bold ? "700" : "400";
  const styleStr = ann.italic ? "italic" : "normal";
  const family = ann.fontFamily || "sans-serif";
  // Small caps has to be part of the font string: setting `font` resets the variant.
  const variant = look.textCase === "small" ? "small-caps " : "";
  ctx.font = `${styleStr} ${variant}${weight} ${fontSize}px '${family}', sans-serif`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${look.letterSpacingPx * scaleFactor}px`;
  if ("fontKerning" in ctx) ctx.fontKerning = look.kerning;
  ctx.textBaseline = "alphabetic";

  // CSS centres a line's font box in its line-height, so the baseline sits
  // (line height - font box) / 2 plus the font's ascent below the line top.
  // The browser rounds a font's ascent and descent to whole editor px
  // when laying out, so they're measured at editor size, rounded, then scaled.
  ctx.font = `${styleStr} ${variant}${weight} ${ann.fontSize || 16}px '${family}', sans-serif`;
  const metrics = ctx.measureText("Hg");
  ctx.font = `${styleStr} ${variant}${weight} ${fontSize}px '${family}', sans-serif`;
  const ascent = (metrics.fontBoundingBoxAscent != null ? Math.round(metrics.fontBoundingBoxAscent) : (ann.fontSize || 16) * 0.8) * scaleFactor;
  const descent = (metrics.fontBoundingBoxDescent != null ? Math.round(metrics.fontBoundingBoxDescent) : (ann.fontSize || 16) * 0.2) * scaleFactor;
  const lineHeight = fontSize * look.lineHeight;
  // Blink also floors the half-leading (in editor px) before placing the baseline.
  const halfLeading = Math.floor(((ann.fontSize || 16) * look.lineHeight - (ascent + descent) / scaleFactor) / 2);
  const baselineOffset = halfLeading * scaleFactor + ascent;

  const x = ann.x * scaleFactor;
  const y = ann.y * scaleFactor;
  const padX = (look.padX + TEXT_BORDER_PX) * scaleFactor, padY = (look.padY + TEXT_BORDER_PX) * scaleFactor;
  const maxWidthCap = AUTO_TEXT_MAX_WIDTH * scaleFactor;

  // Letters placed one by one (ransom) lose kerning, so their widths are
  // the sum of each letter's own advance.
  const baseMeasure = (look.ransom || look.curve)
    ? (s) => Array.from(s).reduce((width, ch) => width + ctx.measureText(ch).width, 0)
    : (s) => ctx.measureText(s).width;
  // Custom text spans with their own font, bold or italic (model/text/colorRuns.js): `fontAt(i)`
  // is the canvas font of the letter at text index i (null where the box's own font applies),
  // and `measure(s, at)` measures s starting at index `at` piece by piece in those fonts. Without
  // `at`, or with no such spans, it measures in the box's font. Only the composer's layout uses spans.
  const baseFont = ctx.font;
  const fontRuns = usesTypeset(ann) ? (ann.colorRuns || []).filter((r) => r.fontFamily != null || r.bold != null || r.italic != null || r.fontSize != null) : [];
  const sizeRuns = fontRuns.filter((r) => r.fontSize != null);
  const spanFont = (run) => {
    const it = run.italic != null ? run.italic : ann.italic;
    const b = run.bold != null ? run.bold : ann.bold;
    const size = run.fontSize != null ? run.fontSize * scaleFactor : fontSize;
    return `${it ? "italic" : "normal"} ${variant}${b ? "700" : "400"} ${size}px '${run.fontFamily || family}', sans-serif`;
  };
  const runAtIndex = (index) => fontRuns.find((r) => index >= r.start && index < r.end);
  const fontAt = (index) => { const run = runAtIndex(index); return run ? spanFont(run) : null; };
  const measure = fontRuns.length
    ? (s, at) => {
      if (at == null || !s) return baseMeasure(s);
      let width = 0, pos = 0;
      while (pos < s.length) {
        const index = at + pos;
        const run = runAtIndex(index);
        // The piece runs to the next span boundary (or the end of s).
        let stop = s.length;
        for (const r of fontRuns) {
          if (r.start > index) stop = Math.min(stop, r.start - at);
          if (run === r) stop = Math.min(stop, r.end - at);
        }
        const piece = s.slice(pos, stop);
        if (run) { ctx.font = spanFont(run); width += ctx.measureText(piece).width; ctx.font = baseFont; }
        else width += baseMeasure(piece);
        pos = stop;
      }
      return width;
    }
    : baseMeasure;

  const typeset = usesTypeset(ann);
  const para = look.paragraph;
  const px = (v) => v * scaleFactor; // editor px -> canvas px
  let boxWidth;
  if (ann.width) {
    boxWidth = ann.width * scaleFactor;
  } else if (typeset && para.columns > 1) {
    boxWidth = maxWidthCap; // columns need a width to divide
  } else {
    const indents = typeset ? px(para.indentLeft + Math.max(0, para.indentFirst) + para.indentRight) : 0;
    let at = 0;
    const naturalWidth = Math.max(10, ...shownText.split("\n").map((s) => { const w = measure(s, at) + indents; at += s.length + 1; return w; }));
    boxWidth = Math.min(naturalWidth + padX * 2, maxWidthCap);
  }
  const innerWidth = Math.max(4, boxWidth - padX * 2);
  // Columns split the width; the composer sets text one column wide.
  const columns = typeset ? para.columns : 1;
  const columnGap = px(para.columnGap);
  const columnWidth = Math.max(4, (innerWidth - columnGap * (columns - 1)) / columns);
  // Typeset boxes are broken into lines by the composer (justification, indents,
  // hyphenation, the paragraph composer); everything else by the plain wrapper.
  let typesetLines = null;
  let lines;
  const lineStarts = [];
  let cursor = 0;
  const composeOpts = {
    width: columnWidth, align: ann.align || "left",
    alignAt: (ann.colorRuns || []).some((r) => r.align) ? (offset) => { const r = (ann.colorRuns || []).find((x) => x.align && offset >= x.start && offset < x.end); return r ? r.align : null; } : undefined,
    lastLine: para.lastLine, composer: para.composer,
    indentFirst: px(para.indentFirst), indentLeft: px(para.indentLeft), indentRight: px(para.indentRight),
    hyphenate: para.hyphenate ? currentHyphenator() || undefined : undefined,
    continued: Boolean(ann.storyContinues), // a threaded frame that starts mid-paragraph
  };
  // Text wrap: images and shapes the frame overlaps (render/pageText.js finds them) shape every line.
  const wrap = typeset && ann.wrapObstacles && ann.wrapObstacles.length ? ann.wrapObstacles : null;
  const lineHeightPx = fontSize * look.lineHeight;
  const frameInnerPx = typeset && para.frameHeight > 0 ? Math.max(lineHeightPx, px(para.frameHeight) - padY * 2) : 0;
  let flowed = null;
  if (wrap) {
    const flowArgs = { columns, columnWidth, columnGap, lineHeight: lineHeightPx, paraGap: px(para.spaceBefore + para.spaceAfter), padX, padY, wrap, scale: scaleFactor, minSlot: fontSize * MIN_SLOT_EMS };
    if (frameInnerPx || columns === 1) {
      flowed = flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, H: frameInnerPx || Infinity });
    } else {
      // Balanced columns: the shortest column height that still fits all the text.
      const single = flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, columns: 1, H: Infinity });
      let lo = lineHeightPx, hi = Math.max(lineHeightPx, single.bottom);
      for (let k = 0; k < 12 && hi - lo > 0.5; k++) {
        const mid = (lo + hi) / 2;
        if (flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, H: mid }).overflow) lo = mid; else hi = mid;
      }
      flowed = flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, H: hi });
      flowed.textHeight = hi;
    }
    typesetLines = flowed.lines;
  } else if (typeset) {
    typesetLines = composeText(shownText, measure, composeOpts);
  }
  if (typeset) {
    lines = typesetLines.map((l) => shownText.slice(l.start, l.visibleEnd));
    typesetLines.forEach((l) => lineStarts.push(l.start));
  } else {
    lines = wrapTextLines(ctx, shownText, innerWidth, measure);
  }
  // Where each wrapped line begins in the text (a wrap or newline swallows
  // one character), so per-letter colours can be matched to lines.
  if (typeset) {
    // already known from the composer
  } else if (look.stacked) {
    // One line per typed character, so line k starts where character k does.
    for (const ch of Array.from(ann.text || "")) { lineStarts.push(cursor); cursor += ch.length; }
  } else {
    for (const line of lines) {
      lineStarts.push(cursor);
      cursor += line.length;
      const next = shownText[cursor];
      if (next === "\n" || next === " ") cursor += 1;
    }
  }
  // Typeset lines carry their own top (paragraphs are separated by their space before/after).
  let textHeight = lines.length * lineHeight;
  let overflow = false;
  if (flowed) {
    textHeight = flowed.textHeight;
    overflow = flowed.overflow;
  } else if (typesetLines) {
    const paraGap = px(para.spaceBefore + para.spaceAfter);
    // Where each line would sit in one long column (a paragraph's space before/after goes between paragraphs).
    const gapBefore = typesetLines.map((l, i) => (i > 0 && l.first ? paraGap : 0));
    // A line holding a custom span bigger than the box's own size grows to fit it: `l.height` is the
    // line's own height and `l.baseShift` moves its baseline down to match.
    const lh = typesetLines.map((l) => {
      let factor = 1;
      for (const r of sizeRuns) if (r.end > l.start && r.start < Math.max(l.visibleEnd, l.start + 1)) factor = Math.max(factor, r.fontSize / (ann.fontSize || 16));
      l.height = lineHeight * factor;
      l.baseShift = baselineOffset * (factor - 1);
      return l.height;
    });
    const seqTop = [];
    let y = 0;
    typesetLines.forEach((l, i) => { if (i > 0) y += lh[i - 1] + gapBefore[i]; seqTop.push(y); });
    const frameInner = para.frameHeight > 0 ? Math.max(lineHeight, px(para.frameHeight) - padY * 2) : 0;
    if (columns === 1 && !frameInner) {
      typesetLines.forEach((l, i) => { l.top = seqTop[i]; });
      textHeight = (typesetLines.length ? y + lh[lh.length - 1] : lineHeight);
    } else {
      // Cut the long column into columns of height H: a line starts a new column when it no longer fits
      // (no paragraph space is kept at the top of a column). Returns each line's column and the column starts.
      const place = (H) => {
        const colOf = [];
        const starts = [0];
        typesetLines.forEach((l, i) => {
          const colStart = starts[starts.length - 1];
          if (i > 0 && seqTop[i] + lh[i] - colStart > H + 0.01) starts.push(seqTop[i] - gapBefore[i]);
          colOf.push(starts.length - 1);
        });
        return { colOf, starts };
      };
      let H = frameInner;
      if (!H) {
        // Balanced: the shortest column height that still fits every line in the columns available.
        let lo = lineHeight, hi = Math.max(lineHeight, y + (lh.length ? lh[lh.length - 1] : lineHeight));
        for (let k = 0; k < 24 && hi - lo > 0.5; k++) {
          const mid = (lo + hi) / 2;
          if (place(mid).starts.length <= columns) hi = mid; else lo = mid;
        }
        H = hi;
      }
      const { colOf, starts } = place(H);
      let tallest = 0;
      typesetLines.forEach((l, i) => {
        const c = colOf[i];
        l.col = c;
        if (c >= columns) { l.hidden = true; overflow = true; l.top = H; l.x += (columns - 1) * (columnWidth + columnGap); return; }
        l.top = seqTop[i] - starts[c];
        l.x += c * (columnWidth + columnGap);
        tallest = Math.max(tallest, l.top + lh[i]);
      });
      textHeight = frameInner ? frameInner : Math.max(lineHeight, tallest);
    }
  }
  if (typesetLines) {
    // In a thread, the lines after this frame's share of the story belong to the next frame.
    if (ann.storyLength != null) {
      typesetLines.forEach((l) => { if (!l.hidden && l.start >= ann.storyLength) { l.hidden = true; overflow = true; } });
    }
    // Vertical alignment of a fixed-height frame: each column's lines move down together.
    const vAlign = ann.verticalAlign === "center" ? 0.5 : ann.verticalAlign === "bottom" ? 1 : 0;
    if (vAlign && frameInnerPx && !wrap) {
      const bottoms = new Map();
      typesetLines.forEach((l) => { if (!l.hidden) bottoms.set(l.col || 0, Math.max(bottoms.get(l.col || 0) || 0, l.top + (l.height || lineHeight))); });
      typesetLines.forEach((l) => { if (!l.hidden) l.top += Math.max(0, textHeight - bottoms.get(l.col || 0)) * vAlign; });
    }
  }
  // A curved line bows away from its straight position by up to `sag`
  // (a rainbow's ends drop, a smile's ends rise); the box makes room for it.
  // All lines share one circle, sized so the widest line spans the chosen arc.
  let curve = null;
  if (look.curve && look.curve.curveBend !== 0) {
    const widest = Math.max(1, ...lines.map(measure));
    const radius = widest / (Math.abs(look.curve.curveBend) / 100 * Math.PI);
    curve = { radius, sign: look.curve.curveBend > 0 ? 1 : -1, sag: radius * (1 - Math.cos(widest / 2 / radius)) };
  }
  const boxHeight = textHeight + padY * 2 + (curve ? curve.sag : 0);
  return { look, fontSize, lineHeight, baselineOffset, x, y, padX, padY, boxWidth, innerWidth, lines, lineStarts, typesetLines, textHeight, boxHeight, measure, fontAt, ascent, descent, curve, overflow, columns, columnWidth, columnStride: columnWidth + columnGap };
}

// How far a canvas-drawn text box paints past its own edges (editor px):
// stroke, shadow and the tilt/shift/size of ransom letters.
export function textCanvasMargin(ann, look) {
  const fontSize = ann.fontSize || 16;
  let margin = 2;
  if (look.stroke) margin += look.stroke.strokeThickness * 2;
  if (look.stack) margin += look.shadows.reduce((m, s) => Math.max(m, Math.hypot(s.x, s.y) + s.blur * 2), 0);
  else if (look.shadow) margin += Math.hypot(look.shadow.x, look.shadow.y) + look.shadow.blur * 2;
  if (look.ransom) margin += fontSize * (look.ransom.ransomShift / 100 + 0.35 + look.ransom.ransomSize / 100);
  if (look.curve) margin += fontSize * 0.6; // turned letters at the ends of an arc reach past the box
  return Math.ceil(margin);
}

// A text box's size in editor px, as Export lays it out, plus the size of
// the text area inside its padding (where a gradient or photo fill sits).
export function measureTextBox(ann) {
  const ctx = document.createElement("canvas").getContext("2d");
  const { boxWidth, boxHeight, innerWidth, textHeight, overflow } = layoutText(ctx, ann, 1);
  return { width: boxWidth, height: boxHeight, contentWidth: innerWidth, contentHeight: textHeight, overflow };
}

// The full layout of a text box in editor px (for the caret and hit-testing). The canvas
// context stays alive inside it, so its `measure` keeps working.
export function layoutTextBox(ann) {
  const ctx = document.createElement("canvas").getContext("2d");
  return layoutText(ctx, ann, 1);
}
