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

`App` creating the hooks, each given the ones it builds on:

```js file=apps/ZEditor/src/ui/App.jsx
  const doc = useDocumentState();
  const history = useHistory(doc);
  const view = useViewSettings();
  const toolDefaults = useToolDefaults();
  const selection = useSelection(doc);
  const edits = useAnnotationEdits({ doc, history, selection, toolDefaults });
```

What a page is, and where its filter lives:

```js file=apps/ZEditor/src/state/useDocumentState.js
  const [pages, setPages] = useState([]); // {key, pageNumber, rotation, dataUrl, isBlank, annotations, filter}
```

Fresh ids:

```js file=apps/ZEditor/src/state/useDocumentState.js
  const ids = {
    pageKey: () => nextKeyRef.current++,
    docId: () => "doc" + nextDocIdRef.current++,
    annId: () => nextAnnIdRef.current++,
  };
```

Which settings a saved project carries:

```js file=apps/ZEditor/src/state/useViewSettings.js
  function settingsForSave() {
    return {
      guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn,
      onionSkinOn, onionSkinOpacity, pageNumbers,
      rulersOn, rulerUnit, rulerGuides, snapToGuidesOn, guidesLocked,
      embedFonts, embedFontsSkip,
    };
  }
```
