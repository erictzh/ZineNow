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

Where things went that might not be obvious:

- `model/edgeShapes.js` keeps each edge effect (rounded, ellipse, torn,
  scissor) together with the outline it draws; `model/imageEffects.js` holds
  the full effect list and picks an item's outline.
- `render/textLayout.js` has `fitText` (shrink-to-fit has to measure text),
  and `render/itemGeometry.js` has `annotationBounds` / `rotatedAnnotation`
  (a text box's size comes from layout), so `model/` never measures text.
- `ui/textSelection.js` is the small store that lets the Letter Colours panel
  colour the text selection after the text box has lost focus.

ZEditor's CSS is in `apps/ZEditor/styles/`, linked from `index.html` in
cascade order (later files win ties). Each file is one contiguous part of
the old `style.css`, so keep new rules in the file for their area and mind
the order if a rule must override another file's.

### ZineArranger `src/` (target)

`state.js` (all options in one object instead of ~30 globals),
`paperSizes.js`, `pageRange.js`, `imposition/` (`signatures.js`,
`layouts.js` — a data table of which page goes in which cell for each size ×
sides × orientation × spine side — and `impose.js`, a pure function from
options + page count to sheets), `render/` (`sheetsDom.js`,
`guideClasses.js`, `pdfPages.js`), `reverseImpose.js`, `optionsPanel.js`,
`print.js`, `activityLog.js`, `main.js`.

### Markdown-to-PDF `src/` (target)

`ui/` (Header, Sidebar, PreviewCanvas, fields), `editor/` (insert actions,
document import, Markdown file), `settings/` (config file,
`normalizeConfig`), `document/` (Markdown → HTML, style block, ToC,
document assembly), `export/` (print export, raster export for
ZineArranger), `convert/` (docx, epub, muse, HTML → Markdown), `App.jsx`,
`main.jsx`.

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
- [ ] ZEditor `ui/App.jsx` (~1,750 lines, all app state) split into `state/` hooks; `ComposeCanvas.jsx` and `FormatPanel.jsx` broken up further (these change code, so they go one at a time with a browser check each)
- [ ] Markdown-to-PDF moved to `src/` (JSX source instead of the hand-converted `App.jsx`), `pdfGenerator.js` split
- [ ] ZineArranger moved to `src/`; imposition rewritten as layout table + pure `impose()` (check every layout's page order against the old code first)
- [ ] Launcher moved to `launcher/`

The last state before this refactor is tagged `pre-modular-refactor`.
