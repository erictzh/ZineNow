## Intro

All Typography settings can be **saved to a small `.json` file** and loaded again later, so you can keep one look for your zine series, switch between a "book" and a "pamphlet" set-up, or share a style with someone else. These are **config files** (configuration: a record of the settings).

## How to use

At the top of the Typography tab, under **Saved Config Files**:
- **Save…** writes all the settings to a file. The box next to it is the file name (default `config.json`; `.json` is added if you leave it off).
- **Open…** loads a settings file. Settings the file does not mention keep their current value; unknown entries are ignored.
- A grey line reports *Saved…* or *Loaded…*, or what went wrong.
- When the app is opened from a file on your own disk, a hint suggests a `config` folder next to it. (A web page cannot choose a folder by itself, but the browser remembers the last folder per dialog.)
- Old files with a single `headingTextAlign` still work: it is spread to H1 to H3.

## How it works

A config file is just the app's settings object written as **JSON**, a plain text format of `"name": value` pairs inside braces. Saving is `JSON.stringify(config, null, 2)` (`2` = indent by two spaces for readability). Loading goes in three steps: **read** the file, **check** it is an object, then **merge** it in.

**Merging is careful.** Only names the app already knows are copied (no stray data gets into the settings). Each value is coerced to the type its control expects: on/off switches become real true/false (so a hand-written `"false"` really means off), and everything else becomes text (so a bare number in a hand-edited file still works).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `readConfigFile` and `configFileName`

```js file=apps/Markdown-to-PDF/src/settings/configFile.js fn=readConfigFile,configFileName
```

**The Logic:** `readConfigFile` returns a **Promise** (a placeholder for a result that arrives later) and uses a `FileReader` (the browser's tool for reading a file's contents). When the text is loaded, `JSON.parse` turns it into an object; it throws an error for broken JSON. The check `!parsed || typeof parsed !== "object" || Array.isArray(parsed)` rejects `null`, numbers, text and lists (a list is technically an "object" in JavaScript). Errors become a readable *Could not read that file: …*. `configFileName` trims what you typed, defaults to `config`, and adds `.json` unless the name already ends with it (`/\.json$/i`: case-insensitive).

**Worked example.** `configFileName("")` → `config.json`; `("zine-style")` → `zine-style.json`; `("Book.JSON")` → `Book.JSON`. A file containing `[1,2]` → *That file is not a config object.*; a file with `{"fontSize": 15, "bogus": 1}` merges only `fontSize`.

### `applyConfig`: the careful merge

```js file=apps/Markdown-to-PDF/src/ui/App.jsx fn=applyConfig
```

**The Logic:** first, the legacy fix: if the loaded file has `headingTextAlign`, a copy of it is made (`{ ...loaded }` copies every entry) and the value is set on each of `h1TextAlign`, `h2TextAlign`, `h3TextAlign` that is missing. Then `setConfig(prev => …)` makes a new settings object from the previous one. `Object.keys(prev)` walks only **known** names; `hasOwnProperty.call(loaded, key)` skips names the file does not have. Boolean names (the list `BOOLEAN_CONFIG_KEYS`) are converted: the text `false`, `0`, `no`, `off` or empty is false, anything else true. All other values become text (`null` and `undefined` become empty).

**Worked example.** Current `fontSize` is `""`; the file says `{"fontSize": 15, "h1Underline": "false", "extra": 3}`. Result: `fontSize` = `"15"` (text), `h1Underline` = `false` (really off), `extra` is dropped, and everything else is unchanged.

### Saving

```js file=apps/Markdown-to-PDF/src/ui/typography/ConfigFiles.jsx fn=handleSaveConfig
```

**The Logic:** `saveTextFile` ([Open and save](md2pdf/workspace/keyboard-shortcuts)) shows the native Save As dialog where available, or downloads the file. It returns `null` if you closed the dialog, and the code does nothing then. Open and Save share one dialog id (`md2ebook-config`), so the browser remembers the same folder for both.
