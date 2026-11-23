# Plan: Ai Tools (Local) as a hub of on-device AI tools

Status: **plan only, nothing from Phase 1 on is built yet. Waiting for the user's go.** Decided in discussion with the user (2026-11-23): tools list on the **left**; **Phases 1 and 2 are built together**, then shown for review. Facts about third-party models (licence, size, speed) are from memory and must be checked on each model's own page at its benchmark step.

## Goal

One app, **Ai Tools (Local)**, with a tool list. Each tool runs on the user's device (nothing is uploaded), is open source, and is transparent about what it downloads and from where. It must run smoothly on the user's tablet (Infinix XPAD, Helio G99, CPU only in practice).

## Principles (apply to every tool)

1. **FOSS only.** Licence must be OSI-approved (Apache-2.0, MIT, BSD). No non-commercial licences (e.g. BRIA RMBG).
2. **Local.** All processing in the browser. The only network use is the one-time download of models and runtime files, from hosts shown to the user.
3. **Transparent.** Name the real model (never just "AI"), its licence, size and download address, in the panel, the Models page and the download pop-up.
4. **Opt-in downloads.** A confirm pop-up before any download; a Delete button for every model.
5. **Gate before building** (new tools only): licence OK; first download about 50 MB or less; about 10 s or less for a 1-2 MP photo on the tablet's CPU (upscale: up to about 30 s); acceptable quality on 3 of the user's own photos. A tool that fails is dropped or its model swapped.
6. **Experimental, clearly labelled.** The app keeps its subtitle "Under development, still in experimental phase."

## Scope (all six tools)

| # | Tool | Model(s) | Phase |
|---|---|---|---|
| 1 | Remove object | MI-GAN (MIT, 28 MB), already in the app | 2 |
| 2 | Remove background | U²-Netp (General, 4.4 MB) and MODNet (Portrait, 25 MB), both Apache-2.0, working in `labs/ai-bg-benchmark` | 2 |
| 3 | Face blur | a small face detector (YuNet, MIT, under 1 MB, or BlazeFace, Apache-2.0, about 0.4 MB) | 3a |
| 4 | Text from image (OCR) | Tesseract.js (Apache-2.0) plus language data | 3b |
| 5 | Click-to-select | MobileSAM (Apache-2.0, encoder about 28 MB + decoder about 16 MB); EdgeSAM as backup | 3c |
| 6 | Upscale | a small Real-ESRGAN variant (e.g. realesr-general-x4v3, BSD-3-Clause, about 5 MB); Swin2SR as backup | 3d |

Storage if everything is downloaded: roughly 150 to 200 MB (shown on the Models page).

## Architecture

- **Tool registry.** Each tool is one module: `{ id, name, models: [...], panel(), run() }`. The app shell shows the list, the options panel and the workspace; adding a tool means adding one module.
- **One picture, many tools.** The picture is opened once; a tool's result can become the next tool's input. Undo/redo of results.
- **Models page.** For every model: name, licence, size, download address, status, Download / Delete, plus the total storage used.
- **Shared code.** Keep using `shared/js/ai/` (`bgModel.js`, `manager.js`, `modelStore.js`, `runtime.js`, `segment.js`, `fill.js`...) so ZEditor and the app do not diverge. ONNX Runtime Web is shared; Tesseract.js (OCR) is a separate engine with its own runtime and language files, listed on the Models page.
- **Model storage.** Cache API (one cache per feature family as today); the apps share an origin, so a model downloaded in one should be usable by the other (to be verified).
- **Hand-off.** Keep "Send to ZEditor" and the ZEditor round trip (`shared/js/imageHandoff.js`).
- **Offline.** After downloads, tools must work offline (service worker on; to be tested).
- **Layout (decided):** tools list on the left, the workspace in the middle, the options panel on the right; on small screens the tools list becomes a top drawer.

## Phases

