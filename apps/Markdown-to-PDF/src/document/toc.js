// The table of contents: building it from the headings and filling in page numbers.

import { escapeHtml, slugify } from "./html.js";
import { TOC_SLOT_HTML } from "./markers.js";

export function applyToc(bodyHtml, normalized, tocPages) {
  if (bodyHtml.indexOf(TOC_SLOT_HTML) === -1) return bodyHtml;
  var used = {};
  var entries = [];
  var html = bodyHtml.replace(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, function (whole, level, attrs, inner) {
    attrs = attrs || '';
    var text = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    var idMatch = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs);
    var id;
    if (idMatch) {
      id = idMatch[1];
    } else {
      var base = 'h-' + (slugify(text) || 'section');
      id = base;
      for (var n = 2; used[id]; n++) id = base + '-' + n;
      attrs = ' id="' + id + '"' + attrs;
    }
    used[id] = true;
    if (Number(level) <= normalized.tocLevels && text) {
      entries.push({ level: Number(level), id: id, text: text });
    }
    return '<h' + level + attrs + '>' + inner + '</h' + level + '>';
  });

  var items = entries
    .map(function (e) {
      var num =
        normalized.tocPageNumbers && tocPages && tocPages[e.id] != null ? String(tocPages[e.id]) : '';
      return (
        '<li class="md2ebook-toc-l' + e.level + '"><a href="#' + e.id + '" data-toc-target="' + e.id + '">' +
        '<span class="md2ebook-toc-text">' + e.text + '</span>' +
        (normalized.tocPageNumbers
          ? '<span class="md2ebook-toc-leader"></span><span class="md2ebook-toc-num">' + num + '</span>'
          : '') +
        '</a></li>'
      );
    })
    .join('');

  var cls =
    'md2ebook-toc' +
    (normalized.tocPageNumbers && normalized.tocDotLeaders ? ' md2ebook-toc-dots' : '') +
    (normalized.tocPageBreakAfter ? ' md2ebook-toc-break' : '');
  var tocHtml =
    '<nav class="' + cls + '">' +
    (normalized.tocShowTitle && normalized.tocTitle
      ? '<p class="md2ebook-toc-title">' + escapeHtml(normalized.tocTitle) + '</p>'
      : '') +
    '<ol>' + (items || '<li><em>No headings yet.</em></li>') + '</ol></nav>';

  return html.split(TOC_SLOT_HTML).join(tocHtml);
}

// JS run inside a Paged.js document once layout is done: finds which
// page each contents entry's heading landed on, writes the number into
// the entry, and leaves the map in __tocPages for posting back.
export function tocFillScript(normalized) {
  var start = normalized.pageNumbersEnabled ? normalized.pageStartFrom : 1;
  return (
    '      var __tocPages = {};\n' +
    '      try {\n' +
    '        var __pgs = Array.prototype.slice.call(document.querySelectorAll(".pagedjs_page"));\n' +
    '        var __links = document.querySelectorAll(".md2ebook-toc a[data-toc-target]");\n' +
    '        for (var __k = 0; __k < __links.length; __k++) {\n' +
    '          var __id = __links[__k].getAttribute("data-toc-target");\n' +
    '          var __t = document.getElementById(__id);\n' +
    '          var __p = __t && __t.closest(".pagedjs_page");\n' +
    '          if (!__p) continue;\n' +
    '          var __n = ' + start + ' + __pgs.indexOf(__p);\n' +
    '          __tocPages[__id] = __n;\n' +
    '          var __s = __links[__k].querySelector(".md2ebook-toc-num");\n' +
    '          if (__s) __s.textContent = String(__n);\n' +
    '        }\n' +
    '      } catch (e) {}\n'
  );
}
