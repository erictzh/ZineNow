# Plan: Ai Tools (Local) as a hub of on-device AI tools

Status: **plan only, nothing from Phase 1 on is built yet.** Decided in discussion with the user (2026-11-23). Facts about third-party models (licence, size, speed) are from memory and must be checked on each model's own page at its benchmark step.

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
- **Layout (decision pending):** tool list on the left with the options panel on the right (recommended on desktop); a top drawer on small screens. The alternative is tabs across the top.

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

## Open decisions (waiting for the user)
1. Layout: left tool list (recommended) or top tabs.
2. Review points: build Phases 1 and 2 together, or stop for review after Phase 1.
3. Go for Phase 1.
