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

The limits:

```js file=apps/ZEditor/src/model/history.js
export const UNDO_COALESCE_MS = 700;
export const MAX_UNDO_HISTORY = 50;
```

Leaving the thumbnail out of a snapshot:

```js file=apps/ZEditor/src/state/useHistory.js
function stripDataUrls(pagesArr) {
  return pagesArr.map(({ dataUrl, ...rest }) => rest);
}
```

Merging a gesture into one step:

```js file=apps/ZEditor/src/state/useHistory.js
    if (coalesceKey && lastCommitRef.current.key === coalesceKey && now - lastCommitRef.current.time < UNDO_COALESCE_MS) {
      lastCommitRef.current.time = now;
      return;
    }
```

Pushing a snapshot, capped at 50, and clearing redo:

```js file=apps/ZEditor/src/state/useHistory.js
      const next = [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }];
      return next.length > MAX_UNDO_HISTORY ? next.slice(next.length - MAX_UNDO_HISTORY) : next;
    });
    setRedoStack([]);
```

Undo: pop, push the current state onto redo, restore:

```js file=apps/ZEditor/src/state/useHistory.js
    const entry = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
```
