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

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `handleGroupSelection`

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleGroupSelection
```

Reading it:
- It needs at least two selected items (`ids.length < 2` returns early).
- `used` is a `Set` of every group id on any page; `flatMap` flattens a list of lists into one list and `.filter(Boolean)` throws away empty values. The `while` loop keeps making new ids (`g12`, `g13`...) until one is unused: a safety net for files made by older versions.
- Inside the edit: `members` are the selected items, each copied with the new `groupId` (`{ ...a, groupId }`). `topIndex` is the highest stack position among them (`Math.max(...)` over a list where non-members count as −1). `rest` is everything else. `rest.splice(position, 0, ...members)` inserts the members, all together, at the place of the topmost member, then `rest` is returned as the new list.

### `handleUngroupSelection`

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleUngroupSelection
```

Reading it: `groups` collects the group ids of the selected items. If none is in a group, it stops. Otherwise every item of those groups is replaced by a copy with `groupId` and `groupName` set to `undefined` (nothing).

### `withGroupMates`

```js file=apps/ZEditor/src/model/annotations.js fn=withGroupMates
```

Reading it: it takes some ids and returns them **plus** the ids of all their group mates that are visible and unlocked. `new Set([...ids, ...mates])` merges the two lists and removes duplicates, then `[...set]` turns it back into an ordinary list. This one helper is why selecting, moving or reordering one member always brings the group along.

### Saving a group as a file

```js file=apps/ZEditor/src/io/groupFile.js fn=itemsBounds,serializeGroup
```

Reading it:
- `itemsBounds` finds the **bounding box** of items: the same min/max trick as always, starting from `Infinity`/`-Infinity`, skipping items whose size is not a real number. It returns `null` for an empty list.
- `serializeGroup` throws an **error** if there is nothing to save (`throw new Error(...)`, which stops the function and reports a message). `dx`, `dy` are how far everything must move so the box sits 40 px (`PAD`) from the top-left corner.
- `items.map((a, i) => ...)` moves every item (`translatedAnnotation`), and for the first, lowest item (`i === 0`) removes `clipToBelow`, because there is nothing below it in the new file.
- The `page` is an object: a blank no-paper page sized `Math.ceil(width + 2 × PAD) / MAIN_SCALE` (rounded **up** to whole pixels, then converted from editor pixels to points). Finally `serializeProject(...)` turns the page into the text of a `.znow` file.

### Reading a group file back

```js file=apps/ZEditor/src/io/groupFile.js fn=readGroupFile
```

Reading it: `await readProjectFile(...)` opens the file like any project. `project.pages.flatMap((p) => p.annotations || [])` gathers the items of every page into one list. `items.find((a) => a.groupName)` looks for an item carrying a group name; the name used is that one, else the project's title, else "Imported group". Writing `(named && named.groupName)` first checks `named` exists before reading from it, to avoid an error.
