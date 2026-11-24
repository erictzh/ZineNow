## Intro

A **`.znow` file** is a ZEditor project saved as one file: all your pages, every item on them, the PDFs they came from, uploaded fonts, text styles and settings. Open it later, on any computer or tablet, and keep editing exactly where you left off. It is a plain **JSON** text file under the hood, with its own extension so that other programs do not mistake it for an ordinary `.json` file.

## How to use

**Project menu:**
- **Save** (Ctrl+S): the first time it asks where; after that it writes straight back to the same file. **Save As…** (Ctrl+Shift+S) picks a new file. The menu's label says "Saving…" and then "Saved ✓".
- **Load Project** opens a `.znow` file (or you can start from the Welcome screen). **New Project** starts over.
- The **zine title** names the file. Characters Windows and macOS forbid are dropped, and an empty title becomes "zine".
- Where the browser has no Save dialog (Android, Firefox, Safari) the file is **downloaded** instead.
- **Reload** (top bar) reloads the app and keeps your work (see below).
- The browser warns before you close or refresh the tab while there are pages open.

## How it works

### What is inside

The file is one JSON object:

| Field | Contents |
|---|---|
| `version` | 2 (the item list is in stacking order; version 1 files are converted on opening) |
| `title` | the zine title |
| `docs` | every loaded source PDF, as **base64** text |
| `fonts` | uploaded fonts and embedded system fonts the text uses, as base64 |
| `textStyles` | the saved text styles |
| `pages` | each page: size, rotation, filter, items (with pictures inside them as data URLs) |
| `settings` | guides, rulers, page numbers, onion skin, font embedding… |

### Why base64?

JSON can only hold text, but PDFs and fonts are **binary**. **Base64** turns any bytes into text using 64 safe characters: every group of 3 bytes becomes 4 characters. So embedded files grow by about **33%**. That is the price of a single self-contained file.

### Thumbnails are not saved

A page's small preview picture is heavy but can be rebuilt from the rest, so it is dropped when saving (`({ dataUrl, ...rest }) => rest`) and redrawn when the file is opened.

### Opening a project, step by step

1. Read the text and parse the JSON; check there is a `pages` list.
2. Re-open each embedded PDF with pdf.js.
3. Register each embedded font with the browser **before** anything is drawn, so text lays out in the real font and not in a fallback. A damaged font is skipped (the text stays).
4. Rebuild the pages with fresh thumbnails; convert old version-1 files.
5. Find the **highest ids** used (documents, items, groups) so anything new gets a number nobody has.
6. Choose the default size for new blank pages.

### Saving over the same file

Where the browser offers the **File System Access API** (Chrome, Edge), the Save dialog returns a **handle** to the file, which is remembered so the next Save writes to it without asking (the browser may ask once per session for permission). If the file was moved or permission is refused, it falls back to asking where to save, so a save is never lost. On other browsers, every save is a download.

### Reload keeping work

During development the app's code changes, and a reload would lose the document. So **Reload** first saves the project (without undo history) into **IndexedDB**, the browser's own database, which can hold big files and even a file handle (`sessionStorage` holds only a few MB). On start-up the app picks it up once and deletes it; one older than 10 minutes is ignored.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `arrayBufferToBase64` and `base64ToArrayBuffer`

```js file=apps/ZEditor/src/io/base64.js fn=arrayBufferToBase64,base64ToArrayBuffer
```

**The Logic:**
- An **ArrayBuffer** is a block of raw bytes; `new Uint8Array(buf)` is a view that reads it as numbers 0–255.
- `String.fromCharCode` turns byte values into a text string where each character has that code, and `btoa` ("binary to ASCII") converts such text to base64.
- Why the loop in chunks of `0x8000` (32768)? `String.fromCharCode.apply(null, bytes)` passes every byte as a separate **argument**, and a huge array would overflow the call stack and crash. Doing 32 KB at a time avoids it.
- `base64ToArrayBuffer` is the reverse: `atob` decodes to text, and a loop copies each character's code into a byte array (`charCodeAt`).

**Worked example.** Three bytes, the text "Man" (77, 97, 110), become **`TWFu`** (4 characters). One byte, "M", gives **`TQ==`** (padding `=` marks the missing bytes), two bytes "Ma" give **`TWE=`**. A 1 MB PDF (1,000,000 bytes) becomes `ceil(1,000,000 / 3) × 4 =` **1,333,336** characters in the file.

### `serializeProject`

```js file=apps/ZEditor/src/io/projectFile.js fn=serializeProject
```

**The Logic:**
- `docs` collects each loaded PDF as base64. `usedFamilies` is the **set** of font families that some text actually uses (`usedFaces(pages)`), and only those fonts are kept from the font store, so unused uploaded fonts do not bloat the file.
- The embedded system fonts passed in are added unless the exact face (family, bold, italic) is already there.
- The `project` object is assembled; `pages.map(({ dataUrl, ...rest }) => rest)` drops each page's thumbnail by destructuring (the **rest** pattern keeps everything else). `JSON.stringify(project)` turns it into text.

