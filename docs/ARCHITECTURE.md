# ZineNow — Architecture

How the code is organised, and the rules that keep it maintainable. The
refactor towards this layout is in progress; **Status** at the bottom says
what has moved so far.

## Running and building

The apps are still plain files: open `index.html` (or any app's
`index.html`) straight from disk, or through any static server. Nothing has
to be built to *use* them, because each app's built file `dist/app.js` is
committed.

Building is only needed to *change* an app that has a `src/` folder:

```bash
npm install          # once: installs esbuild (the only dependency)
npm run watch        # rebuilds dist/app.js on every save while you work
npm run build        # one-off build of every app
npm run check        # fails if a committed dist/app.js is out of date
```

Edit `src/`, never `dist/`. Commit `src/` and the rebuilt `dist/app.js`
together. `npm run check` catches a forgotten rebuild.

**Why a build step at all?** Browsers block `import` between files on
`file://` pages, and in-browser Babel can't fetch separate files there
either. So `tools/build.mjs` joins an app's many small source files into one
classic script, which works on `file://`. It also means Babel no longer runs
in the browser, so the apps start faster.

React, ReactDOM, pdf.js (`pdfjsLib`) and pdf-lib (`PDFLib`) stay globals
loaded by each page's own `<script>` tags; bundles contain only app code.

## Folder layout (target)

```
ZineNow/
├─ index.html, config/, launcher/   Launcher page (app grid, readme sidebar)
├─ shared/
│  ├─ vendor/pdfjs/, vendor/pdf-lib/   One copy of each library for all apps
│  ├─ styles/                          Design tokens + shared components (buttons, toggle, topbar, modal)
│  └─ js/                              Code more than one app uses: ZineArranger hand-off, file saving, base64, font picker
├─ tools/build.mjs                  Builds apps/<App>/src → apps/<App>/dist/app.js
├─ docs/                            This file
└─ apps/<App>/
   ├─ index.html                    Page shell only: library tags, CSS, dist/app.js
   ├─ dist/app.js                   Built output — do not edit
   ├─ styles/                       The app's CSS, split by area of the screen
   └─ src/                          The app's code (layout below)
```

### ZEditor `src/` (target)

| Folder | Holds | May import |
|---|---|---|
| `model/` | Pure data and rules: geometry, annotations, groups, control/effect definitions, filter settings, text looks, colour runs, text styles, page numbers, guides, document title. No React, no canvas, no DOM. | `model/` |
| `render/` | Canvas drawing shared by the live editor and Export, so both always match: colour helpers, outlines, gradients, filters (halftone, colour remap, xerox), text layout and drawing, images, shapes, box effects, baking items to images, whole-page rendering. | `model/`, `render/` |
| `io/` | Getting things in and out: PDF import, PDF export, the `.znow` project format, custom fonts. | the above |
| `state/` | React hooks that own the app's state, replacing today's single `App`: history (undo/redo), document, selection, tools, view settings, project (save/load/title), export, keyboard shortcuts. | the above |
| `ui/` | Components only: `App.jsx` wires hooks to layout; `topbar/`, `sidebar/`, `canvas/`, `panels/`, `settings/`, `controls/`, `dialogs/`. | everything |

Every file starts with a one-line comment saying what it is responsible
for — read those to find your way around. `constants.js` (scales, paper
presets, zoom, export DPI) sits at the top and counts as `model/`.

**How the state hooks fit together.** `ui/App.jsx` creates them in order and
passes each the ones it builds on, as plain objects:

| Hook | Owns |
|---|---|
| `useStatus` | `loading`, `errorMsg` |
| `useDocumentState` | `pages`, page selection, `pdfDocsRef`, id counters, `pageSizeRef` |
| `useHistory` | undo/redo; call `recordUndoCheckpoint(key?)` **before** a mutating `setPages` |
| `useViewSettings` | guides, center guide, page numbers, onion skin, Layers panel; what a project saves |
| `useToolDefaults` | each tool's settings for the next item, font list, saved text styles |
| `useSelection` | current tool, selected items, text being edited, crop mode, page selection |
| `useAnnotationEdits` | every change to items, plus the page filter |
| `usePageOps` | rotate, insert blank, delete, reorder pages |
| `useProject` | title, Save / Save As, opening `.znow`, the remembered file |
| `useDialogs` | New Document, shortcuts, two-step erase confirmation |
| `useDocumentFiles` | Load PDF, new blank document, Insert PDF |
| `useExport` | Export PDF, Send to ZineArranger |
| `useZoom`, `useOnionGhost` | zoom with the view centre kept in place; the previous-page ghost |
| `useKeyboardShortcuts` | keys and image paste; reads the latest state through a ref, so listeners are attached once and are never stale |

