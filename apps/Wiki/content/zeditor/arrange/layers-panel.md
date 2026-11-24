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

Blend modes, valid for both CSS and canvas:

```js file=apps/ZEditor/src/model/controls.js
export const BLEND_CONTROL = {
  kind: "select", prop: "blend", label: "Blend", fallback: "normal",
  options: [
    { key: "normal", label: "Normal" },
    { key: "multiply", label: "Multiply" },
    { key: "screen", label: "Screen" },
```

Reordering rows (the list is top-first, the page's array is bottom-first):

```js file=apps/ZEditor/src/state/useAnnotationEdits.js
    const topFirst = (pages[selectedIdx].annotations || []).slice().reverse();
    const ids = withGroupMates(topFirst, draggedIds); // a group always moves as one
    const fromRows = topFirst.flatMap((a, row) => (ids.includes(a.id) ? [row] : []));
    const newOrder = orderAfterMove(topFirst.length, fromRows, insertBeforeRow);
    if (newOrder) updateAnnotationsFor(selectedIdx, () => newOrder.map((row) => topFirst[row]).reverse());
```

The name a layer shows:

```js file=apps/ZEditor/src/model/layerNames.js
  if (ann.name) return ann.name;
  if (ann.type === "text") return ann.text.trim().split("\n")[0] || "Text";
  if (ann.type === "stroke") return ann.tool === "highlighter" ? "Highlight" : "Drawing";
```

A group's colour from a hash of its id:

```js file=apps/ZEditor/src/model/annotations.js
  for (const ch of String(groupId)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${(hash * 47) % 360} 70% 60%)`;
```

Lock and hide are just flags on the item:

```js file=apps/ZEditor/src/state/useAnnotationEdits.js
    const on = !ann[flag];
    handleUpdateAnnotation(ann.id, { [flag]: on });
```
