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

A button is a key press:

```js file=apps/ZEditor/src/ui/TouchBar.jsx
function pressKey(key, mods) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods }));
}
```

```js file=apps/ZEditor/src/ui/TouchBar.jsx
          onClick={() => pressKey("g", { ctrlKey: true, altKey: true })}
```

The sticky modifiers, and how a made-up mouse event carries them:

```js file=apps/ZEditor/src/ui/touchInput.js
const heldKeys = { shift: false, alt: false };
export function setTouchModifier(name, on) {
  heldKeys[name] = Boolean(on);
}
```

```js file=apps/ZEditor/src/ui/touchInput.js
    shiftKey: Boolean(e.shiftKey) || heldKeys.shift,
    altKey: Boolean(e.altKey) || heldKeys.alt,
```

The timings:

```js file=apps/ZEditor/src/ui/touchInput.js
const FINGER_HOLD_MS = 120; // how long a finger press waits for a possible second finger
const RULER_SLOP_PX = 12; // a finger this close below/beside a ruler counts as on it
const DOUBLE_TAP_MS = 350;
```
