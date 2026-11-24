## Intro

ZineNow keeps its file formats **simple and readable**: they are all plain **text (JSON)** or ordinary PDFs and pictures, so you can open them in a text editor and they do not depend on ZineNow being around. This page lists them.

| Format | Made by | Holds |
|---|---|---|
| **`.znow`** | ZEditor: Save project | A whole project: pages, items, source PDFs, settings, fonts |
| **Group file (`.znow`)** | ZEditor: Layers panel, *Save group as .znow* | Just some items (a group), as a one-page project |
| **Config `.json`** | Markdown to PDF: Typography → Save… | The Typography settings |
| **`.md`** | Markdown to PDF: Save as Markdown | The text, with pictures kept inside |
| **PDF, PNG, JPG, SVG** | ZEditor, Markdown to PDF, ZineArranger, Ai Tools | The results |

## How to use

- **Open project** and **Import group** in ZEditor read `.znow` files. A group file also opens on its own as a project (it is one).
- **Typography → Open…** reads a config file; unknown entries are ignored, so old files keep working.
- A `.znow` or config file can be opened in any text editor (they are long because PDFs and pictures are stored as text).
- Keep your `.znow`: it is the only format that keeps text editable. A PDF export is final.

## How it works

### `.znow`

One JSON object with `version`, `title`, `docs` (each source PDF as base64 text), `fonts`, `textStyles`, `pages` (every item with its position, look and text) and `settings`. Details: [The .znow file](zeditor/project/znow-file).

### Group files

A group file reuses the **project format** on purpose: it is an ordinary project with **one page**, a "no paper" page sized to fit the items plus 40 px of room round them. So no new format has to be maintained. The items are shifted so their top-left corner sits at (40, 40). Fonts they use are stored with them; pictures are inside the items. Reading a group gives back the items and a name (from a `groupName` marked on an item, else the project's title, else "Imported group").

### Config files

The Typography settings object as JSON, indented two spaces. Loading merges only the names the app knows, and converts each value to the type the control wants ([Config files](md2pdf/typography/config-files)).

### Why JSON?

It is readable, easy to produce and parse everywhere (`JSON.stringify`, `JSON.parse`), and survives version changes: a reader ignores fields it does not know and fills in defaults for missing ones.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `itemsBounds` and `serializeGroup`

```js file=apps/ZEditor/src/io/groupFile.js fn=itemsBounds,serializeGroup
```

**The Logic:** `itemsBounds` finds the smallest box containing every item: start with an impossible box (`x0 = Infinity`…) and widen it with each item's box (`Math.min`/`Math.max`); an item whose numbers are not all finite (`Number.isFinite`) is skipped; if nothing counted, the answer is `null`. `serializeGroup` shifts every item by `(PAD − left, PAD − top)` so the top-left of the group lands at (40, 40) (`translatedAnnotation` makes a moved **copy**, never changing the original), clears the "clip to the layer below" link of the lowest item (the layer below is not in the file), builds the one-page project (`isBlank`, `isCanvas`: the "no paper" page) with the page size in **points** (`÷ MAIN_SCALE`) and hands it to `serializeProject`.

**Worked example (checked by running the real code).** Two items: a 200 × 100 rectangle at (100, 50) and a 50 × 60 one at (400, 300). `itemsBounds` → `{ x: 100, y: 50, width: 350, height: 310 }` (right edge `max(300, 450)`, bottom `max(150, 360)`). The page is `ceil(350 + 80) = 430` by `ceil(310 + 80) = 390` editor pixels; divided by `MAIN_SCALE` (1.1): **390.9 × 354.5** points. The items move by `(40 − 100, 40 − 50) = (−60, −10)`: the first lands at **(40, 40)** and the second at **(340, 290)**. The file's keys are `version, title, docs, fonts, textStyles, pages, settings`. With no items, `itemsBounds` is `null` and `serializeGroup` throws *There is nothing in that group to save.*

### `readGroupFile`

```js file=apps/ZEditor/src/io/groupFile.js fn=readGroupFile
```

**The Logic:** it reads the file as a project (registering its fonts on the way), flattens every page's items into one list (`flatMap(p => p.annotations || [])`), refuses an empty one, and finds a name: the first item carrying `groupName`, else the project title, else a default. `(named && named.groupName) || …` is a chain of fallbacks: `a && b` gives `b` only if `a` exists.

### Config files

```js file=apps/Markdown-to-PDF/src/settings/configFile.js fn=readConfigFile,configFileName
```

**The Logic:** see [Config files](md2pdf/typography/config-files): the file is parsed and must be an object; the name gets `.json` added if missing.
