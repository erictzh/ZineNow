## Intro

Markdown to PDF has three areas: the **top bar** (file actions and the two export buttons), the **preview** on the left (your pages, as they will print) and the **side panel** on the right with two tabs, **Editor** (where you type) and **Typography** (how it looks). This page is a tour of those three, plus the small **gear** at the bottom left.

## How to use

**Top bar**
- **File** menu: **Open file…** (Markdown, plain text, Word, EPUB or Muse; it replaces the editor's text and Ctrl+Z brings the old text back), **Save** (appears after the first save; writes back to the same file with no dialog), **Save as Markdown…** (saves the text as a `.md` file), and **Load sample Markdown**.
- **Send to ZineArranger:** builds the PDF and opens it in ZineArranger ([Send to ZineArranger](zeditor/project/send-to-zinearranger) explains the hand-off).
- **Download PDF eBook:** opens your browser's print dialog; choose **Save as PDF** ([Print to PDF](md2pdf/export/print-to-pdf)).
- The small grey **build** number tells you which version of the app is running.

**Side panel**
- **Editor** tab: the text box and its toolbar ([Editor](md2pdf/editor/format-toolbar)).
- **Typography** tab: page, text, headings, code, contents and page-number settings.

**Gear (bottom left):** **Editor text size** (10 to 28 px), **Interface size** (75% to 175%), **Dark paper** (the preview pages are shown dark; the PDF stays white), and **Show**: hide the top bar, or show only the preview, only the side panel, or both.

## How it works

The window is a column: the top bar, an optional red error strip (shown when an export fails, with **Dismiss**), then the **body**, which holds the preview and the side panel side by side. The side panel's tab is just a state value (`"editor"` or `"typography"`); clicking a tab changes it and the panel draws the matching contents.

**Menus.** A drop-down menu is a button plus a panel that appears only while the menu is open. It closes when you click anywhere else (a `mousedown` listener on the whole page checks whether the click was inside the menu) or press Escape. If the panel would run off the screen edge, it is shifted back in, keeping 8 px clear.

**The gear and zoom.** *Interface size* uses a CSS **zoom** (a browser setting that magnifies an element and everything in it) held in a variable called `--zn-ui-zoom`. Because the menu is zoomed, a position measured in screen pixels must be divided by the zoom before it is used as the menu's own offset.

**Settings are remembered** in the browser's `localStorage` (a small store for each website) under a name, so they survive closing the tab. They belong to the browser, not to the document.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The top bar

```js file=apps/Markdown-to-PDF/src/ui/Header.jsx
// The top bar: the File menu (open, save, sample), Send to ZineArranger, Download PDF.
```

> **Tip** The top bar is plain page layout (menu rows and two buttons), so the interesting code is the menu behaviour below, not the bar.

### `DropMenu`: the menu that closes itself

```js file=apps/Markdown-to-PDF/src/ui/Menu.jsx fn=DropMenu
```

**The Logic:**
- `useState(false)` keeps whether the menu is open. A **hook** (a function starting with `use`) is React's way of giving a component memory; calling `setOpen` re-draws the menu.
- The first `useEffect` runs when `open` changes. While the menu is open it adds two listeners, to **any mouse press** and **any key press**, and its returned function **removes** them when the menu closes, so they never pile up. The mouse listener asks `containerRef.current.contains(e.target)`: "was the click inside the menu's own box?"; if not, close.
- The second effect (`useLayoutEffect`, which runs before the screen is painted so you never see a jump) measures the open panel with `getBoundingClientRect()`. `limit` is the window width minus 8. If the panel's right edge passes it, it is shifted left by the overshoot; if the left edge is under 8, shifted right. Dividing by `zoom` converts screen pixels into the panel's own units.

**Worked example.** The window is 1000 px wide, so `limit = 992`. The panel's box is `left = 800`, `right = 1040`, `width = 240`, and the interface size is 100% (`zoom = 1`). It overshoots by `right − limit = 48`, and the shift is `max(8 − 800, 992 − 1040) = max(−792, −48) = −48`: the panel moves **48 px left**. At 125% interface size the screen width is 300 for an `offsetWidth` of 240, so `zoom = 1.25` and the same overshoot is written `−48 / 1.25 = −38.4` in the panel's own units.

### `installMd2pdfDisplaySettings`: the gear

```js file=apps/Markdown-to-PDF/src/ui/displaySettings.js fn=installMd2pdfDisplaySettings
```

**The Logic:** the gear itself is shared by every ZineNow app (`shared/js/displaySettings.js`); this app only **describes** its settings and the shared code builds the pop-up. A **slider** has a range, a starting value, a unit and the CSS variable it controls (`cssValue` converts the number to what the variable needs: `13.5` becomes `"13.5px"`, `125` becomes `"1.25"`). A **check** adds a class to the page's root element (`md2ebook-dark-paper`), and the stylesheet reacts to that class. The **Panels** choice sets two flags, one hiding the preview and one hiding the side panel; "Show both" sets neither.

**Worked example.** *Interface size* 125 → `cssValue(125)` = `String(125 / 100)` = `"1.25"` → `--zn-ui-zoom: 1.25`. *Editor text size* 13.5 → `"13.5px"`. Choosing "Preview (left) only" sets `hideSidebar: true`, which puts the class `md2ebook-hide-sidebar` on the page.
