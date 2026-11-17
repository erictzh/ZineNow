// The Editor tab: the Markdown textarea and its toolbar (upload, save, copy, insert ToC / page break / blank space).

import { DOCUMENT_INPUT_ACCEPT, DOCUMENT_PICKER_TYPES, documentToMarkdown } from "../../editor/importDocument.js";
import { clampSpaceLines, insertStandaloneLine } from "../../editor/insertLine.js";
import { copyText, pickFile, saveTextFile } from "../../io/filePickers.js";
import { StatusLine } from "../fields.jsx";

const { useRef } = React;

// Upload and Save remember their own last-used folder (your documents),
// separate from the settings-file picker's.
const DOCUMENT_PICKER_ID = "md2ebook-document";

// `docStatus`/`spaceLines` live in the Sidebar so they survive switching tabs.
export function EditorTab({ markdown, setMarkdown, docStatus, setDocStatus, spaceLines, setSpaceLines }) {
  const editorTextareaRef = useRef(null);
  const documentFileInputRef = useRef(null);
  const errorText = (err) => (err && err.message ? err.message : String(err));

  // Puts a marker line at the caret (replacing any selection), then puts
  // the caret after it — see document/markers.js for what each marker does.
  function insertLine(line) {
    const el = editorTextareaRef.current;
    // Remember where the editor (and the page) were scrolled: React
    // reassigning the textarea's value, and focus(), both jump the
    // scroll position otherwise.
    const savedScrollTop = el ? el.scrollTop : 0;
    const savedWindowY = window.scrollY;
    const start = el ? el.selectionStart : markdown.length;
    const end = el ? el.selectionEnd : markdown.length;
    const { text, caret } = insertStandaloneLine(markdown, start, end, line);
    // flushSync (not requestAnimationFrame) forces this state update to
    // commit to the real DOM before the restore call below runs. The
    // textarea's value is controlled by React state, and browsers reset
    // a textarea's cursor to the end whenever its value is reassigned —
    // requestAnimationFrame doesn't reliably run *after* React's commit,
    // so the restore could fire while the DOM still had the old text,
    // get clamped short, and then get stomped when React's real commit
    // landed. flushSync removes the race entirely.
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

  // An import replaces the editor's contents outright, not an insert.
  async function handleImportFile(file) {
    setDocStatus(null);
    const name = (file && file.name) || "document";
    try {
      const converted = await documentToMarkdown(file);
      // Same flushSync reasoning as insertLine above — forces the new
      // document to be in the DOM before the textarea is positioned.
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
    e.target.value = ""; // reset so re-selecting the same file still fires onChange
    if (!file) return;
    handleImportFile(file);
  }

  async function handleImportClick() {
    setDocStatus(null);
    const file = await pickFile({ id: DOCUMENT_PICKER_ID, ...DOCUMENT_PICKER_TYPES });
    if (file === "fallback") { if (documentFileInputRef.current) documentFileInputRef.current.click(); return; }
    if (file) await handleImportFile(file);
  }

  // Saves the Markdown source as a .md file — separate from PDF export,
  // and from the Typography tab's Save… (which saves the settings).
  async function handleSaveMarkdown() {
    setDocStatus(null);
    try {
      const result = await saveTextFile(markdown || "", {
        id: DOCUMENT_PICKER_ID, filename: "document.md", mimeType: "text/markdown",
        description: "Markdown file", extensions: [".md"],
      });
      if (!result) return;
      setDocStatus({
        type: "success",
        message: result.saved ? `Saved "${result.saved}".` : `Downloaded "${result.downloaded}" (this browser doesn't support a Save As dialog).`,
      });
    } catch (err) {
      setDocStatus({ type: "error", message: "Could not save the Markdown file." });
    }
  }

  // Copies the raw Markdown source (not rendered HTML).
  async function handleCopyAll() {
    setDocStatus(null);
    try {
      await copyText(markdown || "");
      setDocStatus({ type: "success", message: "Copied the Markdown source to the clipboard." });
    } catch (err) {
      setDocStatus({ type: "error", message: "Could not copy to the clipboard: " + errorText(err) });
    }
  }

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
        <button
          type="button"
          onClick={handleImportClick}
          className="log-btn"
          title="Import a Markdown, Word (.docx), EPUB, or Muse (.muse) file — replaces the editor's contents"
        >
          Upload…
        </button>
        <button type="button" onClick={handleSaveMarkdown} className="log-btn" title="Save the editor's Markdown as a .md file">
          Save…
        </button>
        <button type="button" onClick={handleCopyAll} className="log-btn" title="Copy the Markdown source to the clipboard">
          Copy All
        </button>
        <button
          type="button"
          onClick={() => insertLine("\\toc")}
          className="log-btn"
          title={"Insert a table of contents at the cursor (\\toc) — settings are in the Typography tab"}
        >
          + ToC
        </button>
        <button
          type="button"
          onClick={() => insertLine("\\pagebreak")}
          className="log-btn"
          title={"Insert a manual page break at the cursor (\\pagebreak)"}
        >
          + Page Break
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleInsertSpace}
            className="log-btn"
            title={"Insert empty space at the cursor, N body lines tall (\\space{N}) — room to paste an image into the PDF later"}
          >
            + Blank Space
          </button>
          <input
            type="number"
            min="1"
            max="200"
            value={spaceLines}
            onChange={(e) => setSpaceLines(e.target.value)}
            aria-label="Blank space height in lines"
            title="Height in lines"
            className="w-14 text-[11px]"
          />
          <span className="text-[11px] text-fg-muted">lines</span>
        </div>
        <input
          ref={documentFileInputRef}
          type="file"
          accept={DOCUMENT_INPUT_ACCEPT}
          onChange={handleDocumentFileSelected}
          className="hidden"
        />
      </div>
      <StatusLine status={docStatus} className="mb-2" />
      <textarea
        ref={editorTextareaRef}
        className={
          "md2ebook-editor-textarea flex-1 w-full min-h-[60vh] rounded-md border border-line\n                         bg-ink p-3 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        }
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        spellCheck={false}
        placeholder="# Start writing your Markdown here…"
      />
    </div>
  );
}
