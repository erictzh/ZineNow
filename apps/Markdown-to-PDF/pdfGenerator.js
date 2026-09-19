/* ==========================================================================
   Md to PDF Converter — pdfGenerator.js
   ==========================================================================
   Client-side Markdown -> HTML -> PDF generation engine.

   No bundler / module system is used (this app is loaded via plain
   <script> tags, see index.html), so this file attaches its public API
   to a single global namespace: `window.MD2eBook`.

   Public API:
     - window.MD2eBook.PAPER_SIZES
     - window.MD2eBook.FONT_STACKS
     - window.MD2eBook.normalizeConfig(config)
     - window.MD2eBook.renderHtmlDocument(markdownText, config) -> string
     - window.MD2eBook.exportToPdf(markdownText, config) -> Promise<void>
     - window.MD2eBook.convertMuseToMarkdown(museText) -> string
     - window.MD2eBook.convertDocxToMarkdown(arrayBuffer) -> Promise<string>
     - window.MD2eBook.convertEpubToMarkdown(arrayBuffer) -> Promise<string>

   Depends on the global `marked`, loaded via a CDN <script> tag in
   index.html before this file. PDF export uses the browser's own native
   print engine (window.print(), with the destination document sized via
   `@page` CSS) rather than a rasterization library — see the comment on
   exportToPdf() below for why. The live preview (renderHtmlDocument)
   separately loads Paged.js (https://pagedjs.org) inside its own
   generated document so the on-screen preview can show real page
   breaks too — see the comment on renderHtmlDocument() for why that
   needs a separate approach from the print/export path.

   The three convert*ToMarkdown functions back the "Upload" button in
   App.jsx (import an existing document, converting it to Markdown in
   place of the editor's contents). convertDocxToMarkdown and
   convertEpubToMarkdown additionally depend on three more CDN
   <script> tags in index.html — window.mammoth, window.JSZip, and
   window.TurndownService — loaded separately from marked/React because
   they're only needed if the user actually imports a .docx or .epub,
   not for the app's core functionality. See requireGlobal() below for
   what happens if one of them didn't load.
   ========================================================================== */

