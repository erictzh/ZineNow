## Intro

The vertical line between the preview and the side panel is a **handle**: drag it to make the editor panel wider or narrower. The width is remembered next time you open the app.

## How to use

- **Drag** the line left or right.
- **Double-click** it, or press **Home** while it is focused, to go back to the default width (40% of the window).
- **Keyboard:** click the line or Tab to it, then **←** makes the panel 16 px wider and **→** 16 px narrower.
- The panel is never narrower than **300 px** (enough to type and read the settings) and the preview always keeps at least **320 px**. Shrinking the browser window pulls the panel in so the preview keeps its room.

## How it works

The panel's width is a CSS **variable** (`--md2ebook-sidebar-width`), and the style sheet uses it for the panel's width. Changing the width is just changing that one variable on the page's root element; removing it restores the default.

**Dragging** uses **pointer capture**: on pressing the mouse button, the handle asks the browser to send *all* later mouse movement to it, even if the pointer leaves the thin line. Without this, a fast drag would "lose" the line. While dragging, text selection is switched off (`userSelect = "none"`), or you would highlight text by accident.

Since the panel is on the right, its width is the **distance from the pointer to the right edge of the body**: `body.right − pointer.x`.

**Remembering:** the width is saved in `localStorage` only when the drag ends (not on every pixel of movement). When the app starts, a saved width is applied **before the first paint** (`useLayoutEffect`), so you never see the panel jump.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `PanelResizer`

```js file=apps/Markdown-to-PDF/src/ui/PanelResizer.jsx fn=PanelResizer
```

**The Logic:**
- `useRef` is a box that keeps a value between redraws without causing one: `handleRef` points at the handle element; `widthRef` holds the current width in pixels (or `null` while it is the default).
- `clamp(px)` limits a width. `most` is the room left for the panel: the body's width minus `MIN_PREVIEW`, but never below `MIN_PANEL`. `Math.max(MIN_PANEL, px)` lifts too-small values, `Math.min(most, …)` cuts too-large ones, and `Math.round` keeps whole pixels.
- `apply(px, save)` sets or clears the CSS variable and, if `save` is true, writes it to storage. Each storage call is in `try … catch`, because storage can be blocked (private windows); then the width just is not remembered.
- `onPointerDown` captures the pointer; `onPointerMove` (only while captured) applies `body.right − e.clientX`; `endDrag` releases it and saves once. `onKeyDown` adds or subtracts `KEY_STEP` (16) from the **current** width, measured from the panel itself (`panelWidth`).
- The `resize` listener re-clamps the width when the window shrinks.

**Worked example.** The body is 1000 px wide: `most = max(300, 1000 − 320) = 680`.
| Pointer's right-edge distance | `clamp` result | Why |
|---|---|---|
| 200 | **300** | below the minimum |
| 450 | **450** | fine |
| 900 | **680** | the preview must keep 320 |

Pressing ← when the panel is 400 px wide applies `400 + 16 =` **416**. If the window then shrinks so the body is 600 px wide: `most = max(300, 280) = 300`, so a 416 px panel is pulled in to **300** (the preview gets 300, a little under its wish, because the panel's minimum wins).
