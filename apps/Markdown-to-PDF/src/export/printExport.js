// Download PDF: prints the document through the browser's own print engine.

import { buildDocumentParts } from "../document/buildDocument.js";
import { fontLinkTags } from "../document/fonts.js";
import { escapeHtml } from "../document/html.js";
import { buildPageNumberCss } from "../document/styleBlock.js";

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
// options.tocPages: { headingId: pageNumber } as measured by the live
// preview (the print engine can't work out page numbers itself).
export function exportToPdf(markdownText, config, options) {
  return new Promise(function (resolve, reject) {
    var parts;
    try {
      parts = buildDocumentParts(markdownText, config, options);
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
      fontLinkTags(parts.normalized) +
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
