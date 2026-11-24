## Intro

A finger cannot hold Shift or press Delete. The **touch bar** is a small floating bar at the bottom left of the canvas that appears **only while you use a finger or pen**. It gives you sticky **Shift** and **Alt** switches and the most useful item buttons. Under it, a "touch bridge" makes every drag in the editor work with a finger.

## How to use

- **Shift** and **Alt** are toggles: tap once to switch on (it stays on), tap again to switch off. While on, every press counts as if the key were held: add to the selection, keep proportions, snap turns to 15°, draw at 45° (Shift); move without snapping to guides, pick one item out of a group (Alt).
- With an item selected, more buttons appear: **Edit text** (text boxes), **Crop** (images, not rotated), **Clipping mask**, **Duplicate** and **Delete**.
- While you are drawing a Marquee polygon: **Close** and **Undo point**.
- **One finger** edits; **two fingers** scroll and pinch-zoom the page.
- A **double tap** acts as a double-click (it starts editing a text box).
- With a mouse the bar is hidden.

## How it works

### The bar sends real key presses

Rather than duplicate each action, every button dispatches the **same keyboard event** the key would. Delete is `pressKey("Delete")`, Duplicate is Ctrl+C then Ctrl+V, Clipping mask is Ctrl+Alt+G. The single keyboard handler ([Keyboard shortcuts](zeditor/workspace/keyboard-shortcuts)) then does the work, so each button does exactly what its key does and the two can never drift apart.

### Sticky modifiers

The Shift/Alt buttons call `setTouchModifier`, which stores the flag in a small module-level object. The synthetic mouse events described below read it when they are made (`shiftKey: e.shiftKey || heldKeys.shift`). For ordinary clicks outside the canvas (the Layers panel, the page list), `withTouchModifier` does the same but only while a finger is in use, so a Shift left on does not linger for the mouse.

### The touch bridge: finger events become mouse events

Every drag in ZEditor (move, resize, rotate, draw, erase, crop, measure, guides) was written for mouse events. A browser only turns a finger *tap* into mouse events; a finger *drag* scrolls the page. Instead of rewriting each tool, `installTouchInput` listens to **pointer events** and re-sends a finger press on a drag surface as `mousedown`, its moves as `mousemove` and the release as `mouseup`, with the same position and Shift/Alt flags. Mouse input never goes through it. This is the **adapter pattern**: one small piece translates between two input systems.

### Telling one finger from two

A finger press waits **120 ms** (or until it moves) before acting. If a second finger lands in that time, it is a scroll or pinch, and nothing is edited. A pen never waits. Rulers are thin, so a finger within 12 px below or beside a ruler counts as on it (a finger reports a point a little lower than it seems to touch). A second tap within 350 ms and 24 px becomes a double-click.

### Styling by input kind

After every press the bridge sets `<html data-ze-input="touch|mouse">`. The stylesheet uses it to give handles bigger targets only while a finger is being used.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### A button is a key press

```js file=apps/ZEditor/src/ui/TouchBar.jsx fn=pressKey
```

Reading it: `new KeyboardEvent("keydown", {...})` makes a pretend key press, and `window.dispatchEvent` sends it, so the one real keyboard handler picks it up. `...mods` spreads extra flags (like `ctrlKey: true`) into the event. `bubbles: true` lets the event travel up through the page like a real one.

### Sticky Shift and Alt

```js file=apps/ZEditor/src/ui/touchInput.js fn=setTouchModifier,withTouchModifier
```

Reading it:
- `heldKeys` is a plain object living at the top of the file: shared by every function in it. `setTouchModifier("shift", true)` writes into it (`heldKeys[name]` uses the name as a key; `Boolean(on)` forces a true/false value).
- `withTouchModifier` answers "should this click count as Shift/Alt-held?": `real` is the actual key (`e[name + "Key"]` builds `shiftKey` or `altKey` from the name). The toggle only counts while `<html data-ze-input="touch">`, so a toggle left on never affects the mouse.

### Pretending to be a mouse

```js file=apps/ZEditor/src/ui/touchInput.js fn=mouseEventFrom,send
```

Reading it:
- `mouseEventFrom` builds a fake `MouseEvent` from a finger's **pointer event**: same position (`clientX`, `clientY`), always the left button (`button: 0`), and `buttons: 1` (a button is held) except on release. `...extra` lets the caller add or override fields.
- `shiftKey: Boolean(e.shiftKey) || heldKeys.shift`: Shift counts if the real key *or* the touch toggle is on (`||` means "or").
- `send` delivers the event to the element that was pressed; `el.isConnected` is false if a redraw has since removed that element, and then it goes to the `document` instead so nothing is lost.

### Is the finger near a ruler?

```js file=apps/ZEditor/src/ui/touchInput.js fn=rulerNear
```

Reading it: it loops over both rulers and measures each with `getBoundingClientRect()`. `inside` is a **rectangle test**: x and y between the edges, but with 12 px (`RULER_SLOP_PX`) of extra reach below the top ruler or right of the left one, because a finger reports its contact point slightly away from where it appears to touch. It returns the first ruler that matches, or `null`.
