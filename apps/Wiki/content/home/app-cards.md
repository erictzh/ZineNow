## Intro

The home page shows one **card** per app: its logo (or two-letter badge), name, short description, an **Open** button and a **⋯** menu with **About**. The list comes straight from one small config file; the page never reads your disk, so it works from `file://` with no permission prompts.

## How to use

- **Open** launches the app in a new tab.
- **⋯ → About** slides in a panel with the app's readme (if one was given in the config).
- A round **+** button at the bottom right, **hidden for visitors** and shown only when the address ends in `?dev` (for example `index.html?dev`), opens **New app snippet**: type a folder name (exactly as under `apps/`, case-sensitive), an optional description and an optional readme (Markdown), and it prints a ready-made entry; **Copy snippet**, then paste it into `config/apps-config.js` and refresh. (It writes nothing itself.)
- An app's logo is `apps/<folder>/app-logo.png`; without one a letter badge is used.
- Cards for **experimental** apps appear only when [Experimental Features (AI & other development)](home/gear-and-experimental) is on.

## How it works

### Config as data, no `fetch`

A browser blocks a page opened from disk from reading other files with `fetch()`. A plain `<script src="config/apps-config.js">` is allowed, though, so the config is a script that sets a global: `window.ZINENOW_APPS = [ … ]`. The launcher then reads that variable.

### Building a card

The code creates each card with `document.createElement` calls (never by gluing HTML text, which would be unsafe), and the logo `<img>` has an `onerror` handler that swaps it for a **badge** of two letters made from the folder name.

### A tiny Markdown reader

The About panel shows a readme written in Markdown, but the launcher does not load a Markdown library: it has its own ~30-line converter for headings, bold, italic, code, links, and lists. Text is **escaped first** (so `<` is shown as text, not read as a tag) and only then do the Markdown patterns add tags.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `letterMark`

```js file=launcher/launcher.js
  function letterMark(folder) {
    const clean = folder.replace(/[-_]+/g, " ").trim();
    const parts = clean.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }
```

**The Logic:** replace runs of `-` or `_` with a space, trim, split into words (`filter(Boolean)` drops empty ones). Two or more words: the first letters of the first two. Otherwise the first two letters. `.toUpperCase()` capitalises.

**Worked example (checked by running the function).** `Markdown-to-PDF` → "Markdown to PDF" → **MT**; `ZineArranger` (one word) → **ZI**; `AiToolsLocal` → **AI**; `my_app_x` → "my app x" → first letters `m`, `a` → **MA**.

### The tiny Markdown converter

```js file=launcher/launcher.js
  function inlineMd(s) {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }
```

```js file=launcher/launcher.js
  function markdownToHtml(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let listType = null;

    const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) { closeList(); continue; }

      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { closeList(); const lvl = h[1].length; out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`); continue; }

      const ul = line.match(/^[-*]\s+(.*)$/);
      if (ul) { if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul"; } out.push(`<li>${inlineMd(ul[1])}</li>`); continue; }

      const ol = line.match(/^\d+\.\s+(.*)$/);
      if (ol) { if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol"; } out.push(`<li>${inlineMd(ol[1])}</li>`); continue; }

      closeList();
      out.push(`<p>${inlineMd(line)}</p>`);
    }
    closeList();
    return out.join("\n");
  }
```

**The Logic:** `escapeHtml` replaces `& < > " '` using a lookup table in a replace function. `inlineMd` then applies four patterns, in order: `` `code` ``, `**bold**`, `*italic*`, `[text](url)`; each is a **regular expression** with a capture group (`([^`]+)` = "one or more characters that are not a backtick") and the replacement uses `$1`, `$2`. The order matters: bold (two stars) before italic (one star). `markdownToHtml` goes line by line: a heading (`#`, `##`, `###`), a bullet (`-` or `*`), a number (`1.`) or a paragraph; `listType` remembers whether a `<ul>` or `<ol>` is open so it can be closed (`closeList`) when the list ends.

**Worked example.** `inlineMd("Use **bold**, *it*, \`x<y\` and [site](http://a.b)")` gives `Use <strong>bold</strong>, <em>it</em>, <code>x&lt;y</code> and <a href="http://a.b" target="_blank" rel="noopener">site</a>` (checked). The `<` in the code is shown as text because escaping came first.

### The snippet generator

```js file=launcher/launcher.js
  function buildSnippet() {
    const folder = addFolderInput.value.trim();
    if (!folder) {
      addHint.textContent = "Fill in a folder name to generate the snippet.";
      addHint.className = "zn-modal-hint";
      addSnippet.style.display = "none";
      addCopyBtn.disabled = true;
      return;
    }

    const desc = addDescInput.value.trim();
    const readme = addReadmeInput.value;

    const lines = ["  {", `    folder: ${jsStringLiteral(folder)},`];
    if (desc) lines.push(`    desc: ${jsStringLiteral(desc)},`);
    if (readme.trim()) {
      lines.push("    readme: `" + readme.replace(/`/g, "\\`") + "`,");
    }
    lines.push("  },");

    addSnippet.textContent = lines.join("\n");
    addSnippet.style.display = "block";
    addCopyBtn.disabled = false;
    addHint.textContent = `Paste this inside the ZINENOW_APPS array in config/apps-config.js, matching the real folder name apps/${folder}/ exactly (case-sensitive), then refresh the page.`;
    addHint.className = "zn-modal-hint is-ok";
  }
```

**The Logic:** it returns early (hint and disabled Copy button) without a folder name. Otherwise it builds an array of text lines: `{`, `folder: "…"`, optionally `desc` and a template-literal `readme` (backticks inside are escaped as `` \` ``), and `},`. `JSON.stringify(s)` is used to make a **safe string literal** with quotes and escapes. The lines are joined with `\n`.

**Worked example.** Folder `Wiki`, description `The textbook` produces:

```
  {
    folder: "Wiki",
    desc: "The textbook",
  },
```
