## Intro

Markdown to PDF has a few keyboard shortcuts for files (anywhere in the app) and for formatting (inside the editor). On a Mac they use **⌘**, ⌥ and ⇧; on Windows and Linux **Ctrl+**, **Alt+** and **Shift+**. The menus and tooltips always show the right keys for your computer.

## How to use

**Files (anywhere in the app)**
| Keys | What it does |
|---|---|
| Ctrl/⌘ + O | Open file… |
| Ctrl/⌘ + S | Save (or Save as Markdown… the first time) |
| Ctrl/⌘ + Shift + S | Save as Markdown… (pick a new file) |
| Ctrl/⌘ + Z | Undo, including bringing back text replaced by Open file or Load sample |

The editor's own formatting shortcuts are on the [Format toolbar](md2pdf/editor/format-toolbar) page.

## How it works

The browser has its own Ctrl+O (open a file in a tab) and Ctrl+S (save the web page). To use these keys for the app, the app listens for key presses on the **whole window** and **cancels** the browser's own action with `preventDefault()` when it recognises the combination.

A key press is an **event** with properties: `ctrlKey`, `metaKey` (⌘), `altKey`, `shiftKey` and `key` (the character). The code builds a lookup name: `"shift+"` if Shift is held, plus the lower-case key. So Ctrl+S becomes `"s"`, and Ctrl+Shift+S becomes `"shift+s"`; a table of names to actions finds what to run.

**Which modifier shows:** `IS_MAC` checks the computer type from the browser's platform text; the labels are chosen once, at start-up.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### How modifier labels are chosen

```js file=apps/Markdown-to-PDF/src/ui/shortcutKeys.js
export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = IS_MAC ? "⌘" : "Ctrl+";
export const ALT = IS_MAC ? "⌥" : "Alt+";
export const SHIFT = IS_MAC ? "⇧" : "Shift+";
```

**The Logic:** `typeof navigator !== "undefined"` guards against running somewhere with no browser. `/Mac|iPhone|iPad/` is a **regular expression** (a pattern for matching text); `.test(text)` answers true or false. `a ? b : c` is "if a then b otherwise c". These are written once and used wherever a shortcut is displayed, e.g. `MOD + "S"` becomes `⌘S` or `Ctrl+S`.

### The file shortcuts

```js file=apps/Markdown-to-PDF/src/ui/App.jsx
  const fileShortcutsRef = useRef(null);
  fileShortcutsRef.current = { o: handleOpenFile, s: handleQuickSave, "shift+s": handleSaveMarkdown };
  useEffect(() => {
    function onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const action = fileShortcutsRef.current[(e.shiftKey ? "shift+" : "") + e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      action();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
```

**The Logic:** the table lives in a `ref` that is **re-filled on every redraw**, so each action is always the newest version of its function (with the current text) while the listener itself is attached only once (`[]` at the end). The handler returns at once unless Ctrl or ⌘ is held without Alt. The lookup name is built as described above; `fileShortcutsRef.current[name]` returns the function or `undefined`. If found, the browser's own action is cancelled and ours is run. The function returned from the effect removes the listener when the app closes.

**Worked example.** You press Ctrl+Shift+S: the browser reports `ctrlKey = true`, `shiftKey = true` and `key = "S"` (capital, because Shift is held). `"S".toLowerCase()` is `"s"`, the name is `"shift+" + "s"` = `"shift+s"`, which is the **Save as Markdown…** action. Pressing Ctrl+Alt+S: `altKey` is true, so the handler returns and the browser's own behaviour proceeds. Plain Ctrl+S → name `"s"` → quick save, which writes back to the same file if you have already saved once, otherwise it opens the Save as dialog.
