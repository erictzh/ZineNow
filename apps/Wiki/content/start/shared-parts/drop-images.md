## Intro

ZEditor and Markdown to PDF let you **drag a picture onto the window**: from your file manager, or from another web page. A shared file does the listening and decides **what was dropped**; each app only says what to do with it.

## How to use

Drag a picture (png, jpg, gif, webp, svg, bmp, avif, ico) over the window: a dashed orange frame says what will happen (*Drop a picture to add it to your text / the page*). Release. Something that is not a picture (a PDF, say) is reported through the app's own message instead of being opened in the tab. Dragging things *inside* the page (reordering pages or layers, selecting text) is left alone, and dropping text into a text box works as usual.

## How it works

### The overlay and the counter

While a picture is dragged over the window the frame must stay visible but not flicker as the pointer moves across child elements: each element fires `dragenter` when entered and `dragleave` when left. A counter `depth` goes up on enter and down on leave; the frame is hidden only when it returns to 0 (or the pointer leaves the window).

### Is this drag ours?

`dragstart` marks drags that began inside the page (`internal`). A drag counts as ours if it carries **Files** (always), or (not internal) a link or HTML (`text/uri-list`, `text/html`, `text/x-moz-url`), which is how another website's picture arrives.

### Capture

All listeners are on `document` in the **capture phase** (`true`), so they run before the app's own handlers. When a picture drop is understood (`readDrop`: see [Dropped pictures](md2pdf/editor/dropped-pictures)), the browser's default (opening the file in the tab, which would leave the app!) is cancelled with `preventDefault` and `stopPropagation`.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `installImageDrop`

```js file=shared/js/dropImages.js fn=installImageDrop
```

**The Logic:**
- `types(e)` lists what the drag carries (`e.dataTransfer.types`).
- `ours(e)`: files count and clear a stuck `internal` flag; otherwise a link/HTML type counts only if the drag was not internal.
- `onDragOver` must `preventDefault()` to **allow dropping** (the browser forbids drops unless a page says yes). Inside a text field it does that only for files, leaving text dragging to the field.
- `onDropEvent`: reads the drop with `readDrop`; no picture found → if there were other files, report them (`onOther`) and cancel; if it was just text for an editable box, leave it alone. Otherwise cancel the default and call `onDrop({ ...found, x, y, target })` with where it landed.
- It returns a function that removes every listener and the overlay, for clean-up.

**Worked example.** A picture file is dragged in: `dragenter` on the window raises `depth` to 1 and shows the frame. Moving onto a panel fires `dragenter` for the panel (depth 2) and then `dragleave` for the window's background (depth 1), so the frame stays. Leaving the window fires `dragleave` (depth 0) and hides it. A picture dragged *out of ZEditor's Layers panel* back over the window: `dragstart` set `internal`, there is no `Files` type, so `ours()` is false and no frame appears.

### `isImageFile`

```js file=shared/js/dropImages.js fn=isImageFile
```

**The Logic:** a file is a picture if its MIME type starts with `image/`, **or** its name ends in a picture extension (`IMAGE_NAME` pattern), or it is an SVG (some systems report SVG files with no type). `Boolean(file) &&` guards `null`.
