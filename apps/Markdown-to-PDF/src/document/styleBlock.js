// The document's CSS: typography, headings, page box (@page), margins and page numbers.

/* ------------------------------------------------------------------
 * Style generation
 * ------------------------------------------------------------------
 * Produces the <style> block shared verbatim by the live preview
 * (iframe srcDoc) and the print window used for PDF export, so the
 * two are guaranteed to look identical.
 * ------------------------------------------------------------------ */
// The rule drawn beneath a heading (H1 has always had one; H2/H3 can
// now opt in). Off means no border and no extra padding to hold it.
function headingRule(on) {
  return on
    ? '      border-bottom: 2px solid #e2e8f0;\n      padding-bottom: 0.3em;\n'
    : '      border-bottom: none;\n      padding-bottom: 0;\n';
}

export function generateStyleBlock(normalized, paper) {
  var vars = [
    '--md2ebook-font-family: ' + normalized.fontStack + ';',
    '--md2ebook-heading-font-family: ' + normalized.headingFontStack + ';',
    '--md2ebook-text-align: ' + normalized.textAlign + ';',
    '--md2ebook-h1-text-align: ' + normalized.h1TextAlign + ';',
    '--md2ebook-h2-text-align: ' + normalized.h2TextAlign + ';',
    '--md2ebook-h3-text-align: ' + normalized.h3TextAlign + ';',
    '--md2ebook-font-size: ' + normalized.fontSize + 'px;',
    '--md2ebook-line-height: ' + normalized.lineHeight + ';',
    '--md2ebook-paragraph-spacing: ' + normalized.paragraphSpacing + ';',
    '--md2ebook-h1-size: ' + normalized.h1Size + 'px;',
    '--md2ebook-h1-weight: ' + normalized.h1Weight + ';',
    '--md2ebook-h2-size: ' + normalized.h2Size + 'px;',
    '--md2ebook-h2-weight: ' + normalized.h2Weight + ';',
    '--md2ebook-h3-size: ' + normalized.h3Size + 'px;',
    '--md2ebook-h3-weight: ' + normalized.h3Weight + ';',
    '--md2ebook-h1-line-height: ' + normalized.h1LineHeight + ';',
    '--md2ebook-h2-line-height: ' + normalized.h2LineHeight + ';',
    '--md2ebook-h3-line-height: ' + normalized.h3LineHeight + ';',
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
    // ui/PreviewCanvas.jsx). It's irrelevant for the real PDF export either way,
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
    '      text-align: var(--md2ebook-text-align);\n' +
    '      color: #1a1a1a;\n' +
    '      -webkit-font-smoothing: antialiased;\n' +
    '    }\n\n' +
    // Words never split across lines with a hyphen (no "criti-/cal").
    // Justified text just spreads the gaps between whole words instead.
    '    .page p, .page li, .page blockquote { hyphens: none; -webkit-hyphens: none; }\n\n' +
    '    .page > *:first-child { margin-top: 0; }\n' +
    '    .page > *:last-child { margin-bottom: 0; }\n\n' +
    '    .page h1, .page h2, .page h3, .page h4, .page h5, .page h6 {\n' +
    '      font-family: var(--md2ebook-heading-font-family);\n' +
    '      text-align: var(--md2ebook-h3-text-align);\n' +
    '      page-break-after: avoid;\n' +
    '      break-after: avoid;\n' +
    '      margin-top: 1.4em;\n' +
    '      margin-bottom: 0.6em;\n' +
    '    }\n\n' +
    '    .page h1 {\n' +
    '      font-size: var(--md2ebook-h1-size);\n' +
    '      font-weight: var(--md2ebook-h1-weight);\n' +
    '      text-align: var(--md2ebook-h1-text-align);\n' +
    '      line-height: var(--md2ebook-h1-line-height);\n' +
    headingRule(normalized.h1Underline) +
    '    }\n\n' +
    '    .page h2 {\n' +
    '      font-size: var(--md2ebook-h2-size);\n' +
    '      font-weight: var(--md2ebook-h2-weight);\n' +
    '      text-align: var(--md2ebook-h2-text-align);\n' +
    '      line-height: var(--md2ebook-h2-line-height);\n' +
    headingRule(normalized.h2Underline) +
    '    }\n\n' +
    '    .page h3 {\n' +
    '      font-size: var(--md2ebook-h3-size);\n' +
    '      font-weight: var(--md2ebook-h3-weight);\n' +
    '      line-height: var(--md2ebook-h3-line-height);\n' +
    headingRule(normalized.h3Underline) +
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
    // One blank body-text line above and below every quote (adjacent
    // margins collapse, so this never stacks on top of paragraph
    // spacing — the larger of the two wins). The first/last-child
    // rules above still zero it at the very top/bottom of the page.
    '      margin: calc(var(--md2ebook-font-size) * var(--md2ebook-line-height)) 0;\n' +
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
    '      text-align: left;\n' +
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
    '    .md2ebook-toc { margin: 0 0 var(--md2ebook-paragraph-spacing) 0; text-align: left; }\n' +
    '    .md2ebook-toc.md2ebook-toc-break { page-break-after: always; break-after: page; }\n' +
    '    .md2ebook-toc-title {\n' +
    '      font-family: var(--md2ebook-heading-font-family);\n' +
    '      font-size: var(--md2ebook-h2-size);\n' +
    '      font-weight: var(--md2ebook-h2-weight);\n' +
    '      text-align: ' + (normalized.tocTitleAlign || 'var(--md2ebook-h2-text-align)') + ';\n' +
    '      line-height: 1.3;\n' +
    '      margin: 0 0 0.8em 0;\n' +
    '    }\n' +
    '    .md2ebook-toc ol { list-style: none; margin: 0; padding: 0; }\n' +
    '    .md2ebook-toc li { margin: 0 0 0.35em 0; break-inside: avoid; page-break-inside: avoid; }\n' +
    normalized.tocLevelStyles
      .map(function (st, i) {
        var sel = '    .md2ebook-toc li.md2ebook-toc-l' + (i + 1);
        return (
          sel + ' {' +
          ' font-weight: ' + (st.bold ? 'var(--md2ebook-bold-weight)' : 'var(--md2ebook-base-weight)') + ';' +
          ' font-style: ' + (st.italic ? 'italic' : 'normal') + ';' +
          (st.size ? ' font-size: ' + st.size + 'px;' : '') +
          (st.lineHeight ? ' line-height: ' + st.lineHeight + ';' : '') +
          ' }\n' +
          (st.underline ? sel + ' .md2ebook-toc-text { text-decoration: underline; text-underline-offset: 0.15em; }\n' : '')
        );
      })
      .join('') +
    '    .md2ebook-toc li.md2ebook-toc-l1:not(:first-child) { margin-top: 0.6em; }\n' +
    '    .md2ebook-toc li.md2ebook-toc-l2 { padding-left: 1.4em; }\n' +
    '    .md2ebook-toc li.md2ebook-toc-l3 { padding-left: 2.8em; }\n' +
    '    .page .md2ebook-toc a { display: flex; align-items: baseline; color: inherit; text-decoration: none; word-break: normal; }\n' +
    '    .md2ebook-toc-text { flex: 0 1 auto; }\n' +
    '    .md2ebook-toc-leader { flex: 1 1 auto; min-width: 1em; margin: 0 0.4em; }\n' +
    '    .md2ebook-toc-dots .md2ebook-toc-leader { border-bottom: 1.5px dotted #94a3b8; transform: translateY(-0.3em); }\n' +
    '    .md2ebook-toc-num { flex: 0 0 auto; min-width: 1.8em; text-align: right; font-variant-numeric: tabular-nums; }\n\n' +
    '    .md2ebook-space {\n' +
    '      display: block;\n' +
    '      height: calc(var(--md2ebook-font-size) * var(--md2ebook-line-height) * var(--md2ebook-space-lines, 1));\n' +
    '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
    '      padding: 0;\n' +
    '      border: 0;\n' +
    '      page-break-inside: avoid;\n' +
    '      break-inside: avoid;\n' +
    '    }\n\n' +
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
// Paged.js stamps data-align-last-split-element="justify" on the deepest
// element of a split and styles it `text-align-last: justify`, so the
// line right before a page break stays flush on both sides. When the
// break falls *between* paragraphs, the deepest split element is the
// outer .page wrapper itself, and text-align-last is inherited — so
// every paragraph on that page had its final line stretched across the
// full width. Neutralize the stamp everywhere, then re-apply it only
// where the split element is an actual paragraph/list item that
// continues on the next page.
export function paginationJustifyFix() {
  return (
    ".pagedjs_page_content [data-align-last-split-element='justify'] {\n" +
    '  text-align-last: auto;\n' +
    '}\n' +
    ".pagedjs_page_content p[data-align-last-split-element='justify'],\n" +
    ".pagedjs_page_content li[data-align-last-split-element='justify'] {\n" +
    '  text-align-last: justify;\n' +
    '}\n'
  );
}

export function buildPageBoxRule(parts) {
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
    // Paged.js lays pages out as if printing, so it applies the shared
    // stylesheet's @media print rules on screen too — including the
    // white html/body background meant for the real print. That turned
    // the gap below each page (the margin-bottom further down) white
    // instead of letting the preview's dark backdrop show through,
    // most visibly as a white strip under the last page. Kept
    // transparent here, for the preview only; each page paints its own
    // white sheet instead (.pagedjs_page below), margins included.
    'html, body {\n' +
    '  background: transparent !important;\n' +
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
    '  background: #ffffff !important;\n' +
    '  margin-bottom: 24px !important;\n' +
    '  border-bottom: 3px solid #4b4b4b !important;\n' +
    '}\n' +
    paginationJustifyFix()
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
export function buildPageNumberCss(normalized) {
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
