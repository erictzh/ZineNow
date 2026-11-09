# ZineNow — Context & Handoff

Read this first when resuming on another machine. It covers what the project is, how it's built, what was done, what's pending, and the testing gotchas that cost the most time.

Last updated: 2026-09-19.

## 1. Project overview

ZineNow is a suite of zero-build, browser-only tools for making zines. Everything is static files — no npm, no bundler. Open via `file://` or any static server.

| App | Path | Purpose |
|---|---|---|
| ZEditor | `apps/ZEditor/index.html` + `style.css` | Edit PDF pages: text, images, drawing, filters, page management. Saves editable `.znow` projects. |
| ZineArranger | `apps/ZineArranger/index.html` | Imposes a multi-page PDF into a printable zine booklet. |
| Md to PDF Converter | `apps/Markdown-to-PDF/` | Markdown → paginated PDF eBook. |
| Launcher | `index.html`, `app.js`, `style.css`, `bg.jpg` (root) | Landing page linking to the apps. (`app-logo.png` referenced by it is missing — pre-existing 404, harmless.) |

## 2. Architecture notes per app

### ZEditor (single ~3400-line file)
- React + Babel Standalone in one `<script type="text/babel">`. Local vendored `pdfjs/` (rendering) and `pdf-lib/` (export).
- **State is immutable everywhere** (`.map` / spread, never mutate). Undo snapshots rely on this for structural sharing — keep it that way.
- Page object: `{ key, docId, pageNumber, rotation, dataUrl, isBlank, annotations, filter }`. Blank pages have `width/height` instead of `docId/pageNumber`.
- `pdfDocsRef.current` = `{ docId: { doc, bytes } }` — multiple source PDFs can be loaded (Insert PDF). Use `docFor(pdfDocsRef, page)`.
- Undo/redo: call `recordUndoCheckpoint(coalesceKey?)` BEFORE a mutating `setPages`. Same key within `UNDO_COALESCE_MS` (700ms) merges into one step. Thumbnails (`dataUrl`) are stripped from snapshots and regenerated.
- Annotations: types `text`, `image`, `rect`, `stroke`. Edited through `updateAnnotationsFor(pageIdx, updater, coalesceKey)`. The `page.annotations` array is the stacking order (first = bottom), for both the editor and export; `.znow` files older than version 2 are re-sorted on load. `hidden` and `locked` items can't be selected.
- **Filters (grayscale/duotone/halftone) are per-page** (`page.filter`, default `DEFAULT_PAGE_FILTER = {type:"none"}`), edited via `updatePageFilter(pageIdx, patch)`. Images have their own `ann.filter` (`match` = follow the page's filter). Both preview and export read `page.filter`.
- Export: `buildExportPdfBytes()` renders every page to canvas (`renderPageToCanvas`) and embeds PNGs via pdf-lib.
- Project file `.znow` = JSON (base64-embedded source PDFs + pages minus thumbnails + settings). Self-contained; thumbnails regenerated on load.
- Selection model: primary `selectedIdx` / `selectedAnnId` + secondary arrays `selectedPageIndices` / `selectedAnnIds` (Shift+Click multi-select).
- Keyboard shortcuts (window `keydown` effect): Delete, Space=Select, T, I, H, D=Draw, Ctrl+Z/Y, Ctrl+R (rotate), Ctrl+C/V (internal annotation copy/paste), ArrowUp/Down (page nav), Escape (leave text editing but keep selected). A separate `paste` listener handles pasting an image from the system clipboard.
- Page reorder in the sidebar uses native HTML5 drag-and-drop (`Sidebar` → `dragHandlersFor`); annotation dragging uses manual mouse listeners — different mechanisms.

### Md to PDF Converter
- **`App.jsx` is precompiled plain JS — `React.createElement(...)`, NOT JSX.** There is no Babel here. Edit it as plain JS or the page silently breaks.
- Normal export (`exportToPdf` in `pdfGenerator.js`) uses the browser's native print dialog (`window.print()` in a hidden iframe). It never yields PDF bytes in JS — the code comments explain it deliberately avoids html2canvas.
- Live preview: `renderHtmlDocument()` in a `sandbox="allow-scripts"` iframe (opaque origin, on purpose) paginated by Paged.js; talks to the parent only via `postMessage`.
- Depends on CDNs (marked, mammoth, turndown, jszip, pdf-lib, DOMPurify, Tailwind, React, Google Fonts, Paged.js, html2canvas) — needs internet.

### ZineArranger
- Large single file. Has a "ZEditor handoff" block near the end: listens for `postMessage` `{type:"zeditor-handoff-pdf", buffer, filename}` and feeds the bytes into its `#selector` file input; pings `{type:"zinearranger-ready"}` to `window.opener` every 500ms (up to 15×).

### Cross-app handoff protocol ("Send to ZineArranger")
Sender (ZEditor and Md-to-PDF both use the same shape):
1. `window.open("../ZineArranger/index.html","_blank")` synchronously in the click handler (popup-blocker safe).
2. Attach a `message` listener **immediately** (before any `await`) for `zinearranger-ready`.
3. Build PDF bytes, await ready, then `win.postMessage({type:"zeditor-handoff-pdf", buffer, filename}, "*", [buffer])`.
The message type is named after ZEditor but ZineArranger doesn't check the sender, so Md-to-PDF reuses it as-is.

## 3. What was done in this project's recent sessions

ZEditor:
- Fixed Send-to-ZineArranger race (listener registered too late) + repeated ready pings.
- Save/Load Project (`.znow`), Insert PDF as pages (with "insert after page" dialog), New Project / Load Project buttons with two-step erase confirmation.
- Text box: removed 320px max width, no shrink-on-blur, free resize.
- Per-image filters; halftone slider min 1px.
- Keyboard shortcuts + Shift+Click multi-select (highlight + group Delete only).
- **Page filter is now per-page** (was one global filter applied to all pages, including export).
- **Ctrl+V pastes an image from the system clipboard** (`addImageAnnotationFromFile`, shared with the Image tool's file picker).
- **Fixed: halftone was nearly blank in Export PDF / Send to ZineArranger.** `drawHalftoneDots` stepped through pixels with a fractional cell size (editor px × export scale ≈ 2.525), producing fractional array indices → NaN → no dots. Preview (scale 1, integer cells) looked fine, which hid it. Now samples with integer pixel bounds. Any halftone PDF exported before this fix must be re-exported.
- **Rectangle gradient fill + Rasterize to Image.** `RECT_CONTROLS` now has `fillType` (solid / linear / radial), per-colour opacity (`fillAlpha`, `gradientAlpha`), `gradientColor`, `gradientAngle`, `gradientStart/End`. `rectFillCss` (editor) and `paintRectFill` (export canvas) both read `rectGradientStops`, which pre-computes dense premultiplied-alpha stops — CSS and canvas gradients blend alpha differently, so bare end stops would not match. Verified editor vs export within 1–4/255. "Rasterize to Image" (`rasterizedRectPatch`) bakes fill + effects into an image annotation (same id, `type: "image"`, filter forced to none); it shares `bakeBoxToImage` with Flatten Image. Gradient fading to transparent is trimmed, so the rasterized box can be smaller than the rectangle.
- **Ellipse tool (E).** Not a new annotation type: it is a `type: "rect"` annotation with `shape: "ellipse"`, so fill/gradient/opacity/Stroke/Shadow/Texture/layers/Rasterize all work unchanged. `imageEdgeOutline` returns `ellipseOutline` for it (clip, stroke, texture and export all follow that one outline). Rounded/Torn Edge/Scissor Cut are hidden for ellipses. Rectangles and ellipses share one set of tool defaults (`rectDefaults`). `rasterizedRectPatch` must clear `shape`, or the resulting image would stay clipped to an ellipse.
- **Ellipse edge shape for images** (`ELLIPSE_EFFECT`, key `ellipseEdge`, no controls): masks an image to the ellipse fitting its box (a circle on a square image). It is one of the mutually exclusive edge shapes with Rounded/Torn Edge/Scissor Cut, and is hidden for rect annotations (they have the Ellipse tool). Deliberately chosen over a CSS-style "image fill" for shapes, which would duplicate the image's crop/filter/effect handling; revisit only if a swappable-photo frame is wanted.
- **New blank document** (no source PDF needed). `NewDocumentDialog` (paper size from `NEW_DOCUMENT_PRESETS`: A3/A4/A5/A6/Letter/Half Letter/Digest, portrait or landscape, page count 1–100), opened from the sidebar's "New Document" button when empty, or from New Project after its two erase confirmations (offers "Open a PDF instead"). `handleCreateBlankDocument` builds `isBlank` pages whose `width`/`height` are in points (landscape swaps them; `rotation` stays 0), resets `pdfDocsRef`/`pageSizeRef` and undo. Blank-only projects save with `docs: {}` and reload fine; "Add blank page" later matches the new size via `pageSizeRef`.
- **Blend modes** for text, images, rectangles and ellipses (`BLEND_CONTROL`: Normal, Multiply, Screen, Overlay, Soft Light, Darken, Lighten, Difference; stored as `ann.blend`). The same key is both the CSS `mix-blend-mode` (live: `boxGroupStyle`, text root style) and canvas `globalCompositeOperation` (export: `drawWithOpacity(..., blend)` composites the item's own layer). `.ze-page--rendered` has `isolation: isolate` so blends mix with the page, not the workspace. Verified export pixels equal the blend formulas. Not yet on pen/highlighter strokes (a Multiply highlighter would be a natural follow-up). Rasterize/Flatten keep the blend on the item rather than baking it.
- **Rotation** for text boxes, images, rectangles and ellipses (`ann.angle`, degrees clockwise about the box centre; x/y/width/height stay unrotated). Rotate knob above the selection (`startRotateDrag`; Shift snaps to 15°) plus a "Rotation (°)" control in each Format panel. Live: CSS `transform` on the outer box (`boxOuterStyle`, text root style). Export: `rotateAboutCenter` in `drawBoxWithEffects` / `drawTextOnCanvas`. Resizing a rotated box uses `dragDeltaFrom(e, zoom, angle)` + `resizedBox(..., angle)`, which keep the anchored side fixed on the page. Gotchas handled: (1) a rotated box is its own stacking context, so the blend mode moves from the inner group to the outer box when angle != 0; (2) canvas shadow offsets are page-space while CSS ones rotate with the element, so `boxGroupStyle` counter-rotates the CSS offset (shadow light stays fixed); (3) `bakeBoxToImage` sizes its canvas for the rotated outline and returns `angle: undefined`, so Flatten/Rasterize bake rotation into the pixels. Crop is disabled while rotated; pen/highlighter strokes and group rotation are not supported yet. Resize-handle cursors don't rotate with the box.
- **Text looks, Phase 1** (`textLook(ann)` is the single reader; `AnnotationText` and `drawTextOnCanvas` both use it): line spacing (`lineSpacing`, %), letter spacing (`letterSpacing`, % of font size), strike-through (`strike`: none/line/double/wavy), fill opacity (`fillAlpha`), and the effect buttons `TEXT_EFFECTS`: Stroke (`ann.stroke` + `strokeColor/strokeThickness`), Shadow (`ann.shadow`, same props as image shadow), Gradient (`ann.textGradient`, linear only, reuses `rectGradientStops`/`makeLinearGradient`), Label (`ann.labelBox`: filled box behind the text with padding/radius; padding is added to the box's inner padding). Gradient/stroke/shadow live on an inner block span in the editor and are skipped while typing (plain text is shown then). The export text renderer was rebuilt to match CSS exactly: font-metric baselines (ascent/descent rounded at editor px, half-leading floored, as Blink does), the box's 1px border counted as padding, miter stroke joins, stroke painted under fill, shadow cast from the finished text drawn on its own layer (page-fixed direction). Verified with a harness that renders the real component and the export function side by side (mean pixel difference 0-2/255, bounding boxes identical). Needs canvas `letterSpacing` (Chrome/Edge, Firefox 115+, recent Safari); without it spacing is ignored in export. Planned next (Phase 2/3): ransom-note jitter, distress texture, rasterize text to image (halftone/xerox/photo-through-letters), per-character colour, custom fonts, text on a curve, saved text styles.
- **Text gradient + stroke/shadow fix.** In the live box a gradient is a `background-clip: text` background, and browsers paint a text's stroke and shadow *on top of* such a background, which buried the gradient (0 gradient pixels with Stroke on, while Export looked right). `AnnotationText` now renders gradient text with a stroke or shadow as two stacked copies: an outline/shadow copy (transparent fill) underneath and the gradient copy on top (both positioned so DOM order decides). Re-verified editor vs export (gradient pixel counts match; mean diff 0-1/255). A remaining ~3.7/255 difference exists for stroke+shadow together even without a gradient (shadow shape of the stroked glyph).
- **Rasterize Text to Image** (`rasterizedTextPatch`, button in the text panel): bakes a text box (spacing, stroke, shadow, gradient, label, rotation) into an image annotation via `bakeBoxToImage`, so Halftone/Xerox/Threshold, crop and effects apply. Text export layout was split out as `layoutText` (shared by `drawTextOnCanvas` and `measureTextBox`); the baked image matches the direct export drawing to ~0.3/255. Not editable afterwards (Undo restores the text box). The patch must clear every text prop and every `TEXT_EFFECTS` key (`stroke`, `shadow`, ... also exist as image effects) or the image would apply them a second time.
- **Photo fill for text** (`TextPhotoFill` in the text panel; props `fillSrc/fillNatW/fillNatH` + `TEXT_PHOTO_CONTROLS` scale/X/Y): a photo shows through the letters and replaces the colour and gradient while set. Photos are downscaled to <=2000px (`readPhotoFile`) because they're stored as data URLs in the project. Live: `background-clip: text` with `backgroundImage/Size/Position` computed by `photoPlacement` from `measureTextBox` (cover at 100% scale, X/Y = % of the text area). Export: letters drawn solid on a scratch layer, photo drawn `source-in`, layer laid over the stroke. `drawTextOnCanvas` is now async (it loads the photo). Editor vs export identical (0.01/255, incl. scale/offset, multiline, rotation).
- **Ransom lettering + Distress for text** (`RANSOM_EFFECT`, `DISTRESS_EFFECT` in `TEXT_EFFECTS`; flags `ann.ransom`, `ann.distress`). Ransom: each letter gets a seeded tilt / up-down shift / size (maximums set by sliders, `ransomVariation` is the seed), optionally on a paper tile (`RANSOM_PAPER_COLORS`). Distress: seeded nicks/specks/scratches erased from the finished text (`drawDistressMarks`, destination-out on the text layer). Both are drawn by **`drawTextOnCanvas` in the live editor too** (`usesCanvasText` -> `AnnotationText` renders a `<canvas>` sized by `measureTextBox` plus `textCanvasMargin`), because per-letter jitter and erased marks have no clean CSS equivalent; one renderer means no editor/export drift (live vs export 0.7-2/255). While typing, plain text is shown. `drawTextOnCanvas` now builds "runs" (a line, or one letter when ransom is on) shared by the tile/stroke/fill/layer passes; ransom measures widths as the sum of letter advances (no kerning) in `layoutText`; a gradient on ransom letters, and any photo fill, go through a scratch layer (letters solid, fill `source-in`) so each letter's own turn doesn't turn the gradient. A CSS-rotated canvas box would rotate its shadow, so the live canvas is drawn with `shadowDirection - angle`. Shadow + distress together use the same layer pass.
- **Filters keep transparency** (`lumaOverWhite`, alpha restore in `applyPageFilter`): halftone/threshold/xerox read luminance as if the image sat on white paper, because a see-through pixel is stored as black (0,0,0,0) and used to come out black under halftone. Halftone paints a white sheet with marks, so `applyPageFilter` copies the source image's alpha back afterwards: dots and paper only show where the image was visible, transparent stays transparent, semi-transparent edges keep their alpha, and opaque images (e.g. page backgrounds) are unaffected. Threshold/xerox already kept alpha. (First version made transparent areas opaque white; changed on request.)
- **Gotcha: never use the CSS `background` shorthand together with `background-clip: text` in React inline styles.** On re-render React only re-sets the changed property, and the shorthand resets `background-clip` to border-box, so editing a gradient colour filled the whole text box. The text gradient uses `backgroundImage` for this reason (re-verified across colour/angle/stroke edits).
- **`CustomColorInput`**: the custom-colour picker beside swatch rows (text colour, text defaults, pen/highlighter colour) is a rainbow ring around the chosen colour with an eyedropper icon in a difference blend, so it reads as a colour tuner.
- **Crop view is see-through**: while cropping, the full source image is drawn at 35% opacity (`.ze-crop-full-img`) and the crop window repaints its own part solid (`.ze-crop-window-clip`), replacing the old dark masks, so the page and lower layers show through the cut-away area.
- **Center guide** toggle (icon button in the tool bar, next to Layers): a dashed vertical line at the page's middle for covers/two-page spreads. State `centerGuideOn`, independent of the Guides popover; editor-only overlay (never exported), saved in project `settings`.

Md to PDF Converter:
- **"Send to ZineArranger" button** (`handleSendToZineArranger` in `App.jsx`; `renderRasterizationDocument` in `pdfGenerator.js`). Pipeline: hidden iframe → Paged.js paginates → html2canvas rasterizes each `.pagedjs_page` at scale 2 → images `postMessage`d back → pdf-lib assembles a PDF → handoff to ZineArranger.
- Security decision: html2canvas **hangs forever** inside a `sandbox="allow-scripts"`-only iframe, so the export iframe uses `allow-scripts allow-same-origin`. That combo would let a `<script>` smuggled via pasted Markdown raw HTML reach the parent app, so the rendered HTML is run through **DOMPurify first**. Do not remove the sanitize step or the reasoning comments. The live preview iframe stays opaque-origin and untouched.

## 4. Pending / known gaps (priority order)

1. ~~Group drag-reorder of multi-selected pages.~~ Done 2026-11-09: `handleReorder(fromIndices, insertBefore)` now handles single and group moves. Verified with scripted drag events; not yet tried by hand with a real mouse drag.
2. **Md-to-PDF "Send to ZineArranger" is not verified end-to-end through the real handoff.** The rasterize → PDF pipeline and the sanitization were verified in isolation; the actual `window.open` + postMessage round trip could not be exercised in the test browser (see §5). Test it once in a normal Chrome/Edge window.
3. Md-to-PDF rasterization with Markdown images (`![](url)`): cross-origin images could taint the canvas (`useCORS: true` is set, untested with remote images).
4. Group drag/resize of multi-selected **annotations** was deliberately cut (only highlight + group Delete work).
5. Old `.znow` files saved before per-page filters stored one global filter in `settings`; that is now ignored on load (those projects open with no filters).
6. Sidebar thumbnails don't reflect filters (only the main canvas and export do).
7. Edge case: if an annotation was copied in-app (Ctrl+C) AND the OS clipboard also holds an image, Ctrl+V does both (duplicate + image paste).
8. Md-to-PDF asks a ~3-page document to paginate twice (preview + export iframe) and Paged.js/html2canvas are slow; a progress indicator on the button would be a nice touch.

## 5. Testing setup and gotchas (read before debugging "it's stuck")

Dev server: any static server rooted at the project folder, e.g. `python -m http.server 8951 --directory "<path to ZineNow>"`, then open `http://localhost:8951/apps/ZEditor/index.html`. Under Claude Code's preview tooling this is done via a `.claude/launch.json` in the session's primary working directory (not necessarily the project folder). Remove it when done.

Things that looked like bugs but weren't:
- **Hidden browser pane throttles `requestAnimationFrame`** → pdf.js rendering, Paged.js and html2canvas appear to hang. Taking a screenshot foregrounds the pane briefly; it reverts to hidden between tool calls. Poll with screenshot + wait inside one `browser_batch`, and keep patience (Paged.js + html2canvas take ~10–30s here).
- **HTTP cache is sticky**: after editing `pdfGenerator.js` etc., a plain reload kept serving the stale script, even in a new tab. Use a **new port** (new origin) or a cache-busting query on the page; note sub-resources (`<script src="pdfGenerator.js">`) do not inherit the page's query string. Verify with `fn.toString().includes("...")`.
- **`window.open(_, "_blank")` in the test pane replaces the current tab**, destroying the sender before it can finish the handoff. Not representative of a real browser.
- The network-request tool only logs same-origin requests; CDN loads never appear. Console history can persist across navigations.
- Loading a PDF into ZEditor without a file dialog: build a `File`, put it in a `DataTransfer`, assign to the hidden `input[type=file][accept="application/pdf"]`, dispatch `input` + `change`. A tiny test PDF can be made in-page with `PDFLib`.
- Capturing Export/Save output: set `window.showSaveFilePicker = undefined`, monkey-patch `URL.createObjectURL` to stash the Blob, click the button, then inspect the blob (e.g. render pages with `pdfjsLib` and sample pixels).
- ZEditor helper functions such as `renderPageToCanvas` and `applyPageFilter` are top-level and reachable from the console; anything inside `App()` is not.

## 6. Resuming on a new machine

1. Copy the whole `ZineNow` folder (this file included). It is plain files; no install step.
2. Claude Code's auto-memory and session transcripts are local to the old machine and do **not** transfer — this file is the substitute. Consider renaming/copying it to `CLAUDE.md` in the project root so a new session loads it automatically.
3. Start with pending item #2 (real-browser test of the Md-to-PDF handoff) unless priorities changed.
4. Working conventions carried over from the previous sessions: keep edits inside the existing single-file structure, preserve immutable state updates in ZEditor, default to no code comments unless the *why* is non-obvious, and test UI changes in a browser before calling them done.

## 7. Step-by-step: continuing on another PC

Repo: https://github.com/erictzh/ZineNow (branch `main`).

### Before leaving the main PC
In PowerShell inside the project folder:
```
git add -A
git commit -m "describe what changed"
git push
```
Check https://github.com/erictzh/ZineNow/commits/main shows your latest commit.

### First time on the new PC
1. Install Git: `winget install --id Git.Git -e --source winget` (click Yes on the admin prompt), then close and reopen PowerShell. Verify with `git --version`.
2. Install and sign in to Claude Code (desktop app or CLI).
3. Clone: `git clone https://github.com/erictzh/ZineNow.git` — sign in as `erictzh` in the browser window that opens.
4. Set the commit identity once (so pushes are attributed to you):
   `git config --global user.name "TSANG ZHI HAO"` and `git config --global user.email "ericzhihaotsang@gmail.com"`.
5. Open the cloned `ZineNow` folder in Claude Code.
6. First message: "Read HANDOFF.md and continue from the pending tasks."

### Every later session on any PC
1. Start: `git pull` (always, before editing).
2. Work as usual. Run the apps by double-clicking `index.html`, or serve the folder: `python -m http.server 8000` then open http://localhost:8000. Md to PDF needs internet (CDN libraries).
3. End: `git add -A`, `git commit -m "..."`, `git push`.

### If something goes wrong
- `git push` rejected ("non-fast-forward"): the other PC pushed first. Run `git pull`, resolve any conflicts (ask Claude Code), then `git push`.
- Never edit on two PCs without pull/push in between — that is what causes conflicts.
- Browser still shows old code after a pull: hard-refresh (Ctrl+F5) or use a new port / `?v=2` (see section 5, sticky cache).
- Never use `git push --force` unless you are certain.
