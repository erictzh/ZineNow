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

Why a page needs a live thumbnail, and how "stale" is decided:

```js file=apps/ZEditor/src/state/useLiveThumbs.js
const needsLive = (p) => (p.annotations && p.annotations.length > 0) || filterOn(p.filter);
```

```js file=apps/ZEditor/src/state/useLiveThumbs.js
    return !m || m.annotations !== p.annotations || m.filter !== p.filter || m.base !== p.dataUrl;
```

The adaptive wait before the next redraw:

```js file=apps/ZEditor/src/state/useLiveThumbs.js
    const gap = edited ? Math.max(SELECTED_GAP_MS, lastMs.current * SLOW_FACTOR) : Math.max(OTHER_GAP_MS, lastMs.current);
```

Drawing a thumbnail at one scale and showing it at another:

```js file=apps/ZEditor/src/ui/sidebar/Thumbnail.jsx
        <img srcSet={src + " " + THUMB_SCALE / THUMB_SHOWN_SCALE + "x"} draggable="false" alt={p.isBlank ? "Blank page" : "Page " + p.pageNumber} />
```

Auto-scroll while dragging near the edge:

```js file=apps/ZEditor/src/ui/sidebar/Sidebar.jsx
    if (distFromTop < EDGE_SCROLL_ZONE) {
      scrollDirRef.current = -1;
    } else if (distFromBottom < EDGE_SCROLL_ZONE) {
      scrollDirRef.current = 1;
    } else {
      scrollDirRef.current = 0;
    }
```

Drop before or after a thumbnail:

```js file=apps/ZEditor/src/ui/sidebar/Sidebar.jsx
        const before = e.clientY < rect.top + rect.height / 2;
```
