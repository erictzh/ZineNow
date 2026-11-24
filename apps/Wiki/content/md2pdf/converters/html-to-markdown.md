## Intro

Word files and EPUB chapters both arrive as **HTML**, the language of web pages. This tiny shared step turns HTML into **Markdown**, using a library called **Turndown**, so the rest of the app only has to deal with one format.

## How to use

You do not call it yourself; it runs when you open a `.docx` or `.epub` ([Word](md2pdf/converters/docx), [EPUB](md2pdf/converters/epub)).

The output style is fixed:
- headings written with `#` marks (called "ATX" style), not underlines;
- bullet lists with `-`;
- code blocks **fenced** with backticks, not indented.

## How it works

Turndown walks through the HTML tree, **element by element**, and writes the Markdown that corresponds to each: `<h2>` becomes `## `, `<strong>` becomes `**…**`, `<ul><li>` becomes `- `, a link becomes `[text](url)`, `<pre><code>` becomes a fenced block. Elements it does not know are kept as their text.

The service object is created from a configuration with three options.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `htmlToMarkdown`

```js file=apps/Markdown-to-PDF/src/convert/htmlToMarkdown.js fn=htmlToMarkdown
```

**The Logic:** `requireGlobal` makes sure Turndown loaded. `new TurndownService({ … })` creates a converter with three options: `headingStyle: 'atx'` (the `#` style), `bulletListMarker: '-'` and `codeBlockStyle: 'fenced'`. `td.turndown(html || '')` converts. The `|| ''` means "an empty text if there is no HTML", so `null` does not crash it.

**Worked example.** The exact text is Turndown's own, which this wiki's checks do not run, so this is its *typical* output from its documented defaults, not a checked result. `<h1>Title</h1><p>A <strong>bold</strong> and <em>soft</em> <a href="http://x.org">link</a></p><ul><li>one</li><li>two</li></ul>` becomes:

```
# Title

A **bold** and _soft_ [link](http://x.org)

-   one
-   two
```

Turndown typically writes italics as `_soft_` and pads list items with spaces after the bullet. Both are valid Markdown that this app displays the same way.
