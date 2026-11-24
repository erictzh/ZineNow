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

How a menu closes itself:

```js file=apps/ZEditor/src/ui/topbar/TopMenu.jsx
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
```

Nudging a panel back on screen:

```js file=apps/ZEditor/src/ui/topbar/TopMenu.jsx
      if (left < 8) menu.style.transform = `translateX(${(8 - left) / zoom}px)`;
```

One Page menu row, as data:

```js file=apps/ZEditor/src/ui/topbar/Topbar.jsx
                {
                  key: "onion",
                  label: "Onion Skin",
                  checked: view.onionSkinOn,
                  onToggle: view.setOnionSkinOn,
                  settings: <OnionSkinSettings opacity={view.onionSkinOpacity} onOpacityChange={view.setOnionSkinOpacity} />,
                },
```

How the row turns into a switch plus Customize…:

```js file=apps/ZEditor/src/ui/topbar/PageMenu.jsx
      <button type="button" className="ze-menu-customize" disabled={row.disabled} onClick={() => setCustomizing(row.key)}>
        Customize…
      </button>
```

Where the build number is replaced in the build script:

```js file=tools/build.mjs
    define: { __BUILD__: JSON.stringify(buildNumberFor(app)) },
```
