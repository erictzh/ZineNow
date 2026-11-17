// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.
(() => {
  // shared/js/zineArrangerHandoff.js
  var ARRANGER_READY_MESSAGE = "zinearranger-ready";
  var HANDOFF_PDF_MESSAGE = "zeditor-handoff-pdf";
  async function sendPdfToZineArranger(buildBytes, filename) {
    const win = window.open("../ZineArranger/index.html", "_blank");
    if (!win) throw new Error("The browser blocked the new tab — allow popups for this page and try again.");
    const readyPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("ZineArranger didn't respond — it may still be loading, or didn't open as a new tab."));
      }, 15e3);
      function onMessage(event) {
        if (event.source !== win || !event.data || event.data.type !== ARRANGER_READY_MESSAGE) return;
        clearTimeout(timeoutId);
        window.removeEventListener("message", onMessage);
        resolve();
      }
      window.addEventListener("message", onMessage);
    });
    const pdfBytes = await buildBytes();
    const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    await readyPromise;
    win.postMessage({ type: HANDOFF_PDF_MESSAGE, buffer, filename }, "*", [buffer]);
  }

  // apps/Markdown-to-PDF/src/document/html.js
  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slugify(text) {
    var s = String(text).replace(/&[a-z0-9#]+;/gi, " ").toLowerCase().trim();
    try {
      s = s.replace(/[^\p{L}\p{N}]+/gu, "-");
    } catch (e) {
      s = s.replace(/[^a-z0-9\u00c0-\uffff]+/g, "-");
    }
    return s.replace(/^-+|-+$/g, "").slice(0, 60);
  }

  // apps/Markdown-to-PDF/src/document/markers.js
  var PAGE_BREAK_MARKER = "\\pagebreak";
  var PAGE_BREAK_LINE_RE = /^[ \t]*\\pagebreak[ \t]*$/gm;
  var SPACE_LINE_RE = /^[ \t]*\\space\{[ \t]*(\d+)[ \t]*\}[ \t]*$/gm;
  var MAX_SPACE_LINES = 200;
  var TOC_LINE_RE = /^[ \t]*\\toc[ \t]*$/gm;
  var TOC_SLOT_HTML = '<div class="md2ebook-toc-slot"></div>';
  function applyPageBreakMarkers(markdownText) {
    return String(markdownText).replace(PAGE_BREAK_LINE_RE, '\n\n<div class="md2ebook-pagebreak"></div>\n\n').replace(TOC_LINE_RE, "\n\n" + TOC_SLOT_HTML + "\n\n").replace(SPACE_LINE_RE, function(_, n) {
      var lines = Math.min(MAX_SPACE_LINES, Math.max(1, parseInt(n, 10) || 1));
      return '\n\n<div class="md2ebook-space" data-lines="' + lines + '" style="--md2ebook-space-lines: ' + lines + ';"></div>\n\n';
    });
  }

  // apps/Markdown-to-PDF/src/document/styleBlock.js
  function headingRule(on) {
    return on ? "      border-bottom: 2px solid #e2e8f0;\n      padding-bottom: 0.3em;\n" : "      border-bottom: none;\n      padding-bottom: 0;\n";
  }
  function generateStyleBlock(normalized, paper) {
    var vars = [
      "--md2ebook-font-family: " + normalized.fontStack + ";",
      "--md2ebook-heading-font-family: " + normalized.headingFontStack + ";",
      "--md2ebook-text-align: " + normalized.textAlign + ";",
      "--md2ebook-h1-text-align: " + normalized.h1TextAlign + ";",
      "--md2ebook-h2-text-align: " + normalized.h2TextAlign + ";",
      "--md2ebook-h3-text-align: " + normalized.h3TextAlign + ";",
      "--md2ebook-font-size: " + normalized.fontSize + "px;",
      "--md2ebook-line-height: " + normalized.lineHeight + ";",
      "--md2ebook-paragraph-spacing: " + normalized.paragraphSpacing + ";",
      "--md2ebook-h1-size: " + normalized.h1Size + "px;",
      "--md2ebook-h1-weight: " + normalized.h1Weight + ";",
      "--md2ebook-h2-size: " + normalized.h2Size + "px;",
      "--md2ebook-h2-weight: " + normalized.h2Weight + ";",
      "--md2ebook-h3-size: " + normalized.h3Size + "px;",
      "--md2ebook-h3-weight: " + normalized.h3Weight + ";",
      "--md2ebook-h1-line-height: " + normalized.h1LineHeight + ";",
      "--md2ebook-h2-line-height: " + normalized.h2LineHeight + ";",
      "--md2ebook-h3-line-height: " + normalized.h3LineHeight + ";",
      "--md2ebook-base-weight: " + normalized.baseWeight + ";",
      "--md2ebook-bold-weight: " + normalized.boldWeight + ";",
      "--md2ebook-page-width: " + paper.widthIn + "in;",
      "--md2ebook-page-height: " + paper.heightIn + "in;",
      "--md2ebook-page-margin-vertical: " + normalized.marginVerticalIn + "in;",
      "--md2ebook-page-margin-horizontal: " + normalized.marginHorizontalIn + "in;"
    ].join("\n      ");
    return "\n    :root {\n      " + vars + "\n    }\n\n    * { box-sizing: border-box; }\n\n    html, body {\n      margin: 0;\n      padding: 0;\n      background: transparent;\n    }\n\n    body {\n      display: flex;\n      justify-content: center;\n    }\n\n    .page {\n      box-sizing: border-box;\n      width: var(--md2ebook-page-width);\n      min-height: var(--md2ebook-page-height);\n      padding: var(--md2ebook-page-margin-vertical) var(--md2ebook-page-margin-horizontal);\n      background: #ffffff;\n      font-family: var(--md2ebook-font-family);\n      font-size: var(--md2ebook-font-size);\n      line-height: var(--md2ebook-line-height);\n      font-weight: var(--md2ebook-base-weight);\n      text-align: var(--md2ebook-text-align);\n      color: #1a1a1a;\n      -webkit-font-smoothing: antialiased;\n    }\n\n    .page p, .page li, .page blockquote { hyphens: none; -webkit-hyphens: none; }\n\n    .page > *:first-child { margin-top: 0; }\n    .page > *:last-child { margin-bottom: 0; }\n\n    .page h1, .page h2, .page h3, .page h4, .page h5, .page h6 {\n      font-family: var(--md2ebook-heading-font-family);\n      text-align: var(--md2ebook-h3-text-align);\n      page-break-after: avoid;\n      break-after: avoid;\n      margin-top: 1.4em;\n      margin-bottom: 0.6em;\n    }\n\n    .page h1 {\n      font-size: var(--md2ebook-h1-size);\n      font-weight: var(--md2ebook-h1-weight);\n      text-align: var(--md2ebook-h1-text-align);\n      line-height: var(--md2ebook-h1-line-height);\n" + headingRule(normalized.h1Underline) + "    }\n\n    .page h2 {\n      font-size: var(--md2ebook-h2-size);\n      font-weight: var(--md2ebook-h2-weight);\n      text-align: var(--md2ebook-h2-text-align);\n      line-height: var(--md2ebook-h2-line-height);\n" + headingRule(normalized.h2Underline) + "    }\n\n    .page h3 {\n      font-size: var(--md2ebook-h3-size);\n      font-weight: var(--md2ebook-h3-weight);\n      line-height: var(--md2ebook-h3-line-height);\n" + headingRule(normalized.h3Underline) + "    }\n\n    .page h4 { font-size: calc(var(--md2ebook-h3-size) * 0.9); font-weight: var(--md2ebook-h3-weight); }\n\n    .page p {\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      orphans: 3;\n      widows: 3;\n    }\n\n    .page strong, .page b {\n      font-weight: var(--md2ebook-bold-weight);\n    }\n\n    .page em, .page i { font-style: italic; }\n\n    .page a {\n      color: #2563eb;\n      text-decoration: underline;\n      word-break: break-word;\n    }\n\n    .page ul, .page ol {\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      padding-left: 1.6em;\n    }\n\n    .page li { margin-bottom: 0.35em; }\n    .page li > ul, .page li > ol { margin-top: 0.35em; margin-bottom: 0; }\n\n    .page hr {\n      border: none;\n      border-top: 1px solid #cbd5e1;\n      margin: 2em 0;\n    }\n\n    .page blockquote {\n      margin: calc(var(--md2ebook-font-size) * var(--md2ebook-line-height)) 0;\n      padding: 0.6em 1.2em;\n      border-left: 4px solid #94a3b8;\n      background: #f8fafc;\n      color: #475569;\n      font-style: italic;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .page blockquote p:last-child { margin-bottom: 0; }\n\n    .page code {\n      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n      font-size: 0.88em;\n      background: #f1f5f9;\n      border: 1px solid #e2e8f0;\n      border-radius: 4px;\n      padding: 0.12em 0.4em;\n    }\n\n    .page pre {\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      padding: 1em 1.2em;\n      background: #0f172a;\n      color: #e2e8f0;\n      border-radius: 8px;\n      overflow-x: auto;\n      text-align: left;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .page pre code {\n      background: transparent;\n      border: none;\n      padding: 0;\n      font-size: 0.85em;\n      color: inherit;\n      line-height: 1.55;\n    }\n\n    .page table {\n      width: 100%;\n      border-collapse: collapse;\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      font-size: 0.92em;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .page th, .page td {\n      border: 1px solid #cbd5e1;\n      padding: 0.5em 0.75em;\n      text-align: left;\n      vertical-align: top;\n    }\n\n    .page th {\n      background: #f1f5f9;\n      font-weight: var(--md2ebook-bold-weight);\n    }\n\n    .page tr:nth-child(even) td { background: #f8fafc; }\n\n    .page img {\n      max-width: 100%;\n      height: auto;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .md2ebook-toc { margin: 0 0 var(--md2ebook-paragraph-spacing) 0; text-align: left; }\n    .md2ebook-toc.md2ebook-toc-break { page-break-after: always; break-after: page; }\n    .md2ebook-toc-title {\n      font-family: var(--md2ebook-heading-font-family);\n      font-size: var(--md2ebook-h2-size);\n      font-weight: var(--md2ebook-h2-weight);\n      text-align: " + (normalized.tocTitleAlign || "var(--md2ebook-h2-text-align)") + ";\n      line-height: 1.3;\n      margin: 0 0 0.8em 0;\n    }\n    .md2ebook-toc ol { list-style: none; margin: 0; padding: 0; }\n    .md2ebook-toc li { margin: 0 0 0.35em 0; break-inside: avoid; page-break-inside: avoid; }\n" + normalized.tocLevelStyles.map(function(st, i) {
      var sel = "    .md2ebook-toc li.md2ebook-toc-l" + (i + 1);
      return sel + " { font-weight: " + (st.bold ? "var(--md2ebook-bold-weight)" : "var(--md2ebook-base-weight)") + "; font-style: " + (st.italic ? "italic" : "normal") + ";" + (st.size ? " font-size: " + st.size + "px;" : "") + (st.lineHeight ? " line-height: " + st.lineHeight + ";" : "") + " }\n" + (st.underline ? sel + " .md2ebook-toc-text { text-decoration: underline; text-underline-offset: 0.15em; }\n" : "");
    }).join("") + "    .md2ebook-toc li.md2ebook-toc-l1:not(:first-child) { margin-top: 0.6em; }\n    .md2ebook-toc li.md2ebook-toc-l2 { padding-left: 1.4em; }\n    .md2ebook-toc li.md2ebook-toc-l3 { padding-left: 2.8em; }\n    .page .md2ebook-toc a { display: flex; align-items: baseline; color: inherit; text-decoration: none; word-break: normal; }\n    .md2ebook-toc-text { flex: 0 1 auto; }\n    .md2ebook-toc-leader { flex: 1 1 auto; min-width: 1em; margin: 0 0.4em; }\n    .md2ebook-toc-dots .md2ebook-toc-leader { border-bottom: 1.5px dotted #94a3b8; transform: translateY(-0.3em); }\n    .md2ebook-toc-num { flex: 0 0 auto; min-width: 1.8em; text-align: right; font-variant-numeric: tabular-nums; }\n\n    .md2ebook-space {\n      display: block;\n      height: calc(var(--md2ebook-font-size) * var(--md2ebook-line-height) * var(--md2ebook-space-lines, 1));\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      padding: 0;\n      border: 0;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .md2ebook-pagebreak {\n      height: 0;\n      margin: 0;\n      padding: 0;\n      border: 0;\n      page-break-before: always;\n      break-before: page;\n    }\n\n    @media print {\n      html, body { background: #ffffff; }\n      .page { box-shadow: none; }\n      .page h1, .page h2, .page h3 { page-break-after: avoid; break-after: avoid; }\n      .page pre, .page blockquote, .page table, .page img { page-break-inside: avoid; break-inside: avoid; }\n      .md2ebook-pagebreak { page-break-before: always; break-before: page; }\n    }\n";
  }
  function paginationJustifyFix() {
    return ".pagedjs_page_content [data-align-last-split-element='justify'] {\n  text-align-last: auto;\n}\n.pagedjs_page_content p[data-align-last-split-element='justify'],\n.pagedjs_page_content li[data-align-last-split-element='justify'] {\n  text-align-last: justify;\n}\n";
  }
  function buildPageBoxRule(parts) {
    var pageNumbers = buildPageNumberCss(parts.normalized);
    return "\n@page {\n  size: " + parts.paper.widthIn + "in " + parts.paper.heightIn + "in;\n  margin: " + parts.normalized.marginVerticalIn + "in " + parts.normalized.marginHorizontalIn + "in;\n" + pageNumbers.marginBox + "}\n" + pageNumbers.rootReset + pageNumbers.overrideRule + ".page {\n  width: 100%;\n  min-height: 0;\n  padding: 0;\n  box-shadow: none;\n}\n.pagedjs_page {\n  margin-bottom: 24px !important;\n  border-bottom: 3px solid #4b4b4b !important;\n}\n" + paginationJustifyFix();
  }
  function buildPageNumberCss(normalized) {
    if (!normalized.pageNumbersEnabled) return { marginBox: "", rootReset: "", overrideRule: "" };
    return {
      marginBox: "  @bottom-center {\n    content: counter(page);\n    font-family: " + normalized.fontStack + ";\n    font-size: 10pt;\n    color: #6b7280;\n  }\n",
      rootReset: "html { counter-reset: page " + (normalized.pageStartFrom - 1) + "; }\n",
      // Only consumed by the live preview (buildPageBoxRule) — see the
      // pagination script in renderHtmlDocument for what actually sets
      // the data-md2ebook-pagenum attribute this targets. Harmless if
      // ever included elsewhere: with no matching attribute present,
      // this rule simply never matches anything.
      overrideRule: ".pagedjs_margin-content[data-md2ebook-pagenum]::after {\n  content: attr(data-md2ebook-pagenum) !important;\n}\n"
    };
  }

  // apps/Markdown-to-PDF/src/document/toc.js
  function applyToc(bodyHtml, normalized, tocPages) {
    if (bodyHtml.indexOf(TOC_SLOT_HTML) === -1) return bodyHtml;
    var used = {};
    var entries = [];
    var html = bodyHtml.replace(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, function(whole, level, attrs, inner) {
      attrs = attrs || "";
      var text = inner.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      var idMatch = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs);
      var id;
      if (idMatch) {
        id = idMatch[1];
      } else {
        var base = "h-" + (slugify(text) || "section");
        id = base;
        for (var n = 2; used[id]; n++) id = base + "-" + n;
        attrs = ' id="' + id + '"' + attrs;
      }
      used[id] = true;
      if (Number(level) <= normalized.tocLevels && text) {
        entries.push({ level: Number(level), id, text });
      }
      return "<h" + level + attrs + ">" + inner + "</h" + level + ">";
    });
    var items = entries.map(function(e) {
      var num = normalized.tocPageNumbers && tocPages && tocPages[e.id] != null ? String(tocPages[e.id]) : "";
      return '<li class="md2ebook-toc-l' + e.level + '"><a href="#' + e.id + '" data-toc-target="' + e.id + '"><span class="md2ebook-toc-text">' + e.text + "</span>" + (normalized.tocPageNumbers ? '<span class="md2ebook-toc-leader"></span><span class="md2ebook-toc-num">' + num + "</span>" : "") + "</a></li>";
    }).join("");
    var cls = "md2ebook-toc" + (normalized.tocPageNumbers && normalized.tocDotLeaders ? " md2ebook-toc-dots" : "") + (normalized.tocPageBreakAfter ? " md2ebook-toc-break" : "");
    var tocHtml = '<nav class="' + cls + '">' + (normalized.tocShowTitle && normalized.tocTitle ? '<p class="md2ebook-toc-title">' + escapeHtml(normalized.tocTitle) + "</p>" : "") + "<ol>" + (items || "<li><em>No headings yet.</em></li>") + "</ol></nav>";
    return html.split(TOC_SLOT_HTML).join(tocHtml);
  }
  function tocFillScript(normalized) {
    var start = normalized.pageNumbersEnabled ? normalized.pageStartFrom : 1;
    return '      var __tocPages = {};\n      try {\n        var __pgs = Array.prototype.slice.call(document.querySelectorAll(".pagedjs_page"));\n        var __links = document.querySelectorAll(".md2ebook-toc a[data-toc-target]");\n        for (var __k = 0; __k < __links.length; __k++) {\n          var __id = __links[__k].getAttribute("data-toc-target");\n          var __t = document.getElementById(__id);\n          var __p = __t && __t.closest(".pagedjs_page");\n          if (!__p) continue;\n          var __n = ' + start + ' + __pgs.indexOf(__p);\n          __tocPages[__id] = __n;\n          var __s = __links[__k].querySelector(".md2ebook-toc-num");\n          if (__s) __s.textContent = String(__n);\n        }\n      } catch (e) {}\n';
  }

  // apps/Markdown-to-PDF/src/settings/defaults.js
  var PAPER_SIZES = {
    a4: {
      key: "a4",
      label: 'A4 (8.27" x 11.69")',
      widthIn: 8.27,
      heightIn: 11.69,
      jsPdfFormat: "a4"
    },
    a5: {
      key: "a5",
      label: 'A5 (5.83" x 8.27")',
      widthIn: 5.83,
      heightIn: 8.27,
      jsPdfFormat: "a5"
    },
    letter: {
      key: "letter",
      label: 'US Letter (8.5" x 11")',
      widthIn: 8.5,
      heightIn: 11,
      jsPdfFormat: "letter"
    },
    tabloid: {
      key: "tabloid",
      label: '11" x 17" (Tabloid)',
      widthIn: 11,
      heightIn: 17,
      jsPdfFormat: "tabloid"
    }
  };
  var DEFAULT_PAPER_KEY = "a5";
  var HARDCODED_FALLBACK_DEFAULTS = {
    fontFamily: "Inter",
    // Heading typeface: when headingFontSameAsBody is true (or
    // headingFontFamily is blank), headings use the body fontFamily.
    headingFontSameAsBody: true,
    headingFontFamily: "",
    paperSize: DEFAULT_PAPER_KEY,
    fontSize: 13.33,
    // px (= 10pt, the Anarchist Library / Amusewiki default for A5 zine pages)
    lineHeight: 1.6,
    // unitless
    paragraphSpacing: "1rem",
    // CSS length (bottom margin on <p>)
    textAlign: "left",
    // body text: left | center | right | justify
    // Per-heading alignment: blank = same as body text, or
    // left | center | right | justify. H4–H6 follow H3.
    h1TextAlign: "",
    h2TextAlign: "",
    h3TextAlign: "",
    h1Size: 28,
    // px
    h1Weight: 700,
    h2Size: 22,
    // px
    h2Weight: 600,
    h3Size: 18,
    // px
    h3Weight: 600,
    // Per-level heading line height (unitless) and the rule drawn
    // beneath the heading. H4–H6 are unaffected by these.
    h1LineHeight: 1.25,
    h2LineHeight: 1.3,
    h3LineHeight: 1.35,
    h1Underline: true,
    h2Underline: false,
    h3Underline: false,
    baseWeight: 400,
    // regular body text weight
    boldWeight: 700,
    // <strong>/<b> weight
    marginVerticalIn: 0.75,
    // page margin, top/bottom, inches
    marginHorizontalIn: 0.75,
    // page margin, left/right, inches
    // Table of contents (placed wherever a `\toc` line appears)
    tocLevels: 3,
    // include H1..H{tocLevels}
    tocShowTitle: true,
    tocTitle: "Contents",
    tocTitleAlign: "",
    // blank = same as H2
    // Per-level ToC entry style. Size (px) / line height blank = body text's.
    tocL1Bold: true,
    tocL1Italic: false,
    tocL1Underline: false,
    tocL1Size: "",
    tocL1LineHeight: "",
    tocL2Bold: false,
    tocL2Italic: false,
    tocL2Underline: false,
    tocL2Size: "",
    tocL2LineHeight: "",
    tocL3Bold: false,
    tocL3Italic: false,
    tocL3Underline: false,
    tocL3Size: "",
    tocL3LineHeight: "",
    tocPageNumbers: true,
    tocDotLeaders: true,
    tocPageBreakAfter: true,
    pageNumbersEnabled: false,
    // show a page number at the bottom-center of every page
    pageStartFrom: 1
    // the number shown on the first page when page numbers are on
  };
  var DEFAULTS = Object.assign({}, HARDCODED_FALLBACK_DEFAULTS, window.MD2eBookDefaultConfig || {});
  var ALLOWED_BOLD_WEIGHTS = [600, 700, 800, 900];
  var TEXT_ALIGN_OPTIONS = [
    { key: "left", label: "Left" },
    { key: "center", label: "Center" },
    { key: "right", label: "Right" },
    { key: "justify", label: "Justify" }
  ];
  var ALLOWED_TEXT_ALIGNS = TEXT_ALIGN_OPTIONS.map(function(o) {
    return o.key;
  });
  var WEB_SAFE_GOOGLE_FONTS = {
    Inter: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    Merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
    "JetBrains Mono": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
  };
  var SYSTEM_FONT_STACKS = {
    Georgia: "Georgia, 'Times New Roman', serif",
    Garamond: "Garamond, 'Apple Garamond', 'Times New Roman', serif",
    Arial: "Arial, Helvetica, sans-serif",
    "Times New Roman": "'Times New Roman', Times, serif"
  };
  var FONT_STACKS = Object.assign({}, WEB_SAFE_GOOGLE_FONTS, SYSTEM_FONT_STACKS);
  function fontStackFor(family) {
    return FONT_STACKS[family] || "'" + family + "', ui-sans-serif, system-ui, sans-serif";
  }

  // apps/Markdown-to-PDF/src/settings/normalizeConfig.js
  function isBlank(value) {
    return value === void 0 || value === null || typeof value === "string" && value.trim() === "";
  }
  function toNumber(value, fallback) {
    if (isBlank(value)) return fallback;
    var n = typeof value === "number" ? value : parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function toPositiveNumber(value, fallback) {
    var n = toNumber(value, fallback);
    return n > 0 ? n : fallback;
  }
  function toPositiveInteger(value, fallback) {
    var n = toPositiveNumber(value, fallback);
    return Math.round(n);
  }
  function toCssLength(value, fallback) {
    if (isBlank(value)) return fallback;
    var str = String(value).trim();
    if (/^-?\d*\.?\d+$/.test(str)) {
      return str + "rem";
    }
    if (/^-?\d*\.?\d+(px|rem|em|in|cm|mm|pt|%)$/.test(str)) {
      return str;
    }
    return fallback;
  }
  function toBoldWeight(value, fallback) {
    var n = toNumber(value, fallback);
    if (ALLOWED_BOLD_WEIGHTS.indexOf(n) !== -1) return n;
    var closest = ALLOWED_BOLD_WEIGHTS[0];
    var closestDiff = Math.abs(n - closest);
    for (var i = 1; i < ALLOWED_BOLD_WEIGHTS.length; i++) {
      var diff = Math.abs(n - ALLOWED_BOLD_WEIGHTS[i]);
      if (diff < closestDiff) {
        closest = ALLOWED_BOLD_WEIGHTS[i];
        closestDiff = diff;
      }
    }
    return closest;
  }
  function toMarginInches(value, fallback) {
    if (isBlank(value)) return fallback;
    var str = String(value).trim();
    var bare = parseFloat(str);
    if (!Number.isFinite(bare)) return fallback;
    if (/mm$/i.test(str)) return bare / 25.4;
    if (/cm$/i.test(str)) return bare / 2.54;
    if (/pt$/i.test(str)) return bare / 72;
    return bare > 0 ? bare : fallback;
  }
  function toTextAlign(value, fallback) {
    if (isBlank(value)) return fallback;
    var v = String(value).trim().toLowerCase();
    return ALLOWED_TEXT_ALIGNS.indexOf(v) !== -1 ? v : fallback;
  }
  function toBoolean(value, fallback) {
    if (isBlank(value)) return Boolean(fallback);
    if (typeof value === "string") return !/^(false|0|no|off)$/i.test(value.trim());
    return Boolean(value);
  }
  function normalizeConfig(config) {
    config = config || {};
    var paperKey = PAPER_SIZES.hasOwnProperty(config.paperSize) ? config.paperSize : DEFAULT_PAPER_KEY;
    var fontFamilyRaw = isBlank(config.fontFamily) ? DEFAULTS.fontFamily : String(config.fontFamily).trim();
    var headingSameAsBody = toBoolean(config.headingFontSameAsBody, DEFAULTS.headingFontSameAsBody);
    var headingFontRaw = isBlank(config.headingFontFamily) ? DEFAULTS.headingFontFamily : config.headingFontFamily;
    var headingFontFamily = headingSameAsBody || isBlank(headingFontRaw) ? fontFamilyRaw : String(headingFontRaw).trim();
    var textAlign = toTextAlign(config.textAlign, toTextAlign(DEFAULTS.textAlign, "left"));
    var legacyHeadingAlign = toTextAlign(config.headingTextAlign, textAlign);
    return {
      fontFamily: fontFamilyRaw,
      fontStack: fontStackFor(fontFamilyRaw),
      headingFontFamily,
      headingFontStack: fontStackFor(headingFontFamily),
      paperSize: paperKey,
      textAlign,
      h1TextAlign: toTextAlign(config.h1TextAlign, toTextAlign(DEFAULTS.h1TextAlign, legacyHeadingAlign)),
      h2TextAlign: toTextAlign(config.h2TextAlign, toTextAlign(DEFAULTS.h2TextAlign, legacyHeadingAlign)),
      h3TextAlign: toTextAlign(config.h3TextAlign, toTextAlign(DEFAULTS.h3TextAlign, legacyHeadingAlign)),
      fontSize: toPositiveNumber(config.fontSize, DEFAULTS.fontSize),
      lineHeight: toPositiveNumber(config.lineHeight, DEFAULTS.lineHeight),
      paragraphSpacing: toCssLength(config.paragraphSpacing, DEFAULTS.paragraphSpacing),
      h1Size: toPositiveNumber(config.h1Size, DEFAULTS.h1Size),
      h1Weight: toNumber(config.h1Weight, DEFAULTS.h1Weight),
      h2Size: toPositiveNumber(config.h2Size, DEFAULTS.h2Size),
      h2Weight: toNumber(config.h2Weight, DEFAULTS.h2Weight),
      h3Size: toPositiveNumber(config.h3Size, DEFAULTS.h3Size),
      h3Weight: toNumber(config.h3Weight, DEFAULTS.h3Weight),
      h1LineHeight: toPositiveNumber(config.h1LineHeight, DEFAULTS.h1LineHeight),
      h2LineHeight: toPositiveNumber(config.h2LineHeight, DEFAULTS.h2LineHeight),
      h3LineHeight: toPositiveNumber(config.h3LineHeight, DEFAULTS.h3LineHeight),
      h1Underline: toBoolean(config.h1Underline, DEFAULTS.h1Underline),
      h2Underline: toBoolean(config.h2Underline, DEFAULTS.h2Underline),
      h3Underline: toBoolean(config.h3Underline, DEFAULTS.h3Underline),
      baseWeight: toNumber(config.baseWeight, DEFAULTS.baseWeight),
      boldWeight: toBoldWeight(config.boldWeight, DEFAULTS.boldWeight),
      // Page margin, split into a vertical (top/bottom) and horizontal
      // (left/right) component so they can be set independently. Each
      // accepts a bare number (assumed inches) or a string with a unit
      // suffix ("0.75in", "20mm", "2cm", "54pt"), and falls back
      // independently if left blank.
      marginVerticalIn: toMarginInches(config.marginVertical, DEFAULTS.marginVerticalIn),
      marginHorizontalIn: toMarginInches(config.marginHorizontal, DEFAULTS.marginHorizontalIn),
      // Page numbers: a plain boolean toggle, and the number shown on
      // the first page (subsequent pages count up from it). Any
      // truthy, non-boolean value loaded from a hand-edited config
      // file (e.g. "true" as a string) is coerced the same way a
      // checkbox's own state would be.
      tocLevels: Math.min(3, Math.max(1, Math.round(toNumber(config.tocLevels, DEFAULTS.tocLevels)) || 3)),
      tocShowTitle: toBoolean(config.tocShowTitle, DEFAULTS.tocShowTitle),
      tocTitle: isBlank(config.tocTitle) ? String(DEFAULTS.tocTitle || "Contents") : String(config.tocTitle).trim(),
      tocTitleAlign: toTextAlign(config.tocTitleAlign, toTextAlign(DEFAULTS.tocTitleAlign, "")),
      tocLevelStyles: [1, 2, 3].map(function(n) {
        var k = "tocL" + n;
        return {
          bold: toBoolean(config[k + "Bold"], DEFAULTS[k + "Bold"]),
          italic: toBoolean(config[k + "Italic"], DEFAULTS[k + "Italic"]),
          underline: toBoolean(config[k + "Underline"], DEFAULTS[k + "Underline"]),
          size: toPositiveNumber(config[k + "Size"], toPositiveNumber(DEFAULTS[k + "Size"], null)),
          lineHeight: toPositiveNumber(config[k + "LineHeight"], toPositiveNumber(DEFAULTS[k + "LineHeight"], null))
        };
      }),
      tocPageNumbers: toBoolean(config.tocPageNumbers, DEFAULTS.tocPageNumbers),
      tocDotLeaders: toBoolean(config.tocDotLeaders, DEFAULTS.tocDotLeaders),
      tocPageBreakAfter: toBoolean(config.tocPageBreakAfter, DEFAULTS.tocPageBreakAfter),
      pageNumbersEnabled: Boolean(
        isBlank(config.pageNumbersEnabled) ? DEFAULTS.pageNumbersEnabled : config.pageNumbersEnabled
      ),
      pageStartFrom: toPositiveInteger(config.pageStartFrom, DEFAULTS.pageStartFrom),
      filename: isBlank(config.filename) ? "md-to-pdf-converter.pdf" : String(config.filename).trim()
    };
  }

  // apps/Markdown-to-PDF/src/document/buildDocument.js
  function buildDocumentParts(markdownText, config, options) {
    var normalized = normalizeConfig(config);
    var paper = PAPER_SIZES[normalized.paperSize] || PAPER_SIZES[DEFAULT_PAPER_KEY];
    var styleText = generateStyleBlock(normalized, paper);
    var bodyHtml = "";
    if (typeof window.marked !== "undefined") {
      var markedFn = typeof window.marked.parse === "function" ? window.marked.parse : window.marked;
      try {
        if (window.marked.setOptions) {
          window.marked.setOptions({ breaks: false, gfm: true });
        }
      } catch (e) {
      }
      bodyHtml = markedFn(applyPageBreakMarkers(markdownText || ""));
      bodyHtml = applyToc(bodyHtml, normalized, options && options.tocPages);
    } else {
      bodyHtml = "<pre>" + escapeHtml(markdownText || "") + "</pre>";
    }
    return {
      normalized,
      paper,
      styleText,
      bodyHtml
    };
  }

  // apps/Markdown-to-PDF/src/document/fonts.js
  function fontLinkTags(normalized) {
    var tags = googleFontLinkTag(normalized.fontFamily);
    if (normalized.headingFontFamily !== normalized.fontFamily) {
      tags += googleFontLinkTag(normalized.headingFontFamily, true);
    }
    return tags;
  }
  function googleFontLinkTag(fontFamily, skipPreconnect) {
    if (WEB_SAFE_GOOGLE_FONTS.hasOwnProperty(fontFamily)) {
      var family = fontFamily.replace(/ /g, "+");
      return (skipPreconnect ? "" : '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>') + '<link href="https://fonts.googleapis.com/css2?family=' + family + ':wght@400;600;700;800;900&display=swap" rel="stylesheet">';
    }
    return "";
  }

  // apps/Markdown-to-PDF/src/export/printExport.js
  function exportToPdf(markdownText, config, options) {
    return new Promise(function(resolve, reject) {
      var parts;
      try {
        parts = buildDocumentParts(markdownText, config, options);
      } catch (err) {
        reject(err);
        return;
      }
      var docTitle = parts.normalized.filename.replace(/\.pdf$/i, "") || "Md to PDF Converter";
      var pageNumbers = buildPageNumberCss(parts.normalized);
      var printOnlyCss = "\n@page {\n  size: " + parts.paper.widthIn + "in " + parts.paper.heightIn + "in;\n  margin: " + parts.normalized.marginVerticalIn + "in " + parts.normalized.marginHorizontalIn + "in;\n" + // 2-value shorthand: vertical (top/bottom), then horizontal (left/right)
      pageNumbers.marginBox + "}\n" + pageNumbers.rootReset + "@media print {\n  html, body { margin: 0; padding: 0; background: #ffffff; }\n  .page {\n    width: 100%;\n    min-height: 0;\n    padding: 0;\n    box-shadow: none;\n  }\n}\n";
      var printDoc = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>' + escapeHtml(docTitle) + "</title>\n" + fontLinkTags(parts.normalized) + "\n<style>" + parts.styleText + printOnlyCss + '</style>\n</head>\n<body>\n<div class="page md2ebook-doc">' + parts.bodyHtml + "</div>\n</body>\n</html>";
      var iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
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
      iframe.onload = function() {
        var win;
        try {
          win = iframe.contentWindow;
          if (!win) throw new Error("Could not access the print preview frame.");
        } catch (err) {
          settleReject(err);
          return;
        }
        var doc = iframe.contentDocument;
        var fontsReady = doc && doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
        fontsReady.catch(function() {
        }).then(function() {
          setTimeout(function() {
            try {
              let onAfterPrint = function() {
                win.removeEventListener("afterprint", onAfterPrint);
                settleResolve();
              };
              win.addEventListener("afterprint", onAfterPrint);
              win.focus();
              win.print();
              cleanupTimer = setTimeout(settleResolve, 6e4);
            } catch (err) {
              settleReject(err);
            }
          }, 150);
        });
      };
      iframe.onerror = function() {
        settleReject(new Error("The print preview frame failed to load."));
      };
      document.body.appendChild(iframe);
      iframe.srcdoc = printDoc;
    });
  }

  // apps/Markdown-to-PDF/src/export/rasterDocument.js
  function buildPageBoxRuleForCapture(parts) {
    var pageNumbers = buildPageNumberCss(parts.normalized);
    return "\n@page {\n  size: " + parts.paper.widthIn + "in " + parts.paper.heightIn + "in;\n  margin: " + parts.normalized.marginVerticalIn + "in " + parts.normalized.marginHorizontalIn + "in;\n" + pageNumbers.marginBox + "}\n" + pageNumbers.rootReset + pageNumbers.overrideRule + ".page {\n  width: 100%;\n  min-height: 0;\n  padding: 0;\n  box-shadow: none;\n}\n.pagedjs_page {\n  margin-bottom: 0 !important;\n  border-bottom: none !important;\n}\n" + paginationJustifyFix();
  }
  function renderRasterizationDocument(markdownText, config) {
    var parts = buildDocumentParts(markdownText, config);
    var sanitizedBodyHtml = DOMPurify.sanitize(parts.bodyHtml);
    var script = "<script>\n  window.PagedConfig = {\n    after: function (flow) {\n      try {\n" + (parts.normalized.pageNumbersEnabled ? '        var __pages = document.querySelectorAll(".pagedjs_page");\n        for (var __i = 0; __i < __pages.length; __i++) {\n          var __box = __pages[__i].querySelector(".pagedjs_margin-bottom-center .pagedjs_margin-content");\n          if (__box) {\n            __box.setAttribute("data-md2ebook-pagenum", String(' + parts.normalized.pageStartFrom + " + __i));\n          }\n        }\n" : "") + "      } catch (e) {}\n" + tocFillScript(parts.normalized) + '      var pages = document.querySelectorAll(".pagedjs_page");\n      var images = [];\n      var i = 0;\n      function fail(err) {\n        try {\n          window.parent.postMessage({ source: "md2ebook-rasterize", error: String((err && err.message) || err) }, "*");\n        } catch (e) {}\n      }\n      function captureNext() {\n        if (i >= pages.length) {\n          try {\n            var buffers = images.map(function (b) { return b.buffer; });\n            window.parent.postMessage({\n              source: "md2ebook-rasterize",\n              images: images,\n              widthIn: ' + parts.paper.widthIn + ",\n              heightIn: " + parts.paper.heightIn + '\n            }, "*", buffers);\n          } catch (e) { fail(e); }\n          return;\n        }\n        html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true })\n          .then(function (canvas) { return new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); }); })\n          .then(function (blob) { return blob.arrayBuffer(); })\n          .then(function (buffer) { images.push({ buffer: buffer }); i++; captureNext(); })\n          .catch(fail);\n      }\n      try { captureNext(); } catch (e) { fail(e); }\n    }\n  };\n<\/script>\n<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>\n<script src="https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.js"><\/script>\n';
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Md to PDF Converter — Export</title>\n  ' + fontLinkTags(parts.normalized) + "\n  <style>" + parts.styleText + buildPageBoxRuleForCapture(parts) + "  </style>\n  " + script + '</head>\n<body>\n  <div class="page md2ebook-doc">' + sanitizedBodyHtml + "</div>\n</body>\n</html>";
  }

  // apps/Markdown-to-PDF/src/settings/initialConfig.js
  var SAMPLE_MARKDOWN = window.MD2eBookSampleMarkdown || "# Start writing here…";
  var DEFAULT_FONT_OPTIONS = [
    "Inter",
    "Merriweather",
    "Georgia",
    "Garamond",
    "JetBrains Mono",
    "Arial",
    "Times New Roman"
  ];
  var PAPER_SIZE_OPTIONS = Object.values(PAPER_SIZES);
  var BOLD_WEIGHT_OPTIONS = ALLOWED_BOLD_WEIGHTS;
  var BOOLEAN_CONFIG_KEYS = [
    "pageNumbersEnabled",
    "headingFontSameAsBody",
    "tocShowTitle",
    "tocPageNumbers",
    "tocDotLeaders",
    "tocPageBreakAfter",
    "tocL1Bold",
    "tocL1Italic",
    "tocL1Underline",
    "tocL2Bold",
    "tocL2Italic",
    "tocL2Underline",
    "tocL3Bold",
    "tocL3Italic",
    "tocL3Underline",
    "h1Underline",
    "h2Underline",
    "h3Underline"
  ];
  function defaultBool(value, fallback) {
    if (value === void 0 || value === null || value === "") return fallback;
    if (typeof value === "string") return !/^(false|0|no|off)$/i.test(value.trim());
    return Boolean(value);
  }
  var INITIAL_CONFIG = {
    fontFamily: "Inter",
    headingFontSameAsBody: DEFAULTS.headingFontSameAsBody !== false && DEFAULTS.headingFontSameAsBody !== "false",
    headingFontFamily: DEFAULTS.headingFontFamily ? String(DEFAULTS.headingFontFamily) : "",
    paperSize: String(DEFAULTS.paperSize || "a5"),
    fontSize: "",
    lineHeight: "",
    paragraphSpacing: "",
    textAlign: String(DEFAULTS.textAlign || "left"),
    h1TextAlign: DEFAULTS.h1TextAlign ? String(DEFAULTS.h1TextAlign) : "",
    h2TextAlign: DEFAULTS.h2TextAlign ? String(DEFAULTS.h2TextAlign) : "",
    h3TextAlign: DEFAULTS.h3TextAlign ? String(DEFAULTS.h3TextAlign) : "",
    h1Size: "",
    h1Weight: String(DEFAULTS.h1Weight),
    h2Size: "",
    h2Weight: String(DEFAULTS.h2Weight),
    h3Size: "",
    h3Weight: String(DEFAULTS.h3Weight),
    h1LineHeight: "",
    h2LineHeight: "",
    h3LineHeight: "",
    h1Underline: defaultBool(DEFAULTS.h1Underline, true),
    h2Underline: defaultBool(DEFAULTS.h2Underline, false),
    h3Underline: defaultBool(DEFAULTS.h3Underline, false),
    baseWeight: String(DEFAULTS.baseWeight),
    boldWeight: String(DEFAULTS.boldWeight),
    marginVertical: "",
    marginHorizontal: "",
    tocLevels: String(DEFAULTS.tocLevels || 3),
    tocShowTitle: defaultBool(DEFAULTS.tocShowTitle, true),
    tocTitle: "",
    tocTitleAlign: DEFAULTS.tocTitleAlign ? String(DEFAULTS.tocTitleAlign) : "",
    tocL1Bold: defaultBool(DEFAULTS.tocL1Bold, true),
    tocL1Italic: defaultBool(DEFAULTS.tocL1Italic, false),
    tocL1Underline: defaultBool(DEFAULTS.tocL1Underline, false),
    tocL1Size: DEFAULTS.tocL1Size ? String(DEFAULTS.tocL1Size) : "",
    tocL1LineHeight: DEFAULTS.tocL1LineHeight ? String(DEFAULTS.tocL1LineHeight) : "",
    tocL2Bold: defaultBool(DEFAULTS.tocL2Bold, false),
    tocL2Italic: defaultBool(DEFAULTS.tocL2Italic, false),
    tocL2Underline: defaultBool(DEFAULTS.tocL2Underline, false),
    tocL2Size: DEFAULTS.tocL2Size ? String(DEFAULTS.tocL2Size) : "",
    tocL2LineHeight: DEFAULTS.tocL2LineHeight ? String(DEFAULTS.tocL2LineHeight) : "",
    tocL3Bold: defaultBool(DEFAULTS.tocL3Bold, false),
    tocL3Italic: defaultBool(DEFAULTS.tocL3Italic, false),
    tocL3Underline: defaultBool(DEFAULTS.tocL3Underline, false),
    tocL3Size: DEFAULTS.tocL3Size ? String(DEFAULTS.tocL3Size) : "",
    tocL3LineHeight: DEFAULTS.tocL3LineHeight ? String(DEFAULTS.tocL3LineHeight) : "",
    tocPageNumbers: defaultBool(DEFAULTS.tocPageNumbers, true),
    tocDotLeaders: defaultBool(DEFAULTS.tocDotLeaders, true),
    tocPageBreakAfter: defaultBool(DEFAULTS.tocPageBreakAfter, true),
    pageNumbersEnabled: Boolean(DEFAULTS.pageNumbersEnabled),
    pageStartFrom: ""
  };

  // apps/Markdown-to-PDF/src/ui/Header.jsx
  function Header({ onLoadSample, onClear, onExport, isExporting, onSendToZineArranger, isSendingToArranger }) {
    return /* @__PURE__ */ React.createElement("header", { className: "md2ebook-header md2ebook-no-print topbar" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-brand" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-logo" }, "Md"), /* @__PURE__ */ React.createElement("div", { className: "topbar-brand-text" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-title" }, "Md to PDF Converter"), /* @__PURE__ */ React.createElement("div", { className: "topbar-subtitle" }, "Markdown → Publication-ready PDF"))), /* @__PURE__ */ React.createElement("div", { className: "topbar-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "log-btn", onClick: onLoadSample }, "Load Sample Markdown"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "log-btn", onClick: onClear }, "Clear Editor"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "log-btn",
        onClick: onSendToZineArranger,
        disabled: isSendingToArranger,
        title: "Exports the current document and opens it directly in ZineArranger — no manual save/reopen step"
      },
      isSendingToArranger ? "Sending…" : "Send to ZineArranger"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onExport,
        disabled: isExporting,
        title: `Opens your browser's print dialog — choose "Save as PDF" as the destination`,
        className: "btn-solid inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      },
      isExporting ? /* @__PURE__ */ React.createElement("svg", { className: "md2ebook-spinner", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", opacity: "0.3" }), /* @__PURE__ */ React.createElement("path", { d: "M22 12a10 10 0 0 0-10-10", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" })) : /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React.createElement(
        "path",
        {
          fillRule: "evenodd",
          d: "M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0118 8.653v4.097A2.25 2.25 0 0115.75 15h-.241l.305 2.14A.75.75 0 0115.023 18H4.977a.75.75 0 01-.79-.86L4.492 15H4.25A2.25 2.25 0 012 12.75V8.653c0-1.082.784-2.005 1.874-2.198.374-.056.75-.107 1.126-.153V2.75zM6.5 6.11c1.649-.176 3.319-.266 5-.266s3.351.09 5 .266V2.75a.25.25 0 00-.25-.25h-6.5a.25.25 0 00-.25-.25v3.61zm5.5 6.14v-1.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.5a.75.75 0 00.75-.75z",
          clipRule: "evenodd"
        }
      )),
      isExporting ? "Opening Print Dialog…" : "Download PDF eBook"
    )));
  }

  // apps/Markdown-to-PDF/src/document/previewDocument.js
  function renderHtmlDocument(markdownText, config) {
    var parts = buildDocumentParts(markdownText, config);
    var paginationScript = "<script>\n  window.PagedConfig = {\n    after: function (flow) {\n      try {\n" + (parts.normalized.pageNumbersEnabled ? '        var __pages = document.querySelectorAll(".pagedjs_page");\n        for (var __i = 0; __i < __pages.length; __i++) {\n          var __box = __pages[__i].querySelector(".pagedjs_margin-bottom-center .pagedjs_margin-content");\n          if (__box) {\n            __box.setAttribute("data-md2ebook-pagenum", String(' + parts.normalized.pageStartFrom + " + __i));\n          }\n        }\n" : "") + "      } catch (e) {}\n" + tocFillScript(parts.normalized) + `      try {
        window.parent.postMessage({
          source: 'md2ebook-pagedjs',
          tocPages: __tocPages,
          pageCount: flow && flow.total,
          height: document.documentElement.scrollHeight
        }, '*');
      } catch (e) {}
    }
  };
  window.addEventListener('load', function () {
    try {
      window.parent.postMessage({
        source: 'md2ebook-pagedjs',
        pageCount: null,
        height: document.documentElement.scrollHeight
      }, '*');
    } catch (e) {}
  });
<\/script>
<script src="https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.js"><\/script>
`;
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Md to PDF Converter — Preview</title>\n  ' + fontLinkTags(parts.normalized) + "\n  <style>" + parts.styleText + buildPageBoxRule(parts) + "\n    .md2ebook-space { outline: 1px dashed #cbd5e1; outline-offset: -1px; position: relative; }\n    .md2ebook-space::after { content: 'blank space \\00b7  ' attr(data-lines) ' lines'; position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); text-align: center; font: 11px ui-sans-serif, system-ui, sans-serif; color: #94a3b8; }\n  </style>\n  " + paginationScript + '</head>\n<body>\n  <div class="page md2ebook-doc">' + parts.bodyHtml + "</div>\n</body>\n</html>";
  }

  // apps/Markdown-to-PDF/src/ui/PreviewCanvas.jsx
  var { useState, useEffect, useRef, useMemo } = React;
  function PreviewCanvas({ markdown, config, onTocPages }) {
    const onTocPagesRef = useRef(onTocPages);
    onTocPagesRef.current = onTocPages;
    const outerRef = useRef(null);
    const iframeRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [contentHeightPx, setContentHeightPx] = useState(0);
    const [pageCount, setPageCount] = useState(null);
    const [paginating, setPaginating] = useState(true);
    const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
    const DPI = 96;
    const pageWidthPx = Math.round(paper.widthIn * DPI);
    const minPageHeightPx = Math.round(paper.heightIn * DPI);
    const renderedHeightPx = Math.max(minPageHeightPx, contentHeightPx);
    const srcDoc = useMemo(() => {
      return renderHtmlDocument(markdown, config);
    }, [markdown, config]);
    useEffect(() => {
      setPaginating(true);
      setPageCount(null);
      if (onTocPagesRef.current) onTocPagesRef.current(null);
    }, [srcDoc]);
    useEffect(() => {
      const el = outerRef.current;
      if (!el) return void 0;
      function recompute() {
        const availableWidth = el.clientWidth - 48;
        const next = Math.min(1, Math.max(0.15, availableWidth / pageWidthPx));
        setScale(next);
      }
      recompute();
      let observer;
      if ("ResizeObserver" in window) {
        observer = new ResizeObserver(recompute);
        observer.observe(el);
      } else {
        window.addEventListener("resize", recompute);
      }
      return () => {
        if (observer) observer.disconnect();
        else window.removeEventListener("resize", recompute);
      };
    }, [pageWidthPx]);
    useEffect(() => {
      function handleMessage(event) {
        const data = event.data;
        if (!data || data.source !== "md2ebook-pagedjs") return;
        if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
        const measuredHeight = Number(data.height);
        if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
          setContentHeightPx(measuredHeight);
        }
        if (data.tocPages && typeof data.tocPages === "object" && onTocPagesRef.current) {
          onTocPagesRef.current(data.tocPages);
        }
        const measuredPages = Number(data.pageCount);
        if (Number.isFinite(measuredPages) && measuredPages > 0) {
          setPageCount(measuredPages);
          setPaginating(false);
        }
      }
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, []);
    const [currentPage, setCurrentPage] = useState(1);
    useEffect(() => {
      const el = outerRef.current;
      if (!el) return void 0;
      const PAGE_GAP_PX = 24;
      let ticking = false;
      function computeCurrentPage() {
        ticking = false;
        if (!pageCount || pageCount <= 1) {
          setCurrentPage(1);
          return;
        }
        const pageStridePx = (minPageHeightPx + PAGE_GAP_PX) * scale;
        if (!(pageStridePx > 0)) return;
        const viewportCenter = el.scrollTop + el.clientHeight / 2;
        const estimated = Math.floor(viewportCenter / pageStridePx) + 1;
        setCurrentPage(Math.min(pageCount, Math.max(1, estimated)));
      }
      function handleScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(computeCurrentPage);
      }
      computeCurrentPage();
      el.addEventListener("scroll", handleScroll);
      return () => el.removeEventListener("scroll", handleScroll);
    }, [pageCount, scale, minPageHeightPx]);
    return /* @__PURE__ */ React.createElement("div", { ref: outerRef, className: "md2ebook-preview-pane" }, /* @__PURE__ */ React.createElement("div", { className: "md2ebook-canvas-wrapper" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "md2ebook-canvas-scale-box",
        style: {
          width: pageWidthPx * scale,
          height: renderedHeightPx * scale
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "md2ebook-page-shadow",
          style: {
            width: pageWidthPx,
            height: renderedHeightPx,
            transform: `scale(${scale})`
          }
        },
        /* @__PURE__ */ React.createElement(
          "iframe",
          {
            ref: iframeRef,
            title: "Md to PDF Converter live preview",
            className: "md2ebook-page-iframe",
            srcDoc,
            width: pageWidthPx,
            height: renderedHeightPx,
            sandbox: "allow-scripts"
          }
        )
      )
    )), /* @__PURE__ */ React.createElement("div", { className: "md2ebook-no-print md2ebook-preview-statusbar" }, paper.label, " · ", Math.round(scale * 100), "% preview scale", paginating ? " · paginating…" : pageCount ? ` · Page ${currentPage} of ${pageCount}` : ""));
  }

  // apps/Markdown-to-PDF/src/convert/requireGlobal.js
  function requireGlobal(name, featureLabel) {
    if (typeof window[name] === "undefined") {
      throw new Error(
        featureLabel + ' needs the "' + name + '" library, which did not load (this app loads it from a CDN, so it needs internet access the first time). Try again once you are online, or reload the page.'
      );
    }
    return window[name];
  }

  // apps/Markdown-to-PDF/src/convert/htmlToMarkdown.js
  function htmlToMarkdown(html) {
    var TurndownService = requireGlobal("TurndownService", "Document import");
    var td = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced"
    });
    return td.turndown(html || "");
  }

  // apps/Markdown-to-PDF/src/convert/docx.js
  function convertDocxToMarkdown(arrayBuffer) {
    var mammoth = requireGlobal("mammoth", "Word (.docx) import");
    return mammoth.convertToHtml({ arrayBuffer }).then(function(result) {
      return htmlToMarkdown(result.value);
    });
  }

  // apps/Markdown-to-PDF/src/convert/epub.js
  function convertEpubToMarkdown(arrayBuffer) {
    var JSZip = requireGlobal("JSZip", "EPUB import");
    return JSZip.loadAsync(arrayBuffer).then(function(zip) {
      var containerFile = zip.file("META-INF/container.xml");
      if (!containerFile) {
        throw new Error("This file does not look like a valid EPUB (missing META-INF/container.xml).");
      }
      return containerFile.async("string").then(function(containerXml) {
        var containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
        var rootfileEl = containerDoc.querySelector("rootfile");
        var rootfilePath = rootfileEl ? rootfileEl.getAttribute("full-path") : null;
        if (!rootfilePath) {
          throw new Error("Could not find the EPUB's content file (rootfile) in container.xml.");
        }
        var opfFile = zip.file(rootfilePath);
        if (!opfFile) {
          throw new Error(`The EPUB's content file ("` + rootfilePath + '") is missing from the archive.');
        }
        var opfDir = rootfilePath.indexOf("/") > -1 ? rootfilePath.slice(0, rootfilePath.lastIndexOf("/") + 1) : "";
        return opfFile.async("string").then(function(opfText) {
          var opfDoc = new DOMParser().parseFromString(opfText, "application/xml");
          var manifest = {};
          var manifestItems = opfDoc.querySelectorAll("manifest > item");
          for (var m = 0; m < manifestItems.length; m++) {
            manifest[manifestItems[m].getAttribute("id")] = manifestItems[m].getAttribute("href");
          }
          var spineEls = opfDoc.querySelectorAll("spine > itemref");
          var spinePaths = [];
          for (var s = 0; s < spineEls.length; s++) {
            var href = manifest[spineEls[s].getAttribute("idref")];
            if (href) spinePaths.push(opfDir + href);
          }
          if (spinePaths.length === 0) {
            throw new Error("This EPUB's spine (chapter reading order) is empty or could not be read.");
          }
          var chapterPromises = spinePaths.map(function(path) {
            var file = zip.file(path) || zip.file(decodeURIComponent(path));
            if (!file) return Promise.resolve("");
            return file.async("string").then(function(xhtml) {
              var doc = new DOMParser().parseFromString(xhtml, "text/html");
              return doc.body ? htmlToMarkdown(doc.body.innerHTML).trim() : "";
            });
          });
          return Promise.all(chapterPromises).then(function(chapters) {
            return chapters.filter(Boolean).join("\n\n" + PAGE_BREAK_MARKER + "\n\n");
          });
        });
      });
    });
  }

  // apps/Markdown-to-PDF/src/convert/muse.js
  function convertMuseInline(s) {
    var result = String(s);
    result = result.replace(/\[\[([^\]\[]+)\]\[([^\]\[]+)\]\]/g, "[$2]($1)");
    result = result.replace(/\[\[([^\]\[]+)\]\]/g, "[$1]($1)");
    result = result.replace(/_([^_]+)_/g, "<u>$1</u>");
    result = result.replace(/=([^=]+)=/g, "`$1`");
    return result;
  }
  function convertMuseToMarkdown(museText) {
    var text = String(museText || "").replace(/\r\n?/g, "\n");
    var lines = text.split("\n");
    var out = [];
    var inBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*<(example|verbatim)>\s*$/i.test(line)) {
        inBlock = true;
        out.push("```");
        continue;
      }
      if (/^\s*<\/(example|verbatim)>\s*$/i.test(line)) {
        inBlock = false;
        out.push("```");
        continue;
      }
      if (inBlock) {
        out.push(line);
        continue;
      }
      if (line.trim() === "" || /^#\w+\s/.test(line)) {
        out.push(line);
        continue;
      }
      if (/^-{4,}\s*$/.test(line)) {
        out.push("---");
        continue;
      }
      var headingMatch = line.match(/^(\*{1,5})\s+(.*)$/);
      if (headingMatch) {
        var level = Math.min(headingMatch[1].length, 6);
        out.push(new Array(level + 1).join("#") + " " + convertMuseInline(headingMatch[2]));
        continue;
      }
      var ulMatch = line.match(/^(\s*)-\s+(.*)$/);
      if (ulMatch) {
        out.push(ulMatch[1] + "- " + convertMuseInline(ulMatch[2]));
        continue;
      }
      var olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (olMatch) {
        out.push(olMatch[1] + olMatch[2] + ". " + convertMuseInline(olMatch[3]));
        continue;
      }
      if (/^ {2,}\S/.test(line)) {
        out.push("> " + convertMuseInline(line.trim()));
        continue;
      }
      out.push(convertMuseInline(line));
    }
    return out.join("\n");
  }

  // apps/Markdown-to-PDF/src/editor/importDocument.js
  var DOCUMENT_INPUT_ACCEPT = ".md,.markdown,.txt,.muse,.docx,.epub";
  var DOCUMENT_PICKER_TYPES = {
    description: "Markdown, Word, EPUB, or Muse document",
    accept: {
      "text/markdown": [".md", ".markdown"],
      "text/plain": [".txt"],
      "text/x-muse": [".muse"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/epub+zip": [".epub"]
    }
  };
  async function documentToMarkdown(file) {
    const name = file && file.name || "document";
    const dot = name.lastIndexOf(".");
    const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : "";
    if (ext === "md" || ext === "markdown" || ext === "txt") return file.text();
    if (ext === "muse") return convertMuseToMarkdown(await file.text());
    if (ext === "docx") return convertDocxToMarkdown(await file.arrayBuffer());
    if (ext === "epub") return convertEpubToMarkdown(await file.arrayBuffer());
    throw new Error(`Unsupported file type ".${ext || "?"}" — supported: .md, .txt, .muse, .docx, .epub.`);
  }

  // apps/Markdown-to-PDF/src/editor/insertLine.js
  function insertStandaloneLine(markdown, start, end, line) {
    const before = markdown.slice(0, start);
    const after = markdown.slice(end);
    const prefix = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const suffix = after.length === 0 ? "" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    const insertion = prefix + line + suffix;
    return { text: before + insertion + after, caret: (before + insertion).length };
  }
  function clampSpaceLines(value) {
    return Math.min(200, Math.max(1, parseInt(value, 10) || 5));
  }

  // shared/js/download.js
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }

  // apps/Markdown-to-PDF/src/io/filePickers.js
  async function pickFile({ id, description, accept }) {
    if (typeof window.showOpenFilePicker !== "function") return "fallback";
    try {
      const handles = await window.showOpenFilePicker({ id, multiple: false, types: [{ description, accept }] });
      return await handles[0].getFile();
    } catch (err) {
      if (err && err.name === "AbortError") return null;
      return "fallback";
    }
  }
  async function saveTextFile(text, { id, filename, mimeType, description, extensions }) {
    if (typeof window.showSaveFilePicker !== "function") return downloadText(text, filename, mimeType);
    try {
      const handle = await window.showSaveFilePicker({
        id,
        suggestedName: filename,
        types: [{ description, accept: { [mimeType]: extensions } }]
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return { saved: handle.name };
    } catch (err) {
      if (err && err.name === "AbortError") return null;
      return downloadText(text, filename, mimeType);
    }
  }
  function downloadText(text, filename, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    downloadBlob(blob, filename);
    return { downloaded: filename };
  }
  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("The browser blocked the copy.");
  }

  // apps/Markdown-to-PDF/src/ui/fields.jsx
  function SectionLabel({ children }) {
    return /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-semibold uppercase tracking-wider text-fg-muted mt-6 mb-2 first:mt-0" }, children);
  }
  function ControlField({ label, hint, children }) {
    return /* @__PURE__ */ React.createElement("label", { className: "block mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, label), children, hint ? /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted opacity-70 mt-1" }, hint) : null);
  }
  function ToggleRow({ checked, onChange, label }) {
    return /* @__PURE__ */ React.createElement("div", { className: "toggle-row mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked, onChange: (e) => onChange(e.target.checked) }), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" })), /* @__PURE__ */ React.createElement("div", { className: "toggle-row-text" }, /* @__PURE__ */ React.createElement(
      "p",
      {
        style: {
          margin: 0,
          color: "var(--ui-fg)",
          fontSize: "13px"
        }
      },
      label
    )));
  }
  function TextInput({ value, onChange, placeholder, type = "text", inputMode, step, min }) {
    return /* @__PURE__ */ React.createElement(
      "input",
      {
        type,
        inputMode,
        step,
        min,
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        className: "w-full text-sm placeholder-fg-muted"
      }
    );
  }
  function SelectInput({ value, onChange, children }) {
    return /* @__PURE__ */ React.createElement("select", { value, onChange: (e) => onChange(e.target.value), className: "w-full text-sm" }, children);
  }
  var ALIGN_ICON_LINES = {
    //            [x, width] for each of the 4 lines in a 16x16 box
    left: [
      [2, 12],
      [2, 8],
      [2, 12],
      [2, 6]
    ],
    center: [
      [2, 12],
      [4, 8],
      [2, 12],
      [5, 6]
    ],
    right: [
      [2, 12],
      [6, 8],
      [2, 12],
      [8, 6]
    ],
    justify: [
      [2, 12],
      [2, 12],
      [2, 12],
      [2, 7]
    ]
  };
  function AlignIcon({ align }) {
    return /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true" }, ALIGN_ICON_LINES[align].map(([x, w], i) => /* @__PURE__ */ React.createElement("rect", { key: i, x, y: 2.5 + i * 3.25, width: w, height: 1.5, rx: 0.75 })));
  }
  function LinkIcon() {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round",
        "aria-hidden": "true"
      },
      /* @__PURE__ */ React.createElement("path", { d: "M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9" }),
      /* @__PURE__ */ React.createElement("path", { d: "M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" })
    );
  }
  function AlignField({ label, value, onChange, inheritedValue, allowInherit, hint, linkLabel = "body text" }) {
    const following = allowInherit && !value;
    const shown = following ? inheritedValue : value;
    const linkButton = allowInherit ? /* @__PURE__ */ React.createElement(
      "button",
      {
        key: "link",
        type: "button",
        role: "radio",
        "aria-checked": following,
        title: following ? `Linked to ${linkLabel} alignment` : `Link to ${linkLabel} alignment`,
        onClick: () => onChange(""),
        className: "border-0 border-r border-line rounded-none px-2.5 py-1.5 flex items-center " + (following ? "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg")
      },
      /* @__PURE__ */ React.createElement(LinkIcon, null)
    ) : null;
    return /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, label), /* @__PURE__ */ React.createElement("div", { role: "radiogroup", "aria-label": label, className: "inline-flex rounded-md border border-line overflow-hidden" }, linkButton, TEXT_ALIGN_OPTIONS.map((o) => {
      const active = shown === o.key;
      const cls = active ? following ? "bg-ink-alt text-fg-muted" : "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg";
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: o.key,
          type: "button",
          role: "radio",
          "aria-checked": active && !following,
          title: o.label + (following && active ? " (following body text)" : ""),
          onClick: () => onChange(o.key),
          className: "border-0 rounded-none px-2.5 py-1.5 flex items-center " + cls
        },
        /* @__PURE__ */ React.createElement(AlignIcon, { align: o.key })
      );
    })), hint ? /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted opacity-70 mt-1" }, hint) : null);
  }
  function HeadingLineControls({ level, config, updateConfig }) {
    const lh = `h${level}LineHeight`;
    const ul = `h${level}Underline`;
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(ControlField, { label: `H${level} Line Height`, hint: `Default: ${DEFAULTS[lh]}` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config[lh],
        onChange: (v) => updateConfig(lh, v),
        placeholder: String(DEFAULTS[lh]),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ToggleRow, { checked: config[ul], onChange: (v) => updateConfig(ul, v), label: `Line beneath H${level}` }));
  }
  function TocLevelStyle({ level, config, updateConfig }) {
    const k = "tocL" + level;
    const toggles = [
      {
        key: "Bold",
        label: "B",
        title: "Bold",
        style: {
          fontWeight: 700
        }
      },
      {
        key: "Italic",
        label: "I",
        title: "Italic",
        style: {
          fontStyle: "italic",
          fontFamily: "Georgia, serif"
        }
      },
      {
        key: "Underline",
        label: "U",
        title: "Underline",
        style: {
          textDecoration: "underline"
        }
      }
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, `H${level} Entries`), /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "group",
        "aria-label": `H${level} entry style`,
        className: "inline-flex rounded-md border border-line overflow-hidden mb-2"
      },
      toggles.map((t, i) => {
        const on = Boolean(config[k + t.key]);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: t.key,
            type: "button",
            "aria-pressed": on,
            title: t.title,
            onClick: () => updateConfig(k + t.key, !on),
            className: "border-0 rounded-none w-8 py-1.5 text-sm leading-none " + (i > 0 ? "border-l border-line " : "") + (on ? "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg"),
            style: t.style
          },
          t.label
        );
      })
    ), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "block" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted mb-1" }, "Font Size (px)"), /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        inputMode: "decimal",
        value: config[k + "Size"],
        onChange: (v) => updateConfig(k + "Size", v),
        placeholder: String(config.fontSize || DEFAULTS.fontSize),
        step: "1",
        min: "1"
      }
    )), /* @__PURE__ */ React.createElement("label", { className: "block" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted mb-1" }, "Line Spacing"), /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        inputMode: "decimal",
        value: config[k + "LineHeight"],
        onChange: (v) => updateConfig(k + "LineHeight", v),
        placeholder: String(config.lineHeight || DEFAULTS.lineHeight),
        step: "0.1",
        min: "0.5"
      }
    ))));
  }
  function StatusLine({ status, className }) {
    if (!status) return null;
    return /* @__PURE__ */ React.createElement("p", { className: className + " text-[11px] " + (status.type === "error" ? "text-red-400" : "text-success") }, status.message);
  }

  // apps/Markdown-to-PDF/src/ui/editor/EditorTab.jsx
  var { useRef: useRef2 } = React;
  var DOCUMENT_PICKER_ID = "md2ebook-document";
  function EditorTab({ markdown, setMarkdown, docStatus, setDocStatus, spaceLines, setSpaceLines }) {
    const editorTextareaRef = useRef2(null);
    const documentFileInputRef = useRef2(null);
    const errorText = (err) => err && err.message ? err.message : String(err);
    function insertLine(line) {
      const el = editorTextareaRef.current;
      const savedScrollTop = el ? el.scrollTop : 0;
      const savedWindowY = window.scrollY;
      const start = el ? el.selectionStart : markdown.length;
      const end = el ? el.selectionEnd : markdown.length;
      const { text, caret } = insertStandaloneLine(markdown, start, end, line);
      ReactDOM.flushSync(() => {
        setMarkdown(text);
      });
      const ta = editorTextareaRef.current;
      if (ta) {
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(caret, caret);
        ta.scrollTop = savedScrollTop;
      }
      window.scrollTo(window.scrollX, savedWindowY);
    }
    function handleInsertSpace() {
      const n = clampSpaceLines(spaceLines);
      setSpaceLines(String(n));
      insertLine("\\space{" + n + "}");
    }
    async function handleImportFile(file) {
      setDocStatus(null);
      const name = file && file.name || "document";
      try {
        const converted = await documentToMarkdown(file);
        ReactDOM.flushSync(() => {
          setMarkdown(converted);
        });
        if (editorTextareaRef.current) {
          editorTextareaRef.current.focus();
          editorTextareaRef.current.setSelectionRange(0, 0);
          editorTextareaRef.current.scrollTop = 0;
        }
        setDocStatus({ type: "success", message: `Imported "${name}", replacing the editor's contents.` });
      } catch (err) {
        setDocStatus({ type: "error", message: "Could not import that file: " + errorText(err) });
      }
    }
    function handleDocumentFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      handleImportFile(file);
    }
    async function handleImportClick() {
      setDocStatus(null);
      const file = await pickFile({ id: DOCUMENT_PICKER_ID, ...DOCUMENT_PICKER_TYPES });
      if (file === "fallback") {
        if (documentFileInputRef.current) documentFileInputRef.current.click();
        return;
      }
      if (file) await handleImportFile(file);
    }
    async function handleSaveMarkdown() {
      setDocStatus(null);
      try {
        const result = await saveTextFile(markdown || "", {
          id: DOCUMENT_PICKER_ID,
          filename: "document.md",
          mimeType: "text/markdown",
          description: "Markdown file",
          extensions: [".md"]
        });
        if (!result) return;
        setDocStatus({
          type: "success",
          message: result.saved ? `Saved "${result.saved}".` : `Downloaded "${result.downloaded}" (this browser doesn't support a Save As dialog).`
        });
      } catch (err) {
        setDocStatus({ type: "error", message: "Could not save the Markdown file." });
      }
    }
    async function handleCopyAll() {
      setDocStatus(null);
      try {
        await copyText(markdown || "");
        setDocStatus({ type: "success", message: "Copied the Markdown source to the clipboard." });
      } catch (err) {
        setDocStatus({ type: "error", message: "Could not copy to the clipboard: " + errorText(err) });
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "h-full flex flex-col p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-end gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleImportClick,
        className: "log-btn",
        title: "Import a Markdown, Word (.docx), EPUB, or Muse (.muse) file — replaces the editor's contents"
      },
      "Upload…"
    ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleSaveMarkdown, className: "log-btn", title: "Save the editor's Markdown as a .md file" }, "Save…"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleCopyAll, className: "log-btn", title: "Copy the Markdown source to the clipboard" }, "Copy All"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => insertLine("\\toc"),
        className: "log-btn",
        title: "Insert a table of contents at the cursor (\\toc) — settings are in the Typography tab"
      },
      "+ ToC"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => insertLine("\\pagebreak"),
        className: "log-btn",
        title: "Insert a manual page break at the cursor (\\pagebreak)"
      },
      "+ Page Break"
    ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleInsertSpace,
        className: "log-btn",
        title: "Insert empty space at the cursor, N body lines tall (\\space{N}) — room to paste an image into the PDF later"
      },
      "+ Blank Space"
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "1",
        max: "200",
        value: spaceLines,
        onChange: (e) => setSpaceLines(e.target.value),
        "aria-label": "Blank space height in lines",
        title: "Height in lines",
        className: "w-14 text-[11px]"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-fg-muted" }, "lines")), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: documentFileInputRef,
        type: "file",
        accept: DOCUMENT_INPUT_ACCEPT,
        onChange: handleDocumentFileSelected,
        className: "hidden"
      }
    )), /* @__PURE__ */ React.createElement(StatusLine, { status: docStatus, className: "mb-2" }), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        ref: editorTextareaRef,
        className: "md2ebook-editor-textarea flex-1 w-full min-h-[60vh] rounded-md border border-line\n                         bg-ink p-3 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent",
        value: markdown,
        onChange: (e) => setMarkdown(e.target.value),
        spellCheck: false,
        placeholder: "# Start writing your Markdown here…"
      }
    ));
  }

  // apps/Markdown-to-PDF/src/ui/typography/BodyTextSection.jsx
  function BodyTextSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Body Text"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(ControlField, { label: "Body Font Size (px)", hint: `Default: ${DEFAULTS.fontSize}px` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.fontSize,
        onChange: (v) => updateConfig("fontSize", v),
        placeholder: String(DEFAULTS.fontSize),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: "Line Spacing", hint: `Default: ${DEFAULTS.lineHeight}` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.lineHeight,
        onChange: (v) => updateConfig("lineHeight", v),
        placeholder: String(DEFAULTS.lineHeight),
        inputMode: "decimal"
      }
    ))), /* @__PURE__ */ React.createElement(
      AlignField,
      {
        label: "Text Alignment",
        value: config.textAlign || "left",
        onChange: (v) => updateConfig("textAlign", v),
        hint: "Code blocks and tables stay left-aligned."
      }
    ), /* @__PURE__ */ React.createElement(ControlField, { label: "Paragraph Spacing", hint: `Default: ${DEFAULTS.paragraphSpacing} (accepts px, rem, em…)` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.paragraphSpacing,
        onChange: (v) => updateConfig("paragraphSpacing", v),
        placeholder: DEFAULTS.paragraphSpacing
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: "Base Font Weight (Regular)", hint: `Default: ${DEFAULTS.baseWeight}` }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.baseWeight, onChange: (v) => updateConfig("baseWeight", v) }, /* @__PURE__ */ React.createElement("option", { value: "300" }, "300 — Light"), /* @__PURE__ */ React.createElement("option", { value: "400" }, "400 — Regular"), /* @__PURE__ */ React.createElement("option", { value: "500" }, "500 — Medium"))), /* @__PURE__ */ React.createElement(ControlField, { label: "Bold Text Weight (Strong tags)", hint: `Default: ${DEFAULTS.boldWeight}` }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.boldWeight, onChange: (v) => updateConfig("boldWeight", v) }, BOLD_WEIGHT_OPTIONS.map((w) => /* @__PURE__ */ React.createElement("option", { key: w, value: w }, w)))));
  }

  // apps/Markdown-to-PDF/src/settings/configFile.js
  function readConfigFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("That file is not a config object.");
          }
          resolve(parsed);
        } catch (err) {
          reject(new Error("Could not read that file: " + (err && err.message ? err.message : String(err))));
        }
      };
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsText(file);
    });
  }
  function configFileName(typed) {
    const base = (typed || "config").trim() || "config";
    return /\.json$/i.test(base) ? base : base + ".json";
  }
  function appConfigFolderHint() {
    try {
      if (window.location.protocol !== "file:") return null;
      const path = decodeURIComponent(window.location.pathname);
      const slash = path.lastIndexOf("/");
      let dir = slash > -1 ? path.slice(0, slash) : path;
      if (/^\/[A-Za-z]:/.test(dir)) dir = dir.slice(1);
      return dir ? dir + "/config" : null;
    } catch (e) {
      return null;
    }
  }

  // apps/Markdown-to-PDF/src/ui/typography/ConfigFiles.jsx
  var { useRef: useRef3, useMemo: useMemo2 } = React;
  var CONFIG_PICKER_ID = "md2ebook-config";
  var CONFIG_PICKER_TYPES = { description: "JSON config file", accept: { "application/json": [".json"] } };
  function ConfigFiles({ config, applyConfig, configFilename, setConfigFilename, configStatus, setConfigStatus }) {
    const configFileInputRef = useRef3(null);
    const appFolderHint = useMemo2(appConfigFolderHint, []);
    async function loadConfigFromFile(file) {
      try {
        applyConfig(await readConfigFile(file));
        setConfigStatus({ type: "success", message: `Loaded "${file.name}".` });
      } catch (err) {
        setConfigStatus({ type: "error", message: err.message });
      }
    }
    function handleConfigFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      loadConfigFromFile(file);
    }
    async function handleOpenConfigClick() {
      setConfigStatus(null);
      const file = await pickFile({ id: CONFIG_PICKER_ID, ...CONFIG_PICKER_TYPES });
      if (file === "fallback") {
        if (configFileInputRef.current) configFileInputRef.current.click();
        return;
      }
      if (file) loadConfigFromFile(file);
    }
    async function handleSaveConfig() {
      setConfigStatus(null);
      try {
        const result = await saveTextFile(JSON.stringify(config, null, 2), {
          id: CONFIG_PICKER_ID,
          filename: configFileName(configFilename),
          mimeType: "application/json",
          description: CONFIG_PICKER_TYPES.description,
          extensions: [".json"]
        });
        if (!result) return;
        setConfigStatus({
          type: "success",
          message: result.saved ? `Saved "${result.saved}".` : `Downloaded "${result.downloaded}" (this browser doesn't support a Save As dialog).`
        });
      } catch (err) {
        setConfigStatus({ type: "error", message: "Could not save the config file." });
      }
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Saved Config Files"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1.5" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleOpenConfigClick, className: "log-btn" }, "Open…"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleSaveConfig, className: "log-btn" }, "Save…"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: configFilename,
        onChange: (e) => setConfigFilename(e.target.value),
        placeholder: "config.json",
        className: "min-w-0 flex-1 text-[11px] placeholder-fg-muted"
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: configFileInputRef,
        type: "file",
        accept: "application/json,.json",
        onChange: handleConfigFileSelected,
        className: "hidden"
      }
    )), configStatus ? /* @__PURE__ */ React.createElement(StatusLine, { status: configStatus, className: "mb-3" }) : /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-[11px] leading-relaxed text-fg-muted opacity-70" }, "Open a previously saved settings file, or save the settings below as a new one.", appFolderHint ? /* @__PURE__ */ React.createElement(React.Fragment, null, " ", "A browser can't be pointed at a folder automatically — navigate Open/Save to", " ", /* @__PURE__ */ React.createElement("code", { className: "text-[10px] not-italic" }, appFolderHint), " once (creating it if it doesn't exist yet), and both will default there from then on.") : null));
  }

  // apps/Markdown-to-PDF/src/ui/typography/HeadingsSection.jsx
  function HeadingsSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Headings"), /* @__PURE__ */ React.createElement(HeadingLevel, { level: 1, config, updateConfig }), /* @__PURE__ */ React.createElement(HeadingLevel, { level: 2, config, updateConfig }), /* @__PURE__ */ React.createElement(HeadingLevel, { level: 3, config, updateConfig, alignHint: "H4–H6 use the H3 setting." }));
  }
  function HeadingLevel({ level, config, updateConfig, alignHint }) {
    const h = "h" + level;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(ControlField, { label: `H${level} Size (px)`, hint: `Default: ${DEFAULTS[h + "Size"]}px` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config[h + "Size"],
        onChange: (v) => updateConfig(h + "Size", v),
        placeholder: String(DEFAULTS[h + "Size"]),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: `H${level} Weight`, hint: `Default: ${DEFAULTS[h + "Weight"]}` }, /* @__PURE__ */ React.createElement(SelectInput, { value: config[h + "Weight"], onChange: (v) => updateConfig(h + "Weight", v) }, BOLD_WEIGHT_OPTIONS.map((w) => /* @__PURE__ */ React.createElement("option", { key: w, value: w }, w))))), /* @__PURE__ */ React.createElement(HeadingLineControls, { level, config, updateConfig }), /* @__PURE__ */ React.createElement(
      AlignField,
      {
        label: `H${level} Alignment`,
        value: config[h + "TextAlign"],
        onChange: (v) => updateConfig(h + "TextAlign", v),
        allowInherit: true,
        inheritedValue: config.textAlign || "left",
        hint: alignHint
      }
    ));
  }

  // apps/Markdown-to-PDF/src/ui/typography/PageNumbersSection.jsx
  function PageNumbersSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Page Numbers"), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        checked: config.pageNumbersEnabled,
        onChange: (v) => updateConfig("pageNumbersEnabled", v),
        label: "Show page number on every page"
      }
    ), config.pageNumbersEnabled ? /* @__PURE__ */ React.createElement(ControlField, { label: "Page Start From", hint: `Default: ${DEFAULTS.pageStartFrom}` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.pageStartFrom,
        onChange: (v) => updateConfig("pageStartFrom", v),
        placeholder: String(DEFAULTS.pageStartFrom),
        inputMode: "numeric"
      }
    )) : null);
  }

  // apps/Markdown-to-PDF/src/ui/typography/PageSection.jsx
  function PageSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Page"), /* @__PURE__ */ React.createElement(ControlField, { label: "Paper Size" }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.paperSize, onChange: (v) => updateConfig("paperSize", v) }, PAPER_SIZE_OPTIONS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, p.label)))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(ControlField, { label: "Margin — Vertical (in)", hint: `Default: ${DEFAULTS.marginVerticalIn}in` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.marginVertical,
        onChange: (v) => updateConfig("marginVertical", v),
        placeholder: String(DEFAULTS.marginVerticalIn),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: "Margin — Horizontal (in)", hint: `Default: ${DEFAULTS.marginHorizontalIn}in` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.marginHorizontal,
        onChange: (v) => updateConfig("marginHorizontal", v),
        placeholder: String(DEFAULTS.marginHorizontalIn),
        inputMode: "decimal"
      }
    ))));
  }

  // apps/Markdown-to-PDF/src/ui/typography/TocSection.jsx
  function TocSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Table of Contents"), /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-[11px] leading-relaxed text-fg-muted opacity-70" }, "Put ", /* @__PURE__ */ React.createElement("code", { className: "text-[10px]" }, "\\toc"), " on its own line (or use + ToC above the editor) where the list should go. Entries link to their headings in the PDF."), /* @__PURE__ */ React.createElement(ControlField, { label: "Include Headings" }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.tocLevels, onChange: (v) => updateConfig("tocLevels", v) }, /* @__PURE__ */ React.createElement("option", { value: "1" }, "H1 only"), /* @__PURE__ */ React.createElement("option", { value: "2" }, "H1 – H2"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "H1 – H3"))), /* @__PURE__ */ React.createElement(ToggleRow, { checked: config.tocShowTitle, onChange: (v) => updateConfig("tocShowTitle", v), label: "Show title" }), config.tocShowTitle ? /* @__PURE__ */ React.createElement(ControlField, { label: "Title", hint: `Default: ${DEFAULTS.tocTitle || "Contents"}. Styled like H2.` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.tocTitle,
        onChange: (v) => updateConfig("tocTitle", v),
        placeholder: String(DEFAULTS.tocTitle || "Contents")
      }
    )) : null, config.tocShowTitle ? /* @__PURE__ */ React.createElement(
      AlignField,
      {
        label: "Title Alignment",
        value: config.tocTitleAlign,
        onChange: (v) => updateConfig("tocTitleAlign", v),
        allowInherit: true,
        linkLabel: "H2",
        inheritedValue: config.h2TextAlign || config.textAlign || "left"
      }
    ) : null, [1, 2, 3].filter((n) => n <= (parseInt(config.tocLevels, 10) || 3)).map((n) => /* @__PURE__ */ React.createElement(TocLevelStyle, { key: n, level: n, config, updateConfig })), /* @__PURE__ */ React.createElement("p", { className: "-mt-2 mb-3 text-[11px] text-fg-muted opacity-70" }, "Leave a box blank to match body text."), /* @__PURE__ */ React.createElement(ToggleRow, { checked: config.tocPageNumbers, onChange: (v) => updateConfig("tocPageNumbers", v), label: "Show page numbers" }), config.tocPageNumbers ? /* @__PURE__ */ React.createElement(ToggleRow, { checked: config.tocDotLeaders, onChange: (v) => updateConfig("tocDotLeaders", v), label: "Dotted line to page number" }) : null, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        checked: config.tocPageBreakAfter,
        onChange: (v) => updateConfig("tocPageBreakAfter", v),
        label: "Start a new page after the contents"
      }
    ));
  }

  // apps/Markdown-to-PDF/src/ui/FontCombobox.jsx
  var { useState: useState2, useEffect: useEffect2, useRef: useRef4, useMemo: useMemo3 } = React;
  function FontCombobox({ fontOptions, setFontOptions, value, onChange }) {
    const [query, setQuery] = useState2(value || "");
    const [open, setOpen] = useState2(false);
    const [status, setStatus] = useState2(null);
    const [loadingFonts, setLoadingFonts] = useState2(false);
    const containerRef = useRef4(null);
    useEffect2(() => {
      setQuery(value || "");
    }, [value]);
    useEffect2(() => {
      function handleClickOutside(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setOpen(false);
          setQuery(value || "");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);
    const filtered = useMemo3(() => {
      const q = query.trim().toLowerCase();
      if (!q) return fontOptions;
      return fontOptions.filter((f) => f.toLowerCase().includes(q));
    }, [fontOptions, query]);
    function selectFont(font) {
      onChange(font);
      setQuery(font);
      setOpen(false);
    }
    async function handleLoadLocalFonts() {
      setStatus(null);
      if (!("queryLocalFonts" in window)) {
        setStatus({
          type: "error",
          message: "Local Font Access is not supported in this browser. Try Chrome or Edge 103+ (over HTTPS or localhost)."
        });
        return;
      }
      setLoadingFonts(true);
      try {
        const availableFonts = await window.queryLocalFonts();
        const families = Array.from(new Set(availableFonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b));
        setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
        setStatus({
          type: "success",
          message: `Loaded ${families.length} local system fonts.`
        });
      } catch (err) {
        const denied = err && (err.name === "NotAllowedError" || /permission/i.test(err.message || ""));
        setStatus({
          type: "error",
          message: denied ? "Permission to read local fonts was denied." : "Could not load local fonts: " + (err && err.message ? err.message : String(err))
        });
      } finally {
        setLoadingFonts(false);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { ref: containerRef, className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setOpen(true);
        },
        onFocus: () => setOpen(true),
        placeholder: "Search fonts…",
        className: "w-full text-sm pr-8 placeholder-fg-muted"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setOpen((o) => !o),
        className: "absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg bg-transparent border-0 p-0",
        "aria-label": "Toggle font list"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React.createElement(
        "path",
        {
          fillRule: "evenodd",
          d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
          clipRule: "evenodd"
        }
      ))
    )), open ? /* @__PURE__ */ React.createElement("div", { className: "absolute z-20 mt-1 w-full rounded-md border border-line bg-ink-card shadow-lg" }, /* @__PURE__ */ React.createElement("ul", { className: "md2ebook-combobox-list py-1" }, filtered.length === 0 ? /* @__PURE__ */ React.createElement("li", { className: "px-3 py-2 text-sm text-fg-muted" }, 'No fonts match "', query, '"') : filtered.map((font) => /* @__PURE__ */ React.createElement("li", { key: font }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => selectFont(font),
        style: {
          fontFamily: `'${font}', sans-serif`
        },
        className: "w-full text-left px-3 py-1.5 text-sm border-0 hover:bg-ink-alt " + (font === value ? "bg-ink-alt text-accent font-medium" : "bg-transparent text-fg font-normal")
      },
      font
    ))))) : null, /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleLoadLocalFonts,
        disabled: loadingFonts,
        className: "inline-flex items-center gap-1.5 disabled:opacity-50"
      },
      loadingFonts ? /* @__PURE__ */ React.createElement("svg", { className: "md2ebook-spinner", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", opacity: "0.25" }), /* @__PURE__ */ React.createElement("path", { d: "M22 12a10 10 0 0 0-10-10", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" })) : /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React.createElement("path", { d: "M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" })),
      "Load Local System Fonts"
    )), status ? /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-[11px] " + (status.type === "error" ? "text-red-400" : "text-success") }, status.message) : null);
  }

  // apps/Markdown-to-PDF/src/ui/typography/TypefaceSection.jsx
  function TypefaceSection({ config, updateConfig, fontOptions, setFontOptions }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Typeface"), /* @__PURE__ */ React.createElement(ControlField, { label: "Font Family" }, /* @__PURE__ */ React.createElement(
      FontCombobox,
      {
        fontOptions,
        setFontOptions,
        value: config.fontFamily,
        onChange: (v) => updateConfig("fontFamily", v)
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, "Heading Font Family"), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        checked: config.headingFontSameAsBody,
        label: "Same as body font",
        onChange: (same) => {
          updateConfig("headingFontSameAsBody", same);
          if (!same && !String(config.headingFontFamily || "").trim()) updateConfig("headingFontFamily", config.fontFamily);
        }
      }
    ), !config.headingFontSameAsBody ? /* @__PURE__ */ React.createElement(ControlField, { label: "Custom Heading Font", hint: "Used for H1–H6. Leave blank to fall back to the body font." }, /* @__PURE__ */ React.createElement(
      FontCombobox,
      {
        fontOptions,
        setFontOptions,
        value: config.headingFontFamily,
        onChange: (v) => updateConfig("headingFontFamily", v)
      }
    )) : null);
  }

  // apps/Markdown-to-PDF/src/ui/Sidebar.jsx
  var { useState: useState3 } = React;
  function Sidebar({ activeTab, setActiveTab, markdown, setMarkdown, config, updateConfig, applyConfig, fontOptions, setFontOptions }) {
    const [docStatus, setDocStatus] = useState3(null);
    const [spaceLines, setSpaceLines] = useState3("5");
    const [configFilename, setConfigFilename] = useState3("config.json");
    const [configStatus, setConfigStatus] = useState3(null);
    const sectionProps = { config, updateConfig };
    return /* @__PURE__ */ React.createElement("aside", { className: "md2ebook-sidebar" }, /* @__PURE__ */ React.createElement("div", { className: "tabbar" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setActiveTab("editor"), className: "tab" + (activeTab === "editor" ? " active" : "") }, "Editor"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setActiveTab("typography"), className: "tab" + (activeTab === "typography" ? " active" : "") }, "Typography")), /* @__PURE__ */ React.createElement("div", { className: "md2ebook-sidebar-content" }, activeTab === "editor" ? /* @__PURE__ */ React.createElement(
      EditorTab,
      {
        markdown,
        setMarkdown,
        docStatus,
        setDocStatus,
        spaceLines,
        setSpaceLines
      }
    ) : /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement(
      ConfigFiles,
      {
        config,
        applyConfig,
        configFilename,
        setConfigFilename,
        configStatus,
        setConfigStatus
      }
    ), /* @__PURE__ */ React.createElement(TypefaceSection, { ...sectionProps, fontOptions, setFontOptions }), /* @__PURE__ */ React.createElement(PageSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(BodyTextSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(HeadingsSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(TocSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(PageNumbersSection, { ...sectionProps }))));
  }

  // apps/Markdown-to-PDF/src/ui/App.jsx
  var { useState: useState4, useRef: useRef5, useCallback } = React;
  function App() {
    const [markdown, setMarkdown] = useState4(SAMPLE_MARKDOWN);
    const [config, setConfig] = useState4(INITIAL_CONFIG);
    const [activeTab, setActiveTab] = useState4("editor");
    const [fontOptions, setFontOptions] = useState4(DEFAULT_FONT_OPTIONS);
    const [isExporting, setIsExporting] = useState4(false);
    const [exportError, setExportError] = useState4(null);
    const [isSendingToArranger, setIsSendingToArranger] = useState4(false);
    const tocPagesRef = useRef5(null);
    const handleTocPages = useCallback((map) => {
      tocPagesRef.current = map;
    }, []);
    const updateConfig = useCallback((key, value) => {
      setConfig((prev) => ({
        ...prev,
        [key]: value
      }));
    }, []);
    const applyConfig = useCallback((loaded) => {
      if (loaded && loaded.headingTextAlign) {
        loaded = {
          ...loaded
        };
        ["h1TextAlign", "h2TextAlign", "h3TextAlign"].forEach((k) => {
          if (!loaded[k]) loaded[k] = loaded.headingTextAlign;
        });
      }
      setConfig((prev) => {
        const next = {
          ...prev
        };
        Object.keys(prev).forEach((key) => {
          if (!Object.prototype.hasOwnProperty.call(loaded, key)) return;
          const value = loaded[key];
          if (BOOLEAN_CONFIG_KEYS.includes(key)) {
            next[key] = typeof value === "string" ? !/^(false|0|no|off|)$/i.test(value.trim()) : Boolean(value);
          } else {
            next[key] = value === null || value === void 0 ? "" : String(value);
          }
        });
        return next;
      });
    }, []);
    function handleLoadSample() {
      setMarkdown(SAMPLE_MARKDOWN);
    }
    function handleClear() {
      setMarkdown("");
    }
    function deriveFilename(md) {
      const match = /^#\s+(.+)$/m.exec(md || "");
      if (!match) return "md-to-pdf-converter.pdf";
      const slug = match[1].trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
      return (slug || "md2ebook") + ".pdf";
    }
    async function handleExport() {
      setExportError(null);
      setIsExporting(true);
      try {
        await exportToPdf(
          markdown,
          {
            ...config,
            filename: deriveFilename(markdown)
          },
          {
            tocPages: tocPagesRef.current
          }
        );
      } catch (err) {
        setExportError(err && err.message || "Something went wrong while opening the print dialog.");
      } finally {
        setIsExporting(false);
      }
    }
    async function handleSendToZineArranger() {
      if (isSendingToArranger) return;
      setExportError(null);
      setIsSendingToArranger(true);
      let iframe = null;
      async function buildBytes() {
        const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
        const DPI = 96;
        const rasterResult = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            window.removeEventListener("message", onRasterMessage);
            reject(new Error("Rendering the document for export timed out."));
          }, 6e4);
          function onRasterMessage(event) {
            if (!iframe || event.source !== iframe.contentWindow) return;
            const data = event.data;
            if (!data || data.source !== "md2ebook-rasterize") return;
            if (data.error) {
              clearTimeout(timeoutId);
              window.removeEventListener("message", onRasterMessage);
              reject(new Error(data.error));
              return;
            }
            if (!Array.isArray(data.images)) return;
            clearTimeout(timeoutId);
            window.removeEventListener("message", onRasterMessage);
            resolve(data);
          }
          window.addEventListener("message", onRasterMessage);
          iframe = document.createElement("iframe");
          iframe.setAttribute("aria-hidden", "true");
          iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
          iframe.style.position = "fixed";
          iframe.style.left = "-99999px";
          iframe.style.top = "0";
          iframe.style.border = "0";
          iframe.width = String(Math.round(paper.widthIn * DPI));
          iframe.height = String(Math.round(paper.heightIn * DPI));
          iframe.srcdoc = renderRasterizationDocument(markdown, config);
          document.body.appendChild(iframe);
        });
        const { PDFDocument } = window.PDFLib;
        const outDoc = await PDFDocument.create();
        const pageWidthPts = rasterResult.widthIn * 72;
        const pageHeightPts = rasterResult.heightIn * 72;
        for (const img of rasterResult.images) {
          const pngImage = await outDoc.embedPng(img.buffer);
          const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
          outPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pageWidthPts,
            height: pageHeightPts
          });
        }
        return outDoc.save();
      }
      try {
        await sendPdfToZineArranger(buildBytes, deriveFilename(markdown));
      } catch (err) {
        setExportError("Couldn't send to ZineArranger — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        setIsSendingToArranger(false);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "md2ebook-app" }, /* @__PURE__ */ React.createElement(
      Header,
      {
        onLoadSample: handleLoadSample,
        onClear: handleClear,
        onExport: handleExport,
        isExporting,
        onSendToZineArranger: handleSendToZineArranger,
        isSendingToArranger
      }
    ), exportError ? /* @__PURE__ */ React.createElement("div", { className: "md2ebook-no-print flex-none bg-red-950/40 border-b border-red-900 text-red-300 text-xs px-5 py-2 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", null, "PDF export failed: ", exportError), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setExportError(null),
        className: "text-red-400 hover:text-red-300 font-medium ml-4 bg-transparent border-0 p-0"
      },
      "Dismiss"
    )) : null, /* @__PURE__ */ React.createElement("div", { className: "md2ebook-body" }, /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        activeTab,
        setActiveTab,
        markdown,
        setMarkdown,
        config,
        updateConfig,
        applyConfig,
        fontOptions,
        setFontOptions
      }
    ), /* @__PURE__ */ React.createElement(PreviewCanvas, { markdown, config, onTocPages: handleTocPages })));
  }

  // apps/Markdown-to-PDF/src/main.jsx
  var rootElement = document.getElementById("root");
  var root = ReactDOM.createRoot(rootElement);
  root.render(/* @__PURE__ */ React.createElement(App, null));
})();
