// Assembles the document pieces (HTML body, styles, fonts, ToC) from Markdown and settings.

import { escapeHtml } from "./html.js";
import { applyPageBreakMarkers } from "./markers.js";
import { generateStyleBlock } from "./styleBlock.js";
import { applyToc } from "./toc.js";
import { DEFAULT_PAPER_KEY, PAPER_SIZES } from "../settings/defaults.js";
import { normalizeConfig } from "../settings/normalizeConfig.js";

export function buildDocumentParts(markdownText, config, options) {
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
    bodyHtml = applyToc(bodyHtml, normalized, options && options.tocPages);
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
