## Intro

The **settings panel** on the right holds every choice, split into a **Basic** tab and an **Advanced** tab. The **gear** at the bottom left controls how the app itself looks. This page explains how the panel turns your ticks and numbers into the app's working values, and what each size button does.

## How to use

**Basic tab:** Zine Size (Half, Quarter, Eighth, plus More Sizes), Select Pages, Insert Blank Pages, and the **Reverse Impose** switch.
**Advanced tab:** One or Both sides, Portrait or Landscape, Side or Top spine, Flip Back Cover, Two Copies per sheet (quarter size), Custom Signature Size, the guides (Margins, Center, Folds), and the paper size with its presets and units. A link to **Folding Instructions** for your exact setup appears too.

**Gear (bottom left):** **Interface size** (75% to 175%) and **Show** (hide the top bar, or hide the settings panel; the preview always stays). Choices are remembered in this browser.

**Size buttons set defaults.** Picking Quarter switches to Double-sided, Portrait, Side spine; Half switches to Double-sided with the spine following the orientation; Eighth and all the smaller sizes switch to Single-sided, Portrait, Side. After that you can change any of them.

## How it works

### One bag of values

All the current choices live in a single object called `state`. Everything else reads from it. A single function, `refreshSpecs`, is the **only** way a change is processed. Whenever any option changes, it does these steps in order:

1. **Read** every box and button into `state` (`readOptionsIntoState`).
2. **Name** the layout with a short code (`updateSpecString`).
3. **Compute the grid**: pages per sheet, columns, rows, paper orientation (`sheetGrid`: [Sheet sizes](zinearranger/sheet-sizes)).
4. **Update the labels**, then compute the **sheet pixel sizes** and CSS variables (`applySheetSizes`).
5. **Redraw** the loaded PDF, if any (`selectFile`: [Loading a PDF](zinearranger/load-pdf)).

### The spec code

A short text name describes the choice: **size**, **1 or 2** sides, **p**ortrait or **l**andscape, **s**ide or **t**op spine: `8-1ps` is an eighth, one-sided, portrait, side-spine zine. It is used as the address of the Folding Instructions page (`folding.html?8-1ps`).

### Reverse Impose mode

The switch hides eleven option cards (by adding a CSS class, `ri-hidden`, and marking them `aria-hidden` so screen readers skip them), disables the Advanced tab (switching back to Basic first if it was open), and **reprocesses the file** in the new mode.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `refreshSpecs`

```js file=apps/ZineArranger/src/optionsPanel.js fn=refreshSpecs
```

**The Logic:** `Object.assign(state, sheetGrid(state))` copies the four values `sheetGrid` returns (`pgmult`, `divHoriz`, `divVert`, `pagePortrait`) **onto** `state`, overwriting the old ones. Each step is a named function so the order is easy to read. The log gets one line at the start (`logCmd`) and one at the end (`logResult`).

### `readOptionsIntoState`

```js file=apps/ZineArranger/src/readOptions.js fn=readOptionsIntoState
```

**The Logic:**
- The zine size is one of ten radio buttons; the chain of `if … else if` finds the ticked one (`.checked` is true for a ticked box) and stores the matching size constant.
- Yes/no options are a single line each: `document.getElementById("dx-double").checked`.
- **Custom signature size:** the number box is shown only when its checkbox is ticked (`display = "inline"`); otherwise `sigSize = 0` ("automatic").
- **Insert Blank Pages:** `value.split(",")` cuts the text at commas; `.map(parseInt…)` reads each as a number; `.filter(n => !isNaN(n) && n > 0)` throws away non-numbers and zero or negatives.
- **Select Pages** is saved as raw text only: it can only be understood once the PDF's real page count is known ([Loading a PDF](zinearranger/load-pdf)).

**Worked example.** The box *After page #* holding `4, 4, x, 0, 9` gives `blankAfterPages = [4, 4, 9]`: two blanks after page 4 and one after page 9.

### `updateSpecString`

```js file=apps/ZineArranger/src/readOptions.js fn=updateSpecString
```

**The Logic:** it starts with the size's code from `SIZE_CHARS` (`["2-","4-","8-","12-",…]`, indexed by size number) and adds one character per choice. The last lines write a link into the page's `folding-ins` element (HTML in a string).

**Worked example.** Eighth, one-sided, portrait, side → `8-` + `1` + `p` + `s` = **`8-1ps`**. Quarter, two-sided, landscape, top → **`4-2lt`**. 1/16th (index 4, `16-`), one-sided, portrait, side → `16-1ps`.

### `toggleReverseImpose` and `switchOptionsTab`

```js file=apps/ZineArranger/src/optionsPanel.js fn=toggleReverseImpose,switchOptionsTab
```

**The Logic:** `cardsToHide` is a list of element names. `forEach` runs a small function on each: it adds or removes the class, and sets or removes `aria-hidden`. The Advanced tab is disabled (`setAttribute("disabled", "true")`). `switchOptionsTab` shows one tab's content by switching its `display` between `"flex"` and `"none"`, and marks the tab button `active`.

### The size buttons

```js file=apps/ZineArranger/src/optionsPanel.js fn=selectQuarterSize,selectHalfSize
```

**The Logic:** each button only **ticks the right boxes** and calls `refreshSpecs()`; it needs no calculation of its own. In half size, the spine follows the orientation: `spine-side.checked = ori-portrait.checked`.

### The gear

```js file=apps/ZineArranger/src/displaySettings.js fn=installArrangerDisplaySettings
```

**The Logic:** the gear is shared by all ZineNow apps (`shared/js/displaySettings.js`); this app just **describes** its settings: one slider (interface size, which sets a CSS variable `--zn-ui-zoom` as `value / 100`) and two checks that put a class (`za-hide-topbar`, `za-hide-panel`) on the page's root so the stylesheet can hide parts. The saved values live in the browser under the key `zinearranger.displayPrefs`.

**Worked example.** Interface size 125 → `--zn-ui-zoom: 1.25`. The **sheet preview** is *not* scaled by it: it has its own zoom ([Preview zoom and panel resize](zinearranger/zoom-resize)).
