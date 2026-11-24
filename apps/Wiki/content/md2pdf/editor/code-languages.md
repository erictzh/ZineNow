## Intro

A **code block** in Markdown is text between two lines of backticks. The word after the opening backticks is the **language tag** (```` ```json ````), which tells the app how to **colour** the code (see [Code blocks and syntax highlighting](md2pdf/typography/code-blocks)). The editor has a **list of common languages** so you do not have to remember the tags.

## How to use

- Click the **arrow** next to the **{ }** button. The menu lists: Plain text, JSON, JavaScript, PHP, Liquid (Shopify), Python, HTML, CSS, Shell, YAML, Excel formula, Markdown. A tick marks the current one.
- Choosing one wraps the selected lines in a block of that language (or switches the language of the block the caret is in). The **last one you picked** is remembered in this browser, and is used by one click on the **{ }** button and Ctrl/⌘ Shift E. It starts as JSON.
- **Other language…:** type any tag (for example `ruby` or `sql`) and press Enter.
- **From file…:** pick a text file (up to 512 KB) and it goes in as a code block; the **language is guessed from the file's ending** (`.php` → PHP, `.liquid` → Liquid, `.yml` → YAML…). Unknown endings become plain text.

## How it works

Each language is one row in a table: its **tag** (the word the highlighter knows), its **label** (the name in the menu) and the **file endings** it recognises. Everything else is small functions that read that table:
- the file ending → tag (`languageForFile`),
- tag → label for display (`languageLabel`),
- a typed tag → a safe tag (`cleanLanguageTag`): no spaces or backticks (they would break the opening fence line), lower case, no leading or trailing dashes, at most 30 characters.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The table and the helpers

```js file=apps/Markdown-to-PDF/src/editor/codeLanguages.js fn=languageForFile,languageLabel,cleanLanguageTag
```

**The Logic:**
- `languageForFile`: `lastIndexOf(".")` finds the **last** dot; none (`-1`) means no ending, so plain text. `slice(dot)` takes the ending including the dot, `toLowerCase()` makes `.PHP` and `.php` the same, and `find` looks for the first language whose `ext` list contains it. No match gives `""` (plain text).
- `languageLabel` is a table lookup that falls back to the tag itself, so a typed `ruby` shows as `ruby`.
- `cleanLanguageTag`: `trim()` removes outer spaces; each run of spaces or backticks (`/[\s`]+/g`, a **regular expression**, where `\s` means any whitespace and `+` means one or more) becomes one dash; `/^-+|-+$/g` strips dashes at the start or end; `slice(0, 30)` limits the length.

**Worked example.**
| Input | Result | Why |
|---|---|---|
| `languageForFile("Theme.LIQUID")` | `"liquid"` | ending lower-cased to `.liquid` |
| `languageForFile("a.unknown")` | `""` | no language has that ending |
| `languageForFile("README")` | `""` | no dot |
| `cleanLanguageTag("  Rub y ")` | `"rub-y"` | trimmed, inner space → one dash |
| `cleanLanguageTag(" --C++-- ")` | `"c++"` | lower case, outer dashes stripped |

### Reading a file as a code block

```js file=apps/Markdown-to-PDF/src/editor/format.js fn=insertCodeBlock
```

**The Logic:** the file's text has its Windows line endings (`\r\n`, or a lone `\r`) turned into the plain `\n` that the editor uses, and trailing blank lines are cut (`/\n+$/`). It picks a safe fence with `fenceFor` and places the block on its own lines with `insertBlockLine`.

**Worked example.** A file `a ``` b⏎c⏎⏎` (with Windows line ends) and language `js`: the cleaned body is `a ``` b⏎c`; its longest backtick run is 3, so the fence is 4 backticks: ```` ````js⏎a ``` b⏎c⏎```` ````.
