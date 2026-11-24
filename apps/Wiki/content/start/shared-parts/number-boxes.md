## Intro

Every number box in ZineNow (font size, margins, brush size…) is made friendlier for **tablets and phones**, and for anyone who types: you can **delete the whole number and type a new one**, and each box has **−** and **+** buttons beside it. A plain browser number box does neither well: it tends to put the old digits straight back as you delete them, and its tiny spinner arrows are hard to hit with a finger.

## How to use

- Click in a box, press Backspace until it is empty and type a new number. While it is empty, nothing changes in the app. Leave the box empty and **the last good value returns**. (A few boxes mean "empty = automatic", e.g. *Stop after page*; those accept empty.)
- Press **−** or **+**: the value steps by the box's step (respecting its minimum and maximum). **Hold** a button and it repeats after a short pause.
- The buttons never take the keyboard focus: if you are typing in a box, the on-screen keyboard stays; no other box's keyboard opens.

## How it works

### Problem 1: "I can't delete the last digit"

Apps built with React keep the number in a variable and write it back into the box whenever anything redraws. Type "1", delete it: the app reads an empty box (no number!), may substitute the old value (say 12), and writes "12" back: the digits seem undeletable. The fix has three parts:
1. **Intercept** the `input` event while a box is empty **and being typed in** (it is the focused element) and stop it (`stopImmediatePropagation`) before the app hears about it.
2. While the box is held empty, **block the app's write-backs**: the box's own `value` property (set by React) is temporarily replaced with one whose setter does nothing.
3. As soon as a real number is typed (or the box loses focus), **release** it. On leaving an empty box, the saved **last good value** is put back quietly (`writeValue`, which uses the browser's original setter so no event fires).

### Problem 2: steppers

`<span class="zn-num"><input type="number"><button data-zn-step="-1">−</button><button data-zn-step="1">+</button></span>`. A press calls the browser's own `el.stepUp()` / `stepDown()` (which obey `min`, `max` and `step`), then sends `input` and `change` events exactly as the browser's little spinner would. Float noise like 0.1 + 0.2 = 0.30000000000000004 is rounded to the step's decimals.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Holding a box empty: `holdEmpty` and `releaseEmpty`

```js file=shared/js/numberFields.js fn=holdEmpty,releaseEmpty
```

**The Logic:** `Object.getOwnPropertyDescriptor(el, "value")` fetches how the box's `value` property is currently defined *on the element itself* (React puts its own there to detect changes; a plain box has none). A **descriptor** is the object describing a property: its getter, setter and flags. `holdEmpty` remembers it in a `WeakMap` (a table keyed by elements that does not stop them being garbage-collected), then redefines `value` with the same getter but an **empty setter**: reading works, writing is ignored. `releaseEmpty` puts the saved descriptor back (or deletes the override if there was none, so the inherited one applies).

### Stepping: `stepBy`

```js file=shared/js/numberFields.js
  function stepBy(el, dir) {
    const before = el.value;
    // An empty box that shows a default as its placeholder steps from that default, not from zero.
    if (before === "" && el.placeholder !== "" && isFinite(Number(el.placeholder))) writeValue(el, el.placeholder);
    const start = el.value;
    try { if (dir > 0) el.stepUp(); else el.stepDown(); } catch (err) { return false; }
    // 0.1 + 0.1 style float noise: round to the step's decimals
    const dec = (String(el.step).split(".")[1] || "").length;
    if (dec && el.value !== "" && isFinite(Number(el.value))) writeValue(el, String(Number(Number(el.value).toFixed(dec))));
    if (el.value === start && before !== "") return false;
    el.dispatchEvent(new Event("input", { bubbles: true })); // no inputType: how the browser's spinner reports it
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
```

**The Logic:** a box that is empty but shows a numeric **placeholder** (a default shown in grey) first takes that value, so stepping starts from the default, not zero. `stepUp()` / `stepDown()` throw an error at a limit, so `try … catch` returns `false`. The number of decimals in the `step` text (`"0.1".split(".")[1].length` = 1) is used to round: `Number(Number(el.value).toFixed(dec))` removes noise. If nothing changed it returns `false` (which stops a held button repeating at the limit). Otherwise it dispatches `input` (without `inputType`, the way the browser's spinner reports) then `change`.

**Worked example.** Box with `min=0 max=1 step=0.1`, value `0.2`: `+` → `stepUp` gives `0.30000000000000004` in some browsers → `dec = 1` → `Number("0.3")` = **0.3** (checked: `(0.1 + 0.2).toFixed(1)` is `"0.3"`). At `1`: `+` leaves the value at 1 (`el.value === start`), so it returns `false` and holding stops. An empty box with placeholder `16` and `+`: becomes `16`, then 17 if step is 1.

### Wrapping a box

```js file=shared/js/numberFields.js fn=makeButton,wrapNumberInput
```

**The Logic:** for pages that no framework owns, this builds the buttons with `document.createElement`, sets `data-zn-step` (`b.dataset.znStep` becomes the attribute `data-zn-step`), and moves the box into a `<span class="zn-num">` with `insertBefore`. It does nothing if the box is already wrapped (`closest(".zn-num")`) or says `data-no-steppers`. React apps use the `NumberBox` component instead, because moving an element React created would break React.
