# Maintaining ZineNow

A practical guide for people working on the code: how to run and change it,
where to find things, step-by-step recipes for common changes, and the traps
to avoid.

Read alongside:

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: the folder layout, the rules that
  keep the code tidy, and what each folder or hook is responsible for.
- **[../HANDOFF.md](../HANDOFF.md)**: project history and how individual
  features were built, including the tricky details.

---

## 1. Start here

ZineNow is three zine-making tools plus a launcher page. They are plain web
pages: no server is needed, and every page works opened straight from disk.

| App | What it does | Code |
|---|---|---|
| **ZEditor** | Edit PDF pages: text, images, shapes, drawing, filters, page management. Saves `.znow` projects. | `apps/ZEditor/src/` (React) |
| **Markdown-to-PDF** | Markdown → a paginated PDF book, with typography settings and a live preview. | `apps/Markdown-to-PDF/src/` (React) |
| **ZineArranger** | Lays a PDF's pages out on printable sheets so they fold into a zine (imposition). | `apps/ZineArranger/src/` (plain JS) |
| **Launcher** | The home page with a card per app. | `index.html`, `launcher/`, `config/apps-config.js` |

**First hour on the project**

1. Run `npm install`, then open `index.html` in a browser and try each app.
2. Skim [ARCHITECTURE.md](ARCHITECTURE.md), especially the folder table for
   the app you'll work on.
3. Open that app's `src/` folder. **Every file starts with a one-line comment
   saying what it is for.** Reading those first lines is the fastest way to
   find your way around.
4. Use the "I want to change…" tables in §4 to jump to the right file.

---

## 2. Everyday workflow

```bash
npm install          # once (installs esbuild, the only dependency)
npm run watch        # leave running: rebuilds an app's dist/app.js on every save
```

Then open the app's `index.html` and reload after each save. Opening from
disk works for everything. If you prefer a local server (it makes cache
problems easier to avoid), serve the folder:

```bash
python -m http.server 8000
```

Then go to http://localhost:8000.

**The one rule that bites:** you edit `src/`, but the page runs
`dist/app.js`. Always rebuild, and **commit `src/` and `dist/app.js`
together.** `npm run check` fails if a committed `dist/app.js` is out of
date. Run it before every commit.

```bash
npm run build        # one-off build of every app
npm run check        # is every committed dist/app.js up to date?
```

What isn't built:

- CSS files are loaded directly by each page's `index.html`, so changes show
  up on reload.
- `apps/Markdown-to-PDF/defaultConfig.json` and `sample.md` are plain
  scripts, also loaded directly.
- `config/apps-config.js` and `launcher/` are loaded directly too.

---

## 3. Repository map

```
ZineNow/
├─ index.html               Launcher page (stays at the root so app links are simple)
├─ launcher/                Launcher script, styles and background image
├─ config/apps-config.js    The list of apps the launcher shows
├─ apps/
│  ├─ ZEditor/              index.html · styles/ (11 CSS files, in cascade order) · src/ · dist/
│  ├─ Markdown-to-PDF/      index.html · styles.css · component-kit.css · defaultConfig.json · sample.md · src/ · dist/
│  └─ ZineArranger/         index.html · style.css · src/ · dist/
├─ shared/
│  ├─ vendor/               pdf.js and pdf-lib, one copy for every app
│  ├─ styles/               tokens.css (colours, fonts) and shared components: buttons, topbar, tabs, toggle, scrollbars
│  └─ js/                   zineArrangerHandoff.js (send a PDF to ZineArranger), download.js (download fallback)
├─ tools/build.mjs          The build: each apps/<App>/src/main.js(x) → apps/<App>/dist/app.js
└─ docs/                    ARCHITECTURE.md (structure and rules), MAINTAINING.md (this file)
```

React, ReactDOM, pdf.js (`pdfjsLib`) and pdf-lib (`PDFLib`) are globals,
loaded by each page's own `<script>` tags. The bundles contain only app code.

---

## 4. Finding your way: "I want to change…"

### ZEditor (`apps/ZEditor/src/`)

