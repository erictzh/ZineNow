# ZineNow — Architecture

How the code is organised, and the rules that keep it maintainable.
**Status** at the bottom records how the code got to this layout (the 2026-11
modular refactor, now complete). For day-to-day work (where to find things,
step-by-step recipes, gotchas) see **[MAINTAINING.md](MAINTAINING.md)**.

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
│  ├─ styles/                          Design tokens + shared components (buttons, topbar parts, tabs, toggle, scrollbars)
│  └─ js/                              Code more than one app uses: ZineArranger hand-off, download fallback
├─ tools/build.mjs                  Builds apps/<App>/src → apps/<App>/dist/app.js
├─ docs/                            This file
└─ apps/<App>/
   ├─ index.html                    Page shell only: library tags, CSS, dist/app.js
   ├─ dist/app.js                   Built output — do not edit
   ├─ styles/                       The app's CSS, split by area of the screen
   └─ src/                          The app's code (layout below)
```

### Shared code (`shared/`)

Only code that was identical in more than one app lives here; an app keeps
its own variant of anything that differs.

| File | Holds | Used by |
|---|---|---|
| `styles/tokens.css` | The `--ui-*` theme tokens and `--preview-bar` | every page |
| `styles/buttons.css` | Hollow `button`, `.btn-solid`, `.log-btn` | ZEditor, ZineArranger, Markdown-to-PDF |
| `styles/topbar.css` | Topbar brand, logo mark, title/subtitle, actions (each app styles the `.topbar` bar itself) | ZEditor, Markdown-to-PDF |
| `styles/tabs.css`, `styles/toggle.css` | Tabs; the toggle switch's track, knob and states (each app sets `.toggle-row` / `.toggle-switch`) | ZEditor, Markdown-to-PDF |
| `styles/scrollbars.css` | Thin custom scrollbars | ZEditor, Markdown-to-PDF, launcher |
| `js/zineArrangerHandoff.js` | The hand-off message types and `sendPdfToZineArranger(buildBytes, filename)` | ZEditor and Markdown-to-PDF send; ZineArranger receives |
| `js/download.js` | `downloadBlob(blob, filename)`, the fallback when there is no Save As dialog | ZEditor, Markdown-to-PDF |

Pages link the shared stylesheets they use **before** their own CSS, so an
app rule still wins a tie. App code imports shared JS by relative path
(`../../../../shared/js/...` from `src/<folder>/`); esbuild bundles it into
`dist/app.js`, so it still works on `file://`. Not shared, because the
copies differ: inputs, log output, the preview pane, `FontCombobox`
(ZEditor's can upload fonts), and ZEditor-only helpers such as base64.

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
| `useMagicErase` | the magic eraser's live preview: a click opens it, the Eraser panel's settings re-run it, Apply writes one undo step, Cancel/Undo drops it; the page draws the image from `preview` until then |
| `useKeyboardShortcuts` | keys and image paste; reads the latest state through a ref, so listeners are attached once and are never stale |

Where things went that might not be obvious:

- `model/edgeShapes.js` keeps each edge effect (rounded, ellipse, torn,
  scissor) together with the outline it draws; `model/imageEffects.js` holds
  the full effect list and picks an item's outline.
- **Typeset text.** A text box with justify, indents, paragraph spacing, the paragraph composer or hyphenation (`usesTypeset` in `model/text/textLook.js`) is broken into lines by `render/composer.js`, not by the plain wrapper. The composer is pure: it takes a `measure(string)` function and returns lines of positioned words, so the editor, Export and Rasterize draw the same lines. Such a box is always drawn on a canvas, even while editing: `AnnotationText` paints its own caret and selection from the composer's lines (`render/textCaret.js`) over an invisible `<textarea>` that only receives typing, IME input and the clipboard. Ransom, curve and stacked text keep their own layout. Paragraph sizes are stored in editor px but shown in pt (`ptToPx` / `pxToPt`; the page is shown at `MAIN_SCALE` px per pt).
- **Linked text styles.** A box keeps every look setting itself (so renderers don't know about styles); it also carries `styleName` and `styleOverrides` (the settings changed since it was styled). "Update style" rewrites the style and every box linked to it on every page, skipping each box's overrides. A style may be `basedOn` another and then stores only the difference (`null` removes a setting the base has). The style list is saved in the project file; undo restores the boxes but not the style list.
- **Columns and frames.** `columns`, `columnGap` and `frameHeight` (pt) turn a text box into a frame. The composer sets the text one column wide; `layoutText` then cuts the single long column into columns of one height (balanced when there's no frame height, else the frame's height) and offsets each line's `x`/`top`. Lines past the last column are `hidden` (not drawn, not clickable) and `overflow` shows the red + marker. A fixed-height frame can also align its lines to the Top/Centre/Bottom (`verticalAlign`, each column on its own) and draw a rule between columns (`columnRule`, `columnRuleWidth` in tenths of a pt; `columnRules` in `render/textRuns.js`, used by the canvas and the vector PDF).
- **The page's text is laid out together** (`resolvePageText(annotations)`, `render/pageText.js`). `layoutText` still sees one box, so this step turns the page's items into boxes that can each be drawn alone, and **everything that draws or measures text goes through it**: `ComposeCanvas` (editor), `renderPageToCanvas` (pictures, thumbnails), `io/pdfExport.js` (picture and vector text), the Format panel (App.jsx passes the resolved box), Ctrl+C. It's cached per annotations array, and returns the same array when nothing on the page threads or wraps. It adds props that are never stored (`RESOLVED_TEXT_PROPS` in `model/text/threads.js`; `handleUpdateAnnotation` strips them from patches).
- **Threaded frames** (`model/text/threads.js`). The head box holds the story (text, look, style); each follower has `threadFrom: <previous box id>` and no text, and keeps only `FRAME_PROPS` (position, width, frame height, columns...). `resolvePageText` gives each follower the head's look on its own frame with the rest of the story (`followerView`: text from `storyOffset` on, colour runs shifted, `storyContinues` when it starts mid-paragraph, so the composer skips the first-line indent), and gives every frame but the last `storyLength` (how much of its text fits; lines past it are hidden). Offsets are found by laying out each frame in turn at editor scale. Edits made through a follower are split by `routeFramePatch` in `state/useAnnotationEdits.js`: frame settings stay on the follower, text/colour runs/look go to the head (text = head text before the offset + the follower's new text). `removeWithThreads` keeps a chain together when frames are deleted. Link/Unlink: `state/textFrameActions.js`; ports (the + that links a new box): `AnnotationText`.
- **Text wrap** (`model/text/textWrap.js`). An image or shape with `textWrap` (`box` / `shape`) and `wrapOffset` (pt) is an obstacle: `wrapObstaclesFor` turns its outline (bounding box, ellipse, or an image's opaque rows from `render/wrapShapes.js`, which reads them in the background and calls `onWrapShapesChange` so the editor redraws; Export awaits `prepareWrapShapes`) into polygons in the text frame's coordinates, stored as `wrapObstacles` on the resolved frame. `layoutText` then uses `flowAroundObstacles`: the composer asks `slotFor(paragraph, line)` for each line's left edge and width (`freeSlot`: the widest free stretch of the column on that line's band), and `onParagraph` tells the flow where the next paragraph starts, so Knuth-Plass still sees each line's width in advance. Only text boxes with a set width that aren't rotated wrap.
- **Vector text in Export.** `io/pdfExport.js` still draws each page as a 200 DPI picture, but text boxes that can be real text (no effect with no PDF equivalent, font file reachable, nothing on top of them) are left out of that picture and written into the PDF with the font embedded (`io/vectorText.js`, pdf-lib + fontkit). Word positions come from `render/textRuns.js`, the same code the canvas renderer uses, so the two agree to within a pixel; a word is drawn in one piece when the PDF's own widths match the browser's, otherwise letter by letter at the browser's positions (that keeps kerning and tracking). Export reports what stayed a picture and why (the `notice` bar). `shared/vendor/fontkit/` is a vendored copy of `@pdf-lib/fontkit` (refresh it from `node_modules/@pdf-lib/fontkit/dist` after an update). `hyphen` is bundled into `dist/app.js` by esbuild.
- `render/textLayout.js` has `fitText` (shrink-to-fit has to measure text),
  and `render/itemGeometry.js` has `annotationBounds` / `rotatedAnnotation`
  (a text box's size comes from layout), so `model/` never measures text.
- The Format panel: `ui/panels/FormatPanel.jsx` only picks a panel —
  `format/TextFormat`, `ImageFormat`, `ShapeFormat`, `StrokeFormat`, `TraceFormat` (Vectorize) for a
  selected item, `format/ToolPanels` for a tool with nothing selected. Panels
  get the `useToolDefaults` object as `toolDefaults` rather than one prop per
  setting.
- The canvas: `ui/canvas/ComposeCanvas.jsx` routes mouse presses per tool;
  `usePageBackground` draws the page, `softEraseGesture.js` is the soft
  eraser, `SelectionTurn.jsx` the multi-item rotate knob, `AnnotationItem.jsx`
  picks the component per item type, `CanvasOverlays.jsx` holds the live
  stroke, brush cursor and guide/page-number previews.
- `ui/textSelection.js` is the small store that lets the Custom Text Style (span) panel
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
- [x] Shared CSS tokens/components and shared JS (`shared/styles`, `shared/js`): tokens, buttons, topbar parts, tabs, toggle and scrollbars, linked by every page that had a verbatim copy (every element's computed style identical before/after on all four pages); the ZineArranger hand-off and the download fallback in `shared/js/` (hand-off and Export PDF download produce the same file as before)
- [x] ZEditor split into `model/`, `render/`, `io/` and `ui/` (82 files; every statement moved byte-for-byte, only `import`/`export` lines added); `style.css` split into `styles/` (11 files, same 301 rules in the same order)
- [x] ZEditor `ui/App.jsx` split into 15 `state/` hooks (App.jsx 1,748 → 223 lines); PDF import/export, the `.znow` format and the ZineArranger hand-off moved to `io/`; Topbar, ToolBar and the live filter defs are their own components
- [x] ZEditor `FormatPanel.jsx` is now a router over one panel per item type plus the tool panels (`ui/panels/format/`); `ComposeCanvas.jsx` (517 → 253 lines) delegates the page background, soft-eraser gesture, selection rotate knob, per-type item rendering and page overlays to their own files
- [x] Markdown-to-PDF moved to `src/`: `App.jsx` converted back to JSX by a codemod (compiles to the identical program); `pdfGenerator.js` and `App.jsx` split into 36 files; the Sidebar broken into tabs and sections, with shared file-dialog helpers. Preview document and sidebar HTML verified identical to the old version.
- [x] ZineArranger moved to `src/` (14 files, ~30 globals into one `state`); the 4,770-line imposition function replaced by `layouts.js` data + `impose()` + `sheetsHtml()`, identical on all 1,267,712 checked cases and in the browser against the old page
- [x] ZineArranger `refreshSpecs` split: `readOptions.js` (form → state, spec string), `sheetGrid.js` (pure: grid, pages per sheet, paper orientation per size — replaces a 130-line switch, identical on all 80 combinations), `sheetSizes.js` (on-screen sizes, CSS variables); `optionsPanel.js` 480 → 188 lines; browser output identical to the pre-refactor page in 9 scenarios
- [x] Launcher moved to `launcher/` (`launcher.js`, `launcher.css`, `bg.jpg`; `index.html` stays at the root so app links are unchanged)

The last state before this refactor is tagged `pre-modular-refactor`.
