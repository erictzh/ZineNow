// Paper sizes, built-in default settings (merged with defaultConfig.json), font stacks and allowed values.

/* ------------------------------------------------------------------
 * Paper sizes
 * ------------------------------------------------------------------
 * Dimensions are in inches. `jsPdfFormat` names the equivalent
 * standard paper format and is kept as documentation/for any future
 * jsPDF-based path; the current print-based export uses widthIn /
 * heightIn directly via `@page` CSS instead.
 * ------------------------------------------------------------------ */
export var PAPER_SIZES = {
  a4: {
    key: 'a4',
    label: 'A4 (8.27" x 11.69")',
    widthIn: 8.27,
    heightIn: 11.69,
    jsPdfFormat: 'a4',
  },
  a5: {
    key: 'a5',
    label: 'A5 (5.83" x 8.27")',
    widthIn: 5.83,
    heightIn: 8.27,
    jsPdfFormat: 'a5',
  },
  letter: {
    key: 'letter',
    label: 'US Letter (8.5" x 11")',
    widthIn: 8.5,
    heightIn: 11,
    jsPdfFormat: 'letter',
  },
  tabloid: {
    key: 'tabloid',
    label: '11" x 17" (Tabloid)',
    widthIn: 11,
    heightIn: 17,
    jsPdfFormat: 'tabloid',
  },
};

export var DEFAULT_PAPER_KEY = 'a5';

/* ------------------------------------------------------------------
 * Default typography values — the fallback contract described in the
 * spec: any styling input that is left blank/empty/invalid MUST fall
 * back to these values.
 *
 * The actual values live in defaultConfig.json (loaded via a <script
 * src="defaultConfig.json"> tag in index.html, before this file) —
 * edit that file to change the app's defaults, not this one. The
 * object below is only a safety-net fallback in case that file is
 * ever missing/renamed/fails to load, so the app still has sane
 * defaults rather than crashing; keep it in sync with
 * defaultConfig.json by hand. See the comment at the top of
 * defaultConfig.json for why it isn't loaded with a plain fetch().
 * ------------------------------------------------------------------ */
var HARDCODED_FALLBACK_DEFAULTS = {
  fontFamily: 'Inter',
  // Heading typeface: when headingFontSameAsBody is true (or
  // headingFontFamily is blank), headings use the body fontFamily.
  headingFontSameAsBody: true,
  headingFontFamily: '',
  paperSize: DEFAULT_PAPER_KEY,
  fontSize: 13.33, // px (= 10pt, the Anarchist Library / Amusewiki default for A5 zine pages)
  lineHeight: 1.6, // unitless
  paragraphSpacing: '1rem', // CSS length (bottom margin on <p>)
  textAlign: 'left', // body text: left | center | right | justify
  // Per-heading alignment: blank = same as body text, or
  // left | center | right | justify. H4–H6 follow H3.
  h1TextAlign: '',
  h2TextAlign: '',
  h3TextAlign: '',
  h1Size: 28, // px
  h1Weight: 700,
  h2Size: 22, // px
  h2Weight: 600,
  h3Size: 18, // px
  h3Weight: 600,
  // Per-level heading line height (unitless) and the rule drawn
  // beneath the heading. H4–H6 are unaffected by these.
  h1LineHeight: 1.25,
  h2LineHeight: 1.3,
  h3LineHeight: 1.35,
  h1Underline: true,
  h2Underline: false,
  h3Underline: false,
  baseWeight: 400, // regular body text weight
  boldWeight: 700, // <strong>/<b> weight
  marginVerticalIn: 0.75, // page margin, top/bottom, inches
  marginHorizontalIn: 0.75, // page margin, left/right, inches
  // Table of contents (placed wherever a `\toc` line appears)
  tocLevels: 3, // include H1..H{tocLevels}
  tocShowTitle: true,
  tocTitle: 'Contents',
  tocTitleAlign: '', // blank = same as H2
  // Per-level ToC entry style. Size (px) / line height blank = body text's.
  tocL1Bold: true,
  tocL1Italic: false,
  tocL1Underline: false,
  tocL1Size: '',
  tocL1LineHeight: '',
  tocL2Bold: false,
  tocL2Italic: false,
  tocL2Underline: false,
  tocL2Size: '',
  tocL2LineHeight: '',
  tocL3Bold: false,
  tocL3Italic: false,
  tocL3Underline: false,
  tocL3Size: '',
  tocL3LineHeight: '',
  tocPageNumbers: true,
  tocDotLeaders: true,
  tocPageBreakAfter: true,
  pageNumbersEnabled: false, // show a page number at the bottom-center of every page
  pageStartFrom: 1, // the number shown on the first page when page numbers are on
};

export var DEFAULTS = Object.assign({}, HARDCODED_FALLBACK_DEFAULTS, window.MD2eBookDefaultConfig || {});

export var ALLOWED_BOLD_WEIGHTS = [600, 700, 800, 900];

export var TEXT_ALIGN_OPTIONS = [
  { key: 'left', label: 'Left' },
  { key: 'center', label: 'Center' },
  { key: 'right', label: 'Right' },
  { key: 'justify', label: 'Justify' },
];
export var ALLOWED_TEXT_ALIGNS = TEXT_ALIGN_OPTIONS.map(function (o) { return o.key; });

// Fonts that are loaded via Google Fonts in index.html and therefore
// always render correctly regardless of the user's OS.
export var WEB_SAFE_GOOGLE_FONTS = {
  Inter: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  Merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

// Common system fonts that ship pre-loaded in the font combobox but do
// not need a webfont — they resolve from the OS font stack.
var SYSTEM_FONT_STACKS = {
  Georgia: "Georgia, 'Times New Roman', serif",
  Garamond: "Garamond, 'Apple Garamond', 'Times New Roman', serif",
  Arial: "Arial, Helvetica, sans-serif",
  'Times New Roman': "'Times New Roman', Times, serif",
};

export var FONT_STACKS = Object.assign({}, WEB_SAFE_GOOGLE_FONTS, SYSTEM_FONT_STACKS);

// The CSS font stack for a font name: a known stack, else the name with system fallbacks.
export function fontStackFor(family) {
  return FONT_STACKS[family] || "'" + family + "', ui-sans-serif, system-ui, sans-serif";
}
