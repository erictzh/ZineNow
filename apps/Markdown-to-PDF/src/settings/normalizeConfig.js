// Turns raw settings (strings from inputs or a settings file) into checked, complete values.

import { ALLOWED_BOLD_WEIGHTS, ALLOWED_TEXT_ALIGNS, DEFAULTS, DEFAULT_PAPER_KEY, PAPER_SIZES, fontStackFor } from "./defaults.js";

/* ------------------------------------------------------------------
 * Small coercion helpers implementing the "blank -> default" rule
 * ------------------------------------------------------------------ */

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function toNumber(value, fallback) {
  if (isBlank(value)) return fallback;
  var n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function toPositiveNumber(value, fallback) {
  var n = toNumber(value, fallback);
  return n > 0 ? n : fallback;
}

// Like toPositiveNumber, but rounds to a whole number — for fields
// like "page start from" where a fractional value makes no sense.
function toPositiveInteger(value, fallback) {
  var n = toPositiveNumber(value, fallback);
  return Math.round(n);
}

// Accepts a raw CSS length ("1.2rem", "20px", "2em") or a bare number
// (treated as rem, matching the default unit used by paragraphSpacing).
function toCssLength(value, fallback) {
  if (isBlank(value)) return fallback;
  var str = String(value).trim();
  if (/^-?\d*\.?\d+$/.test(str)) {
    return str + 'rem';
  }
  if (/^-?\d*\.?\d+(px|rem|em|in|cm|mm|pt|%)$/.test(str)) {
    return str;
  }
  return fallback;
}

function toBoldWeight(value, fallback) {
  var n = toNumber(value, fallback);
  // Snap to the nearest allowed weight so arbitrary numbers entered by
  // the user still resolve to a weight the selected font actually has.
  if (ALLOWED_BOLD_WEIGHTS.indexOf(n) !== -1) return n;
  var closest = ALLOWED_BOLD_WEIGHTS[0];
  var closestDiff = Math.abs(n - closest);
  for (var i = 1; i < ALLOWED_BOLD_WEIGHTS.length; i++) {
    var diff = Math.abs(n - ALLOWED_BOLD_WEIGHTS[i]);
    if (diff < closestDiff) {
      closest = ALLOWED_BOLD_WEIGHTS[i];
      closestDiff = diff;
    }
  }
  return closest;
}

// Parses one margin field (a bare number, assumed inches, or a string
// with a unit suffix — "0.75in", "20mm", "2cm", "54pt") into inches,
// falling back to `fallback` when blank or unparseable. Shared by the
// vertical and horizontal margin fields so they resolve identically.
function toMarginInches(value, fallback) {
  if (isBlank(value)) return fallback;
  var str = String(value).trim();
  var bare = parseFloat(str);
  if (!Number.isFinite(bare)) return fallback;
  if (/mm$/i.test(str)) return bare / 25.4;
  if (/cm$/i.test(str)) return bare / 2.54;
  if (/pt$/i.test(str)) return bare / 72;
  return bare > 0 ? bare : fallback;
}

// Blank or unrecognized -> fallback. Accepts any case ("Justify").
function toTextAlign(value, fallback) {
  if (isBlank(value)) return fallback;
  var v = String(value).trim().toLowerCase();
  return ALLOWED_TEXT_ALIGNS.indexOf(v) !== -1 ? v : fallback;
}

// Same "blank -> default" coercion the checkbox fields need: a
// hand-edited "false" string must read as false, not truthy.
function toBoolean(value, fallback) {
  if (isBlank(value)) return Boolean(fallback);
  if (typeof value === 'string') return !/^(false|0|no|off)$/i.test(value.trim());
  return Boolean(value);
}

/* ------------------------------------------------------------------
 * normalizeConfig
 * ------------------------------------------------------------------
 * Takes the raw config object coming out of React state (where every
 * field is a free-form string that may be empty) and resolves it to a
 * fully-populated, typed config object. This is the single source of
 * truth for the "blank input -> default value" fallback logic.
 * ------------------------------------------------------------------ */
export function normalizeConfig(config) {
  config = config || {};

  var paperKey = PAPER_SIZES.hasOwnProperty(config.paperSize) ? config.paperSize : DEFAULT_PAPER_KEY;

  var fontFamilyRaw = isBlank(config.fontFamily) ? DEFAULTS.fontFamily : String(config.fontFamily).trim();

  // Heading font: "same as body" checkbox wins; a blank custom
  // heading font also falls back to the body font.
  var headingSameAsBody = toBoolean(config.headingFontSameAsBody, DEFAULTS.headingFontSameAsBody);
  var headingFontRaw = isBlank(config.headingFontFamily) ? DEFAULTS.headingFontFamily : config.headingFontFamily;
  var headingFontFamily =
    headingSameAsBody || isBlank(headingFontRaw) ? fontFamilyRaw : String(headingFontRaw).trim();

  var textAlign = toTextAlign(config.textAlign, toTextAlign(DEFAULTS.textAlign, 'left'));
  // Older config files had one shared `headingTextAlign`; honour it
  // as the fallback for any heading level left blank.
  var legacyHeadingAlign = toTextAlign(config.headingTextAlign, textAlign);

  return {
    fontFamily: fontFamilyRaw,
    fontStack: fontStackFor(fontFamilyRaw),
    headingFontFamily: headingFontFamily,
    headingFontStack: fontStackFor(headingFontFamily),
    paperSize: paperKey,

    textAlign: textAlign,
    h1TextAlign: toTextAlign(config.h1TextAlign, toTextAlign(DEFAULTS.h1TextAlign, legacyHeadingAlign)),
    h2TextAlign: toTextAlign(config.h2TextAlign, toTextAlign(DEFAULTS.h2TextAlign, legacyHeadingAlign)),
    h3TextAlign: toTextAlign(config.h3TextAlign, toTextAlign(DEFAULTS.h3TextAlign, legacyHeadingAlign)),

    fontSize: toPositiveNumber(config.fontSize, DEFAULTS.fontSize),
    lineHeight: toPositiveNumber(config.lineHeight, DEFAULTS.lineHeight),
    paragraphSpacing: toCssLength(config.paragraphSpacing, DEFAULTS.paragraphSpacing),

    h1Size: toPositiveNumber(config.h1Size, DEFAULTS.h1Size),
    h1Weight: toNumber(config.h1Weight, DEFAULTS.h1Weight),
    h2Size: toPositiveNumber(config.h2Size, DEFAULTS.h2Size),
    h2Weight: toNumber(config.h2Weight, DEFAULTS.h2Weight),
    h3Size: toPositiveNumber(config.h3Size, DEFAULTS.h3Size),
    h3Weight: toNumber(config.h3Weight, DEFAULTS.h3Weight),
    h1LineHeight: toPositiveNumber(config.h1LineHeight, DEFAULTS.h1LineHeight),
    h2LineHeight: toPositiveNumber(config.h2LineHeight, DEFAULTS.h2LineHeight),
    h3LineHeight: toPositiveNumber(config.h3LineHeight, DEFAULTS.h3LineHeight),
    h1Underline: toBoolean(config.h1Underline, DEFAULTS.h1Underline),
    h2Underline: toBoolean(config.h2Underline, DEFAULTS.h2Underline),
    h3Underline: toBoolean(config.h3Underline, DEFAULTS.h3Underline),

    baseWeight: toNumber(config.baseWeight, DEFAULTS.baseWeight),
    boldWeight: toBoldWeight(config.boldWeight, DEFAULTS.boldWeight),

    // Page margin, split into a vertical (top/bottom) and horizontal
    // (left/right) component so they can be set independently. Each
    // accepts a bare number (assumed inches) or a string with a unit
    // suffix ("0.75in", "20mm", "2cm", "54pt"), and falls back
    // independently if left blank.
    marginVerticalIn: toMarginInches(config.marginVertical, DEFAULTS.marginVerticalIn),
    marginHorizontalIn: toMarginInches(config.marginHorizontal, DEFAULTS.marginHorizontalIn),

    // Page numbers: a plain boolean toggle, and the number shown on
    // the first page (subsequent pages count up from it). Any
    // truthy, non-boolean value loaded from a hand-edited config
    // file (e.g. "true" as a string) is coerced the same way a
    // checkbox's own state would be.
    tocLevels: Math.min(3, Math.max(1, Math.round(toNumber(config.tocLevels, DEFAULTS.tocLevels)) || 3)),
    tocShowTitle: toBoolean(config.tocShowTitle, DEFAULTS.tocShowTitle),
    tocTitle: isBlank(config.tocTitle) ? String(DEFAULTS.tocTitle || 'Contents') : String(config.tocTitle).trim(),
    tocTitleAlign: toTextAlign(config.tocTitleAlign, toTextAlign(DEFAULTS.tocTitleAlign, '')),
    tocLevelStyles: [1, 2, 3].map(function (n) {
      var k = 'tocL' + n;
      return {
        bold: toBoolean(config[k + 'Bold'], DEFAULTS[k + 'Bold']),
        italic: toBoolean(config[k + 'Italic'], DEFAULTS[k + 'Italic']),
        underline: toBoolean(config[k + 'Underline'], DEFAULTS[k + 'Underline']),
        size: toPositiveNumber(config[k + 'Size'], toPositiveNumber(DEFAULTS[k + 'Size'], null)),
        lineHeight: toPositiveNumber(config[k + 'LineHeight'], toPositiveNumber(DEFAULTS[k + 'LineHeight'], null)),
      };
    }),
    tocPageNumbers: toBoolean(config.tocPageNumbers, DEFAULTS.tocPageNumbers),
    tocDotLeaders: toBoolean(config.tocDotLeaders, DEFAULTS.tocDotLeaders),
    tocPageBreakAfter: toBoolean(config.tocPageBreakAfter, DEFAULTS.tocPageBreakAfter),

    pageNumbersEnabled: Boolean(
      isBlank(config.pageNumbersEnabled) ? DEFAULTS.pageNumbersEnabled : config.pageNumbersEnabled
    ),
    pageStartFrom: toPositiveInteger(config.pageStartFrom, DEFAULTS.pageStartFrom),

    filename: isBlank(config.filename) ? 'md-to-pdf-converter.pdf' : String(config.filename).trim(),
  };
}
