## Intro

Zines get made on tablets too. Three small shared pieces make the apps comfortable with a finger: an **input-mode marker** (bigger targets while a finger is being used), a **pinch gate** (two-finger pans don't zoom by accident) and ZEditor's **touch bridge** (finger drags drive the same code as mouse drags).

## How to use

- Touch the screen and controls grow a little; touch nothing and move the mouse and they shrink back. Nothing changes for a mouse user.
- **One finger** edits; **two fingers** scroll and **pinch to zoom**. Move two fingers together to scroll without the zoom wobbling.
- In ZEditor a **touch bar** supplies Shift, Alt and Delete.

## How it works

### Input mode

`installInputMode` listens (in the capture phase) for pointer events. A **pointer** is the browser's one idea covering mouse, finger and pen; each event has `pointerType` (`"mouse"`, `"touch"`, `"pen"`). After a press with a finger or pen the page's root gets `data-input="touch"`; after a mouse press, or a mouse move with no button down, `"mouse"`. The stylesheet uses selectors such as `[data-input="touch"] button { min-height: 44px }`.

### The pinch gate

Two fingers moving together never keep exactly the same distance apart. If every tiny change zoomed, panning would "shake". The gate keeps the zoom at exactly 1× (no zoom) until the distance has changed by more than **30%** (tuned on a tablet: 15% and 25% still wobbled). Once it zooms, it keeps zooming until the fingers lift, **measured from that moment** so the zoom picks up smoothly instead of jumping by 30%.

The test uses a **logarithm**: `|ln(scale)| < ln(1 + threshold)`. Logs make "doubling" and "halving" symmetric, so shrinking to 70% counts the same as growing to about 143%.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `createPinchGate`

```js file=shared/js/pinchGate.js fn=createPinchGate
```

**The Logic:** a **closure**: `base` is a private variable that lives between calls. The first calls return 1 while the raw scale (fingers' gap now ÷ gap at the start) stays inside the dead zone. `!(rawScale > 0)` also catches `NaN` and non-positive numbers (all comparisons with `NaN` are false). Once outside, `base = rawScale` fixes the starting point, and every later call returns `rawScale / base`.

**Worked example** (threshold 0.3; the dead zone is raw scales between 1/1.3 = 0.769 and 1.3, because `ln(1.3) = 0.262`):
| Raw scale | Returned | Why |
|---|---|---|
| 1.1 | 1 | inside the dead zone |
| 1.25 | 1 | still inside |
| 1.4 | **1** | passed: `base = 1.4`, `1.4 / 1.4` |
| 2.8 | **2** | `2.8 / 1.4` |
| 1.0 | 0.714 | `1.0 / 1.4` (it does not snap back) |
| 0.5 | 0.357 | `0.5 / 1.4` |

Shrinking works the same way with a fresh gate: raw `0.9` → **1** (inside the dead zone, since `ln 0.9 = −0.105`); `0.7` → **1** (`ln 0.7 = −0.357` is outside the zone, so `base = 0.7` and `0.7 / 0.7 = 1`); then `0.6` → **0.857** (`0.6 / 0.7`) and `0.3` → **0.429** (`0.3 / 0.7`). (Checked by running the real function.)

### `installInputMode`

```js file=shared/js/inputMode.js fn=installInputMode
```

**The Logic:** `mark(kind)` only writes the attribute if it changed (`root.dataset.input !== kind`), avoiding needless style recalculation. The pointermove listener switches back to `"mouse"` only for a **mouse with no buttons pressed** (`e.buttons === 0`), so a mouse used while the finger-mode is on corrects itself, but a finger drag never flips it.

### ZEditor's touch bridge

```js file=apps/ZEditor/src/ui/touchInput.js fn=mouseEventFrom,rulerNear
```

**The Logic:** all of ZEditor's drags were written for the mouse (`mousedown`, window `mousemove`, `mouseup`). Instead of rewriting each, the bridge **feeds finger and pen presses into the same handlers**: `mouseEventFrom` builds a `new MouseEvent(type, { clientX, clientY, shiftKey: real Shift or the touch bar's toggle, … })`, and `send` dispatches it to the element that was pressed. `rulerNear` makes a finger just below a thin ruler count as on it (`RULER_SLOP_PX = 12`), since fingers report a point a little lower than where they seem to touch. A finger press waits 120 ms (`FINGER_HOLD_MS`) before acting, in case a second finger lands (a scroll or zoom, not an edit).

**Worked example.** A finger lands on a rectangle at (200, 300) with the touch bar's Shift toggled on: after 120 ms with no second finger a `mousedown` at (200, 300) with `shiftKey: true` is dispatched to the rectangle; moves become `mousemove`s; the lift becomes `mouseup`. ZEditor's own mouse code cannot tell the difference. A second finger within the 120 ms cancels it: nothing is edited and the two fingers scroll and zoom.