### Phase 1: foundation (restructure, no new tools)
- App shell: tool list, workspace, options panel; responsive (tablet first).
- Tool registry and a tiny contract for tools.
- Models page with Download / Delete / storage total.
- Migrate the current single-tool UI into the shell without losing features.
- Tests: shell and registry with stand-in models; HANDOFF and README updated.
- **Done when:** the existing remove-object flow still works in the new shell (including Send to / back from ZEditor).

### Phase 2: bring the existing tools in
- Remove object: brush mask, MI-GAN, "Try another" variations (same fixed cycle as ZEditor), download pop-up.
- Remove background: both models, model picker, Edge cut-off 0-100 % (default 0.1, step 0.125, typed finer values), Soft edge, "Download required" while greyed.
- Chain tools (result becomes the input).
- Tests with stand-in models; offline test with the service worker on; guide in `docs/`.
- **Done when:** both tools match ZEditor's behaviour and work offline.

### Phase 3: new tools, one at a time
For each tool: (1) a benchmark page `labs/ai-<tool>-benchmark/` with a build number; (2) the user runs it on the tablet and sends the report; (3) the gate decides; (4) if it passes, build the tool (module, Models page entry, tests with a stand-in model, guide, HANDOFF); (5) merge; the user tests it in the app.

- **3a Face blur:** detect faces (boxes only; it does not identify anyone). Blur / Pixelate / Black box, strength slider, untick a face to leave it alone, drag a box to fix a miss. Risk: tiny, turned or covered faces are missed (manual box is the fix).
- **3b OCR:** Tesseract.js, English by default, other languages chosen on the Models page (about 4 to 15 MB each). Recognised text in a box with Copy and Download .txt, and the read regions shown on the picture. Risk: handwriting and decorative fonts read poorly.
- **3c Click-to-select:** MobileSAM encoder runs once per picture (several seconds on the tablet), each click is fast; clicks add or remove parts; the result can feed Remove background or Remove object as a mask. Risk: first-run wait, total download near the size limit.
- **3d Upscale:** tiled enlarging (2x / 4x), output size limit, before/after view, progress bar and Cancel. Risk: may fail the speed gate on the tablet; it could freeze a low-end device.

Suggested order: 3a, 3b, 3c, 3d. Each ships separately and the user can stop at any point.

### Phase 4: polish
- "Where it runs" note on each tool (runs on device, downloaded once from <host>).
- Clear experimental notice; guides for each tool in `docs/`; HANDOFF and MAINTAINING updated.
- Optional: an Experimental toggle in the app, like ZEditor's gear.

## Working method (every phase)
- Build, test (headless Playwright with stand-in ONNX models, `npm run check`, `npm test`), commit, push, PR, merge into `main`, update HANDOFF.md.
- Tell the user exactly what to test on the tablet after each step.
- Never build a step before the user agrees to it.

## Risks
- The real models behave differently from stand-ins (output layout, scaling): mitigated by benchmark pages first, as for MODNet (a scaling bug there showed up only on the real model).
- Download hosts (Hugging Face, jsDelivr) change or block cross-origin downloads: the benchmark page lets the user choose a file instead; self-hosting the models is an option later (repo size, licence notices).
- Memory and freezing on low-end devices: tiles, release sessions after a quiet minute, Cancel buttons.
- Total storage: shown on the Models page; Delete everywhere.

## Decisions
1. Layout: **tools list on the left** (decided).
2. Review points: **Phases 1 and 2 together**, then review (decided).
3. Go for Phase 1+2: **not given yet** (the user wants this document first).

## Detailed work breakdown

