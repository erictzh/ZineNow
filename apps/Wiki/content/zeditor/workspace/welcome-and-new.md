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

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Points and millimetres

```js file=apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx fn=ptToMm,mmToPt,formatMm
```

**The Logic:**
- `const` names a value that will not be reassigned. `POINTS_PER_INCH` is 72 and `MM_PER_INCH` is 25.4, so `(pts / 72) * 25.4` converts points to millimetres, and `mmToPt` is the same sum reversed.
- `(pts) => ...` is an **arrow function**: a short way to write a function, here with the result written straight after the arrow, no `return` needed.
- `formatMm` multiplies by 10, rounds, and divides by 10: that rounds to **one decimal place** (148.0 becomes 148, 139.7 stays 139.7). `String(...)` turns the number into text for display.

**Worked example.** A5 is 419.53 pt wide. `(419.53 / 72) × 25.4 = 148.0009`. `formatMm`: `148.0009 × 10 = 1480.009`, `Math.round` gives 1480, `/ 10` gives 148, and `String(148)` is `"148"`. A Half Letter page is 396 pt: `(396 / 72) × 25.4 = 139.7`, shown as `"139.7"`.

### `clampMm`: never trust what was typed

```js file=apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx fn=clampMm
```

**The Logic:**
- The box keeps what you type as **text**, so the first step is `Number(text)`, which turns it into a number (or `NaN`, "not a number", if it cannot).
- `Number.isFinite(v) && v > 0` checks the value is a real, positive number. `&&` means "and".
- Then `Math.min(max, ...)` caps it at 1200 and `Math.max(min, ...)` raises it to at least 20: that is **clamping**, squeezing a value into an allowed range. If the test failed, the `fallback` is used (the `? :` is a **ternary**: "if this, then that, otherwise the other").

**Worked example.** The limits are 20 and 1200 mm; the fallback is 148.

| You type | `Number(text)` | Result |
|---|---|---|
| `300` | 300 | `min(1200, max(20, 300))` = **300** |
| `5000` | 5000 | `min(1200, max(20, 5000))` = **1200** |
| `10` | 10 | `min(1200, max(20, 10))` = **20** |
| `-5` | −5 | not above 0, so the fallback **148** |
| `abc` | `NaN` | `Number.isFinite(NaN)` is false, so **148** |

### Choosing the final page size

```js file=apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx
  const preset = custom
    ? { width: mmToPt(customW), height: mmToPt(customH) }
    : noPaper ? CANVAS_PAGE_START
    : NEW_DOCUMENT_PRESETS.find((p) => p.key === presetKey) || NEW_DOCUMENT_PRESETS[0];
  const landscape = orientation === "landscape";
  const width = landscape ? preset.height : preset.width;
  const height = landscape ? preset.width : preset.height;
```

**The Logic:**
- A chain of ternaries picks the page: a custom size, else the starting size of the "No paper" canvas, else the preset whose `key` matches (`.find` returns the first match). `|| NEW_DOCUMENT_PRESETS[0]` falls back to the first preset (A3) if nothing matched.
- The preset is always portrait. For landscape, width and height simply swap.