(function (window) {
  'use strict';

  /* ------------------------------------------------------------------
   * Paper sizes
   * ------------------------------------------------------------------
   * Dimensions are in inches. `jsPdfFormat` names the equivalent
   * standard paper format and is kept as documentation/for any future
   * jsPDF-based path; the current print-based export uses widthIn /
   * heightIn directly via `@page` CSS instead.
   * ------------------------------------------------------------------ */
  var PAPER_SIZES = {
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

  var DEFAULT_PAPER_KEY = 'a4';

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
    paperSize: DEFAULT_PAPER_KEY,
    fontSize: 16, // px
    lineHeight: 1.6, // unitless
    paragraphSpacing: '1rem', // CSS length (bottom margin on <p>)
    h1Size: 28, // px
    h1Weight: 700,
    h2Size: 22, // px
    h2Weight: 600,
    h3Size: 18, // px
    h3Weight: 600,
    baseWeight: 400, // regular body text weight
    boldWeight: 700, // <strong>/<b> weight
    marginVerticalIn: 0.75, // page margin, top/bottom, inches
    marginHorizontalIn: 0.75, // page margin, left/right, inches
    pageNumbersEnabled: false, // show a page number at the bottom-center of every page
    pageStartFrom: 1, // the number shown on the first page when page numbers are on
  };

  var DEFAULTS = Object.assign({}, HARDCODED_FALLBACK_DEFAULTS, window.MD2eBookDefaultConfig || {});

  var ALLOWED_BOLD_WEIGHTS = [600, 700, 800, 900];

  // Fonts that are loaded via Google Fonts in index.html and therefore
  // always render correctly regardless of the user's OS.
  var WEB_SAFE_GOOGLE_FONTS = {
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

  var FONT_STACKS = Object.assign({}, WEB_SAFE_GOOGLE_FONTS, SYSTEM_FONT_STACKS);

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------
   * PAGE_BREAK_MARKER / applyPageBreakMarkers(markdownText)
   * ------------------------------------------------------------------
   * Manual page breaks: a line containing only `\pagebreak` (optional
   * surrounding whitespace, its own line) forces a break at that point
   * in the document — the toolbar button above the editor (see App.jsx)
   * inserts exactly this. Handled as a markdown *preprocessing* step,
   * not a marked.js extension: swapped out for a standalone block of
   * raw HTML (`<div class="md2ebook-pagebreak"></div>`) before the text
   * ever reaches marked.parse(), padded with blank lines on both sides
   * so marked's block-level HTML detection reliably treats it as its
   * own block instead of folding it into a surrounding paragraph.
   * marked.js passes raw HTML blocks through untouched (same mechanism
   * already relied on elsewhere for pasted raw HTML), so this needs no
   * marked extension/plugin API at all. The div itself is zero-size —
   * see the .md2ebook-pagebreak CSS rule in generateStyleBlock — its
   * only job is to carry `break-before: page`, which both the export's
   * native Chrome print engine and the preview's Paged.js polyfill
   * honor directly (this is core CSS Fragmentation, the thing Paged.js
   * is fundamentally built to implement — unlike the reserved `page`
   * counter's `counter-reset` handling, which is a separate, documented
   * Paged.js bug elsewhere in this file).
   * ------------------------------------------------------------------ */
  var PAGE_BREAK_MARKER = '\\pagebreak';
  var PAGE_BREAK_LINE_RE = /^[ \t]*\\pagebreak[ \t]*$/gm;

  function applyPageBreakMarkers(markdownText) {
    return String(markdownText).replace(
      PAGE_BREAK_LINE_RE,
      '\n\n<div class="md2ebook-pagebreak"></div>\n\n'
    );
  }

  /* ------------------------------------------------------------------
   * normalizeConfig
   * ------------------------------------------------------------------
   * Takes the raw config object coming out of React state (where every
   * field is a free-form string that may be empty) and resolves it to a
   * fully-populated, typed config object. This is the single source of
   * truth for the "blank input -> default value" fallback logic.
   * ------------------------------------------------------------------ */
  function normalizeConfig(config) {
    config = config || {};

    var paperKey = PAPER_SIZES.hasOwnProperty(config.paperSize) ? config.paperSize : DEFAULT_PAPER_KEY;

    var fontFamilyRaw = isBlank(config.fontFamily) ? DEFAULTS.fontFamily : String(config.fontFamily).trim();

    return {
      fontFamily: fontFamilyRaw,
      fontStack: FONT_STACKS[fontFamilyRaw] || "'" + fontFamilyRaw + "', ui-sans-serif, system-ui, sans-serif",
      paperSize: paperKey,

      fontSize: toPositiveNumber(config.fontSize, DEFAULTS.fontSize),
      lineHeight: toPositiveNumber(config.lineHeight, DEFAULTS.lineHeight),
      paragraphSpacing: toCssLength(config.paragraphSpacing, DEFAULTS.paragraphSpacing),

      h1Size: toPositiveNumber(config.h1Size, DEFAULTS.h1Size),
      h1Weight: toNumber(config.h1Weight, DEFAULTS.h1Weight),
      h2Size: toPositiveNumber(config.h2Size, DEFAULTS.h2Size),
      h2Weight: toNumber(config.h2Weight, DEFAULTS.h2Weight),
      h3Size: toPositiveNumber(config.h3Size, DEFAULTS.h3Size),
      h3Weight: toNumber(config.h3Weight, DEFAULTS.h3Weight),

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
      pageNumbersEnabled: Boolean(
        isBlank(config.pageNumbersEnabled) ? DEFAULTS.pageNumbersEnabled : config.pageNumbersEnabled
      ),
      pageStartFrom: toPositiveInteger(config.pageStartFrom, DEFAULTS.pageStartFrom),

      filename: isBlank(config.filename) ? 'md-to-pdf-converter.pdf' : String(config.filename).trim(),
    };
  }

  /* ------------------------------------------------------------------
   * Style generation
   * ------------------------------------------------------------------
   * Produces the <style> block shared verbatim by the live preview
   * (iframe srcDoc) and the print window used for PDF export, so the
   * two are guaranteed to look identical.
   * ------------------------------------------------------------------ */
  function generateStyleBlock(normalized, paper) {
    var vars = [
      '--md2ebook-font-family: ' + normalized.fontStack + ';',
      '--md2ebook-font-size: ' + normalized.fontSize + 'px;',
      '--md2ebook-line-height: ' + normalized.lineHeight + ';',
      '--md2ebook-paragraph-spacing: ' + normalized.paragraphSpacing + ';',
      '--md2ebook-h1-size: ' + normalized.h1Size + 'px;',
      '--md2ebook-h1-weight: ' + normalized.h1Weight + ';',
      '--md2ebook-h2-size: ' + normalized.h2Size + 'px;',
      '--md2ebook-h2-weight: ' + normalized.h2Weight + ';',
      '--md2ebook-h3-size: ' + normalized.h3Size + 'px;',
      '--md2ebook-h3-weight: ' + normalized.h3Weight + ';',
      '--md2ebook-base-weight: ' + normalized.baseWeight + ';',
      '--md2ebook-bold-weight: ' + normalized.boldWeight + ';',
      '--md2ebook-page-width: ' + paper.widthIn + 'in;',
      '--md2ebook-page-height: ' + paper.heightIn + 'in;',
      '--md2ebook-page-margin-vertical: ' + normalized.marginVerticalIn + 'in;',
      '--md2ebook-page-margin-horizontal: ' + normalized.marginHorizontalIn + 'in;',
    ].join('\n      ');

    return (
      '\n    :root {\n      ' +
      vars +
      '\n    }\n\n' +
      "    * { box-sizing: border-box; }\n\n" +
      '    html, body {\n' +
      '      margin: 0;\n' +
      '      padding: 0;\n' +
      // Transparent, not a fixed color: for the live preview this lets
      // the app's own gray canvas backdrop show through as the gutter
      // around/between Paged.js's page boxes (see PreviewCanvas in
      // App.jsx). It's irrelevant for the real PDF export either way,
      // since exportToPdf's printOnlyCss always forces this to solid
      // white under @media print, overriding whatever is set here.
      '      background: transparent;\n' +
      '    }\n\n' +
      '    body {\n' +
      '      display: flex;\n' +
      '      justify-content: center;\n' +
      '    }\n\n' +
      '    .page {\n' +
      '      box-sizing: border-box;\n' +
      '      width: var(--md2ebook-page-width);\n' +
      '      min-height: var(--md2ebook-page-height);\n' +
      '      padding: var(--md2ebook-page-margin-vertical) var(--md2ebook-page-margin-horizontal);\n' +
      '      background: #ffffff;\n' +
      '      font-family: var(--md2ebook-font-family);\n' +
      '      font-size: var(--md2ebook-font-size);\n' +
      '      line-height: var(--md2ebook-line-height);\n' +
      '      font-weight: var(--md2ebook-base-weight);\n' +
      '      color: #1a1a1a;\n' +
      '      -webkit-font-smoothing: antialiased;\n' +
      '    }\n\n' +
      '    .page > *:first-child { margin-top: 0; }\n' +
      '    .page > *:last-child { margin-bottom: 0; }\n\n' +
      '    .page h1, .page h2, .page h3, .page h4, .page h5, .page h6 {\n' +
      '      font-family: var(--md2ebook-font-family);\n' +
      '      page-break-after: avoid;\n' +
      '      break-after: avoid;\n' +
      '      margin-top: 1.4em;\n' +
      '      margin-bottom: 0.6em;\n' +
      '    }\n\n' +
      '    .page h1 {\n' +
      '      font-size: var(--md2ebook-h1-size);\n' +
      '      font-weight: var(--md2ebook-h1-weight);\n' +
      '      line-height: 1.25;\n' +
      '      border-bottom: 2px solid #e2e8f0;\n' +
      '      padding-bottom: 0.3em;\n' +
      '    }\n\n' +
      '    .page h2 {\n' +
      '      font-size: var(--md2ebook-h2-size);\n' +
      '      font-weight: var(--md2ebook-h2-weight);\n' +
      '      line-height: 1.3;\n' +
      '    }\n\n' +
      '    .page h3 {\n' +
      '      font-size: var(--md2ebook-h3-size);\n' +
      '      font-weight: var(--md2ebook-h3-weight);\n' +
      '      line-height: 1.35;\n' +
      '    }\n\n' +
      '    .page h4 { font-size: calc(var(--md2ebook-h3-size) * 0.9); font-weight: var(--md2ebook-h3-weight); }\n\n' +
      '    .page p {\n' +
      '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
      '      orphans: 3;\n' +
      '      widows: 3;\n' +
      '    }\n\n' +
      '    .page strong, .page b {\n' +
      '      font-weight: var(--md2ebook-bold-weight);\n' +
      '    }\n\n' +
      '    .page em, .page i { font-style: italic; }\n\n' +
      '    .page a {\n' +
      '      color: #2563eb;\n' +
      '      text-decoration: underline;\n' +
      '      word-break: break-word;\n' +
      '    }\n\n' +
      '    .page ul, .page ol {\n' +
      '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
      '      padding-left: 1.6em;\n' +
      '    }\n\n' +
      '    .page li { margin-bottom: 0.35em; }\n' +
      '    .page li > ul, .page li > ol { margin-top: 0.35em; margin-bottom: 0; }\n\n' +
      '    .page hr {\n' +
      '      border: none;\n' +
      '      border-top: 1px solid #cbd5e1;\n' +
      '      margin: 2em 0;\n' +
      '    }\n\n' +
      '    .page blockquote {\n' +
      '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
      '      padding: 0.6em 1.2em;\n' +
      '      border-left: 4px solid #94a3b8;\n' +
      '      background: #f8fafc;\n' +
      '      color: #475569;\n' +
      '      font-style: italic;\n' +
      '      page-break-inside: avoid;\n' +
      '      break-inside: avoid;\n' +
      '    }\n\n' +
      '    .page blockquote p:last-child { margin-bottom: 0; }\n\n' +
      '    .page code {\n' +
      "      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n" +
      '      font-size: 0.88em;\n' +
      '      background: #f1f5f9;\n' +
      '      border: 1px solid #e2e8f0;\n' +
      '      border-radius: 4px;\n' +
      '      padding: 0.12em 0.4em;\n' +
      '    }\n\n' +
      '    .page pre {\n' +
      '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
      '      padding: 1em 1.2em;\n' +
      '      background: #0f172a;\n' +
      '      color: #e2e8f0;\n' +
      '      border-radius: 8px;\n' +
      '      overflow-x: auto;\n' +
      '      page-break-inside: avoid;\n' +
      '      break-inside: avoid;\n' +
      '    }\n\n' +
      '    .page pre code {\n' +
      '      background: transparent;\n' +
      '      border: none;\n' +
      '      padding: 0;\n' +
      '      font-size: 0.85em;\n' +
      '      color: inherit;\n' +
      '      line-height: 1.55;\n' +
      '    }\n\n' +
      '    .page table {\n' +
      '      width: 100%;\n' +
      '      border-collapse: collapse;\n' +
      '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
      '      font-size: 0.92em;\n' +
      '      page-break-inside: avoid;\n' +
      '      break-inside: avoid;\n' +
      '    }\n\n' +
      '    .page th, .page td {\n' +
      '      border: 1px solid #cbd5e1;\n' +
      '      padding: 0.5em 0.75em;\n' +
      '      text-align: left;\n' +
      '      vertical-align: top;\n' +
      '    }\n\n' +
      '    .page th {\n' +
      '      background: #f1f5f9;\n' +
      '      font-weight: var(--md2ebook-bold-weight);\n' +
      '    }\n\n' +
      '    .page tr:nth-child(even) td { background: #f8fafc; }\n\n' +
      '    .page img {\n' +
      '      max-width: 100%;\n' +
      '      height: auto;\n' +
      '      page-break-inside: avoid;\n' +
      '      break-inside: avoid;\n' +
      '    }\n\n' +
      // Manual page break, inserted by applyPageBreakMarkers() above in
      // place of a standalone `\pagebreak` line. Zero footprint of its
      // own (no height/margin/border) — it exists purely to carry the
      // break-before, so the content right after it is what visibly
      // starts the new page, with nothing before it shifted or spaced
      // out on the page it's leaving.
      '    .md2ebook-pagebreak {\n' +
      '      height: 0;\n' +
      '      margin: 0;\n' +
      '      padding: 0;\n' +
      '      border: 0;\n' +
      '      page-break-before: always;\n' +
      '      break-before: page;\n' +
      '    }\n\n' +
      '    @media print {\n' +
      '      html, body { background: #ffffff; }\n' +
      '      .page { box-shadow: none; }\n' +
      '      .page h1, .page h2, .page h3 { page-break-after: avoid; break-after: avoid; }\n' +
      '      .page pre, .page blockquote, .page table, .page img { page-break-inside: avoid; break-inside: avoid; }\n' +
      '      .md2ebook-pagebreak { page-break-before: always; break-before: page; }\n' +
      '    }\n'
    );
  }

  /* ------------------------------------------------------------------
   * buildPageBoxRule(parts) -> string
   * ------------------------------------------------------------------
   * The live preview paginates itself on screen using Paged.js (see the
   * comment on renderHtmlDocument below) instead of relying on the
   * browser's print engine. Paged.js reads an ordinary `@page` rule to
   * learn the physical page size/margin, exactly like exportToPdf's own
   * printOnlyCss does for the real print — but unlike printOnlyCss, this
   * one is NOT scoped to @media print, since Paged.js has to see it
   * during normal on-screen rendering. .page's own width/padding are
   * reset the same way exportToPdf resets them: once Paged.js is
   * chunking the content into physical page boxes, .page's own fixed
   * width/padding would just double up against the margin Paged.js is
   * already applying per page.
   * ------------------------------------------------------------------ */
  function buildPageBoxRule(parts) {
    var pageNumbers = buildPageNumberCss(parts.normalized);
    return (
      '\n@page {\n' +
      '  size: ' + parts.paper.widthIn + 'in ' + parts.paper.heightIn + 'in;\n' +
      '  margin: ' + parts.normalized.marginVerticalIn + 'in ' + parts.normalized.marginHorizontalIn + 'in;\n' +
      pageNumbers.marginBox +
      '}\n' +
      pageNumbers.rootReset +
      pageNumbers.overrideRule +
      '.page {\n' +
      '  width: 100%;\n' +
      '  min-height: 0;\n' +
      '  padding: 0;\n' +
      '  box-shadow: none;\n' +
      '}\n' +
      // Paged.js wraps each physical page in a .pagedjs_page box and
      // ships its own internal stylesheet for sizing/positioning them —
      // that stylesheet is injected into the document *after* this one
      // (once Paged.js actually runs), so a plain margin rule here with
      // no !important loses the cascade to it and has no visible effect
      // (confirmed: pages rendered flush together with no gap at all).
      // !important forces this rule to win regardless of load order.
      // Both a gap (margin) and a visible seam (border) are added so
      // pages read as distinct sheets even if one of the two properties
      // ever gets overridden the same way.
      '.pagedjs_page {\n' +
      '  margin-bottom: 24px !important;\n' +
      '  border-bottom: 3px solid #4b4b4b !important;\n' +
      '}\n'
    );
  }

  /* ------------------------------------------------------------------
   * buildPageNumberCss(normalized) -> string
   * ------------------------------------------------------------------
   * Page numbers are implemented with plain CSS Paged Media — an
   * @page margin box (@bottom-center) plus the UA-reserved `page`
   * counter, which every physical page increments automatically.
   * Verified directly (rendered a real multi-page PDF and inspected
   * it) that Chrome's own print/PDF pipeline supports @bottom-center +
   * counter(page) with no extra library, and that `counter-reset: page
   * N` on the root element is what controls the *starting* number (set
   * to one less than the desired first-page number, since the UA
   * increments it before the first page is drawn). Returns '' when
   * page numbers are off, so nothing is added to the stylesheet.
   *
   * NOTE for the live preview specifically: the preview paginates with
   * Paged.js, a JS polyfill of this same CSS spec, and Paged.js has a
   * confirmed upstream bug (pagedjs/pagedjs#43, pagedjs gitlab#91)
   * where `counter-reset: page N` is silently ignored — the page
   * counter it renders always starts from its own internal default,
   * regardless of this CSS. (I also tried scoping the reset to the
   * document's own wrapper div instead of `html`, reasoning Paged.js
   * might pick that up — real-PDF testing showed that variant broke
   * the *native* Chrome print path too, which does honor `html`. So
   * `html` is kept here — correct for export — and renderHtmlDocument's
   * pagination script below carries a separate, JS-based fix that
   * overwrites the *displayed* page-number text after Paged.js finishes
   * laying out the preview, rather than depending on Paged.js's own
   * (buggy) counter handling.)
   * ------------------------------------------------------------------ */
  function buildPageNumberCss(normalized) {
    if (!normalized.pageNumbersEnabled) return { marginBox: '', rootReset: '', overrideRule: '' };
    return {
      marginBox:
        '  @bottom-center {\n' +
        '    content: counter(page);\n' +
        '    font-family: ' + normalized.fontStack + ';\n' +
        '    font-size: 10pt;\n' +
        '    color: #6b7280;\n' +
        '  }\n',
      rootReset: 'html { counter-reset: page ' + (normalized.pageStartFrom - 1) + '; }\n',
      // Only consumed by the live preview (buildPageBoxRule) — see the
      // pagination script in renderHtmlDocument for what actually sets
      // the data-md2ebook-pagenum attribute this targets. Harmless if
      // ever included elsewhere: with no matching attribute present,
      // this rule simply never matches anything.
      overrideRule:
        '.pagedjs_margin-content[data-md2ebook-pagenum]::after {\n' +
        '  content: attr(data-md2ebook-pagenum) !important;\n' +
        '}\n',
    };
  }

  function googleFontLinkTag(fontFamily) {
    if (WEB_SAFE_GOOGLE_FONTS.hasOwnProperty(fontFamily)) {
      var family = fontFamily.replace(/ /g, '+');
      return (
        '<link rel="preconnect" href="https://fonts.googleapis.com">' +
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
        '<link href="https://fonts.googleapis.com/css2?family=' +
        family +
        ':wght@400;600;700;800;900&display=swap" rel="stylesheet">'
      );
    }
    return '';
  }

  /* ------------------------------------------------------------------
   * buildDocumentParts
   * ------------------------------------------------------------------
   * Shared groundwork used by both renderHtmlDocument and exportToPdf so
   * the two never drift out of sync.
   * ------------------------------------------------------------------ */
  function buildDocumentParts(markdownText, config) {
    var normalized = normalizeConfig(config);
    var paper = PAPER_SIZES[normalized.paperSize] || PAPER_SIZES[DEFAULT_PAPER_KEY];
    var styleText = generateStyleBlock(normalized, paper);

    var bodyHtml = '';
    if (typeof window.marked !== 'undefined') {
      var markedFn =
        typeof window.marked.parse === 'function' ? window.marked.parse : window.marked;
      try {
        if (window.marked.setOptions) {
          window.marked.setOptions({ breaks: false, gfm: true });
        }
      } catch (e) {
        /* older marked builds may not expose setOptions the same way */
      }
      bodyHtml = markedFn(applyPageBreakMarkers(markdownText || ''));
    } else {
      // Extremely defensive fallback if marked.js failed to load for any
      // reason — avoids a hard crash and shows the raw text instead. The
      // \pagebreak marker isn't specially handled here: without marked
      // there's no HTML structure to break, so it's left visible as
      // plain text in the <pre> block along with everything else.
      bodyHtml = '<pre>' + escapeHtml(markdownText || '') + '</pre>';
    }

    return {
      normalized: normalized,
      paper: paper,
      styleText: styleText,
      bodyHtml: bodyHtml,
    };
  }

  /* ------------------------------------------------------------------
   * renderHtmlDocument(markdownText, config) -> string
   * ------------------------------------------------------------------
   * Returns a complete, self-contained HTML document string (doctype,
   * head with inline <style>, body with the rendered .page). Intended
   * for use as an <iframe srcDoc="..."> for the live preview, but is
   * equally valid saved standalone as an .html file.
   *
   * The browser only ever applies @page/page-break rules during an
   * actual print — never during normal on-screen layout — so without
   * help, this document would always render as one continuous
   * scrolling page with no visible page breaks, even though the PDF
   * export (which drives the real print engine) is fully paginated.
   * To make the preview show real page boundaries, this document loads
   * Paged.js (https://pagedjs.org), a JS polyfill for the CSS Paged
   * Media spec: it reads the exact same @page size/margin (see
   * buildPageBoxRule above) and the same break-avoid rules already in
   * styleText, and physically re-chunks the content into a stack of
   * page boxes on screen — so what you see here matches what the PDF
   * export produces, not an approximation.
   *
   * Once Paged.js finishes pagination it calls the `after` hook below,
   * which posts the final rendered height and page count back to the
   * parent app via window.postMessage (see PreviewCanvas in App.jsx) —
   * the parent can't just reach into this document directly to measure
   * it, because doing so would require the `allow-same-origin` sandbox
   * flag alongside `allow-scripts`, and combining those two specific
   * flags would let a script smuggled in through pasted raw HTML escape
   * this iframe and manipulate the parent app itself. Left as
   * scripts-only, this document keeps its own separate, opaque origin,
   * so anything running in it is confined here and can only talk back
   * to the parent through postMessage. A plain `window.onload` listener
   * also posts a first, rough (unpaginated) height immediately, purely
   * as a fallback in case Paged.js itself can't load (e.g. offline) —
   * it's superseded by Paged.js's own accurate measurement moments
   * later on the normal path.
   * ------------------------------------------------------------------ */
  function renderHtmlDocument(markdownText, config) {
    var parts = buildDocumentParts(markdownText, config);

    var paginationScript =
      '<script>\n' +
      '  window.PagedConfig = {\n' +
      '    after: function (flow) {\n' +
      // Page numbers: Paged.js's own handling of `counter-reset: page N`
      // (see buildPageNumberCss's rootReset above) is a confirmed
      // upstream bug — it silently ignores a custom starting number and
      // always counts from its own internal default, so every page here
      // would show the wrong number if left to Paged.js alone. Since
      // Paged.js *does* correctly build one physical page box per page
      // (.pagedjs_page, in document order) and one margin-box content
      // element per page for @bottom-center, the fix is to bypass its
      // counter handling entirely for display purposes: once layout is
      // done, walk the actual rendered pages in order and stamp each
      // one's margin box with the correct number ourselves, via a
      // data attribute + a `content: attr(...)` CSS rule (see
      // buildPageNumberCss's overrideRule) that wins over Paged.js's own
      // `content: counter(page)` rule. This runs after Paged.js has
      // finished, so it reflects the real physical page count/order
      // rather than guessing at it.
      '      try {\n' +
      (parts.normalized.pageNumbersEnabled
        ? '        var __pages = document.querySelectorAll(".pagedjs_page");\n' +
          '        for (var __i = 0; __i < __pages.length; __i++) {\n' +
          '          var __box = __pages[__i].querySelector(".pagedjs_margin-bottom-center .pagedjs_margin-content");\n' +
          '          if (__box) {\n' +
          '            __box.setAttribute("data-md2ebook-pagenum", String(' +
          parts.normalized.pageStartFrom +
          ' + __i));\n' +
          '          }\n' +
          '        }\n'
        : '') +
      '      } catch (e) {}\n' +
      '      try {\n' +
      '        window.parent.postMessage({\n' +
      "          source: 'md2ebook-pagedjs',\n" +
      '          pageCount: flow && flow.total,\n' +
      '          height: document.documentElement.scrollHeight\n' +
      "        }, '*');\n" +
      '      } catch (e) {}\n' +
      '    }\n' +
      '  };\n' +
      "  window.addEventListener('load', function () {\n" +
      '    try {\n' +
      '      window.parent.postMessage({\n' +
      "        source: 'md2ebook-pagedjs',\n" +
      '        pageCount: null,\n' +
      '        height: document.documentElement.scrollHeight\n' +
      "      }, '*');\n" +
      '    } catch (e) {}\n' +
      '  });\n' +
      '</script>\n' +
      '<script src="https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.js"></script>\n';

    return (
      '<!DOCTYPE html>\n' +
      '<html lang="en">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>Md to PDF Converter — Preview</title>\n' +
      '  ' +
      googleFontLinkTag(parts.normalized.fontFamily) +
      '\n' +
      '  <style>' +
      parts.styleText +
      buildPageBoxRule(parts) +
      '  </style>\n' +
      '  ' +
      paginationScript +
      '</head>\n' +
      '<body>\n' +
      '  <div class="page md2ebook-doc">' +
      parts.bodyHtml +
      '</div>\n' +
      '</body>\n' +
      '</html>'
    );
  }

  /* ------------------------------------------------------------------
   * renderRasterizationDocument(markdownText, config) -> string
   * ------------------------------------------------------------------
   * Used only by "Send to ZineArranger" (see handleSendToZineArranger in
   * App.jsx) — a from-scratch sibling of renderHtmlDocument, NOT a
   * variant fed through the live preview's own iframe. ZineArranger
   * needs an actual PDF (real bytes to hand off via postMessage, exactly
   * like ZEditor's own "Send to ZineArranger"), but this app's normal
   * export has no PDF bytes anywhere in JS to give it — exportToPdf
   * above hands the document to the browser's native print engine
   * instead, which never returns anything back to script. Getting real
   * bytes here means rendering the document ourselves, page by page,
   * and rasterizing it — the very approach exportToPdf's own comment
   * explains was dropped for the main export, for a well-documented
   * html2canvas bug: an element rendered far off-screen (the standard
   * "hidden export copy" trick) gets captured at the wrong offset.
   *
   * That bug is specifically about html2canvas measuring *its own
   * document's* scroll/viewport position — it has nothing to do with
   * where the iframe *element* sits on the outer page. So instead of
   * rasterizing a hidden div positioned off-screen within this app's own
   * document (the old, bug-prone approach), this renders into a
   * completely separate nested document — same as the live preview's
   * `srcDoc` iframe — and does the html2canvas capture *from inside
   * that document*, against its own normal in-flow layout (Paged.js
   * lays out physical pages top-to-bottom starting at its own origin,
   * never off-screen). Wherever the outer <iframe> element itself is
   * positioned in THIS document (handleSendToZineArranger tucks it off
   * the visible page) is irrelevant to that capture.
   *
   * Reuses buildDocumentParts/buildPageBoxRule and the Paged.js-based
   * pagination approach documented on renderHtmlDocument above, with
   * three differences: buildPageBoxRuleForCapture drops the live
   * preview's visual page-separator styling (a border baked into
   * .pagedjs_page would otherwise show up along the bottom edge of every
   * captured page image); the pagination script's `after` hook captures
   * and posts back rasterized page images instead of just a height/page
   * count; and the body HTML is run through DOMPurify first.
   *
   * That last one is required, not optional: html2canvas confirmed hangs
   * indefinitely inside an opaque-origin iframe (the live preview's own
   * `sandbox="allow-scripts"`, no `allow-same-origin`), so
   * handleSendToZineArranger grants this iframe `allow-same-origin` too.
   * Without the live preview's opaque origin standing between it and the
   * parent, a <script> smuggled through pasted raw HTML (marked.js
   * passes raw HTML through by default) would otherwise be able to reach
   * out via `allow-same-origin` and manipulate this app directly.
   * DOMPurify strips that content outright before it ever reaches the
   * iframe, which holds regardless of sandboxing — a stronger guarantee
   * than isolation alone, and what makes allow-same-origin safe to grant
   * here specifically.
   * ------------------------------------------------------------------ */
  function buildPageBoxRuleForCapture(parts) {
    var pageNumbers = buildPageNumberCss(parts.normalized);
    return (
      '\n@page {\n' +
      '  size: ' + parts.paper.widthIn + 'in ' + parts.paper.heightIn + 'in;\n' +
      '  margin: ' + parts.normalized.marginVerticalIn + 'in ' + parts.normalized.marginHorizontalIn + 'in;\n' +
      pageNumbers.marginBox +
      '}\n' +
      pageNumbers.rootReset +
      pageNumbers.overrideRule +
      '.page {\n' +
      '  width: 100%;\n' +
      '  min-height: 0;\n' +
      '  padding: 0;\n' +
      '  box-shadow: none;\n' +
      '}\n' +
      // No visible seam between pages here (unlike buildPageBoxRule) —
      // each .pagedjs_page is captured on its own as one PDF page, so a
      // border baked into its own box would bake a stray line into the
      // exported image instead of just separating pages on screen.
      '.pagedjs_page {\n' +
      '  margin-bottom: 0 !important;\n' +
      '  border-bottom: none !important;\n' +
      '}\n'
    );
  }

  function renderRasterizationDocument(markdownText, config) {
    var parts = buildDocumentParts(markdownText, config);
    // See the comment above — this iframe runs with allow-same-origin
    // (unlike the live preview's), so sanitizing here is the thing that
    // actually keeps a smuggled <script> in pasted raw HTML from
    // reaching out to the parent app, not the sandbox by itself.
    var sanitizedBodyHtml = DOMPurify.sanitize(parts.bodyHtml);

    var script =
      '<script>\n' +
      '  window.PagedConfig = {\n' +
      '    after: function (flow) {\n' +
      '      try {\n' +
      (parts.normalized.pageNumbersEnabled
        ? '        var __pages = document.querySelectorAll(".pagedjs_page");\n' +
          '        for (var __i = 0; __i < __pages.length; __i++) {\n' +
          '          var __box = __pages[__i].querySelector(".pagedjs_margin-bottom-center .pagedjs_margin-content");\n' +
          '          if (__box) {\n' +
          '            __box.setAttribute("data-md2ebook-pagenum", String(' +
          parts.normalized.pageStartFrom +
          ' + __i));\n' +
          '          }\n' +
          '        }\n'
        : '') +
      '      } catch (e) {}\n' +
      '      var pages = document.querySelectorAll(".pagedjs_page");\n' +
      '      var images = [];\n' +
      '      var i = 0;\n' +
      '      function fail(err) {\n' +
      '        try {\n' +
      '          window.parent.postMessage({ source: "md2ebook-rasterize", error: String((err && err.message) || err) }, "*");\n' +
      '        } catch (e) {}\n' +
      '      }\n' +
      '      function captureNext() {\n' +
      '        if (i >= pages.length) {\n' +
      '          try {\n' +
      '            var buffers = images.map(function (b) { return b.buffer; });\n' +
      '            window.parent.postMessage({\n' +
      '              source: "md2ebook-rasterize",\n' +
      '              images: images,\n' +
      '              widthIn: ' + parts.paper.widthIn + ',\n' +
      '              heightIn: ' + parts.paper.heightIn + '\n' +
      '            }, "*", buffers);\n' +
      '          } catch (e) { fail(e); }\n' +
      '          return;\n' +
      '        }\n' +
      // scale: 2 renders at ~192 DPI (double the 96 DPI the page is laid
      // out at) — sharp enough for print without the file size a much
      // higher factor would add.
      '        html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true })\n' +
      '          .then(function (canvas) { return new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); }); })\n' +
      '          .then(function (blob) { return blob.arrayBuffer(); })\n' +
      '          .then(function (buffer) { images.push({ buffer: buffer }); i++; captureNext(); })\n' +
      '          .catch(fail);\n' +
      '      }\n' +
      '      try { captureNext(); } catch (e) { fail(e); }\n' +
      '    }\n' +
      '  };\n' +
      '</script>\n' +
      '<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>\n' +
      '<script src="https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.js"></script>\n';

    return (
      '<!DOCTYPE html>\n' +
      '<html lang="en">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <title>Md to PDF Converter — Export</title>\n' +
      '  ' +
      googleFontLinkTag(parts.normalized.fontFamily) +
      '\n' +
      '  <style>' +
      parts.styleText +
      buildPageBoxRuleForCapture(parts) +
      '  </style>\n' +
      '  ' +
      script +
      '</head>\n' +
      '<body>\n' +
      '  <div class="page md2ebook-doc">' +
      sanitizedBodyHtml +
      '</div>\n' +
      '</body>\n' +
      '</html>'
    );
  }

  /* ------------------------------------------------------------------
   * exportToPdf(markdownText, config) -> Promise<void>
   * ------------------------------------------------------------------
   * Renders the document into a hidden, offscreen <iframe> sized to the
   * selected paper format, then calls print() on that iframe's own
   * window — which opens the browser's native print dialog scoped to
   * just that iframe's content, where the user picks "Save as PDF" (or
   * a physical printer) as the destination.
   *
   * This used to be implemented with html2pdf.js (html2canvas rasterizing
   * the page to an image, then jsPDF assembling that image into a PDF).
   * That approach turned out to be unreliable in practice: html2canvas
   * has a well-documented bug where an element rendered far off-screen
   * (the standard trick used to build a "hidden" export copy) gets
   * captured at the wrong horizontal offset, producing mostly-blank
   * pages with only a clipped sliver of content along one edge.
   *
   * An earlier version of this function opened the print document in a
   * new popup window (window.open) instead of a hidden iframe. That also
   * turned out to be unreliable: some browsers apply much stricter popup
   * heuristics to pages opened from file:// (as opposed to http/https),
   * blocking window.open() even when it's called synchronously from a
   * click handler, which produced a "your browser blocked the print
   * window" error on an ordinary click. A hidden iframe sidesteps that
   * entirely — appending an <iframe> to the page is a normal DOM
   * mutation, not a new browsing context/window, so it is never subject
   * to popup blocking, on file:// or anywhere else.
   *
   * The browser's own print engine is also a strictly better fit for a
   * paginated document like this one than html2canvas was: it produces
   * real vector, selectable text (not a blurry raster image), it applies
   * the exact same page-break CSS we already ship (headings avoid
   * breaking, code/blockquotes/tables never split across pages), and it
   * needs no extra rasterization library at all. `@page` CSS is set to
   * the exact paper dimensions the user picked, with zero print margin —
   * the visual margin comes from the .page element's own padding, so it
   * renders identically to the live preview.
   * ------------------------------------------------------------------ */
  function exportToPdf(markdownText, config) {
    return new Promise(function (resolve, reject) {
      var parts;
      try {
        parts = buildDocumentParts(markdownText, config);
      } catch (err) {
        reject(err);
        return;
      }

      var docTitle = parts.normalized.filename.replace(/\.pdf$/i, '') || 'Md to PDF Converter';

      // The live preview renders the whole document as one continuous,
      // unpaginated box, so its margin is implemented as padding on
      // .page (see generateStyleBlock above) — that's correct for a
      // single flowing box, but wrong for real pagination: padding on
      // an element only applies at the very start/end of that element,
      // not once per physical sheet it gets split across, so a
      // multi-page document printed that way gets a margin on page 1's
      // top and the last page's bottom, but none on the page breaks in
      // between (content runs edge-to-edge there).
      //
      // The fix is to use CSS's native `@page { margin: ... }` instead,
      // which the browser reapplies to every physical page automatically
      // during pagination — and to zero out .page's own padding here (in
      // print only) so the margin isn't effectively doubled on the first
      // page. .page's width is also switched from a fixed absolute page
      // width to 100%, since the printable area @page's margin leaves
      // available is already inset by that margin — keeping a fixed full
      // page width here would overflow/clip past the margin instead of
      // filling the printable area.
      var pageNumbers = buildPageNumberCss(parts.normalized);

      var printOnlyCss =
        '\n@page {\n' +
        '  size: ' +
        parts.paper.widthIn +
        'in ' +
        parts.paper.heightIn +
        'in;\n' +
        '  margin: ' +
        parts.normalized.marginVerticalIn +
        'in ' +
        parts.normalized.marginHorizontalIn +
        'in;\n' + // 2-value shorthand: vertical (top/bottom), then horizontal (left/right)
        pageNumbers.marginBox +
        '}\n' +
        pageNumbers.rootReset +
        '@media print {\n' +
        '  html, body { margin: 0; padding: 0; background: #ffffff; }\n' +
        '  .page {\n' +
        '    width: 100%;\n' +
        '    min-height: 0;\n' +
        '    padding: 0;\n' +
        '    box-shadow: none;\n' +
        '  }\n' +
        '}\n';

      var printDoc =
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '<meta charset="UTF-8">\n' +
        '<title>' +
        escapeHtml(docTitle) +
        '</title>\n' +
        googleFontLinkTag(parts.normalized.fontFamily) +
        '\n' +
        '<style>' +
        parts.styleText +
        printOnlyCss +
        '</style>\n' +
        '</head>\n' +
        '<body>\n' +
        '<div class="page md2ebook-doc">' +
        parts.bodyHtml +
        '</div>\n' +
        '</body>\n' +
        '</html>';

      var iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      // Sandboxed to block any <script> a pasted-in markdown document
      // might smuggle in via raw HTML (marked.js passes raw HTML
      // through by default) — allow-same-origin lets us read
      // document.fonts off it, allow-modals lets it actually open the
      // print dialog (per spec, print() counts as a "modal" action and
      // is blocked by sandboxing unless explicitly allowed).
      iframe.setAttribute('sandbox', 'allow-same-origin allow-modals');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';

      var settled = false;
      var cleanupTimer = null;

      function cleanup() {
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
          cleanupTimer = null;
        }
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }

      function settleResolve() {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      }

      function settleReject(err) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      }

      iframe.onload = function () {
        var win;
        try {
          win = iframe.contentWindow;
          if (!win) throw new Error('Could not access the print preview frame.');
        } catch (err) {
          settleReject(err);
          return;
        }

        var doc = iframe.contentDocument;
        var fontsReady = doc && doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();

        fontsReady
          .catch(function () {
            /* proceed even if font-loading readiness can't be determined */
          })
          .then(function () {
            setTimeout(function () {
              try {
                function onAfterPrint() {
                  win.removeEventListener('afterprint', onAfterPrint);
                  settleResolve();
                }
                win.addEventListener('afterprint', onAfterPrint);
                win.focus();
                win.print();
                // Safety net: a few browsers don't reliably fire
                // "afterprint" for an iframe's window, which would leave
                // the hidden iframe (and an unresolved promise) behind
                // forever. Clean up on a generous timeout regardless.
                cleanupTimer = setTimeout(settleResolve, 60000);
              } catch (err) {
                settleReject(err);
              }
            }, 150);
          });
      };

      iframe.onerror = function () {
        settleReject(new Error('The print preview frame failed to load.'));
      };

      document.body.appendChild(iframe);
      iframe.srcdoc = printDoc;
    });
  }

  /* ------------------------------------------------------------------
   * requireGlobal(name, featureLabel)
   * ------------------------------------------------------------------
   * convertDocxToMarkdown/convertEpubToMarkdown depend on CDN-loaded
   * libraries that, unlike marked.js, aren't needed for the app to
   * work at all — only if the user actually imports one of those
   * formats. If one failed to load (no internet the first time, a
   * blocked request, an ad blocker), calling it directly would throw
   * an opaque "X is not a function" deep inside this file. This turns
   * that into one clear, actionable error message instead.
   * ------------------------------------------------------------------ */
  function requireGlobal(name, featureLabel) {
    if (typeof window[name] === 'undefined') {
      throw new Error(
        featureLabel + ' needs the "' + name + '" library, which did not load ' +
        '(this app loads it from a CDN, so it needs internet access the first ' +
        'time). Try again once you are online, or reload the page.'
      );
    }
    return window[name];
  }

  /* ------------------------------------------------------------------
   * htmlToMarkdown(html)
   * ------------------------------------------------------------------
   * Shared HTML -> Markdown step for both the .docx and .epub import
   * paths below (mammoth.js and the unzipped EPUB chapters both land
   * as HTML first; this is where both convert the rest of the way).
   * ------------------------------------------------------------------ */
  function htmlToMarkdown(html) {
    var TurndownService = requireGlobal('TurndownService', 'Document import');
    var td = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    });
    return td.turndown(html || '');
  }

  /* ------------------------------------------------------------------
   * convertMuseToMarkdown(museText)
   * ------------------------------------------------------------------
   * Hand-written, line-based translation from Muse (the lightweight
   * markup language from Emacs Muse / Text::Amuse) to Markdown — there
   * is no maintained JS library for Muse, unlike docx/epub below.
   * Covers the constructs in common everyday use: headings (1-5 `*` at
   * the start of a line), bold/italic (already valid Markdown syntax,
   * left as-is), underline (`_x_`, converted to `<u>x</u>` since
   * Markdown has no native underline, but marked.js — this app's
   * renderer — passes raw inline HTML straight through), inline
   * teletype (`=x=` -> `` `x` ``), `[[url][description]]` / `[[url]]`
   * links, unordered/ordered lists, horizontal rules, blockquotes
   * (indented text), and <example>/<verbatim> blocks (-> fenced code).
   * Directives this doesn't recognize (footnotes, tables, definition
   * lists, `#title`/`#author` headers) are passed through unchanged
   * rather than mangled, so at worst they need manual cleanup after
   * import instead of silently losing content.
   * ------------------------------------------------------------------ */
  function convertMuseInline(s) {
    var result = String(s);

    // Links: [[url][description]] or [[url]] -> Markdown [text](url).
    result = result.replace(/\[\[([^\]\[]+)\]\[([^\]\[]+)\]\]/g, '[$2]($1)');
    result = result.replace(/\[\[([^\]\[]+)\]\]/g, '[$1]($1)');

    // Underline has no Markdown equivalent — kept as real underline via
    // raw HTML rather than silently becoming italic or disappearing.
    result = result.replace(/_([^_]+)_/g, '<u>$1</u>');

    // Inline teletype/fixed-width -> Markdown inline code.
    result = result.replace(/=([^=]+)=/g, '`$1`');

    // *emphasis*, **strong**, ***both*** are already valid Markdown
    // syntax as-is — no conversion needed for those.
    return result;
  }

  function convertMuseToMarkdown(museText) {
    var text = String(museText || '').replace(/\r\n?/g, '\n');
    var lines = text.split('\n');
    var out = [];
    var inBlock = false; // inside <example>...</example> or <verbatim>...</verbatim>

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (/^\s*<(example|verbatim)>\s*$/i.test(line)) {
        inBlock = true;
        out.push('```');
        continue;
      }
      if (/^\s*<\/(example|verbatim)>\s*$/i.test(line)) {
        inBlock = false;
        out.push('```');
        continue;
      }
      if (inBlock) {
        out.push(line);
        continue;
      }

      // Directive lines (#title, #author, ...) and blank lines pass
      // through untouched.
      if (line.trim() === '' || /^#\w+\s/.test(line)) {
        out.push(line);
        continue;
      }

      // Horizontal rule: 4+ hyphens alone on a line.
      if (/^-{4,}\s*$/.test(line)) {
        out.push('---');
        continue;
      }

      // Headings: 1-5 leading asterisks + a space, at column 0.
      var headingMatch = line.match(/^(\*{1,5})\s+(.*)$/);
      if (headingMatch) {
        var level = Math.min(headingMatch[1].length, 6);
        out.push(new Array(level + 1).join('#') + ' ' + convertMuseInline(headingMatch[2]));
        continue;
      }

      // Unordered list item: optionally-indented "- ".
      var ulMatch = line.match(/^(\s*)-\s+(.*)$/);
      if (ulMatch) {
        out.push(ulMatch[1] + '- ' + convertMuseInline(ulMatch[2]));
        continue;
      }

      // Ordered list item: optionally-indented "1. ", "2. ", etc.
      var olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (olMatch) {
        out.push(olMatch[1] + olMatch[2] + '. ' + convertMuseInline(olMatch[3]));
        continue;
      }

      // Blockquote: text indented two or more spaces (and not one of
      // the list forms just checked) reads as quoted in Muse.
      if (/^ {2,}\S/.test(line)) {
        out.push('> ' + convertMuseInline(line.trim()));
        continue;
      }

      out.push(convertMuseInline(line));
    }

    return out.join('\n');
  }

  /* ------------------------------------------------------------------
   * convertDocxToMarkdown(arrayBuffer)
   * ------------------------------------------------------------------
   * mammoth.js unpacks the .docx directly into HTML (headings, lists,
   * bold/italic, tables translate reasonably well; footnotes, tracked
   * changes, and embedded objects don't survive), which then goes
   * through the same htmlToMarkdown() step as the EPUB path below.
   * ------------------------------------------------------------------ */
  function convertDocxToMarkdown(arrayBuffer) {
    var mammoth = requireGlobal('mammoth', 'Word (.docx) import');
    return mammoth.convertToHtml({ arrayBuffer: arrayBuffer }).then(function (result) {
      return htmlToMarkdown(result.value);
    });
  }

  /* ------------------------------------------------------------------
   * convertEpubToMarkdown(arrayBuffer)
   * ------------------------------------------------------------------
   * An EPUB is a zip of individual XHTML chapter files plus a manifest
   * (the OPF file, pointed to by META-INF/container.xml) that lists
   * every file and the spine — the chapters' actual reading order.
   * This unzips it (JSZip), reads the spine in order, converts each
   * chapter's HTML to Markdown (already-structured HTML, so fidelity
   * here is better than the raw-text-only PDF path this app doesn't
   * have), and joins the chapters with the same manual page-break
   * marker the toolbar's "+ Page Break" button inserts — so a
   * multi-chapter book imports as one continuous document that still
   * paginates the way the original chapters did.
   * ------------------------------------------------------------------ */
  function convertEpubToMarkdown(arrayBuffer) {
    var JSZip = requireGlobal('JSZip', 'EPUB import');

    return JSZip.loadAsync(arrayBuffer).then(function (zip) {
      var containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) {
        throw new Error('This file does not look like a valid EPUB (missing META-INF/container.xml).');
      }

      return containerFile.async('string').then(function (containerXml) {
        var containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
        var rootfileEl = containerDoc.querySelector('rootfile');
        var rootfilePath = rootfileEl ? rootfileEl.getAttribute('full-path') : null;
        if (!rootfilePath) {
          throw new Error('Could not find the EPUB\'s content file (rootfile) in container.xml.');
        }

        var opfFile = zip.file(rootfilePath);
        if (!opfFile) {
          throw new Error('The EPUB\'s content file ("' + rootfilePath + '") is missing from the archive.');
        }
        var opfDir = rootfilePath.indexOf('/') > -1
          ? rootfilePath.slice(0, rootfilePath.lastIndexOf('/') + 1)
          : '';

        return opfFile.async('string').then(function (opfText) {
          var opfDoc = new DOMParser().parseFromString(opfText, 'application/xml');

          var manifest = {};
          var manifestItems = opfDoc.querySelectorAll('manifest > item');
          for (var m = 0; m < manifestItems.length; m++) {
            manifest[manifestItems[m].getAttribute('id')] = manifestItems[m].getAttribute('href');
          }

          var spineEls = opfDoc.querySelectorAll('spine > itemref');
          var spinePaths = [];
          for (var s = 0; s < spineEls.length; s++) {
            var href = manifest[spineEls[s].getAttribute('idref')];
            if (href) spinePaths.push(opfDir + href);
          }
          if (spinePaths.length === 0) {
            throw new Error('This EPUB\'s spine (chapter reading order) is empty or could not be read.');
          }

          var chapterPromises = spinePaths.map(function (path) {
            var file = zip.file(path) || zip.file(decodeURIComponent(path));
            if (!file) return Promise.resolve('');
            return file.async('string').then(function (xhtml) {
              // Parsed as text/html (not application/xhtml+xml): more
              // forgiving of the slightly-malformed markup real-world
              // EPUBs sometimes ship, while still giving a normal DOM
              // to read .body.innerHTML from.
              var doc = new DOMParser().parseFromString(xhtml, 'text/html');
              return doc.body ? htmlToMarkdown(doc.body.innerHTML).trim() : '';
            });
          });

          return Promise.all(chapterPromises).then(function (chapters) {
            return chapters.filter(Boolean).join('\n\n' + PAGE_BREAK_MARKER + '\n\n');
          });
        });
      });
    });
  }

  window.MD2eBook = {
    PAPER_SIZES: PAPER_SIZES,
    FONT_STACKS: FONT_STACKS,
    DEFAULTS: DEFAULTS,
    ALLOWED_BOLD_WEIGHTS: ALLOWED_BOLD_WEIGHTS,
    normalizeConfig: normalizeConfig,
    renderHtmlDocument: renderHtmlDocument,
    renderRasterizationDocument: renderRasterizationDocument,
    exportToPdf: exportToPdf,
    convertMuseToMarkdown: convertMuseToMarkdown,
    convertDocxToMarkdown: convertDocxToMarkdown,
    convertEpubToMarkdown: convertEpubToMarkdown,
  };
})(window);
