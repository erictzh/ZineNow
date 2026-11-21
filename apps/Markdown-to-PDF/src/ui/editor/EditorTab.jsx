// The Editor tab: the Markdown textarea and its formatting toolbar (FormatToolbar.jsx), with
// keyboard shortcuts. Open / Save / Load sample live in the top bar's File menu (App.jsx).

import { applyToTextarea, replaceAllEdit } from "../../editor/applyToTextarea.js";
import { CODE_LANGUAGES, languageForFile, languageLabel } from "../../editor/codeLanguages.js";
import { blockAt, clampSpaceLines, insertBlockLine, insertCodeBlock, insertLink, setBlock, toggleCodeBlock, toggleInline } from "../../editor/format.js";
import { copyText, pickFile } from "../../io/filePickers.js";
import { StatusLine } from "../fields.jsx";
import { MOD } from "../shortcutKeys.js";
import { FormatToolbar } from "./FormatToolbar.jsx";

const { useState, useRef } = React;

// The code block language picked last, remembered in this browser (a convenience: it starts as JSON
// when storage is blocked or empty).
const CODE_LANG_KEY = "md2pdf.codeLang";
function loadCodeLang() {
  try {
    const v = localStorage.getItem(CODE_LANG_KEY);
    if (v != null) return v;
  } catch (e) {}
  return "json";
}
function saveCodeLang(tag) {
  try {
    localStorage.setItem(CODE_LANG_KEY, tag);
  } catch (e) {}
}

// "From file…": text files only, and not huge ones (a code block of a few thousand lines is already
// many pages).
const CODE_FILE_MAX_BYTES = 512 * 1024;
const CODE_FILE_EXTS = CODE_LANGUAGES.flatMap((l) => l.ext);
const CODE_PICKER = { id: "md2pdf-code-file", description: "Code or text file", accept: { "text/plain": CODE_FILE_EXTS } };

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
    if (k === "e") return ["codeBlock", null]; // null: the language picked last
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
  const [codeLang, setCodeLangState] = useState(loadCodeLang);
  const codeFileInputRef = useRef(null);
  const setCodeLang = (tag) => {
    setCodeLangState(tag);
    saveCodeLang(tag);
  };
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

  // "From file…": the native Open dialog where there is one, else the hidden file input.
  async function handleCodeFile() {
    setDocStatus(null);
    const file = await pickFile(CODE_PICKER);
    if (file === "fallback") {
      if (codeFileInputRef.current) codeFileInputRef.current.click();
      return;
    }
    if (file) await insertCodeFile(file);
  }

  // Puts a picked file's text in at the caret as a code block, its language taken from the extension.
  async function insertCodeFile(file) {
    const el = editorRef.current;
    if (!el) return;
    if (file.size > CODE_FILE_MAX_BYTES) {
      setDocStatus({ type: "error", message: `"${file.name}" is too big for a code block (over ${CODE_FILE_MAX_BYTES / 1024} KB).` });
      return;
    }
    let content;
    try {
      content = await file.text();
    } catch (err) {
      setDocStatus({ type: "error", message: `Could not read "${file.name}": ` + errorText(err) });
      return;
    }
    if (content.includes("\u0000")) {
      setDocStatus({ type: "error", message: `"${file.name}" isn't a text file (a spreadsheet or image can't go in a code block).` });
      return;
    }
    const lang = languageForFile(file.name);
    applyToEditor(insertCodeBlock(el.value, el.selectionStart, el.selectionEnd, content, lang));
    el.focus();
    setDocStatus({ type: "success", message: `Inserted "${file.name}" as a ${lang ? languageLabel(lang) : "plain text"} code block.` });
  }

  function handleCodeFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) insertCodeFile(file);
  }

  // Runs one toolbar action (or shortcut) on the editor's current text and selection.
  function runAction(action, arg) {
    if (action === "codeFile") return handleCodeFile();
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
    else if (action === "codeBlock") {
      const lang = arg == null ? codeLang : arg;
      setCodeLang(lang);
      applyToEditor(toggleCodeBlock(text, s, e, lang));
      el.focus();
    }
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
      <FormatToolbar blockKind={blockKind} fileSave={fileSave} onAction={runAction} spaceLines={spaceLines} setSpaceLines={setSpaceLines} codeLang={codeLang} />
      <input ref={codeFileInputRef} type="file" accept={CODE_FILE_EXTS.join(",")} onChange={handleCodeFileSelected} className="hidden" />
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
