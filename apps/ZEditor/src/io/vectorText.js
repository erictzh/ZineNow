// Real (vector) text in the exported PDF.
//
// Export draws each page as a picture. Text that can be drawn as text instead
// is taken out of that picture and written into the PDF with its font embedded,
// so it stays sharp at any size, can be selected and searched, and prints as
// type rather than pixels. The words are placed by exactly the same layout the
// editor and the picture renderer use (render/textRuns.js), so nothing moves.
//
// A box stays in the picture when it can't be written faithfully: it has an
// effect that has no PDF equivalent, its font file isn't reachable, the font
// lacks a character, something sits on top of it, and so on. The reason is
// reported to the user after Export.

import { EXPORT_SCALE, MAIN_SCALE } from "../constants.js";
import { hexToRgb } from "../model/color.js";
import { bboxOf } from "../model/annotations.js";
import { angleOf, blendOf, opacityOf } from "../model/controls.js";
import { caseText, textLook } from "../model/text/textLook.js";
import { layoutText, measureTextBox } from "../render/textLayout.js";
import { columnRules, layoutPlainRuns } from "../render/textRuns.js";
import { createFontResolver } from "./fontFiles.js";

const COMPLEX_SCRIPT = /[֐-ࣿऀ-෿฀-໿က-႟ក-៿]/;

// Why a text box can't be exported as text on its own merits (null when it can).
function blockerFor(ann) {
  const look = textLook(ann);
  if (!ann.text || !ann.text.trim()) return "empty";
  if (look.stroke || look.shadow || look.gradient || look.photo || look.ransom || look.curve || look.distress || look.stacked) return "effect";
  if (look.strike === "double" || look.strike === "wavy") return "decoration";
  if (look.textCase === "small") return "small caps";
  if (look.label && look.label.labelRadius > 0) return "rounded label";
  if (blendOf(ann) !== "normal") return "blend";
  if (opacityOf(ann) < 1) return "opacity";
  if (COMPLEX_SCRIPT.test(ann.text)) return "script";
  // Custom text spans in another font, bold or italic need a second embedded face (not done yet).
  if ((ann.colorRuns || []).some((r) => r.fontFamily != null || r.fontSize != null || r.bold != null || r.italic != null)) return "mixed fonts";
  return null;
}

// The box a page item covers, as a rotated item's axis-aligned bounds, in editor px.
function coveredRect(ann) {
  let x, y, w, h;
  if (ann.type === "stroke") {
    const b = bboxOf(ann);
    const pad = (ann.width || 10) / 2 + 2;
    x = b.x - pad; y = b.y - pad; w = b.width + pad * 2; h = b.height + pad * 2;
  } else if (ann.type === "text") {
    const m = measureTextBox(ann);
    x = ann.x; y = ann.y; w = m.width; h = m.height;
  } else {
    x = ann.x; y = ann.y; w = ann.width || 0; h = ann.height || 0;
  }
  const angle = angleOf(ann) * Math.PI / 180;
  if (!angle) return { x0: x, y0: y, x1: x + w, y1: y + h };
  const cx = x + w / 2, cy = y + h / 2;
  const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
  const hw = (w * cos + h * sin) / 2, hh = (w * sin + h * cos) / 2;
  return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
}
const overlaps = (a, b) => a.x0 < b.x1 + 1 && a.x1 > b.x0 - 1 && a.y0 < b.y1 + 1 && a.y1 > b.y0 - 1;

// Why boxes stayed pictures, as phrases for the report ("... because of <phrase>").
const REASON_TEXT = {
  effect: "an effect (stroke, shadow, gradient, photo fill, ransom, curve, distress or stacked letters)",
  decoration: "a double or wavy line",
  "mixed fonts": "custom text in another font, size, bold or italic",
  "small caps": "small caps",
  "rounded label": "a rounded label",
  blend: "a blend mode",
  opacity: "a layer opacity below 100%",
  script: "text that needs complex-script shaping",
  font: "a font whose file isn't available",
  glyphs: "characters their font doesn't have",
  covered: "another item sitting on top of them",
  unavailable: "a font that couldn't be embedded",
};

