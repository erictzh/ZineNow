## Intro

ZineNow is **free software** for making zines, made of four small web apps and a home page:

| App | What it does |
|---|---|
| **ZEditor** | Compose and edit zine pages: text, images, shapes, drawing, filters. Saves `.znow` projects and exports PDF, PNG, JPG and SVG. |
| **Markdown to PDF** | Write in Markdown (or import Word, EPUB, Muse) and export a typeset, paginated PDF book. |
| **ZineArranger** | Rearrange a PDF's pages onto printer sheets so that when folded and cut they read in order (imposition). |
| **Ai Tools (Local)** | *Experimental.* AI tools that run on your device: remove an object or background, blur faces, select by clicking, upscale, read text. |

Plus the **home page** (a card per app) and this **wiki**. The suite is **browser-only**: there is no server of our own. Everything is HTML, CSS and JavaScript files that your browser runs.

## How to use

- **Open `index.html`** (the home page) from the folder, or visit the website. Click **Open** on an app's card.
- The apps work **straight from disk** (double-click `index.html`), over the web, or installed like an app ([Offline and install](start/offline-and-install)).
- Typical journey: write in **Markdown to PDF** or compose in **ZEditor**, export a PDF, then **Send to ZineArranger** to lay the pages out for printing. Photos can be cleaned in **Ai Tools** first.
- The licence lives in the gear panel on the home page and in each app: **Source code**, **Third-party notices**.

## How it works

### Why browser-only?

- **Privacy:** your pictures and writing are processed on your device.
- **Zero setup:** no installer, no account, no hosting bill, and it keeps working years later as long as a browser exists.
- **Free software:** the code is open for anyone to read, copy and improve. ZineNow is licensed **AGPL-3.0-or-later**: *everyone may use, change and share it, even sell it, but nobody may turn it into closed source*. (The **A** is for "Affero": if you run a changed version for others over a network, you must share your changes. Hence the visible **Source code** link in every app.)

### The pieces

```
index.html            the home page (launcher)
config/apps-config.js the list of apps shown on it
apps/<App>/           one folder per app: index.html, src/ (the code), dist/app.js (the built script), sw.js, manifest
shared/               code and styles used by several apps
tools/                the build and test scripts
docs/, tests/         notes and the automatic tests
```

### Credit

ZineArranger is ZineNow's version of **Zine Arranger by Nash High** (MIT licence). Libraries and AI models are used under their own free licences, listed in [Licence policy and third-party notices](appendix/licences).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The list of apps and the project settings

```js file=config/apps-config.js
*/

window.ZINENOW_APPS = [  
  {
    folder: "ZineArranger",
    desc: "Prepare Zine for Printing"
  },
  {
    folder: "Markdown-to-PDF",
    desc: "Md text editor for PDF Rxport",
  },
  {
    folder: "ZEditor",
    desc: "Compose and edit zine pages"
  },
  {
    folder: "RgbToCmyk",
    name: "RGB to CMYK",
    desc: "Make a PDF print-friendly (CMYK)"
  },
  {
    folder: "AiToolsLocal",
    desc: "Under development, still in experimental phase.",
    experimental: true
  }
];
```

```js file=package.json
{
  "name": "zinenow",
  "private": true,
  "description": "ZineNow zine-making tools. Apps run from plain files (file://); this package only builds each app's src/ into dist/app.js.",
  "license": "AGPL-3.0-or-later",
  "scripts": {
    "build": "node tools/build.mjs && node apps/Wiki/build.mjs",
    "watch": "node tools/build.mjs --watch",
    "check": "node tools/build.mjs --check && node apps/Wiki/build.mjs --check",
    "test": "node tools/test.mjs"
  },
  "devDependencies": {
    "@pdf-lib/fontkit": "^1.1.1",
    "esbuild": "0.24.0",
    "hyphen": "^1.14.1",
    "marked": "^12.0.2"
  }
```

**The Logic:** `window.ZINENOW_APPS` is a plain **array** (an ordered list) of **objects** (`{ folder: "ZEditor", desc: "…" }`). The home page reads it ([App cards](home/app-cards)); the order in the list is the order of the cards. `experimental: true` hides an app until you switch on *Experimental AI features*. `package.json` is the project's **manifest**: `"private": true` means "never publish this to the npm package registry"; `"license"` uses an **SPDX identifier** (a standard short code for a licence). The `scripts` are shortcuts you run with `npm run <name>`: `build`, `watch`, `check` and `test` ([How it is built](start/how-its-built)). The `devDependencies` are tools used only while developing (they are **not** shipped to users): `esbuild` bundles the code, `marked` makes this wiki's pages, `hyphen` and `@pdf-lib/fontkit` are used by ZEditor.

**Worked example.** The list has four entries, so the home page would show four cards: ZineArranger, Markdown-to-PDF, ZEditor, and AiToolsLocal, but the last has `experimental: true`, so with the AI switch off (the default) it shows **three**; turning it on shows **four**.
