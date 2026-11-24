## Intro

**Embed system fonts** puts a copy of the fonts your text uses **inside the project file**, so it looks identical on a computer, tablet or phone that does not have those fonts installed. (Fonts you uploaded yourself are always inside the project; this is about the fonts *installed on your computer*, like Georgia or Helvetica.) It needs Chrome or Edge, which are allowed to read installed fonts.

## How to use

**Project menu:**
- **Embed system fonts** (a switch, **on by default**) saves the fonts inside the file at each Save. The choice is stored in the project. An older project without the setting is treated as "on": its next Save embeds, unless you switch it off.
- **Embed Fonts…** opens a list of every font face the text uses (family plus Regular, Bold, Italic or Bold Italic), each labelled:
  - **uploaded:** always inside the project;
  - **embedded:** already inside, from an earlier save;
  - **system:** a font of this computer, with its **size**; tick or untick it;
  - **generic:** a CSS name like `sans-serif`: there is no file.
- The first time, a **licence reminder** appears: *a font file inside a project is a copy of the font, and anyone with the project can take it out. Many fonts' licences do not allow sharing.* Only embed fonts you are allowed to share.
- On the first Save the browser asks permission to read your fonts. Fonts that cannot be read are named in a notice after saving.
- Styles the text does not use (say, Italic) are not embedded.

## How it works

### Which faces does the text use?

A **face** is one family in one style, such as Georgia Bold Italic. The code goes through every text box on every page, resolving threads first, and collects each distinct face. A **span** can have its own family, bold or italic, so those count too (the span's own value wins, otherwise the box's). The faces are sorted by family, then Regular, Bold, Italic, Bold Italic.

### What kind of face is it?

`faceKind` decides in a fixed order: an exact match in the font store means **uploaded** or **embedded** (the entry's `source` tells which); an *uploaded* family covers every style of that family; a CSS generic name means **generic**; anything else is a **system** font.

### Reading the files

For each system face, the same resolver the PDF export uses ([Fonts](zeditor/text/fonts)) finds the file through the **Local Font Access API**: the installed faces of the family, the one whose parsed style has the right italic flag and weight. The bytes are converted to **base64** and stored as `{ family, data, bold, italic, source: "system" }`.

### Permission and the user gesture

Browsers only show a permission question in answer to a **user action** (a click). So the question is asked at the start of the **Save** click, before anything slow happens, by calling `queryLocalFonts()` when the permission state is still `"prompt"`.

### Opening a project with embedded fonts

On opening, each embedded font is registered with the browser (`FontFace`) before anything is drawn, so text lays out in the real font and not in a fallback.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `faceKey`, `faceLabel` and `usedFaces`

```js file=apps/ZEditor/src/io/fontEmbed.js fn=faceKey,faceLabel,usedFaces
```

**The Logic:**
- `faceKey` joins the family with `b` and/or `i` flags (`"Georgia|bi"`) into one **key**, so a face can be looked up in a `Map` or a list.
- `faceLabel` makes the name shown in the dialog: the family, an em dash, then "Regular" or the words "Bold" and/or "Italic" (`[…].filter(Boolean).join(" ")` drops the empty ones).
- `usedFaces`: `add` records a face once (`if (!map.has(key))`). The loops visit every page, every resolved text item, and every span with its own font settings; `r.fontFamily != null ? r.fontFamily : a.fontFamily` is "the span's value, if it has one, else the box's". The final `sort` compares family names with `localeCompare` (alphabetical in the user's language), then bold, then italic: `a.bold - b.bold` works because `false` and `true` become 0 and 1.

**Worked example.** A box set in Georgia (regular) has the word "Warning" in a span set bold, and a span set in Courier New italic. `usedFaces` returns **three faces**: `Courier New (italic)`, `Georgia (regular)`, `Georgia (bold)`, sorted: Courier New first, then Georgia Regular before Georgia Bold. Their keys are `Courier New|i`, `Georgia|`, `Georgia|b`.

### `faceKind`

```js file=apps/ZEditor/src/io/fontEmbed.js fn=faceKind
```

**The Logic:** it looks in the store (`customFontStore`, a list of fonts in the project) for the **exact** face. If found, `source === "system"` means it was embedded before (**embedded**), otherwise it was uploaded (**uploaded**). Then it checks whether any *uploaded* font of the same family exists (`f.source !== "system"`): an uploaded font stands for all styles of its family. Then names in the `GENERIC` set (`sans-serif`, `serif`, `monospace`…) are **generic**. Anything left is **system**.

**Worked example.** The store holds an uploaded font "Pacifico" (regular) and an embedded system face "Georgia" (regular). Face "Pacifico bold" → **uploaded** (the family is uploaded). "Georgia regular" → **embedded**. "Georgia bold" → not an exact match, no uploaded Georgia, not generic: **system**. "sans-serif" → **generic**.

### `buildEmbeddedFonts`

```js file=apps/ZEditor/src/io/fontEmbed.js fn=buildEmbeddedFonts
```

**The Logic:** for each used face that is of kind **system** and not in the `skip` list (the faces you unticked), the resolver is asked for its bytes. If none (not installed, or no permission), its label goes into `missing` so the user is told. Otherwise the byte count is added to `total` and the face is converted to base64 and stored with `source: "system"`. `...(f.bold ? { bold: true } : {})` adds the `bold` property only when true. The result is `{ fonts, missing, total }`.

### `formatBytes`, `ensureFontAccess`

```js file=apps/ZEditor/src/io/fontEmbed.js fn=formatBytes,canReadSystemFonts,ensureFontAccess
```

**The Logic:** `formatBytes` shows megabytes (1 MB is 1,048,576 bytes) with one decimal, or kilobytes rounded and at least 1. `canReadSystemFonts` checks the feature exists (`"queryLocalFonts" in window`). `ensureFontAccess` returns at once if the browser cannot read fonts or no text uses a system face; otherwise it asks the **Permissions API** for the state of `"local-fonts"`; only when it is `"prompt"` (not yet decided) does it call `queryLocalFonts()` to trigger the browser's question. Any failure is ignored (`catch`): the save later names the fonts it could not embed.

**Worked example.** `formatBytes(2621440)` → **`2.5 MB`**; `formatBytes(150000)` → **`146 KB`**; `formatBytes(300)` → **`1 KB`** (never "0 KB"). A project using three fonts of 480 KB, 1.1 MB and 2.5 MB grows by `(480 KB + 1.1 MB + 2.5 MB) × 4/3` of base64 (about 5.4 MB), which the dialog's total tells you before you save.

### The licence reminder

```js file=apps/ZEditor/src/io/fontEmbed.js fn=fontLicenceSeen,setFontLicenceSeen
```

**The Logic:** the "seen" flag is kept in `localStorage` (a small store in the browser). Both functions are wrapped in `try … catch`, because storage can be blocked (a private window): then it simply asks again next time (`return false`). The first time you switch embedding on, the reminder is shown; confirming it sets the flag.
