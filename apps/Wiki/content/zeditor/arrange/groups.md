## Intro

A **group** ties several items together so they move, turn and reorder as one. You can also **save a group as a `.znow` file** and **import** it into any other document, which makes groups reusable pieces: a logo, a frame, a sticker sheet.

## How to use

- **Group:** select two or more items, then **Ctrl+G** (or the Layers panel's group button).
- **Ungroup:** **Ctrl+Shift+G**.
- **Select one item of a group:** **Alt+click**.
- In the Layers panel a group is a row with a coloured marker. Click it to select the whole group, **double-click** to rename it, and use its padlock and eye to lock or hide all of it.
- **Save group as .znow:** the group row's ⋮ menu.
- **Import .znow as a group…:** the Layers panel's ⋮ menu. The items come in as a new group on the current page.

## How it works

### A group is just a shared id

There is no "group object". Each member item carries the same `groupId` (like `g12`), and the group's name is stored on its items too (`groupName`). Everything else follows from that one field:

- To **group**, the code makes a new id (checking that no page already uses it), stamps it on every selected item, and moves the members next to each other in the stack, at the place of the topmost of them.
- To **ungroup**, it clears `groupId` and `groupName` on every item of the groups touched.
- To **move**, **select** or **reorder** one member, the code first widens the list to all the mates (`withGroupMates`), skipping any that are hidden or locked.

### Group files

Saving a group makes an ordinary **one-page project** (a `.znow`) that holds just those items. The page is a "No paper" page sized to fit them: the items' bounding box plus 40 px of room on every side, and the items are moved by the same offset so they sit inside it. Because it is a normal project it also opens on its own with *Load Project*. Fonts the items use are embedded by the same code as for a project, and pictures are already inside the items.

One detail: the lowest item cannot stay **clipped** to a layer that is not in the file, so its clipping flag is dropped. Reading a group file just opens it as a project and collects the items of all its pages, using the stored group name, else the project title, else "Imported group".

## Code

Making a group:

```js file=apps/ZEditor/src/state/useAnnotationEdits.js
    let groupId = "g" + nextAnnIdRef.current++;
    while (used.has(groupId)) groupId = "g" + nextAnnIdRef.current++;
    updateAnnotationsFor(selectedIdx, (anns) => {
      const members = anns.filter((a) => ids.includes(a.id)).map((a) => ({ ...a, groupId }));
```

Ungrouping:

```js file=apps/ZEditor/src/state/useAnnotationEdits.js
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (groups.has(a.groupId) ? { ...a, groupId: undefined, groupName: undefined } : a)));
```

Finding the rest of a group:

```js file=apps/ZEditor/src/model/annotations.js
  const groups = new Set(annotations.filter((a) => ids.includes(a.id) && a.groupId).map((a) => a.groupId));
  if (groups.size === 0) return ids;
  const mates = annotations.filter((a) => groups.has(a.groupId) && !a.hidden && !a.locked).map((a) => a.id);
```

A group saved as a one-page, no-paper project:

```js file=apps/ZEditor/src/io/groupFile.js
  const page = {
    key: 1, isBlank: true, isCanvas: true, rotation: 0,
    width: Math.ceil(b.width + 2 * PAD) / MAIN_SCALE, height: Math.ceil(b.height + 2 * PAD) / MAIN_SCALE,
    annotations: moved,
  };
```

The lowest item cannot stay clipped to a missing layer:

```js file=apps/ZEditor/src/io/groupFile.js
    return i === 0 && m.clipToBelow ? { ...m, clipToBelow: undefined } : m;
```
