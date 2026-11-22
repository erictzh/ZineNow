# Ai Tools (Local)

Remove an object from a picture with an AI model (MI-GAN) that runs on your own device. Nothing is uploaded; after the first model download (about 28 MB) it works offline.

Mark the object (Brush or Box), press **Remove object**, then Undo / compare / Save PNG, or **Send to ZEditor**.

How it works, in plain words: see `docs/GUIDE-fill-magic-eraser-canvas.md`, Part 5. Notes for maintainers: `HANDOFF.md` and `docs/MAINTAINING.md`.

Build: `npm run build` (from the repo root) bundles `src/main.js` into `dist/app.js`.
