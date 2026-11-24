## Intro

ZEditor is built from **state hooks**: one small file per area of the app (`state/use….js`), each owning its part of the state and its handlers. `App.jsx` only creates them and lays out the screen; it has no logic of its own. This page is the map of how the app holds a document.

## How to use

You do not use this directly; it is for reading and changing the code. If you want to add a feature, you usually add or edit one hook and pass its result to the component that needs it.

## How it works

### The document

`useDocumentState` is the heart: the `pages` array, the selected page index, the other selected pages, a map of the loaded source PDFs, and counters for fresh ids. A page is `{ key, pageNumber, rotation, dataUrl, isBlank, annotations, filter }`: **annotations** are the items on it (text, images, shapes, strokes), and the filter belongs to the page, so each page keeps its own look.

### The order of the hooks

Each hook receives the ones it builds on, which is the only reason order matters:

| Hook | Job |
|---|---|
| `useDocumentState` | pages and selection |
| `useHistory` | undo and redo ([Undo / redo](zeditor/workspace/undo-redo)) |
| `useViewSettings` | document-wide view settings: guides, rulers, page numbers, onion skin, embed fonts |
| `useSelection` | the current tool and selected items |
| `useAnnotationEdits` | every edit of an item on a page |
| `useMarquee`, `useMagicErase`, `useImageTrace` | the Marquee, magic eraser and Vectorize tools |
| `usePageOps` | add, delete, rotate and reorder pages |
| `useProject`, `useDocumentFiles`, `useExport`, `useGroupFiles` | save, open, export and group files |
| `useZoom`, `useCanvasGrow`, `useLiveThumbs` | the view |

### Immutable updates

State is never edited in place. An edit builds a new page or item list and hands it to `setPages`. That is what makes the undo history cheap, what lets thumbnails notice changes by reference, and what React needs to redraw only what changed.

### Settings that travel with the project

`useViewSettings` has two small functions, `settingsForSave` and `applySavedSettings`. The first lists exactly which settings go into a saved `.znow` file; the second restores them, ignoring ones the file does not mention. Adding a saved setting means adding it in both places (as the guide **lock** was).

### Globals, not imports, for React

The apps are built into one plain script and open from disk, so React is a global (`const { useState } = React;`) and the hooks use it that way, not through an import.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `useDocumentState`: what a document is

```js file=apps/ZEditor/src/state/useDocumentState.js fn=useDocumentState
```

**The Logic:**
- A **hook** is a function whose name starts with `use` and that uses React's memory features. `useState([])` creates a piece of **state** with an initial value (an empty list) and gives back a pair: the current value (`pages`) and a function to change it (`setPages`). The pair is pulled apart with `const [a, b] = ...`, called **array destructuring**.
- `selectedPage` is *derived* (worked out from other state): the page at `selectedIdx`, or `null` if nothing is selected. `cond ? a : b` is a **ternary**.
- `useMemo(() => ..., [selectedPage])` remembers the result of a calculation and only redoes it when `selectedPage` changes. Here it keeps the current filter, falling back to `DEFAULT_PAGE_FILTER` (`||` means "or use this").
- `useRef(...)` boxes (`pdfDocsRef`, `nextKeyRef`...) hold values that must survive redraws but must **not** cause one when they change: the loaded PDF files and counters for ids.
- `ids` is an object of three small functions; `nextKeyRef.current++` returns the current number and then adds 1 (`++` is "increase by one"), so every page, document and item gets a number nobody else has.
- The last line returns one object containing everything, so `App` can hand it to the other hooks.

**Worked example.** `nextAnnIdRef.current` is 5. `ids.annId()` returns **5** and the ref becomes 6 (`x++` returns the old value, then adds 1). The next call returns 6. Two items can therefore never share an id, even after deleting one, because the counter only goes up.

### `settingsForSave`: what a project file remembers

```js file=apps/ZEditor/src/state/useViewSettings.js fn=settingsForSave
```

**The Logic:** the `return { guidesOn, guideFormat, ... }` uses **shorthand properties**: `{ guidesOn }` means `{ guidesOn: guidesOn }`. The result is one plain object that is written into the `.znow` file as JSON text. Anything not listed here is not saved.

### `applySavedSettings`: reading them back

```js file=apps/ZEditor/src/state/useViewSettings.js fn=applySavedSettings
```

**The Logic:**
- `if (s.guidesOn !== undefined) setGuidesOn(s.guidesOn)`: a setting is applied only if the file mentions it. An older file that predates a setting leaves the app's own default alone.
- `setGuidesLocked(s.guidesLocked === true)` and `setEmbedFonts(s.embedFonts !== false)` are two ways of choosing the default for a missing value: "only on if saved as true" (default off) and "on unless saved as false" (default on).
- `Array.isArray(s.rulerGuides) ? s.rulerGuides.filter(...) : []` checks the saved guides really are a list, then **validates** each one (a known axis, a real number) so a damaged file cannot break the editor.

**Worked example.** You open an older project whose settings contain `{ "rulersOn": true }` and nothing else.
- `s.guidesOn !== undefined` is false: the guides setting is left at its current value.
- `setGuidesLocked(s.guidesLocked === true)`: `undefined === true` is false, so the guides are **unlocked**.
- `setEmbedFonts(s.embedFonts !== false)`: `undefined !== false` is true, so fonts embedding is **on**, the default.
- `Array.isArray(s.rulerGuides)` is false, so `rulerGuides` becomes `[]`.
