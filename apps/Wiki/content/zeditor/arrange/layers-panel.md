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

**The Logic:**
- `topFirst` is the page's list reversed. `forEach((ann, row) => ...)` visits each item with its position `row`.
- `last` is the most recent block made (`blocks[blocks.length - 1]`, the last element of the list).
- If the item has a `groupId` **and** the last block belongs to the same group, it is added to that block's `items` (`push`). Otherwise a new block starts. `ann.groupId || null` stores `null` for an item without a group.
- `row` is kept with every item because reordering works in positions of this top-first list.

**Worked example.** `topFirst` = [A (group g1), B (g1), C (no group), D (group g2)].
- A: no blocks yet, so a new block `{ groupId: "g1", items: [A] }`.
- B: group g1 equals the last block's group, so it is added: `items: [A, B]`.
- C: no group, so a new block `{ groupId: null, items: [C] }`.
- D: different group, so a new block for g2.
- Result: three blocks. If the order were A (g1), C, B (g1), the g1 layers are not neighbours, so there would be **two** g1 blocks: the display groups only *runs* of layers.

### `layerName`

```js file=apps/ZEditor/src/model/layerNames.js fn=layerName
```

**The Logic:** a chain of early `return`s, checked from the top: the name you gave, else for text the first line of its text (`.trim()` cuts surrounding spaces, `.split("\n")[0]` takes the first line, `|| "Text"` is the fallback for an empty box), else "Drawing"/"Highlight" for strokes, and so on. The last line, "Image", is what remains.

**Worked example.** A text box whose text is `"  Summer Zine\nissue 4"`: no name set, type is text, `trim()` removes the leading spaces, `split("\n")[0]` takes `"Summer Zine"`: that is the layer's name. An empty text box gives `"" || "Text"` = `"Text"`. A highlighter stroke is "Highlight". A layer you renamed to "Logo" always shows "Logo".

### `handleReorderLayers`

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleReorderLayers
```

**The Logic:** `.slice().reverse()` makes a reversed **copy** (`reverse` alone would reverse the original in place). `withGroupMates` widens the dragged ids to whole groups. `flatMap` turns each matching item into its row number and skips the rest (returning `[]` adds nothing). `orderAfterMove` computes the new order (see [Page operations](zeditor/pages/page-operations)); the result is reversed back into the page's bottom-first order before saving. `() => ...` (an arrow function with no parameters) is passed to `updateAnnotationsFor`, which supplies the edit and the undo step.

**Worked example.** The page, bottom first, is [bg, photo, title, logo]. The panel shows `topFirst = [logo, title, photo, bg]` (rows 0–3).
- You drag `bg` (row 3) to the top (slot 0). `fromRows = [3]`; `orderAfterMove(4, [3], 0)`: `rest = [0, 1, 2]`, `insertAt = 0`, so `[3, 0, 1, 2]`.
- The new top-first list is `[bg, logo, title, photo]`. Reversed back to bottom-first: **[photo, title, logo, bg]**: `bg` is now the front-most item.
- If `logo` and `title` were a group, dragging only `title` would widen to both by `withGroupMates`, and the two would move as one block.

### Lock and hide

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleToggleLayerFlag
```

**The Logic:** `flag` is the text `"locked"` or `"hidden"`. `!ann[flag]` reads that property and flips it (`!` = "not"); `{ [flag]: on }` is a **computed property name** that builds `{ locked: true }` or `{ hidden: true }`. When turning a flag on for an item that is currently selected, the selection is refreshed so a locked or hidden item drops out of it.

### A group's colour

```js file=apps/ZEditor/src/model/annotations.js fn=groupColor
```

**The Logic:** the loop goes through the characters of the id (`String(groupId)`), building a number: `hash * 31 + ch.charCodeAt(0)` multiplies the old value by 31 and adds the character's code, then `% 360` keeps it below 360. That is a simple **hash**: the same id always gives the same number. The hash is then spread across the colour wheel (`* 47`, again `% 360`) to give an HSL colour (hue 0–359, 70% saturation, 60% lightness).

**Worked example.** Group id `"g12"`: the characters have codes g = 103, 1 = 49, 2 = 50.
- Start `hash = 0`. After "g": `(0 × 31 + 103) % 360 = 103`. After "1": `(103 × 31 + 49) % 360 = 3242 % 360 = 2`. After "2": `(2 × 31 + 50) % 360 = 112`.
- Hue = `(112 × 47) % 360 = 5264 % 360 =` **224**: `hsl(224 70% 60%)`, a blue. `"g13"` hashes to 113, so hue `113 × 47 % 360 = 271`: a purple. Neighbouring ids get clearly different colours, and the same id gets the same colour every time.
