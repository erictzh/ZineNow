// The live-preview document: paginated by Paged.js inside the sandboxed preview frame.

import { buildDocumentParts } from "./buildDocument.js";
import { fontLinkTags } from "./fonts.js";
import { buildPageBoxRule } from "./styleBlock.js";
import { tocFillScript } from "./toc.js";

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
 * parent app via window.postMessage (see ui/PreviewCanvas.jsx) —
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
export function renderHtmlDocument(markdownText, config) {
  var parts = buildDocumentParts(markdownText, config);

  var paginationScript =
    '<script>\n' +
    // The height of the content itself (the stack of pages, last page's
    // gap included). Not document.documentElement.scrollHeight: that is
    // never less than the frame's own height, and the frame is sized
    // from the previous measurement — so once a long document had made
    // it tall, deleting text could never shrink it again, and the
    // removed pages' worth of empty space stayed behind as "ghost pages".
    '  function __contentHeight() {\n' +
    '    return Math.ceil(document.body.getBoundingClientRect().height);\n' +
    '  }\n' +
    // Dark paper (the gear pop-up, ui/UiSettings.jsx): the app says on or off by postMessage,
    // and this frame flips a class on <html> (CSS below), so toggling it doesn't re-paginate.
    // Only messages from the app's own window count.
    "  window.addEventListener('message', function (e) {\n" +
    "    var d = e.data;\n" +
    "    if (e.source !== window.parent || !d || d.source !== 'md2ebook-app' || d.type !== 'darkPaper') return;\n" +
    "    document.documentElement.classList.toggle('md2ebook-dark-paper', !!d.on);\n" +
    '  });\n' +
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
    tocFillScript(parts.normalized) +
    '      try {\n' +
    '        window.parent.postMessage({\n' +
    "          source: 'md2ebook-pagedjs',\n" +
    '          tocPages: __tocPages,\n' +
    '          pageCount: flow && flow.total,\n' +
    '          height: __contentHeight()\n' +
    "        }, '*');\n" +
    '      } catch (e) {}\n' +
    '    }\n' +
    '  };\n' +
    "  window.addEventListener('load', function () {\n" +
    '    try {\n' +
    '      window.parent.postMessage({\n' +
    "        source: 'md2ebook-pagedjs',\n" +
    '        pageCount: null,\n' +
    '        height: __contentHeight()\n' +
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
    fontLinkTags(parts.normalized) +
    '\n' +
    '  <style>' +
    parts.styleText +
    buildPageBoxRule(parts) +
    '\n    .md2ebook-space { outline: 1px dashed #cbd5e1; outline-offset: -1px; position: relative; }\n' +
    // Dark paper, preview only: the page's colours are inverted (white paper turns near-black,
    // black text near-white) and pictures are inverted a second time so they look as they are.
    '    html.md2ebook-dark-paper .pagedjs_page, html.md2ebook-dark-paper body > .page { filter: invert(0.92) hue-rotate(180deg); }\n' +
    '    html.md2ebook-dark-paper img, html.md2ebook-dark-paper svg, html.md2ebook-dark-paper video, html.md2ebook-dark-paper picture { filter: invert(1) hue-rotate(180deg); }\n' +
    "    .md2ebook-space::after { content: 'blank space \\00b7  ' attr(data-lines) ' lines'; position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); text-align: center; font: 11px ui-sans-serif, system-ui, sans-serif; color: #94a3b8; }\n" +
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
