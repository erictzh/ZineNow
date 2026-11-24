## Intro

The **table of contents** is built automatically from your headings. You type `\toc` where you want it; the app finds all headings, gives each a link target, writes the list, and, once the pages are laid out, fills in **the page number** of every entry.

## How to use

1. Write headings with `#`, `##`, `###` in your Markdown.
2. Put `\toc` on its own line (or Insert → Table of contents).
3. Style it in **Typography → Table of Contents** ([settings](md2pdf/typography/toc)).
4. In the PDF, each entry is a **link** to its heading. Several `\toc` markers are allowed: each is replaced with the same list.
- If there are no headings, the list says *No headings yet.*
- A heading that already has an `id` (typed as raw HTML) keeps it.
- Duplicate headings get unique targets: `h-intro`, then `h-intro-2`.

## How it works

1. **Find every heading** `<h1>`…`<h6>` in the HTML with a pattern.
2. **Give it an id** (a name for the target of a link): the heading's text turned into a **slug**: lower case, anything that is not a letter or digit becomes `-`, trimmed, at most 60 characters. Accented letters and other alphabets are kept.
3. **Collect entries** for levels up to "Include Headings".
4. **Write the list** (`<nav><ol><li><a href="#id">…`), then replace every `\toc` slot with it.
5. **Page numbers:** when the list is written, nobody knows which page a heading will land on, because pages are only created later by the layout engine. So the number cells start **empty**. After the layout finishes (see [Preview and pagination](md2pdf/building/preview-pagination)), a small script looks up the page of every heading, writes the number into the list and also posts the whole map back to the app. When you press Download PDF, the app hands that map to the print window, which writes it into the list before printing.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `slugify`

```js file=apps/Markdown-to-PDF/src/document/html.js fn=slugify
```

**The Logic:** `&[a-z0-9#]+;` finds HTML entities (`&amp;`, `&#39;`) and turns each into a space, `toLowerCase().trim()` normalises, and `/[^\p{L}\p{N}]+/gu` replaces every run of characters that are **not** a letter (`\p{L}`) or number (`\p{N}`) with one `-`. The `u` flag enables these Unicode classes, so `é` and `中` count as letters. If an old browser cannot read the pattern, the `catch` uses a simpler one. Finally `/^-+|-+$/g` trims dashes at both ends and `.slice(0, 60)` caps the length.

**Worked example.**
| Heading text | Slug |
|---|---|
| `Hello, World! &amp; Café 2024` | `hello-world-café-2024` |
| `Über uns / 中文` | `über-uns-中文` |
| `   ` | `` (empty: the caller uses `section`) |
| 80 letters `A` | 60 characters |

### `applyToc`

```js file=apps/Markdown-to-PDF/src/document/toc.js fn=applyToc
```

**The Logic:**
- Nothing to do when there is no `\toc` slot (`indexOf` is −1 when absent).
- `bodyHtml.replace(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, function …)` visits every heading. In the pattern, `([1-6])` captures the level, `(\s[^>]*)?` optional attributes, `([\s\S]*?)` the inner HTML, and `\1` means "the same digit again" so `<h2>` must close with `</h2>`.
- `text` is the inner HTML with tags stripped (`/<[^>]*>/g`) and spaces squeezed: `Part <em>A</em>` becomes `Part A`.
- If the heading already has an id (`idMatch`), keep it. Otherwise make `h-` + slug; `used` records names already taken, and the `for` loop tries `-2`, `-3`… until the name is free. The id is inserted into the tag's attributes.
- Entries are collected only for levels up to `tocLevels` and with non-empty text.
- Each entry becomes a list item with class `md2ebook-toc-l<level>`, a link to `#id` (and `data-toc-target`, which the script reads later) containing the text, then (if page numbers are on) an empty stretchy **leader** and the number cell. The number is filled now only if the app already measured pages (`tocPages[id]`).
- The wrapper's classes decide dotted leaders and the page break after the list. The title (if shown) is the `escapeHtml`'d text.
- `html.split(SLOT).join(tocHtml)` replaces every slot with the list (split-and-join is "replace all").

**Worked example.** Headings `# Intro`, `## Part <em>A</em>` (which already has `id="mine"`), `## Intro`, `### Deep`, with levels = 2 and the measured pages `{ h-intro: 2, mine: 3, h-intro-2: 5 }`: the first gets id `h-intro`, the second keeps `mine`, the third gets `h-intro-2` (a duplicate), the H3 gets an id but is not listed (level 3 > 2). The list holds three entries, with numbers 2, 3 and 5. Before layout (no map) the three number cells are empty.

### `tocFillScript`: finding the page of each heading

```js file=apps/Markdown-to-PDF/src/document/toc.js fn=tocFillScript
```

**The Logic:** this function does not do the work itself: it **returns the text of a script** that will run *inside the laid-out document*. The script lists all page boxes (`.pagedjs_page`), then for each contents link finds the heading by id (`document.getElementById`), asks which page box contains it (`closest(".pagedjs_page")`), and takes the page's position in the list (`indexOf`, counting from 0) plus the first page's number. It writes the number into the entry and stores it in `__tocPages` for sending back. `start` is the Page Start From number if page numbers are on, otherwise 1.

**Worked example.** Page numbers on, starting from 5. A heading inside the third page box (position 2) shows `5 + 2 =` **7**. With page numbers off the first page counts as 1, so the same heading shows 3.
