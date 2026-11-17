// Word (.docx) -> Markdown.

import { htmlToMarkdown } from "./htmlToMarkdown.js";
import { requireGlobal } from "./requireGlobal.js";

/* ------------------------------------------------------------------
 * convertDocxToMarkdown(arrayBuffer)
 * ------------------------------------------------------------------
 * mammoth.js unpacks the .docx directly into HTML (headings, lists,
 * bold/italic, tables translate reasonably well; footnotes, tracked
 * changes, and embedded objects don't survive), which then goes
 * through the same htmlToMarkdown() step as the EPUB path below.
 * ------------------------------------------------------------------ */
export function convertDocxToMarkdown(arrayBuffer) {
  var mammoth = requireGlobal('mammoth', 'Word (.docx) import');
  return mammoth.convertToHtml({ arrayBuffer: arrayBuffer }).then(function (result) {
    return htmlToMarkdown(result.value);
  });
}
