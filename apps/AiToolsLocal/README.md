# Ai Tools (Local)

A hub of AI tools that run on your own device. Nothing is uploaded. Each model is downloaded once, only when you choose to (the **Models** page lists every model with its licence, size and where it comes from), then the tools work offline.

Tools so far (tools list on the left): **Remove object** (MI-GAN) and **Remove background** (U²-Netp General, MODNet Portrait). The whole picture is shared: open it once, switch tools, chain them (remove an object, then the background), Undo / Redo / Hold to compare / Save PNG, or **Send to ZEditor**. More tools are planned: `docs/PLAN-ai-tools-hub.md`.

How to use it: `docs/GUIDE-ai-tools-local.md`. Notes for maintainers: `HANDOFF.md` and `docs/MAINTAINING.md`.

Build: `npm run build` (from the repo root) bundles `src/main.js` into `dist/app.js`. A new tool is one file in `src/tools/` (see `src/registry.js`) and one line in `src/main.js`.
