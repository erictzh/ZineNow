# Plan: the ZineNow wiki / textbook (approved outline, not started)

Each leaf page has four parts: Intro, How to use, How it works (techniques by their proper names, why sliders behave as they do), Code (real snippets with file paths).
Open choices still to confirm with the user: Markdown source in `docs/wiki/` + a build step to themed HTML (recommended, one page per leaf), real snippets vs pseudo-code, order, a home-page card.
Suggested order: Ai Tools, ZEditor Eraser/Marquee, Text, Images, then ZineArranger, Markdown to PDF, the rest.

0. Start here: what ZineNow is; how it is built (esbuild, dist/app.js, build number, build/check/test); offline + PWA; shared parts (number boxes, display gear, About/Source, drop images, leave warning, download, touch input/pinch gate)
1. Home page: app cards + apps-config.js; gear panel + Experimental AI switch
2. ZEditor
   2.1 Workspace: top bar/menus, Welcome + New Document, page sidebar (live thumbnails, page gap), zoom + outer canvas, "No paper" canvas, touch bar, shortcuts, undo/redo, state hooks
   2.2 Pages: page ops, Ruler Guide (incl. lock + snap), Page Numbers, Onion Skin, Page Filter (halftone, xerox, luma, colour remap)
   2.3 Selecting/arranging: Move/resize/rotate, Layers panel, groups (+ .znow group files), clipping masks, Measure
   2.4 Text: Text tool + layout engine, composer + hyphenation, caret/selection, character/paragraph, columns + frame, text styles, spans, placeholder, photo fill, text wrap, threads, fonts (uploaded/system/embedded)
   2.5 Images: Insert Image, Insert PDF, crop, photo adjustments, effects (Lomo, Feather, box effects), Vectorize (quantize, contours, curves, trace layer), AI Background Removal, Flatten
   2.6 Shapes/drawing: Rectangle, Ellipse, stroke/fill/gradients, Draw, Highlight
   2.7 Eraser + Marquee: eraser (strokes, soft, magic), Marquee (rect/polygon/brush), Make layer, Remove & fill (Pattern/Smooth/Detailed), Remove & fill with AI + Try another
   2.8 Project + export: .znow structure/snapshot, Embed system fonts, Export PDF, PNG/JPG/SVG, Send to ZineArranger
3. Markdown to PDF: workspace (header/menu/sidebar, resizable panels, shortcuts); editor (format toolbar, code languages, dropped pictures, import); typography (page, body, typeface, headings, TOC, page numbers, code blocks, config files); building the document (md->HTML, markers/style block, fonts, TOC, preview/pagination); converters (DOCX, EPUB, HTML->Markdown, Muse); export (print, rasterized)
4. ZineArranger: load PDF + page range; sheet sizes + grid; imposition (layouts, signatures, arrange/impose, sheet HTML); reverse imposition; options + display; zoom + panel resize; print; activity log; credit (Nash High, MIT)
5. Ai Tools (Local): hub (shell/registry, picture, Log window, Models page, dialogs, Send to ZEditor); Remove object (harmonic, Telea, Criminisi, MI-GAN, Try another); Remove background (U2-Netp, MODNet, cut-off/softness, Otsu); Face blur (YuNet); Click-to-select (MobileSAM); Upscale (Real-ESRGAN); OCR (Tesseract.js); running models in the browser (ONNX Runtime Web, WebGPU/WASM, opt-in download, Cache API, model list + licences)
6. Appendices: glossary; file formats; cross-app handoff; licence policy + notices; contributing/maintaining
