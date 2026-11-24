## Intro

Page operations are what you can do to whole pages: **rotate**, **delete**, **reorder** and **add a blank page**. They live in the page sidebar, and every one of them is a single undo step.

## How to use

- **Rotate:** the ⟳ button on a thumbnail, or **Ctrl+R**, turns the page 90° clockwise. Each press adds another quarter turn.
- **Delete:** the bin button on a thumbnail, or **Delete** while no item is selected.
- **Reorder:** drag a thumbnail up or down. See [Page sidebar](zeditor/workspace/page-sidebar).
- **Add a blank page:** hover the gap between thumbnails and click the **+**. The new page takes the size of the first loaded PDF page (or a default of 420 × 594 pt).
- **Several pages at once:** select them with Shift+click first. Rotate, delete and drag then act on the whole selection. Dragging a page that is not in the selection moves just that page.
- **Insert PDF:** brings another PDF's pages into the zine (see [Insert PDF](zeditor/images/insert-pdf)).

## How it works

### Which pages does an action touch?

If the page you act on is part of a multi-selection, the action applies to **all** selected pages; otherwise to that one page. One tiny function, `pagesActedOn`, decides this for every operation, so the rule is the same everywhere.

### Rotation is a property

Rotating does not change any pixels. It stores `rotation` (0, 90, 180 or 270) on the page: `(rotation + 90) % 360`. The thumbnail is redrawn with that rotation, and the editor and the PDF export apply the same rotation when they draw the page. The modulo (`%`) wraps 270 + 90 back to 0.

### Delete and the selection index

Pages are an array and the selection is an **index** into it, so deleting a page changes what an index means. If you delete the selected page, nothing is selected; if you delete a page before it, the selection index moves down by one so it still points at the same page.

### Reordering: "move a block to a slot"

`orderAfterMove` takes the indices being moved and the slot to insert them before. It splits the list into the **block** (the moving pages, in their original document order, not the order you selected them in) and the **rest**, counts how many of the rest sit before the slot, and splices the block in there. If the result is the same order as before it returns `null`, so a drop where nothing changes makes no undo step. After the move, the selected indices are renumbered through a lookup table (old index to new index).

### Immutable arrays

Every operation builds a new array (`slice`, `filter`, `map`) rather than editing the old one. Pages that did not change keep their object identity, so their thumbnails are not redrawn.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Which pages does an action touch?

```js file=apps/ZEditor/src/state/useSelection.js fn=pagesActedOn
```

**The Logic:** `selectedPageIndices` holds the extra pages picked with Shift+click, `selectedIdx` the main one. `inMultiSelection` is true when there is a multi-selection **and** the page you acted on belongs to it (`&&` = and, `||` = or). The `? :` then returns either the whole selection (`[selectedIdx, ...selectedPageIndices]`, an array built with the **spread** `...`, which unpacks a list into another list) or just `[idx]`.

### Rotating

```js file=apps/ZEditor/src/state/usePageOps.js fn=handleRotate
```

**The Logic:**
- `async`/`await`: redrawing a PDF page's thumbnail is slow, so the function waits for it. A `for...of` loop handles each acted-on page in turn.
- `(target.rotation + 90) % 360`: add a quarter turn, and `%` (the **remainder** after dividing by 360) wraps 360 back to 0.
- A blank page's thumbnail is drawn immediately; a PDF page's needs `await renderPdfThumb(...)`. The results are collected in a `Map` keyed by page key.
- `recordUndoCheckpoint()` saves the *before* state for Undo. Then `setPages((prev) => prev.map(...))` replaces only the changed pages: `{ ...p, ...updates }` makes a new page object with the new rotation and thumbnail on top of the old fields.

### Inserting a blank page

```js file=apps/ZEditor/src/state/usePageOps.js fn=handleInsertBlank
```

**The Logic:** `pageSizeRef.current || DEFAULT_PAGE_SIZE` uses the size of the first loaded PDF page, or a default. The new page is an **object literal**; its `key` comes from a counter (`nextKeyRef.current++`), so it is unique. `prev.slice()` copies the list, `next.splice(atIndex, 0, newPage)` inserts at that position (removing 0 items), and the copy is returned: the old list is never edited. Finally the new page becomes the selected one.

### Deleting

```js file=apps/ZEditor/src/state/usePageOps.js fn=handleDelete
```

**The Logic:** `prev.filter((_, i) => i !== idx)` keeps every page except number `idx` (`_` is a conventional name for a parameter we ignore). The selection is an *index*, so it must be fixed up: deleting the selected page selects nothing; deleting an earlier page shifts it down by one so it still points at the same page.

### Reordering

```js file=apps/ZEditor/src/state/usePageOps.js fn=handleReorder
```

```js file=apps/ZEditor/src/model/annotations.js fn=orderAfterMove
```

**The Logic:**
- `orderAfterMove` is the pure maths: `Array.from({ length: count }, (_, i) => i)` makes the list 0, 1, 2 … count−1. `moving` is a `Set` (a collection with fast "is this in it?" tests via `.has`). `block` are the moved indices, `rest` all the others, both in their original order. `insertAt` counts how many of the rest come before the target slot.
- `[...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)]` builds the new order: the first part of the rest, the block, then the remaining rest. `.every(...)` returns `null` if nothing moved, so a pointless drop makes no undo step.
- In `handleReorder`, `newIdxOf` is a **lookup table** from old position to new position (`forEach` fills it). `newOrder.map((oldIdx) => prev[oldIdx])` rebuilds the page list, and the selected indices are translated through the table so the same pages stay selected.
