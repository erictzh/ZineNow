## Intro

ZineArranger is **ZineNow's version of Zine Arranger, a tool written by Nash High**, who released it under the **MIT License**, a very permissive licence that allows reuse and modification, provided the original copyright notice is kept. ZineNow's changes and additions are published under the **AGPL-3.0-or-later**, like the rest of ZineNow.

## How to use

Click the small **ⓘ** next to the title "Zine Arranger". A small note appears under it: **"Originally by Nash High"**. Click the ⓘ again, click anywhere else, or press **Esc** to close it. The note stays inside the app on purpose: a link would open a new browser window, which on a tablet covers the app.

The full details are in the app's folder: `LICENSE` has both licence texts and the notice, and `README.md` links the original project (on Codeberg) and keeps Nash High's original README.

## How it works

The credit is a button (the ⓘ) and a hidden note. Clicking toggles the note's `hidden` flag. Because the title area clips anything that overflows it, the note is placed with **fixed positioning**, computed from the button's position: just below it (6 px), and kept inside the window.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `setUpCredit`

```js file=apps/ZineArranger/src/credit.js fn=setUpCredit
```

**The Logic:**
- It looks up the button and the note; if either is missing the function ends quietly.
- `setOpen(open)` shows or hides the note (`pop.hidden = !open`) and keeps the button's `aria-expanded` attribute truthful for screen readers (`String(open)` makes the text `"true"` or `"false"`).
- When opening, the position is worked out. `getBoundingClientRect()` gives the button's box on the screen. The note's left edge is `Math.min(r.left, window.innerWidth − pop.offsetWidth − 8)`: **not past the right edge**, keeping 8 px free; then `Math.max(8, …)` keeps it **not past the left edge**. The top is `r.bottom + 6`.
- Four listeners: a click on the button toggles; `pointerdown` anywhere outside both the button and the note closes it; **Escape** closes; resizing the window closes it (since the position would be wrong).

**Worked example.** The button's left edge is at x = 950 in a 1000 px window, and the note is 180 px wide: `min(950, 1000 − 180 − 8 = 812) = 812`, then `max(8, 812) = 812`: the note's left edge is at **812 px**, so its right edge is at 992 and it stays on screen. For a button at x = 10: `min(10, 812) = 10`, `max(8, 10) = 10`.
