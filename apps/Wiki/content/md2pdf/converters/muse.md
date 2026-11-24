## Intro

**Muse** is a lightweight writing format from the Emacs editor and the Amusewiki and Anarchist Library sites (many zines are published as `.muse` files). No ready-made JavaScript library reads it, so the app has its **own converter**: a short, hand-written, **line-by-line** translator from Muse to Markdown.

## How to use

File → **Open file…**, pick a `.muse` file. What is converted:

| Muse | Markdown |
|---|---|
| `* Heading` to `***** Heading` (1 to 5 stars, then a space) | `#` to `#####` |
| `*emphasis*`, `**strong**` | the same (already Markdown) |
| `_underline_` | `<u>underline</u>` (Markdown has no underline; raw HTML passes through) |
| `=code=` | `` `code` `` |
| `[[url][description]]`, `[[url]]` | `[description](url)`, `[url](url)` |
| `- item`, `1. item` | the same |
| `----` (4 or more hyphens) | `---` (divider) |
| text indented 2+ spaces | `> quoted` |
| `<example>…</example>`, `<verbatim>…</verbatim>` | a fenced code block |

Things it does **not** know (footnotes, tables, definition lists, `#title` and `#author` header lines) are passed through unchanged, so nothing is lost; they just may need tidying by hand. **Known limit:** an underscore pair inside a plain link address (`[[http://x.org/a_b_c]]`) is mistaken for underline.

## How it works

The converter reads the file **one line at a time** and applies the **first rule that matches**. A flag remembers whether it is inside a code block, where lines are copied as they are. The order of the rules matters: more specific first.

Inline marks (links, underline, code) are fixed by regular-expression **find-and-replace** on the line's text. A **regular expression** is a pattern: `[^\]\[]+` means "one or more characters that are not a bracket"; `$1` and `$2` in the replacement are the parts the pattern captured in brackets.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `convertMuseInline`

```js file=apps/Markdown-to-PDF/src/convert/muse.js fn=convertMuseInline
```

**The Logic:** three find-and-replace steps on one line of text.
1. Links with a description: `\[\[([^\]\[]+)\]\[([^\]\[]+)\]\]` matches `[[`, a **first group** with no brackets inside (the address), `][`, a **second group** (the description), `]]`. The replacement `[$2]($1)` writes group 2 in square brackets and group 1 in round ones. Then links without a description, where the address is used as the text.
2. `_([^_]+)_` matches an underscore, one or more non-underscores, an underscore: replaced by `<u>…</u>`.
3. `=([^=]+)=` to `` `…` ``.

The order matters: links go **first** so their addresses are not touched by the later steps; but since the underline step then runs on the converted link, an address containing a pair of underscores is damaged (the known limit above).

### `convertMuseToMarkdown`

```js file=apps/Markdown-to-PDF/src/convert/muse.js fn=convertMuseToMarkdown
```

**The Logic:** `replace(/\r\n?/g, '\n')` makes every line ending (Windows `\r\n`, old Mac `\r`) into `\n`, and `split('\n')` makes a list of lines. The loop checks each line against the rules in this order:
1. **`<example>`** or **`<verbatim>`** alone on a line: write ```` ``` ````, switch on the code flag. The closing tag: write ```` ``` ```` and switch it off. While the flag is on, copy the line unchanged and move on (`continue` skips the rest of the loop for this line).
2. **Blank lines and directives** (`#title …`: a `#`, word characters, whitespace) are kept.
3. **Four or more hyphens** alone on a line: `---`.
4. **Headings:** `^(\*{1,5})\s+(.*)$`: one to five stars at the **very start** (column 0), whitespace, then the rest. `new Array(level + 1).join('#')` is a small trick to repeat `#` `level` times (a list of `level + 1` empty items, glued with `#`, has `level` hashes). The text goes through `convertMuseInline`.
5. **Bullets** `(\s*)-\s+(.*)` and **numbers** `(\s*)(\d+)\.\s+(.*)`: the indentation (group 1) is kept so nested lists stay nested.
6. **Indented 2+ spaces** (`^ {2,}\S`) and not a list: a quote (`> `).
7. Anything else: just the inline conversion.

**Worked example.** The input

```
#title My Zine
** Chapter *one*
- item with [[http://a.com/b_c][a link]]
1. first
  Quoted _words_ and =code=
----
<example>
** not a heading
</example>
```

becomes (checked by running the real function):

```
#title My Zine
## Chapter *one*
- item with [a link](http://a.com/b_c)
1. first
> Quoted <u>words</u> and `code`
---
```
```
** not a heading
```

(The last two lines are the example block: the stars stay because the code flag is on.) Six stars (`****** Six`) do not match the 1-to-5 heading rule, so such a line is left as it is.
