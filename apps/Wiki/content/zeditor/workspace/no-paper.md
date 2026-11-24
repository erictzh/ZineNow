## Intro

"No paper" is a page without a fixed sheet: an **auto-expanding canvas**. You draw anywhere, even past the edge of the first view, and the canvas grows to hold everything. Use it for mood boards, collages and layouts where you do not know the final size yet. Save the project (`.znow`) to keep it.

## How to use

1. *New Document → Paper size → No paper: auto-expanding canvas → Create.* It starts at 800 × 600 pt.
2. Place or draw items near an edge, or outside the canvas on the pasteboard. When you let go of the mouse or finger, the canvas grows on that side.
3. It only grows, never shrinks. Growing left or up does not make anything seem to move.
4. Undo works as usual; the canvas size is part of each undo step.

## How it works

### The rule

Each time you release the mouse, the editor takes the **bounding box** of all items on the page and compares it with the canvas. If an item's edge is within **40 px** of a canvas edge, or past it, the canvas grows on that side until there is **240 px** of free room beyond the content. These two numbers are a **hysteresis**: the trigger is closer than the margin that is added, so the canvas does not grow again after every tiny move.

### Growing left or up: moving the origin

Page coordinates start at the top-left corner. If the canvas grows to the left, the corner moves, so every item is shifted right by the same amount `sx` (and down by `sy` for growth upward). The view is scrolled by the same amount, so on screen nothing seems to have moved. This is a **coordinate shift**, with the scroll compensation applied once by `ComposeCanvas` through a small shared variable (`canvasGrowShift`).

### Not while dragging

Growth waits for the mouse button to come up, so a drag in progress is never disturbed. A window-level `mousedown`/`mouseup` pair sets a "held" flag, and a state counter ticks one beat after release (a `setTimeout` of 0 lets the gesture's last update land first), which re-runs the growth check.

### One undo step

Growing is not an undo step of its own. The page's size and its items' positions are saved together in every undo snapshot, so undoing a move also puts the canvas back.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `growthPlan`: does the canvas need to grow?

```js file=apps/ZEditor/src/state/useCanvasGrow.js fn=growthPlan
```

Reading it:
- It returns `null` ("nothing to do") if the page is not a no-paper page or has no items. `!page.annotations.length` is true for an empty list.
- `swapped` is true when the page is turned 90° or 270° (`rotation % 180 !== 0`; `%` is the **remainder** after dividing). A turned page swaps width and height, so `dispW` and `dispH` are the sides as they look on screen, scaled to editor pixels by `MAIN_SCALE`.
- The `for ... of` loop walks every item and keeps four running numbers: the smallest x and y and the largest right and bottom edges. Starting from `Infinity` and `-Infinity` is the classic trick: any real number beats them on the first try. `Number.isFinite` skips items with broken sizes. The result is the **bounding box** of everything on the page.
- `T` and `M` are the 40 px trigger and 240 px margin. For each side, *if* the content comes within `T` of the edge, that side moves out to leave `M` of room. `Math.min(0, x0 - M)` is negative: the canvas grows to the left. `Math.max(dispW, x1 + M)` only ever grows to the right, never shrinks.
- If all four sides are unchanged it returns `null`. Otherwise `sx` and `sy` (how far everything must shift when it grew left or up, rounded up with `Math.ceil`) and the new size come back as a small **object**, converted back from editor pixels to the page's own units.

### `grownPage`: applying the plan

```js file=apps/ZEditor/src/state/useCanvasGrow.js fn=grownPage
```

Reading it: if the canvas grew left or up (`plan.sx || plan.sy` is non-zero), every item is moved by that much with `.map`, so on screen nothing seems to move; otherwise the list is reused untouched. `{ ...page, annotations, width, height, dataUrl }` builds a **new** page object: the `...page` **spread** copies all old fields, and the later ones overwrite. The old page object is never edited, which is what the undo history and the sidebar rely on.

### `useCanvasGrow`: waiting for the right moment

A function whose name starts with `use` and which uses React's memory features is called a **hook**.

```js file=apps/ZEditor/src/state/useCanvasGrow.js fn=useCanvasGrow
```

Reading it:
- `heldRef` is a ref (a box that does not cause redraws) that says "a mouse button is down". The first `useEffect` adds window listeners in the **capture** phase (`true` as the third argument: they run before any other handler can stop the event).
- `setTimeout(() => setReleaseTick(...), 0)` waits "zero milliseconds", which really means *after the current event has finished*, so the drag's final update lands first. `releaseTick` is a counter in state: changing it makes React run the second effect again.
- The second effect (which runs when `pages`, the selected page or `releaseTick` change) first bails out if a button is held or no page is a canvas. It builds a `Map` of pages that need growing (`plans`).
- If the current page grew left or up, it leaves a note in the shared variable `canvasGrowShift` (the page's old screen position and the shift), which the canvas reads once to scroll by the same amount.
- `setPages((prev) => prev.map(...))` swaps in the grown pages. Passing a function to a state setter gives it the **latest** value (`prev`), the safe way to update state from the old one.
