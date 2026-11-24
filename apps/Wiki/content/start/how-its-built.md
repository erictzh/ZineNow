## Intro

The apps are written as many small files (in `src/`) but the browser is given **one plain script** per app, `dist/app.js`. A tool called **esbuild** joins and converts the small files into that script, and stamps it with a **build number** so you can tell which version a device is running.

## How to use

From the project folder (with Node.js installed):
- `npm install`: once, to fetch the development tools.
- `npm run build`: build every app (`dist/app.js`) and the wiki's `content.js`.
- `npm run watch`: rebuild automatically whenever a file changes.
- `npm run check`: fail if any built file is out of date. Run it before every commit.
- `npm test`: run the automatic tests.
- The **build number** is shown in each app (ZEditor's top bar, Markdown to PDF's subtitle, ZineArranger's subtitle, the wiki's top bar) and in the Log of Ai Tools. A new number means the code or styles changed.

**The one rule:** edit `src/`, never `dist/`. Commit both together.

## How it works

### Why bundle at all?

A web page opened from disk (`file://`) is not allowed to load JavaScript **modules** (the `import … from …` system) or to `fetch` neighbouring files. So the build uses **bundling**: following every `import` and gluing all the files into one script that needs nothing else.

- `format: "iife"`: the result is wrapped in an **immediately-invoked function expression** (`(() => { … })()`), so its names do not leak into the page.
- `jsx: "transform"`: ZEditor and Markdown to PDF use **JSX** (HTML-like syntax inside JavaScript); it is converted into plain `React.createElement(...)` calls. React itself, pdf.js and pdf-lib stay **globals** loaded by the page's own `<script>` tags, so they are not bundled.
- `target: "es2020"`: language features are kept to what browsers from 2020 understand.
- `define: { __BUILD__: … }`: a code word that is replaced by the build number text.

### The build number

A **hash** is a fixed-length fingerprint of some data: the same data always gives the same fingerprint, and any change gives a completely different one. The build number is the first 7 characters of a **SHA-1** hash over every file that decides how the app looks and behaves: its `src/`, its styles, its `index.html`, and everything in `shared/`. Line endings are normalised first, so Windows and Linux agree.

### `check`

`check` builds in memory, compares with the committed `dist/app.js` and exits with an error if they differ. Since the build number is part of the file, stale builds are caught even for a style-only change.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `findApps`

```js file=tools/build.mjs fn=findApps,filesUnder
```

**The Logic:** `readdirSync(appsDir, { withFileTypes: true })` lists the folders inside `apps/` with their type; `.filter(d => d.isDirectory())` keeps only folders. For each, `["main.jsx", "main.js"].map(...).find(existsSync)` looks for an entry file and takes the first that exists (`find` returns `undefined` if none). `.filter(Boolean)` drops the folders with no entry (like this wiki, which has its own build). `filesUnder` is **recursive**: a function that calls itself for each sub-folder, collecting every file path (`flatMap` merges the lists).

**Worked example.** `apps/` holds `AiToolsLocal`, `Markdown-to-PDF`, `Wiki`, `ZEditor`, `ZineArranger`: four have `src/main.js(x)`; `Wiki` has none, so `findApps` returns four apps. Each has `outfile: apps/<name>/dist/app.js`.

### `buildNumberFor` and `optionsFor`

```js file=tools/build.mjs fn=buildNumberFor,optionsFor
```

**The Logic:** the inputs are the app's `src`, `styles`, `index.html`, the whole of `shared`, and any `.css` file in the app's folder. `.map(p => p.replace(/\\/g, "/"))` makes the slashes the same on Windows, and `.sort()` makes the **order** the same everywhere (a hash depends on order). For each file, `hash.update(file + "\0")` feeds the **name** and then the **contents** (with `\r\n` turned into `\n`), each followed by a `\0` (a "null" character) separator so that two different sets of files can never produce the same stream by accident. `hash.digest("hex")` finishes as hexadecimal text and `.slice(0, 7)` keeps seven characters.

**Worked example.** SHA-1 of the text `abc` is `a9993e3647…`; the first 7 characters are **`a9993e3`**. The build number is made the same way, only from all those files. Change one letter in any style sheet and the whole 7-character number changes, so a tablet showing a different number than your computer is running a different version.
