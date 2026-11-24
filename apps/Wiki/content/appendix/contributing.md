## Intro

How to work on ZineNow: set up, change something, check it, and keep the repository healthy. The detailed guide is `docs/MAINTAINING.md` (recipes for common changes) with `docs/ARCHITECTURE.md` (how the code is organised) and `HANDOFF.md` (history and tricky details). This page is the short version.

## How to use

**Setup.** Install Node.js, then in the project folder `npm install`. Open `index.html` in a browser (or serve the folder: `python -m http.server 8000`).

**Everyday loop.**
1. `npm run watch` (rebuilds on every save) and reload the page after each edit.
2. Change **`src/`**, never `dist/`.
3. Before committing: `npm run build`, `npm run check` (is every committed build up to date?) and `npm test`.
4. Try the feature by hand in a real browser: tests only cover pure logic.
5. Commit `src/` and `dist/app.js` **together**.

**To find the right file:** every source file begins with one line saying what it is for. The "I want to change…" tables in MAINTAINING are an index.

**To add:** a tool in Ai Tools (one file in `src/tools/` and one `registerTool` line); a zine size in ZineArranger (a grid, layouts and a button); a Typography setting in Markdown to PDF (defaults, input, normalise, CSS); a wiki page (a `.md` file and a line in `apps/Wiki/content/toc.txt`).

## How it works

### The rules worth keeping

1. **Edit `src/`, never `dist/`.** 2. **One file, one job** (describable in one line). 3. **Imports point one way** (in ZEditor: model → render → io → state → ui); pure logic never imports React or touches the page. 4. **Preview and export share one renderer.** 5. **State is immutable**; ZEditor records an undo checkpoint before each change. 6. **Data over branches:** option lists, effects, shortcuts and layouts are tables; add a row, not another `if`. 7. **Everything must work from `file://`** (no `fetch` of local files, no browser modules, no new CDN without good reason).

### Tests

`npm test` bundles each `tests/*.test.js` with esbuild (so a test can import the app's own source files) and runs it in Node. A test prints `ok  :` or `FAIL:` lines and exits non-zero on a failure. Browser-dependent drawing is checked by hand.

### Refactoring safely

Record what the old code produces, then compare the new code against it on many inputs: ZineArranger's imposition was checked over 1.27 million option and page-count combinations this way.

### Pitfalls

Stale `dist/app.js`; `file://` limits; a service worker holding an old version (DevTools → Application → Unregister); pdf.js stalling in a hidden tab; global CSS from React inline styles (`background` shorthand with `background-clip: text`). Branch work and keep `main` working.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The test runner

```js file=tools/test.mjs
const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.js")).sort();
let failed = 0;
for (const file of files) {
  const outfile = join(outDir, file.replace(/\.js$/, ".cjs"));
  await esbuild.build({ entryPoints: [join(testsDir, file)], outfile, bundle: true, platform: "node", format: "cjs", logLevel: "warning" });
  console.log(`\n── ${file}`);
  const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
  if (result.status !== 0) failed++;
}
console.log(failed ? `\n${failed} of ${files.length} test files FAILED` : `\nall ${files.length} test files passed`);
process.exit(failed ? 1 : 0);
```

**The Logic:** it finds every `*.test.js` file and sorts them. For each: `esbuild.build({ entryPoints, outfile, bundle: true, platform: "node", format: "cjs" })` bundles the test and the app code it imports into one Node script (written to the system's temporary folder), `spawnSync(process.execPath, [outfile], { stdio: "inherit" })` runs it with Node and shows its output live, and a non-zero `status` counts as a failure. The final line says how many failed and the process exits 1 if any did, which is what makes `npm test` usable in automation.

**Worked example.** 31 test files, one of which fails: the output ends `1 of 31 test files FAILED` and the exit code is 1. All pass: `all 31 test files passed`, exit code 0.

### A test

```js file=tests/faces.test.js
// Face blur: YuNet's picture maths (shared/js/ai/faces.js).
import { FACE_SIZE, decodeYunet, nms, paddedBox, yunetInput } from "../shared/js/ai/faces.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

// input: B, G, R planes, 0..255 (not scaled)
const rgba = new Uint8ClampedArray(4 * 4); rgba.set([10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255]);
const inp = yunetInput(rgba, 2, 2);
ok(inp.length === 12 && inp[0] === 30 && inp[4] === 20 && inp[8] === 10 && inp[3] === 120, "the input is blue, green, red planes with the raw 0..255 values");

// a model answer with one planted face at stride 16, cell row 10, col 12 (the same one the benchmark page's stub model has)
const W = FACE_SIZE, H = FACE_SIZE, out = {};
```

**The Logic:** a tiny `ok(condition, message)` helper counts failures and prints one line each; the test plants a **known answer** (a pixel made of known colours) and checks the function's exact output. `rgba.set([…])` fills a list of bytes; `inp[0] === 30` checks that the first blue value is the red channel's 30, because the model wants colours in blue-green-red order. Tests like this guard the **maths** that the worked examples in this wiki also run.

### Checking a wiki page

```js file=apps/Wiki/build.mjs fn=readFile
```

**The Logic:** the wiki builder reads real files for every `file=` code block; a missing file or function **fails the build**, so snippets can never go stale silently. `npm run check` also fails if `content.js` differs from what the `.md` pages would build.
