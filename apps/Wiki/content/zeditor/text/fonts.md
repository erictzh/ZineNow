## Intro

A **font** is the file that holds the shapes of the letters. ZEditor can use fonts built into your device, fonts you **upload**, and, in Chrome and Edge, any font **installed on your computer**. Uploaded fonts are saved inside the project so it looks the same on a computer that does not have them. (Embedding installed fonts, so the project and the PDF carry them too, has its own page: [Embed system fonts](zeditor/project/embed-fonts).)

## How to use

Open any **Font** box (Text panel, a span, or the Text tool's defaults):
- **Search fonts…** filters the list as you type. Hover or use ↑ ↓ to preview, Enter to choose.
- **+ Load Local System Fonts** (Chrome and Edge): the browser asks permission, then every installed font family joins the list.
- **+ Upload Font File…**: choose a `.ttf`, `.otf`, `.woff` or `.woff2` file. It is registered and saved inside the project.
- The built-in starters are Inter, Georgia, Courier New, Comic Sans MS and Impact; a name the device does not have just falls back to the browser's default sans-serif.

## How it works

### Fonts are matched by name

A text box stores only the font's **family name** (like "Georgia"), applied to the canvas as `'Georgia', sans-serif`. If the device has no such family, the browser silently uses the fallback after the comma. That is why a project moved to another computer can change look, unless the font was uploaded or embedded.

### Registering an uploaded font: the FontFace API

The browser's **FontFace** API creates a font from raw bytes. ZEditor builds one (`new FontFace(family, bytes, { weight, style })`), waits for it to `load()`, and adds it to `document.fonts`. From then on the font works everywhere: in the live text *and* on the canvases used for export. The font's bytes are also kept as base64 text in a list (`customFontStore`) so a saved project can carry them.

### System fonts: the Local Font Access API

A web page normally cannot list your installed fonts (that would let sites fingerprint you). Chrome and Edge offer `queryLocalFonts()`, which asks the user's **permission** first and then returns every installed face with a method to read its bytes. The same API is what lets the app put a font into a PDF: the PDF must contain the font file, not only its name.

### Finding the right file for bold and italic

An installed family has many **faces** ("Regular", "Bold", "Italic", "Bold Italic", "SemiBold"…). `parseStyle` reads a face's style name and works out whether it is italic and what weight word it has. The resolver then looks, in order: a font kept in the project (the exact face), then, if the family was not uploaded, the installed faces for one with the same italic flag and weight.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `registerCustomFont`

```js file=apps/ZEditor/src/io/customFonts.js fn=registerCustomFont
```

**The Logic:** `bytes` is the font file's content (an `ArrayBuffer`). `bytes.slice(0)` makes a **copy**, because loading a font can detach (use up) the original buffer. The `FontFace` is told its family name and its weight (`"700"` for bold, `"400"` normal) and style. `await face.load()` waits until the browser has parsed it (it throws if the file is not a font). `document.fonts.add(face)` makes it available to every text on the page.

### `addCustomFontFile`

```js file=apps/ZEditor/src/io/customFonts.js fn=addCustomFontFile
```

**The Logic:**
- `/\.(ttf|otf|woff2?)$/i.test(file.name)` is a **regular expression** that checks the file name ends in one of the four extensions (`2?` makes the 2 optional; `i` ignores case). Otherwise it throws an error with a friendly message.
- The family name comes from the file name: the extension is removed (`/\.[^.]+$/`), underscores become spaces (`/_+/g`), quotes and backslashes are deleted (they would break the CSS font string), and the result is trimmed (or "Custom font" if empty).
- The `while` loop makes the name **unique**: if it is taken, "2", "3"… are added until it is free.
- `registerCustomFont` is wrapped in `try … catch`: if the browser cannot read the file, a clear message replaces the technical error. Finally the bytes are stored as base64 text (`arrayBufferToBase64`) in `customFontStore`, and the family name is returned.

**Worked example.** The file `My_Cool-Font.ttf`: the extension is cut: `My_Cool-Font`; underscores become spaces: **`My Cool-Font`**. Upload the same file again: the name is taken, so it becomes `My Cool-Font 2`.

### `parseStyle`

```js file=apps/ZEditor/src/io/fontFiles.js fn=parseStyle
```

**The Logic:** the style name is lower-cased, hyphens and underscores become spaces, split into words (`split(/\s+/)`) and empty pieces dropped (`.filter(Boolean)`). `italic` is true if any word is "italic" or "oblique" (a slanted style without true italic shapes). The remaining words are the **weight**: none, or just "regular"/"normal"/"roman"/"book", means `"regular"`; otherwise the words are joined back (`"bold"`, `"semi bold"`, `"black"`).

**Worked example.**

| Style name | `italic` | `weight` |
|---|---|---|
| `Regular` | false | `"regular"` |
| `Bold Italic` | true | `"bold"` |
| `Oblique` | true | `"regular"` |
| `Semi-Bold` | false | `"semi bold"` |

### `find`: the file behind a face

```js file=apps/ZEditor/src/io/fontFiles.js fn=find
```

**The Logic:**
- It is `async`: reading a font file takes time. `key` identifies the request (`"Georgia|bi"`: family, bold, italic), and `bytesCache` (a `Map`) remembers answers so the same face is never read twice.
- `exact` looks in the project's own font list (`customFontStore`) for this family and the exact bold/italic combination. `keptUploaded` is true if the family was *uploaded* (not an embedded system font): then only the uploaded file is used, never a similar installed font.
- If there is no exact match and the family was not uploaded, `localFonts()` (the installed fonts, only if the user has already allowed it: it never asks) is filtered to this family (compared in lower case), and `.find` picks the face whose parsed style has the same italic flag and the wanted weight (`"bold"` or `"regular"`). Its bytes are read with `await face.blob()`.
- If nothing is found, the answer is `null`: the export then draws that text as a picture instead.

**Worked example.** A box uses Georgia, bold, not italic. `key = "Georgia|b"`. Nothing is stored in the project; Georgia was not uploaded; the installed Georgia faces are Regular, Italic, Bold and Bold Italic. Parsed: Bold → `{ italic: false, weight: "bold" }`, which matches `wantWeight = "bold"`, `italic = false`: that face's bytes are returned.

### `handleLoadLocalFonts`

```js file=apps/ZEditor/src/ui/controls/FontCombobox.jsx fn=handleLoadLocalFonts
```

**The Logic:** it checks the browser supports `queryLocalFonts`, otherwise explains it needs Chrome or Edge. `await window.queryLocalFonts()` triggers the permission prompt and returns every face. `new Set(availableFonts.map((f) => f.family))` keeps each **family** once (a family has several faces; a `Set` removes duplicates); `.sort((a, b) => a.localeCompare(b))` sorts them alphabetically using the user's language rules. They are merged into the font list the same way. `try … catch … finally`: a refused permission (error name `NotAllowedError`) gives its own message; `finally` always switches off the "Loading…" state, success or not.
