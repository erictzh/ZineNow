// The app: Markdown text and settings state, export and hand-off, and the page layout.

import { warnBeforeLeaving } from "../../../../shared/js/leaveWarning.js";
import { sendPdfToZineArranger } from "../../../../shared/js/zineArrangerHandoff.js";
import { applyToTextarea, replaceAllEdit } from "../editor/applyToTextarea.js";
import { DOCUMENT_INPUT_ACCEPT, DOCUMENT_PICKER_TYPES, documentToMarkdown } from "../editor/importDocument.js";
import { pickFile, saveTextFile, writeTextToHandle } from "../io/filePickers.js";
import { exportToPdf } from "../export/printExport.js";
import { renderRasterizationDocument } from "../export/rasterDocument.js";
import { PAPER_SIZES } from "../settings/defaults.js";
import { BOOLEAN_CONFIG_KEYS, DEFAULT_FONT_OPTIONS, INITIAL_CONFIG, SAMPLE_MARKDOWN } from "../settings/initialConfig.js";
import { Header } from "./Header.jsx";
import { PanelResizer } from "./PanelResizer.jsx";
import { PreviewCanvas } from "./PreviewCanvas.jsx";
import { MOD } from "./shortcutKeys.js";
import { Sidebar } from "./Sidebar.jsx";
const { useEffect, useState, useRef, useCallback } = React;

// Open and Save remember their own last-used folder (your documents), separate from the
// settings-file picker's.
const DOCUMENT_PICKER_ID = "md2ebook-document";

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
  /* ---- File menu: open, save, sample ---------------------------------- */
  // Shown above the editor; kept here so it survives switching tabs.
  const [docStatus, setDocStatus] = useState(null); // { type: 'success'|'error', message }
  const editorRef = useRef(null); // the editor's <textarea>, while the Editor tab is showing
  const documentFileInputRef = useRef(null);
  const errorText = (err) => (err && err.message ? err.message : String(err));

  // Replaces the whole text as one typed edit, so Ctrl+Z brings the old text back. Switches to the
  // Editor tab first, so the text being replaced is on screen (and the textarea exists to edit).
  function replaceAllText(text) {
    if (activeTab !== "editor") ReactDOM.flushSync(() => setActiveTab("editor"));
    const el = editorRef.current;
    if (!el) {
      setMarkdown(text);
      return;
    }
    applyToTextarea(el, replaceAllEdit(el, text), setMarkdown);
    el.scrollTop = 0;
  }

  // The .md file last saved with Save as Markdown…, which one-click Save writes back to:
  // { handle, name, text } where text is what was last written (to tell if there are unsaved
  // changes). Forgotten when another document replaces the text (Open file, Load sample), so a
  // one-click Save can't overwrite the old file with a different document.
  const [savedFile, setSavedFile] = useState(null);

  function handleLoadSample() {
    setDocStatus(null);
    setSavedFile(null);
    replaceAllText(SAMPLE_MARKDOWN);
  }

  async function handleImportFile(file) {
    setDocStatus(null);
    const name = (file && file.name) || "document";
    try {
      const text = await documentToMarkdown(file);
      setSavedFile(null);
      replaceAllText(text);
      setDocStatus({ type: "success", message: `Opened "${name}". ${MOD}Z brings back the text it replaced.` });
    } catch (err) {
      setDocStatus({ type: "error", message: "Could not open that file: " + errorText(err) });
    }
  }
  function handleDocumentFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // reset so picking the same file again still fires onChange
    if (file) handleImportFile(file);
  }
  async function handleOpenFile() {
    setDocStatus(null);
    const file = await pickFile({ id: DOCUMENT_PICKER_ID, ...DOCUMENT_PICKER_TYPES });
    if (file === "fallback") {
      if (documentFileInputRef.current) documentFileInputRef.current.click();
      return;
    }
    if (file) await handleImportFile(file);
  }

  // Saves the Markdown source as a .md file — separate from PDF export, and from the Typography
  // tab's Save… (which saves the settings).
  async function handleSaveMarkdown() {
    setDocStatus(null);
    try {
      const text = markdownRef.current || "";
      const result = await saveTextFile(text, {
        id: DOCUMENT_PICKER_ID, filename: deriveFilename(markdownRef.current).replace(/\.pdf$/, ".md"), mimeType: "text/markdown",
        description: "Markdown file", extensions: [".md"],
      });
      if (!result) return;
      // Only a real file (not a download) can be saved back to with one click.
      setSavedFile(result.handle ? { handle: result.handle, name: result.saved, text } : null);
      setDocStatus({
        type: "success",
        message: result.saved ? `Saved "${result.saved}".` : `Downloaded "${result.downloaded}" (this browser doesn't support a Save As dialog).`,
      });
    } catch (err) {
      setDocStatus({ type: "error", message: "Could not save the Markdown file." });
    }
  }

  // One-click Save: writes the text back over the file last saved with Save as Markdown…, with no
  // dialog. Without such a file yet, it falls back to Save as Markdown….
  async function handleQuickSave() {
    if (!savedFile) return handleSaveMarkdown();
    setDocStatus(null);
    const text = markdownRef.current || "";
    try {
      await writeTextToHandle(savedFile.handle, text);
      setSavedFile({ ...savedFile, text });
      setDocStatus({ type: "success", message: `Saved "${savedFile.name}".` });
    } catch (err) {
      setDocStatus({ type: "error", message: `Could not save "${savedFile.name}": ${errorText(err)} Use File → Save as Markdown… to pick the file again.` });
    }
  }

  // Ctrl+O / Ctrl+S / Ctrl+Shift+S (⌘ on a Mac) anywhere in the app, instead of the browser's own
  // open/save page.
  const fileShortcutsRef = useRef(null);
  fileShortcutsRef.current = { o: handleOpenFile, s: handleQuickSave, "shift+s": handleSaveMarkdown };
  useEffect(() => {
    function onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const action = fileShortcutsRef.current[(e.shiftKey ? "shift+" : "") + e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      action();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
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
        onOpenFile={handleOpenFile}
        onSaveMarkdown={handleSaveMarkdown}
        onQuickSave={handleQuickSave}
        savedFileName={savedFile ? savedFile.name : null}
        onLoadSample={handleLoadSample}
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
        <PreviewCanvas markdown={markdown} config={config} onTocPages={handleTocPages} onPaperSizeChange={(v) => updateConfig("paperSize", v)} />
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          markdown={markdown}
          setMarkdown={setMarkdown}
          editorRef={editorRef}
          fileSave={{
            name: savedFile ? savedFile.name : null,
            unsaved: savedFile ? markdown !== savedFile.text : false,
            onSave: handleQuickSave,
            onSaveAs: handleSaveMarkdown,
          }}
          docStatus={docStatus}
          setDocStatus={setDocStatus}
          config={config}
          updateConfig={updateConfig}
          applyConfig={applyConfig}
          fontOptions={fontOptions}
          setFontOptions={setFontOptions}
          resizer={<PanelResizer bodyRef={bodyRef} />}
        />
      </div>
      {/* Open file's fallback for browsers without a file-open dialog API. */}
      <input ref={documentFileInputRef} type="file" accept={DOCUMENT_INPUT_ACCEPT} onChange={handleDocumentFileSelected} className="hidden" />
    </div>
  );
}
