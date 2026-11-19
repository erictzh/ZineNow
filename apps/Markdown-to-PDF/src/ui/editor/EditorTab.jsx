// The Editor tab: the Markdown textarea and its formatting toolbar (FormatToolbar.jsx), with
// keyboard shortcuts. Open / Save / Load sample live in the top bar's File menu (App.jsx).

import { applyToTextarea, replaceAllEdit } from "../../editor/applyToTextarea.js";
import { blockAt, clampSpaceLines, insertBlockLine, insertLink, setBlock, toggleInline } from "../../editor/format.js";
import { copyText } from "../../io/filePickers.js";
import { StatusLine } from "../fields.jsx";
import { MOD } from "../shortcutKeys.js";
import { FormatToolbar } from "./FormatToolbar.jsx";

const { useState } = React;

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

// `editorRef` is App's handle on the textarea (the File menu edits it too); `docStatus` lives in App
// and `spaceLines` in the Sidebar, so both survive switching tabs. `fileSave` ({ name, unsaved,
// onSave, onSaveAs }) drives the toolbar's Save / Save As buttons; `name` is the .md file Save
// writes back to, or null until Save As has picked one.
export function EditorTab({ markdown, setMarkdown, editorRef, fileSave, docStatus, setDocStatus, spaceLines, setSpaceLines }) {
  const [blockKind, setBlockKind] = useState("p"); // the caret line's kind, for the toolbar
  const errorText = (err) => (err && err.message ? err.message : String(err));

  const refreshBlockKind = () => {
    const el = editorRef.current;
    if (el) setBlockKind(blockAt(el.value, el.selectionStart));
  };

  // Makes one edit from editor/format.js as if typed, so Ctrl+Z undoes it.
  function applyToEditor(edit) {
    const el = editorRef.current;
    if (!el) return;
    applyToTextarea(el, edit, setMarkdown);
    refreshBlockKind();
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

  // Empties the editor as one typed edit, so Ctrl+Z brings the text back (no "are you sure?").
  function handleClear() {
    const el = editorRef.current;
    if (!el || el.value === "") return;
    applyToEditor(replaceAllEdit(el, ""));
    setDocStatus({ type: "success", message: `Cleared the editor. ${MOD}Z brings the text back.` });
  }

  // Runs one toolbar action (or shortcut) on the editor's current text and selection.
  function runAction(action, arg) {
    if (action === "save") return fileSave.onSave();
    if (action === "saveAs") return fileSave.onSaveAs();
    if (action === "copy") return handleCopyAll();
    if (action === "clear") return handleClear();
    const el = editorRef.current;
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

  return (
    <div className="h-full flex flex-col p-3">
      <FormatToolbar blockKind={blockKind} fileSave={fileSave} onAction={runAction} spaceLines={spaceLines} setSpaceLines={setSpaceLines} />
      <StatusLine status={docStatus} className="mb-2" />
      <textarea
        ref={editorRef}
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
