// The editor's starting settings and the option lists its controls offer.

import { ALLOWED_BOLD_WEIGHTS, DEFAULTS, PAPER_SIZES } from "./defaults.js";

/* ==========================================================================
   Static data
   ========================================================================== */
// The sample Markdown shown in the editor on first load / via "Load
// Sample Markdown" now lives in its own file (sample.md), loaded via a
// <script src="sample.md"> tag in index.html (before this file) — see
// the comment at the top of that file for why it's not a plain fetch().
// The fallback here only matters if that file is ever missing/renamed.
export const SAMPLE_MARKDOWN = window.MD2eBookSampleMarkdown || "# Start writing here…";
export const DEFAULT_FONT_OPTIONS = [
  "Inter",
  "Merriweather",
  "Georgia",
  "Garamond",
  "JetBrains Mono",
  "Arial",
  "Times New Roman",
];
export const PAPER_SIZE_OPTIONS = Object.values(PAPER_SIZES);
export const BOLD_WEIGHT_OPTIONS = ALLOWED_BOLD_WEIGHTS;
// Fields that are real booleans (checkboxes) rather than strings.
export const BOOLEAN_CONFIG_KEYS = [
  "pageNumbersEnabled",
  "headingFontSameAsBody",
  "tocShowTitle",
  "tocPageNumbers",
  "tocDotLeaders",
  "tocPageBreakAfter",
  "tocL1Bold",
  "tocL1Italic",
  "tocL1Underline",
  "tocL2Bold",
  "tocL2Italic",
  "tocL2Underline",
  "tocL3Bold",
  "tocL3Italic",
  "tocL3Underline",
  "h1Underline",
  "h2Underline",
  "h3Underline",
];
// Boolean default from defaultConfig.json, tolerating "false" strings.
function defaultBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") return !/^(false|0|no|off)$/i.test(value.trim());
  return Boolean(value);
}
export const INITIAL_CONFIG = {
  fontFamily: "Inter",
  headingFontSameAsBody: DEFAULTS.headingFontSameAsBody !== false && DEFAULTS.headingFontSameAsBody !== "false",
  headingFontFamily: DEFAULTS.headingFontFamily ? String(DEFAULTS.headingFontFamily) : "",
  paperSize: String(DEFAULTS.paperSize || "a5"),
  fontSize: "",
  lineHeight: "",
  paragraphSpacing: "",
  textAlign: String(DEFAULTS.textAlign || "left"),
  h1TextAlign: DEFAULTS.h1TextAlign ? String(DEFAULTS.h1TextAlign) : "",
  h2TextAlign: DEFAULTS.h2TextAlign ? String(DEFAULTS.h2TextAlign) : "",
  h3TextAlign: DEFAULTS.h3TextAlign ? String(DEFAULTS.h3TextAlign) : "",
  h1Size: "",
  h1Weight: String(DEFAULTS.h1Weight),
  h2Size: "",
  h2Weight: String(DEFAULTS.h2Weight),
  h3Size: "",
  h3Weight: String(DEFAULTS.h3Weight),
  h1LineHeight: "",
  h2LineHeight: "",
  h3LineHeight: "",
  h1Underline: defaultBool(DEFAULTS.h1Underline, true),
  h2Underline: defaultBool(DEFAULTS.h2Underline, false),
  h3Underline: defaultBool(DEFAULTS.h3Underline, false),
  baseWeight: String(DEFAULTS.baseWeight),
  boldWeight: String(DEFAULTS.boldWeight),
  marginVertical: "",
  marginHorizontal: "",
  tocLevels: String(DEFAULTS.tocLevels || 3),
  tocShowTitle: defaultBool(DEFAULTS.tocShowTitle, true),
  tocTitle: "",
  tocTitleAlign: DEFAULTS.tocTitleAlign ? String(DEFAULTS.tocTitleAlign) : "",
  tocL1Bold: defaultBool(DEFAULTS.tocL1Bold, true),
  tocL1Italic: defaultBool(DEFAULTS.tocL1Italic, false),
  tocL1Underline: defaultBool(DEFAULTS.tocL1Underline, false),
  tocL1Size: DEFAULTS.tocL1Size ? String(DEFAULTS.tocL1Size) : "",
  tocL1LineHeight: DEFAULTS.tocL1LineHeight ? String(DEFAULTS.tocL1LineHeight) : "",
  tocL2Bold: defaultBool(DEFAULTS.tocL2Bold, false),
  tocL2Italic: defaultBool(DEFAULTS.tocL2Italic, false),
  tocL2Underline: defaultBool(DEFAULTS.tocL2Underline, false),
  tocL2Size: DEFAULTS.tocL2Size ? String(DEFAULTS.tocL2Size) : "",
  tocL2LineHeight: DEFAULTS.tocL2LineHeight ? String(DEFAULTS.tocL2LineHeight) : "",
  tocL3Bold: defaultBool(DEFAULTS.tocL3Bold, false),
  tocL3Italic: defaultBool(DEFAULTS.tocL3Italic, false),
  tocL3Underline: defaultBool(DEFAULTS.tocL3Underline, false),
  tocL3Size: DEFAULTS.tocL3Size ? String(DEFAULTS.tocL3Size) : "",
  tocL3LineHeight: DEFAULTS.tocL3LineHeight ? String(DEFAULTS.tocL3LineHeight) : "",
  tocPageNumbers: defaultBool(DEFAULTS.tocPageNumbers, true),
  tocDotLeaders: defaultBool(DEFAULTS.tocDotLeaders, true),
  tocPageBreakAfter: defaultBool(DEFAULTS.tocPageBreakAfter, true),
  pageNumbersEnabled: Boolean(DEFAULTS.pageNumbersEnabled),
  pageStartFrom: "",
};
