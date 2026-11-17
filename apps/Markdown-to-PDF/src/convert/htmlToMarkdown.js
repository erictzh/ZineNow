// HTML -> Markdown (used by the .docx and .epub importers).

import { requireGlobal } from "./requireGlobal.js";

/* ------------------------------------------------------------------
 * htmlToMarkdown(html)
 * ------------------------------------------------------------------
 * Shared HTML -> Markdown step for both the .docx and .epub import
 * paths below (mammoth.js and the unzipped EPUB chapters both land
 * as HTML first; this is where both convert the rest of the way).
 * ------------------------------------------------------------------ */
export function htmlToMarkdown(html) {
  var TurndownService = requireGlobal('TurndownService', 'Document import');
  var td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  return td.turndown(html || '');
}
