// Saved text styles: built-ins, capturing and applying a style, browser storage.

import { TEXT_EFFECTS } from "./textControls.js";

// ---- Saved text styles: a name plus the look of a text box (font, size,
// colour, spacing, case and every effect), but not its words, position,
// rotation, per-letter colours or photo.
const TEXT_STYLE_BASICS = ["fontFamily", "fontSize", "bold", "italic", "underline", "color", "align"];
const TEXT_STYLE_PROPS = [
  ...TEXT_STYLE_BASICS, "lineSpacing", "letterSpacing", "strike", "textCase", "vertical", "fillAlpha",
  ...TEXT_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]),
];
export const BUILT_IN_TEXT_STYLES = [
  { name: "Title", builtIn: true, props: { fontSize: 56, bold: true, align: "center", letterSpacing: 4, lineSpacing: 100, textCase: "upper" } },
  { name: "Subtitle", builtIn: true, props: { fontSize: 28, italic: true, align: "center", letterSpacing: 1 } },
  { name: "Remark", builtIn: true, props: { fontSize: 12, italic: true } },
];
export function captureTextStyle(ann) {
  const props = {};
  TEXT_STYLE_PROPS.forEach((prop) => { if (ann[prop] !== undefined) props[prop] = ann[prop]; });
  return props;
}
// The patch that gives a text box a style's look. The font, size and
// colour a style doesn't mention (a built-in leaves the font and colour
// alone) are kept; every other look setting is reset, so the style fully
// decides the rest.
const TEXT_STYLE_KEEP_IF_MISSING = ["fontFamily", "fontSize", "color"];
const TEXT_STYLE_RESETS = { bold: false, italic: false, underline: false, align: "left" };
export function textStylePatch(style) {
  const patch = {};
  TEXT_STYLE_PROPS.forEach((prop) => {
    if (style.props[prop] !== undefined) patch[prop] = style.props[prop];
    else if (prop in TEXT_STYLE_RESETS) patch[prop] = TEXT_STYLE_RESETS[prop];
    else if (!TEXT_STYLE_KEEP_IF_MISSING.includes(prop)) patch[prop] = undefined;
  });
  return patch;
}
export const TEXT_STYLES_STORAGE_KEY = "zeditor.textStyles";
export function readStoredTextStyles() {
  try {
    const saved = JSON.parse(localStorage.getItem(TEXT_STYLES_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((s) => s && s.name && s.props) : [];
  } catch (err) { return []; }
}