export function createVectorTextExporter(outDoc) {
  const fk = typeof window !== "undefined" ? window.fontkit : null;
  if (fk) outDoc.registerFontkit(fk);
  const resolver = createFontResolver();
  const faces = new Map(); // key -> { pdfFont, fkFont } | null (unusable)
  const counts = { vector: 0, picture: 0, reasons: {} };
  let currentFaces = new Map(); // the page being exported: id -> { ann, face } for each box going in as text

  async function faceFor(ann) {
    if (!fk) return { reason: "unavailable" };
    const file = await resolver.find(ann.fontFamily, ann.bold, ann.italic);
    if (!file) return { reason: "font" };
    if (!faces.has(file.key)) {
      let face = null;
      try {
        const fkFont = fk.create(new Uint8Array(file.bytes));
        if (fkFont && !fkFont.fonts) face = { fkFont, pdfFont: await outDoc.embedFont(file.bytes, { subset: true }) }; // fonts: a collection (.ttc), not supported
      } catch (err) { face = null; }
      faces.set(file.key, face);
    }
    const face = faces.get(file.key);
    return face ? { face } : { reason: "unavailable" };
  }

  // Decides, for one page's items (bottom to top), which text boxes go in as text.
  // Returns the Set of their ids; the rest stay in the page picture.
  async function plan(annotations) {
    const vectorIds = new Set();
    const visible = annotations.filter((a) => !a.hidden);
    const candidates = new Map(); // id -> { ann, face }
    for (const ann of visible) {
      if (ann.type !== "text") continue;
      const blocked = blockerFor(ann);
      if (blocked === "empty") continue;
      if (blocked) { note(blocked); continue; }
      const { face, reason } = await faceFor(ann);
      if (!face) { note(reason); continue; }
      const shown = caseText(ann.text, textLook(ann).textCase); // what's actually drawn, after UPPERCASE etc.
      const missing = Array.from(shown).some((ch) => ch.trim() && !face.fkFont.hasGlyphForCodePoint(ch.codePointAt(0)));
      if (missing) { note("glyphs"); continue; }
      candidates.set(ann.id, { ann, face });
    }
    // Text is written on top of the page picture, so a box can't have anything above it that stays in
    // the picture and overlaps it. Worked out from the top item down: whatever stays a picture
    // can cover the boxes below it.
    const pictureAbove = []; // rects of items that stay in the picture
    for (let i = visible.length - 1; i >= 0; i--) {
      const ann = visible[i];
      const cand = candidates.get(ann.id);
      const mine = coveredRect(ann);
      if (cand && !pictureAbove.some((r) => overlaps(mine, r))) {
        vectorIds.add(ann.id);
        counts.vector++;
        continue;
      }
      if (cand) note("covered");
      pictureAbove.push(mine);
    }
    currentFaces = candidates;
    return vectorIds;
  }
  function note(reason) {
    counts.picture++;
    counts.reasons[reason] = (counts.reasons[reason] || 0) + 1;
  }

  // Writes one text box onto `outPage` (pdf-lib page, y up) as text.
  async function draw(outPage, ann, pageHeightPts) {
    const PDF = window.PDFLib;
    const { face } = currentFaces.get(ann.id);
    const ctx = document.createElement("canvas").getContext("2d");
    const scaleFactor = EXPORT_SCALE / MAIN_SCALE; // same as the picture renderer: editor px -> export px
    const layout = layoutText(ctx, ann, scaleFactor);
    const { runs, lineExtents } = layoutPlainRuns(layout, ann);
    const { look, fontSize, measure, x, y, boxWidth, boxHeight } = layout;
    const toPt = 1 / EXPORT_SCALE;                       // canvas px -> PDF points
    const pdfY = (canvasY) => pageHeightPts - canvasY * toPt;
    const sizePt = fontSize * toPt;
    const colorOf = (hex) => { const c = hexToRgb(hex || look.color); return PDF.rgb(c.r / 255, c.g / 255, c.b / 255); };
    const opacity = look.fillAlpha / 100;
    const angle = angleOf(ann);

    if (angle) {
      const cx = (x + boxWidth / 2) * toPt, cy = pdfY(y + boxHeight / 2);
      outPage.pushOperators(PDF.pushGraphicsState(), PDF.translate(cx, cy), PDF.rotateDegrees(-angle), PDF.translate(-cx, -cy));
    }
    if (look.label) {
      const c = hexToRgb(look.label.labelColor);
      outPage.drawRectangle({
        x: x * toPt, y: pdfY(y + boxHeight), width: boxWidth * toPt, height: boxHeight * toPt,
        color: PDF.rgb(c.r / 255, c.g / 255, c.b / 255), opacity: look.label.labelAlpha / 100,
      });
    }

    for (const rule of columnRules(layout, ann)) {
      outPage.drawLine({ start: { x: rule.x * toPt, y: pdfY(rule.y0) }, end: { x: rule.x * toPt, y: pdfY(rule.y1) }, thickness: rule.width * toPt, color: colorOf(rule.color) });
    }

    // Register the font on the page once for this box (drawText would add it again on every call).
    outPage.setFont(face.pdfFont);

    // A word is drawn in one piece when the PDF's own advance widths agree with the browser's
    // (which add kerning, ligatures and tracking); otherwise letter by letter at the browser's positions.
    const tolerance = fontSize * 0.03;
    for (const run of runs) {
      const color = colorOf(run.color);
      const text = run.text;
      let i = 0;
      while (i < text.length) {
        if (text[i] === " ") { i++; continue; }
        let j = i;
        while (j < text.length && text[j] !== " ") j++;
        const word = text.slice(i, j);
        const wordX = run.x + (i ? measure(text.slice(0, i)) : 0);
        const pdfWidth = face.pdfFont.widthOfTextAtSize(word, sizePt) / toPt;
        if (Math.abs(pdfWidth - measure(word)) <= tolerance) {
          outPage.drawText(word, { x: wordX * toPt, y: pdfY(run.baselineY), size: sizePt, color, opacity });
        } else {
          let offset = 0;
          for (const ch of Array.from(word)) {
            outPage.drawText(ch, { x: (wordX + (offset ? measure(word.slice(0, offset)) : 0)) * toPt, y: pdfY(run.baselineY), size: sizePt, color, opacity });
            offset += ch.length;
          }
        }
        i = j;
      }
    }

    // Underline and strike-through, as the picture renderer draws them (a thin line in the letters' colour).
    const thickness = Math.max(1, fontSize * 0.06) * toPt;
    for (const { line, baselineY, segments } of lineExtents) {
      if (!line) continue;
      for (const { x0, x1, color, underline, strike } of segments) {
        const lineColor = colorOf(color);
        const rule = (dy) => outPage.drawLine({ start: { x: x0 * toPt, y: pdfY(baselineY + dy) }, end: { x: x1 * toPt, y: pdfY(baselineY + dy) }, thickness, color: lineColor, opacity });
        // A custom span may turn underline / strike-through on or off for its own letters.
        if (underline != null ? underline : ann.underline) rule(fontSize * 0.12);
        if (strike != null ? strike : look.strike === "line") rule(-fontSize * 0.3);
      }
    }
    if (angle) outPage.pushOperators(PDF.popGraphicsState());
  }

  // A sentence for the user about what was written as text and what wasn't (or null if there was no text).
  function describe() {
    const { vector, picture, reasons } = counts;
    if (!vector && !picture) return null;
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "es"}`;
    const parts = [];
    if (vector) parts.push(`${plural(vector, "text box")} exported as real text`);
    if (picture) {
      const why = Object.entries(reasons).map(([reason, n]) => `${n} because of ${REASON_TEXT[reason] || reason}`);
      parts.push(`${plural(picture, "text box")} stayed as a picture (${why.join("; ")})`);
    }
    let message = parts.join(". ") + ".";
    if (reasons.font) message += " To keep those as text, upload their font (font menu → Upload Font File) or allow “Load Local System Fonts”.";
    return message;
  }

  return { plan, draw, describe, counts };
}
