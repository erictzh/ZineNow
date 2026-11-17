// The document version that is rendered to page images for Send to ZineArranger.

import { buildDocumentParts } from "../document/buildDocument.js";
import { fontLinkTags } from "../document/fonts.js";
import { buildPageNumberCss, paginationJustifyFix } from "../document/styleBlock.js";
import { tocFillScript } from "../document/toc.js";

/* ------------------------------------------------------------------
 * renderRasterizationDocument(markdownText, config) -> string
 * ------------------------------------------------------------------
 * Used only by "Send to ZineArranger" (see handleSendToZineArranger in
 * ui/App.jsx) — a from-scratch sibling of renderHtmlDocument, NOT a
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
    '}\n' +
    paginationJustifyFix()
  );
}

export function renderRasterizationDocument(markdownText, config) {
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
    tocFillScript(parts.normalized) +
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
    fontLinkTags(parts.normalized) +
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
