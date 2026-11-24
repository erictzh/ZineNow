## Intro

The top bar is ZEditor's menu bar. On the left is the app name with its **build number**; then Undo, Redo and Reload, the zine title box, and three drop-down menus: **Page**, **Project** and **Export**.

## How to use

- **Undo / Redo** (Ctrl+Z, Ctrl+Shift+Z): the buttons grey out when there is nothing to undo or redo.
- **Reload** (the circular arrow): reloads the app to pick up a new version and keeps your work: pages, items, title and the file you save to come back. The undo history starts fresh.
- **Zine title:** names the saved project and the exported PDF. Press Enter or Escape to leave the box.
- **Page menu:** each row is an on/off switch for one page feature, with **Customize…** beside it. Customize swaps the menu to that feature's settings in the same pop-up (with a back arrow) instead of opening a second window. Rows: Filter, Onion Skin, Page Numbers, Ruler Guide and Page Guide.
- **Project menu:** New Project, Save (Ctrl+S), Save As… (Ctrl+Shift+S), Load Project, the **Embed system fonts** switch and Embed Fonts…. The menu's label turns into "Saving…" and then "Saved ✓".
- **Export menu:** Export PDF, page as PNG or JPG, selection as SVG, Send to ZineArranger.
- A menu closes when you click outside it or press **Escape**.

> **Tip** The build number under the app name changes whenever the app is updated. On a tablet it tells you at a glance whether you are looking at the version you just deployed.

## How it works

### One shell, many menus

Every menu is the same small component, `TopMenu`: a trigger button plus a panel. Its contents are only created while it is open, so any state inside, such as which "Customize" view you were in, resets each time you open it. Two document-level listeners (a mouse press and a key press) close it, and they are removed again as soon as it closes.

### Keeping the panel on screen

The panel hangs under its button, right-aligned. On a narrow window that can push it past the left edge, so after each layout the code measures it and, if its left edge is less than 8 px from the screen edge, shifts it back with a CSS `translateX`. A `ResizeObserver` repeats the check whenever the panel changes size (for example when you open a Customize view).

### Rows are data

The Page menu does not hard-code its rows. `Topbar` hands `PageMenuBody` a list of row objects (`key`, `label`, `checked`, `onToggle`, `settings`), and the menu draws a switch for each and swaps to `settings` when you press Customize…. Adding a page feature to the menu means adding one object to that list.

### The build number

`__BUILD__` in the source is not a variable: the build script replaces it with a short hash of all the app's source, styles and shared files. Same files give the same number, so `npm run check` stays stable; any change gives a new one.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `TopMenu`: the drop-down shell

Every menu in the bar (Page, Project, Export) is this one component. A **component** is a function that returns a piece of the screen (written in **JSX**, HTML-like syntax inside JavaScript); **React**, the library ZEditor is built on, redraws it whenever its data changes.

```js file=apps/ZEditor/src/ui/topbar/TopMenu.jsx fn=TopMenu
```

**The Logic:**
- `useState(false)` creates a piece of memory called **state**: `open` is its current value, `setOpen` changes it (and makes React redraw). Menus start closed.
- `useRef` makes a **ref**: a box that survives redraws and can hold a pointer to a real page element (`containerRef`) or any value, without causing a redraw.
- `useEffect(() => {...}, [open])` runs code **after** the screen is drawn, and again whenever `open` changes. This one adds two **event listeners** (`mousedown`, `keydown`) only while the menu is open. The function it returns, `return () => {...}`, is the **cleanup**: React calls it to remove the listeners again, so none are left behind.
- `containerRef.current.contains(e.target)` asks: was the click inside this menu? If not, close it. `e.key === "Escape"` closes it on the Escape key.
- `useLayoutEffect` is like `useEffect` but runs before the browser paints, so the menu can be moved back on screen without a visible jump. `getBoundingClientRect()` measures an element on screen; if `left < 8` the panel is pushed right with a CSS `translateX`.
- A `ResizeObserver` calls `fit` again whenever the panel changes size. Its cleanup `disconnect()`s it.
- The `return (...)` is the JSX: a button, and, only when `open` is true (`{open && (...)}`), the panel. `children({ close })` is a **render prop**: the menu's contents are a function that receives `close`, so each item can close the menu after it runs.

**Worked example.** You open the Export menu on a narrow window and its panel's left edge ends up at `left = −20` px (off-screen). `fit()` runs: `left < 8`, so it sets `translateX((8 − (−20)) / zoom)`. At zoom 1 that is `translateX(28px)`: the panel moves 28 px right, so its left edge is at 8 px, a small margin from the edge. A panel already at `left = 50` is left alone.

### `MenuItem`: one action row

```js file=apps/ZEditor/src/ui/topbar/TopMenu.jsx fn=MenuItem
```

**The Logic:** the curly braces in the parameters, `{ label, detail, ... }`, **destructure** one object into separate variables. `onClick={() => { close(); onClick(); }}` is an **arrow function**: pressing the row closes the menu first, then runs the real action. `{detail && <span>...}` shows the second line only if there is one.

### `PageMenuBody`: rows as data

```js file=apps/ZEditor/src/ui/topbar/PageMenu.jsx fn=PageMenuBody
```

**The Logic:**
- `rows` is an array of plain **objects** (`{ key, label, checked, onToggle, settings }`), built in `Topbar.jsx`. The menu does not know what a "Filter" is: it just draws one row per object.
- `customizing` remembers which row's settings are open. `rows.find(...)` looks for the object with that key; if there is one, the menu draws its `settings` with a back arrow instead of the list.
- `rows.map((row) => ...)` turns each data object into a screen element; `key={row.key}` helps React tell the rows apart.
- The switch is a `<input type="checkbox">` dressed up with CSS: `checked={row.checked}` shows the state, `onChange` calls `row.onToggle` with the new value.

### `buildNumberFor`: where the build number comes from

This function is in the build script, not in the app. It runs when the app is built.

```js file=tools/build.mjs fn=buildNumberFor
```

**The Logic:**
- It lists every file that decides how the app looks and behaves (`src/`, `styles/`, `index.html`, `shared/`), sorted so the order never varies.
- For each file it feeds the file's name and its text (with Windows line endings `\r\n` turned into `\n`, so the number is the same on every computer) into a **SHA-1 hash**. A hash function turns any amount of text into a short fixed-size fingerprint; change one character and the fingerprint changes completely, while the same text always gives the same fingerprint.
- `.digest("hex").slice(0, 7)` writes the fingerprint in hexadecimal and keeps its first 7 characters: the build number you see under the app name.
