## Intro

The **shell** is the part of the app that does not belong to any one tool: the window, the tools list, the buttons along the top, the keyboard shortcuts. The **registry** is a tiny list that the tools sign up to. Because of this split, **adding a new tool means writing one new file and adding one line**: the shell needs no other change.

## How to use

- **Left:** the list of tools: Remove object, Remove background, Face blur, Click-to-select, Upscale, Text from image, and **Models**. Each shows its name and a one-line summary. Click one to switch.
- **Middle:** your picture, with **Open**, **Undo**, **Redo**, **Hold to compare**, **Save PNG** and **Send to ZEditor** along the top.
- **Right:** the chosen tool's options, with the log underneath.
- **Keys:** Ctrl/⌘ Z undoes and Ctrl/⌘ Shift Z redoes (not while typing in a box). **Enter** runs the tool's main action (for example Remove object). Some tools have their own keys, such as `[` and `]` for the brush size.
- Switching tools keeps your picture and your undo history. Each tool keeps its own marks and settings until you reload.

## How it works

### A tool is an object

Each tool is a plain object with an `id`, a `name`, a one-line `summary`, and a function `create(ctx)`. Calling `create` returns the tool's working parts: `mount(panel)` (build the options in the right panel), `unmount()` (take them down) and optionally `onKey(e)` and `primary()`.

### The context `ctx`

The shell hands every tool the same toolbox, `ctx`: the shared **picture**, a **status** function to show a message, and `openModels` to jump to the Models page. A tool never owns the picture; it asks the picture to change.

### Lazy creation

A tool is *created* the first time you select it and kept after that, so its marks, brush size and so on survive when you switch away and back.

### One key handler

A single keyboard listener on the whole page asks first whether the person is typing in a box (then it does nothing), then handles Undo/Redo, then lets the **active** tool have the key (`onKey`), and finally runs Enter as "the tool's main action".

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The registry

```js file=apps/AiToolsLocal/src/registry.js
// The tools list. A tool is { id, name, summary, create(ctx) } where create returns { mount(panelEl), unmount(), onKey?(e), primary?() }.
// ctx: { picture, status(text, kind), openModels() } (see main.js). Adding a tool = a new file in tools/ and one line in main.js.

const tools = [];
export const registerTool = (t) => { tools.push(t); return t; };
export const allTools = () => tools.slice();
```

**The Logic:** `tools` is a private list. `registerTool(t)` adds a tool and returns it, so a tool file can say `export const myTool = registerTool({…})` if it wants. `allTools()` returns a **copy** (`slice()` makes a shallow copy), so no one outside can change the real list by accident.

### Registering tools and building the list

```js file=apps/AiToolsLocal/src/main.js
registerTool(removeObjectTool);
registerTool(removeBackgroundTool);
registerTool(faceBlurTool);
registerTool(selectObjectTool);
registerTool(upscaleTool);
registerTool(ocrTool);
```

```js file=apps/AiToolsLocal/src/main.js
function buildList() {
  const list = $("tools-list");
  for (const t of [...allTools(), MODELS_TOOL]) {
    const b = document.createElement("button"); b.type = "button"; b.className = "tool-btn"; b.dataset.id = t.id;
    const n = document.createElement("span"); n.className = "tool-name"; n.textContent = t.name;
    const s = document.createElement("span"); s.className = "tool-sum"; s.textContent = t.summary;
    b.append(n, s);
    b.addEventListener("click", () => select(t.id));
    list.append(b);
  }
```

**The Logic:** `[...allTools(), MODELS_TOOL]` makes a new list with all the tools and, last, the Models entry (the three dots **spread** a list's items out). For each, a `<button>` is built with two `<span>`s (name and summary). `b.dataset.id = t.id` stores the tool's id on the element as a `data-id` attribute, so the click handler and the highlight code can find it later. The click calls `select(t.id)`.

### Switching tools: `select`

```js file=apps/AiToolsLocal/src/main.js fn=select
```

**The Logic:**
1. If it is already the active tool, nothing happens (`return`).
2. Otherwise **unmount** the current tool (take its controls away; the Models page is "hidden" instead).
3. Clear the right panel, then **highlight** the chosen button: `classList.toggle("active", condition)` adds the class when the condition is true and removes it when false.
4. For Models, show the page and a hint. For a tool: find its definition, **create it once** (`instances` is a `Map`, a lookup table from id to tool; `has` asks whether it exists), `mount` it into the panel and let it know the current picture state (`onPictureChange`).

**Worked example.** Start: Remove object is active. You click Upscale: `select("upscale")` → `active.tool.unmount()` for Remove object; panel emptied; Upscale's button gets `active`; `instances` has no `"upscale"` yet, so `def.create(ctx)` runs and the result is stored; `mount(panel)` fills the panel. Click Remove object again: `instances.has("remove-object")` is true, so its **old** instance (with its marks) is mounted again.

### Keys

```js file=apps/AiToolsLocal/src/main.js
document.addEventListener("keydown", (e) => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); (e.shiftKey ? $("redo") : $("undo")).click(); return; }
  const tool = active && active.tool;
  if (!tool) return;
  if (tool.onKey && tool.onKey(e)) return;
  if (e.key === "Enter" && picture.loaded && tool.primary) tool.primary();
});
```

**The Logic:** the first line ignores keys typed inside an `INPUT`, `TEXTAREA` or `SELECT` (the pattern `/INPUT|TEXTAREA|SELECT/` tests the element's tag name). `e.ctrlKey || e.metaKey` is Ctrl on Windows and ⌘ on Mac. With Shift it presses the Redo button, otherwise Undo: `.click()` runs the button's own handler, so the button's disabled state is respected. `tool.onKey && tool.onKey(e)` means "if the tool has a key handler, call it": it returns true when it used the key, which stops further handling. Enter runs `tool.primary()`.
