## Intro

**File → Open file…** can read a Microsoft **Word** document (`.docx`) and turn it into Markdown. This page covers the Word route, which is done in **two steps**: Word to HTML (with a library called **mammoth**), then HTML to Markdown (shared with EPUB, see [HTML to Markdown](md2pdf/converters/html-to-markdown)).

## How to use

- File → **Open file…**, pick a `.docx`. The Markdown appears in the editor (Ctrl/⌘ Z restores your old text).
- What carries over well: **headings, paragraphs, bold, italic, lists and tables**; pictures are normally kept inside the text (mammoth embeds them in the HTML).
- What does **not** survive: footnotes, tracked changes (comments and revisions) and embedded objects (charts, equations). Check the result and tidy it by hand.
- The first time you use it, the Word reader is downloaded from a CDN (a public library host), so you need to be online once. If it could not load, a message names the missing library.

## How it works

A `.docx` file is a **ZIP archive** (a folder compressed into one file) full of XML, the text-based format Word uses to describe each paragraph and its style. **Mammoth** unpacks it and converts by **meaning** (this paragraph is "Heading 1", this run is bold), not by looks (this text is 24 pt), so you get clean HTML like `<h1>` and `<strong>`, instead of a copy of Word's formatting.

The HTML is then handed to the same converter EPUB uses ([HTML to Markdown](md2pdf/converters/html-to-markdown)).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `convertDocxToMarkdown`

```js file=apps/Markdown-to-PDF/src/convert/docx.js fn=convertDocxToMarkdown
```

**The Logic:**
- `requireGlobal('mammoth', …)` fetches the library from the page and stops with a clear message if it is missing (below).
- `mammoth.convertToHtml({ arrayBuffer })` starts the conversion. The file's bytes (`arrayBuffer`) were read by [Import a document](md2pdf/editor/import-document). It returns a **Promise**, a placeholder for a result that arrives later.
- `.then(function (result) { … })` says "when the result arrives, do this": `result.value` is the HTML text, passed to `htmlToMarkdown`. The function returns the whole chain, so the caller can `await` the final Markdown.

### `requireGlobal`

```js file=apps/Markdown-to-PDF/src/convert/requireGlobal.js fn=requireGlobal
```

**The Logic:** a library loaded by a `<script>` tag in `index.html` becomes a **global**: a property of `window`. `typeof window[name] === 'undefined'` asks whether it exists; `window[name]` reads a property by a name held in a variable. If missing, a readable `Error` explains *which* library and *why* (no internet the first time, a blocked request, an ad blocker), rather than the cryptic "mammoth is not defined" or "X is not a function".

**Worked example.** Offline on first use, opening a `.docx`: *Word (.docx) import needs the "mammoth" library, which did not load (this app loads it from a CDN, so it needs internet access the first time). Try again once you are online, or reload the page.* The message is shown in the strip above the editor.
