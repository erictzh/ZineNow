## Intro

Your Markdown is only text with light markers. Before it can be laid out on pages, it has to become **HTML**, the language web pages (and browser printing) are made of. This page follows the road from the text in the editor to the finished document: the one function that assembles it, `buildDocumentParts`.

## How to use

You do nothing: it happens on every keystroke or setting change, and the preview updates. Things worth knowing:
- Markdown is read with the **GitHub flavour** (`gfm`): tables, task lists, strikethrough and fenced code blocks work. A single line break inside a paragraph does **not** start a new line (`breaks: false`), as in normal Markdown; leave a blank line for a new paragraph.
- You can paste raw **HTML** into the text; it is passed through.
- If the Markdown library failed to load (offline on first visit), the document shows your raw text in a plain block instead of crashing.

## How it works

The assembly line has five steps:

1. **Normalise the settings** (`normalizeConfig`): every blank or odd Typography box becomes a clean value ([Page](md2pdf/typography/page)).
2. **Write the stylesheet** (`generateStyleBlock`): the CSS for those settings ([Markers and the style block](md2pdf/building/markers-style-block)).
3. **Swap the editor's markers** (`\pagebreak`, `\toc`, `\space{N}`) for HTML placeholders *before* the Markdown is read.
4. **Convert Markdown to HTML** with the library called **marked**.
5. **Post-process the HTML**: fill the table of contents in ([Table of contents generation](md2pdf/building/toc-generation)) and colour the code blocks ([Code blocks](md2pdf/typography/code-blocks)).

The result is an object with four parts: the normalised settings, the paper, the style text and the body HTML. Both the live preview and the PDF export call this same function, which is why **the preview and the PDF cannot drift apart**.

> **Tip** HTML is made of **tags**: `<p>…</p>` is a paragraph, `<h1>…</h1>` a heading, `<strong>` bold. Markdown `**hi**` becomes `<strong>hi</strong>`.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `buildDocumentParts`

```js file=apps/Markdown-to-PDF/src/document/buildDocument.js fn=buildDocumentParts
```

**The Logic:**
- `PAPER_SIZES[normalized.paperSize] || PAPER_SIZES[DEFAULT_PAPER_KEY]` picks the paper, with A5 as the safety net. (`a || b` returns `a` unless it is empty.)
- `typeof window.marked !== 'undefined'` asks whether the Markdown library exists. In `try { … } catch (e) {}`, the code attempts to set its options and silently carries on if that fails: older versions differ.
- The conversion is **one line of nested calls**, read from the inside out: `applyPageBreakMarkers(markdownText || '')` swaps the markers (an empty text if there is none); `markedFn(…)` converts to HTML; `applyToc(…)` replaces the contents placeholder with a real list; and, only if highlighting is on, `highlightCodeBlocks` colours code.
- `options && options.tocPages` means "the page-number map, if one was given": it is only given when exporting.
- The `else` branch is the defensive fallback: `escapeHtml` makes the text safe to show (below).

**Worked example.** Markdown `# Hi\n\n**bold** and *it*` becomes `<h1>Hi</h1>\n<p><strong>bold</strong> and <em>it</em></p>`. With A5 selected, `paper` is `{ widthIn: 5.83, heightIn: 8.27 }`. With the library missing, `bodyHtml` is `<pre># Hi\n\n**bold** and *it*</pre>`.

### `escapeHtml`

```js file=apps/Markdown-to-PDF/src/document/html.js fn=escapeHtml
```

**The Logic:** HTML gives some characters a job: `<` starts a tag, `&` starts an entity, quotes end attribute values. To show them as plain characters they must be written as **entities**: `&lt;` `&amp;` `&quot;`. `/&/g` is a **regular expression** (a text pattern) that matches every `&` (`g` = all matches). The `&` must be replaced **first**; otherwise the `&` inside `&lt;` would itself be replaced.

**Worked example.** `escapeHtml('a < b & "c"')` → `a &lt; b &amp; &quot;c&quot;`. Used for the contents title, so a title of `Contents <1>` is displayed literally rather than being read as a tag.
