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

Reading the live state through a ref:

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
  const appRef = useRef(app);
  appRef.current = app;
```

Do nothing while typing in a field:

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return; // let native undo/typing run inside text fields
      if (modalOpen) return; // a modal is up — its own buttons handle input
```

Undo and redo:

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
        if (key === "z" && !e.shiftKey) { e.preventDefault(); history.handleUndo(); return; }
        if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); history.handleRedo(); return; }
```

Arrow-key nudging:

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
      const nudge = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
      if (nudge && selectedAnnId !== null) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
```

A pasted copy is offset so it does not hide the original:

```js file=apps/ZEditor/src/state/useKeyboardShortcuts.js
            const newAnn = { ...translatedAnnotation(clip, 20, 20), id, groupId: undefined }; // a copy isn't part of the original's group
```
