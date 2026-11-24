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

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `useOnionGhost`: making the faded previous page

```js file=apps/ZEditor/src/state/useOnionGhost.js fn=useOnionGhost
```

Reading it:
- `useState(null)` holds the ghost picture (or nothing). A **data URL** (`canvas.toDataURL()`) is an image written out as one long piece of text that an `<img>` can show directly.
- `useEffect(() => {...}, [onionSkinOn, selectedIdx])` runs when those two values change, **and only then** (the second argument lists what it depends on). Deliberately, `pages` is not in the list: that is what keeps it from redrawing on every mouse movement.
- The first line is a **guard**: switched off, no page selected, or the first page (`selectedIdx === 0`, no previous one): clear the ghost and stop.
- `(async () => {...})()` defines an anonymous `async` function and runs it at once, so the effect can use `await` (an effect function itself must not be `async`). `await renderPageToCanvas(...)` waits for the previous page to be drawn at editor size with its own filter.
- `try { ... } catch (err) { ... }` runs the risky part, and if it fails, the `catch` clears the ghost instead of crashing.
- `let cancelled = false` and the returned cleanup `() => { cancelled = true; }` solve a **race condition**: if you change page before the drawing finishes, React runs the cleanup, the flag flips, and the late result is thrown away (`if (!cancelled) ...`) instead of appearing on the wrong page.
