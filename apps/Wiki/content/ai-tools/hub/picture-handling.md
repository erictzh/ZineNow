## Intro

Every tool works on **one shared picture**. The picture module opens it, shows it, lets you zoom and move it, keeps the **undo history**, and saves it. Because tools never own the picture, Undo works the same way for every tool, and you can chain them: remove an object, then the background, then upscale.

## How to use

- **Open:** the Open button, drag a file onto the picture area, or paste a picture (Ctrl/⌘ V).
- **Zoom:** the mouse wheel; **move:** drag (with the Move tool or two fingers). On a touchscreen, two fingers always move and pinch-zoom, whichever tool is active.
- **Undo / Redo:** up to **8 steps**. **Hold to compare:** press and hold to see the picture as first opened (not available after a crop changed its size).
- **Save PNG:** saves the picture as `name-edited.png`.
- A picture bigger than **4096 px** on its longest side is **shrunk** when opened, to save memory; the message says so.

## How it works

### Layers of canvases

The picture area is a stack of **canvases** (drawing surfaces) all the same size: the **picture**, a hidden copy of the **original** (for Hold to compare), and **overlays** the tools add on top (the brush marks, a selection). A single CSS transform (`translate` and `scale`) on their common parent moves and zooms all of them together, so overlays always line up.

### View maths

The view is three numbers: a scale `s` and a position `x`, `y`. A screen point converts to a picture point by `(screenX − left − x) / s`.
- **Fit** picks the scale that makes the picture fill the area (never above 100%, then 96% of that for a margin) and centres it.
- **Wheel zoom** multiplies the scale by `e^(−deltaY × 0.0015)`, limited to 0.05 to 40, and shifts the position so the point under the pointer **stays under the pointer**.
- **Pinch** does the same with the middle of two fingers.

### History

Before a tool changes the picture it takes a **snapshot**: an `ImageBitmap`, a fast in-memory copy. When it finishes, it calls `commit(before)`, which pushes that snapshot onto the undo list (dropping and freeing the oldest beyond 8) and empties the redo list. Undo swaps: the current picture goes onto the redo list and the last snapshot is drawn back.

### Pointer gestures

One pointer goes to the active tool's **handler** (`down`, `move`, `up`, `cancel`) with the position already converted to picture coordinates. Two pointers become a pinch; if a one-finger stroke was in progress, it is **cancelled** first, so a second finger never leaves a stray dot.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `createPicture`

```js file=apps/AiToolsLocal/src/picture.js fn=createPicture
```

**The Logic:**
- **Private state** lives in the variables at the top (`let view`, `undoStack`…), visible only inside this function: a **closure**. The function returns an object of public things: **getters** (`get loaded()`) that read the private values, and functions.
- `toImage(e)` converts a pointer event to picture coordinates: take the stage's on-screen box (`getBoundingClientRect`), subtract the stage's corner and the view offset, divide by the scale.
- `applyView` writes the transform as text: `translate(x px, y px) scale(s)` on the `world` element, then calls the listeners (a tool's brush ring, for instance).
- `open(file)` checks the file type, decodes it with `createImageBitmap`, computes the shrink factor `k = min(1, 4096 / longestSide)`, sets every canvas to the new size, draws the picture on the main and the original canvas, frees the old history (`b.close()` releases the bitmap's memory), and fits the view.
- `snapshot()` is `createImageBitmap(imgC)`; `commit(before)` pushes it. `swap(from, to)` is shared by Undo and Redo: it pushes the *current* picture to the other list, pops the one to restore, resizes if needed (a crop changes the size), and draws it.
- `toBlob()` wraps the canvas's `toBlob` in a **Promise** and gives a PNG.
- The pointer code keeps a `Map` of the pointers currently down; with exactly two, it measures their distance `d` and middle `(cx, cy)` and rescales by `d / previousD`.

**Worked example (fit).** A 4000 × 3000 picture in an 800 × 600 stage: `s = min(800/4000, 600/3000, 1) × 0.96 = 0.2 × 0.96 = 0.192`; `x = (800 − 4000 × 0.192) / 2 =` **16**, `y = (600 − 3000 × 0.192) / 2 =` **12**. The picture appears 768 × 576 px, centred.

**Worked example (shrink).** A 6000 × 4000 photo: `k = 4096 / 6000 = 0.6827`, so it becomes `round(4096) × round(2730.67) =` **4096 × 2731**, and the message adds *It was shrunk so it fits in memory.*

**Worked example (wheel).** Scale 0.192, one wheel notch `deltaY = −100` (zoom in): `exp(100 × 0.0015) = exp(0.15) = 1.1618`, so `s2 = 0.192 × 1.1618 =` **0.2231**. The picture point under the pointer is found *before* the change, then the offset is recomputed so it is still under the pointer.

**Worked example (history).** Nine tool runs in a row: the undo list holds only the **last 8** snapshots: on the ninth, `undoStack.shift().close()` removes and frees the oldest, so the very first state can no longer be reached.
