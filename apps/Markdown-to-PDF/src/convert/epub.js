// EPUB (.epub) -> Markdown, chapter by chapter.

import { htmlToMarkdown } from "./htmlToMarkdown.js";
import { requireGlobal } from "./requireGlobal.js";
import { PAGE_BREAK_MARKER } from "../document/markers.js";

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
export function convertEpubToMarkdown(arrayBuffer) {
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