Where things went that might not be obvious:

- `model/edgeShapes.js` keeps each edge effect (rounded, ellipse, torn,
  scissor) together with the outline it draws; `model/imageEffects.js` holds
  the full effect list and picks an item's outline.
- `render/textLayout.js` has `fitText` (shrink-to-fit has to measure text),
  and `render/itemGeometry.js` has `annotationBounds` / `rotatedAnnotation`
  (a text box's size comes from layout), so `model/` never measures text.
- The Format panel: `ui/panels/FormatPanel.jsx` only picks a panel —
  `format/TextFormat`, `ImageFormat`, `ShapeFormat`, `StrokeFormat` for a
  selected item, `format/ToolPanels` for a tool with nothing selected. Panels
  get the `useToolDefaults` object as `toolDefaults` rather than one prop per
  setting.
- The canvas: `ui/canvas/ComposeCanvas.jsx` routes mouse presses per tool;
  `usePageBackground` draws the page, `softEraseGesture.js` is the soft
  eraser, `SelectionTurn.jsx` the multi-item rotate knob, `AnnotationItem.jsx`
  picks the component per item type, `CanvasOverlays.jsx` holds the live
  stroke, brush cursor and guide/page-number previews.
- `ui/textSelection.js` is the small store that lets the Letter Colours panel
  colour the text selection after the text box has lost focus.

ZEditor's CSS is in `apps/ZEditor/styles/`, linked from `index.html` in
cascade order (later files win ties). Each file is one contiguous part of
the old `style.css`, so keep new rules in the file for their area and mind
the order if a rule must override another file's.

### ZineArranger `src/`

Plain JavaScript (no React).

| File | Holds |
|---|---|
| `state.js` | Every value that changes: the chosen options, computed sheet/page sizes, UI flags (was ~30 globals). |
| `sizes.js` | Zine sizes and the automatic signature-size cap. |
| `optionsPanel.js` | Tabs, size buttons, paper presets, the Reverse Impose toggle, and `refreshSpecs` (the short list of steps that re-lays out after any option change). |
| `readOptions.js` | Reads every option from the form into `state`; the spec string (`8-1ps`). |
| `sheetGrid.js` | Pure: for a size and options, the page grid on a sheet, pages per sheet, and paper orientation. |
| `sheetSizes.js` | On-screen sheet/page sizes from the paper size and grid; the CSS variables preview and print use. |
| `loadPdf.js` | Loads the PDF and draws each page into its canvas cell. |
| `imposition/layouts.js` | **Data**: for each size × sides × orientation × spine (× copy), which page goes in which cell, rotation and guide lines. Format documented at the top of the file. |
| `imposition/impose.js` | Pure: options + page count → padded page count and sheets of cells. |
| `imposition/sheetsHtml.js` | Sheets → the preview/print HTML. |
| `imposition/arrangeZineSheets.js`, `signatures.js` | Glue (state → impose → DOM) and sheets-per-signature. |
| `reverseImpose.js`, `pageRange.js`, `print.js`, `activityLog.js` | De-imposing, page ranges, print orientation/size, the log panel. |
| `main.js` | Startup, the ZEditor hand-off receiver, and `window` exposure of the functions `index.html`'s `onclick`/`onchange` attributes call. |

To change a layout, edit its entry in `layouts.js`. `layouts.js` was
extracted from the original hand-written code by running it, and
`impose()` was checked to produce byte-identical HTML, page counts and
print orientation for every option combination (10 sizes × sides ×
orientation × spine × copy × flip × 8 guide combinations × 8 signature
sizes × page counts 0–300: 1,267,712 cases, 0 differences).

### Markdown-to-PDF `src/`

| Folder | Holds |
|---|---|
| `settings/` | Paper sizes, defaults (merged with `defaultConfig.json`), font stacks; `normalizeConfig`; the editor's starting settings; reading/naming settings files. Imports only `settings/`. |
| `document/` | Markdown → the HTML document: editor markers (`\pagebreak`, `\space{n}`, `\toc`), CSS (`styleBlock.js`), fonts, ToC, assembly, and the Paged.js preview document. |
| `convert/` | Other formats → Markdown: docx, epub, muse, HTML. |
| `export/` | Download PDF (browser print engine) and the rasterised document for Send to ZineArranger. |
| `io/` | Native Open/Save dialogs with fallbacks, and copying text. |
| `editor/` | Editor actions as plain functions: inserting a marker line, importing a document. |
| `ui/` | `App.jsx` (state, export, hand-off, layout), `Header`, `PreviewCanvas`, `Sidebar` (just the two tabs), `editor/EditorTab`, `typography/` (one file per settings section, plus `ConfigFiles`), `fields.jsx`, `FontCombobox`. |

`defaultConfig.json` and `sample.md` stay plain `<script>` files (globals
`MD2eBookDefaultConfig`, `MD2eBookSampleMarkdown`) loaded before
`dist/app.js`, so defaults and the sample text can be edited without a build.

## Rules

1. **One file, one reason to change.** If a file can't be described in one
   line, split it.
2. **Dependencies point one way**: model → render → io → state → ui. Pure
   logic never imports React or touches the DOM.
3. **Preview and export share one renderer.** Anything that must look the
   same on screen and in the PDF lives in `render/` and is used by both.
4. **Data over branches.** Settings lists, effects, imposition layouts and
   keyboard shortcuts are data tables that code reads, not chains of `if`s.
5. **~400 lines is a signal** to split a file.
6. **State stays immutable** (`map` / spread, never mutate). Undo snapshots
   depend on it.

## Status

- [x] Build step (`package.json`, `tools/build.mjs`, `npm run build/watch/check`)
- [x] One shared copy of pdf.js and pdf-lib in `shared/vendor/`
- [x] ZEditor's code moved, unchanged, from inline `<script type="text/babel">` to `src/main.jsx` (built to `dist/app.js`; Babel removed)
- [ ] Shared CSS tokens/components and shared JS (`shared/styles`, `shared/js`)
- [x] ZEditor split into `model/`, `render/`, `io/` and `ui/` (82 files; every statement moved byte-for-byte, only `import`/`export` lines added); `style.css` split into `styles/` (11 files, same 301 rules in the same order)
- [x] ZEditor `ui/App.jsx` split into 15 `state/` hooks (App.jsx 1,748 → 223 lines); PDF import/export, the `.znow` format and the ZineArranger hand-off moved to `io/`; Topbar, ToolBar and the live filter defs are their own components
- [x] ZEditor `FormatPanel.jsx` is now a router over one panel per item type plus the tool panels (`ui/panels/format/`); `ComposeCanvas.jsx` (517 → 253 lines) delegates the page background, soft-eraser gesture, selection rotate knob, per-type item rendering and page overlays to their own files
- [x] Markdown-to-PDF moved to `src/`: `App.jsx` converted back to JSX by a codemod (compiles to the identical program); `pdfGenerator.js` and `App.jsx` split into 36 files; the Sidebar broken into tabs and sections, with shared file-dialog helpers. Preview document and sidebar HTML verified identical to the old version.
- [x] ZineArranger moved to `src/` (14 files, ~30 globals into one `state`); the 4,770-line imposition function replaced by `layouts.js` data + `impose()` + `sheetsHtml()`, identical on all 1,267,712 checked cases and in the browser against the old page
- [x] ZineArranger `refreshSpecs` split: `readOptions.js` (form → state, spec string), `sheetGrid.js` (pure: grid, pages per sheet, paper orientation per size — replaces a 130-line switch, identical on all 80 combinations), `sheetSizes.js` (on-screen sizes, CSS variables); `optionsPanel.js` 480 → 188 lines; browser output identical to the pre-refactor page in 9 scenarios
- [x] Launcher moved to `launcher/` (`launcher.js`, `launcher.css`, `bg.jpg`; `index.html` stays at the root so app links are unchanged)

The last state before this refactor is tagged `pre-modular-refactor`.
