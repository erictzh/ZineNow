## Intro

The **Log** at the bottom of the right-hand panel is a running text record of what the app and the tools did, with numbers about the picture, the model's answer and the saved file. Its purpose is **troubleshooting on devices you cannot see**: when something misbehaves on a phone, you copy the log, paste it into a message, and the problem can be diagnosed without guessing. Nothing leaves your device: the text only goes where you paste it.

## How to use

- **Copy** (top right of the window): copies the whole log as plain text; the button says *Copied ✓* for a moment.
- **Snapshot:** adds a block describing the app right now (picture size, undo steps, tool, and which models are downloaded) plus how see-through the picture is.
- **Clear:** empties the log (the device header comes back).
- **▾** (or **Ctrl+Shift+D**) folds and unfolds the window.
- The top of the log lists the app's build number, time, browser, screen, CPU threads, memory, whether WebGPU is available, whether you are online, and how much storage is used.
- Errors (even unexpected ones) are written in the log as `ERROR: …`.

## How it works

### A bounded list of lines

`debug.log(text)` adds a line with a time stamp (`HH:MM:SS.mmm`) to a list, and drops the oldest when there are more than **600**, so the log can never grow without limit. `debug.section(title, object)` logs a title and the object's contents as indented `key: value` lines. `debug.head(…)` puts a block at the very **top**: used for the device header.

### Pretty numbers

A formatter turns values into compact text: whole numbers stay as they are, tiny numbers use scientific form, and other numbers are rounded to 6 decimals, so a long float like `0.12345678901` does not fill the log.

### What is a see-through picture?

Each pixel has four numbers: red, green, blue and **alpha** (opacity, 0 to 255). `alphaStats` counts how many pixels have alpha 0 (fully clear), 255 (fully solid) or in between (partly), as percentages. It is how the app checks that "Remove background" really produced transparency. `describePng` looks at the **saved file's header** to find its PNG colour type (6 = has an alpha channel, 2 = none), then decodes the file again and runs `alphaStats` on that.

### Global error catching

Two listeners, for `error` and `unhandledrejection` (a promise that failed and nobody caught), write a line to the log. So crashes inside a model run still leave a trace.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The log itself

```js file=apps/AiToolsLocal/src/debug.js fn=stamp,num,fmt
```

**The Logic:** `new Date().toISOString()` is like `2026-11-24T14:05:09.123Z`; `.slice(11, 23)` keeps characters 11 to 22: `14:05:09.123`. In `num`: `Number.isInteger(v)` keeps whole numbers; `Math.abs(v) < 0.001 && v !== 0` picks scientific form `toExponential(2)`; otherwise `Math.round(v × 1e6) / 1e6` rounds to 6 decimal places. `fmt` writes an object recursively: for a nested object it writes the key then calls itself with a **deeper indent**; for an array it writes the items joined with ` | `.

**Worked example.** `num(3)` → `3`; `num(0.12345678901)` → `0.123457`; `num(0.0004)` → `4.00e-4`; `num("x")` → `x`. `fmt({ size: "640x480", models: { fill: "ready" } })` →

```
  size: 640x480
  models:
    fill: ready
```

### Counting see-through pixels

```js file=apps/AiToolsLocal/src/debug.js fn=alphaStats,describePng
```

**The Logic:** `getImageData` returns a long list of numbers, 4 per pixel. Starting at index 3 and stepping by 4 visits every **alpha**. Each pixel is counted as clear, solid or partly. The percentage is `round(1000 × count / n) / 10`: a way to keep **one decimal place** (multiply by 1000, round, divide by 10). `describePng` reads the first 33 bytes of the file: byte 25 of a PNG is the **colour type**. Then `createImageBitmap(blob)` decodes it and `alphaStats` measures it.

**Worked example.** A 10 × 10 picture with 25 clear pixels, 70 solid, 5 partly: `transparentPct = round(1000 × 25 / 100) / 10 = 25`, `opaquePct = 70`, `partlyPct = 5`. One third clear (1 of 3): `round(1000/3)/10 =` **33.3**.

### Building the window

```js file=apps/AiToolsLocal/src/debug.js fn=installDebug
```

**The Logic:** it builds the buttons and a read-only text area with ordinary DOM calls (`document.createElement`). `mk(label, fn, cls)` is a small helper that makes a button with a click handler. **Copy** uses `navigator.clipboard.writeText` and, if that is refused, selects the text and tries `execCommand("copy")`; either way the button label changes for 2.5 seconds (`setTimeout`). `refresh` copies the log's text into the box and scrolls to the bottom. The device header collects `navigator` facts: `hardwareConcurrency` (CPU threads), `deviceMemory`, `gpu` (WebGPU), `crossOriginIsolated`, and `navigator.storage.estimate()` for how many megabytes are used.