### Where things are today (so we both remember)
- `apps/AiToolsLocal/`: `index.html` (top bar + stage + right panel: "1. Mark what to remove", "2. Remove it", a "Model and device" box), `style.css` (40 lines), `src/main.js` (336 lines, plain JS, bundled to `dist/app.js` by `npm run build`), `sw.js`, `manifest.webmanifest`, `icons/`, `README.md`. It does only Remove object. Its model box lets the user edit the model address and "Forget the saved model".
- `shared/js/ai/`: `fill.js` (MI-GAN picture maths), `modelStore.js`, `runtime.js`, `manager.js`, `session.js`, `bgModel.js`, `bgSession.js`, `segment.js` (background removal maths). ZEditor already has both tools using these (`apps/ZEditor/src/render/aiFill.js`, `RemoveBackgroundSection.jsx`).
- `shared/js/imageHandoff.js`: Send to ZEditor and the round trip.
- Test benches: `labs/ai-benchmark/` (fill), `labs/ai-bg-benchmark/` (background removal, build 6).
- ZEditor's gear has "Experimental AI features" (off by default); the standalone app has no such switch and stays always on.

### Phases 1 + 2 (built together), in order

**Step 1: shell and registry** (`apps/AiToolsLocal/src/`)
- [ ] `shell.js`: left tools list (name + one line), the workspace in the middle (`stage` with pan/zoom, kept from `main.js`), the right options panel that shows the selected tool's panel. Top drawer on narrow screens. Top bar keeps Open picture, Save PNG, Send to ZEditor.
- [ ] `registry.js`: the tool contract `{ id, name, summary, models: [modelKey...], mount(panelEl, ctx), unmount() }`, where `ctx` gives the picture canvas, history (undo/redo), status line, and model helpers.
- [ ] `picture.js`: the one shared picture (open, drop, paste, view, fit, history, save, send) taken out of `main.js`; every tool works on it, and a tool's result replaces the picture (one undo step per result).
- [ ] Keep: two-finger pan/zoom, Hold to compare, drop and paste, Ctrl+V.

**Step 2: Models page** (`src/modelsPage.js`)
- [ ] A "Models" entry in the tools list that opens a page listing every model: name, kind, licence, size, download address, status, Download / Delete, and the total storage used.
- [ ] Rows from one list: MI-GAN, U²-Netp, MODNet, and the AI engine (ONNX Runtime Web, shared). Later tools add rows.
- [ ] Same confirm pop-up wording as ZEditor (what, from where, size, "does not connect to the internet", lag warning), for download and delete.
- [ ] Reuse `shared/js/ai/manager.js` and `bgModel.js`; add the MI-GAN's facts (name, licence MIT, host, size) to a shared list so ZEditor and the app show the same facts. The editable model address in the old "Model and device" box is dropped (the address is shown, not editable).

**Step 3: Remove object tool** (`src/tools/removeObject.js`)
- [ ] Move the current marking UI and `removeObject()` flow from `main.js` (brush, erase mark, box, grow, progress).
- [ ] Use the shared session/fill code (`shared/js/ai/session.js`, `fill.js`) so the app and ZEditor behave the same.
- [ ] Add "Try another" with the fixed variation cycle (`AI_VARIATIONS` from `apps/ZEditor/src/render/aiFill.js` moved to `shared/js/ai/` so both import it).
- [ ] Greyed Remove object with a red "Download required" until MI-GAN is downloaded; a link to the Models page.

**Step 4: Remove background tool** (`src/tools/removeBackground.js`)
- [ ] Model picker (U²-Netp (General), MODNet (Portrait)) with the same info lines as ZEditor.
- [ ] Edge cut-off 0-100 % (default 0.1, -/+ 0.125, typed finer values), Soft edge (default 10 %), greyed with red "Download required".
- [ ] Preview on a checkerboard, with the cut-off number box re-drawing the preview without re-running the model (as `labs/ai-bg-benchmark` does); "Apply" makes the result the picture.
- [ ] Share the section's logic with ZEditor where practical (the model list, `segmentCanvas`, `cutOutCanvas` already are shared).

