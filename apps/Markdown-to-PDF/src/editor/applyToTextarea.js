// Making an edit from editor/format.js in the editor's <textarea> as if it had been typed.

import { applyEdit } from "./format.js";

// Replaces el's text [edit.from, edit.to) with edit.insert through the browser's own editing
// (execCommand), so it lands on the browser's undo stack and Ctrl+Z undoes it — setting the value
// through React would wipe that history instead. Then selects [edit.selStart, edit.selEnd).
// `setMarkdown` is only used as a fallback, in a browser without execCommand (no undo there).
export function applyToTextarea(el, edit, setMarkdown) {
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
    // flushSync puts the new text in the textarea before the selection is set, or the browser
    // would clamp the selection to the old, shorter text.
    const savedScrollTop = el.scrollTop;
    ReactDOM.flushSync(() => setMarkdown(applyEdit(el.value, edit)));
    el.scrollTop = savedScrollTop;
  }
  el.setSelectionRange(edit.selStart, edit.selEnd);
}

// An edit that replaces the whole text (Open file, Load sample, Clear), caret at the start.
export function replaceAllEdit(el, text) {
  return { from: 0, to: el.value.length, insert: text, selStart: 0, selEnd: 0 };
}
