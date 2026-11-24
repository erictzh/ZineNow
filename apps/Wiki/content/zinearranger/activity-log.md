## Intro

The **activity log** is a small terminal-like panel that shows, line by line, **what the app is doing**: each function it runs and what came of it. It is there for transparency and troubleshooting: if a zine looks wrong, the log says which page went to which slot, how many blank pages were added and why.

## How to use

- Lines starting with a prompt `❯` are **commands**: the real function call being run (for example `renderPage(3)`).
- Lines with an arrow `↪` are **results**: what happened (*"3/12 (PDF page 3) → zine slot 2."*). A warning is highlighted.
- Lines starting with `#` are **system** messages (startup, log cleared, the file received from ZEditor).
- Each line starts with the time, e.g. `[14:05:09]`.
- Buttons: **Hide / Show** the panel, **Clear**, and **⧉ Copy** (copies the whole log as plain text, then the button says *✓ Copied* for a moment). Copy it into a bug report if something misbehaves.

## How it works

Three small functions write one line each, differing only in style:
- `logSys(msg)`: a system line.
- `logCmd(code)`: a command line, in a code font.
- `logResult(msg, isWarn)`: an indented result, with a warning colour if `isWarn` is true.

Each creates a `<div>`, fills in the text and **appends** it to the log's output box, then scrolls the box to the bottom (`scrollTop = scrollHeight`). Messages that contain `<` or `&` go through an **escaping** function so they show as typed and cannot be mistaken for HTML. (`logSys` uses `textContent`, which is already safe.)

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The three log functions

```js file=apps/ZineArranger/src/activityLog.js fn=logTimestamp,escapeHtml,logSys,logCmd,logResult
```

**The Logic:**
- `new Date().toLocaleTimeString([], { hour12: false })` is the current time in the user's language as 24-hour text (`14:05:09`). The empty list `[]` means "the browser's default language".
- `escapeHtml` replaces `&`, `<`, `>` by the **entities** `&amp;`, `&lt;`, `&gt;` so those characters display as text. The `&` is replaced **first**, otherwise the `&` of the other entities would be replaced too.
- Each function finds the output box (`document.getElementById("log-output")`) and quietly returns if there is none (`if(!out) return;`). It makes a `<div>` with a class (`log-line log-cmd`), fills it, `appendChild` adds it at the end, and the last line scrolls to the bottom.
- `&#10095;` and `&#8618;` are the characters ❯ and ↪, written as **numeric entities**.

**Worked example.** `logCmd("renderPage(3)")` adds `[14:05:09] ❯ renderPage(3)`. `logResult("3/12 (PDF page 3) → zine slot 2.")` adds `↪ 3/12 …` below it. A page title like `<b>` would show as the literal text `<b>`.

### Buttons: `copyLog`, `toggleLogPanel`, `clearLog`

```js file=apps/ZineArranger/src/activityLog.js fn=clearLog,toggleLogPanel,copyLog
```

**The Logic:** `toggleLogPanel` flips a yes/no value in the state (`!state.logPanelVisible`), then shows or hides the box and sets the button's text. `copyLog` collects the text of every log line (`Array.prototype.map.call(lines, …)` runs `map` on a list-like object that is not a real list), joins them with newlines, and uses the clipboard: `navigator.clipboard.writeText(text)`, which returns a Promise (`.then` on success, `.catch` on failure). Older browsers use a fallback: a hidden `<textarea>`, `select()` and `document.execCommand("copy")`. `flash(label)` shows a message on the button for 1200 ms (`setTimeout`), then restores it.
