## Intro

The **gear** at the bottom left of each app opens a small **Display** pop-up with personal settings: *Interface size*, *text size*, *Dark paper*, *show or hide* parts of the window. The same code builds it for every app; each app only **describes** its settings. The choices are remembered in your browser (not in the document).

## How to use

- Click the **gear**. Drag a **slider** or use its **− / +** buttons; tick **checkboxes**; pick from a **dropdown** (for example *Panels: both / Preview only / Editor only*).
- **Reset** returns every setting to its default (greyed out when nothing was changed).
- A small grey link line at the bottom gives the source code and notices ([About and Source link](start/shared-parts/about-and-source)).
- Press **Esc** or click elsewhere to close it.
- Some ticks ask first (a pop-up with Cancel and OK), such as ZEditor's *Experimental Features (AI & other development)*.

## How it works

### Describing settings as data

An app passes a configuration: `sliders` (key, label, min, max, step, initial, unit, the CSS variable it sets and how to turn the number into CSS text), `groups` with `checks` (a key, label, and the CSS class it toggles) and `choices` (a dropdown whose options set several flags at once). This is **data-driven design**: to add a setting, add a row.

### What a setting does

- A **slider** sets a **CSS custom property** (a "variable" in the stylesheet, like `--zn-ui-zoom`) on the page's root element; the app's CSS uses `var(--zn-ui-zoom)`.
- A **checkbox** adds or removes a **class** (like `md2ebook-dark-paper`) on the root element; the CSS reacts to that class.
- After every change the window receives a `zn-display-prefs` **event**, so scripts can react (for example, to tell a sandboxed preview frame).

### Saved safely

Settings are written as JSON to `localStorage` under the app's own key; reading is wrapped in `try/catch` and each value is **validated**: sliders are clamped into range (a hand-edited or corrupt number cannot break the app), checks must be exactly `true`.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Clamping and snapping

```js file=shared/js/displaySettings.js

const clampTo = (v, s) => (Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : initialOf(s));
const snap = (v, s) => clampTo(Math.round(v / s.step) * s.step, s);
// Rounds away float noise from steps like 0.5 (13.5 + 0.5 * 3).
const tidy = (v) => Math.round(v * 1000) / 1000;
```

**The Logic:** a slider's `initial` can be a number or a function (`initialOf` calls it); the apps' *Interface size* uses `desktopDefault(75, 100)`, which gives **75** where the main input is a mouse or touchpad (`(hover: hover) and (pointer: fine)`) and **100** on a tablet or phone, so the same page looks right on both unless the person chose a size. `clampTo(v, s)` returns the slider's initial value if `v` is not a real number (`Number.isFinite` is false for `NaN`), otherwise keeps `v` between `min` and `max`. `snap` rounds to the nearest step first (`Math.round(v / step) * step`), then clamps. `tidy` rounds to three decimals to remove float noise from steps like 0.5.

**Worked example** (interface size: min 75, max 175, step 5, initial 100). `snap(122)` → `round(24.4) × 5 =` **120**; `snap(122.6)` → `round(24.52) × 5 =` **125**; `snap(40)` → 40 is under the minimum → **75**; `snap(500)` → **175**; `clampTo(NaN)` → **100**. For the editor text size (10 to 28, step 0.5): `tidy(13.5 + 0.5 × 3)` → **15**. (All checked by running the same lines.)

### Loading, applying, saving

```js file=shared/js/displaySettings.js fn=load,apply,set
```

**The Logic:** `load` reads `localStorage` (a corrupt or blocked store gives `{}`), then builds the settings object: each slider through `clampTo(Number(saved[key]))`, each check with `saved[key] === true`; for a **choice** it also checks that the saved flags match one of the options (`optionIndex < 0` means "a mix that matches nothing"), else it uses the default option. `apply` writes each slider's CSS variable on `document.documentElement` (the `<html>` element), toggles classes with `classList.toggle(name, on)`, and dispatches the event. `set(changes)` merges (`{ ...prefs, ...changes }` makes a new object), saves, applies and refreshes the controls.

**Worked example.** Saved text `{"uiScale": 9000, "darkPaper": "yes"}` loads as `uiScale = 175` (clamped) and `darkPaper = false` (since `"yes" === true` is false). A choice *Panels* with options `Preview only {hideSidebar}`, `Editor only {hidePreview}`, `Both {}`: saved `{hideSidebar: true, hidePreview: true}` matches none, so it falls back to the default option.

### One function for the pop-up's confirm

```js file=shared/js/displaySettings.js fn=askConfirm
```

**The Logic:** it returns a **Promise** that resolves `true` on OK and `false` on Cancel, Escape or an outside click; the Escape listener is registered in the **capture** phase so it runs before others, and removed in `done`. The check box code uses it: `askConfirm(c.confirm).then(ok => { if (ok) set({ [c.key]: true }); })`, so the setting only turns on if confirmed.
