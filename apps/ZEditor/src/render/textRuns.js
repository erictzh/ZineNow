// Where each piece of a plain text box's text sits: the "runs" that get drawn, and the stretches an underline covers.
//
// Shared by the canvas renderer (drawText.js) and the vector PDF export
// (io/vectorText.js), so both put every word in exactly the same place.
// Ransom and curve text place letters one by one and have their own code in
// drawText.js; this covers everything else (plain, typeset, stacked).

import { colorSegments } from "../model/text/colorRuns.js";
import { ptToPx } from "../model/text/textLook.js";

// The column rules of a multi-column frame with "Column rule" on: [{ x, y0, y1, width, color }]
// in canvas px (x is the rule's centre line, halfway across each gap).
export function columnRules(layout, ann) {
  if (ann.columnRule !== "on" || !layout.typesetLines || !(layout.columns > 1)) return [];
  const scale = layout.fontSize / (ann.fontSize || 16);
  // The weight is stored in tenths of a point (the panel's sliders step in whole numbers).
  const width = Math.max(0.25, ptToPx((ann.columnRuleWidth != null ? ann.columnRuleWidth : 5) / 10)) * scale;
  const gap = layout.columnStride - layout.columnWidth;
  const y0 = layout.y + layout.padY, y1 = y0 + layout.textHeight;
  const rules = [];
  for (let i = 0; i < layout.columns - 1; i++) {
    rules.push({ x: layout.x + layout.padX + i * layout.columnStride + layout.columnWidth + gap / 2, y0, y1, width, color: ann.columnRuleColor || "#1a1a1a" });
  }
  return rules;
}

// A custom span's own underline / strike-through (true or false), where it sets one.
function spanDecorations(span) {
  const out = {};
  if (span && span.underline != null) out.underline = span.underline;
  if (span && span.strike != null) out.strike = span.strike;
  return out;
}

// `layout` is what layoutText returns. Returns:
//   runs        [{ text, x, baselineY, color, font }]  one per stretch of one span (canvas px);
//               `font` is set where a custom span has its own font, bold or italic
//   lineExtents [{ line, lineX, lineWidth, baselineY, segments: [{ x0, x1, color, underline?, strike? }] }]
export function layoutPlainRuns(layout, ann) {
  const { look, x, y, padX, padY, boxWidth, lines, lineStarts, typesetLines, baselineOffset, lineHeight, measure } = layout;
  const runs = [];
  const lineExtents = [];

  // Typeset boxes (justified, indented, paragraph spacing...) arrive from the composer
  // as lines of positioned words, so each word is drawn where the composer put it.
  if (typesetLines) {
    typesetLines.forEach((tl) => {
      if (tl.hidden) return; // past the last column
      const baselineY = y + padY + tl.top + baselineOffset + (tl.baseShift || 0); // a line grown for a bigger span sits lower
      const lineX = x + padX + tl.x;
      const segments = [];
      tl.pieces.forEach((p, k) => {
        const raw = p.hyphen ? p.text.slice(0, -1) : p.text;
        const own = (ann.colorRuns || [])
          .filter((r) => r.end > p.start && r.start < p.end)
          .map((r) => ({ ...r, start: Math.max(r.start, p.start) - p.start, end: Math.min(r.end, p.end) - p.start }));
        const pieceSegments = colorSegments(raw, own);
        let offset = 0;
        // An underline runs on through the space to the next word.
        const reachX = k + 1 < tl.pieces.length ? lineX + tl.pieces[k + 1].x : lineX + p.x + p.width;
        pieceSegments.forEach((seg, si) => {
          const last = si === pieceSegments.length - 1;
          const segX = lineX + p.x + (offset ? measure(raw.slice(0, offset), p.start) : 0);
          const font = layout.fontAt ? layout.fontAt(p.start + offset) : null; // a custom span's own font
          offset += seg.text.length;
          const segEnd = last ? reachX : lineX + p.x + measure(raw.slice(0, offset), p.start);
          runs.push({ text: last && p.hyphen ? seg.text + "-" : seg.text, x: segX, baselineY, color: seg.color, font });
          segments.push({ x0: segX, x1: segEnd, color: seg.color, ...spanDecorations(seg.span) });
        });
      });
      lineExtents.push({ line: tl.pieces.length ? "x" : "", lineX, lineWidth: tl.width, baselineY, segments });
    });
    return { runs, lineExtents };
  }

  lines.forEach((line, i) => {
    const lineWidth = measure(line);
    let lineX = x + padX;
    if (ann.align === "center" || look.stacked) lineX = x + (boxWidth - lineWidth) / 2;
    else if (ann.align === "right") lineX = x + boxWidth - padX - lineWidth;
    const baselineY = y + padY + i * lineHeight + baselineOffset;
    const lineStart = lineStarts[i];
    // One run per stretch of a single colour (a whole line when no
    // letters are recoloured).
    const lineRuns = (ann.colorRuns || [])
      .filter((r) => r.end > lineStart && r.start < lineStart + line.length)
      .map((r) => ({ ...r, start: Math.max(r.start, lineStart) - lineStart, end: Math.min(r.end, lineStart + line.length) - lineStart }));
    const segments = [];
    let offset = 0;
    for (const seg of colorSegments(line, lineRuns)) {
      const segX = lineX + (offset ? measure(line.slice(0, offset)) : 0);
      offset += seg.text.length;
      const segEnd = lineX + measure(line.slice(0, offset));
      runs.push({ text: seg.text, x: segX, baselineY, color: seg.color });
      segments.push({ x0: segX, x1: segEnd, color: seg.color, ...spanDecorations(seg.span) });
    }
    lineExtents.push({ line, lineX, lineWidth, baselineY, segments });
  });
  return { runs, lineExtents };
}
