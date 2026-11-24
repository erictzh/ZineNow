## Intro

You are not limited to typing Markdown. **File → Open file…** brings in a **Markdown**, **plain text**, **Word (.docx)**, **EPUB** or **Muse** file and turns it into Markdown in the editor, ready to be typeset.

## How to use

- **File → Open file…** (Ctrl/⌘ O), then pick a file: `.md`, `.markdown`, `.txt`, `.docx`, `.epub` or `.muse`.
- It **replaces** the editor's text. **Ctrl/⌘ Z** brings the old text back. The strip above the editor says what was opened.
- Pictures in a Word file are normally kept inside the text; an EPUB's pictures are not imported (see [EPUB](md2pdf/converters/epub)). You can add pictures yourself as on [Dropped pictures](md2pdf/editor/dropped-pictures).
- After you have **Saved as Markdown**, **Save** writes back to the same file with one click; opening another document forgets that file, so you can never overwrite the old file with a different document by accident.
- A file of another type gives a clear message listing the supported ones.

## How it works

### Choosing the converter by the file's ending

Everything funnels through one function. It looks at the **file name's ending** (the part after the last dot, lower-cased) and sends the file to the right reader: text-based Markdown and plain text need **no conversion**; Muse, Word and EPUB are converted ([Converters](md2pdf/converters/docx)). Anything else throws an error that becomes the message.

### Two ways to open the dialog

Chrome and Edge have a **native open dialog** (`showOpenFilePicker`) that remembers the folder you used last. Firefox and Safari do not, so a hidden `<input type="file">` is clicked instead. `pickFile` tells the app which: it returns the file, `null` (you closed the dialog), or the word `"fallback"` (use the hidden input).

### Replacing the text so it can be undone

The old text is replaced through the same "typing" mechanism the toolbar uses ([Format toolbar](md2pdf/editor/format-toolbar)), so Ctrl+Z is a normal undo. The editor is switched on first, so the text being replaced is the one on screen.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `documentToMarkdown`

```js file=apps/Markdown-to-PDF/src/editor/importDocument.js fn=documentToMarkdown
```

**The Logic:**
- `file && file.name` guards against being given nothing; `"document"` is the fallback name.
- `name.lastIndexOf(".")` is the position of the last dot, or −1 if none. `dot > -1 ? name.slice(dot + 1).toLowerCase() : ""` reads "if there is a dot, the text after it in lower case, otherwise nothing". Lower-casing makes `Report.DOCX` work.
- `file.text()` reads the file as text; `file.arrayBuffer()` reads it as raw **bytes**. Word and EPUB files are really **ZIP archives** (a folder of files squeezed into one), so they need the bytes, not text.
- `await` waits for the (asynchronous) reading to finish. Any unknown ending throws an `Error` whose message lists what is supported; the caller shows it in the strip.

**Worked example.** `"My Notes.MD"` → ending `md` → returned as text. `"book.epub"` → bytes handed to the EPUB converter. `"table.xlsx"` → `Unsupported file type ".xlsx" — supported: .md, .txt, .muse, .docx, .epub.`. `"README"` (no dot) → ending is `""` → the message shows `".?"`.

### `pickFile`

```js file=apps/Markdown-to-PDF/src/io/filePickers.js fn=pickFile
```

**The Logic:** if the browser has no `showOpenFilePicker`, say `"fallback"` at once. Otherwise open the dialog (`id` makes the browser remember a folder for this particular use, and `types` filters the list). `AbortError` is what the browser throws when you press Cancel: that is not an error, so return `null`. Any other failure also falls back to the hidden input.

### `handleImportFile` (what happens after picking)

```js file=apps/Markdown-to-PDF/src/ui/App.jsx fn=handleImportFile,handleOpenFile
```

**The Logic:** it clears the old message, converts the file, forgets the one-click-save file (`setSavedFile(null)`), replaces the text (`replaceAllText`) and shows a success message, or an error message with the reason. The file input fallback (`handleDocumentFileSelected`) resets its value after each pick, so choosing the **same file again** still counts as a change.
