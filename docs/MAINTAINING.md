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
│  ├─ ZineArranger/         index.html · style.css · src/ · dist/
│  └─ (each app also has)   manifest.webmanifest · sw.js · icons/  (installable app / offline, see §5 "Offline / PWA")
├─ shared/
│  ├─ vendor/               pdf.js and pdf-lib, one copy for every app
│  ├─ styles/               tokens.css (colours, fonts) and shared components: buttons, topbar, tabs, toggle, scrollbars
│  └─ js/                   zineArrangerHandoff.js (send a PDF to ZineArranger), download.js (download fallback),
│                           pwa/ (service-worker core and registration; plain scripts, not bundled)
├─ tools/build.mjs          The build: each apps/<App>/src/main.js(x) → apps/<App>/dist/app.js
├─ tools/pwa-icons.*        Redraws the apps' PWA icons from their logo badges (node tools/pwa-icons.mjs)
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
| Print typography (justify, indents, paragraph spacing, line breaking, hyphenation hook) | the composer: `render/composer.js` (pure; breaks text into lines of positioned words); the box's settings: `model/text/textLook.js` (`usesTypeset`) and the Paragraph section in `ui/panels/format/TextFormat.jsx`; caret, selection and clicking in such a box: `render/textCaret.js` and the `typesetEditing` code in `ui/canvas/AnnotationText.jsx`; hyphenation: `render/hyphenation.js` (English patterns from the `hyphen` package, bundled) |
| Text styles (linked: a box follows its style; Update style restyles every linked box) | model: `model/text/textStyles.js` (`resolvedStyleProps`, `styleDiff`, `withStyleOverrides`, `relinkPatch`); handlers: `styleActions` in `state/useAnnotationEdits.js` and the style list in `state/useToolDefaults.js`; panel: `ui/panels/TextStyles.jsx` |
| Columns and fixed-height text frames | layout in `render/textLayout.js` (the `columns` / `frameHeight` block: lines are cut into columns, extra lines are `hidden`), settings `COLUMN_CONTROLS` in `model/text/textControls.js`, red + overflow marker in `ui/canvas/AnnotationText.jsx`, column-aware clicking in `render/textCaret.js`; vertical align (its buttons are in the Text/Character section, `ui/panels/TextBasicSection.jsx`) and the column rule: the end of `layoutText` and `columnRules` in `render/textRuns.js`; frame-height handle: `startResize` ("s") in `ui/canvas/AnnotationText.jsx` |
| Threaded frames (text continuing from one box into the next) | model: `model/text/threads.js` (chains, which settings are per frame, routing edits, deleting); layout across frames: `render/pageText.js`; Link/Unlink: `state/textFrameActions.js`; dotted lines between linked frames: `threadLinks` in `model/text/threads.js`, drawn by `ui/canvas/ThreadLinks.jsx` (its ✂ at the middle unlinks); routing in `patchedAnnotations` (`state/useAnnotationEdits.js`); ports: `ui/canvas/AnnotationText.jsx` |
| Custom Text Style (span): restyling selected letters (colour, font, size, bold, italic, underline, strike) and per-paragraph align | spans (stored as `colorRuns`): `model/text/colorRuns.js` (`setRunProps`); measuring in each span's font: `measure(s, at)` / `fontAt` in `render/textLayout.js` (spans with a font, size, bold, italic or align switch the box to the composer; a line grows to fit a bigger span: `height` / `baseShift` on the composer lines); drawing: `layoutPlainRuns` (`render/textRuns.js`) and `withRun` in `render/drawText.js`; panel: `ui/panels/TextSpans.jsx`. Vector PDF export keeps boxes with mixed fonts as pictures (`io/vectorText.js`) |
| Placeholder text (lorem ipsum, 中文假文) | generator: `model/text/placeholderText.js`; panel: `ui/panels/TextPlaceholder.jsx` |
| Text wrap around images and shapes | settings and geometry: `model/text/textWrap.js`; image shapes: `render/wrapShapes.js`; line placement: `flowAroundObstacles` in `render/textLayout.js` (+ the composer's `slotFor`); panel: `ui/panels/TextWrapSection.jsx` |
| Anything that draws or measures a page's text | go through `resolvePageText` (`render/pageText.js`) first, or threads and wrap will be missing |
| Real (vector) text in the exported PDF | `io/vectorText.js` (which boxes qualify, why others stay pictures, drawing them with pdf-lib), `io/fontFiles.js` (finding a font's file: uploaded fonts, or system fonts once "Load Local System Fonts" was allowed), wired in `io/pdfExport.js`; the words' positions come from `render/textRuns.js`, shared with the canvas renderer |
| Rectangles/ellipses, pen/highlighter | `model/rect.js`, `model/strokes.js`, `render/drawShapes.js` |
| Ai Tools (Local): remove an object from a picture with an on-device AI model (MI-GAN via ONNX Runtime Web) | `apps/AiToolsLocal/`: UI `src/main.js`; picture maths (pure, tested in `tests/aitools-fill.test.js`) `src/fill.js`; model session `src/runtime.js`; model download/cache `src/modelStore.js` |
| Marquee shapes (Rectangle, Polygon, Brush) and what they feed | regions and helpers: `model/marquee.js`; drawing them: `ui/canvas/marqueeGesture.js`, `ui/canvas/MarqueeOverlay.jsx`; turning any region into pixels: `render/regionArea.js` (`areaFromRegion`, `paintArea`, `mapAreaToImage`), used by `render/marqueeLayer.js` (Make layer, cut, fills) and `render/aiFill.js`; a new shape only has to make a region and an area |
| Vectorize (an image → a `"trace"` layer of filled shapes, like Illustrator's Image Trace; called Image Trace in older notes) | tracer (pure, tested in `tests/imageTrace.test.js`): `model/trace/` (`quantize.js` → `contours.js` → `curves.js`, run by `traceImage.js`; presets and panel controls in `traceSettings.js`; the layer's fields, recolour and Expand in `traceLayer.js`); source picture and running it: `render/traceSource.js`; drawing: `render/drawTrace.js` (canvas) and `ui/canvas/TraceSvg.jsx` (editor); live re-trace, recolour, Expand, Rasterize: `state/useImageTrace.js`; panels: `ui/panels/format/TraceFormat.jsx` and the Image Trace section in `ImageFormat.jsx` |
| Erasers (stroke, soft, magic) | settings: `model/softEraser.js`, `model/magicEraser.js`; pixels: `render/softErase.js`, `render/magicErase.js`; mouse: `ui/canvas/softEraseGesture.js`, `ui/canvas/magicEraseGesture.js`; magic preview session (Apply/Cancel): `state/useMagicErase.js`; panel: `EraserToolPanel` in `ui/panels/format/ToolPanels.jsx` |
| What Export PDF produces | `io/pdfExport.js` → `render/pageRender.js` (draws a whole page) |
| Export selected layers as SVG (Export menu, and Save as SVG in the Vectorize panel) | `io/svgExport.js` (`layersToSvg`: vectorized layers, rectangles/ellipses incl. gradients and Stroke, pen strokes as vectors; plain text as live `<text>`; photos and anything with an effect SVG can't hold as an embedded picture via `render/bake.js`; cropped to the layers, a vectorized layer to its visible shapes via `traceContentBounds`), wired in `state/useExport.js` (`handleExportSvg`); tests `tests/svgExport.test.js` |
| Export page(s) as JPG / transparent PNG | `io/imageExport.js` (one page at the same 200 DPI), wired in `state/useExport.js` (the menu offers "this page"; `handleExportAllImages` does every page but has no menu item at the moment: the folder picker where the browser has one, else one download per page; file names from `pageImageFileName` in `model/documentTitle.js`); the transparent PNG is `renderPageToCanvas(..., transparent)` in `render/pageRender.js` (no white paper; a blank page skips the page filter, since several filters paint a white sheet) |
| Resizing the side panels by dragging the line next to them | ZEditor: `ui/PanelResizer.jsx` (the Pages and Format panels' widths are the CSS variables in `styles/base.css`; the lines are in `styles/layout.css`). ZineArranger: `src/panelResize.js`. Md to PDF: `src/ui/PanelResizer.jsx`. Each remembers its width in localStorage and resets on double-click |
| The `.znow` project format | `io/projectFile.js` |
| Opening / inserting PDFs | `io/pdfImport.js`, `state/useDocumentFiles.js` |
| Undo/redo | `state/useHistory.js` |
| The Layers panel (groups shown as foldable, renamable rows with their layers indented; delete) | `ui/panels/LayersPanel.jsx` (`layerBlocks`, `groupBlock`); a group's name is `groupName` on each member, set by `handleRenameGroup`; lock/hide a whole group: `handleSetGroupFlag` (both in `state/useAnnotationEdits.js`) |
| Rulers and ruler guides (drag out of the rulers, snap items to them) | units, ticks, snapping: `model/rulers.js`; rulers and guide dragging: `ui/canvas/Rulers.jsx`; snapping a moved item: `pressAnnotation` in `ui/canvas/ComposeCanvas.jsx`; state (saved with the project): `useViewSettings.js`; settings: Page menu → Rulers & Guides (`ui/settings/RulersSettings.jsx`) |
| Reload button (top bar: reloads the code, keeps the open project) | `reloadKeepingWork` in `state/useProject.js`, storage in `io/reloadSnapshot.js` (IndexedDB) |
| Number boxes (all apps: clearing a box, ( number )( − )( + ) buttons beside every box) | `shared/js/numberFields.js` (behaviour, installed in each app's `main`) + `shared/styles/numberFields.css`; React apps use `<NumberBox>` from `shared/js/NumberBox.jsx` instead of `<input type="number">` (a raw one gets no buttons); plain pages call `wrapNumberInput`; a box that means "empty" needs `data-allow-empty`; where a box has a width of its own, the app's CSS gives its `.zn-num` wrapper `width: auto` |
| Display gear (all apps: interface size, show/hide panels, etc.) | `shared/js/displaySettings.js` + `shared/styles/displaySettings.css`; each app lists its settings in `src/ui/displaySettings.js` (ZEditor, Markdown-to-PDF) or `src/displaySettings.js` (ZineArranger), and its CSS says what each class/variable does (`styles/display.css`, end of `styles.css` / `style.css`) |
| "Leave page?" warning (all apps) | `shared/js/leaveWarning.js`; each app says when it has work: `useProject.js` (ZEditor), `ui/App.jsx` (Markdown-to-PDF), `main.js` (ZineArranger) |
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

### Offline / PWA: installable apps

Each app is an installable Progressive Web App when served over http(s)
(the live site, or the dev server). Opened from disk (`file://`) nothing
PWA-related runs and nothing is logged.

**The pieces**

- `apps/<App>/manifest.webmanifest`: name, `start_url`/`scope` = the app's
  own folder, `standalone`, dark theme colour `#171312`, icons in
  `apps/<App>/icons/` (192, 512 and a maskable 512). The icons are drawn
  from the top-bar logo badge by `tools/pwa-icons.html`; rerun
  `node tools/pwa-icons.mjs` (needs Chrome or Edge) if a logo mark changes.
- `apps/<App>/index.html` has `theme-color`, the icon links and
  `<script src="../../shared/js/pwa/register.js" defer>`. That script adds
  the `<link rel="manifest">` and registers `sw.js` only under http(s): a
  static manifest link would make Chrome try (and fail, with a CORS error)
  to fetch it from `file://`.
- `apps/<App>/sw.js` lists the app's files (`FILES`, must all exist or
  install fails) and the CDN libraries it loads (`CDN`, best effort), then
  calls the shared logic in `shared/js/pwa/sw-core.js`.

**How updates reach users.** Same-origin files (HTML, `dist/app.js`, CSS,
`shared/`) are fetched **network first**; the cache is only the offline
fallback, or the answer if the network takes over 4 s and a cached copy
exists. So an ordinary deploy needs no SW change. `sw.js` and
`sw-core.js` are checked against the server on every visit
(`updateViaCache: "none"`), and a changed worker takes over at once
(`skipWaiting` + `clients.claim`).

**When to bump `CACHE_VERSION`** in an app's `sw.js`: when you add,
rename or remove a file the page loads (a new stylesheet, a new CDN
library, a new vendor file), update `FILES`/`CDN` and bump the number.
Old caches for that app (`zinenow-<app>-v*`) are deleted on activate.
A file missing from the lists is still cached the first time a controlled
page loads it, so forgetting one only costs offline coverage until it's used once.

**CDN scripts.** Pinned CDN URLs (React on unpkg, marked, mammoth, turndown,
jszip, pdf-lib, DOMPurify, Paged.js, html2canvas on jsdelivr) are cached at
install and served cache first. Unpinned ones (`cdn.tailwindcss.com`,
Google Fonts CSS) are served from cache and refreshed in the background.
After the first load, `register.js` also sends the worker every URL the page
fetched before it was controlled (fonts, scripts), so those get cached too.
Only these hosts are touched: unpkg.com, cdn.jsdelivr.net,
cdn.tailwindcss.com, fonts.googleapis.com, fonts.gstatic.com.

**What works offline** (after one online visit to *that* app; each app has
its own worker and cache):

- All three apps open and render; ZEditor and ZineArranger are fully
  local (pdf.js, pdf-lib, fontkit are in `shared/vendor`), so loading,
  editing, export and print work offline.
- Markdown-to-PDF: editor, Download PDF (browser print), import of
  .docx/.epub, Send to ZineArranger (if ZineArranger was also visited
  online once).

**What still needs (or may need) a connection**

- Markdown-to-PDF's **live preview** runs in a sandboxed iframe without
  `allow-same-origin`, which a service worker can't control. Its Paged.js
  and Google Fonts come from the browser's ordinary HTTP cache instead:
  in testing the preview still paginated offline, but once the browser
  evicts that cache the preview can't paginate until you're online again.
- **Google Fonts** chosen in Markdown-to-PDF's typography settings that
  were never loaded online: they fall back to system fonts offline.
- Opening an app for the first time, or a CDN library the worker failed to
  fetch at install.

**Testing it.** Serve the repo (`.claude/launch.json`'s `zinenow` config,
or `npx http-server -p 8765 -c-1`), open an app, then in Chrome DevTools →
Application check Manifest (no errors) and Service workers (activated). Tick
Network → Offline and reload: the app should still open. Also open each
`index.html` from disk and check the console stays clean. To reset, use
Application → Storage → Clear site data.

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

`npm test` runs the Node tests in `tests/*.test.js` (ZEditor's text composer,
caret, styles, hyphenation, threaded frames, text wrap, and the page-level text
layout with a fake canvas). They cover pure logic only, so also check changes
by hand, in the browser, on the real feature.

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
- **Markdown-to-PDF needs internet the first time.** Its libraries (marked,
  Paged.js, html2canvas, mammoth, …) come from CDNs. Over http(s) its service
  worker caches them after one visit (see §5 "Offline / PWA"); from
  `file://` there is no service worker, so it needs internet every time.
- **"My change doesn't show up" on the live site / dev server.** The service
  worker is network first, so this is rarely it, but to rule it out:
  DevTools → Application → Service workers → Unregister, or Clear site data.
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