**Step 5: wiring, offline, docs**
- [ ] `sw.js`: new files in `FILES`, bump `CACHE_VERSION`; check the offline copy works with the service worker on.
- [ ] `index.html` and `style.css` rewritten for the new layout (tokens/buttons from `shared/styles`).
- [ ] `config/apps-config.js`: keep the card subtitle "Under development, still in experimental phase."
- [ ] `README.md`, a guide `docs/GUIDE-ai-tools-local.md`, `docs/MAINTAINING.md` rows, HANDOFF.md.

**Step 6: tests** (all with stand-in ONNX models; the real models cannot be downloaded in the cloud sandbox)
- [ ] Unit tests: registry contract, history, any new pure functions; the moved `AI_VARIATIONS` test keeps passing.
- [ ] Headless browser: open a picture; switch tools without reloading; Remove object runs and undoes; Remove background runs for both models, undo; Models page download / Delete / storage total; greyed + "Download required" states; narrow-screen drawer; chaining (remove an object, then remove the background); Send to ZEditor and back still work.
- [ ] Offline run with the service worker enabled.
- [ ] `npm run check` and `npm test` pass; PR merged to `main`; HANDOFF updated.

**Review point:** the user tries it on the tablet (real models, speed, layout) and sends feedback before any Phase 3 work.

### Phase 3 tools (each starts only after the review point)

For each tool the order is: benchmark page -> user runs it on the tablet -> gate decision -> build -> merge -> user tests.

**3a Face blur**
- [ ] `labs/ai-face-benchmark/index.html` (build number shown): YuNet and/or BlazeFace on a photo with several faces; report time, number of faces found, boxes drawn.
- [ ] Gate: MIT/Apache-2.0, small, fast, finds the faces in 3 of the user's photos.
- [ ] Tool `src/tools/faceBlur.js`: boxes, Blur / Pixelate / Black box, strength slider, untick a face, drag/draw a box by hand, Apply. Models page row.
- [ ] Tests (stand-in detector), guide, HANDOFF.

**3b Text from image (OCR)**
- [ ] `labs/ai-ocr-benchmark/index.html`: Tesseract.js (from a CDN, shown) with English; report time and the text read from the user's printed-text photo.
- [ ] Gate: Apache-2.0; engine + English data within the size budget; readable result on clean printed text.
- [ ] Tool `src/tools/ocr.js`: language list on the Models page (each language file with size), recognised text box with Copy and Download .txt, read regions shown on the picture. Offline caching of the engine files and the chosen language data.
- [ ] Tests, guide, HANDOFF.

**3c Click-to-select**
- [ ] `labs/ai-sam-benchmark/index.html`: MobileSAM encoder + decoder; report the encoder time per picture, the decoder time per click, and the mask drawn for a click.
- [ ] Gate: Apache-2.0; total download within budget; encoder time acceptable on the tablet (EdgeSAM as backup).
- [ ] Tool `src/tools/selectObject.js`: click to add, shift/second mode to subtract, mask preview, "Use as mask" for Remove object, "Cut out" (keep the selection, see-through elsewhere).
- [ ] Tests, guide, HANDOFF.

**3d Upscale**
- [ ] `labs/ai-upscale-benchmark/index.html`: realesr-general-x4v3 (and Swin2SR) on a 512 px photo, tiled; report time per tile and in total, and the result.
- [ ] Gate: BSD-3/Apache-2.0; total time acceptable (up to about 30 s) and no freeze on the tablet.
- [ ] Tool `src/tools/upscale.js`: 2x / 4x, output size limit, before/after, progress bar + Cancel, tiles released from memory as it goes.
- [ ] Tests, guide, HANDOFF.

### Phase 4 (polish)
- [ ] "Where it runs" line on every tool and the Models page; clear experimental notice.
- [ ] Guides for each tool in `docs/`; HANDOFF and MAINTAINING updated.
- [ ] Optional "Experimental" toggle in the app (like ZEditor's gear).

## How we both remember
- This file is the plan; HANDOFF.md records what is done. After each step I tick the boxes here and note it in HANDOFF.md.
- Anything not agreed yet is listed under Decisions; I do not build ahead of it.
