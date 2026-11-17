// The editor's own markers in Markdown (\pagebreak, \space{n}, \toc) and turning them into HTML.

/* ------------------------------------------------------------------
 * PAGE_BREAK_MARKER / applyPageBreakMarkers(markdownText)
 * ------------------------------------------------------------------
 * Manual page breaks: a line containing only `\pagebreak` (optional
 * surrounding whitespace, its own line) forces a break at that point
 * in the document — the toolbar button above the editor (see ui/editor/EditorTab.jsx)
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
export var PAGE_BREAK_MARKER = '\\pagebreak';
var PAGE_BREAK_LINE_RE = /^[ \t]*\\pagebreak[ \t]*$/gm;

/* Blank space: a line containing only `\space{N}` becomes an empty
 * block exactly N body-text lines tall (font size x line spacing), a
 * gap left on purpose for pasting an image into the exported PDF by
 * hand. It never splits across pages: if it doesn't fit, it moves
 * whole to the next page. N is clamped to 1-200. */
var SPACE_LINE_RE = /^[ \t]*\\space\{[ \t]*(\d+)[ \t]*\}[ \t]*$/gm;
var MAX_SPACE_LINES = 200;

/* Table of contents: a line containing only `\toc` is swapped for a
 * placeholder here; after marked has turned the Markdown into HTML,
 * applyToc() below replaces each placeholder with the actual list. */
var TOC_LINE_RE = /^[ \t]*\\toc[ \t]*$/gm;
export var TOC_SLOT_HTML = '<div class="md2ebook-toc-slot"></div>';

export function applyPageBreakMarkers(markdownText) {
  return String(markdownText)
    .replace(PAGE_BREAK_LINE_RE, '\n\n<div class="md2ebook-pagebreak"></div>\n\n')
    .replace(TOC_LINE_RE, '\n\n' + TOC_SLOT_HTML + '\n\n')
    .replace(SPACE_LINE_RE, function (_, n) {
      var lines = Math.min(MAX_SPACE_LINES, Math.max(1, parseInt(n, 10) || 1));
      return (
        '\n\n<div class="md2ebook-space" data-lines="' + lines + '" style="--md2ebook-space-lines: ' +
        lines + ';"></div>\n\n'
      );
    });
}
