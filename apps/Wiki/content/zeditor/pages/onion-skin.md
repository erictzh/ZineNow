## Intro

**Onion skin** shows the previous page faintly on top of the page you are editing, like tracing paper. It is borrowed from hand-drawn animation, where it lets you see the last frame. In a zine it helps you line things up across a spread, and keep a layout consistent from page to page.

## How to use

- **Page menu → Onion Skin** switches it on. **Customize…** sets the **Opacity** (5% to 80% in steps of 5; default 30%).
- It shows page *n − 1* while you edit page *n*. On the first page there is nothing to show.
- The ghost does **not** update while you edit the previous page. Switch to another page and back to refresh it.

## How it works

### A picture of the previous page

The ghost is a **rendered image** of the whole previous page: its background, its own filter and all its items, drawn by the same function the PDF export uses (`renderPageToCanvas`), at editor size. It is turned into a data URL and laid over the current page with the chosen opacity (a CSS `opacity` on an `<img>`).

### Why it does not live-update

The effect that builds the ghost is watching only two things: whether the switch is on and which page is selected. It deliberately does **not** watch the pages themselves. If it did, it would redraw a whole page on every mouse movement of every drag anywhere in the document, which would make editing feel stuck. The cost of that choice is the small "switch away and back to refresh" rule. This is a trade-off between **freshness and responsiveness**.

### Cancelling stale work

Drawing a page is asynchronous. If you change page while one is being drawn, the old result must not appear on the new page. The effect sets a `cancelled` flag in its cleanup function, and the draw checks it before using its result. This guards against a **race condition**.

### Previous page only

It looks at the previous page only (not the next one, and not "left page of a spread" detection). That was a deliberate simplification.

## Code

The effect that makes the ghost, watching only the switch and the page:

```js file=apps/ZEditor/src/state/useOnionGhost.js
    if (!onionSkinOn || selectedIdx === null || selectedIdx === 0) { setOnionGhostSrc(null); return; }
    const prevPage = pages[selectedIdx - 1];
```

```js file=apps/ZEditor/src/state/useOnionGhost.js
        const canvas = await renderPageToCanvas(prevPage, pdfDocsRef, MAIN_SCALE, prevPage.filter || DEFAULT_PAGE_FILTER);
        if (!cancelled) setOnionGhostSrc(canvas.toDataURL());
```

```js file=apps/ZEditor/src/state/useOnionGhost.js
    return () => { cancelled = true; };
  }, [onionSkinOn, selectedIdx]);
```

The opacity slider's range:

```js file=apps/ZEditor/src/ui/settings/OnionSkinSettings.jsx
          type="range" className="ze-format-slider" min="0.05" max="0.8" step="0.05"
```
