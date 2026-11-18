// The resolved look of a text box: case, stacking, spacing, gradient and photo placement.

import { MAIN_SCALE } from "../../constants.js";
import { controlValues, effectSettings } from "../controls.js";
import { STROKE_EFFECT, imageShadowOffset } from "../imageEffects.js";
import { hasLayoutSpans } from "./colorRuns.js";
import { CASE_CONTROL, CURVE_EFFECT, DISTRESS_EFFECT, LETTER_SPACING_CONTROL, LINE_SPACING_CONTROL, RANSOM_EFFECT, STRIKE_CONTROL, TEXT_FILL_ALPHA_CONTROL, TEXT_GRADIENT_EFFECT, TEXT_LABEL_EFFECT, TEXT_PHOTO_CONTROLS, VERTICAL_CONTROL } from "./textControls.js";

// The text as it shows once the box's letter case is applied (canvas
// drawing; the live box gets the same result from CSS).
export function caseText(text, mode) {
  if (mode === "upper") return text.toUpperCase();
  if (mode === "lower") return text.toLowerCase();
  if (mode === "title") return text.replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (m, before, letter) => before + letter.toUpperCase());
  return text;
}
export function stackText(text) {
  return Array.from(text).map((ch) => (ch === "\n" ? "" : ch)).join("\n");
}
// These looks are drawn with the export renderer in the live editor too
// (see AnnotationText), because per-letter jitter and knocked-out marks
// have no clean CSS equivalent; one renderer means no editor/export drift.
// Paragraph typography (justified text, hyphenation, indents, paragraph spacing,
// the optimal line breaker) is laid out by the composer, in the live box as in
// Export. Ransom, curve and stacked text keep their own layout and ignore it.
export const usesTypeset = (ann) => !(ann.ransom || ann.curve || ann.vertical === "stacked")
  && Boolean((ann.wrapObstacles && ann.wrapObstacles.length) || ann.storyHeadId != null || ann.align === "justify" || ann.hyphenate === "english" || ann.columns > 1 || ann.frameHeight > 0 || ann.indentFirst || ann.indentLeft || ann.indentRight || ann.spaceBefore || ann.spaceAfter || ann.composer === "paragraph" || hasLayoutSpans(ann.colorRuns));
export const usesCanvasText = (ann) => Boolean(ann.ransom || ann.distress || ann.curve || ann.vertical === "stacked" || ann.fitHeight > 0 || (ann.colorRuns && ann.colorRuns.length) || usesTypeset(ann));
// Point sizes the panel works in become editor px (the page is shown at MAIN_SCALE px per pt).
export const ptToPx = (pt) => (pt || 0) * MAIN_SCALE;
export const pxToPt = (px) => px / MAIN_SCALE;

// Everything about how a text box looks beyond its font, read once so the
// live box and Export agree. Sizes here are in editor px; Export scales them.
export function textLook(ann) {
  const fontSize = ann.fontSize || 16;
  const spacing = controlValues(ann, [LETTER_SPACING_CONTROL]).letterSpacing;
  const color = ann.color || "#1a1a1a";
  const fillAlpha = controlValues(ann, [TEXT_FILL_ALPHA_CONTROL]).fillAlpha;
  const photo = ann.fillSrc ? { src: ann.fillSrc, natW: ann.fillNatW, natH: ann.fillNatH, ...controlValues(ann, TEXT_PHOTO_CONTROLS) } : null;
  // Kept with a photo too: it shows through a faded photo, under it.
  const gradient = ann.textGradient ? effectSettings(ann, TEXT_GRADIENT_EFFECT) : null;
  const label = ann.labelBox ? effectSettings(ann, TEXT_LABEL_EFFECT) : null;
  return {
    photo,
    ransom: ann.ransom ? effectSettings(ann, RANSOM_EFFECT) : null,
    curve: ann.curve ? effectSettings(ann, CURVE_EFFECT) : null,
    distress: ann.distress ? effectSettings(ann, DISTRESS_EFFECT) : null,
    // Leading set in points wins over the percentage; either way this is the ratio of line height to font size.
    lineHeight: ann.leadingPt > 0 ? ptToPx(ann.leadingPt) / fontSize : controlValues(ann, [LINE_SPACING_CONTROL]).lineSpacing / 100,
    kerning: ann.kerning === "none" ? "none" : "auto",
    paragraph: {
      indentFirst: ptToPx(ann.indentFirst), indentLeft: ptToPx(ann.indentLeft), indentRight: ptToPx(ann.indentRight),
      spaceBefore: ptToPx(ann.spaceBefore), spaceAfter: ptToPx(ann.spaceAfter),
      lastLine: ann.justifyLast || "left",
      // Justified and hyphenated text defaults to the paragraph composer, as in InDesign.
      composer: ann.composer === "single" || ann.composer === "paragraph" ? ann.composer : ann.align === "justify" || ann.hyphenate === "english" ? "paragraph" : "single",
      hyphenate: ann.hyphenate === "english",
      columns: Math.max(1, Math.min(6, Math.round(ann.columns || 1))),
      columnGap: ptToPx(ann.columnGap != null ? ann.columnGap : 12),
      frameHeight: ptToPx(ann.frameHeight),
    },
    letterSpacingPx: fontSize * spacing / 100,
    strike: controlValues(ann, [STRIKE_CONTROL]).strike,
    textCase: controlValues(ann, [CASE_CONTROL]).textCase,
    stacked: controlValues(ann, [VERTICAL_CONTROL]).vertical === "stacked",
    color, fillAlpha,
    stroke: ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null,
    shadow: imageShadowOffset(ann),
    gradient,
    label,
    // The box's inner padding grows by the label's padding so the bar sits around the text.
    padX: 4 + (label ? label.labelPadding : 0),
    padY: 2 + (label ? label.labelPadding : 0),
  };
}

// Where a text's fill photo sits inside the text area (w x h px), as the
// size and top-left of the photo: it covers the area at 100% scale, and
// fillX/fillY shift it by that percent of the area.
export function photoPlacement(photo, w, h) {
  const cover = Math.max(w / photo.natW, h / photo.natH) * photo.fillScale / 100;
  const photoW = photo.natW * cover, photoH = photo.natH * cover;
  return {
    width: photoW, height: photoH,
    left: (w - photoW) / 2 + photo.fillX / 100 * w,
    top: (h - photoH) / 2 + photo.fillY / 100 * h,
  };
}

// The two-colour linear gradient a text box fills with, in the shape the
// rectangle gradient helpers (rectGradientStops/rectFillCss) already take.
export function textGradientView(ann, look) {
  return { fillType: "linear", fillColor: look.color, fillAlpha: look.fillAlpha, ...look.gradient };
}