Layers, lowest first. A file may only import from its own layer or the ones
above it in this list:
`model/` (pure rules, no React or canvas) → `render/` (canvas drawing) →
`io/` (files) → `state/` (React hooks that own the app's state) → `ui/`
(components).

| I want to change… | Go to |
|---|---|
| A filter's look (halftone, xerox, threshold, grayscale, duotone) | `render/filters/` (`halftone.js`, `xerox.js`, `colorRemap.js`); settings in `model/pageFilters.js` |
| Photo adjustments (exposure, contrast, …) | sliders: `model/photoAdjust.js`; pixels: `render/photoAdjust.js` |
| Image effects (rounded, torn, scissor, stroke, shadow, texture) | definitions: `model/imageEffects.js`, `model/edgeShapes.js`; drawing: `render/boxEffects.js`; live preview: `ui/canvas/BoxEffectOverlays.jsx`, `ui/canvas/boxStyles.js` |
| How text is laid out or drawn | layout and wrapping: `render/textLayout.js`; drawing: `render/drawText.js`; settings and effects: `model/text/` |
| Rectangles/ellipses, pen/highlighter | `model/rect.js`, `model/strokes.js`, `render/drawShapes.js` |
| Erasers (stroke, soft, magic) | settings: `model/softEraser.js`, `model/magicEraser.js`; pixels: `render/softErase.js`, `render/magicErase.js`; mouse: `ui/canvas/softEraseGesture.js`, `ui/canvas/magicEraseGesture.js`; panel: `EraserToolPanel` in `ui/panels/format/ToolPanels.jsx` |
| What Export PDF produces | `io/pdfExport.js` → `render/pageRender.js` (draws a whole page) |
| The `.znow` project format | `io/projectFile.js` |
| Opening / inserting PDFs | `io/pdfImport.js`, `state/useDocumentFiles.js` |
| Undo/redo | `state/useHistory.js` |
| Adding/editing/deleting items on a page | `state/useAnnotationEdits.js` |
| Page operations (rotate, delete, reorder, blank pages) | `state/usePageOps.js` |
| Keyboard shortcuts | `state/useKeyboardShortcuts.js`, and the list users see: `ui/dialogs/shortcuts.js` |
| Save / Save As / title / remembered file | `state/useProject.js`; title rules: `model/documentTitle.js` |
| The right-hand Format panel | `ui/panels/FormatPanel.jsx` picks one of `ui/panels/format/*` |
| The page canvas and mouse handling | `ui/canvas/ComposeCanvas.jsx` (routes presses per tool), `ui/canvas/Annotation*.jsx` (one per item type) |
| Topbar menus (Page / Project / Export) | `ui/topbar/Topbar.jsx`; menu shell: `TopMenu.jsx`, `PageMenu.jsx` |
| Toolbar | `ui/toolbar/ToolBar.jsx` |
| Sidebar thumbnails | `ui/sidebar/` |
| Styles | `apps/ZEditor/styles/` (each file is one area of the screen) |

`ui/App.jsx` creates the state hooks and lays out the screen; it has no logic
of its own. The table of hooks is in [ARCHITECTURE.md](ARCHITECTURE.md).

### Markdown-to-PDF (`apps/Markdown-to-PDF/src/`)

| I want to change… | Go to |
|---|---|
| A default setting value | `apps/Markdown-to-PDF/defaultConfig.json` (no build needed) |
| The sample text | `apps/Markdown-to-PDF/sample.md` (no build needed) |
| How Markdown becomes the printed page (CSS, headings, margins, page numbers) | `document/styleBlock.js` |
| `\pagebreak`, `\space{n}`, `\toc` markers | `document/markers.js`; the table of contents itself: `document/toc.js` |
| The live preview | `document/previewDocument.js` (the paginated document), `ui/PreviewCanvas.jsx` (the frame) |
| Download PDF | `export/printExport.js` (uses the browser's print engine) |
| Send to ZineArranger | `export/rasterDocument.js` + `ui/App.jsx` + `shared/js/zineArrangerHandoff.js` |
| Importing .docx / .epub / .muse | `convert/`, chosen by extension in `editor/importDocument.js` |
| A settings section in the sidebar | `ui/typography/<Section>.jsx` |
| The editor toolbar (upload, save, insert) | `ui/editor/EditorTab.jsx` |
| Validating settings | `settings/normalizeConfig.js` |

### ZineArranger (`apps/ZineArranger/src/`)

| I want to change… | Go to |
|---|---|
| Which page goes where on a sheet, rotation, guide lines | `imposition/layouts.js` (data; its format is described at the top of the file) |
| How pages pad up to whole sheets and signatures | `imposition/impose.js`, `imposition/signatures.js` |
| The sheet/cell HTML | `imposition/sheetsHtml.js`; cell positions are CSS grid classes in `style.css` |
| Grid, pages per sheet and paper orientation for each size | `sheetGrid.js` |
| On-screen sizes and print sizes | `sheetSizes.js` |
| Reading the options panel | `readOptions.js`; buttons and presets: `optionsPanel.js` |
| Loading the PDF and drawing pages into cells | `loadPdf.js` |
| Reverse Impose | `reverseImpose.js` |
| The activity log | `activityLog.js` |
| Anything that changes at runtime | it's a field on `state` in `state.js` |

`index.html` calls functions straight from `onclick`/`onchange` attributes.
They only work because `main.js` puts them on `window`, so **add any new
handler to the `Object.assign(window, …)` list at the end of `main.js`.**

---

## 5. Recipes

Each recipe lists every place that has to change. After any recipe:
**build, reload, try it in the app, then run `npm run check`.**

### ZEditor: add a page/image filter

1. `model/pageFilters.js`:
   - Add `{ key, label }` to `PAGE_FILTER_OPTIONS`; image filters inherit it
     through `IMAGE_FILTER_OPTIONS`.
   - If it has settings, add a `*_FILTER_CONTROLS` list and register it in
     `FILTER_CONTROLS`. The settings UI is generated from that list.
2. `render/filters/`: write the pixel function in a new file, and call it
   from `applyPageFilter` in `applyFilter.js`. Export and the live preview
   both go through this one function, so they can't drift apart.
3. Live preview of images: filters listed in `FILTER_CONTROLS` are previewed
   on a canvas automatically (`ui/canvas/AnnotationImage.jsx`). Only
   grayscale and duotone use SVG filters (`ui/canvas/LiveFilterDefs.jsx`).
4. Check that it looks the same in the editor and in Export PDF.

### ZEditor: add an image effect

1. `model/imageEffects.js` (or `model/edgeShapes.js` for an edge shape): add
   an effect `{ key, label, controls: [...] }` and include it in
   `IMAGE_EFFECTS`. The Format panel lists effects from that array
   (`ui/panels/EffectControls.jsx`).
2. Draw it for export in `render/boxEffects.js`.
3. Draw it live in `ui/canvas/BoxEffectOverlays.jsx` or with CSS in
   `ui/canvas/boxStyles.js`.
4. `render/bake.js`: Flatten / Rasterize must clear the new props, as it does
   for the others, or the effect gets applied twice.

### ZEditor: add a text effect

Add the effect to `TEXT_EFFECTS` in `model/text/textControls.js` and draw it
in `render/drawText.js`. If it can't be done in CSS, make `usesCanvasText`
(`model/text/textLook.js`) return true for it, so the editor draws that text
box with the same canvas code as Export. Also clear its props in
`rasterizedTextPatch` (`render/bake.js`).

### ZEditor: add a keyboard shortcut

1. Handle the key in `state/useKeyboardShortcuts.js`. The handler always sees
   the latest state through a ref, so you don't need to worry about stale
   values.
2. Add a row to `ui/dialogs/shortcuts.js` so it shows in the shortcuts window.

### ZEditor: change the `.znow` project format

Edit `serializeProject` / `readProjectFile` in `io/projectFile.js`. **Older
files must keep opening.** Give new fields a fallback when they're missing,
and bump `version` only if old data has to be converted on load (see how
`legacyLayerOrder` handles version 1).

### ZEditor: change state or add a setting

Find the hook that owns that area (table in ARCHITECTURE.md), add the
`useState` there, and return it. If it's a document-wide setting a project
should remember, add it to `settingsForSave` / `applySavedSettings` in
`state/useViewSettings.js`.

**Changing `pages`:** call `history.recordUndoCheckpoint(key?)` **before**
the `setPages`, and never mutate: use `map` and spread. Undo relies on both.

### Markdown-to-PDF: add a typography setting

1. `settings/defaults.js`: add the default to `HARDCODED_FALLBACK_DEFAULTS`.
   Optionally also add it to `defaultConfig.json`.
2. `settings/normalizeConfig.js`: check and normalise the value.
3. If it's a true/false setting, add its key to `BOOLEAN_CONFIG_KEYS` in
   `settings/initialConfig.js`.
4. Add the control to the right `ui/typography/<Section>.jsx`, using the
   helpers in `ui/fields.jsx`.
5. Use it in `document/styleBlock.js` (or `toc.js` / `markers.js`).
6. Check both the live preview and Download PDF.

### Markdown-to-PDF: support another import format

Write `convert/<format>.js` (returning Markdown), then add the extension to
`documentToMarkdown`, `DOCUMENT_INPUT_ACCEPT` and `DOCUMENT_PICKER_TYPES` in
`editor/importDocument.js`. If it needs a CDN library, load it in
`index.html` and check for it with `convert/requireGlobal.js`.

### ZineArranger: fix or adjust one layout

Find the layout's key in `imposition/layouts.js`, for example
`"eighth/single/portrait/top"`, and edit its cells. Each cell reads
`"<position> [r] [cut/fold guides…] <page>"`:

- `r` means the page is printed upside down.
- The page is `s+k` / `e-k`: k pages after the sheet's first page, or before
  its last page.

Layouts that came out identical share one entry (see the aliases at the
bottom of the file), so an edit may affect several keys. Print a test zine
and fold it to check.

### ZineArranger: add a zine size

1. `sizes.js`: add a `SIZE_*` constant and its `SIZE_CHARS` prefix.
2. `sheetGrid.js`: add its grid (columns × rows for a portrait zine).
3. `imposition/layouts.js`: add an entry per combination you support
   (sides × orientation × spine), and its name in `SIZE_KEYS` in
   `imposition/impose.js`.
4. `index.html`: add a size radio button with an `onchange` handler.
5. `optionsPanel.js` / `readOptions.js`: add the handler and read the radio
   button.
6. `main.js`: add the handler to the `window` list.
7. `style.css`: add the grid's CSS class (the cell positions).

### Shared look and code

- **A colour or font for every app:** `shared/styles/tokens.css`.
- **Buttons, topbar, tabs, toggles everywhere:** `shared/styles/`.
  App-specific variants stay in each app's own CSS, which loads after the
  shared files.
- **Code more than one app needs:** put it in `shared/js/` and import it from
  an app's `src/` with a relative path. esbuild bundles it into each app.
- **Add an app to the launcher:** create `apps/<Folder>/index.html`, add
  `{ folder, desc }` to `config/apps-config.js`, and optionally add
  `apps/<Folder>/app-logo.png`. To build it from `src/`, add
  `src/main.js(x)` and `npm run build` picks it up.

---

## 6. Rules worth keeping

The full list is in [ARCHITECTURE.md](ARCHITECTURE.md). The ones most often
broken:

1. **Edit `src/`, never `dist/`.** Rebuild and commit both.
2. **One file, one job.** If a file can't be described in one line, split it.
   Update the file's first-line comment when its job changes.
3. **Imports point one way** (in ZEditor: model → render → io → state → ui).
   Pure logic never imports React or touches the page.
4. **Preview and export share one renderer.** Never draw something one way in
   the editor and another way in Export.
5. **State is immutable** in the React apps, and ZEditor records an undo
   checkpoint before each change to `pages`.
6. **Data over branches.** Option lists, effects, shortcuts and layouts are
   data tables. Add a row rather than another `if`.
7. **Everything must keep working from `file://`.** No `fetch()` of local
   files, no ES modules in the browser (the build exists for this), and no
   new CDN dependency without a good reason.

---

## 7. Testing and checking your change

There is no automated test suite. Check changes by hand, in the browser, on
the real feature.

- **Before committing:** run `npm run build`, then `npm run check`. Open each
  page you touched and look at the browser console. The three 404s for
  missing `app-logo.png` on the launcher are long-standing and harmless.
- **ZEditor:** make a blank document; add text, an image, a shape and a
  stroke. Try undo/redo, Save then reopen the `.znow`, and Export PDF, then
  open the PDF and compare it with the editor.
- **Markdown-to-PDF:** edit text and watch the preview. Change a setting in
  each Typography section. Download PDF and check the result.
- **ZineArranger:** load a multi-page PDF and try the sizes you touched,
  single and double-sided. Print preview, and for layout changes, print and
  fold one.
- **Hand-offs:** ZEditor or Markdown-to-PDF → Send to ZineArranger should
  open ZineArranger in a new tab with the PDF loaded (see §8 about test
  browsers).

**Refactoring safely** (how the big refactor was checked): before changing
how something works internally, record what the old code produces and
compare the new code against it.

- **Pure functions:** run both versions in Node over many inputs. The
  ZineArranger imposition was checked on 1.27 million option/page-count
  cases this way.
- **The UI:** compare a page's HTML or computed styles before and after in
  the browser.

---

## 8. Gotchas

- **Stale `dist/app.js`.** You edited `src/` but nothing changed: the build
  isn't running, or the browser cached the old script. Use `npm run watch`
  and hard-reload (Ctrl+Shift+R).
- **`file://` limits.** Pages opened from disk can't `fetch()` local files
  or load ES modules, which is why the apps are bundled and why
  `defaultConfig.json` and `sample.md` are scripts that set globals. Keep any
  new code within those limits.
- **Markdown-to-PDF needs internet.** Its libraries (marked, Paged.js,
  html2canvas, mammoth, …) come from CDNs.
- **Send to ZineArranger in test browsers.** Some embedded or test browsers
  open `window.open` in the *same* tab, so the hand-off can't finish there.
  Test in a normal browser.
- **pdf.js and hidden tabs.** pdf.js renders through animation frames, so in
  a background tab, or a browser pane that isn't visible, loading a PDF can
  appear to hang. Bring the window forward.
- **Line-ending warnings** (`LF will be replaced by CRLF`) on Windows are
  harmless, and `npm run check` ignores line endings.
- **Committing from PowerShell:** quotes inside `git commit -m "…"` get
  mangled. Write the message to a file and use `git commit -F <file>`.
- **CSS order matters.** Shared styles load first, then the app's own files
  in the order `index.html` lists them. ZEditor's `styles/*.css` are linked
  in cascade order, so later files win ties.
- **Global CSS from React.** Never use the CSS `background` shorthand
  together with `background-clip: text` in React inline styles; use
  `backgroundImage`. See HANDOFF.md for why.

---

## 9. Branches, backups and releasing

- `main` is the working version, and is what's on GitHub.
- Do larger changes on a branch (e.g. `refactor/...`). Run `npm run check`,
  test, then merge into `main` and push.
- The state before the 2026-11 modular refactor is kept as the tag
  `pre-modular-refactor` and the branch `backup/pre-modular-refactor`. To
  look at the old code:

  ```bash
  git switch backup/pre-modular-refactor
  ```

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Annotation / item** | Anything placed on a ZEditor page: text box, image, rectangle/ellipse, pen/highlighter stroke. Stored in `page.annotations`, bottom layer first. |
| **`.znow`** | A ZEditor project file: JSON with the source PDFs embedded (base64), pages, items and settings. |
| **Imposition** | Arranging a document's pages on printer sheets so that, after folding (and cutting), they read in order. |
| **Sheet / sheet side** | One piece of paper; double-sided layouts have two sides per sheet. |
| **Signature** | A group of sheets folded together and nested; long zines are split into several. |
| **`s` / `e` (in `layouts.js`)** | The first and last page a sheet holds within its signature; every cell's page is counted from one of them. |
| **Spec string** | ZineArranger's short layout name, e.g. `8-1ps` (eighth size, single-sided, portrait, side spine). |
| **Reverse Impose** | Turning an already-imposed booklet PDF back into pages in reading order. |
| **Hand-off** | Sending a PDF from ZEditor or Markdown-to-PDF straight into ZineArranger (`shared/js/zineArrangerHandoff.js`). |
| **Tool defaults** | The settings the next item a ZEditor tool makes will get (`state/useToolDefaults.js`). |
