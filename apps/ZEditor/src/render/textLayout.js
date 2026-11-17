// Text layout: line wrapping (incl. CJK rules), shrink-to-fit, measuring a text box.

import { AUTO_TEXT_MAX_WIDTH, TEXT_BORDER_PX } from "../model/text/textControls.js";
import { caseText, stackText, textLook } from "../model/text/textLook.js";

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

// Characters a browser may break a line between (each one on its own, no
// spaces needed): Chinese, Japanese kana, Korean, and full-width forms.
const WRAP_CJK_RE = /[⺀-〿぀-ヿ㄀-ㄯ㐀-䶿一-鿿가-힯豈-﫿︰-﹏＀-￯\u{20000}-\u{3FFFF}]/u;
// Closing punctuation never starts a line, so it sticks to the character before it.
const WRAP_NO_LINE_START = "，。、．：；！？）］｝】〕〉》」』”’…ー";

// Splits one space-free word into pieces a line may break between: each
// CJK character alone, any other run of characters kept whole.
function wrapAtoms(word) {
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
  const measure = (look.ransom || look.curve)
    ? (s) => Array.from(s).reduce((width, ch) => width + ctx.measureText(ch).width, 0)
    : (s) => ctx.measureText(s).width;

  let boxWidth;
  if (ann.width) {
    boxWidth = ann.width * scaleFactor;
  } else {
    const naturalWidth = Math.max(10, ...shownText.split("\n").map(measure));
    boxWidth = Math.min(naturalWidth + padX * 2, maxWidthCap);
  }
  const innerWidth = Math.max(4, boxWidth - padX * 2);
  const lines = wrapTextLines(ctx, shownText, innerWidth, measure);
  // Where each wrapped line begins in the text (a wrap or newline swallows
  // one character), so per-letter colours can be matched to lines.
  const lineStarts = [];
  let cursor = 0;
  if (look.stacked) {
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
  const textHeight = lines.length * lineHeight;
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
  return { look, fontSize, lineHeight, baselineOffset, x, y, padX, padY, boxWidth, innerWidth, lines, lineStarts, textHeight, boxHeight, measure, ascent, descent, curve };
}

// How far a canvas-drawn text box paints past its own edges (editor px):
// stroke, shadow and the tilt/shift/size of ransom letters.
export function textCanvasMargin(ann, look) {
  const fontSize = ann.fontSize || 16;
  let margin = 2;
  if (look.stroke) margin += look.stroke.strokeThickness * 2;
  if (look.shadow) margin += Math.hypot(look.shadow.x, look.shadow.y) + look.shadow.blur * 2;
  if (look.ransom) margin += fontSize * (look.ransom.ransomShift / 100 + 0.35 + look.ransom.ransomSize / 100);
  if (look.curve) margin += fontSize * 0.6; // turned letters at the ends of an arc reach past the box
  return Math.ceil(margin);
}

// A text box's size in editor px, as Export lays it out, plus the size of
// the text area inside its padding (where a gradient or photo fill sits).
export function measureTextBox(ann) {
  const ctx = document.createElement("canvas").getContext("2d");
  const { boxWidth, boxHeight, innerWidth, textHeight } = layoutText(ctx, ann, 1);
  return { width: boxWidth, height: boxHeight, contentWidth: innerWidth, contentHeight: textHeight };
}
