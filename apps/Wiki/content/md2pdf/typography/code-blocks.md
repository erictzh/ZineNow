## Intro

A **fenced code block** is code in your Markdown between two lines of backticks. In the PDF it appears on a dark background in a monospaced font. With **Colour code by its language** on (the default), the parts of the code (keywords, strings, numbers, comments) are coloured, which is called **syntax highlighting**.

## How to use

- Write a block like ```` ```json … ``` ````, or use the **{ }** button ([Code language list](md2pdf/editor/code-languages)).
- In **Typography → Code Blocks**, switch **Colour code by its language** on or off. Blocks without a language, or with a language the colourer does not know, stay plain.
- Long lines **wrap** instead of running off the page (a PDF has no scroll bar), keeping their indentation. A block is kept together on one page where it can (`break-inside: avoid`).
- Inline code `like this` gets a light grey box.

## How it works

The Markdown reader (marked) turns a fenced block into `<pre><code class="language-json">…</code></pre>`. The highlighter is a library called **Prism** (loaded from a CDN in the page). It **tokenises** the code: it splits it into labelled pieces ("this is a string", "this is a keyword") by following a **grammar**, a set of patterns for that language. Each piece is wrapped in `<span class="token string">`. CSS then colours each token class.

The colours were chosen for the dark background: comments grey italic, strings green, numbers orange, keywords purple, functions yellow, operators pink, and so on, and `print-color-adjust: exact` forces them to appear in the PDF.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `highlightCodeBlocks`

```js file=apps/Markdown-to-PDF/src/document/highlight.js fn=unescapeHtml,highlightCodeBlocks
```

**The Logic:**
- If Prism is not loaded (offline, say), the HTML is returned unchanged: no colour but no break.
- `html.replace(regex, function)` finds every match of a pattern and replaces it with what the function returns. The pattern `<pre><code class="language-([^"\s]+)">([\s\S]*?)<\/code><\/pre>` has two **capture groups**: the language word (anything but quote or space) and the body (`[\s\S]*?` means "any characters, including newlines, as few as needed").
- The Markdown reader **escapes** `<` as `&lt;` and so on in code; Prism wants real text, so `unescapeHtml` undoes the five replacements (`&amp;` last, so `&amp;lt;` becomes `&lt;` rather than `<`). Prism escapes its own output.
- An unknown language (`Prism.languages[key]` undefined), or any error, returns the original block `all` untouched. Coloured blocks get the extra class `md2ebook-code-hl`, which the colour rules target.

**Worked example.** The block ```` ```json ```` with body `{"a": 1}` becomes `<pre class="md2ebook-code-hl"><code class="language-json"><span class="token punctuation">{</span><span class="token property">"a"</span>…<span class="token number">1</span>…`: `"a"` is a property (light blue), `1` a number (orange). A block tagged `klingon` is returned as it was, plain.
