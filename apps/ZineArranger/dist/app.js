// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.
(() => {
  // shared/js/leaveWarning.js
  var hasWork = () => false;
  var bypassOnce = false;
  var installed = false;
  function warnBeforeLeaving(check) {
    hasWork = check;
    if (installed) return;
    installed = true;
    window.addEventListener("beforeunload", (e) => {
      if (bypassOnce || !hasWork()) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  // shared/js/zineArrangerHandoff.js
  var ARRANGER_READY_MESSAGE = "zinearranger-ready";
  var HANDOFF_PDF_MESSAGE = "zeditor-handoff-pdf";

  // apps/ZineArranger/src/sizes.js
  var SIZE_HALF = 0;
  var SIZE_QUARTER = 1;
  var SIZE_EIGHTH = 2;
  var SIZE_12TH = 3;
  var SIZE_16TH = 4;
  var SIZE_24TH = 5;
  var SIZE_32ND = 6;
  var SIZE_36TH = 7;
  var SIZE_48TH = 8;
  var SIZE_64TH = 9;
  var SIZE_CHARS = ["2-", "4-", "8-", "12-", "16-", "24-", "32-", "36-", "48-", "64-"];
  var MAX_AUTO_SIGNATURE_SHEETS = 25;

  // apps/ZineArranger/src/state.js
  var state = {
    size: SIZE_EIGHTH,
    doubleSided: false,
    // whether we are printing double-sided
    zinePortrait: true,
    // whether the zine is portrait orientation (false=landscape)
    spineSide: true,
    // whether the spine is on the side of the zine (false=top spine)
    flipBackCover: true,
    // whether to flip the back cover on top fold zines (false = cover is right-side up from outside; true = cover right side up when viewed as last page)
    quarterCopy: false,
    // whether each sheet of a quarter-sized zine should have two copies instead of two different sheets of pages
    guideMargins: false,
    // whether to display a guide line around the margins
    guideCenter: false,
    // whether to display a guide line along the center cut section (for quarter sized & 8-page mini)
    guideFolds: false,
    // whether to display guide lines along folds
    blankAfterPages: [],
    // list of PDF page numbers (1-indexed) after which a manual blank zine page should be inserted; a page number listed twice inserts two blanks
    pageRangeSpec: "",
    // raw "Select Pages" field value (e.g. "1-3,7") — parsed against the real page count once a PDF is loaded, see parsePageRange()
    logPanelVisible: true,
    // whether the activity log panel is expanded
    pagePortrait: false,
    // whether the printed page is portrait orientation (calculated based on above values)
    aspectWidth: 297,
    aspectHeight: 210,
    divHoriz: 4,
    // number of horizontal pages per sheet
    divVert: 2,
    // number of vertical pages per sheet
    pagerat: 5.5 / 4.25,
    pgmult: 8,
    // number of zine pages on a full sheet
    sheetWidth: 1100,
    sheetHeight: 850,
    pageWidth: 275,
    pageHeight: 425,
    pageCount: 0,
    sigSize: -1,
    // the size of each signature, in full sheets of paper. -1 will make the whole zine in one signature (subject to the auto-cap below, unless overridden)
    specsString: "8-1ps",
    pgunit: "mm",
    showExtraSizes: false,
    previewResizeTimer: null,
    // pending window-resize update (see main.js)
    isReverseImposeActive: false
    // true once the "Reverse Impose" toggle is on
  };

  // apps/ZineArranger/src/activityLog.js
  function logTimestamp() {
    return (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour12: false });
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function logSys(msg) {
    var out = document.getElementById("log-output");
    if (!out) return;
    var line = document.createElement("div");
    line.className = "log-line log-sys";
    line.textContent = "[" + logTimestamp() + "] # " + msg;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }
  function logCmd(codeLine) {
    var out = document.getElementById("log-output");
    if (!out) return;
    var line = document.createElement("div");
    line.className = "log-line log-cmd";
    line.innerHTML = '<span class="log-time">[' + logTimestamp() + ']</span> <span class="log-prompt">&#10095;</span> <span class="log-code">' + escapeHtml(codeLine) + "</span>";
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }
  function logResult(msg, isWarn) {
    var out = document.getElementById("log-output");
    if (!out) return;
    var line = document.createElement("div");
    line.className = "log-line log-result" + (isWarn ? " log-warn" : "");
    line.innerHTML = '<span class="log-arrow">&#8618;</span> ' + escapeHtml(msg);
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }
  function clearLog() {
    document.getElementById("log-output").innerHTML = "";
    logSys("Log cleared.");
  }
  function toggleLogPanel() {
    state.logPanelVisible = !state.logPanelVisible;
    document.getElementById("log-output-wrap").style.display = state.logPanelVisible ? "block" : "none";
    document.getElementById("log-toggle-btn").textContent = state.logPanelVisible ? "Hide" : "Show";
  }
  function copyLog() {
    var out = document.getElementById("log-output");
    var btn = document.getElementById("log-copy-btn");
    if (!out || !btn) return;
    var lines = out.querySelectorAll(".log-line");
    var text = Array.prototype.map.call(lines, function(el) {
      return el.textContent;
    }).join("\n");
    function flash(label) {
      var original = "⧉ Copy";
      btn.textContent = label;
      setTimeout(function() {
        btn.textContent = original;
      }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        flash("✓ Copied");
      }).catch(function() {
        flash("Error");
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        flash("✓ Copied");
      } catch (e) {
        flash("Error");
      }
      document.body.removeChild(ta);
    }
  }

  // apps/ZineArranger/src/print.js
  function triggerPrint() {
    logCmd("triggerPrint()");
    logResult("Opening the browser print dialog...");
    window.print();
  }
  function setReverseImposePageSize(widthIn, heightIn) {
    var styleEl = document.getElementById("ri-page-size-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "ri-page-size-style";
      document.head.appendChild(styleEl);
    }
    if (widthIn && heightIn) {
      styleEl.textContent = "@media print { @page { size: " + widthIn.toFixed(3) + "in " + heightIn.toFixed(3) + "in; margin: 0; } }";
      logResult("Print page size set to " + widthIn.toFixed(2) + "in × " + heightIn.toFixed(2) + "in to match the de-imposed pages.");
    } else {
      styleEl.textContent = "";
    }
  }
  function setPageOrientation(prt) {
    if (prt) {
      document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: portrait; } }";
    } else {
      document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: landscape; } }";
    }
  }

  // apps/ZineArranger/src/imposition/layouts.js
  var LAYOUTS = {
    "half/single/portrait/side": {
      grid: "half-por",
      portraitPaper: false,
      pagesPerSheet: 4,
      sides: [
        [
          "tl e",
          "tr foldLeft s"
        ],
        [
          "tl s+1",
          "tr foldLeft e-1"
        ]
      ]
    },
    "half/single/landscape/side": {
      grid: "half-lnd",
      portraitPaper: true,
      pagesPerSheet: 4,
      sides: [
        [
          "tl s",
          "tr foldBottom e"
        ],
        [
          "tl r s+1",
          "tr r foldTop e-1"
        ]
      ],
      backCover: [{ side: 0, cell: 1, spec: "tr r foldTop e" }]
    },
    "quarter/single/portrait/side": {
      grid: "",
      portraitPaper: true,
      pagesPerSheet: 4,
      sides: [
        [
          "tl r foldTop s",
          "tr r foldRight foldTop e",
          "bl s+1",
          "br foldLeft e-1"
        ]
      ]
    },
    "quarter/single/portrait/top": {
      grid: "",
      portraitPaper: true,
      pagesPerSheet: 4,
      sides: [
        [
          "tl r foldTop e-1",
          "tr foldLeft foldBottom e",
          "bl r s+1",
          "br foldLeft s"
        ]
      ],
      backCover: [{ side: 0, cell: 1, spec: "tr r foldRight foldTop e" }]
    },
    "quarter/single/landscape/side": {
      grid: "",
      portraitPaper: false,
      pagesPerSheet: 4,
      sides: [
        [
          "tl r foldTop e-1",
          "tr r foldRight foldTop s+1",
          "bl e",
          "br foldLeft s"
        ]
      ]
    },
    "quarter/single/landscape/top": {
      grid: "",
      portraitPaper: false,
      pagesPerSheet: 4,
      sides: [
        [
          "tl r foldTop e-1",
          "tr foldLeft foldBottom e",
          "bl r s+1",
          "br foldLeft s"
        ]
      ],
      backCover: [{ side: 0, cell: 1, spec: "tr r foldRight foldTop e" }]
    },
    "quarter/double/portrait/side": {
      grid: "qtr-side",
      portraitPaper: true,
      pagesPerSheet: 8,
      step: 2,
      sides: [
        [
          "tl cutBottom e",
          "tr foldLeft cutBottom s",
          "bl n",
          "br foldLeft m"
        ],
        [
          "tl cutBottom s+1",
          "tr foldLeft cutBottom e-1",
          "bl m+1",
          "br foldLeft n-1"
        ]
      ]
    },
    "quarter/double/portrait/side/copy": {
      grid: "qtr-side",
      portraitPaper: true,
      pagesPerSheet: 4,
      sides: [
        [
          "tl cutBottom e",
          "tr foldLeft cutBottom s",
          "bl eb",
          "br foldLeft sb"
        ],
        [
          "tl cutBottom s+1",
          "tr foldLeft cutBottom e-1",
          "bl s+1b",
          "br foldLeft e-1b"
        ]
      ]
    },
    "quarter/double/portrait/top": {
      grid: "qtr-side",
      portraitPaper: true,
      pagesPerSheet: 8,
      step: 2,
      sides: [
        [
          "tl foldBottom n",
          "tr cutLeft foldBottom e",
          "bl m",
          "br cutLeft s"
        ],
        [
          "tl r foldTop e-1",
          "tr r cutRight foldTop n-1",
          "bl r s+1",
          "br r cutRight m+1"
        ]
      ],
      backCover: [{ side: 0, cell: 1, spec: "tr r cutRight foldTop e" }]
    },
    "quarter/double/portrait/top/copy": {
      grid: "qtr-side",
      portraitPaper: true,
      pagesPerSheet: 4,
      sides: [
        [
          "tl foldBottom e",
          "tr cutLeft foldBottom eb",
          "bl s",
          "br cutLeft sb"
        ],
        [
          "tl r foldTop e-1",
          "tr r cutRight foldTop e-1b",
          "bl r s+1",
          "br r cutRight s+1b"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "tl r foldTop e" }, { side: 0, cell: 1, spec: "tr r cutRight foldTop eb" }]
    },
    "quarter/double/landscape/side": {
      grid: "qtr-side",
      portraitPaper: false,
      pagesPerSheet: 8,
      step: 2,
      sides: [
        [
          "tl cutBottom e",
          "tr foldLeft cutBottom s",
          "bl n",
          "br foldLeft m"
        ],
        [
          "tl cutBottom s+1",
          "tr foldLeft cutBottom e-1",
          "bl m+1",
          "br foldLeft n-1"
        ]
      ]
    },
    "quarter/double/landscape/side/copy": {
      grid: "qtr-side",
      portraitPaper: false,
      pagesPerSheet: 4,
      sides: [
        [
          "tl cutBottom e",
          "tr foldLeft cutBottom s",
          "bl eb",
          "br foldLeft sb"
        ],
        [
          "tl cutBottom s+1",
          "tr foldLeft cutBottom e-1",
          "bl s+1b",
          "br foldLeft e-1b"
        ]
      ]
    },
    "quarter/double/landscape/top": {
      grid: "qtr-side",
      portraitPaper: false,
      pagesPerSheet: 8,
      step: 2,
      sides: [
        [
          "tl foldBottom n",
          "tr cutLeft foldBottom e",
          "bl m",
          "br cutLeft s"
        ],
        [
          "tl r foldTop e-1",
          "tr r cutRight foldTop n-1",
          "bl r s+1",
          "br r cutRight m+1"
        ]
      ],
      backCover: [{ side: 0, cell: 1, spec: "tr r cutRight foldTop e" }]
    },
    "quarter/double/landscape/top/copy": {
      grid: "qtr-side",
      portraitPaper: false,
      pagesPerSheet: 4,
      sides: [
        [
          "tl foldBottom e",
          "tr cutLeft foldBottom eb",
          "bl s",
          "br cutLeft sb"
        ],
        [
          "tl r foldTop e-1",
          "tr r cutRight foldTop e-1b",
          "bl r s+1",
          "br r cutRight s+1b"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "tl r foldTop e" }, { side: 0, cell: 1, spec: "tr r cutRight foldTop eb" }]
    },
    "eighth/single/portrait/side": {
      grid: "eig-por",
      portraitPaper: false,
      pagesPerSheet: 8,
      sides: [
        [
          "tl r foldTop e-3",
          "tml r foldRight cutTop s+3",
          "tmr r foldRight cutTop s+2",
          "tr r foldRight foldTop s+1",
          "bl e-2",
          "bml foldLeft e-1",
          "bmr foldLeft e",
          "br foldLeft s"
        ]
      ]
    },
    "eighth/single/portrait/top": {
      grid: "eig-por",
      portraitPaper: false,
      pagesPerSheet: 8,
      sides: [
        [
          "tl foldBottom e",
          "tml r cutRight foldTop s+2",
          "tmr foldLeft foldBottom s+3",
          "tr r cutRight foldTop e-1",
          "bl s",
          "bml r foldRight s+1",
          "bmr cutLeft e-3",
          "br r foldRight e-2"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "tl r foldTop e" }]
    },
    "eighth/single/landscape/side": {
      grid: "eig-lnd",
      portraitPaper: true,
      pagesPerSheet: 8,
      sides: [
        [
          "tl r foldTop e",
          "tml foldLeft cutBottom s+2",
          "tmr r foldRight cutTop s+3",
          "tr foldLeft foldBottom e-1",
          "bl r s",
          "bml foldLeft s+1",
          "bmr r foldRight e-3",
          "br foldLeft e-2"
        ]
      ]
    },
    "eighth/single/landscape/top": {
      grid: "eig-lnd",
      portraitPaper: true,
      pagesPerSheet: 8,
      sides: [
        [
          "tl r foldTop e-3",
          "tml r foldRight foldTop s+3",
          "tmr r cutRight foldTop s+2",
          "tr r foldRight foldTop s+1",
          "bl e-2",
          "bml cutLeft e-1",
          "bmr foldLeft e",
          "br cutLeft s"
        ]
      ],
      backCover: [{ side: 0, cell: 6, spec: "bmr r foldRight e" }]
    },
    "eighth/double/portrait/side": {
      grid: "eig-por",
      portraitPaper: false,
      pagesPerSheet: 16,
      sides: [
        [
          "tl r cutTop s+4",
          "tml r foldRight cutTop e-4",
          "tmr r cutRight cutTop e-7",
          "tr r foldRight cutTop s+7",
          "bl s+3",
          "bml foldLeft e-3",
          "bmr cutLeft e",
          "br foldLeft s"
        ],
        [
          "tl r cutTop s+6",
          "tml r foldRight cutTop e-6",
          "tmr r cutRight cutTop e-5",
          "tr r foldRight cutTop s+5",
          "bl s+1",
          "bml foldLeft e-1",
          "bmr cutLeft e-2",
          "br foldLeft s+2"
        ]
      ]
    },
    "eighth/double/portrait/top": {
      grid: "eig-por",
      portraitPaper: false,
      pagesPerSheet: 16,
      sides: [
        [
          "tl r foldTop e-3",
          "tml cutLeft foldBottom e-4",
          "tmr r cutRight foldTop e-7",
          "tr cutLeft foldBottom e",
          "bl r s+3",
          "bml cutLeft s+4",
          "bmr r cutRight s+7",
          "br cutLeft s"
        ],
        [
          "tl r foldTop e-1",
          "tml cutLeft foldBottom e-6",
          "tmr r cutRight foldTop e-5",
          "tr cutLeft foldBottom e-2",
          "bl r s+1",
          "bml cutLeft s+6",
          "bmr r cutRight s+5",
          "br cutLeft s+2"
        ]
      ],
      backCover: [{ side: 0, cell: 3, spec: "tr r cutRight foldTop e" }]
    },
    "eighth/double/landscape/side": {
      grid: "eig-lnd",
      portraitPaper: true,
      pagesPerSheet: 16,
      sides: [
        [
          "tl r foldTop s+3",
          "tml cutLeft foldBottom s+4",
          "tmr r cutRight foldTop s+7",
          "tr cutLeft foldBottom s",
          "bl r e-3",
          "bml cutLeft e-4",
          "bmr r cutRight e-7",
          "br cutLeft e"
        ],
        [
          "tl r foldTop e-2",
          "tml cutLeft foldBottom e-5",
          "tmr r cutRight foldTop e-6",
          "tr cutLeft foldBottom e-1",
          "bl r s+2",
          "bml cutLeft s+5",
          "bmr r cutRight s+6",
          "br cutLeft s+1"
        ]
      ]
    },
    "eighth/double/landscape/top": {
      grid: "eig-lnd",
      portraitPaper: true,
      pagesPerSheet: 16,
      sides: [
        [
          "tl cutBottom s+7",
          "tml foldLeft cutBottom e-7",
          "tmr cutLeft cutBottom e",
          "tr foldLeft cutBottom s",
          "bl r s+4",
          "bml r foldRight e-4",
          "bmr r cutRight e-3",
          "br r cutRight s+3"
        ],
        [
          "tl cutBottom s+5",
          "tml foldLeft cutBottom e-5",
          "tmr cutLeft cutBottom e-2",
          "tr foldLeft cutBottom s+2",
          "bl r s+6",
          "bml r foldRight e-6",
          "bmr r cutRight e-1",
          "br r foldRight s+1"
        ]
      ],
      backCover: [{ side: 0, cell: 2, spec: "tmr r cutRight cutTop e" }]
    },
    "12th/single/portrait/side": {
      grid: "twlv-por",
      portraitPaper: false,
      pagesPerSheet: 12,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-5",
          "g01 r cutTop foldRight s+5",
          "g02 r cutTop foldRight s+4",
          "g03 r cutTop foldRight s+3",
          "g04 r cutTop foldRight s+2",
          "g05 r foldTop foldRight s+1",
          "g10 e-4",
          "g11 foldLeft e-3",
          "g12 foldLeft e-2",
          "g13 foldLeft e-1",
          "g14 foldLeft e",
          "g15 foldLeft s"
        ]
      ]
    },
    "12th/single/portrait/top": {
      grid: "twlv-por",
      portraitPaper: false,
      pagesPerSheet: 12,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e",
          "g01 r foldTop cutRight s+2",
          "g02 foldBottom foldLeft s+3",
          "g03 r foldTop cutRight e-5",
          "g04 foldBottom foldLeft e-4",
          "g05 r cutRight foldTop e-1",
          "g10 s",
          "g11 r foldRight s+1",
          "g12 cutLeft s+4",
          "g13 r foldRight s+5",
          "g14 cutLeft e-3",
          "g15 r foldRight e-2"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "12th/single/landscape/side": {
      grid: "twlv-lnd",
      portraitPaper: true,
      pagesPerSheet: 12,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r cutTop e-1",
          "g01 r foldTop foldRight e-2",
          "g10 foldBottom e-4",
          "g11 cutBottom foldLeft e-3",
          "g20 r cutTop e-5",
          "g21 r foldTop foldRight s+5",
          "g30 foldBottom s+3",
          "g31 cutBottom foldLeft s+4",
          "g40 r cutTop s+2",
          "g41 r foldTop foldRight s+1",
          "g50 e",
          "g51 foldLeft s"
        ]
      ]
    },
    "12th/single/landscape/top": {
      grid: "twlv-lnd",
      portraitPaper: true,
      pagesPerSheet: 12,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-4",
          "g01 r foldRight foldTop e-5",
          "g10 foldBottom e-3",
          "g11 r cutRight foldTop s+5",
          "g20 foldBottom e-2",
          "g21 r cutRight foldTop s+4",
          "g30 foldBottom e-1",
          "g31 r cutRight foldTop s+3",
          "g40 foldBottom e",
          "g41 r cutRight foldTop s+2",
          "g50 s",
          "g51 r foldRight s+1"
        ]
      ],
      backCover: [{ side: 0, cell: 8, spec: "g40 r foldTop e" }]
    },
    "12th/double/portrait/side": {
      grid: "twlv-por",
      portraitPaper: false,
      pagesPerSheet: 24,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g10 e-6",
          "g11 foldLeft s+6",
          "g12 cutLeft e-8",
          "g13 foldLeft s+8",
          "g14 cutLeft e-10",
          "g15 foldLeft s+10"
        ],
        [
          "g00 cutBottom s+5",
          "g01 cutBottom foldLeft e-5",
          "g02 cutBottom cutLeft s+3",
          "g03 cutBottom foldLeft e-3",
          "g04 cutBottom cutLeft s+1",
          "g05 cutBottom foldLeft e-1",
          "g10 s+11",
          "g11 foldLeft e-11",
          "g12 cutLeft s+9",
          "g13 foldLeft e-9",
          "g14 cutLeft s+7",
          "g15 foldLeft e-7"
        ]
      ]
    },
    "12th/double/portrait/top": {
      grid: "twlv-por",
      portraitPaper: false,
      pagesPerSheet: 24,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g10 s",
          "g11 cutLeft s+2",
          "g12 cutLeft s+4",
          "g13 cutLeft s+6",
          "g14 cutLeft s+8",
          "g15 cutLeft s+10"
        ],
        [
          "g00 r foldTop e-11",
          "g01 r foldTop cutRight e-9",
          "g02 r foldTop cutRight e-7",
          "g03 r foldTop cutRight e-5",
          "g04 r foldTop cutRight e-3",
          "g05 r foldTop cutRight e-1",
          "g10 r s+11",
          "g11 r cutRight s+9",
          "g12 r cutRight s+7",
          "g13 r cutRight s+5",
          "g14 r cutRight s+3",
          "g15 r cutRight s+1"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "12th/double/landscape/side": {
      grid: "twlv-lnd",
      portraitPaper: true,
      pagesPerSheet: 24,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g10 cutBottom e-2",
          "g11 cutBottom foldLeft s+2",
          "g20 cutBottom e-4",
          "g21 cutBottom foldLeft s+4",
          "g30 cutBottom e-6",
          "g31 cutBottom foldLeft s+6",
          "g40 cutBottom e-8",
          "g41 cutBottom foldLeft s+8",
          "g50 e-10",
          "g51 foldLeft s+10"
        ],
        [
          "g00 cutBottom s+1",
          "g01 cutBottom foldLeft e-1",
          "g10 cutBottom s+3",
          "g11 cutBottom foldLeft e-3",
          "g20 cutBottom s+5",
          "g21 cutBottom foldLeft e-5",
          "g30 cutBottom s+7",
          "g31 cutBottom foldLeft e-7",
          "g40 cutBottom s+9",
          "g41 cutBottom foldLeft e-9",
          "g50 s+11",
          "g51 foldLeft e-11"
        ]
      ]
    },
    "12th/double/landscape/top": {
      grid: "twlv-lnd",
      portraitPaper: true,
      pagesPerSheet: 24,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g20 foldBottom e-4",
          "g21 foldBottom cutLeft e-6",
          "g30 cutBottom s+4",
          "g31 cutBottom cutLeft s+6",
          "g40 foldBottom e-8",
          "g41 foldBottom cutLeft e-10",
          "g50 s+8",
          "g51 cutLeft s+10"
        ],
        [
          "g00 r foldTop e-3",
          "g01 r foldTop cutRight e-1",
          "g10 r cutTop s+3",
          "g11 r cutTop cutRight s+1",
          "g20 r foldTop e-7",
          "g21 r foldTop cutRight e-5",
          "g30 r cutTop s+7",
          "g31 r cutTop cutRight s+5",
          "g40 r foldTop e-11",
          "g41 r foldTop cutRight e-9",
          "g50 r s+11",
          "g51 r cutRight s+9"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "16th/single/portrait/side": {
      grid: "sxtn-por",
      portraitPaper: true,
      pagesPerSheet: 16,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-7",
          "g01 r foldRight cutTop s+7",
          "g02 r foldRight cutTop s+6",
          "g03 r foldRight foldTop s+5",
          "g10 cutBottom e-6",
          "g11 foldLeft foldBottom e-5",
          "g12 cutLeft foldBottom s+3",
          "g13 foldLeft cutBottom s+4",
          "g20 r foldTop e-3",
          "g21 r foldRight cutTop e-4",
          "g22 r cutRight cutTop s+2",
          "g23 r foldRight foldTop s+1",
          "g30 e-2",
          "g31 foldLeft e-1",
          "g32 foldLeft e",
          "g33 foldLeft s"
        ]
      ]
    },
    "16th/single/portrait/top": {
      grid: "sxtn-por",
      portraitPaper: true,
      pagesPerSheet: 16,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-7",
          "g01 foldLeft foldBottom e-6",
          "g02 r cutRight foldTop e-3",
          "g03 foldLeft foldBottom e-2",
          "g10 r foldBottom s+7",
          "g11 cutLeft cutBottom e-5",
          "g12 r foldRight cutTop e-4",
          "g13 cutLeft foldBottom e-1",
          "g20 r foldTop s+6",
          "g21 cutLeft foldBottom s+3",
          "g22 r foldRight foldTop s+2",
          "g23 cutLeft foldBottom e",
          "g30 r s+5",
          "g31 foldLeft s+4",
          "g32 r cutRight s+1",
          "g33 foldLeft s"
        ]
      ],
      backCover: [{ side: 0, cell: 11, spec: "g23 r cutRight foldTop e" }]
    },
    "16th/single/landscape/side": {
      grid: "sxtn-lnd",
      portraitPaper: false,
      pagesPerSheet: 16,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-2",
          "g01 foldLeft cutBottom e-1",
          "g02 foldLeft cutBottom e",
          "g03 foldLeft foldBottom s",
          "g10 r cutTop e-3",
          "g11 r foldRight foldTop e-4",
          "g12 r cutRight foldTop s+2",
          "g13 r foldRight cutTop s+1",
          "g20 foldBottom e-6",
          "g21 foldLeft cutBottom e-5",
          "g22 cutLeft cutBottom s+3",
          "g23 foldLeft foldBottom s+4",
          "g30 r e-7",
          "g31 r foldRight s+7",
          "g32 r foldRight s+6",
          "g33 r foldRight s+5"
        ]
      ]
    },
    "16th/single/landscape/top": {
      grid: "sxtn-lnd",
      portraitPaper: false,
      pagesPerSheet: 16,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-2",
          "g01 r foldRight foldTop e-3",
          "g02 cutLeft foldBottom e-6",
          "g03 r foldRight foldTop e-7",
          "g10 foldBottom e-1",
          "g11 r cutRight cutTop e-4",
          "g12 foldLeft cutBottom e-5",
          "g13 r cutRight foldTop s+7",
          "g20 foldBottom e",
          "g21 r cutRight foldTop s+2",
          "g22 foldLeft foldBottom s+3",
          "g23 r cutRight foldTop s+6",
          "g30 s",
          "g31 r foldRight s+1",
          "g32 cutLeft s+4",
          "g33 r foldRight s+5"
        ]
      ],
      backCover: [{ side: 0, cell: 8, spec: "g20 r foldTop e" }]
    },
    "16th/double/portrait/side": {
      grid: "sxtn-por",
      portraitPaper: true,
      pagesPerSheet: 32,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g10 cutBottom e-4",
          "g11 cutBottom foldLeft s+4",
          "g12 cutBottom cutLeft e-6",
          "g13 cutBottom foldLeft s+6",
          "g20 cutBottom e-8",
          "g21 cutBottom foldLeft s+8",
          "g22 cutBottom cutLeft e-10",
          "g23 cutBottom foldLeft s+10",
          "g30 e-12",
          "g31 foldLeft s+12",
          "g32 cutLeft e-14",
          "g33 foldLeft s+14"
        ],
        [
          "g00 cutBottom s+3",
          "g01 cutBottom foldLeft e-3",
          "g02 cutBottom cutLeft s+1",
          "g03 cutBottom foldLeft e-1",
          "g10 cutBottom s+7",
          "g11 cutBottom foldLeft e-7",
          "g12 cutBottom cutLeft s+5",
          "g13 cutBottom foldLeft e-5",
          "g20 cutBottom s+11",
          "g21 cutBottom foldLeft e-11",
          "g22 cutBottom cutLeft s+9",
          "g23 cutBottom foldLeft e-9",
          "g30 s+15",
          "g31 foldLeft e-15",
          "g32 cutLeft s+13",
          "g33 foldLeft e-13"
        ]
      ]
    },
    "16th/double/portrait/top": {
      grid: "sxtn-por",
      portraitPaper: true,
      pagesPerSheet: 32,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g20 foldBottom e-8",
          "g21 foldBottom cutLeft e-10",
          "g22 foldBottom cutLeft e-12",
          "g23 foldBottom cutLeft e-14",
          "g30 s+8",
          "g31 cutLeft s+10",
          "g32 cutLeft s+12",
          "g33 cutLeft s+14"
        ],
        [
          "g00 r foldTop e-7",
          "g01 r foldTop cutRight e-5",
          "g02 r foldTop cutRight e-3",
          "g03 r foldTop cutRight e-1",
          "g10 r cutTop s+7",
          "g11 r cutTop cutRight s+5",
          "g12 r cutTop cutRight s+3",
          "g13 r cutTop cutRight s+1",
          "g20 r foldTop e-15",
          "g21 r foldTop cutRight e-13",
          "g22 r foldTop cutRight e-11",
          "g23 r foldTop cutRight e-9",
          "g30 r s+15",
          "g31 r cutRight s+13",
          "g32 r cutRight s+11",
          "g33 r cutRight s+9"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "16th/double/landscape/side": {
      grid: "sxtn-lnd",
      portraitPaper: false,
      pagesPerSheet: 32,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g10 cutBottom e-4",
          "g11 cutBottom foldLeft s+4",
          "g12 cutBottom cutLeft e-6",
          "g13 cutBottom foldLeft s+6",
          "g20 cutBottom e-8",
          "g21 cutBottom foldLeft s+8",
          "g22 cutBottom cutLeft e-10",
          "g23 cutBottom foldLeft s+10",
          "g30 e-12",
          "g31 foldLeft s+12",
          "g32 cutLeft e-14",
          "g33 foldLeft s+14"
        ],
        [
          "g00 cutBottom s+3",
          "g01 cutBottom foldLeft e-3",
          "g02 cutBottom cutLeft s+1",
          "g03 cutBottom foldLeft e-1",
          "g10 cutBottom cutLeft s+7",
          "g11 cutBottom foldLeft e-7",
          "g12 cutBottom cutLeft s+5",
          "g13 cutBottom foldLeft e-5",
          "g20 cutBottom cutLeft s+11",
          "g21 cutBottom foldLeft e-11",
          "g22 cutBottom cutLeft s+9",
          "g23 cutBottom foldLeft e-9",
          "g30 s+15",
          "g31 foldLeft e-15",
          "g32 cutLeft s+13",
          "g33 foldLeft e-13"
        ]
      ]
    },
    "16th/double/landscape/top": {
      grid: "sxtn-lnd",
      portraitPaper: false,
      pagesPerSheet: 32,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g20 foldBottom e-8",
          "g21 foldBottom cutLeft e-10",
          "g22 foldBottom cutLeft e-12",
          "g23 foldBottom cutLeft e-14",
          "g30 s+8",
          "g31 cutLeft s+10",
          "g32 cutLeft s+12",
          "g33 cutLeft s+14"
        ],
        [
          "g00 r foldTop e-7",
          "g01 r foldTop cutRight e-5",
          "g02 r foldTop cutRight e-3",
          "g03 r foldTop cutRight e-1",
          "g10 r cutTop s+7",
          "g11 r cutTop cutRight s+5",
          "g12 r cutTop cutRight s+3",
          "g13 r cutTop cutRight s+1",
          "g20 r foldTop e-15",
          "g21 r foldTop cutRight e-13",
          "g22 r foldTop cutRight e-11",
          "g23 r foldTop cutRight e-9",
          "g30 r s+15",
          "g31 r cutRight s+13",
          "g32 r cutRight s+11",
          "g33 r cutRight s+9"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "24th/single/portrait/side": {
      grid: "twfr-por",
      portraitPaper: false,
      pagesPerSheet: 24,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-9",
          "g01 r cutTop foldRight e-10",
          "g02 r cutTop foldRight e-11",
          "g03 r cutTop foldRight s+11",
          "g04 r cutTop foldRight s+10",
          "g05 r foldTop foldRight s+9",
          "g10 cutBottom e-8",
          "g11 foldBottom foldLeft e-7",
          "g12 foldBottom cutLeft s+5",
          "g13 cutBottom foldLeft s+6",
          "g14 cutBottom foldLeft s+7",
          "g15 cutBottom foldLeft s+8",
          "g20 r foldTop e-5",
          "g21 r cutTop foldRight e-6",
          "g22 r cutTop cutRight s+4",
          "g23 r cutTop foldRight s+3",
          "g24 r cutTop foldRight s+2",
          "g25 r foldTop foldRight s+1",
          "g30 e-4",
          "g31 foldLeft e-3",
          "g32 foldLeft e-2",
          "g33 foldLeft e-1",
          "g34 foldLeft e",
          "g35 foldLeft s"
        ]
      ]
    },
    "24th/single/portrait/top": {
      grid: "twfr-por",
      portraitPaper: false,
      pagesPerSheet: 24,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-11",
          "g01 foldBottom foldLeft e-10",
          "g02 r foldTop cutRight e-7",
          "g03 foldBottom foldLeft e-6",
          "g04 r foldTop cutRight e-3",
          "g05 foldBottom foldLeft e-2",
          "g10 r foldTop s+11",
          "g11 cutBottom cutLeft e-9",
          "g12 r cutTop foldRight e-8",
          "g13 cutBottom cutLeft e-5",
          "g14 r cutTop foldRight e-4",
          "g15 foldBottom cutLeft e-1",
          "g20 r foldTop s+10",
          "g21 foldBottom cutLeft s+7",
          "g22 r foldTop foldRight s+6",
          "g23 foldBottom cutLeft s+3",
          "g24 r foldTop foldRight s+2",
          "g25 foldBottom cutLeft e",
          "g30 r s+9",
          "g31 foldLeft s+8",
          "g32 r cutRight s+5",
          "g33 foldLeft s+4",
          "g34 r cutRight s+1",
          "g35 foldLeft s"
        ]
      ],
      backCover: [{ side: 0, cell: 17, spec: "g25 r cutRight foldTop e" }]
    },
    "24th/single/landscape/side": {
      grid: "twfr-lnd",
      portraitPaper: true,
      pagesPerSheet: 24,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-2",
          "g01 cutBottom foldLeft e-1",
          "g02 cutBottom foldLeft e",
          "g03 foldBottom foldLeft s",
          "g10 r cutTop e-3",
          "g11 r foldTop foldRight e-4",
          "g12 r foldTop cutRight s+2",
          "g13 r cutTop foldRight s+1",
          "g20 foldBottom e-6",
          "g21 cutBottom foldLeft e-5",
          "g22 cutBottom cutLeft s+3",
          "g23 foldBottom foldLeft s+4",
          "g30 r cutTop e-7",
          "g31 r foldTop foldRight e-8",
          "g32 r foldTop cutRight s+6",
          "g33 r cutTop foldRight s+5",
          "g40 foldBottom e-10",
          "g41 cutBottom foldLeft e-9",
          "g42 cutBottom cutLeft s+7",
          "g43 foldBottom foldLeft s+8",
          "g50 r e-11",
          "g51 r foldLeft s+11",
          "g52 r foldLeft s+10",
          "g53 r foldLeft s+9"
        ]
      ]
    },
    "24th/single/landscape/top": {
      grid: "twfr-lnd",
      portraitPaper: true,
      pagesPerSheet: 24,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-4",
          "g01 r foldTop foldRight e-5",
          "g02 foldBottom cutLeft e-8",
          "g03 r foldTop foldRight e-9",
          "g10 foldBottom e-3",
          "g11 r cutTop cutRight e-6",
          "g12 cutBottom foldLeft e-7",
          "g13 r foldTop cutRight e-10",
          "g20 foldBottom e-2",
          "g21 r foldTop cutRight s+4",
          "g22 foldBottom foldLeft s+5",
          "g23 r foldTop cutRight e-11",
          "g30 foldBottom e-1",
          "g31 r foldTop cutRight s+3",
          "g32 foldBottom cutLeft s+6",
          "g33 r foldTop cutRight s+11",
          "g40 foldBottom e",
          "g41 r foldTop cutRight s+2",
          "g42 foldBottom cutLeft s+7",
          "g43 r foldTop cutRight s+10",
          "g50 s",
          "g51 r foldRight s+1",
          "g52 cutLeft s+8",
          "g53 r foldRight s+9"
        ]
      ],
      backCover: [{ side: 0, cell: 16, spec: "g40 r foldTop e" }]
    },
    "24th/double/portrait/side": {
      grid: "twfr-por",
      portraitPaper: false,
      pagesPerSheet: 48,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g10 cutBottom e-6",
          "g11 cutBottom foldLeft s+6",
          "g12 cutBottom cutLeft e-8",
          "g13 cutBottom foldLeft s+8",
          "g14 cutBottom cutLeft e-10",
          "g15 cutBottom foldLeft s+10",
          "g20 cutBottom e-12",
          "g21 cutBottom foldLeft s+12",
          "g22 cutBottom cutLeft e-14",
          "g23 cutBottom foldLeft s+14",
          "g24 cutBottom cutLeft e-16",
          "g25 cutBottom foldLeft s+16",
          "g30 e-18",
          "g31 foldLeft s+18",
          "g32 cutLeft e-20",
          "g33 foldLeft s+20",
          "g34 cutLeft e-22",
          "g35 foldLeft s+22"
        ],
        [
          "g00 cutBottom s+5",
          "g01 cutBottom foldLeft e-5",
          "g02 cutBottom cutLeft s+3",
          "g03 cutBottom foldLeft e-3",
          "g04 cutBottom cutLeft s+1",
          "g05 cutBottom foldLeft e-1",
          "g10 cutBottom s+11",
          "g11 cutBottom foldLeft e-11",
          "g12 cutBottom cutLeft s+9",
          "g13 cutBottom foldLeft e-9",
          "g14 cutBottom cutLeft s+7",
          "g15 cutBottom foldLeft e-7",
          "g20 cutBottom s+17",
          "g21 cutBottom foldLeft e-17",
          "g22 cutBottom cutLeft s+15",
          "g23 cutBottom foldLeft e-15",
          "g24 cutBottom cutLeft s+13",
          "g25 cutBottom foldLeft e-13",
          "g30 s+23",
          "g31 foldLeft e-23",
          "g32 cutLeft s+21",
          "g33 foldLeft e-21",
          "g34 cutLeft s+19",
          "g35 foldLeft e-19"
        ]
      ]
    },
    "24th/double/portrait/top": {
      grid: "twfr-por",
      portraitPaper: false,
      pagesPerSheet: 48,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g20 foldBottom e-12",
          "g21 foldBottom cutLeft e-14",
          "g22 foldBottom cutLeft e-16",
          "g23 foldBottom cutLeft e-18",
          "g24 foldBottom cutLeft e-20",
          "g25 foldBottom cutLeft e-22",
          "g30 s+12",
          "g31 cutLeft s+14",
          "g32 cutLeft s+16",
          "g33 cutLeft s+18",
          "g34 cutLeft s+20",
          "g35 cutLeft s+22"
        ],
        [
          "g00 r foldTop e-11",
          "g01 r foldTop cutRight e-9",
          "g02 r foldTop cutRight e-7",
          "g03 r foldTop cutRight e-5",
          "g04 r foldTop cutRight e-3",
          "g05 r foldTop cutRight e-1",
          "g10 r cutTop s+11",
          "g11 r cutTop cutRight s+9",
          "g12 r cutTop cutRight s+7",
          "g13 r cutTop cutRight s+5",
          "g14 r cutTop cutRight s+3",
          "g15 r cutTop cutRight s+1",
          "g20 r foldTop e-23",
          "g21 r foldTop cutRight e-21",
          "g22 r foldTop cutRight e-19",
          "g23 r foldTop cutRight e-17",
          "g24 r foldTop cutRight e-15",
          "g25 r foldTop cutRight e-13",
          "g30 r s+23",
          "g31 r cutRight s+21",
          "g32 r cutRight s+19",
          "g33 r cutRight s+17",
          "g34 r cutRight s+15",
          "g35 r cutRight s+13"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "24th/double/landscape/side": {
      grid: "twfr-lnd",
      portraitPaper: true,
      pagesPerSheet: 48,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g10 cutBottom e-4",
          "g11 cutBottom foldLeft s+4",
          "g12 cutBottom cutLeft e-6",
          "g13 cutBottom foldLeft s+6",
          "g20 cutBottom e-8",
          "g21 cutBottom foldLeft s+8",
          "g22 cutBottom cutLeft e-10",
          "g23 cutBottom foldLeft s+10",
          "g30 cutBottom e-12",
          "g31 cutBottom foldLeft s+12",
          "g32 cutBottom cutLeft e-14",
          "g33 cutBottom foldLeft s+14",
          "g40 cutBottom e-16",
          "g41 cutBottom foldLeft s+16",
          "g42 cutBottom cutLeft e-18",
          "g43 cutBottom foldLeft s+18",
          "g50 e-20",
          "g51 foldLeft s+20",
          "g52 cutLeft e-22",
          "g53 foldLeft s+22"
        ],
        [
          "g00 cutBottom s+3",
          "g01 cutBottom foldLeft e-3",
          "g02 cutBottom cutLeft s+1",
          "g03 cutBottom foldLeft e-1",
          "g10 cutBottom s+7",
          "g11 cutBottom foldLeft e-7",
          "g12 cutBottom cutLeft s+5",
          "g13 cutBottom foldLeft e-5",
          "g20 cutBottom s+11",
          "g21 cutBottom foldLeft e-11",
          "g22 cutBottom cutLeft s+9",
          "g23 cutBottom foldLeft e-9",
          "g30 cutBottom s+15",
          "g31 cutBottom foldLeft e-15",
          "g32 cutBottom cutLeft s+13",
          "g33 cutBottom foldLeft e-13",
          "g40 cutBottom s+19",
          "g41 cutBottom foldLeft e-19",
          "g42 cutBottom cutLeft s+17",
          "g43 cutBottom foldLeft e-17",
          "g50 s+23",
          "g51 foldLeft e-23",
          "g52 cutLeft s+21",
          "g53 foldLeft e-21"
        ]
      ]
    },
    "24th/double/landscape/top": {
      grid: "twfr-lnd",
      portraitPaper: true,
      pagesPerSheet: 48,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g20 foldBottom e-8",
          "g21 foldBottom cutLeft e-10",
          "g22 foldBottom cutLeft e-12",
          "g23 foldBottom cutLeft e-14",
          "g30 cutBottom s+8",
          "g31 cutBottom cutLeft s+10",
          "g32 cutBottom cutLeft s+12",
          "g33 cutBottom cutLeft s+14",
          "g40 foldBottom e-16",
          "g41 foldBottom cutLeft e-18",
          "g42 foldBottom cutLeft e-20",
          "g43 foldBottom cutLeft e-22",
          "g50 s+16",
          "g51 cutLeft s+18",
          "g52 cutLeft s+20",
          "g53 cutLeft s+22"
        ],
        [
          "g00 r foldTop e-7",
          "g01 r foldTop cutRight e-5",
          "g02 r foldTop cutRight e-3",
          "g03 r foldTop cutRight e-1",
          "g10 r cutTop s+7",
          "g11 r cutTop cutRight s+5",
          "g12 r cutTop cutRight s+3",
          "g13 r cutTop cutRight s+1",
          "g20 r foldTop e-15",
          "g21 r foldTop cutRight e-13",
          "g22 r foldTop cutRight e-11",
          "g23 r foldTop cutRight e-9",
          "g30 r cutTop s+15",
          "g31 r cutTop cutRight s+13",
          "g32 r cutTop cutRight s+11",
          "g33 r cutTop cutRight s+9",
          "g40 r foldTop e-23",
          "g41 r foldTop cutRight e-21",
          "g42 r foldTop cutRight e-19",
          "g43 r foldTop cutRight e-17",
          "g50 r s+23",
          "g51 r cutRight s+21",
          "g52 r cutRight s+19",
          "g53 r cutRight s+17"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "32nd/single/portrait/side": {
      grid: "thtw-por",
      portraitPaper: false,
      pagesPerSheet: 32,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-15",
          "g01 r cutTop foldRight s+15",
          "g02 r cutTop foldRight s+14",
          "g03 r cutTop foldRight s+13",
          "g04 r cutTop foldRight s+12",
          "g05 r cutTop foldRight s+11",
          "g06 r cutTop foldRight s+10",
          "g07 r foldTop foldRight s+9",
          "g10 cutBottom e-14",
          "g11 cutBottom foldLeft e-13",
          "g12 cutBottom foldLeft e-12",
          "g13 foldBottom foldLeft e-11",
          "g14 foldBottom cutLeft s+5",
          "g15 cutBottom foldLeft s+6",
          "g16 cutBottom foldLeft s+7",
          "g17 cutBottom foldLeft s+8",
          "g20 r foldTop e-7",
          "g21 r cutTop foldRight e-8",
          "g22 r cutTop foldRight e-9",
          "g23 r cutTop foldRight e-10",
          "g24 r cutTop cutRight s+4",
          "g25 r cutTop foldRight s+3",
          "g26 r cutTop foldRight s+2",
          "g27 r foldTop foldRight s+1",
          "g30 e-6",
          "g31 foldLeft e-5",
          "g32 foldLeft e-4",
          "g33 foldLeft e-3",
          "g34 foldLeft e-2",
          "g35 foldLeft e-1",
          "g36 foldLeft e",
          "g37 foldLeft s"
        ]
      ]
    },
    "32nd/single/portrait/top": {
      grid: "thtw-por",
      portraitPaper: false,
      pagesPerSheet: 32,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-15",
          "g01 foldBottom foldLeft e-14",
          "g02 r foldTop cutRight e-11",
          "g03 foldBottom foldLeft e-10",
          "g04 r foldTop cutRight e-7",
          "g05 foldBottom foldLeft e-6",
          "g06 r foldTop cutRight e-3",
          "g07 foldBottom foldLeft e-2",
          "g10 r foldTop s+15",
          "g11 cutBottom cutLeft e-13",
          "g12 r cutTop foldRight e-12",
          "g13 cutBottom cutLeft e-9",
          "g14 r cutTop foldRight e-8",
          "g15 cutBottom cutLeft e-5",
          "g16 r cutTop foldRight e-4",
          "g17 foldBottom cutLeft e-1",
          "g20 r foldTop s+14",
          "g21 foldBottom cutLeft s+11",
          "g22 r foldTop foldRight s+10",
          "g23 foldBottom cutLeft s+7",
          "g24 r foldTop foldRight s+6",
          "g25 foldBottom cutLeft s+3",
          "g26 r foldTop foldRight s+2",
          "g27 foldBottom cutLeft e",
          "g30 r s+13",
          "g31 foldLeft s+12",
          "g32 r cutRight s+9",
          "g33 foldLeft s+8",
          "g34 r cutRight s+5",
          "g35 foldLeft s+4",
          "g36 r cutRight s+1",
          "g37 foldLeft s"
        ]
      ],
      backCover: [{ side: 0, cell: 23, spec: "g27 r foldTop cutRight e" }]
    },
    "32nd/single/landscape/side": {
      grid: "thtw-lnd",
      portraitPaper: true,
      pagesPerSheet: 32,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-2",
          "g01 cutBottom foldLeft e-1",
          "g02 cutBottom foldLeft e",
          "g03 foldBottom foldLeft s",
          "g10 r cutTop e-3",
          "g11 r foldTop foldRight e-4",
          "g12 r foldTop cutRight s+2",
          "g13 r cutTop foldRight s+1",
          "g20 foldBottom e-6",
          "g21 cutBottom foldLeft e-5",
          "g22 cutBottom cutLeft s+3",
          "g23 foldBottom foldLeft s+4",
          "g30 r cutTop e-7",
          "g31 r foldTop foldRight e-8",
          "g32 r foldTop cutRight s+6",
          "g33 r cutTop foldRight s+5",
          "g40 foldBottom e-10",
          "g41 cutBottom foldLeft e-9",
          "g42 cutBottom cutLeft s+7",
          "g43 foldBottom foldLeft s+8",
          "g50 r cutTop e-11",
          "g51 r foldTop foldRight e-12",
          "g52 r foldTop cutRight s+10",
          "g53 r cutTop foldRight s+9",
          "g60 foldBottom e-14",
          "g61 cutBottom foldLeft e-13",
          "g62 cutBottom cutLeft s+11",
          "g63 foldBottom foldLeft s+12",
          "g70 r e-15",
          "g71 r foldRight s+15",
          "g72 r foldRight s+14",
          "g73 r foldRight s+13"
        ]
      ]
    },
    "32nd/single/landscape/top": {
      grid: "thtw-lnd",
      portraitPaper: true,
      pagesPerSheet: 32,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-6",
          "g01 r foldTop foldRight e-7",
          "g02 foldBottom cutLeft e-14",
          "g03 r foldTop foldRight e-15",
          "g10 foldBottom e-5",
          "g11 r foldTop cutRight e-8",
          "g12 foldBottom cutLeft e-13",
          "g13 r foldTop cutRight s+15",
          "g20 foldBottom e-4",
          "g21 r foldTop cutRight e-9",
          "g22 foldBottom cutLeft e-12",
          "g23 r foldTop cutRight s+14",
          "g30 foldBottom e-3",
          "g31 r cutTop cutRight e-10",
          "g32 cutBottom foldLeft e-11",
          "g33 r foldTop cutRight s+13",
          "g40 foldBottom e-2",
          "g41 r foldTop cutRight s+4",
          "g42 foldBottom foldLeft s+5",
          "g43 r foldTop cutRight s+12",
          "g50 foldBottom e-1",
          "g51 r foldTop cutRight s+3",
          "g52 foldBottom cutLeft s+6",
          "g53 r foldTop cutRight s+11",
          "g60 foldBottom e",
          "g61 r foldTop cutRight s+2",
          "g62 foldBottom cutLeft s+7",
          "g63 r foldTop cutRight s+10",
          "g70 s",
          "g71 r foldRight s+1",
          "g72 cutLeft s+8",
          "g73 r foldRight s+9"
        ]
      ],
      backCover: [{ side: 0, cell: 24, spec: "g60 r foldTop e" }]
    },
    "32nd/double/portrait/side": {
      grid: "thtw-por",
      portraitPaper: false,
      pagesPerSheet: 64,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g06 cutBottom cutLeft e-6",
          "g07 cutBottom foldLeft s+6",
          "g10 cutBottom e-8",
          "g11 cutBottom foldLeft s+8",
          "g12 cutBottom cutLeft e-10",
          "g13 cutBottom foldLeft s+10",
          "g14 cutBottom cutLeft e-12",
          "g15 cutBottom foldLeft s+12",
          "g16 cutBottom cutLeft e-14",
          "g17 cutBottom foldLeft s+14",
          "g20 cutBottom e-16",
          "g21 cutBottom foldLeft s+16",
          "g22 cutBottom cutLeft e-18",
          "g23 cutBottom foldLeft s+18",
          "g24 cutBottom cutLeft e-20",
          "g25 cutBottom foldLeft s+20",
          "g26 cutBottom cutLeft e-22",
          "g27 cutBottom foldLeft s+22",
          "g30 e-24",
          "g31 foldLeft s+24",
          "g32 cutLeft e-26",
          "g33 foldLeft s+26",
          "g34 cutLeft e-28",
          "g35 foldLeft s+28",
          "g36 cutLeft e-30",
          "g37 foldLeft s+30"
        ],
        [
          "g00 cutBottom s+7",
          "g01 cutBottom foldLeft e-7",
          "g02 cutBottom cutLeft s+5",
          "g03 cutBottom foldLeft e-5",
          "g04 cutBottom cutLeft s+3",
          "g05 cutBottom foldLeft e-3",
          "g06 cutBottom cutLeft s+1",
          "g07 cutBottom foldLeft e-1",
          "g10 cutBottom s+15",
          "g11 cutBottom foldLeft e-15",
          "g12 cutBottom cutLeft s+13",
          "g13 cutBottom foldLeft e-13",
          "g14 cutBottom cutLeft s+11",
          "g15 cutBottom foldLeft e-11",
          "g16 cutBottom cutLeft s+9",
          "g17 cutBottom foldLeft e-9",
          "g20 cutBottom s+23",
          "g21 cutBottom foldLeft e-23",
          "g22 cutBottom cutLeft s+21",
          "g23 cutBottom foldLeft e-21",
          "g24 cutBottom cutLeft s+19",
          "g25 cutBottom foldLeft e-19",
          "g26 cutBottom cutLeft s+17",
          "g27 cutBottom foldLeft e-17",
          "g30 s+31",
          "g31 foldLeft e-31",
          "g32 cutLeft s+29",
          "g33 foldLeft e-29",
          "g34 cutLeft s+27",
          "g35 foldLeft e-27",
          "g36 cutLeft s+25",
          "g37 foldLeft e-25"
        ]
      ]
    },
    "32nd/double/portrait/top": {
      grid: "thtw-por",
      portraitPaper: false,
      pagesPerSheet: 64,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g06 foldBottom cutLeft e-12",
          "g07 foldBottom cutLeft e-14",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g16 cutBottom cutLeft s+12",
          "g17 cutBottom cutLeft s+14",
          "g20 foldBottom e-16",
          "g21 foldBottom cutLeft e-18",
          "g22 foldBottom cutLeft e-20",
          "g23 foldBottom cutLeft e-22",
          "g24 foldBottom cutLeft e-24",
          "g25 foldBottom cutLeft e-26",
          "g26 foldBottom cutLeft e-28",
          "g27 foldBottom cutLeft e-30",
          "g30 s+16",
          "g31 cutLeft s+18",
          "g32 cutLeft s+20",
          "g33 cutLeft s+22",
          "g34 cutLeft s+24",
          "g35 cutLeft s+26",
          "g36 cutLeft s+28",
          "g37 cutLeft s+30"
        ],
        [
          "g00 r foldTop e-15",
          "g01 r foldTop cutRight e-13",
          "g02 r foldTop cutRight e-11",
          "g03 r foldTop cutRight e-9",
          "g04 r foldTop cutRight e-7",
          "g05 r foldTop cutRight e-5",
          "g06 r foldTop cutRight e-3",
          "g07 r foldTop cutRight e-1",
          "g10 r cutTop s+15",
          "g11 r cutTop cutRight s+13",
          "g12 r cutTop cutRight s+11",
          "g13 r cutTop cutRight s+9",
          "g14 r cutTop cutRight s+7",
          "g15 r cutTop cutRight s+5",
          "g16 r cutTop cutRight s+3",
          "g17 r cutTop cutRight s+1",
          "g20 r foldTop e-31",
          "g21 r foldTop cutRight e-29",
          "g22 r foldTop cutRight e-27",
          "g23 r foldTop cutRight e-25",
          "g24 r foldTop cutRight e-23",
          "g25 r foldTop cutRight e-21",
          "g26 r foldTop cutRight e-19",
          "g27 r foldTop cutRight e-17",
          "g30 r s+31",
          "g31 r cutRight s+29",
          "g32 r cutRight s+27",
          "g33 r cutRight s+25",
          "g34 r cutRight s+23",
          "g35 r cutRight s+21",
          "g36 r cutRight s+19",
          "g37 r cutRight s+17"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "32nd/double/landscape/side": {
      grid: "thtw-lnd",
      portraitPaper: true,
      pagesPerSheet: 64,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g10 cutBottom e-4",
          "g11 cutBottom foldLeft s+4",
          "g12 cutBottom cutLeft e-6",
          "g13 cutBottom foldLeft s+6",
          "g20 cutBottom e-8",
          "g21 cutBottom foldLeft s+8",
          "g22 cutBottom cutLeft e-10",
          "g23 cutBottom foldLeft s+10",
          "g30 cutBottom e-12",
          "g31 cutBottom foldLeft s+12",
          "g32 cutBottom cutLeft e-14",
          "g33 cutBottom foldLeft s+14",
          "g40 cutBottom e-16",
          "g41 cutBottom foldLeft s+16",
          "g42 cutBottom cutLeft e-18",
          "g43 cutBottom foldLeft s+18",
          "g50 cutBottom e-20",
          "g51 cutBottom foldLeft s+20",
          "g52 cutBottom cutLeft e-22",
          "g53 cutBottom foldLeft s+22",
          "g60 cutBottom e-24",
          "g61 cutBottom foldLeft s+24",
          "g62 cutBottom cutLeft e-26",
          "g63 cutBottom foldLeft s+26",
          "g70 e-28",
          "g71 foldLeft s+28",
          "g72 cutLeft e-30",
          "g73 foldLeft s+30"
        ],
        [
          "g00 cutBottom s+3",
          "g01 cutBottom foldLeft e-3",
          "g02 cutBottom cutLeft s+1",
          "g03 cutBottom foldLeft e-1",
          "g10 cutBottom s+7",
          "g11 cutBottom foldLeft e-7",
          "g12 cutBottom cutLeft s+5",
          "g13 cutBottom foldLeft e-5",
          "g20 cutBottom s+11",
          "g21 cutBottom foldLeft e-11",
          "g22 cutBottom cutLeft s+9",
          "g23 cutBottom foldLeft e-9",
          "g30 cutBottom s+15",
          "g31 cutBottom foldLeft e-15",
          "g32 cutBottom cutLeft s+13",
          "g33 cutBottom foldLeft e-13",
          "g40 cutBottom s+19",
          "g41 cutBottom foldLeft e-19",
          "g42 cutBottom cutLeft s+17",
          "g43 cutBottom foldLeft e-17",
          "g50 cutBottom s+23",
          "g51 cutBottom foldLeft e-23",
          "g52 cutBottom cutLeft s+21",
          "g53 cutBottom foldLeft e-21",
          "g60 cutBottom s+27",
          "g61 cutBottom foldLeft e-27",
          "g62 cutBottom cutLeft s+25",
          "g63 cutBottom foldLeft e-25",
          "g70 s+31",
          "g71 foldLeft e-31",
          "g72 cutLeft s+29",
          "g73 foldLeft e-29"
        ]
      ]
    },
    "32nd/double/landscape/top": {
      grid: "thtw-lnd",
      portraitPaper: true,
      pagesPerSheet: 64,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g20 foldBottom e-8",
          "g21 foldBottom cutLeft e-10",
          "g22 foldBottom cutLeft e-12",
          "g23 foldBottom cutLeft e-14",
          "g30 cutBottom s+8",
          "g31 cutBottom cutLeft s+10",
          "g32 cutBottom cutLeft s+12",
          "g33 cutBottom cutLeft s+14",
          "g40 foldBottom e-16",
          "g41 foldBottom cutLeft e-18",
          "g42 foldBottom cutLeft e-20",
          "g43 foldBottom cutLeft e-22",
          "g50 cutBottom s+16",
          "g51 cutBottom cutLeft s+18",
          "g52 cutBottom cutLeft s+20",
          "g53 cutBottom cutLeft s+22",
          "g60 foldBottom e-24",
          "g61 foldBottom cutLeft e-26",
          "g62 foldBottom cutLeft e-28",
          "g63 foldBottom cutLeft e-30",
          "g70 s+24",
          "g71 cutLeft s+26",
          "g72 cutLeft s+28",
          "g73 cutLeft s+30"
        ],
        [
          "g00 r foldTop e-7",
          "g01 r foldTop cutRight e-5",
          "g02 r foldTop cutRight e-3",
          "g03 r foldTop cutRight e-1",
          "g10 r cutTop s+7",
          "g11 r cutTop cutRight s+5",
          "g12 r cutTop cutRight s+3",
          "g13 r cutTop cutRight s+1",
          "g20 r foldTop e-15",
          "g21 r foldTop cutRight e-13",
          "g22 r foldTop cutRight e-11",
          "g23 r foldTop cutRight e-9",
          "g30 r cutTop s+15",
          "g31 r cutTop cutRight s+13",
          "g32 r cutTop cutRight s+11",
          "g33 r cutTop cutRight s+9",
          "g40 r foldTop e-23",
          "g41 r foldTop cutRight e-21",
          "g42 r foldTop cutRight e-19",
          "g43 r foldTop cutRight e-17",
          "g50 r cutTop s+23",
          "g51 r cutTop cutRight s+21",
          "g52 r cutTop cutRight s+19",
          "g53 r cutTop cutRight s+17",
          "g60 r foldTop e-31",
          "g61 r foldTop cutRight e-29",
          "g62 r foldTop cutRight e-27",
          "g63 r foldTop cutRight e-25",
          "g70 r s+31",
          "g71 r cutRight s+29",
          "g72 r cutRight s+27",
          "g73 r cutRight s+25"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "36th/single/portrait/side": {
      grid: "thsx-por",
      portraitPaper: true,
      pagesPerSheet: 36,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-13",
          "g01 r cutTop foldRight e-14",
          "g02 r cutTop foldRight e-15",
          "g03 r cutTop foldRight e-16",
          "g04 r cutTop foldRight e-17",
          "g05 r foldTop foldRight s+17",
          "g10 cutBottom e-12",
          "g11 foldBottom foldLeft e-11",
          "g12 foldBottom cutLeft s+13",
          "g13 cutBottom foldLeft s+14",
          "g14 cutBottom foldLeft s+15",
          "g15 cutBottom foldLeft s+16",
          "g20 r foldTop e-9",
          "g21 r cutTop foldRight e-10",
          "g22 r cutTop cutRight s+12",
          "g23 r cutTop foldRight s+11",
          "g24 r cutTop foldRight s+10",
          "g25 r foldTop foldRight s+9",
          "g30 cutBottom e-8",
          "g31 foldBottom foldLeft e-7",
          "g32 foldBottom cutLeft s+5",
          "g33 cutBottom foldLeft s+6",
          "g34 cutBottom foldLeft s+7",
          "g35 cutBottom foldLeft s+8",
          "g40 r foldTop e-5",
          "g41 r cutTop foldRight e-6",
          "g42 r cutTop cutRight s+4",
          "g43 r cutTop foldRight s+3",
          "g44 r cutTop foldRight s+2",
          "g45 r foldTop foldRight s+1",
          "g50 e-4",
          "g51 foldLeft e-3",
          "g52 foldLeft e-2",
          "g53 foldLeft e-1",
          "g54 foldLeft e",
          "g55 foldLeft s"
        ]
      ]
    },
    "36th/single/portrait/top": {
      grid: "thsx-por",
      portraitPaper: true,
      pagesPerSheet: 36,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-4",
          "g01 r foldTop foldRight e-5",
          "g02 foldBottom cutLeft e-8",
          "g03 r foldTop foldRight e-9",
          "g04 foldBottom cutLeft e-12",
          "g05 r foldTop foldRight e-13",
          "g10 foldBottom e-3",
          "g11 r cutTop cutRight e-6",
          "g12 cutBottom foldLeft e-7",
          "g13 r cutTop cutRight e-10",
          "g14 cutBottom foldLeft e-11",
          "g15 r foldTop cutRight e-14",
          "g20 foldBottom e-2",
          "g21 r foldTop cutRight s+4",
          "g22 foldBottom foldLeft s+5",
          "g23 r foldTop cutRight s+12",
          "g24 foldBottom foldLeft s+13",
          "g25 r foldTop cutRight e-15",
          "g30 foldBottom e-1",
          "g31 r foldTop cutRight s+3",
          "g32 foldBottom cutLeft s+6",
          "g33 r foldTop cutRight s+11",
          "g34 foldBottom cutLeft s+14",
          "g35 r foldTop cutRight e-16",
          "g40 foldBottom e",
          "g41 r foldTop cutRight s+2",
          "g42 foldBottom cutLeft s+7",
          "g43 r foldTop cutRight s+10",
          "g44 foldBottom cutLeft s+15",
          "g45 r foldTop cutRight e-17",
          "g50 s",
          "g51 r foldRight s+1",
          "g52 cutLeft s+8",
          "g53 r foldRight s+9",
          "g54 cutLeft s+16",
          "g55 r foldRight s+17"
        ]
      ],
      backCover: [{ side: 0, cell: 24, spec: "g40 r foldTop e" }]
    },
    "36th/single/landscape/side": {
      grid: "thsx-lnd",
      portraitPaper: false,
      pagesPerSheet: 36,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-13",
          "g01 r cutTop foldRight e-14",
          "g02 r cutTop foldRight e-15",
          "g03 r cutTop foldRight e-16",
          "g04 r cutTop foldRight e-17",
          "g05 r foldTop foldRight s+17",
          "g10 cutBottom e-12",
          "g11 foldBottom foldLeft e-11",
          "g12 foldBottom cutLeft s+13",
          "g13 cutBottom foldLeft s+14",
          "g14 cutBottom foldLeft s+15",
          "g15 cutBottom foldLeft s+16",
          "g20 r foldTop e-9",
          "g21 r cutTop foldRight e-10",
          "g22 r cutTop cutRight s+12",
          "g23 r cutTop foldRight s+11",
          "g24 r cutTop foldRight s+10",
          "g25 r foldTop foldRight s+9",
          "g30 cutBottom e-8",
          "g31 foldBottom foldLeft e-7",
          "g32 foldBottom cutLeft s+5",
          "g33 cutBottom foldLeft s+6",
          "g34 cutBottom foldLeft s+7",
          "g35 cutBottom foldLeft s+8",
          "g40 r foldTop e-5",
          "g41 r cutTop foldRight e-6",
          "g42 r cutTop cutRight s+4",
          "g43 r cutTop foldRight s+3",
          "g44 r cutTop foldRight s+2",
          "g45 r foldTop foldRight s+1",
          "g50 e-4",
          "g51 foldLeft e-3",
          "g52 foldLeft e-2",
          "g53 foldLeft e-1",
          "g54 foldLeft e",
          "g55 foldLeft s"
        ]
      ]
    },
    "36th/single/landscape/top": {
      grid: "thsx-lnd",
      portraitPaper: false,
      pagesPerSheet: 36,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-4",
          "g01 r foldTop foldRight e-5",
          "g02 foldBottom cutLeft e-8",
          "g03 r foldTop foldRight e-9",
          "g04 foldBottom cutLeft e-12",
          "g05 r foldTop foldRight e-13",
          "g10 foldBottom e-3",
          "g11 r cutTop cutRight e-6",
          "g12 cutBottom foldLeft e-7",
          "g13 r cutTop cutRight e-10",
          "g14 cutBottom foldLeft e-11",
          "g15 r foldTop cutRight e-14",
          "g20 foldBottom e-2",
          "g21 r foldTop cutRight s+4",
          "g22 foldBottom foldLeft s+5",
          "g23 r foldTop cutRight s+12",
          "g24 foldBottom foldLeft s+13",
          "g25 r foldTop cutRight e-15",
          "g30 foldBottom e-1",
          "g31 r foldTop cutRight s+3",
          "g32 foldBottom cutLeft s+6",
          "g33 r foldTop cutRight s+11",
          "g34 foldBottom cutLeft s+14",
          "g35 r foldTop cutRight e-16",
          "g40 foldBottom e",
          "g41 r foldTop cutRight s+2",
          "g42 foldBottom cutLeft s+7",
          "g43 r foldTop cutRight s+10",
          "g44 foldBottom cutLeft s+15",
          "g45 r foldTop cutRight e-17",
          "g50 s",
          "g51 r foldRight s+1",
          "g52 cutLeft s+8",
          "g53 r foldRight s+9",
          "g54 cutLeft s+16",
          "g55 r foldRight s+17"
        ]
      ],
      backCover: [{ side: 0, cell: 24, spec: "g40 r foldTop e" }]
    },
    "36th/double/portrait/side": {
      grid: "thsx-por",
      portraitPaper: true,
      pagesPerSheet: 72,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g10 cutBottom e-6",
          "g11 cutBottom foldLeft s+6",
          "g12 cutBottom cutLeft e-8",
          "g13 cutBottom foldLeft s+8",
          "g14 cutBottom cutLeft e-10",
          "g15 cutBottom foldLeft s+10",
          "g20 cutBottom e-12",
          "g21 cutBottom foldLeft s+12",
          "g22 cutBottom cutLeft e-14",
          "g23 cutBottom foldLeft s+14",
          "g24 cutBottom cutLeft e-16",
          "g25 cutBottom foldLeft s+16",
          "g30 cutBottom e-18",
          "g31 cutBottom foldLeft s+18",
          "g32 cutBottom cutLeft e-20",
          "g33 cutBottom foldLeft s+20",
          "g34 cutBottom cutLeft e-22",
          "g35 cutBottom foldLeft s+22",
          "g40 cutBottom e-24",
          "g41 cutBottom foldLeft s+24",
          "g42 cutBottom cutLeft e-26",
          "g43 cutBottom foldLeft s+26",
          "g44 cutBottom cutLeft e-28",
          "g45 cutBottom foldLeft s+28",
          "g50 e-30",
          "g51 foldLeft s+30",
          "g52 cutLeft e-32",
          "g53 foldLeft s+32",
          "g54 cutLeft e-34",
          "g55 foldLeft s+34"
        ],
        [
          "g00 cutBottom s+5",
          "g01 cutBottom foldLeft e-5",
          "g02 cutBottom cutLeft s+3",
          "g03 cutBottom foldLeft e-3",
          "g04 cutBottom cutLeft s+1",
          "g05 cutBottom foldLeft e-1",
          "g10 cutBottom s+11",
          "g11 cutBottom foldLeft e-11",
          "g12 cutBottom cutLeft s+9",
          "g13 cutBottom foldLeft e-9",
          "g14 cutBottom cutLeft s+7",
          "g15 cutBottom foldLeft e-7",
          "g20 cutBottom s+17",
          "g21 cutBottom foldLeft e-17",
          "g22 cutBottom cutLeft s+15",
          "g23 cutBottom foldLeft e-15",
          "g24 cutBottom cutLeft s+13",
          "g25 cutBottom foldLeft e-13",
          "g30 cutBottom s+23",
          "g31 cutBottom foldLeft e-23",
          "g32 cutBottom cutLeft s+21",
          "g33 cutBottom foldLeft e-21",
          "g34 cutBottom cutLeft s+19",
          "g35 cutBottom foldLeft e-19",
          "g40 cutBottom s+29",
          "g41 cutBottom foldLeft e-29",
          "g42 cutBottom cutLeft s+27",
          "g43 cutBottom foldLeft e-27",
          "g44 cutBottom cutLeft s+25",
          "g45 cutBottom foldLeft e-25",
          "g50 s+35",
          "g51 foldLeft e-35",
          "g52 cutLeft s+33",
          "g53 foldLeft e-33",
          "g54 cutLeft s+31",
          "g55 foldLeft e-31"
        ]
      ]
    },
    "36th/double/portrait/top": {
      grid: "thsx-por",
      portraitPaper: true,
      pagesPerSheet: 72,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g20 foldBottom e-12",
          "g21 foldBottom cutLeft e-14",
          "g22 foldBottom cutLeft e-16",
          "g23 foldBottom cutLeft e-18",
          "g24 foldBottom cutLeft e-20",
          "g25 foldBottom cutLeft e-22",
          "g30 cutBottom s+12",
          "g31 cutBottom cutLeft s+14",
          "g32 cutBottom cutLeft s+16",
          "g33 cutBottom cutLeft s+18",
          "g34 cutBottom cutLeft s+20",
          "g35 cutBottom cutLeft s+22",
          "g40 foldBottom e-24",
          "g41 foldBottom cutLeft e-26",
          "g42 foldBottom cutLeft e-28",
          "g43 foldBottom cutLeft e-30",
          "g44 foldBottom cutLeft e-32",
          "g45 foldBottom cutLeft e-34",
          "g50 s+24",
          "g51 cutLeft s+26",
          "g52 cutLeft s+28",
          "g53 cutLeft s+30",
          "g54 cutLeft s+32",
          "g55 cutLeft s+34"
        ],
        [
          "g00 r foldTop e-11",
          "g01 r foldTop cutRight e-9",
          "g02 r foldTop cutRight e-7",
          "g03 r foldTop cutRight e-5",
          "g04 r foldTop cutRight e-3",
          "g05 r foldTop cutRight e-1",
          "g10 r cutTop s+11",
          "g11 r cutTop cutRight s+9",
          "g12 r cutTop cutRight s+7",
          "g13 r cutTop cutRight s+5",
          "g14 r cutTop cutRight s+3",
          "g15 r cutTop cutRight s+1",
          "g20 r foldTop e-23",
          "g21 r foldTop cutRight e-21",
          "g22 r foldTop cutRight e-19",
          "g23 r foldTop cutRight e-17",
          "g24 r foldTop cutRight e-15",
          "g25 r foldTop cutRight e-13",
          "g30 r cutTop s+23",
          "g31 r cutTop cutRight s+21",
          "g32 r cutTop cutRight s+19",
          "g33 r cutTop cutRight s+17",
          "g34 r cutTop cutRight s+15",
          "g35 r cutTop cutRight s+13",
          "g40 r foldTop e-35",
          "g41 r foldTop cutRight e-33",
          "g42 r foldTop cutRight e-31",
          "g43 r foldTop cutRight e-29",
          "g44 r foldTop cutRight e-27",
          "g45 r foldTop cutRight e-25",
          "g50 r s+35",
          "g51 r cutRight s+33",
          "g52 r cutRight s+31",
          "g53 r cutRight s+29",
          "g54 r cutRight s+27",
          "g55 r cutRight s+25"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "36th/double/landscape/side": {
      grid: "thsx-lnd",
      portraitPaper: false,
      pagesPerSheet: 72,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g10 cutBottom e-6",
          "g11 cutBottom foldLeft s+6",
          "g12 cutBottom cutLeft e-8",
          "g13 cutBottom foldLeft s+8",
          "g14 cutBottom cutLeft e-10",
          "g15 cutBottom foldLeft s+10",
          "g20 cutBottom e-12",
          "g21 cutBottom foldLeft s+12",
          "g22 cutBottom cutLeft e-14",
          "g23 cutBottom foldLeft s+14",
          "g24 cutBottom cutLeft e-16",
          "g25 cutBottom foldLeft s+16",
          "g30 cutBottom e-18",
          "g31 cutBottom foldLeft s+18",
          "g32 cutBottom cutLeft e-20",
          "g33 cutBottom foldLeft s+20",
          "g34 cutBottom cutLeft e-22",
          "g35 cutBottom foldLeft s+22",
          "g40 cutBottom e-24",
          "g41 cutBottom foldLeft s+24",
          "g42 cutBottom cutLeft e-26",
          "g43 cutBottom foldLeft s+26",
          "g44 cutBottom cutLeft e-28",
          "g45 cutBottom foldLeft s+28",
          "g50 e-30",
          "g51 foldLeft s+30",
          "g52 cutLeft e-32",
          "g53 foldLeft s+32",
          "g54 cutLeft e-34",
          "g55 foldLeft s+34"
        ],
        [
          "g00 cutBottom s+5",
          "g01 cutBottom foldLeft e-5",
          "g02 cutBottom cutLeft s+3",
          "g03 cutBottom foldLeft e-3",
          "g04 cutBottom cutLeft s+1",
          "g05 cutBottom foldLeft e-1",
          "g10 cutBottom s+11",
          "g11 cutBottom foldLeft e-11",
          "g12 cutBottom cutLeft s+9",
          "g13 cutBottom foldLeft e-9",
          "g14 cutBottom cutLeft s+7",
          "g15 cutBottom foldLeft e-7",
          "g20 cutBottom s+17",
          "g21 cutBottom foldLeft e-17",
          "g22 cutBottom cutLeft s+15",
          "g23 cutBottom foldLeft e-15",
          "g24 cutBottom cutLeft s+13",
          "g25 cutBottom foldLeft e-13",
          "g30 cutBottom s+23",
          "g31 cutBottom foldLeft e-23",
          "g32 cutBottom cutLeft s+21",
          "g33 cutBottom foldLeft e-21",
          "g34 cutBottom cutLeft s+19",
          "g35 cutBottom foldLeft e-19",
          "g40 cutBottom s+29",
          "g41 cutBottom foldLeft e-29",
          "g42 cutBottom cutLeft s+27",
          "g43 cutBottom foldLeft e-27",
          "g44 cutBottom cutLeft s+25",
          "g45 cutBottom foldLeft e-25",
          "g50 s+35",
          "g51 foldLeft e-35",
          "g52 cutLeft s+33",
          "g53 foldLeft e-33",
          "g54 cutLeft s+31",
          "g55 foldLeft e-31"
        ]
      ]
    },
    "36th/double/landscape/top": {
      grid: "thsx-lnd",
      portraitPaper: false,
      pagesPerSheet: 72,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g20 foldBottom e-12",
          "g21 foldBottom cutLeft e-14",
          "g22 foldBottom cutLeft e-16",
          "g23 foldBottom cutLeft e-18",
          "g24 foldBottom cutLeft e-20",
          "g25 foldBottom cutLeft e-22",
          "g30 cutBottom s+12",
          "g31 cutBottom cutLeft s+14",
          "g32 cutBottom cutLeft s+16",
          "g33 cutBottom cutLeft s+18",
          "g34 cutBottom cutLeft s+20",
          "g35 cutBottom cutLeft s+22",
          "g40 foldBottom e-24",
          "g41 foldBottom cutLeft e-26",
          "g42 foldBottom cutLeft e-28",
          "g43 foldBottom cutLeft e-30",
          "g44 foldBottom cutLeft e-32",
          "g45 foldBottom cutLeft e-34",
          "g50 s+24",
          "g51 cutLeft s+26",
          "g52 cutLeft s+28",
          "g53 cutLeft s+30",
          "g54 cutLeft s+32",
          "g55 cutLeft s+34"
        ],
        [
          "g00 r foldTop e-11",
          "g01 r foldTop cutRight e-9",
          "g02 r foldTop cutRight e-7",
          "g03 r foldTop cutRight e-5",
          "g04 r foldTop cutRight e-3",
          "g05 r foldTop cutRight e-1",
          "g10 r cutTop s+11",
          "g11 r cutTop cutRight s+9",
          "g12 r cutTop cutRight s+7",
          "g13 r cutTop cutRight s+5",
          "g14 r cutTop cutRight s+3",
          "g15 r cutTop cutRight s+1",
          "g20 r foldTop e-23",
          "g21 r foldTop cutRight e-21",
          "g22 r foldTop cutRight e-19",
          "g23 r foldTop cutRight e-17",
          "g24 r foldTop cutRight e-15",
          "g25 r foldTop cutRight e-13",
          "g30 r cutTop s+23",
          "g31 r cutTop cutRight s+21",
          "g32 r cutTop cutRight s+19",
          "g33 r cutTop cutRight s+17",
          "g34 r cutTop cutRight s+15",
          "g35 r cutTop cutRight s+13",
          "g40 r foldTop e-35",
          "g41 r foldTop cutRight e-33",
          "g42 r foldTop cutRight e-31",
          "g43 r foldTop cutRight e-29",
          "g44 r foldTop cutRight e-27",
          "g45 r foldTop cutRight e-25",
          "g50 r s+35",
          "g51 r cutRight s+33",
          "g52 r cutRight s+31",
          "g53 r cutRight s+29",
          "g54 r cutRight s+27",
          "g55 r cutRight s+25"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "48th/single/portrait/side": {
      grid: "frei-por",
      portraitPaper: false,
      pagesPerSheet: 48,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-23",
          "g01 r cutTop foldRight s+23",
          "g02 r cutTop foldRight s+22",
          "g03 r cutTop foldRight s+21",
          "g04 r cutTop foldRight s+20",
          "g05 r cutTop foldRight s+19",
          "g06 r cutTop foldRight s+18",
          "g07 r foldTop foldRight s+17",
          "g10 cutBottom e-22",
          "g11 cutBottom foldLeft e-21",
          "g12 cutBottom foldLeft e-20",
          "g13 foldBottom foldLeft e-19",
          "g14 foldBottom cutLeft s+13",
          "g15 cutBottom foldLeft s+14",
          "g16 cutBottom foldLeft s+15",
          "g17 cutBottom foldLeft s+16",
          "g20 r foldTop e-15",
          "g21 r cutTop foldRight e-16",
          "g22 r cutTop foldRight e-17",
          "g23 r cutTop foldRight e-18",
          "g24 r cutTop cutRight s+12",
          "g25 r cutTop foldRight s+11",
          "g26 r cutTop foldRight s+10",
          "g27 r foldTop foldRight s+9",
          "g30 cutBottom e-14",
          "g31 cutBottom foldLeft e-13",
          "g32 cutBottom foldLeft e-12",
          "g33 foldBottom foldLeft e-11",
          "g34 foldBottom cutLeft s+5",
          "g35 cutBottom foldLeft s+6",
          "g36 cutBottom foldLeft s+7",
          "g37 cutBottom foldLeft s+8",
          "g40 r foldTop e-7",
          "g41 r cutTop foldRight e-8",
          "g42 r cutTop foldRight e-9",
          "g43 r cutTop foldRight e-10",
          "g44 r cutTop cutRight s+4",
          "g45 r cutTop foldRight s+3",
          "g46 r cutTop foldRight s+2",
          "g47 r foldTop foldRight s+1",
          "g50 e-6",
          "g51 foldLeft e-5",
          "g52 foldLeft e-4",
          "g53 foldLeft e-3",
          "g54 foldLeft e-2",
          "g55 foldLeft e-1",
          "g56 foldLeft e",
          "g57 foldLeft s"
        ]
      ]
    },
    "48th/single/portrait/top": {
      grid: "frei-por",
      portraitPaper: false,
      pagesPerSheet: 48,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-4",
          "g01 r foldTop foldRight e-5",
          "g02 foldBottom cutLeft e-8",
          "g03 r foldTop foldRight e-9",
          "g04 foldBottom cutLeft e-12",
          "g05 r foldTop foldRight e-13",
          "g06 foldBottom cutLeft e-16",
          "g07 r foldTop foldRight e-17",
          "g10 foldBottom e-3",
          "g11 r cutTop cutRight e-6",
          "g12 cutBottom foldLeft e-7",
          "g13 r cutTop cutRight e-10",
          "g14 cutBottom foldLeft e-11",
          "g15 r cutTop cutRight e-14",
          "g16 cutBottom foldLeft e-15",
          "g17 r foldTop cutRight e-18",
          "g20 foldBottom e-2",
          "g21 r foldTop cutRight s+4",
          "g22 foldBottom foldLeft s+5",
          "g23 r foldTop cutRight s+12",
          "g24 foldBottom foldLeft s+13",
          "g25 r foldTop cutRight s+20",
          "g26 foldBottom foldLeft s+21",
          "g27 r foldTop cutRight e-19",
          "g30 foldBottom e-1",
          "g31 r foldTop cutRight s+3",
          "g32 foldBottom cutLeft s+6",
          "g33 r foldTop cutRight s+11",
          "g34 foldBottom cutLeft s+14",
          "g35 r foldTop cutRight s+19",
          "g36 foldBottom cutLeft s+22",
          "g37 r foldTop cutRight e-20",
          "g40 foldBottom e",
          "g41 r foldTop cutRight s+2",
          "g42 foldBottom cutLeft s+7",
          "g43 r foldTop cutRight s+10",
          "g44 foldBottom cutLeft s+15",
          "g45 r foldTop cutRight s+18",
          "g46 foldBottom cutLeft s+23",
          "g47 r foldTop cutRight e-21",
          "g50 s",
          "g51 r foldRight s+1",
          "g52 cutLeft s+8",
          "g53 r foldRight s+9",
          "g54 cutLeft s+16",
          "g55 r foldRight s+17",
          "g56 cutLeft e-23",
          "g57 r foldRight e-22"
        ]
      ],
      backCover: [{ side: 0, cell: 32, spec: "g40 r foldTop e" }]
    },
    "48th/single/landscape/side": {
      grid: "frei-lnd",
      portraitPaper: true,
      pagesPerSheet: 48,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-17",
          "g01 r cutTop foldRight e-18",
          "g02 r cutTop foldRight e-19",
          "g03 r cutTop foldRight e-20",
          "g04 r cutTop foldRight e-21",
          "g05 r foldTop foldRight e-22",
          "g10 cutBottom e-16",
          "g11 foldBottom foldLeft e-15",
          "g12 foldBottom cutLeft s+21",
          "g13 cutBottom foldLeft s+22",
          "g14 cutBottom foldLeft s+23",
          "g15 cutBottom foldLeft e-23",
          "g20 r foldTop e-13",
          "g21 r cutTop foldRight e-14",
          "g22 r cutTop cutRight s+20",
          "g23 r cutTop foldRight s+19",
          "g24 r cutTop foldRight s+18",
          "g25 r foldTop foldRight s+17",
          "g30 cutBottom e-12",
          "g31 foldBottom foldLeft e-11",
          "g32 foldBottom cutLeft s+13",
          "g33 cutBottom foldLeft s+14",
          "g34 cutBottom foldLeft s+15",
          "g35 cutBottom foldLeft s+16",
          "g40 r foldTop e-9",
          "g41 r cutTop foldRight e-10",
          "g42 r cutTop cutRight s+12",
          "g43 r cutTop foldRight s+11",
          "g44 r cutTop foldRight s+10",
          "g45 r foldTop foldRight s+9",
          "g50 cutBottom e-8",
          "g51 foldBottom foldLeft e-7",
          "g52 foldBottom cutLeft s+5",
          "g53 cutBottom foldLeft s+6",
          "g54 cutBottom foldLeft s+7",
          "g55 cutBottom foldLeft s+8",
          "g60 r foldTop e-5",
          "g61 r cutTop foldRight e-6",
          "g62 r cutTop cutRight s+4",
          "g63 r cutTop foldRight s+3",
          "g64 r cutTop foldRight s+2",
          "g65 r foldTop foldRight s+1",
          "g70 e-4",
          "g71 foldLeft e-3",
          "g72 foldLeft e-2",
          "g73 foldLeft e-1",
          "g74 foldLeft e",
          "g75 foldLeft s"
        ]
      ]
    },
    "48th/single/landscape/top": {
      grid: "frei-lnd",
      portraitPaper: true,
      pagesPerSheet: 48,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-6",
          "g01 r foldTop foldRight e-7",
          "g02 foldBottom cutLeft e-14",
          "g03 r foldTop foldRight e-15",
          "g04 foldBottom cutLeft e-22",
          "g05 r foldTop foldRight e-23",
          "g10 foldBottom e-5",
          "g11 r foldTop cutRight e-8",
          "g12 foldBottom cutLeft e-13",
          "g13 r foldTop cutRight e-16",
          "g14 foldBottom cutLeft e-21",
          "g15 r foldTop cutRight s+23",
          "g20 foldBottom e-4",
          "g21 r foldTop cutRight e-9",
          "g22 foldBottom cutLeft e-12",
          "g23 r foldTop cutRight e-17",
          "g24 foldBottom cutLeft e-20",
          "g25 r foldTop cutRight s+22",
          "g30 foldBottom e-3",
          "g31 r cutTop cutRight e-10",
          "g32 cutBottom foldLeft e-11",
          "g33 r cutTop cutRight e-18",
          "g34 cutBottom foldLeft e-19",
          "g35 r foldTop cutRight s+21",
          "g40 foldBottom e-2",
          "g41 r foldTop cutRight s+4",
          "g42 foldBottom foldLeft s+5",
          "g43 r foldTop cutRight s+12",
          "g44 foldBottom foldLeft s+13",
          "g45 r foldTop cutRight s+20",
          "g50 foldBottom e-1",
          "g51 r foldTop cutRight s+3",
          "g52 foldBottom cutLeft s+6",
          "g53 r foldTop cutRight s+11",
          "g54 foldBottom cutLeft s+14",
          "g55 r foldTop cutRight s+19",
          "g60 foldBottom e",
          "g61 r foldTop cutRight s+2",
          "g62 foldBottom cutLeft s+7",
          "g63 r foldTop cutRight s+10",
          "g64 foldBottom cutLeft s+15",
          "g65 r foldTop cutRight s+18",
          "g70 s",
          "g71 r foldRight s+1",
          "g72 cutLeft s+8",
          "g73 r foldRight s+9",
          "g74 cutLeft s+16",
          "g75 r foldRight s+17"
        ]
      ],
      backCover: [{ side: 0, cell: 36, spec: "g60 r foldTop e" }]
    },
    "48th/double/portrait/side": {
      grid: "frei-por",
      portraitPaper: false,
      pagesPerSheet: 96,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g06 cutBottom cutLeft e-6",
          "g07 cutBottom foldLeft s+6",
          "g10 cutBottom e-8",
          "g11 cutBottom foldLeft s+8",
          "g12 cutBottom cutLeft e-10",
          "g13 cutBottom foldLeft s+10",
          "g14 cutBottom cutLeft e-12",
          "g15 cutBottom foldLeft s+12",
          "g16 cutBottom cutLeft e-14",
          "g17 cutBottom foldLeft s+14",
          "g20 cutBottom e-16",
          "g21 cutBottom foldLeft s+16",
          "g22 cutBottom cutLeft e-18",
          "g23 cutBottom foldLeft s+18",
          "g24 cutBottom cutLeft e-20",
          "g25 cutBottom foldLeft s+20",
          "g26 cutBottom cutLeft e-22",
          "g27 cutBottom foldLeft s+22",
          "g30 cutBottom e-24",
          "g31 cutBottom foldLeft s+24",
          "g32 cutBottom cutLeft e-26",
          "g33 cutBottom foldLeft s+26",
          "g34 cutBottom cutLeft e-28",
          "g35 cutBottom foldLeft s+28",
          "g36 cutBottom cutLeft e-30",
          "g37 cutBottom foldLeft s+30",
          "g40 cutBottom e-32",
          "g41 cutBottom foldLeft s+32",
          "g42 cutBottom cutLeft e-34",
          "g43 cutBottom foldLeft s+34",
          "g44 cutBottom cutLeft e-36",
          "g45 cutBottom foldLeft s+36",
          "g46 cutBottom cutLeft e-38",
          "g47 cutBottom foldLeft s+38",
          "g50 e-40",
          "g51 foldLeft s+40",
          "g52 cutLeft e-42",
          "g53 foldLeft s+42",
          "g54 cutLeft e-44",
          "g55 foldLeft s+44",
          "g56 cutLeft e-46",
          "g57 foldLeft s+46"
        ],
        [
          "g00 cutBottom s+7",
          "g01 cutBottom foldLeft e-7",
          "g02 cutBottom cutLeft s+5",
          "g03 cutBottom foldLeft e-5",
          "g04 cutBottom cutLeft s+3",
          "g05 cutBottom foldLeft e-3",
          "g06 cutBottom cutLeft s+1",
          "g07 cutBottom foldLeft e-1",
          "g10 cutBottom s+15",
          "g11 cutBottom foldLeft e-15",
          "g12 cutBottom cutLeft s+13",
          "g13 cutBottom foldLeft e-13",
          "g14 cutBottom cutLeft s+11",
          "g15 cutBottom foldLeft e-11",
          "g16 cutBottom cutLeft s+9",
          "g17 cutBottom foldLeft e-9",
          "g20 cutBottom s+23",
          "g21 cutBottom foldLeft e-23",
          "g22 cutBottom cutLeft s+21",
          "g23 cutBottom foldLeft e-21",
          "g24 cutBottom cutLeft s+19",
          "g25 cutBottom foldLeft e-19",
          "g26 cutBottom cutLeft s+17",
          "g27 cutBottom foldLeft e-17",
          "g30 cutBottom s+31",
          "g31 cutBottom foldLeft e-31",
          "g32 cutBottom cutLeft s+29",
          "g33 cutBottom foldLeft e-29",
          "g34 cutBottom cutLeft s+27",
          "g35 cutBottom foldLeft e-27",
          "g36 cutBottom cutLeft s+25",
          "g37 cutBottom foldLeft e-25",
          "g40 cutBottom s+39",
          "g41 cutBottom foldLeft e-39",
          "g42 cutBottom cutLeft s+37",
          "g43 cutBottom foldLeft e-37",
          "g44 cutBottom cutLeft s+35",
          "g45 cutBottom foldLeft e-35",
          "g46 cutBottom cutLeft s+33",
          "g47 cutBottom foldLeft e-33",
          "g50 s+47",
          "g51 foldLeft e-47",
          "g52 cutLeft s+45",
          "g53 foldLeft e-45",
          "g54 cutLeft s+43",
          "g55 foldLeft e-43",
          "g56 cutLeft s+41",
          "g57 foldLeft e-41"
        ]
      ]
    },
    "48th/double/portrait/top": {
      grid: "frei-por",
      portraitPaper: false,
      pagesPerSheet: 96,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g06 foldBottom cutLeft e-12",
          "g07 foldBottom cutLeft e-14",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g16 cutBottom cutLeft s+12",
          "g17 cutBottom cutLeft s+14",
          "g20 foldBottom e-16",
          "g21 foldBottom cutLeft e-18",
          "g22 foldBottom cutLeft e-20",
          "g23 foldBottom cutLeft e-22",
          "g24 foldBottom cutLeft e-24",
          "g25 foldBottom cutLeft e-26",
          "g26 foldBottom cutLeft e-28",
          "g27 foldBottom cutLeft e-30",
          "g30 cutBottom s+16",
          "g31 cutBottom cutLeft s+18",
          "g32 cutBottom cutLeft s+20",
          "g33 cutBottom cutLeft s+22",
          "g34 cutBottom cutLeft s+24",
          "g35 cutBottom cutLeft s+26",
          "g36 cutBottom cutLeft s+28",
          "g37 cutBottom cutLeft s+30",
          "g40 foldBottom e-32",
          "g41 foldBottom cutLeft e-34",
          "g42 foldBottom cutLeft e-36",
          "g43 foldBottom cutLeft e-38",
          "g44 foldBottom cutLeft e-40",
          "g45 foldBottom cutLeft e-42",
          "g46 foldBottom cutLeft e-44",
          "g47 foldBottom cutLeft e-46",
          "g50 s+32",
          "g51 cutLeft s+34",
          "g52 cutLeft s+36",
          "g53 cutLeft s+38",
          "g54 cutLeft s+40",
          "g55 cutLeft s+42",
          "g56 cutLeft s+44",
          "g57 cutLeft s+46"
        ],
        [
          "g00 r foldTop e-15",
          "g01 r foldTop cutRight e-13",
          "g02 r foldTop cutRight e-11",
          "g03 r foldTop cutRight e-9",
          "g04 r foldTop cutRight e-7",
          "g05 r foldTop cutRight e-5",
          "g06 r foldTop cutRight e-3",
          "g07 r foldTop cutRight e-1",
          "g10 r cutTop s+15",
          "g11 r cutTop cutRight s+13",
          "g12 r cutTop cutRight s+11",
          "g13 r cutTop cutRight s+9",
          "g14 r cutTop cutRight s+7",
          "g15 r cutTop cutRight s+5",
          "g16 r cutTop cutRight s+3",
          "g17 r cutTop cutRight s+1",
          "g20 r foldTop e-31",
          "g21 r foldTop cutRight e-29",
          "g22 r foldTop cutRight e-27",
          "g23 r foldTop cutRight e-25",
          "g24 r foldTop cutRight e-23",
          "g25 r foldTop cutRight e-21",
          "g26 r foldTop cutRight e-19",
          "g27 r foldTop cutRight e-17",
          "g30 r cutTop s+31",
          "g31 r cutTop cutRight s+29",
          "g32 r cutTop cutRight s+27",
          "g33 r cutTop cutRight s+25",
          "g34 r cutTop cutRight s+23",
          "g35 r cutTop cutRight s+21",
          "g36 r cutTop cutRight s+19",
          "g37 r cutTop cutRight s+17",
          "g40 r foldTop e-47",
          "g41 r foldTop cutRight e-45",
          "g42 r foldTop cutRight e-43",
          "g43 r foldTop cutRight e-41",
          "g44 r foldTop cutRight e-39",
          "g45 r foldTop cutRight e-37",
          "g46 r foldTop cutRight e-35",
          "g47 r foldTop cutRight e-33",
          "g50 r s+47",
          "g51 r cutRight s+45",
          "g52 r cutRight s+43",
          "g53 r cutRight s+41",
          "g54 r cutRight s+39",
          "g55 r cutRight s+37",
          "g56 r cutRight s+35",
          "g57 r cutRight s+33"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "48th/double/landscape/side": {
      grid: "frei-lnd",
      portraitPaper: true,
      pagesPerSheet: 96,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g10 cutBottom e-6",
          "g11 cutBottom foldLeft s+6",
          "g12 cutBottom cutLeft e-8",
          "g13 cutBottom foldLeft s+8",
          "g14 cutBottom cutLeft e-10",
          "g15 cutBottom foldLeft s+10",
          "g20 cutBottom e-12",
          "g21 cutBottom foldLeft s+12",
          "g22 cutBottom cutLeft e-14",
          "g23 cutBottom foldLeft s+14",
          "g24 cutBottom cutLeft e-16",
          "g25 cutBottom foldLeft s+16",
          "g30 cutBottom e-18",
          "g31 cutBottom foldLeft s+18",
          "g32 cutBottom cutLeft e-20",
          "g33 cutBottom foldLeft s+20",
          "g34 cutBottom cutLeft e-22",
          "g35 cutBottom foldLeft s+22",
          "g40 cutBottom e-24",
          "g41 cutBottom foldLeft s+24",
          "g42 cutBottom cutLeft e-26",
          "g43 cutBottom foldLeft s+26",
          "g44 cutBottom cutLeft e-28",
          "g45 cutBottom foldLeft s+28",
          "g50 cutBottom e-30",
          "g51 cutBottom foldLeft s+30",
          "g52 cutBottom cutLeft e-32",
          "g53 cutBottom foldLeft s+32",
          "g54 cutBottom cutLeft e-34",
          "g55 cutBottom foldLeft s+34",
          "g60 cutBottom e-36",
          "g61 cutBottom foldLeft s+36",
          "g62 cutBottom cutLeft e-38",
          "g63 cutBottom foldLeft s+38",
          "g64 cutBottom cutLeft e-40",
          "g65 cutBottom foldLeft s+40",
          "g70 e-42",
          "g71 foldLeft s+42",
          "g72 cutLeft e-44",
          "g73 foldLeft s+44",
          "g74 cutLeft e-46",
          "g75 foldLeft s+46"
        ],
        [
          "g00 cutBottom s+5",
          "g01 cutBottom foldLeft e-5",
          "g02 cutBottom cutLeft s+3",
          "g03 cutBottom foldLeft e-3",
          "g04 cutBottom cutLeft s+1",
          "g05 cutBottom foldLeft e-1",
          "g10 cutBottom s+11",
          "g11 cutBottom foldLeft e-11",
          "g12 cutBottom cutLeft s+9",
          "g13 cutBottom foldLeft e-9",
          "g14 cutBottom cutLeft s+7",
          "g15 cutBottom foldLeft e-7",
          "g20 cutBottom s+17",
          "g21 cutBottom foldLeft e-17",
          "g22 cutBottom cutLeft s+15",
          "g23 cutBottom foldLeft e-15",
          "g24 cutBottom cutLeft s+13",
          "g25 cutBottom foldLeft e-13",
          "g30 cutBottom s+23",
          "g31 cutBottom foldLeft e-23",
          "g32 cutBottom cutLeft s+21",
          "g33 cutBottom foldLeft e-21",
          "g34 cutBottom cutLeft s+19",
          "g35 cutBottom foldLeft e-19",
          "g40 cutBottom s+29",
          "g41 cutBottom foldLeft e-29",
          "g42 cutBottom cutLeft s+27",
          "g43 cutBottom foldLeft e-27",
          "g44 cutBottom cutLeft s+25",
          "g45 cutBottom foldLeft e-25",
          "g50 cutBottom s+35",
          "g51 cutBottom foldLeft e-35",
          "g52 cutBottom cutLeft s+33",
          "g53 cutBottom foldLeft e-33",
          "g54 cutBottom cutLeft s+31",
          "g55 cutBottom foldLeft e-31",
          "g60 cutBottom s+41",
          "g61 cutBottom foldLeft e-41",
          "g62 cutBottom cutLeft s+39",
          "g63 cutBottom foldLeft e-39",
          "g64 cutBottom cutLeft s+37",
          "g65 cutBottom foldLeft e-37",
          "g70 s+47",
          "g71 foldLeft e-47",
          "g72 cutLeft s+45",
          "g73 foldLeft e-45",
          "g74 cutLeft s+43",
          "g75 foldLeft e-43"
        ]
      ]
    },
    "48th/double/landscape/top": {
      grid: "frei-lnd",
      portraitPaper: true,
      pagesPerSheet: 96,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g20 foldBottom e-12",
          "g21 foldBottom cutLeft e-14",
          "g22 foldBottom cutLeft e-16",
          "g23 foldBottom cutLeft e-18",
          "g24 foldBottom cutLeft e-20",
          "g25 foldBottom cutLeft e-22",
          "g30 cutBottom s+12",
          "g31 cutBottom cutLeft s+14",
          "g32 cutBottom cutLeft s+16",
          "g33 cutBottom cutLeft s+18",
          "g34 cutBottom cutLeft s+20",
          "g35 cutBottom cutLeft s+22",
          "g40 foldBottom e-24",
          "g41 foldBottom cutLeft e-26",
          "g42 foldBottom cutLeft e-28",
          "g43 foldBottom cutLeft e-30",
          "g44 foldBottom cutLeft e-32",
          "g45 foldBottom cutLeft e-34",
          "g50 cutBottom s+24",
          "g51 cutBottom cutLeft s+26",
          "g52 cutBottom cutLeft s+28",
          "g53 cutBottom cutLeft s+30",
          "g54 cutBottom cutLeft s+32",
          "g55 cutBottom cutLeft s+34",
          "g60 foldBottom e-36",
          "g61 foldBottom cutLeft e-38",
          "g62 foldBottom cutLeft e-40",
          "g63 foldBottom cutLeft e-42",
          "g64 foldBottom cutLeft e-44",
          "g65 foldBottom cutLeft e-46",
          "g70 s+36",
          "g71 cutLeft s+38",
          "g72 cutLeft s+40",
          "g73 cutLeft s+42",
          "g74 cutLeft s+44",
          "g75 cutLeft s+46"
        ],
        [
          "g00 r foldTop e-11",
          "g01 r foldTop cutRight e-9",
          "g02 r foldTop cutRight e-7",
          "g03 r foldTop cutRight e-5",
          "g04 r foldTop cutRight e-3",
          "g05 r foldTop cutRight e-1",
          "g10 r cutTop s+11",
          "g11 r cutTop cutRight s+9",
          "g12 r cutTop cutRight s+7",
          "g13 r cutTop cutRight s+5",
          "g14 r cutTop cutRight s+3",
          "g15 r cutTop cutRight s+1",
          "g20 r foldTop e-23",
          "g21 r foldTop cutRight e-21",
          "g22 r foldTop cutRight e-19",
          "g23 r foldTop cutRight e-17",
          "g24 r foldTop cutRight e-15",
          "g25 r foldTop cutRight e-13",
          "g30 r cutTop s+23",
          "g31 r cutTop cutRight s+21",
          "g32 r cutTop cutRight s+19",
          "g33 r cutTop cutRight s+17",
          "g34 r cutTop cutRight s+15",
          "g35 r cutTop cutRight s+13",
          "g40 r foldTop e-35",
          "g41 r foldTop cutRight e-33",
          "g42 r foldTop cutRight e-31",
          "g43 r foldTop cutRight e-29",
          "g44 r foldTop cutRight e-27",
          "g45 r foldTop cutRight e-25",
          "g50 r cutTop s+35",
          "g51 r cutTop cutRight s+33",
          "g52 r cutTop cutRight s+31",
          "g53 r cutTop cutRight s+29",
          "g54 r cutTop cutRight s+27",
          "g55 r cutTop cutRight s+25",
          "g60 r foldTop e-47",
          "g61 r foldTop cutRight e-45",
          "g62 r foldTop cutRight e-43",
          "g63 r foldTop cutRight e-41",
          "g64 r foldTop cutRight e-39",
          "g65 r foldTop cutRight e-37",
          "g70 r s+47",
          "g71 r cutRight s+45",
          "g72 r cutRight s+43",
          "g73 r cutRight s+41",
          "g74 r cutRight s+39",
          "g75 r cutRight s+37"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "64th/single/portrait/side": {
      grid: "sxfr-por",
      portraitPaper: true,
      pagesPerSheet: 64,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-31",
          "g01 r cutTop foldRight s+31",
          "g02 r cutTop foldRight s+30",
          "g03 r cutTop foldRight s+29",
          "g04 r cutTop foldRight s+28",
          "g05 r cutTop foldRight s+27",
          "g06 r cutTop foldRight s+26",
          "g07 r foldTop foldRight s+25",
          "g10 cutBottom e-30",
          "g11 cutBottom foldLeft e-29",
          "g12 cutBottom foldLeft e-28",
          "g13 foldBottom foldLeft e-27",
          "g14 foldBottom cutLeft s+21",
          "g15 cutBottom foldLeft s+22",
          "g16 cutBottom foldLeft s+23",
          "g17 cutBottom foldLeft s+24",
          "g20 r foldTop e-23",
          "g21 r cutTop foldRight e-24",
          "g22 r cutTop foldRight e-25",
          "g23 r cutTop foldRight e-26",
          "g24 r cutTop cutRight s+20",
          "g25 r cutTop foldRight s+19",
          "g26 r cutTop foldRight s+18",
          "g27 r foldTop foldRight s+17",
          "g30 cutBottom e-22",
          "g31 cutBottom foldLeft e-21",
          "g32 cutBottom foldLeft e-20",
          "g33 foldBottom foldLeft e-19",
          "g34 foldBottom cutLeft s+13",
          "g35 cutBottom foldLeft s+14",
          "g36 cutBottom foldLeft s+15",
          "g37 cutBottom foldLeft s+16",
          "g40 r foldTop e-15",
          "g41 r cutTop foldRight e-16",
          "g42 r cutTop foldRight e-17",
          "g43 r cutTop foldRight e-18",
          "g44 r cutTop cutRight s+12",
          "g45 r cutTop foldRight s+11",
          "g46 r cutTop foldRight s+10",
          "g47 r foldTop foldRight s+9",
          "g50 cutBottom e-14",
          "g51 cutBottom foldLeft e-13",
          "g52 cutBottom foldLeft e-12",
          "g53 foldBottom foldLeft e-11",
          "g54 foldBottom cutLeft s+5",
          "g55 cutBottom foldLeft s+6",
          "g56 cutBottom foldLeft s+7",
          "g57 cutBottom foldLeft s+8",
          "g60 r foldTop e-7",
          "g61 r cutTop foldRight e-8",
          "g62 r cutTop foldRight e-9",
          "g63 r cutTop foldRight e-10",
          "g64 r cutTop cutRight s+4",
          "g65 r cutTop foldRight s+3",
          "g66 r cutTop foldRight s+2",
          "g67 r foldTop foldRight s+1",
          "g70 e-6",
          "g71 foldLeft e-5",
          "g72 foldLeft e-4",
          "g73 foldLeft e-3",
          "g74 foldLeft e-2",
          "g75 foldLeft e-1",
          "g76 foldLeft e",
          "g77 foldLeft s"
        ]
      ]
    },
    "64th/single/portrait/top": {
      grid: "sxfr-por",
      portraitPaper: true,
      pagesPerSheet: 64,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-6",
          "g01 r foldTop foldRight e-7",
          "g02 foldBottom cutLeft e-14",
          "g03 r foldTop foldRight e-15",
          "g04 foldBottom cutLeft e-22",
          "g05 r foldTop foldRight e-23",
          "g06 foldBottom cutLeft e-30",
          "g07 r foldTop foldRight e-31",
          "g10 foldBottom e-5",
          "g11 r foldTop cutRight e-8",
          "g12 foldBottom cutLeft e-13",
          "g13 r foldTop cutRight e-16",
          "g14 foldBottom cutLeft e-21",
          "g15 r foldTop cutRight e-24",
          "g16 foldBottom cutLeft e-29",
          "g17 r foldTop cutRight s+31",
          "g20 foldBottom e-4",
          "g21 r foldTop cutRight e-9",
          "g22 foldBottom cutLeft e-12",
          "g23 r foldTop cutRight e-17",
          "g24 foldBottom cutLeft e-20",
          "g25 r foldTop cutRight e-25",
          "g26 foldBottom cutLeft e-28",
          "g27 r foldTop cutRight s+30",
          "g30 foldBottom e-3",
          "g31 r cutTop cutRight e-10",
          "g32 cutBottom foldLeft e-11",
          "g33 r cutTop cutRight e-18",
          "g34 cutBottom foldLeft e-19",
          "g35 r cutTop cutRight e-26",
          "g36 cutBottom foldLeft e-27",
          "g37 r foldTop cutRight s+29",
          "g40 foldBottom e-2",
          "g41 r foldTop cutRight s+4",
          "g42 foldBottom foldLeft s+5",
          "g43 r foldTop cutRight s+12",
          "g44 foldBottom foldLeft s+13",
          "g45 r foldTop cutRight s+20",
          "g46 foldBottom foldLeft s+21",
          "g47 r foldTop cutRight s+28",
          "g50 foldBottom e-1",
          "g51 r foldTop cutRight s+3",
          "g52 foldBottom cutLeft s+6",
          "g53 r foldTop cutRight s+11",
          "g54 foldBottom cutLeft s+14",
          "g55 r foldTop cutRight s+19",
          "g56 foldBottom cutLeft s+22",
          "g57 r foldTop cutRight s+27",
          "g60 foldBottom e",
          "g61 r foldTop cutRight s+2",
          "g62 foldBottom cutLeft s+7",
          "g63 r foldTop cutRight s+10",
          "g64 foldBottom cutLeft s+15",
          "g65 r foldTop cutRight s+18",
          "g66 foldBottom cutLeft s+23",
          "g67 r foldTop cutRight s+26",
          "g70 s",
          "g71 r foldRight s+1",
          "g72 cutLeft s+8",
          "g73 r foldRight s+9",
          "g74 cutLeft s+16",
          "g75 r foldRight s+17",
          "g76 cutLeft s+24",
          "g77 r foldRight s+25"
        ]
      ],
      backCover: [{ side: 0, cell: 48, spec: "g60 r foldTop e" }]
    },
    "64th/single/landscape/side": {
      grid: "sxfr-lnd",
      portraitPaper: false,
      pagesPerSheet: 64,
      sheetIdStep: 2,
      sides: [
        [
          "g00 r foldTop e-31",
          "g01 r cutTop foldRight s+31",
          "g02 r cutTop foldRight s+30",
          "g03 r cutTop foldRight s+29",
          "g04 r cutTop foldRight s+28",
          "g05 r cutTop foldRight s+27",
          "g06 r cutTop foldRight s+26",
          "g07 r foldTop foldRight s+25",
          "g10 cutBottom e-30",
          "g11 cutBottom foldLeft e-29",
          "g12 cutBottom foldLeft e-28",
          "g13 foldBottom foldLeft e-27",
          "g14 foldBottom cutLeft s+21",
          "g15 cutBottom foldLeft s+22",
          "g16 cutBottom foldLeft s+23",
          "g17 cutBottom foldLeft s+24",
          "g20 r foldTop e-23",
          "g21 r cutTop foldRight e-24",
          "g22 r cutTop foldRight e-25",
          "g23 r cutTop foldRight e-26",
          "g24 r cutTop cutRight s+20",
          "g25 r cutTop foldRight s+19",
          "g26 r cutTop foldRight s+18",
          "g27 r foldTop foldRight s+17",
          "g30 cutBottom e-22",
          "g31 cutBottom foldLeft e-21",
          "g32 cutBottom foldLeft e-20",
          "g33 foldBottom foldLeft e-19",
          "g34 foldBottom cutLeft s+13",
          "g35 cutBottom foldLeft s+14",
          "g36 cutBottom foldLeft s+15",
          "g37 cutBottom foldLeft s+16",
          "g40 r foldTop e-15",
          "g41 r cutTop foldRight e-16",
          "g42 r cutTop foldRight e-17",
          "g43 r cutTop foldRight e-18",
          "g44 r cutTop cutRight s+12",
          "g45 r cutTop foldRight s+11",
          "g46 r cutTop foldRight s+10",
          "g47 r foldTop foldRight s+9",
          "g50 cutBottom e-14",
          "g51 cutBottom foldLeft e-13",
          "g52 cutBottom foldLeft e-12",
          "g53 foldBottom foldLeft e-11",
          "g54 foldBottom cutLeft s+5",
          "g55 cutBottom foldLeft s+6",
          "g56 cutBottom foldLeft s+7",
          "g57 cutBottom foldLeft s+8",
          "g60 r foldTop e-7",
          "g61 r cutTop foldRight e-8",
          "g62 r cutTop foldRight e-9",
          "g63 r cutTop foldRight e-10",
          "g64 r cutTop cutRight s+4",
          "g65 r cutTop foldRight s+3",
          "g66 r cutTop foldRight s+2",
          "g67 r foldTop foldRight s+1",
          "g70 e-6",
          "g71 foldLeft e-5",
          "g72 foldLeft e-4",
          "g73 foldLeft e-3",
          "g74 foldLeft e-2",
          "g75 foldLeft e-1",
          "g76 foldLeft e",
          "g77 foldLeft s"
        ]
      ]
    },
    "64th/single/landscape/top": {
      grid: "sxfr-lnd",
      portraitPaper: false,
      pagesPerSheet: 64,
      sheetIdStep: 2,
      sides: [
        [
          "g00 foldBottom e-6",
          "g01 r foldTop foldRight e-7",
          "g02 foldBottom cutLeft e-14",
          "g03 r foldTop foldRight e-15",
          "g04 foldBottom cutLeft e-22",
          "g05 r foldTop foldRight e-23",
          "g06 foldBottom cutLeft e-30",
          "g07 r foldTop foldRight e-31",
          "g10 foldBottom e-5",
          "g11 r foldTop cutRight e-8",
          "g12 foldBottom cutLeft e-13",
          "g13 r foldTop cutRight e-16",
          "g14 foldBottom cutLeft e-21",
          "g15 r foldTop cutRight e-24",
          "g16 foldBottom cutLeft e-29",
          "g17 r foldTop cutRight s+31",
          "g20 foldBottom e-4",
          "g21 r foldTop cutRight e-9",
          "g22 foldBottom cutLeft e-12",
          "g23 r foldTop cutRight e-17",
          "g24 foldBottom cutLeft e-20",
          "g25 r foldTop cutRight e-25",
          "g26 foldBottom cutLeft e-28",
          "g27 r foldTop cutRight s+30",
          "g30 foldBottom e-3",
          "g31 r cutTop cutRight e-10",
          "g32 cutBottom foldLeft e-11",
          "g33 r cutTop cutRight e-18",
          "g34 cutBottom foldLeft e-19",
          "g35 r cutTop cutRight e-26",
          "g36 cutBottom foldLeft e-27",
          "g37 r foldTop cutRight s+29",
          "g40 foldBottom e-2",
          "g41 r foldTop cutRight s+4",
          "g42 foldBottom foldLeft s+5",
          "g43 r foldTop cutRight s+12",
          "g44 foldBottom foldLeft s+13",
          "g45 r foldTop cutRight s+20",
          "g46 foldBottom foldLeft s+21",
          "g47 r foldTop cutRight s+28",
          "g50 foldBottom e-1",
          "g51 r foldTop cutRight s+3",
          "g52 foldBottom cutLeft s+6",
          "g53 r foldTop cutRight s+11",
          "g54 foldBottom cutLeft s+14",
          "g55 r foldTop cutRight s+19",
          "g56 foldBottom cutLeft s+22",
          "g57 r foldTop cutRight s+27",
          "g60 foldBottom e",
          "g61 r foldTop cutRight s+2",
          "g62 foldBottom cutLeft s+7",
          "g63 r foldTop cutRight s+10",
          "g64 foldBottom cutLeft s+15",
          "g65 r foldTop cutRight s+18",
          "g66 foldBottom cutLeft s+23",
          "g67 r foldTop cutRight s+26",
          "g70 s",
          "g71 r foldRight s+1",
          "g72 cutLeft s+8",
          "g73 r foldRight s+9",
          "g74 cutLeft s+16",
          "g75 r foldRight s+17",
          "g76 cutLeft s+24",
          "g77 r foldRight s+25"
        ]
      ],
      backCover: [{ side: 0, cell: 48, spec: "g60 r foldTop e" }]
    },
    "64th/double/portrait/side": {
      grid: "sxfr-por",
      portraitPaper: true,
      pagesPerSheet: 128,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g06 cutBottom cutLeft e-6",
          "g07 cutBottom foldLeft s+6",
          "g10 cutBottom e-8",
          "g11 cutBottom foldLeft s+8",
          "g12 cutBottom cutLeft e-10",
          "g13 cutBottom foldLeft s+10",
          "g14 cutBottom cutLeft e-12",
          "g15 cutBottom foldLeft s+12",
          "g16 cutBottom cutLeft e-14",
          "g17 cutBottom foldLeft s+14",
          "g20 cutBottom e-16",
          "g21 cutBottom foldLeft s+16",
          "g22 cutBottom cutLeft e-18",
          "g23 cutBottom foldLeft s+18",
          "g24 cutBottom cutLeft e-20",
          "g25 cutBottom foldLeft s+20",
          "g26 cutBottom cutLeft e-22",
          "g27 cutBottom foldLeft s+22",
          "g30 cutBottom e-24",
          "g31 cutBottom foldLeft s+24",
          "g32 cutBottom cutLeft e-26",
          "g33 cutBottom foldLeft s+26",
          "g34 cutBottom cutLeft e-28",
          "g35 cutBottom foldLeft s+28",
          "g36 cutBottom cutLeft e-30",
          "g37 cutBottom foldLeft s+30",
          "g40 cutBottom e-32",
          "g41 cutBottom foldLeft s+32",
          "g42 cutBottom cutLeft e-34",
          "g43 cutBottom foldLeft s+34",
          "g44 cutBottom cutLeft e-36",
          "g45 cutBottom foldLeft s+36",
          "g46 cutBottom cutLeft e-38",
          "g47 cutBottom foldLeft s+38",
          "g50 cutBottom e-40",
          "g51 cutBottom foldLeft s+40",
          "g52 cutBottom cutLeft e-42",
          "g53 cutBottom foldLeft s+42",
          "g54 cutBottom cutLeft e-44",
          "g55 cutBottom foldLeft s+44",
          "g56 cutBottom cutLeft e-46",
          "g57 cutBottom foldLeft s+46",
          "g60 cutBottom e-48",
          "g61 cutBottom foldLeft s+48",
          "g62 cutBottom cutLeft e-50",
          "g63 cutBottom foldLeft s+50",
          "g64 cutBottom cutLeft e-52",
          "g65 cutBottom foldLeft s+52",
          "g66 cutBottom cutLeft e-54",
          "g67 cutBottom foldLeft s+54",
          "g70 e-56",
          "g71 foldLeft s+56",
          "g72 cutLeft e-58",
          "g73 foldLeft s+58",
          "g74 cutLeft e-60",
          "g75 foldLeft s+60",
          "g76 cutLeft e-62",
          "g77 foldLeft s+62"
        ],
        [
          "g00 cutBottom s+7",
          "g01 cutBottom foldLeft e-7",
          "g02 cutBottom cutLeft s+5",
          "g03 cutBottom foldLeft e-5",
          "g04 cutBottom cutLeft s+3",
          "g05 cutBottom foldLeft e-3",
          "g06 cutBottom cutLeft s+1",
          "g07 cutBottom foldLeft e-1",
          "g10 cutBottom s+15",
          "g11 cutBottom foldLeft e-15",
          "g12 cutBottom cutLeft s+13",
          "g13 cutBottom foldLeft e-13",
          "g14 cutBottom cutLeft s+11",
          "g15 cutBottom foldLeft e-11",
          "g16 cutBottom cutLeft s+9",
          "g17 cutBottom foldLeft e-9",
          "g20 cutBottom s+23",
          "g21 cutBottom foldLeft e-23",
          "g22 cutBottom cutLeft s+21",
          "g23 cutBottom foldLeft e-21",
          "g24 cutBottom cutLeft s+19",
          "g25 cutBottom foldLeft e-19",
          "g26 cutBottom cutLeft s+17",
          "g27 cutBottom foldLeft e-17",
          "g30 cutBottom s+31",
          "g31 cutBottom foldLeft e-31",
          "g32 cutBottom cutLeft s+29",
          "g33 cutBottom foldLeft e-29",
          "g34 cutBottom cutLeft s+27",
          "g35 cutBottom foldLeft e-27",
          "g36 cutBottom cutLeft s+25",
          "g37 cutBottom foldLeft e-25",
          "g40 cutBottom s+39",
          "g41 cutBottom foldLeft e-39",
          "g42 cutBottom cutLeft s+37",
          "g43 cutBottom foldLeft e-37",
          "g44 cutBottom cutLeft s+35",
          "g45 cutBottom foldLeft e-35",
          "g46 cutBottom cutLeft s+33",
          "g47 cutBottom foldLeft e-33",
          "g50 cutBottom s+47",
          "g51 cutBottom foldLeft e-47",
          "g52 cutBottom cutLeft s+45",
          "g53 cutBottom foldLeft e-45",
          "g54 cutBottom cutLeft s+43",
          "g55 cutBottom foldLeft e-43",
          "g56 cutBottom cutLeft s+41",
          "g57 cutBottom foldLeft e-41",
          "g60 cutBottom s+55",
          "g61 cutBottom foldLeft e-55",
          "g62 cutBottom cutLeft s+53",
          "g63 cutBottom foldLeft e-53",
          "g64 cutBottom cutLeft s+51",
          "g65 cutBottom foldLeft e-51",
          "g66 cutBottom cutLeft s+49",
          "g67 cutBottom foldLeft e-49",
          "g70 s+63",
          "g71 foldLeft e-63",
          "g72 cutLeft s+61",
          "g73 foldLeft e-61",
          "g74 cutLeft s+59",
          "g75 foldLeft e-59",
          "g76 cutLeft s+57",
          "g77 foldLeft e-57"
        ]
      ]
    },
    "64th/double/portrait/top": {
      grid: "sxfr-por",
      portraitPaper: true,
      pagesPerSheet: 128,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g06 foldBottom cutLeft e-12",
          "g07 foldBottom cutLeft e-14",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g16 cutBottom cutLeft s+12",
          "g17 cutBottom cutLeft s+14",
          "g20 foldBottom e-16",
          "g21 foldBottom cutLeft e-18",
          "g22 foldBottom cutLeft e-20",
          "g23 foldBottom cutLeft e-22",
          "g24 foldBottom cutLeft e-24",
          "g25 foldBottom cutLeft e-26",
          "g26 foldBottom cutLeft e-28",
          "g27 foldBottom cutLeft e-30",
          "g30 cutBottom s+16",
          "g31 cutBottom cutLeft s+18",
          "g32 cutBottom cutLeft s+20",
          "g33 cutBottom cutLeft s+22",
          "g34 cutBottom cutLeft s+24",
          "g35 cutBottom cutLeft s+26",
          "g36 cutBottom cutLeft s+28",
          "g37 cutBottom cutLeft s+30",
          "g40 foldBottom e-32",
          "g41 foldBottom cutLeft e-34",
          "g42 foldBottom cutLeft e-36",
          "g43 foldBottom cutLeft e-38",
          "g44 foldBottom cutLeft e-40",
          "g45 foldBottom cutLeft e-42",
          "g46 foldBottom cutLeft e-44",
          "g47 foldBottom cutLeft e-46",
          "g50 cutBottom s+32",
          "g51 cutBottom cutLeft s+34",
          "g52 cutBottom cutLeft s+36",
          "g53 cutBottom cutLeft s+38",
          "g54 cutBottom cutLeft s+40",
          "g55 cutBottom cutLeft s+42",
          "g56 cutBottom cutLeft s+44",
          "g57 cutBottom cutLeft s+46",
          "g60 foldBottom e-48",
          "g61 foldBottom cutLeft e-50",
          "g62 foldBottom cutLeft e-52",
          "g63 foldBottom cutLeft e-54",
          "g64 foldBottom cutLeft e-56",
          "g65 foldBottom cutLeft e-58",
          "g66 foldBottom cutLeft e-60",
          "g67 foldBottom cutLeft e-62",
          "g70 s+48",
          "g71 cutLeft s+50",
          "g72 cutLeft s+52",
          "g73 cutLeft s+54",
          "g74 cutLeft s+56",
          "g75 cutLeft s+58",
          "g76 cutLeft s+60",
          "g77 cutLeft s+62"
        ],
        [
          "g00 r foldTop e-15",
          "g01 r foldTop cutRight e-13",
          "g02 r foldTop cutRight e-11",
          "g03 r foldTop cutRight e-9",
          "g04 r foldTop cutRight e-7",
          "g05 r foldTop cutRight e-5",
          "g06 r foldTop cutRight e-3",
          "g07 r foldTop cutRight e-1",
          "g10 r cutTop s+15",
          "g11 r cutTop cutRight s+13",
          "g12 r cutTop cutRight s+11",
          "g13 r cutTop cutRight s+9",
          "g14 r cutTop cutRight s+7",
          "g15 r cutTop cutRight s+5",
          "g16 r cutTop cutRight s+3",
          "g17 r cutTop cutRight s+1",
          "g20 r foldTop e-31",
          "g21 r foldTop cutRight e-29",
          "g22 r foldTop cutRight e-27",
          "g23 r foldTop cutRight e-25",
          "g24 r foldTop cutRight e-23",
          "g25 r foldTop cutRight e-21",
          "g26 r foldTop cutRight e-19",
          "g27 r foldTop cutRight e-17",
          "g30 r cutTop s+31",
          "g31 r cutTop cutRight s+29",
          "g32 r cutTop cutRight s+27",
          "g33 r cutTop cutRight s+25",
          "g34 r cutTop cutRight s+23",
          "g35 r cutTop cutRight s+21",
          "g36 r cutTop cutRight s+19",
          "g37 r cutTop cutRight s+17",
          "g40 r foldTop e-47",
          "g41 r foldTop cutRight e-45",
          "g42 r foldTop cutRight e-43",
          "g43 r foldTop cutRight e-41",
          "g44 r foldTop cutRight e-39",
          "g45 r foldTop cutRight e-37",
          "g46 r foldTop cutRight e-35",
          "g47 r foldTop cutRight e-33",
          "g50 r cutTop s+47",
          "g51 r cutTop cutRight s+45",
          "g52 r cutTop cutRight s+43",
          "g53 r cutTop cutRight s+41",
          "g54 r cutTop cutRight s+39",
          "g55 r cutTop cutRight s+37",
          "g56 r cutTop cutRight s+35",
          "g57 r cutTop cutRight s+33",
          "g60 r foldTop e-63",
          "g61 r foldTop cutRight e-61",
          "g62 r foldTop cutRight e-59",
          "g63 r foldTop cutRight e-57",
          "g64 r foldTop cutRight e-55",
          "g65 r foldTop cutRight e-53",
          "g66 r foldTop cutRight e-51",
          "g67 r foldTop cutRight e-49",
          "g70 r s+63",
          "g71 r cutRight s+61",
          "g72 r cutRight s+59",
          "g73 r cutRight s+57",
          "g74 r cutRight s+55",
          "g75 r cutRight s+53",
          "g76 r cutRight s+51",
          "g77 r cutRight s+49"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    },
    "64th/double/landscape/side": {
      grid: "sxfr-lnd",
      portraitPaper: false,
      pagesPerSheet: 128,
      sides: [
        [
          "g00 cutBottom e",
          "g01 cutBottom foldLeft s",
          "g02 cutBottom cutLeft e-2",
          "g03 cutBottom foldLeft s+2",
          "g04 cutBottom cutLeft e-4",
          "g05 cutBottom foldLeft s+4",
          "g06 cutBottom cutLeft e-6",
          "g07 cutBottom foldLeft s+6",
          "g10 cutBottom e-8",
          "g11 cutBottom foldLeft s+8",
          "g12 cutBottom cutLeft e-10",
          "g13 cutBottom foldLeft s+10",
          "g14 cutBottom cutLeft e-12",
          "g15 cutBottom foldLeft s+12",
          "g16 cutBottom cutLeft e-14",
          "g17 cutBottom foldLeft s+14",
          "g20 cutBottom e-16",
          "g21 cutBottom foldLeft s+16",
          "g22 cutBottom cutLeft e-18",
          "g23 cutBottom foldLeft s+18",
          "g24 cutBottom cutLeft e-20",
          "g25 cutBottom foldLeft s+20",
          "g26 cutBottom cutLeft e-22",
          "g27 cutBottom foldLeft s+22",
          "g30 cutBottom e-24",
          "g31 cutBottom foldLeft s+24",
          "g32 cutBottom cutLeft e-26",
          "g33 cutBottom foldLeft s+26",
          "g34 cutBottom cutLeft e-28",
          "g35 cutBottom foldLeft s+28",
          "g36 cutBottom cutLeft e-30",
          "g37 cutBottom foldLeft s+30",
          "g40 cutBottom e-32",
          "g41 cutBottom foldLeft s+32",
          "g42 cutBottom cutLeft e-34",
          "g43 cutBottom foldLeft s+34",
          "g44 cutBottom cutLeft e-36",
          "g45 cutBottom foldLeft s+36",
          "g46 cutBottom cutLeft e-38",
          "g47 cutBottom foldLeft s+38",
          "g50 cutBottom e-40",
          "g51 cutBottom foldLeft s+40",
          "g52 cutBottom cutLeft e-42",
          "g53 cutBottom foldLeft s+42",
          "g54 cutBottom cutLeft e-44",
          "g55 cutBottom foldLeft s+44",
          "g56 cutBottom cutLeft e-46",
          "g57 cutBottom foldLeft s+46",
          "g60 cutBottom e-48",
          "g61 cutBottom foldLeft s+48",
          "g62 cutBottom cutLeft e-50",
          "g63 cutBottom foldLeft s+50",
          "g64 cutBottom cutLeft e-52",
          "g65 cutBottom foldLeft s+52",
          "g66 cutBottom cutLeft e-54",
          "g67 cutBottom foldLeft s+54",
          "g70 e-56",
          "g71 foldLeft s+56",
          "g72 cutLeft e-58",
          "g73 foldLeft s+58",
          "g74 cutLeft e-60",
          "g75 foldLeft s+60",
          "g76 cutLeft e-62",
          "g77 foldLeft s+62"
        ],
        [
          "g00 cutBottom s+7",
          "g01 cutBottom foldLeft e-7",
          "g02 cutBottom cutLeft s+5",
          "g03 cutBottom foldLeft e-5",
          "g04 cutBottom cutLeft s+3",
          "g05 cutBottom foldLeft e-3",
          "g06 cutBottom cutLeft s+1",
          "g07 cutBottom foldLeft e-1",
          "g10 cutBottom s+15",
          "g11 cutBottom foldLeft e-15",
          "g12 cutBottom cutLeft s+13",
          "g13 cutBottom foldLeft e-13",
          "g14 cutBottom cutLeft s+11",
          "g15 cutBottom foldLeft e-11",
          "g16 cutBottom cutLeft s+9",
          "g17 cutBottom foldLeft e-9",
          "g20 cutBottom s+23",
          "g21 cutBottom foldLeft e-23",
          "g22 cutBottom cutLeft s+21",
          "g23 cutBottom foldLeft e-21",
          "g24 cutBottom cutLeft s+19",
          "g25 cutBottom foldLeft e-19",
          "g26 cutBottom cutLeft s+17",
          "g27 cutBottom foldLeft e-17",
          "g30 cutBottom s+31",
          "g31 cutBottom foldLeft e-31",
          "g32 cutBottom cutLeft s+29",
          "g33 cutBottom foldLeft e-29",
          "g34 cutBottom cutLeft s+27",
          "g35 cutBottom foldLeft e-27",
          "g36 cutBottom cutLeft s+25",
          "g37 cutBottom foldLeft e-25",
          "g40 cutBottom s+39",
          "g41 cutBottom foldLeft e-39",
          "g42 cutBottom cutLeft s+37",
          "g43 cutBottom foldLeft e-37",
          "g44 cutBottom cutLeft s+35",
          "g45 cutBottom foldLeft e-35",
          "g46 cutBottom cutLeft s+33",
          "g47 cutBottom foldLeft e-33",
          "g50 cutBottom s+47",
          "g51 cutBottom foldLeft e-47",
          "g52 cutBottom cutLeft s+45",
          "g53 cutBottom foldLeft e-45",
          "g54 cutBottom cutLeft s+43",
          "g55 cutBottom foldLeft e-43",
          "g56 cutBottom cutLeft s+41",
          "g57 cutBottom foldLeft e-41",
          "g60 cutBottom s+55",
          "g61 cutBottom foldLeft e-55",
          "g62 cutBottom cutLeft s+53",
          "g63 cutBottom foldLeft e-53",
          "g64 cutBottom cutLeft s+51",
          "g65 cutBottom foldLeft e-51",
          "g66 cutBottom cutLeft s+49",
          "g67 cutBottom foldLeft e-49",
          "g70 s+63",
          "g71 foldLeft e-63",
          "g72 cutLeft s+61",
          "g73 foldLeft e-61",
          "g74 cutLeft s+59",
          "g75 foldLeft e-59",
          "g76 cutLeft s+57",
          "g77 foldLeft e-57"
        ]
      ]
    },
    "64th/double/landscape/top": {
      grid: "sxfr-lnd",
      portraitPaper: false,
      pagesPerSheet: 128,
      sides: [
        [
          "g00 foldBottom e",
          "g01 foldBottom cutLeft e-2",
          "g02 foldBottom cutLeft e-4",
          "g03 foldBottom cutLeft e-6",
          "g04 foldBottom cutLeft e-8",
          "g05 foldBottom cutLeft e-10",
          "g06 foldBottom cutLeft e-12",
          "g07 foldBottom cutLeft e-14",
          "g10 cutBottom s",
          "g11 cutBottom cutLeft s+2",
          "g12 cutBottom cutLeft s+4",
          "g13 cutBottom cutLeft s+6",
          "g14 cutBottom cutLeft s+8",
          "g15 cutBottom cutLeft s+10",
          "g16 cutBottom cutLeft s+12",
          "g17 cutBottom cutLeft s+14",
          "g20 foldBottom e-16",
          "g21 foldBottom cutLeft e-18",
          "g22 foldBottom cutLeft e-20",
          "g23 foldBottom cutLeft e-22",
          "g24 foldBottom cutLeft e-24",
          "g25 foldBottom cutLeft e-26",
          "g26 foldBottom cutLeft e-28",
          "g27 foldBottom cutLeft e-30",
          "g30 cutBottom s+16",
          "g31 cutBottom cutLeft s+18",
          "g32 cutBottom cutLeft s+20",
          "g33 cutBottom cutLeft s+22",
          "g34 cutBottom cutLeft s+24",
          "g35 cutBottom cutLeft s+26",
          "g36 cutBottom cutLeft s+28",
          "g37 cutBottom cutLeft s+30",
          "g40 foldBottom e-32",
          "g41 foldBottom cutLeft e-34",
          "g42 foldBottom cutLeft e-36",
          "g43 foldBottom cutLeft e-38",
          "g44 foldBottom cutLeft e-40",
          "g45 foldBottom cutLeft e-42",
          "g46 foldBottom cutLeft e-44",
          "g47 foldBottom cutLeft e-46",
          "g50 cutBottom s+32",
          "g51 cutBottom cutLeft s+34",
          "g52 cutBottom cutLeft s+36",
          "g53 cutBottom cutLeft s+38",
          "g54 cutBottom cutLeft s+40",
          "g55 cutBottom cutLeft s+42",
          "g56 cutBottom cutLeft s+44",
          "g57 cutBottom cutLeft s+46",
          "g60 foldBottom e-48",
          "g61 foldBottom cutLeft e-50",
          "g62 foldBottom cutLeft e-52",
          "g63 foldBottom cutLeft e-54",
          "g64 foldBottom cutLeft e-56",
          "g65 foldBottom cutLeft e-58",
          "g66 foldBottom cutLeft e-60",
          "g67 foldBottom cutLeft e-62",
          "g70 s+48",
          "g71 cutLeft s+50",
          "g72 cutLeft s+52",
          "g73 cutLeft s+54",
          "g74 cutLeft s+56",
          "g75 cutLeft s+58",
          "g76 cutLeft s+60",
          "g77 cutLeft s+62"
        ],
        [
          "g00 r foldTop e-15",
          "g01 r foldTop cutRight e-13",
          "g02 r foldTop cutRight e-11",
          "g03 r foldTop cutRight e-9",
          "g04 r foldTop cutRight e-7",
          "g05 r foldTop cutRight e-5",
          "g06 r foldTop cutRight e-3",
          "g07 r foldTop cutRight e-1",
          "g10 r cutTop s+15",
          "g11 r cutTop cutRight s+13",
          "g12 r cutTop cutRight s+11",
          "g13 r cutTop cutRight s+9",
          "g14 r cutTop cutRight s+7",
          "g15 r cutTop cutRight s+5",
          "g16 r cutTop cutRight s+3",
          "g17 r cutTop cutRight s+1",
          "g20 r foldTop e-31",
          "g21 r foldTop cutRight e-29",
          "g22 r foldTop cutRight e-27",
          "g23 r foldTop cutRight e-25",
          "g24 r foldTop cutRight e-23",
          "g25 r foldTop cutRight e-21",
          "g26 r foldTop cutRight e-19",
          "g27 r foldTop cutRight e-17",
          "g30 r cutTop s+31",
          "g31 r cutTop cutRight s+29",
          "g32 r cutTop cutRight s+27",
          "g33 r cutTop cutRight s+25",
          "g34 r cutTop cutRight s+23",
          "g35 r cutTop cutRight s+21",
          "g36 r cutTop cutRight s+19",
          "g37 r cutTop cutRight s+17",
          "g40 r foldTop e-47",
          "g41 r foldTop cutRight e-45",
          "g42 r foldTop cutRight e-43",
          "g43 r foldTop cutRight e-41",
          "g44 r foldTop cutRight e-39",
          "g45 r foldTop cutRight e-37",
          "g46 r foldTop cutRight e-35",
          "g47 r foldTop cutRight e-33",
          "g50 r cutTop s+47",
          "g51 r cutTop cutRight s+45",
          "g52 r cutTop cutRight s+43",
          "g53 r cutTop cutRight s+41",
          "g54 r cutTop cutRight s+39",
          "g55 r cutTop cutRight s+37",
          "g56 r cutTop cutRight s+35",
          "g57 r cutTop cutRight s+33",
          "g60 r foldTop e-63",
          "g61 r foldTop cutRight e-61",
          "g62 r foldTop cutRight e-59",
          "g63 r foldTop cutRight e-57",
          "g64 r foldTop cutRight e-55",
          "g65 r foldTop cutRight e-53",
          "g66 r foldTop cutRight e-51",
          "g67 r foldTop cutRight e-49",
          "g70 r s+63",
          "g71 r cutRight s+61",
          "g72 r cutRight s+59",
          "g73 r cutRight s+57",
          "g74 r cutRight s+55",
          "g75 r cutRight s+53",
          "g76 r cutRight s+51",
          "g77 r cutRight s+49"
        ]
      ],
      backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }]
    }
  };
  LAYOUTS["half/single/portrait/top"] = LAYOUTS["half/single/portrait/side"];
  LAYOUTS["half/single/landscape/top"] = LAYOUTS["half/single/landscape/side"];
  LAYOUTS["half/double/portrait/side"] = LAYOUTS["half/single/portrait/side"];
  LAYOUTS["half/double/portrait/top"] = LAYOUTS["half/single/portrait/side"];
  LAYOUTS["half/double/landscape/side"] = LAYOUTS["half/single/landscape/side"];
  LAYOUTS["half/double/landscape/top"] = LAYOUTS["half/single/landscape/side"];

  // apps/ZineArranger/src/imposition/signatures.js
  function resolveSheetsPerSig(totalPageCount, sheetPageCapacity) {
    var totalSheets = totalPageCount / sheetPageCapacity;
    if (state.sigSize > 0) {
      return state.sigSize;
    }
    if (totalSheets <= MAX_AUTO_SIGNATURE_SHEETS) {
      return totalSheets;
    }
    var numSignatures = Math.ceil(totalSheets / MAX_AUTO_SIGNATURE_SHEETS);
    return Math.ceil(totalSheets / numSignatures);
  }

  // apps/ZineArranger/src/imposition/impose.js
  var SIZE_KEYS = ["half", "quarter", "eighth", "12th", "16th", "24th", "32nd", "36th", "48th", "64th"];
  function layoutKey({ size, doubleSided, zinePortrait, spineSide, quarterCopy }) {
    const key = [SIZE_KEYS[size], doubleSided ? "double" : "single", zinePortrait ? "portrait" : "landscape", spineSide ? "side" : "top"].join("/");
    return key + (SIZE_KEYS[size] === "quarter" && doubleSided && quarterCopy ? "/copy" : "");
  }
  function impose({ size, doubleSided, zinePortrait, spineSide, quarterCopy, flipBackCover, sigSize }, contentPageCount) {
    const layout = LAYOUTS[layoutKey({ size, doubleSided, zinePortrait, spineSide, quarterCopy })];
    const { pagesPerSheet } = layout;
    const step = layout.step || pagesPerSheet / 2;
    let pageCount = contentPageCount;
    if (pageCount % pagesPerSheet != 0) pageCount += pagesPerSheet - pageCount % pagesPerSheet;
    let sheetsPerSig = sigSize;
    if (sheetsPerSig <= 0) sheetsPerSig = resolveSheetsPerSig(pageCount, pagesPerSheet);
    const pagesPerSig = sheetsPerSig * pagesPerSheet;
    if (pageCount % pagesPerSig != 0) pageCount += pagesPerSig - pageCount % pagesPerSig;
    const sheets = [];
    for (let i = 0; i < pageCount / pagesPerSheet; i++) {
      const sigCount = Math.floor(i / sheetsPerSig);
      const s = step * (i % sheetsPerSig) + sigCount * pagesPerSig;
      const e = (sigCount + 1) * pagesPerSig - step * (i % sheetsPerSig) - 1;
      const anchors = { s, e, m: s + pagesPerSig / 4, n: e - pagesPerSig / 4 };
      const isBackCoverSheet = !flipBackCover && e == pageCount - 1;
      layout.sides.forEach((cells, side) => {
        sheets.push({
          id: i * (layout.sheetIdStep || layout.sides.length) + side,
          grid: layout.grid,
          cells: cells.map((spec, cellIndex) => {
            const override = isBackCoverSheet && layout.backCover && layout.backCover.find((b) => b.side === side && b.cell === cellIndex);
            return parseCell(override ? override.spec : spec, anchors);
          })
        });
      });
    }
    return { pageCount, portraitPaper: layout.portraitPaper, sheets };
  }
  function parseCell(spec, anchors) {
    const parts = spec.split(" ");
    const pos = parts[0];
    const pageExpr = parts[parts.length - 1];
    const m = /^([semn])(?:([+-])(\d+))?(b?)$/.exec(pageExpr);
    if (!m) throw new Error("Bad cell spec: " + spec);
    const offset = m[2] ? (m[2] === "+" ? 1 : -1) * Number(m[3]) : 0;
    return { pos, tokens: parts.slice(1, -1), page: anchors[m[1]] + offset, copy: m[4] };
  }

  // apps/ZineArranger/src/imposition/sheetsHtml.js
  var SIDE_NAMES = { Left: "left", Right: "right", Top: "top", Bottom: "bottom" };
  function sheetsHtml(sheets, { guideMargins, guideCenter, guideFolds }) {
    const marginGuides = guideMargins ? " guide-margins" : "";
    const tokenClass = (token) => {
      if (token === "r") return " rotate";
      const kind = token.startsWith("cut") ? "cut" : "fold";
      const side = SIDE_NAMES[token.slice(kind.length)];
      if (kind === "cut") return guideCenter ? " guide-solid-" + side : guideFolds ? " guide-dotted-" + side : "";
      return guideFolds ? " guide-dotted-" + side : "";
    };
    let html = "";
    for (const sheet of sheets) {
      html += '<section class="zine-sheet ' + sheet.grid + marginGuides + '" id="s' + sheet.id + '">';
      for (const cell of sheet.cells) {
        html += '<section class="zine-page ' + cell.pos + cell.tokens.map(tokenClass).join("") + '"><canvas class="zine-canvas" id="p' + cell.page + cell.copy + '"></canvas></section>';
      }
      html += "</section>";
    }
    return html;
  }

  // apps/ZineArranger/src/imposition/arrangeZineSheets.js
  function arrangeZineSheets() {
    document.getElementById("zine-scale").innerHTML = "";
    const result = impose(state, state.pageCount);
    state.pageCount = result.pageCount;
    setPageOrientation(result.portraitPaper);
    document.getElementById("zine-scale").innerHTML = sheetsHtml(result.sheets, state);
  }

  // apps/ZineArranger/src/pageRange.js
  function parsePageRange(spec, maxPage) {
    if (!spec || spec.trim().length === 0) return null;
    var pages = {};
    var tokens = spec.split(",");
    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t].trim();
      if (token.length === 0) continue;
      var dashParts = token.split("-");
      if (dashParts.length === 2 && dashParts[0].trim().length > 0 && dashParts[1].trim().length > 0) {
        var a = parseInt(dashParts[0].trim(), 10);
        var b = parseInt(dashParts[1].trim(), 10);
        if (isNaN(a) || isNaN(b)) continue;
        var lo = Math.min(a, b), hi = Math.max(a, b);
        for (var pn = lo; pn <= hi; pn++) {
          if (pn >= 1 && pn <= maxPage) pages[pn] = true;
        }
      } else {
        var single = parseInt(token, 10);
        if (!isNaN(single) && single >= 1 && single <= maxPage) pages[single] = true;
      }
    }
    var result = Object.keys(pages).map(Number).sort(function(a2, b2) {
      return a2 - b2;
    });
    return result.length > 0 ? result : null;
  }

  // apps/ZineArranger/src/reverseImpose.js
  async function splitPdfPageIntoHalves(page) {
    var renderScale = 2;
    var outputScale = 3;
    var viewport = page.getViewport({ scale: renderScale });
    var fullCanvas = document.createElement("canvas");
    fullCanvas.width = Math.floor(viewport.width * outputScale);
    fullCanvas.height = Math.floor(viewport.height * outputScale);
    var fullCtx = fullCanvas.getContext("2d");
    await page.render({
      canvasContext: fullCtx,
      transform: [outputScale, 0, 0, outputScale, 0, 0],
      viewport
    }).promise;
    var halfWidthPx = Math.floor(fullCanvas.width / 2);
    var heightPx = fullCanvas.height;
    var leftCanvas = document.createElement("canvas");
    leftCanvas.width = halfWidthPx;
    leftCanvas.height = heightPx;
    leftCanvas.getContext("2d").drawImage(fullCanvas, 0, 0, halfWidthPx, heightPx, 0, 0, halfWidthPx, heightPx);
    var rightCanvas = document.createElement("canvas");
    rightCanvas.width = fullCanvas.width - halfWidthPx;
    rightCanvas.height = heightPx;
    rightCanvas.getContext("2d").drawImage(fullCanvas, halfWidthPx, 0, rightCanvas.width, heightPx, 0, 0, rightCanvas.width, heightPx);
    var widthPt = viewport.width / renderScale / 2;
    var heightPt = viewport.height / renderScale;
    return {
      left: { canvas: leftCanvas, widthPt, heightPt },
      right: { canvas: rightCanvas, widthPt, heightPt }
    };
  }
  async function reverseImposePdf(pdf, actualPageCount) {
    if (actualPageCount < 2 || actualPageCount % 2 !== 0) {
      var msg = "Reverse Impose needs one front + one back page per sheet (an even page count). This PDF has " + actualPageCount + " page(s).";
      logResult(msg, true);
      setReverseImposePageSize(null, null);
      alert(msg);
      return null;
    }
    var totalSheets = actualPageCount / 2;
    var N = totalSheets * 4;
    logResult("Reverse Impose: " + totalSheets + " sheet(s) detected → " + N + " sequential page(s) (a multiple of 4).");
    var resultPages = new Array(N + 1);
    for (var k = 1; k <= totalSheets; k++) {
      var frontPageNum = 2 * k - 1;
      var backPageNum = 2 * k;
      logCmd("reverseImposePdf(): sheet " + k + "/" + totalSheets);
      var frontPage = await pdf.getPage(frontPageNum);
      var frontHalves = await splitPdfPageIntoHalves(frontPage);
      var backPage = await pdf.getPage(backPageNum);
      var backHalves = await splitPdfPageIntoHalves(backPage);
      var frontLeftSeq = N - 2 * (k - 1);
      var frontRightSeq = 2 * k - 1;
      var backLeftSeq = 2 * k;
      var backRightSeq = N - (2 * k - 1);
      resultPages[frontLeftSeq] = frontHalves.left;
      resultPages[frontRightSeq] = frontHalves.right;
      resultPages[backLeftSeq] = backHalves.left;
      resultPages[backRightSeq] = backHalves.right;
      logResult("Front (src p." + frontPageNum + ") → seq " + frontLeftSeq + " (L), " + frontRightSeq + " (R). Back (src p." + backPageNum + ") → seq " + backLeftSeq + " (L), " + backRightSeq + " (R).");
    }
    return resultPages;
  }
  function renderReverseImposeGrid(resultPages, N) {
    var grid = document.getElementById("reverse-impose-grid");
    grid.innerHTML = "";
    var commonWidthIn = null, commonHeightIn = null;
    for (var i = 1; i <= N; i++) {
      var entry = resultPages[i];
      var pageDiv = document.createElement("div");
      pageDiv.className = "reverse-impose-page";
      if (entry) {
        var widthIn = entry.widthPt / 72;
        var heightIn = entry.heightPt / 72;
        if (commonWidthIn === null) {
          commonWidthIn = widthIn;
          commonHeightIn = heightIn;
        }
        pageDiv.style.setProperty("--ri-print-width", widthIn + "in");
        pageDiv.style.setProperty("--ri-print-height", heightIn - 0.05 + "in");
        pageDiv.style.aspectRatio = entry.widthPt + " / " + entry.heightPt;
        entry.canvas.style.width = "100%";
        entry.canvas.style.height = "100%";
        pageDiv.appendChild(entry.canvas);
      }
      var label = document.createElement("span");
      label.className = "ri-page-label noprint";
      label.textContent = "Page " + i + " / " + N;
      pageDiv.appendChild(label);
      grid.appendChild(pageDiv);
    }
    setReverseImposePageSize(commonWidthIn, commonHeightIn);
    var footerEl = document.getElementById("preview-footer");
    if (footerEl) {
      footerEl.textContent = "Reverse Impose · " + N + " sequential page(s) reconstructed";
    }
  }

  // apps/ZineArranger/src/loadPdf.js
  function selectFile() {
    logCmd("selectFile()");
    if (document.getElementById("selector").files.length > 0) {
      document.getElementById("zine-scale").innerHTML = "";
      document.getElementById("reverse-impose-grid").innerHTML = "";
      document.getElementById("preview-empty").style.display = "none";
      if (state.isReverseImposeActive) {
        document.getElementById("zine").style.display = "none";
        document.getElementById("reverse-impose-grid").style.display = "flex";
      } else {
        document.getElementById("zine").style.display = "block";
        document.getElementById("reverse-impose-grid").style.display = "none";
      }
      var fl = document.getElementById("selector").files[0];
      logResult('PDF selected: "' + fl.name + '" (' + Math.round(fl.size / 1024) + " KB). Loading...");
      var nms = fl.name.split(".");
      if (nms.length > 1) {
        document.title = nms[0] + "-Printable." + nms[1];
      } else {
        document.title = fl.name + "-Printable.pdf";
      }
      var url = URL.createObjectURL(fl);
      logCmd("pdfjsLib.getDocument(url)");
      const loadingTask = pdfjsLib.getDocument(url);
      (async () => {
        const pdf = await loadingTask.promise;
        var actualPageCount = pdf.numPages;
        logResult("PDF loaded — " + actualPageCount + " page(s) detected.");
        if (state.isReverseImposeActive) {
          logCmd("reverseImposePdf()");
          var resultPages = await reverseImposePdf(pdf, actualPageCount);
          if (resultPages) {
            renderReverseImposeGrid(resultPages, resultPages.length - 1);
            logResult("Done — de-imposed layout ready to print.");
          }
          return;
        }
        var selectedPages = parsePageRange(state.pageRangeSpec, actualPageCount);
        if (selectedPages) {
          logResult("Using " + selectedPages.length + " of " + actualPageCount + " page(s): " + selectedPages.join(", ") + ".");
        } else {
          selectedPages = [];
          for (var sp = 1; sp <= actualPageCount; sp++) selectedPages.push(sp);
        }
        var blankCounts = {};
        state.blankAfterPages.forEach(function(p) {
          blankCounts[p] = (blankCounts[p] || 0) + 1;
        });
        var pdfPageToSlot = new Array(actualPageCount + 1);
        var slotCursor = 0;
        selectedPages.forEach(function(pn) {
          pdfPageToSlot[pn] = slotCursor;
          slotCursor += 1 + (blankCounts[pn] || 0);
        });
        var contentPageCount = slotCursor;
        var needsMidBump = state.blankAfterPages.length == 0 && (state.doubleSided && selectedPages.length % 4 == 0 && selectedPages.length % state.pgmult != 0);
        var midBumper = 0;
        state.pageCount = contentPageCount;
        logCmd("arrangeZineSheets()");
        arrangeZineSheets();
        var blankPages = state.pageCount - contentPageCount;
        if (blankPages > 0) {
          logResult("Auto-padding with " + blankPages + " blank page(s) to reach a multiple of " + state.pgmult + (needsMidBump ? ", placed mid-sheet for double-sided folding." : "."));
        }
        logResult("Total zine layout: " + state.pageCount + " page slot(s) across " + state.pageCount / state.pgmult + " sheet(s).");
        var footerEl = document.getElementById("preview-footer");
        if (footerEl) {
          var scalePct = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sheet-scale")) * 100);
          footerEl.textContent = state.aspectWidth + state.pgunit + " × " + state.aspectHeight + state.pgunit + " · " + scalePct + "% preview scale · " + state.pageCount / state.pgmult + " sheet(s), " + state.pageCount + " pages";
        }
        for (var selIdx = 0; selIdx < selectedPages.length; selIdx++) {
          var i = selectedPages[selIdx];
          const page = await pdf.getPage(i);
          var viewport = page.getViewport({ scale: 1 });
          var scale;
          if (viewport.width / viewport.height >= state.pagerat) {
            scale = state.pageWidth / viewport.width;
          } else {
            scale = state.pageHeight / viewport.height;
          }
          viewport = page.getViewport({ scale });
          const outputScale = 3;
          if (needsMidBump && selIdx + 1 == (state.pageCount - blankPages) / 2 + 1) {
            midBumper = blankPages;
          }
          var slotIndex = pdfPageToSlot[i] + midBumper;
          logCmd("renderPage(" + i + ")");
          logResult(selIdx + 1 + "/" + selectedPages.length + " (PDF page " + i + ") → zine slot " + slotIndex + (state.size == SIZE_QUARTER && state.quarterCopy ? " (+ copy)" : "") + ".");
          const canvas = document.getElementById("p" + slotIndex);
          const context = canvas.getContext("2d");
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = Math.floor(viewport.width) + "px";
          canvas.style.height = Math.floor(viewport.height) + "px";
          const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
          const renderContext = {
            canvasContext: context,
            transform,
            viewport
            /*background: 'rgba(0,0,0,0)',*/
          };
          const renderTask = page.render(renderContext);
          if (state.size == SIZE_QUARTER && state.quarterCopy) {
            const ready = await renderTask.promise;
            const pageB = await pdf.getPage(i);
            var viewportB = page.getViewport({ scale });
            const canvasB = document.getElementById("p" + slotIndex + "b");
            const contextB = canvasB.getContext("2d");
            canvasB.width = Math.floor(viewportB.width * outputScale);
            canvasB.height = Math.floor(viewportB.height * outputScale);
            canvasB.style.width = Math.floor(viewport.width) + "px";
            canvasB.style.height = Math.floor(viewport.height) + "px";
            const renderContextB = {
              canvasContext: contextB,
              transform,
              viewport
            };
            page.render(renderContextB);
          }
        }
        logSys("Done — zine layout ready to print.");
      })();
    }
  }

  // apps/ZineArranger/src/readOptions.js
  function readOptionsIntoState() {
    if (document.getElementById("zs-half").checked) {
      state.size = SIZE_HALF;
    } else if (document.getElementById("zs-qtr").checked) {
      state.size = SIZE_QUARTER;
    } else if (document.getElementById("zs-eighth").checked) {
      state.size = SIZE_EIGHTH;
    } else if (document.getElementById("zs-twlv").checked) {
      state.size = SIZE_12TH;
    } else if (document.getElementById("zs-sxtn").checked) {
      state.size = SIZE_16TH;
    } else if (document.getElementById("zs-twfr").checked) {
      state.size = SIZE_24TH;
    } else if (document.getElementById("zs-thtw").checked) {
      state.size = SIZE_32ND;
    } else if (document.getElementById("zs-thsx").checked) {
      state.size = SIZE_36TH;
    } else if (document.getElementById("zs-frei").checked) {
      state.size = SIZE_48TH;
    } else if (document.getElementById("zs-sxfr").checked) {
      state.size = SIZE_64TH;
    }
    state.doubleSided = document.getElementById("dx-double").checked;
    state.zinePortrait = document.getElementById("ori-portrait").checked;
    state.spineSide = document.getElementById("spine-side").checked;
    state.flipBackCover = document.getElementById("flip-bc").checked;
    state.quarterCopy = document.getElementById("quarter-copy").checked;
    if (document.getElementById("cust-sig-size").checked) {
      document.getElementById("sig-size").style = "display:inline";
      document.getElementById("sig-size-label").style = "display:inline";
      state.sigSize = document.getElementById("sig-size").value;
    } else {
      document.getElementById("sig-size").style = "display:none";
      document.getElementById("sig-size-label").style = "display:none";
      state.sigSize = 0;
    }
    state.guideMargins = document.getElementById("guide-margin").checked;
    state.guideCenter = document.getElementById("guide-center").checked;
    state.guideFolds = document.getElementById("guide-folds").checked;
    state.blankAfterPages = document.getElementById("blank-after-pages").value.split(",").map(function(s) {
      return parseInt(s.trim(), 10);
    }).filter(function(n) {
      return !isNaN(n) && n > 0;
    });
    if (state.blankAfterPages.length > 0) {
      logResult("Manual blank pages requested after PDF page(s): " + state.blankAfterPages.join(", ") + ".");
    }
    state.pageRangeSpec = document.getElementById("page-range").value.trim();
    if (state.pageRangeSpec.length > 0) {
      logResult('Page range requested: "' + state.pageRangeSpec + '".');
    }
  }
  function updateSpecString() {
    state.specsString = SIZE_CHARS[state.size];
    if (state.doubleSided) {
      state.specsString = state.specsString + "2";
    } else {
      state.specsString = state.specsString + "1";
    }
    if (state.zinePortrait) {
      state.specsString = state.specsString + "p";
    } else {
      state.specsString = state.specsString + "l";
    }
    if (state.spineSide) {
      state.specsString = state.specsString + "s";
    } else {
      state.specsString = state.specsString + "t";
    }
    var foldingInsEl = document.getElementById("folding-ins");
    if (foldingInsEl) {
      foldingInsEl.innerHTML = '<a href="folding.html?' + state.specsString + '">Folding Instructions</a>';
    }
  }

  // apps/ZineArranger/src/sheetGrid.js
  var GRIDS = {
    [SIZE_HALF]: { cols: 2, rows: 1 },
    [SIZE_QUARTER]: { cols: 2, rows: 2 },
    [SIZE_EIGHTH]: { cols: 4, rows: 2 },
    [SIZE_12TH]: { cols: 6, rows: 2 },
    [SIZE_16TH]: { cols: 4, rows: 4 },
    [SIZE_24TH]: { cols: 6, rows: 4 },
    [SIZE_32ND]: { cols: 8, rows: 4 },
    [SIZE_36TH]: { cols: 6, rows: 6 },
    [SIZE_48TH]: { cols: 8, rows: 6 },
    [SIZE_64TH]: { cols: 8, rows: 8 }
  };
  function sheetGrid({ size, doubleSided, quarterCopy, zinePortrait }) {
    const { cols, rows } = GRIDS[size];
    const square = cols === rows;
    let pgmult = doubleSided ? cols * rows * 2 : cols * rows;
    if (size === SIZE_HALF) pgmult = 4;
    if (size === SIZE_QUARTER && doubleSided && quarterCopy) pgmult = 4;
    const turnGrid = !square && !zinePortrait;
    return {
      pgmult,
      divHoriz: turnGrid ? rows : cols,
      divVert: turnGrid ? cols : rows,
      pagePortrait: square ? zinePortrait : !zinePortrait
    };
  }

  // apps/ZineArranger/src/sheetSizes.js
  function updateSheetLabels() {
    var lblPcMultEl = document.getElementById("lbl-pc-mult");
    if (lblPcMultEl) {
      lblPcMultEl.innerHTML = "To avoid blank pages at the end, the page count should be a multiple of " + state.pgmult + ".";
    }
    document.getElementById("sig-size-label").innerHTML = "Sheets per signature (" + state.pgmult * state.sigSize + " zine pages/signature)";
  }
  function applySheetSizes() {
    if (state.pagePortrait) {
      document.getElementById("rt-width-label").innerHTML = "Width";
      document.getElementById("rt-height-label").innerHTML = "Height";
      state.aspectWidth = document.getElementById("rt-width").value;
      state.aspectHeight = document.getElementById("rt-height").value;
    } else {
      document.getElementById("rt-width-label").innerHTML = "Height";
      document.getElementById("rt-height-label").innerHTML = "Width";
      state.aspectWidth = document.getElementById("rt-height").value;
      state.aspectHeight = document.getElementById("rt-width").value;
    }
    state.pagerat = state.aspectWidth / state.divHoriz / (state.aspectHeight / state.divVert);
    var scl = state.aspectWidth;
    if (scl == 0) {
      scl = 1;
    }
    while (scl < 1e3) {
      scl *= 2;
    }
    var scl = scl / state.aspectWidth;
    scl = Math.floor(scl, 1);
    state.sheetWidth = scl * state.aspectWidth;
    state.sheetHeight = scl * state.aspectHeight;
    state.pgunit = "in";
    if (document.getElementById("page-mm").checked) {
      state.pgunit = "mm";
    }
    state.pageWidth = Math.floor(state.sheetWidth / state.divHoriz);
    state.pageHeight = Math.floor(state.sheetHeight / state.divVert);
    var rt = document.querySelector(":root");
    rt.style.setProperty("--sheet-width", state.sheetWidth + "px");
    rt.style.setProperty("--sheet-height", state.sheetHeight + "px");
    rt.style.setProperty("--sheet-print-width", state.aspectWidth + state.pgunit);
    rt.style.setProperty("--sheet-print-height", state.aspectHeight + state.pgunit);
    rt.style.setProperty("--page-width", state.pageWidth + "px");
    rt.style.setProperty("--page-height", state.pageHeight + "px");
    rt.style.setProperty("--sheet-scale", getPreviewTargetWidth() / state.sheetWidth);
  }
  function getPreviewTargetWidth() {
    var pane = document.getElementById("workspace-preview-scroll");
    if (pane) {
      var paneWidth = pane.clientWidth;
      if (paneWidth > 0) {
        return Math.min(900, Math.max(200, paneWidth - 48));
      }
    }
    return 550;
  }

  // apps/ZineArranger/src/optionsPanel.js
  function switchOptionsTab(tab) {
    var basicTab = document.getElementById("tab-basic");
    var advTab = document.getElementById("tab-advanced");
    var basicContent = document.getElementById("tab-content-basic");
    var advContent = document.getElementById("tab-content-advanced");
    if (tab === "advanced") {
      advTab.classList.add("active");
      basicTab.classList.remove("active");
      advContent.style.display = "flex";
      basicContent.style.display = "none";
    } else {
      basicTab.classList.add("active");
      advTab.classList.remove("active");
      basicContent.style.display = "flex";
      advContent.style.display = "none";
    }
  }
  function toggleMoreSizes() {
    if (state.showExtraSizes) {
      document.getElementById("extra-sizes").style.display = "none";
      document.getElementById("extra-sizes-button").innerHTML = "More Sizes";
      state.showExtraSizes = false;
    } else {
      document.getElementById("extra-sizes").style.display = "inline";
      document.getElementById("extra-sizes-button").innerHTML = "Fewer Sizes";
      state.showExtraSizes = true;
    }
  }
  function selectEighthSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function selectQuarterSize() {
    document.getElementById("dx-double").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function selectHalfSize() {
    document.getElementById("dx-double").checked = true;
    document.getElementById("spine-side").checked = document.getElementById("ori-portrait").checked;
    refreshSpecs();
  }
  function select12thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function select16thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function select24thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function select32ndSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function select36thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function select48thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function select64thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
  }
  function setPageUSLetter() {
    document.getElementById("page-inches").checked = true;
    document.getElementById("rt-width").value = "8.5";
    document.getElementById("rt-height").value = "11";
    refreshSpecs();
  }
  function setPage11_17() {
    document.getElementById("page-inches").checked = true;
    document.getElementById("rt-width").value = "11";
    document.getElementById("rt-height").value = "17";
    refreshSpecs();
  }
  function setPageA4() {
    document.getElementById("page-mm").checked = true;
    document.getElementById("rt-width").value = "210";
    document.getElementById("rt-height").value = "297";
    refreshSpecs();
  }
  function setPageA3() {
    document.getElementById("page-mm").checked = true;
    document.getElementById("rt-width").value = "297";
    document.getElementById("rt-height").value = "420";
    refreshSpecs();
  }
  function refreshSpecs() {
    logCmd("refreshSpecs()");
    readOptionsIntoState();
    updateSpecString();
    Object.assign(state, sheetGrid(state));
    updateSheetLabels();
    applySheetSizes();
    logResult("Layout settings updated (spec: " + state.specsString + ", " + (state.doubleSided ? "double" : "single") + "-sided).");
    selectFile();
  }
  function toggleReverseImpose() {
    state.isReverseImposeActive = document.getElementById("reverse-impose-toggle").checked;
    logCmd("toggleReverseImpose()");
    var cardsToHide = [
      "opt-zinesize",
      "opt-page-range",
      "opt-blank-pages",
      "opt-duplex",
      "opt-orient",
      "opt-spine",
      "opt-extras",
      "opt-signatures",
      "opt-guides",
      "opt-ratio",
      "opt-page-presets"
    ];
    cardsToHide.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (state.isReverseImposeActive) {
        el.classList.add("ri-hidden");
        el.setAttribute("aria-hidden", "true");
      } else {
        el.classList.remove("ri-hidden");
        el.removeAttribute("aria-hidden");
      }
    });
    var advTab = document.getElementById("tab-advanced");
    if (state.isReverseImposeActive) {
      if (advTab.classList.contains("active")) {
        switchOptionsTab("basic");
      }
      advTab.setAttribute("disabled", "true");
    } else {
      advTab.removeAttribute("disabled");
      setReverseImposePageSize(null, null);
    }
    logResult(state.isReverseImposeActive ? "Reverse Impose enabled — normal imposition controls hidden; the Advanced tab is disabled." : "Reverse Impose disabled — normal imposition controls restored.");
    selectFile();
  }

  // apps/ZineArranger/src/panelResize.js
  var STORAGE_KEY = "zinearranger.settingsPanelWidth";
  var MIN_PANEL = 280;
  var MIN_PREVIEW = 320;
  var KEY_STEP = 16;
  function setUpPanelResize() {
    var handle = document.getElementById("workspace-resizer");
    var body = document.querySelector(".workspace");
    var panel = document.getElementById("workspace-panel");
    if (!handle || !body || !panel) return;
    var root = document.documentElement;
    var current = null;
    function clamp(px) {
      var most = Math.max(MIN_PANEL, body.getBoundingClientRect().width - MIN_PREVIEW);
      return Math.round(Math.min(most, Math.max(MIN_PANEL, px)));
    }
    function refitPreview() {
      window.dispatchEvent(new Event("resize"));
    }
    function apply(px, save) {
      if (px == null) {
        current = null;
        root.style.removeProperty("--md2ebook-sidebar-width");
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
        }
      } else {
        current = clamp(px);
        root.style.setProperty("--md2ebook-sidebar-width", current + "px");
        if (save) {
          try {
            localStorage.setItem(STORAGE_KEY, String(current));
          } catch (e) {
          }
        }
      }
      refitPreview();
    }
    function panelWidth() {
      return panel.getBoundingClientRect().width;
    }
    handle.addEventListener("pointerdown", function(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("is-dragging");
      document.body.style.userSelect = "none";
    });
    handle.addEventListener("pointermove", function(e) {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      apply(body.getBoundingClientRect().right - e.clientX, false);
    });
    function endDrag(e) {
      if (!handle.hasPointerCapture(e.pointerId)) return;
      handle.releasePointerCapture(e.pointerId);
      handle.classList.remove("is-dragging");
      document.body.style.userSelect = "";
      if (current != null) {
        try {
          localStorage.setItem(STORAGE_KEY, String(current));
        } catch (err) {
        }
      }
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    handle.addEventListener("dblclick", function() {
      apply(null);
    });
    handle.addEventListener("keydown", function(e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        apply(panelWidth() + KEY_STEP, true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        apply(panelWidth() - KEY_STEP, true);
      } else if (e.key === "Home") {
        e.preventDefault();
        apply(null);
      }
    });
    var saved = null;
    try {
      saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    } catch (e) {
    }
    if (saved > 0) apply(saved, false);
    window.addEventListener("resize", function() {
      if (current != null && clamp(current) !== current) {
        current = clamp(current);
        root.style.setProperty("--md2ebook-sidebar-width", current + "px");
      }
    });
  }

  // apps/ZineArranger/src/main.js
  logSys("Zine Arranger ready. Select a PDF to begin.");
  warnBeforeLeaving(() => state.pageCount > 0);
  window.addEventListener("resize", function() {
    clearTimeout(state.previewResizeTimer);
    state.previewResizeTimer = setTimeout(function() {
      document.querySelector(":root").style.setProperty("--sheet-scale", getPreviewTargetWidth() / state.sheetWidth);
    }, 100);
  });
  document.getElementById("selector").addEventListener("change", refreshSpecs, false);
  setUpPanelResize();
  refreshSpecs();
  (function setUpZEditorHandoff() {
    function receivePdf(file) {
      var input = document.getElementById("selector");
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    window.addEventListener("message", function(event) {
      var data = event.data;
      if (!data || data.type !== HANDOFF_PDF_MESSAGE || !(data.buffer instanceof ArrayBuffer)) return;
      var file = new File([data.buffer], data.filename || "zine.pdf", { type: "application/pdf" });
      receivePdf(file);
      logSys('Received "' + file.name + '" from ZEditor (' + Math.round(file.size / 1024) + " KB).");
    });
    if (window.opener) {
      var pingCount = 0;
      var pingInterval = setInterval(function() {
        pingCount++;
        try {
          window.opener.postMessage({ type: ARRANGER_READY_MESSAGE }, "*");
        } catch (err) {
          clearInterval(pingInterval);
        }
        if (pingCount >= 15) clearInterval(pingInterval);
      }, 500);
    }
  })();
  Object.assign(window, { clearLog, copyLog, refreshSpecs, select12thSize, select16thSize, select24thSize, select32ndSize, select36thSize, select48thSize, select64thSize, selectEighthSize, selectHalfSize, selectQuarterSize, setPage11_17, setPageA3, setPageA4, setPageUSLetter, switchOptionsTab, toggleLogPanel, toggleMoreSizes, toggleReverseImpose, triggerPrint });
})();
