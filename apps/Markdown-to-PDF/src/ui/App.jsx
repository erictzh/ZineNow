// The app: Markdown text and settings state, export and hand-off, and the page layout.

import { warnBeforeLeaving } from "../../../../shared/js/leaveWarning.js";
import { sendPdfToZineArranger } from "../../../../shared/js/zineArrangerHandoff.js";
import { exportToPdf } from "../export/printExport.js";
import { renderRasterizationDocument } from "../export/rasterDocument.js";
import { PAPER_SIZES } from "../settings/defaults.js";
import { BOOLEAN_CONFIG_KEYS, DEFAULT_FONT_OPTIONS, INITIAL_CONFIG, SAMPLE_MARKDOWN } from "../settings/initialConfig.js";
import { Header } from "./Header.jsx";
import { PanelResizer } from "./PanelResizer.jsx";
import { PreviewCanvas } from "./PreviewCanvas.jsx";
import { Sidebar } from "./Sidebar.jsx";
const { useEffect, useState, useRef, useCallback } = React;

/* ==========================================================================
   Root App component
   ========================================================================== */
export function App() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [activeTab, setActiveTab] = useState("editor");
  const [fontOptions, setFontOptions] = useState(DEFAULT_FONT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [isSendingToArranger, setIsSendingToArranger] = useState(false);
  const bodyRef = useRef(null); // the panel and the preview side by side (for the draggable line between them)
  // Refreshing or closing the tab asks first once the text is your own (not the sample, not empty).
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;
  useEffect(() => { warnBeforeLeaving(() => markdownRef.current.trim() !== "" && markdownRef.current !== SAMPLE_MARKDOWN); }, []);
  // { headingId: pageNumber } for the contents list, as measured by the
  // preview once it finishes laying out pages; handed to the PDF export.
  const tocPagesRef = useRef(null);
  const handleTocPages = useCallback((map) => {
    tocPagesRef.current = map;
  }, []);
  const updateConfig = useCallback((key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);
  // Merges a config object loaded from a JSON file (via Sidebar's "Open…"
  // button) into the current settings. Only known fields are copied over
  // — anything extra/unrecognized in the file is ignored rather than
  // polluting state — and each value is coerced to the type its control
  // expects (every text/select field is a string; pageNumbersEnabled is
  // a real boolean for the checkbox), so a hand-edited file with, say, a
  // bare JSON number instead of a string still works correctly.
  const applyConfig = useCallback((loaded) => {
    // Older config files had a single `headingTextAlign` for all
    // headings; spread it to H1–H3 unless they're set individually.
    if (loaded && loaded.headingTextAlign) {
      loaded = {
        ...loaded,
      };
      ["h1TextAlign", "h2TextAlign", "h3TextAlign"].forEach((k) => {
        if (!loaded[k]) loaded[k] = loaded.headingTextAlign;
      });
    }
    setConfig((prev) => {
      const next = {
        ...prev,
      };
      Object.keys(prev).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(loaded, key)) return;
        const value = loaded[key];
        if (BOOLEAN_CONFIG_KEYS.includes(key)) {
          next[key] = typeof value === "string" ? !/^(false|0|no|off|)$/i.test(value.trim()) : Boolean(value);
        } else {
          next[key] = value === null || value === undefined ? "" : String(value);
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
    const slug = match[1]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
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
          filename: deriveFilename(markdown),
        },
        {
          tocPages: tocPagesRef.current,
        },
      );
    } catch (err) {
      setExportError((err && err.message) || "Something went wrong while opening the print dialog.");
    } finally {
      setIsExporting(false);
    }
  }
  // Skips the manual export-then-reopen round trip, same idea as
  // ZEditor's own "Send to ZineArranger": opens ZineArranger in a new
  // tab, waits for its "ready" ping, and hands it a real PDF — built
  // here by rendering the document into a hidden, Paged.js-paginated
  // iframe (renderRasterizationDocument) and rasterizing each physical
  // page, since normal export (handleExport above) never produces PDF
  // bytes in JS to send (see the note on exportToPdf in
  // export/rasterDocument.js). ZineArranger then feeds the bytes into its own
  // file input, exactly as if the user had picked the file themselves.
  async function handleSendToZineArranger() {
    if (isSendingToArranger) return;
    setExportError(null);
    setIsSendingToArranger(true);
    let iframe = null;
    // sendPdfToZineArranger opens the tab and starts listening for its
    // "ready" ping before calling this, so the ping can't be missed while
    // pages are still being rendered/rasterized here.
    async function buildBytes() {
      const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
      const DPI = 96;
      const rasterResult = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          window.removeEventListener("message", onRasterMessage);
          reject(new Error("Rendering the document for export timed out."));
        }, 60000);
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
          if (!Array.isArray(data.images)) return; // not the final message yet
          clearTimeout(timeoutId);
          window.removeEventListener("message", onRasterMessage);
          resolve(data);
        }
        window.addEventListener("message", onRasterMessage);
        // Unlike the live preview's iframe, this one needs
        // allow-same-origin alongside allow-scripts — confirmed
        // html2canvas hangs indefinitely without it. That's safe
        // here specifically because renderRasterizationDocument
        // sanitizes the rendered HTML with DOMPurify first (see
        // its comment in export/printExport.js), which is what actually
        // keeps a smuggled <script> in pasted raw HTML from
        // reaching out to this app, not the sandbox by itself.
        // Positioned off-page rather than sized to 0 (needs real
        // pixel dimensions for Paged.js to lay pages out against)
        // — harmless, since that positioning has no bearing on
        // the html2canvas capture happening inside the iframe's
        // own separate document.
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
          height: pageHeightPts,
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
  return (
    <div className="md2ebook-app">
      <Header
        onLoadSample={handleLoadSample}
        onClear={handleClear}
        onExport={handleExport}
        isExporting={isExporting}
        onSendToZineArranger={handleSendToZineArranger}
        isSendingToArranger={isSendingToArranger}
      />
      {exportError ? (
        <div className="md2ebook-no-print flex-none bg-red-950/40 border-b border-red-900 text-red-300 text-xs px-5 py-2 flex items-center justify-between">
          <span>
            {"PDF export failed: "}
            {exportError}
          </span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-red-400 hover:text-red-300 font-medium ml-4 bg-transparent border-0 p-0"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="md2ebook-body" ref={bodyRef}>
        <PreviewCanvas markdown={markdown} config={config} onTocPages={handleTocPages} />
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          markdown={markdown}
          setMarkdown={setMarkdown}
          config={config}
          updateConfig={updateConfig}
          applyConfig={applyConfig}
          fontOptions={fontOptions}
          setFontOptions={setFontOptions}
          resizer={<PanelResizer bodyRef={bodyRef} />}
        />
      </div>
    </div>
  );
}
