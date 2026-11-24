## Intro

Closing the tab or pressing refresh while you have unsaved work would lose it. Browsers offer a standard **"Leave site? Changes you made may not be saved"** warning for this, and every app can turn it on **only while there is something to lose**. The browser writes the wording (pages are not allowed to set it).

## How to use

You simply see the browser's own dialog when you try to close, refresh or navigate away:
- **ZEditor:** while a document is open with changes.
- **Markdown to PDF:** once the text is your own (not empty, not the sample).
- **ZineArranger:** once a PDF has been laid out.
The Wiki and the home page never warn.

## How it works

The browser fires a `beforeunload` event just before leaving. If a handler calls `preventDefault()` (and sets `returnValue` to `""` for older browsers), the browser shows its dialog. The shared helper installs **one** listener the first time, and each app gives it a **question function**: "is there work worth keeping right now?". The function is asked at the last moment, so it always reflects the present state.

`allowNextUnload()` skips the warning once: for when the app reloads itself deliberately after saving its work (ZEditor's reload snapshot, see [The .znow file](zeditor/project/znow-file)).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `warnBeforeLeaving` and `allowNextUnload`

```js file=shared/js/leaveWarning.js fn=warnBeforeLeaving,allowNextUnload
```

**The Logic:** `hasWork` is a variable holding a function, replaced by each call. `installed` makes sure the listener is added once. Inside it: `if (bypassOnce || !hasWork()) return;` means "no warning when bypassed, or when there is no work". Note that `bypassOnce` is never reset, because the page is about to reload and the whole script starts over.

### How each app uses it

```js file=apps/ZineArranger/src/main.js
warnBeforeLeaving(() => state.pageCount > 0);
```

```js file=apps/Markdown-to-PDF/src/ui/App.jsx
  useEffect(() => { warnBeforeLeaving(() => markdownRef.current.trim() !== "" && markdownRef.current !== SAMPLE_MARKDOWN); }, []);
```

**The Logic:** ZineArranger passes `() => state.pageCount > 0` (true once pages are laid out). Markdown to PDF compares the live text, kept in a **ref** (a box whose contents survive redraws and are always current), to the sample and the empty text: `markdownRef.current.trim() !== "" && markdownRef.current !== SAMPLE_MARKDOWN`.

**Worked example.** Markdown to PDF at start (sample text): no warning. You type one letter: the text differs from the sample, so refreshing now asks. You clear everything: empty, no warning. In ZineArranger before choosing a file `pageCount` is 0: no warning; after loading a 16-page PDF it is 16: warning.