### `readProjectFile`

```js file=apps/ZEditor/src/io/projectFile.js fn=readProjectFile
```

**The Logic:**
- `JSON.parse` turns the text back into an object; a file without a `pages` list throws a friendly error ("That doesn't look like a ZEditor project file").
- For each PDF: base64 to bytes, and `pdfjsLib.getDocument` opens a **copy** (pdf.js may take ownership of the buffer; the original must stay for the next save).
- Fonts: if the identical font is already registered it is skipped; else it is registered (`registerCustomFont`) and stored. `try … catch`: a damaged font is ignored. The `...(bold ? { bold: true } : {})` pieces use the **spread** of a conditional object to add a property only when needed.
- `Promise.all(project.pages.map(async …))` rebuilds all pages **in parallel**: a blank page gets a thumbnail at once, a PDF page's is rendered; `legacyLayerOrder` converts a version-1 item list (below).
- The **highest ids** are found with regular expressions: `/^doc(\d+)$/` matches "doc12" and captures the number; item ids and group ids like "g12" are included, because they come from the same counter (otherwise a new group could reuse an old group's id and the two would behave as one).
- The default size for new blank pages is the first real PDF page's size, else the first page's.

**Worked example.** A project with documents `doc1`, `doc3`, items with ids up to 41, and a group `g57`: `maxDocNum = 3` (the next document is `doc4`), `maxAnnId = max(41, 57) = 57` (the next id is 58). A version-1 file stored items as images, then strokes, then text; `legacyLayerOrder` sorts them with the rank `image 0, stroke 1, text 2` so the order matches how they used to be drawn: images at the bottom, text on top.

### `handleSaveProject`

```js file=apps/ZEditor/src/state/useProject.js fn=handleSaveProject
```

**The Logic:**
- Guards: nothing to save, or already saving, returns at once. `setSavingProject(true)` shows "Saving…".
- If font embedding is on and the browser can read system fonts, the browser's font permission is asked (`ensureFontAccess`: this click is the **user gesture** the browser requires for the question), the fonts are read (`buildEmbeddedFonts`), and a notice reports what was embedded or which fonts could not be.
- `serializeProject` builds the text. If the project already has a file and it is a plain Save, `writeFileHandle` writes back; any failure silently falls through to the Save dialog (an empty `catch`).
- `saveFile(...)` shows the Save dialog (or downloads). The download fallback labels the file as `application/octet-stream`: Android's download manager adds `.json` to files labelled JSON whose names do not end in it, which produced `Zine.znow.json`. The returned handle is remembered.
- `finally` always clears the busy flag, success or failure.

### `saveFile` and `writeFileHandle`

```js file=apps/ZEditor/src/io/fileSave.js fn=saveFile,writeFileHandle
```

**The Logic:** `saveFile` tries `showSaveFilePicker` (the native dialog) with a suggested name and a file-type filter. An `AbortError` means the user closed the dialog: it returns `"cancelled"`, which is not an error. Any other failure falls through to **`downloadBlob`**, which makes a temporary `<a download>` link, clicks it and removes it. `writeFileHandle` first asks for `readwrite` permission (`queryPermission`, then `requestPermission`), and throws a named error if refused. Writing is `createWritable()`, `write(data)`, `close()`.

### `titleToFileName`, `pageImageFileName`, `titleStamp`

```js file=apps/ZEditor/src/model/documentTitle.js fn=titleStamp,titleToFileName,pageImageFileName
```

**The Logic:** `titleToFileName` replaces every run of forbidden characters (`<>:"/\|?*` and control characters) with a space, squeezes repeated spaces, strips trailing dots and spaces (Windows does not allow them), and uses "zine" if nothing is left. `titleStamp` is year (last two digits), month, day, hour, minute, each padded to two digits (`padStart(2, "0")`).

**Worked example (real output).** `"Issue #1: Summer?"` → **`Issue #1 Summer.znow`**; `"  ..."` → **`zine.pdf`**; `"a/b\c  d."` → **`a b c d.pdf`**. `titleStamp` on 24 Nov 2026, 14:05 → **`2611241405`**. Page pictures: `pageImageFileName("Issue 3", 1, 12, ".png")` → **`Issue 3-page-02.png`** (12 pages need two digits so the files sort); with 100 pages the second one is **`…-page-002`**; a one-page zine has no suffix: **`Issue 3.png`**.

### The reload snapshot

```js file=apps/ZEditor/src/io/reloadSnapshot.js fn=run,takeReloadSnapshot
```

**The Logic:** IndexedDB works with **transactions** and callbacks, so `run(mode, action)` wraps it in a **Promise**: open the database, start a transaction on the store, call `action(store)`, and resolve when the transaction completes (`oncomplete`), closing the database. `takeReloadSnapshot` reads the one stored entry, **deletes** it (so it is used once), and returns it only if it is younger than 10 minutes (`Date.now() - snapshot.savedAt <= MAX_AGE_MS`). If storage is blocked (a private window), the `catch` returns `null`: a plain empty start.
