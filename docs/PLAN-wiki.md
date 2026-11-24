# Plan: the ZineNow wiki / textbook

Decided with the user (2026-11-24): everything lives in ONE folder, `apps/Wiki/`. Markdown source, one generated file, one small build script.

```
apps/Wiki/
  index.html       the whole wiki is this one page (sidebar + article, pages switch by #chapter/page)
  wiki.css         orange dark theme (uses shared/styles/tokens.css)
  wiki.js          sidebar, search, prev/next, copy-code buttons
  build.mjs        content/*.md -> content.js (uses the `marked` dev dependency; run by npm run build / check)
  content/         toc.txt (the menu) + <chapter>/<page>.md   <- the only files we hand-edit
  content.js       GENERATED (committed, so it opens from file://)
```

Every page has four parts, as headings: **Intro**, **How to use**, **How it works** (proper technique names, why sliders behave as they do), **Code** (real snippets, with the repo file path above each block). Pages not written yet show "Coming soon" from the menu. The menu is `content/toc.txt` (14 chapters, ~90 pages).

## Phases (each ends with: build, check, tests, HANDOFF entry, PR merged). Order: ZEditor, then Markdown to PDF, then ZineArranger, then Ai Tools.
1. **Foundation + pilot.** apps/Wiki shell, build.mjs, theme, sidebar (collapsible chapters), search, prev/next, code highlighting, note/tip callouts, the "four parts" lint (warning), a check that every file path quoted in Code sections exists, `npm run build/check` hooks, home-page card, a test for the builder. One full pilot page: ZEditor > Ruler Guide. User reviews the format before more pages are written.
2. **ZEditor workspace, pages, arranging**, 16 pages (filters, rulers/guides, layers, clipping).
3. **ZEditor text**, 12 pages.
4. **ZEditor images and shapes**, 11 pages (incl. the Vectorize pipeline).
5. **ZEditor Eraser and Marquee**, 5 pages (harmonic, Telea, Criminisi, MI-GAN).
6. **ZEditor project and export**, 5 pages (.znow, fonts, PDF export, handoff).
7. **Markdown to PDF**, 6 pages.
8. **ZineArranger**, 7 pages (imposition and signatures).
9. **Ai Tools (Local)**, 8 pages: hub, Remove object, Remove background, Face blur, Click-to-select, Upscale, OCR, running models in the browser.
10. **Start here, Home page, Appendices**, ~14 pages, then a full pass: links, glossary terms linked from pages, snippets re-checked against the code, build number shown on the wiki.

Rules: read the real code before writing a page; never invent behaviour; keep snippets short and quoted from the repo; flag anything unverified. The older docs/GUIDE-*.md stay untouched until the wiki covers them, then become links.

## Table of contents (the approved outline; the menu in `apps/Wiki/content/toc.txt` is its page-level form)
Deeper bullets below become headings inside their page, not separate pages.

0. Start here: what ZineNow is; how it is built (esbuild, dist/app.js, build number, build/check/test); offline + PWA; shared parts (number boxes, display gear, About/Source, drop images, leave warning, download, touch input/pinch gate)
1. Home page: app cards + apps-config.js; gear panel + Experimental AI switch
2. ZEditor
   - 2.1 Workspace: top bar/menus, Welcome + New Document, page sidebar (live thumbnails, page gap), zoom + outer canvas, "No paper" canvas, touch bar, shortcuts, undo/redo, state hooks
   - 2.2 Pages: page ops, Ruler Guide (incl. lock + snap), Page Guide (trim/margin/bleed), Page Numbers, Onion Skin, Page Filter (halftone, xerox, luma, colour remap)
   - 2.3 Selecting/arranging: Move/resize/rotate, Layers panel, groups (+ .znow group files), clipping masks, Measure
   - 2.4 Text: Text tool + layout engine, composer + hyphenation, caret/selection, character/paragraph, columns + frame, text styles, spans, placeholder, photo fill, text wrap, threads, fonts (uploaded/system/embedded)
   - 2.5 Images: Insert Image, Insert PDF, crop, photo adjustments, effects (Lomo, Feather, box effects), Vectorize (quantize, contours, curves, trace layer), AI Background Removal, Flatten
   - 2.6 Shapes/drawing: Rectangle, Ellipse, stroke/fill/gradients, Draw, Highlight
   - 2.7 Eraser + Marquee: eraser (strokes, soft, magic), Marquee (rect/polygon/brush), Make layer, Remove & fill (Pattern/Smooth/Detailed), Remove & fill with AI + Try another
   - 2.8 Project + export: .znow structure/snapshot, Embed system fonts, Export PDF, PNG/JPG/SVG, Send to ZineArranger
3. Markdown to PDF: workspace (header/menu/sidebar, resizable panels, shortcuts); editor (format toolbar, code languages, dropped pictures, import); typography (page, body, typeface, headings, TOC, page numbers, code blocks, config files); building the document (md->HTML, markers/style block, fonts, TOC, preview/pagination); converters (DOCX, EPUB, HTML->Markdown, Muse); export (print, rasterized)
4. ZineArranger: load PDF + page range; sheet sizes + grid; imposition (layouts, signatures, arrange/impose, sheet HTML); reverse imposition; options + display; zoom + panel resize; print; activity log; credit (Nash High, MIT)
5. Ai Tools (Local): hub (shell/registry, picture, Log window, Models page, dialogs, Send to ZEditor); Remove object (harmonic, Telea, Criminisi, MI-GAN, Try another); Remove background (U2-Netp, MODNet, cut-off/softness, Otsu); Face blur (YuNet); Click-to-select (MobileSAM); Upscale (Real-ESRGAN); OCR (Tesseract.js); running models in the browser (ONNX Runtime Web, WebGPU/WASM, opt-in download, Cache API, model list + licences)
6. Appendices: glossary; file formats; cross-app handoff; licence policy + notices; contributing/maintaining

Home page: the gear panel has a "Tutorial / Wiki" link (after "Third-party notices") opening apps/Wiki/index.html. (Decided instead of a card.)

## Standard for every page's Code section (set by the user, 2026-11-24)
- Show **whole functions** in code blocks: ```` ```js file=<path> fn=<name> ```` (several names: `fn=a,b`). The builder cuts the function out of the real file, so it is exact and never stale. For a few lines inside a bigger function, put the real lines in the block (a line of just `…` starts a new piece).
- Every block shows its **file path and line numbers** (the build adds them: a caption with the path and "lines 12–31", and a gutter with the real numbers).
- After each block, explain it so that a layman learns the **jargon and the logic** like an IT professional: name the technique, define each term the first time (function, parameter, array, loop, closure, hook, state, ref, clamp, hash, alpha channel, etc.), then walk through the code in order, and say why it is written that way.
- Prose must not quote line numbers (they change); it refers to names and shapes of code instead.
- The walkthrough after each block starts with the bold label **The Logic:** (the user's wording).
