# Plan: the ZineNow wiki / textbook

Decided with the user (2026-11-24): everything lives in ONE folder, `apps/Wiki/`. Markdown source, one generated file, one small build script.

```
apps/Wiki/
  index.html       the whole wiki is this one page (sidebar + article, pages switch by #chapter/page)
  wiki.css         orange dark theme (uses shared/styles/tokens.css)
  wiki.js          sidebar, search, prev/next, copy-code buttons
  build.mjs        content/*.md -> content.js (uses the `marked` dev dependency; run by npm run build / check)
  content/         toc.json (the menu) + <chapter>/<page>.md   <- the only files we hand-edit
  content.js       GENERATED (committed, so it opens from file://)
```

Every page has four parts, as headings: **Intro**, **How to use**, **How it works** (proper technique names, why sliders behave as they do), **Code** (real snippets, with the repo file path above each block). Pages not written yet show "Coming soon" from the menu. The menu is `content/toc.json` (14 chapters, ~90 pages).

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
