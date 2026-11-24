## Intro

Apps that run in a browser cannot freely write files to your disk. There are two ways to save: the modern **Save As dialog** (the File System Access API, in Chrome and Edge) which lets you choose a folder and re-save into the same file, and the **download**, which every browser supports and which drops a file into your Downloads folder. The shared download helper is the fallback every app uses when the dialog is not available.

## How to use

You see one of two behaviours:
- A normal **Save dialog** where you choose the name and folder (Chrome, Edge). After the first save, one-click **Save** writes back to the same file.
- A message such as *Downloaded "zine.pdf" (this browser doesn't support a Save As dialog)*: the file is in your Downloads folder (Firefox, Safari).

## How it works

A **Blob** is the browser's name for a chunk of file data in memory (with a type). To download one: make a temporary address for it (`URL.createObjectURL(blob)` gives something like `blob:https://…/3f…`), create an invisible link `<a href=that download="name">` and **click it** from code. The browser treats that like a click on a download link. The address is released a second later (`URL.revokeObjectURL`) so the memory is freed, but not before the download has started.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `downloadBlob`

```js file=shared/js/download.js fn=downloadBlob
```

**The Logic:** the `download` attribute tells the browser to save instead of navigating; `document.body.appendChild(a)` is needed by some browsers for the click to work; `a.click()` fires it; the link is removed at once; `setTimeout(…, 1000)` waits one second (1000 milliseconds) before freeing the address.

### The Save As dialog with a download fallback

```js file=apps/Markdown-to-PDF/src/io/filePickers.js fn=saveTextFile,downloadText
```

**The Logic:** `typeof window.showSaveFilePicker !== "function"` is the **feature test** (the dialog does not exist in Firefox or Safari), then straight to the download. With the dialog, `suggestedName` and `types` pre-fill it. Pressing Cancel throws an error named `AbortError`: that is not a failure, so it returns `null`. Any other failure also falls back to a download. The result tells the caller which happened: `{ saved, handle }`, `{ downloaded }` or `null`. The same idea is used by ZEditor ([The .znow file](zeditor/project/znow-file)), where the `handle` lets it save again to the same file.

**Worked example.** Chrome: `saveTextFile("# Hi", { filename: "a.md", … })` shows the dialog; you choose `Documents/notes.md`; result `{ saved: "notes.md", handle }`; the status says *Saved "notes.md".* Firefox: no dialog function, so a download of `a.md` starts; result `{ downloaded: "a.md" }` and the status says *Downloaded "a.md" (this browser doesn't support a Save As dialog).*
