## Intro

An **EPUB** is an e-book file. **Open file…** reads one and turns the whole book into Markdown, with one **page break between chapters**, so a book imported as one document still starts each chapter on a new page.

## How to use

- File → **Open file…**, pick a `.epub`.
- Each chapter is converted in reading order and joined with `\pagebreak` lines ([Markers](md2pdf/building/markers-style-block)). Delete any you do not want.
- A broken or unusual EPUB gives a specific message: *missing META-INF/container.xml* (not a real EPUB), *could not find the content file*, *content file missing from the archive*, or *the reading order is empty*.
- **Pictures are not imported:** an EPUB keeps its images as separate files in the archive, and only each chapter's text structure is read, so image links in the result will not show a picture. Complex layouts and fonts do not carry over either.

## How it works

An EPUB is a ZIP file (opened with a library called **JSZip**) following a fixed recipe:

1. `META-INF/container.xml` says where the **package file** (`.opf`) is, e.g. `OEBPS/content.opf`.
2. The package file has a **manifest**: a list of every file with an `id` and a `href` (path). It also has the **spine**: the order in which chapters are read, as a list of `idref`s that refer to manifest ids.
3. Chapters are **XHTML** files (web pages in strict XML clothing).

So the code reads container → package → manifest (a lookup table `id → path`) → spine (the order) and converts each chapter's page to Markdown.

**Paths are relative to the package file.** If the package is in `OEBPS/`, a chapter listed as `ch1.xhtml` lives at `OEBPS/ch1.xhtml`.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `convertEpubToMarkdown`

```js file=apps/Markdown-to-PDF/src/convert/epub.js fn=convertEpubToMarkdown
```

**The Logic:** the work is a chain of **Promises** (each `.then` runs when the previous step's result is ready; `.async('string')` reads one file in the ZIP as text).
1. **Open the ZIP** (`JSZip.loadAsync`). No `container.xml`? It is not an EPUB: throw.
2. **Parse the XML** with `DOMParser` (the browser's built-in reader that turns XML or HTML text into a tree you can query). `querySelector('rootfile')` finds the element, and `getAttribute('full-path')` reads its path.
3. `opfDir`: the folder part of that path (everything up to and including the last `/`), or `''` if the file is at the top.
4. **Manifest:** `manifest > item` selects the items; a plain object `manifest[id] = href` is the lookup table.
5. **Spine:** for each `spine > itemref`, look up its `idref` in the manifest and add the full path `opfDir + href` to the reading list. An empty list is an error.
6. **Chapters:** `spinePaths.map(…)` starts reading every chapter at once. A file is looked up by its path, or by its **decoded** path (`decodeURIComponent` turns `%20` back into a space). A missing file gives an empty chapter. A chapter is parsed as `text/html` (more forgiving than strict XML for sloppy books) and its `body.innerHTML` goes through `htmlToMarkdown`, then `.trim()`.
7. `Promise.all(...)` waits for all chapters **and keeps their order**. `.filter(Boolean)` drops empty ones (an empty string counts as false). `.join('\n\n' + PAGE_BREAK_MARKER + '\n\n')` puts a `\pagebreak` between chapters.

**Worked example.** `container.xml` points to `OEBPS/content.opf`, so `opfDir = "OEBPS/"` (the slice up to index of the last `/` plus 1). The manifest holds `c1 → ch1.xhtml`, `c2 → ch2.xhtml`; the spine lists `c1, c2`. Reading list: `OEBPS/ch1.xhtml`, `OEBPS/ch2.xhtml`. If chapter 1 gives `# One\n\nText` and chapter 2 `# Two`, the result is:

```
# One

Text

\pagebreak

# Two
```
