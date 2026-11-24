## Intro

Undo and redo take you back and forward through your edits. ZEditor keeps up to **50 steps**, and one step is one *action* (a finished drag, a committed edit, a delete, a rotation), not one pixel or keystroke.

## How to use

- **Ctrl+Z** undoes, **Ctrl+Shift+Z** (or **Ctrl+Y**) redoes. The two buttons in the top bar do the same and grey out when there is nothing to do.
- A whole drag, a whole slider tug, or a burst of typing is **one** step.
- Loading or creating a document starts a fresh history.
- While a magic-eraser preview is open, Undo or Redo throws the preview away instead (it is not in the history yet).
- After the app is reloaded with the Reload button, the history starts fresh.

## How it works

### Snapshots, not commands

Two designs exist for undo. A **command history** records each action and how to reverse it. A **snapshot history** stores the whole state before each action. ZEditor uses snapshots: each entry is `{ pages, selectedIdx, selectedPageIndices }`. It is simple and cannot get out of step with the document, because undoing is just putting the old state back.

### Why snapshots are cheap: structural sharing

Storing 50 copies of a document sounds heavy. It is not, because the app edits **immutably**: an edit makes a new page object and a new item list for what changed, and every unchanged page and item keeps the *same object reference*. So two snapshots share nearly everything, with no deep cloning. This is called **structural sharing**. The one heavy part of a page, its thumbnail (a base64 PNG, anything from a few KB to 100 KB or more), is **stripped** from the snapshot, since it can be redrawn from `pageNumber`, `rotation` and `isBlank`.

### Coalescing: one step for a whole gesture

Many edits fire continuously: dragging produces a `mousemove` for every pixel. Each such edit passes a **coalesce key**. If the same key arrives within **700 ms** of the last one, no new snapshot is pushed, only the clock is renewed. Let go and come back later, and it is a fresh step. An edit that is a single action (a click, a drop) passes no key and always gets its own step.

### Two stacks

`undoStack` and `redoStack` are the two classic stacks. A new edit clears the redo stack (you branched away from it). Undo pops the top of the undo stack, pushes the *current* state to the redo stack, and restores. It also resets the coalescing clock, so the next edit does not merge with whatever came before the undo.

### Restoring thumbnails

A restored page needs its thumbnail again. If the current page with the same key, rotation, size and source is unchanged (the usual case, as most undos touch one page), its thumbnail is reused. Only a page that really differs is redrawn.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The two numbers that shape the history

```js file=apps/ZEditor/src/model/history.js
export const UNDO_COALESCE_MS = 700;
export const MAX_UNDO_HISTORY = 50;
```

`export` makes a value available to other files. "MS" means milliseconds. These two constants are the whole policy: how long edits are merged, and how many are kept.

### Leaving the heavy part out of a snapshot

```js file=apps/ZEditor/src/state/useHistory.js fn=stripDataUrls
```

Reading it: `.map((page) => ...)` makes a new list from the old. `({ dataUrl, ...rest }) =>` **destructures** each page: it takes the field `dataUrl` out into its own variable and collects *all the other fields* into `rest` (the `...` here is called the **rest** pattern). The function returns `rest`, which is the page *without* its thumbnail picture.

### `recordUndoCheckpoint`: take a snapshot, unless it is the same gesture

```js file=apps/ZEditor/src/state/useHistory.js fn=recordUndoCheckpoint
```

Reading it:
- `Date.now()` is the current time in milliseconds. `lastCommitRef` remembers the key and time of the previous snapshot.
- The first `if` is **coalescing**: the same key within 700 ms means "still the same gesture", so only the clock is renewed (`time = now`) and the function `return`s without saving anything.
- Otherwise it remembers this snapshot and pushes one: `[...stack, { pages: ..., selectedIdx, ... }]` builds a **new** array with all old entries plus the new one (never changing the old array). If it has grown past 50, `.slice(next.length - MAX)` keeps only the last 50: the oldest entries fall off.
- `setRedoStack([])`: a new edit throws away anything you could have redone, as in every editor.

### Undo and redo

```js file=apps/ZEditor/src/state/useHistory.js fn=handleUndo,handleRedo
```

Reading it:
- Undo takes the last entry of the undo stack (`undoStack[undoStack.length - 1]`; lists count from 0, so the last is at length − 1). It removes it (`.slice(0, -1)` keeps everything except the last), pushes the *current* state onto the redo stack so you can come back, and then restores the old one with `restoreSnapshot`.
- Redo is the mirror image with the two stacks swapped.
- `lastCommitRef.current = { time: 0, key: null }` resets the coalescing clock so the next edit is never merged with the one before the undo.

### Restoring a snapshot (and its thumbnails)

```js file=apps/ZEditor/src/state/useHistory.js fn=restoreSnapshot
```

Reading it:
- `async` marks a function that may **wait** for slow work; `await` pauses until that work is done. Here the slow work is redrawing thumbnails.
- `new Map(pages.map((p) => [p.key, p]))` builds a lookup from a page's key to the page itself, so `currentByKey.get(p.key)` is instant.
- `reusable` asks: is the current page with this key unchanged in rotation, kind, number, source document and size? If yes, its thumbnail is reused (`{ ...p, dataUrl: existing.dataUrl }`). If not, a new one is made: a blank page's thumbnail is drawn at once, a PDF page's needs `await renderPdfThumb(...)`.
- `Promise.all(...)` waits until *all* the pages are ready, working on them at the same time instead of one after another. Then the pages and the selection are put back with the `set...` functions.
