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

Which pages an action applies to:

```js file=apps/ZEditor/src/state/useSelection.js
  function pagesActedOn(idx) {
    const inMultiSelection = selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx));
    return inMultiSelection ? [selectedIdx, ...selectedPageIndices] : [idx];
  }
```

Rotating a quarter turn:

```js file=apps/ZEditor/src/state/usePageOps.js
      const rotation = (target.rotation + 90) % 360;
```

Keeping the selection on the same page after a delete:

```js file=apps/ZEditor/src/state/usePageOps.js
      if (prevSel === null) return null;
      if (idx === prevSel) return null;
      if (idx < prevSel) return prevSel - 1;
      return prevSel;
```

Moving a block of pages to a slot:

```js file=apps/ZEditor/src/model/annotations.js
export function orderAfterMove(count, fromIndices, insertBefore) {
  const moving = new Set(fromIndices);
  const allIndices = Array.from({ length: count }, (_, i) => i);
  const block = allIndices.filter((i) => moving.has(i));
  const rest = allIndices.filter((i) => !moving.has(i));
  const insertAt = rest.filter((i) => i < insertBefore).length;
  const newOrder = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
  return newOrder.every((oldIdx, newIdx) => oldIdx === newIdx) ? null : newOrder;
}
```
