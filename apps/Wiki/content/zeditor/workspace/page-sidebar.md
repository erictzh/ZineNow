## Intro

The left sidebar lists every page of the zine as a thumbnail. You use it to pick a page, select several, reorder them by dragging, rotate or delete a page, and add blank pages. The thumbnails are **live**: they show the items you put on a page, not just the blank paper.

## How to use

- **Click** a thumbnail to open that page. **Shift+click** (on a touch screen: switch on the touch bar's Shift, then tap) adds pages to the selection; **Select All** selects every page.
- **Drag** a thumbnail up or down to move it. A line shows where it will land. Dragging near the top or bottom edge scrolls the list. If several pages are selected, they all move together.
- **⟳** on a thumbnail rotates that page; the bin deletes it.
- **Add a blank page:** hover the gap between two thumbnails (or above the first, or below the last) until a line and a **+** appear, then click it.
- **Load PDF / New Document** (while empty) and **Insert PDF** (adds another PDF's pages) are in the sidebar header.
- Turn the live pictures off in the **Display gear** at the bottom left ("Live page thumbnails") if a very busy document feels slow.

## How it works

### Thumbnails cost almost nothing until you use them

Each page keeps a small **base thumbnail** (the PDF page or blank paper) made once when it was loaded. A page with no items and no filter just shows that. Only a page that has items or a filter gets a **live thumbnail**: the items are painted over the cached base at a small size.

### Noticing changes without comparing contents

The annotation list and the filter are never edited in place; every edit makes a new object. So "did this page change?" is just a reference comparison (`!==`): the page is **stale** if the list or filter it was drawn from is no longer the one in the page. Nothing is hashed or compared deeply. This is the same idea as *immutable data* in React.

### Redrawing politely: throttling

The page you are editing may redraw at most about six times a second (a gap of 150 ms), and the slower a redraw was, the longer the next wait: at least **4×** the last redraw's duration. That is a form of **adaptive throttling**: a heavy page cannot make the app lag because the wait grows with the cost. A final redraw always happens when your changes stop. Other pages (for example after you apply a filter to many pages) redraw one after another in the background, 25 ms apart.

### Memory

The thumbnails are blob URLs (`URL.createObjectURL`) kept out of the page data, so the undo history does not grow with them. Old ones are released, after a short delay so an `<img>` that is still showing one does not break.

### Sharp on every screen

Thumbnails are drawn at 0.45 pixels per point but shown at 0.3. The extra 1.5× pixels are declared with `srcSet` (`…  1.5x`), so on a high-density screen they stay sharp while the on-screen size stays the same.

### Drag to reorder

The thumbnails use the browser's built-in HTML drag and drop. While dragging, the list watches the pointer: within 44 px of the top or bottom edge it scrolls 4 px per animation frame, a deliberately slow speed so you can aim. The drop position is "before" or "after" the thumbnail under the pointer, decided by whether the pointer is in its upper or lower half.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Deciding what needs a live thumbnail

```js file=apps/ZEditor/src/state/useLiveThumbs.js fn=needsLive,isStale
```

**The Logic:**
- `needsLive` says a page needs one if it has at least one item (`p.annotations.length > 0`) **or** a filter is on. `p.annotations && ...` first checks the list exists, to avoid an error on a page without one.
- `isStale` looks up what the thumbnail was last drawn from (`m`) in a `Map` (a dictionary from page key to a record). It is stale if there is no record, or if the annotation list, filter or base picture are **not the same object** (`!==`). In JavaScript, `!==` on objects compares **identity**, not content, so it is instant. That only works because edits always make new objects (see [State hooks](zeditor/workspace/state-hooks)).

### Redrawing politely

```js file=apps/ZEditor/src/state/useLiveThumbs.js fn=schedule
```

**The Logic:**
- It does nothing if a redraw is already **running** (`running.current`), a timer is already waiting, or the sidebar is gone (`alive`).
- `nextStale()` picks a page to draw (the one you are editing first). If none, stop.
- `gap` is how long to wait. For the edited page it is the larger of 150 ms and four times how long the last redraw took (`lastMs.current * SLOW_FACTOR`): a **throttle** that slows down automatically when drawing is expensive.
- `setTimeout(run, ...)` schedules `run` after the delay; the `Math.max(0, ...)` makes sure the delay is never negative. The time already passed since the last redraw ended (`lastEnd`) is subtracted, so redraws are spaced by the gap, not gap-plus-draw-time.

### Picking the page to draw next

```js file=apps/ZEditor/src/state/useLiveThumbs.js fn=nextStale
```

**The Logic:** it loops over all pages (`for (const p of ps)`), skips the ones that need nothing (`continue` jumps to the next round), returns the selected page at once if it is stale, and otherwise remembers the first stale one in `first`. `!first` is true while `first` is still empty.

### Auto-scrolling while you drag

```js file=apps/ZEditor/src/ui/sidebar/Sidebar.jsx fn=handleContainerDragOver
```

**The Logic:**
- `getBoundingClientRect()` gives the list's position on screen; `e.clientY` is the pointer's. The two distances tell how close the pointer is to the top and bottom edge.
- Inside 44 pixels of an edge it sets a direction in a ref (`-1` up, `1` down, `0` none). A separate loop (`requestAnimationFrame`, which runs once per screen refresh) reads that direction and moves `scrollTop` by 4 pixels each frame. Splitting "decide direction" from "do the scrolling" keeps the movement smooth even when the pointer is still.

### Which half of the thumbnail?

```js file=apps/ZEditor/src/ui/sidebar/Sidebar.jsx
        const rect = e.currentTarget.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        setDragOverInfo({ idx, before });
```

**The Logic:** `rect.top + rect.height / 2` is the vertical middle of the thumbnail under the pointer. If the pointer is above it, the drop line goes before that page, otherwise after it. `setDragOverInfo` stores that, and React draws the drop line.

### Sharp thumbnails: drawn big, shown small

```js file=apps/ZEditor/src/ui/sidebar/Thumbnail.jsx
        <img srcSet={src + " " + THUMB_SCALE / THUMB_SHOWN_SCALE + "x"} draggable="false" alt={p.isBlank ? "Blank page" : "Page " + p.pageNumber} />
```

**The Logic:** `srcSet` tells the browser "this picture has 1.5 times the pixels" (0.45 ÷ 0.3). On a **high-density** (retina) screen, where one CSS pixel is several real pixels, it uses them all, so the thumbnail is crisp. `alt` is the text read by screen readers.
