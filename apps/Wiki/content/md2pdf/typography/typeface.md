## Intro

**Typeface** chooses the font of your text, and optionally a different font for headings. The **font box** is a search field with a list of fonts, plus a button that loads **every font installed on your computer**.

## How to use

- **Font Family:** type to search, or open the list. Starting list: Inter (default), Merriweather, Georgia, Garamond, JetBrains Mono, Arial, Times New Roman.
- **Load Local System Fonts** (Chrome or Edge 103+): asks permission to read your fonts, then adds all their families to the list. Other browsers show a message that it is not supported.
- **Heading Font Family:** tick **Same as body font**, or untick it to pick a **Custom Heading Font** (used for H1 to H6). Unticking starts the picker on the current body font.
- Inter, Merriweather and JetBrains Mono come from **Google Fonts** (needs a connection while building the document); the others use whatever your computer has.

## How it works

### From name to a font stack

A CSS **font stack** is a list of fallbacks: `'Merriweather', Georgia, 'Times New Roman', serif` means "use Merriweather; if absent, Georgia; then Times; then any serif". A table knows the stack for the built-in fonts; for any other name (such as one loaded from your computer), the stack is the name followed by safe fallbacks (`ui-sans-serif, system-ui, sans-serif`).

### Which fonts need downloading

Only three fonts are loaded from Google Fonts. For those, the document gets `<link>` tags to the Google Fonts address (with the weights 400, 600, 700, 800, 900). The heading font gets its own tag only if it differs from the body font. System fonts need nothing.

### Same as body

The "same as body" box wins over everything. A custom heading font left blank also falls back to the body font.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `fontStackFor`

```js file=apps/Markdown-to-PDF/src/settings/defaults.js fn=fontStackFor
```

**The Logic:** `FONT_STACKS[family] || "…"` means "the stored stack, or, if there is none (`undefined` is false), build one". The name is wrapped in single quotes, because a font name may contain spaces.

**Worked example.** `fontStackFor("Georgia")` → `Georgia, 'Times New Roman', serif` (from the table). `fontStackFor("Bookerly")` → `'Bookerly', ui-sans-serif, system-ui, sans-serif`.

### The heading font rule

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js
  var fontFamilyRaw = isBlank(config.fontFamily) ? DEFAULTS.fontFamily : String(config.fontFamily).trim();

  // Heading font: "same as body" checkbox wins; a blank custom
  // heading font also falls back to the body font.
  var headingSameAsBody = toBoolean(config.headingFontSameAsBody, DEFAULTS.headingFontSameAsBody);
  var headingFontRaw = isBlank(config.headingFontFamily) ? DEFAULTS.headingFontFamily : config.headingFontFamily;
  var headingFontFamily =
    headingSameAsBody || isBlank(headingFontRaw) ? fontFamilyRaw : String(headingFontRaw).trim();
```

**The Logic:** blank body font → the default (`Inter`). `toBoolean(…)` reads the checkbox (and treats the text `"false"` as false). The heading font is the body font when the box is ticked **or** when the custom one is blank; otherwise the trimmed custom name.

**Worked example.** Same-as-body ticked, custom `Merriweather` → headings use Inter. Unticked with custom `Merriweather` → Merriweather. Unticked with a blank custom box → Inter.

### Google Fonts tags: `fontLinkTags` and `googleFontLinkTag`

```js file=apps/Markdown-to-PDF/src/document/fonts.js fn=fontLinkTags,googleFontLinkTag
```

**The Logic:** `hasOwnProperty` asks "is this one of the three Google fonts?". `fontFamily.replace(/ /g, '+')` swaps every space for `+` (the web address form: `JetBrains+Mono`). The two `preconnect` tags tell the browser to open the network connection early; they are skipped for the second tag, since the first already did it. Non-Google fonts return an empty string.

**Worked example.** Body `Inter`, headings `Merriweather` → two stylesheet links (the first with the preconnects) at `…css2?family=Inter:wght@400;600;700;800;900&display=swap` and `…family=Merriweather:…`. Body `Georgia` → no tag at all.

### Loading local fonts: `handleLoadLocalFonts`

```js file=apps/Markdown-to-PDF/src/ui/FontCombobox.jsx fn=handleLoadLocalFonts
```

**The Logic:** `"queryLocalFonts" in window` checks the browser has the feature. `await window.queryLocalFonts()` shows the permission question and returns every installed font **face** (Bold, Italic… are separate entries). `new Set(…)` keeps each family once (a **Set** cannot hold duplicates), `Array.from` turns it back to a list, and `localeCompare` sorts alphabetically. The setter merges them into the existing options. A refusal (`NotAllowedError`) or any other failure is shown in the status line.

**Worked example.** The computer reports 40 faces from 12 families (Arial Regular, Arial Bold, Arial Italic…): the message reads *Loaded 12 local system fonts.*
