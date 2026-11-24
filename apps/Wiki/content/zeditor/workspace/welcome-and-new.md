## Intro

When ZEditor opens with nothing loaded, a **Welcome** pop-up asks what you want to do: start a **new document**, or **open** a saved project (`.znow`) or a PDF. The **New document** dialog sets the paper size, orientation and page count of a blank zine.

## How to use

**Welcome pop-up**
- **New document** opens the New document dialog.
- **Open existing:** pick "ZineNow project (.znow)" or "PDF file" in the list, then press **Open…**. A PDF's pages become the zine's pages.
- Close it with × or Escape and work from the sidebar's **Load PDF** / **New Document** buttons instead.

**New document dialog**
1. **Paper size:** A3, A4, A5, A6, US Letter, Half Letter, Digest, **Custom size (mm)…**, or **No paper: auto-expanding canvas** (see [No paper](zeditor/workspace/no-paper)).
2. **Custom size:** width and height in millimetres, from 20 to 1200.
3. **Orientation:** Portrait or Landscape (hidden for "No paper").
4. **Pages:** 1 to 100. You can add or remove pages later.
5. **Create.** If you came here through *Project → New Project*, an **Open a PDF instead** button is also offered.

## How it works

### Sizes are stored in points

A PDF page is measured in **points**: 72 to the inch. Every paper preset is stored in points, in portrait, and Landscape simply swaps width and height. The dialog shows millimetres and inches only for reading: it converts with `mm = pt / 72 × 25.4`. A5, for example, is 419.53 × 595.28 pt, which the dialog shows as 148 × 210 mm.

### Typing safely

The width, height and page-count boxes keep what you type as text, and only check it when it is used. A number outside the allowed range is **clamped** (squeezed to the nearest limit, 20–1200 mm or 1–100 pages) and anything unreadable falls back to a default (148 and 210 mm, one page). When you leave the box it rewrites itself with the value that will really be used, so what you see is what you get.

### Same dialog, two doors

`NewDocumentDialog` is used from the Welcome pop-up, the sidebar and *New Project*. `onOpenPdf` is optional: only the *New Project* route passes it, which is why the "Open a PDF instead" button appears there only.

## Code

The paper presets (portrait, in points):

```js file=apps/ZEditor/src/constants.js
  { key: "a4", label: "A4", width: 595.28, height: 841.89 },
  { key: "a5", label: "A5", width: 419.53, height: 595.28 },
  { key: "a6", label: "A6", width: 297.64, height: 419.53 },
```

Points to millimetres, and the clamping of a typed size:

```js file=apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx
const ptToMm = (pts) => (pts / POINTS_PER_INCH) * MM_PER_INCH;
const mmToPt = (mm) => (mm / MM_PER_INCH) * POINTS_PER_INCH;
```

```js file=apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx
const clampMm = (text, fallback) => {
  const v = Number(text);
  return Number.isFinite(v) && v > 0 ? Math.max(CUSTOM_MIN_MM, Math.min(CUSTOM_MAX_MM, v)) : fallback;
};
```

Landscape just swaps the two sides:

```js file=apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx
  const width = landscape ? preset.height : preset.width;
  const height = landscape ? preset.width : preset.height;
```
