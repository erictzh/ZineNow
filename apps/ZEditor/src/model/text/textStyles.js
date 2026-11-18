// Saved text styles: built-ins, capturing and applying a style, browser storage.

import { TEXT_EFFECTS } from "./textControls.js";

// ---- Saved text styles: a name plus the look of a text box (font, size,
// colour, spacing, case and every effect), but not its words, position,
// rotation, per-letter colours or photo.
const TEXT_STYLE_BASICS = ["fontFamily", "fontSize", "bold", "italic", "underline", "color", "align"];
// Paragraph typography is part of a style too (a "paragraph style" in InDesign terms).
const TEXT_STYLE_PARAGRAPH = ["leadingPt", "kerning", "composer", "hyphenate", "justifyLast", "indentFirst", "indentLeft", "indentRight", "spaceBefore", "spaceAfter"];
export const TEXT_STYLE_PROPS = [
  ...TEXT_STYLE_BASICS, "lineSpacing", "letterSpacing", "strike", "textCase", "vertical", "fillAlpha", ...TEXT_STYLE_PARAGRAPH,
  ...TEXT_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]),
];
// Built-in presets for an A5 zine, scaled from P (body text, 11 pt): H1 x2, H2 x1.5, H3 x1.2,
// Quote the body size, Remark x0.8. Sizes are editor px (the page shows 1.1 px per pt).
export const BUILT_IN_TEXT_STYLES = [
  { name: "H1", builtIn: true, props: { fontSize: 24.2, bold: true, lineSpacing: 110 } },       // 22 pt
  { name: "H2", builtIn: true, props: { fontSize: 17.6, bold: true, lineSpacing: 115 } },       // 16 pt
  { name: "H3", builtIn: true, props: { fontSize: 14.3, bold: true, lineSpacing: 125 } },       // 13 pt
  { name: "P", builtIn: true, props: { fontSize: 12.1, lineSpacing: 140 } },                    // 11 pt
  { name: "Quote", builtIn: true, props: { fontSize: 12.1, italic: true, lineSpacing: 140, indentLeft: 12, indentRight: 12 } }, // 11 pt, indented 12 pt each side
  { name: "Remark", builtIn: true, props: { fontSize: 9.9, italic: true, lineSpacing: 130 } },  // 9 pt
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

// ---- Linked styles ----------------------------------------------------------
// A text box can be linked to a saved style: it carries `styleName` and the list
// of look settings it has changed since (`styleOverrides`). The box still holds
// every setting itself, so nothing that draws text needs to know about styles;
// "Redefine style" just rewrites the settings of every linked box, except the ones
// each box has overridden. A style may also be "based on" another: it stores only
// what differs, and changes to the base flow through to it.

// The look a style gives: its base style's look, with its own settings on top.
// (A cycle or a missing base just stops the chain.)
export function resolvedStyleProps(styles, name) {
  const chain = [];
  const seen = new Set();
  for (let current = styles.find((s) => s.name === name); current && !seen.has(current.name); current = current.basedOn ? styles.find((s) => s.name === current.basedOn) : null) {
    seen.add(current.name);
    chain.unshift(current);
  }
  const merged = Object.assign({}, ...chain.map((s) => s.props));
  for (const key of Object.keys(merged)) if (merged[key] === null) delete merged[key]; // null = this style removes what its base sets
  return merged;
}

// What a style based on `base` has to store of `captured`: only the settings that differ
// from the base's, plus "reset" markers (null) for settings the base has and this look doesn't.
export function styleDiff(base, captured) {
  const diff = {};
  for (const key of Object.keys(captured)) {
    if (JSON.stringify(captured[key]) !== JSON.stringify(base[key])) diff[key] = captured[key];
  }
  for (const key of Object.keys(base)) if (!(key in captured)) diff[key] = null;
  return diff;
}

// `patch` with the look settings it changes added to the box's overrides, if the box is linked to a style.
export function withStyleOverrides(ann, patch) {
  if (!ann || !ann.styleName || "styleName" in patch || "styleOverrides" in patch) return patch;
  const changed = Object.keys(patch).filter((key) => TEXT_STYLE_PROPS.includes(key));
  if (!changed.length) return patch;
  const current = ann.styleOverrides || [];
  const merged = Array.from(new Set([...current, ...changed]));
  return merged.length === current.length ? patch : { ...patch, styleOverrides: merged };
}

// The patch that gives a linked box its style's current look, leaving what the box overrides alone
// (null when the box isn't linked, or its style no longer exists).
export function relinkPatch(ann, styles) {
  if (!ann || ann.type !== "text" || !ann.styleName || !styles.some((s) => s.name === ann.styleName)) return null;
  const full = textStylePatch({ props: resolvedStyleProps(styles, ann.styleName) });
  const keep = new Set(ann.styleOverrides || []);
  const patch = {};
  for (const key of Object.keys(full)) if (!keep.has(key)) patch[key] = full[key];
  return patch;
}
