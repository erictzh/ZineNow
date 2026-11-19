// The Editor tab: the Markdown textarea, its file actions (upload, save, copy) and its formatting
// toolbar (FormatToolbar.jsx) with keyboard shortcuts.

import { applyEdit, blockAt, clampSpaceLines, insertBlockLine, insertLink, setBlock, toggleInline } from "../../editor/format.js";
import { DOCUMENT_INPUT_ACCEPT, DOCUMENT_PICKER_TYPES, documentToMarkdown } from "../../editor/importDocument.js";
import { copyText, pickFile, saveTextFile } from "../../io/filePickers.js";
import { StatusLine } from "../fields.jsx";
import { FormatToolbar } from "./FormatToolbar.jsx";

const { useRef, useState } = React;

// Shortcuts that work while typing in the editor. Ctrl (⌘ on a Mac) plus the key; headings use
// Ctrl+Alt+digit because browsers keep Ctrl+digit for switching tabs.
function shortcutFor(e) {
  if (!(e.ctrlKey || e.metaKey) || (e.getModifierState && e.getModifierState("AltGraph"))) return null;
  const k = e.key.toLowerCase();
  if (e.altKey && !e.shiftKey) {
    const level = { Digit0: "p", Digit1: "h1", Digit2: "h2", Digit3: "h3" }[e.code];
    return level ? ["block", level] : null;
  }
  if (e.altKey) return null;
  if (e.shiftKey) {
    if (k === "x") return ["inline", "strike"];
    const block = { Digit7: "ol", Digit8: "ul", Digit9: "quote" }[e.code];
    return block ? ["block", block] : null;
  }
  return { b: ["inline", "bold"], i: ["inline", "italic"], e: ["inline", "code"], k: ["link"] }[k] || null;
}

// Upload and Save remember their own last-used folder (your documents),
// separate from the settings-file picker's.
const DOCUMENT_PICKER_ID = "md2ebook-document";

// `docStatus`/`spaceLines` live in the Sidebar so they survive switching tabs.
export function EditorTab({ markdown, setMarkdown, docStatus, setDocStatus, spaceLines, setSpaceLines }) {
  const editorTextareaRef = useRef(null);
  const documentFileInputRef = useRef(null);
  const [blockKind, setBlockKind] = useState("p"); // the caret line's kind, for the toolbar
  const errorText = (err) => (err && err.message ? err.message : String(err));

  const refreshBlockKind = () => {
    const el = editorTextareaRef.current;
    if (el) setBlockKind(blockAt(el.value, el.selectionStart));
  };

  // Makes one edit from editor/format.js in the textarea as if it had been typed, so Ctrl+Z undoes
  // it (setting the value through React would wipe the browser's undo history), then selects what
  // the edit says to select.
  function applyToEditor(edit) {
    const el = editorTextareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(edit.from, edit.to);
    let typed = false;
    if (edit.from === edit.to && edit.insert === "") typed = true; // nothing to change
    else {
      try {
        typed = edit.insert === "" ? document.execCommand("delete") : document.execCommand("insertText", false, edit.insert);
      } catch (e) {
        typed = false;
      }
    }
    if (!typed) {
      // A browser without execCommand: set the text directly (no undo for this step). flushSync puts the
      // new text in the textarea before the selection is set, or the browser would clamp it.
      const savedScrollTop = el.scrollTop;
      ReactDOM.flushSync(() => setMarkdown(applyEdit(el.value, edit)));
      el.scrollTop = savedScrollTop;
    }
    el.setSelectionRange(edit.selStart, edit.selEnd);
    refreshBlockKind();
  }

  // Runs one toolbar action (or shortcut) on the editor's current text and selection.
  function runAction(action, arg) {
    const el = editorTextareaRef.current;
    if (!el) return;
    const text = el.value;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    if (action === "inline") applyToEditor(toggleInline(text, s, e, arg));
    else if (action === "block") applyToEditor(setBlock(text, s, e, arg));
    else if (action === "link") applyToEditor(insertLink(text, s, e));
    // A marker line (\toc, \pagebreak, \space{N}) or a divider, on its own line at the caret — see
    // document/markers.js for what each marker does.
    else if (action === "line") applyToEditor(insertBlockLine(text, s, e, arg));
    else if (action === "space") {
      const n = clampSpaceLines(spaceLines);
      setSpaceLines(String(n));
      applyToEditor(insertBlockLine(text, s, e, "\\space{" + n + "}"));
    }
  }

  function handleEditorKeyDown(e) {
    const shortcut = shortcutFor(e);
    if (!shortcut) return;
    e.preventDefault();
    runAction(shortcut[0], shortcut[1]);
  }

  // An import replaces the editor's contents outright, not an insert.
  async function handleImportFile(file) {
    setDocStatus(null);
    const name = (file && file.name) || "document";
    try {
      const converted = await documentToMarkdown(file);
      // As one typed edit, so Ctrl+Z brings back what was there before the import.
      const el = editorTextareaRef.current;
      if (el) {
        applyToEditor({ from: 0, to: el.value.length, insert: converted, selStart: 0, selEnd: 0 });
        el.scrollTop = 0;
      } else {
        setMarkdown(converted);
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
      <div className="flex flex-wrap items-center justify-end gap-1 mb-2">
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
        <input
          ref={documentFileInputRef}
          type="file"
          accept={DOCUMENT_INPUT_ACCEPT}
          onChange={handleDocumentFileSelected}
          className="hidden"
        />
      </div>
      <FormatToolbar blockKind={blockKind} onAction={runAction} spaceLines={spaceLines} setSpaceLines={setSpaceLines} />
      <StatusLine status={docStatus} className="mb-2" />
      <textarea
        ref={editorTextareaRef}
        onKeyDown={handleEditorKeyDown}
        onSelect={refreshBlockKind}
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
