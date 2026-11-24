## Intro

The **Layers panel** is a floating list of everything on the current page, top layer first. Use it to pick items that are hard to click, rename them, lock or hide them, change their opacity and blend mode, group them, clip them and reorder them.

## How to use

- **Select:** click a row. **Shift+click** adds or removes rows. A selection made in the panel is highlighted on the page and vice versa.
- **Rename:** double-click a name.
- **Lock** (padlock): the item cannot be selected or moved on the page. **Hide** (eye): the item is not drawn. A locked item is skipped when you select or erase on the page itself.
- **Reorder:** drag a row up or down. The top of the list is the front of the page.
- **Opacity** (0–100%) and **Blend** for the selected layers: Normal, Multiply, Screen, Overlay, Soft Light, Darken, Lighten, Difference. If the selection mixes several blends, the box shows "Mixed".
- **Group / Ungroup** (Ctrl+G, Ctrl+Shift+G), **Clip to below** (Ctrl+Alt+G), **Import .znow as a group…**: in the panel's ⋮ menu. See [Groups](zeditor/arrange/groups) and [Clipping masks](zeditor/arrange/clipping-masks).
- **Delete** removes the selected layers. **Minimize** tucks the panel away; the toolbar button brings it back. Drag the panel's header to move it and its edges to resize it.

## How it works

### The page is a list; the list is the stack

A page's items are one array, in **stacking order**: the first item is the bottom, the last the front. The panel shows the same array reversed (top first), because that is how people read layers. Drawing the page is just walking the array from index 0 and painting each item over the last, which is the **painter's algorithm**.

### Reordering

Dragging a row calls the same "move a block to a slot" helper as the page sidebar (`orderAfterMove`), but works on the reversed list, then reverses it back to store it. A group always moves as one: `withGroupMates` adds the other members of any group involved before the move.

### Opacity and blend: one value drives screen and PDF

Blend mode names are chosen to be valid **both** as the CSS `mix-blend-mode` (the live editor) and the canvas `globalCompositeOperation` (the export). One stored value therefore draws the same on screen and in the PDF. **Multiply** darkens like ink on paper (white stays white); **Screen** is its opposite, lightening. `normal` is left unset, so unblended items render exactly as before.

### Names

A layer's name is the name you gave it, else it is worked out: a text box shows its first line, a stroke is "Drawing" or "Highlight", a rectangle "Rectangle" or "Ellipse", and so on.

### Grouped display

The panel groups a *run of layers sharing a group id* into one block under a group row. The group's marker colour comes from a **hash** of its id (`hash × 31 + charCode`, modulo 360), so a group keeps the same colour every time without storing it.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `layerBlocks`: one row per layer, grouped

```js file=apps/ZEditor/src/ui/panels/LayersPanel.jsx fn=layerBlocks
```

Reading it:
- `topFirst` is the page's list reversed. `forEach((ann, row) => ...)` visits each item with its position `row`.
- `last` is the most recent block made (`blocks[blocks.length - 1]`, the last element of the list).
- If the item has a `groupId` **and** the last block belongs to the same group, it is added to that block's `items` (`push`). Otherwise a new block starts. `ann.groupId || null` stores `null` for an item without a group.
- `row` is kept with every item because reordering works in positions of this top-first list.

### `layerName`

```js file=apps/ZEditor/src/model/layerNames.js fn=layerName
```

Reading it: a chain of early `return`s, checked from the top: the name you gave, else for text the first line of its text (`.trim()` cuts surrounding spaces, `.split("\n")[0]` takes the first line, `|| "Text"` is the fallback for an empty box), else "Drawing"/"Highlight" for strokes, and so on. The last line, "Image", is what remains.

### `handleReorderLayers`

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleReorderLayers
```

Reading it: `.slice().reverse()` makes a reversed **copy** (`reverse` alone would reverse the original in place). `withGroupMates` widens the dragged ids to whole groups. `flatMap` turns each matching item into its row number and skips the rest (returning `[]` adds nothing). `orderAfterMove` computes the new order (see [Page operations](zeditor/pages/page-operations)); the result is reversed back into the page's bottom-first order before saving. `() => ...` (an arrow function with no parameters) is passed to `updateAnnotationsFor`, which supplies the edit and the undo step.

### Lock and hide

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleToggleLayerFlag
```

Reading it: `flag` is the text `"locked"` or `"hidden"`. `!ann[flag]` reads that property and flips it (`!` = "not"); `{ [flag]: on }` is a **computed property name** that builds `{ locked: true }` or `{ hidden: true }`. When turning a flag on for an item that is currently selected, the selection is refreshed so a locked or hidden item drops out of it.

### A group's colour

```js file=apps/ZEditor/src/model/annotations.js fn=groupColor
```

Reading it: the loop goes through the characters of the id (`String(groupId)`), building a number: `hash * 31 + ch.charCodeAt(0)` multiplies the old value by 31 and adds the character's code, then `% 360` keeps it below 360. That is a simple **hash**: the same id always gives the same number. The hash is then spread across the colour wheel (`* 47`, again `% 360`) to give an HSL colour (hue 0–359, 70% saturation, 60% lightness).
