## Intro

ZEditor has keyboard shortcuts for the tools, editing, zoom and page navigation. **One keyboard handler** serves them all. The **Keyboard shortcuts** button (the keyboard icon in the toolbar) shows the full list.

## How to use

| Keys | What |
|---|---|
| V, T, I, R, E, D, H, M, U | Move, Text, Insert Image, Rectangle, Ellipse, Draw, Highlight, Marquee, Measure |
| C | Crop on/off for the selected image |
| Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y | Undo, Redo |
| Ctrl+C, Ctrl+V | Copy and paste an item; paste a picture from the clipboard |
| Ctrl+S, Ctrl+Shift+S | Save, Save As |
| Delete | Delete the selected item, or the selected pages if no item is selected |
| Arrow keys, Shift+arrows | Nudge 1 px, or 10 px |
| ↑ / ↓ | Previous / next page (nothing selected) |
| Ctrl+R | Rotate the selected page |
| Ctrl+G, Ctrl+Shift+G | Group, Ungroup |
| Ctrl+Alt+G | Clipping mask on/off |
| Ctrl+J, Ctrl+Shift+J | Marquee: Layer via Copy / Cut |
| Ctrl + / −, Ctrl 0 | Zoom the page in/out, back to 100% |

Modifiers on clicks: **Shift+click** adds to the selection, **Alt+click** picks one item out of a group, **Ctrl+click** picks the top layer under the pointer. **Alt** while moving skips snapping to guides.

## How it works

### Attached once, never stale

The handler is added to `window` once. To always see the **current** state, not the state from the render it was created in, it reads everything through a **ref** (`appRef.current = app` on every render). This avoids the classic React "stale closure" bug, where for example Ctrl+S would save old settings.

### Order of the checks

The handler goes top to bottom, and the order matters:
1. **Ctrl+S** works even while typing in a field (it also suppresses the browser's own "Save page" dialog).
2. **Zoom keys** next, only while a page is open and no pop-up is showing, so the browser's own zoom is left alone on the welcome screen.
3. If the cursor is in an `<input>`, `<textarea>` or editable text, it **returns**, so the browser's own undo and typing work in the text.
4. If a modal is open, it returns: the pop-up handles its own input.
5. Ctrl/Cmd combos, then Delete, the arrows and the single-letter tool keys.

### Case-insensitive, Mac-friendly

`e.key.toLowerCase()` makes "V" and "v" the same key, and `e.ctrlKey || e.metaKey` makes Ctrl and Cmd the same.

### Copy and paste

Ctrl+C stores a deep copy (`JSON.parse(JSON.stringify(ann))`) of the item in a **ref**, not state, because copying should not re-render anything. Ctrl+V adds it back with a new id, offset by 20 px so it is visibly a second copy, and without the original's group. A **separate `paste` event** listener handles an image on the system clipboard (a screenshot, say), because only the native `paste` event exposes clipboard files.

> **Note** The list the user sees (`shortcuts.js`) is a separate data file, kept in step with the handler by hand. If you add a shortcut, add it in both places.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Reading the live state through a ref

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
  const appRef = useRef(app);
  appRef.current = app;
```

Reading it: `useRef(app)` makes a box holding the app's state; the second line puts the newest state into the box on every redraw. The listener is only installed once, but it reads `appRef.current` each time a key is pressed, so it always sees fresh state. Without this, the listener would see the **stale** values from the moment it was installed (a "stale closure").

### The first checks: Save, then "am I typing?"

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!modalOpen) project.handleSaveProject({ saveAs: e.shiftKey });
        return;
      }
…
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return; // let native undo/typing run inside text fields
      if (modalOpen) return; // a modal is up — its own buttons handle input
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
```

Reading it:
- `e` is the **event**: an object describing the key press. `e.preventDefault()` stops the browser doing its own thing (here, the "Save page" dialog). `e.key.toLowerCase()` makes "S" and "s" the same; `e.metaKey` is the Cmd key on a Mac.
- The `…` row in the block marks where lines in between are left out. These are the next checks, further down the same function.
- `e.target` is the element that had the focus. If it is a text field (`INPUT`, `TEXTAREA`, or any `isContentEditable` element), the function **returns**, ending the handler so typing, and the browser's own undo, work normally. This is called an **early return** or **guard clause**.

### Undo and redo

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
        if (key === "z" && !e.shiftKey) { e.preventDefault(); history.handleUndo(); return; }
        if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); history.handleRedo(); return; }
```

Reading it: Z without Shift is undo; Z with Shift, or Y, is redo (`!` means "not"). Each line stops the browser's default, runs the action and `return`s so no later line also reacts.

### Copy

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
        if (key === "c") {
          if (selectedIdx !== null && selectedAnnId !== null) {
            // A frame of a threaded story copies as a box of its own: its look and the words it shows.
            const view = resolvePageText(pages[selectedIdx].annotations || []).find((a) => a.id === selectedAnnId);
            const ann = view && view.type === "text" ? standaloneCopy(view) : view;
            if (ann) { e.preventDefault(); clipboardRef.current = JSON.parse(JSON.stringify(ann)); }
          }
          return;
        }
```

Reading it:
- `.find(...)` returns the first item with the selected id, or nothing.
- `JSON.parse(JSON.stringify(ann))` is the common way to make a **deep copy**: `JSON.stringify` writes the object out as text, `JSON.parse` reads it back as a brand-new object that shares nothing with the original. Editing the copy can never change the original.
- It is stored in `clipboardRef`, a ref, not state: copying should not make the screen redraw.

### Nudging with the arrow keys

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
      const nudge = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
      if (nudge && selectedAnnId !== null) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const ids = [selectedAnnId, ...selectedAnnIds];
        edits.handleMoveAnnotations((pages[selectedIdx].annotations || []).filter((a) => ids.includes(a.id)), nudge[0] * step, nudge[1] * step);
        return;
      }
```

Reading it: the first line is a **lookup table**: an object whose keys are key names and whose values are `[dx, dy]` pairs. `[key]` at the end picks the entry for the pressed key; for any other key the result is `undefined`, which `if (nudge && ...)` treats as false. `step` is 10 with Shift, else 1. The selected item and the others in `selectedAnnIds` are collected into one list, and moved together.

### Pasting a picture from the clipboard

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js fn=handlePaste
```

Reading it: `e.clipboardData.items` lists what is on the clipboard. `Array.from(items).find(...)` converts that list into a real array and finds the first whose `type` starts with `image/` (a **MIME type**, the standard label for a kind of file, like `image/png`). `getAsFile()` hands back the picture as a file, which is added to the page like any picture. This needs its own `paste` listener because only that event is allowed to read clipboard files.
