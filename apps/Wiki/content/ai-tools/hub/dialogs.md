## Intro

Before anything is downloaded or deleted, a small **pop-up** asks you to confirm. It states **exactly what will happen**: what you are downloading, how big it is, where it comes from, and a plain warning, so the download is always **your informed choice**. There is also a ready-made function so every pop-up looks and behaves the same.

## How to use

- **Download AI model?** lists: the model's name, size, licence and the host it comes from; the runtime's size and host; the total; the promise that *the AI model will not connect to the internet: it runs on your device and no file or picture leaves it*; and a **warning** that it may freeze or lag on lower-end devices. Buttons: **Cancel** and **Confirm Download**.
- **Delete AI model?** says what will be removed, that the runtime is removed only when no model needs it, that ZEditor shares the same files (so it may need to download again), and that you can download it again any time.
- **Escape**, or a click **outside** the box, cancels. The main button has the focus so Enter confirms.

## How it works

### A promise that waits for a choice

`confirmDialog` builds the pop-up, then returns a **Promise**: a placeholder for an answer that will arrive later. The code that asks says `if (await confirmDialog(…))`, which means "wait here until the person has chosen; continue only if they chose yes". Clicking OK **resolves** the promise with `true`; Cancel, Escape or an outside click resolve it with `false`.

### Tidy up

When it is finished, the pop-up removes itself from the page and removes its Escape listener (`done(v)`), so nothing is left behind.

### Safe text

The points are inserted with `textContent` or as built elements, never as raw HTML, so a model name or a source address cannot inject markup. The `rich` helper builds a sentence with some words in bold from a list of pieces.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `confirmDialog` and `rich`

```js file=apps/AiToolsLocal/src/dialog.js fn=confirmDialog,rich
```

**The Logic:**
- Elements are made with `document.createElement`, given a class for the style, and an ARIA **role** (`dialog`, `aria-modal`, `aria-label`) so screen readers announce it as a dialog.
- A **backdrop** (a full-screen dimmed layer) holds the **box**. A click on the backdrop itself (`e.target === back`, not on the box inside it) cancels.
- The **Escape** listener is registered on the **capture** phase (`true` as the third argument), so it runs before other listeners; `e.stopPropagation()` keeps that Escape from also doing something else behind the pop-up.
- `points` can be strings or ready-made elements (`typeof p === "string"`), allowing bold parts.
- `rich([["You are downloading "], ["MI-GAN", true], [" …"]])` makes a `<span>` with plain text and `<b>` for those marked `true`.

### The two questions

```js file=apps/AiToolsLocal/src/models.js fn=askDownload,askDelete
```

**The Logic:** `askDownload` returns `false` straight away if no plan is known. It builds the sentence from the model's facts (`m.label`, `m.mb`, `m.licence`, `m.host`, `m.repo`) and the plan's numbers (`runtimeMb`, `totalMb`). A model under 1 MB is shown as "0.2" instead of 0. `askDelete` does the same for deletion.

**Worked example.** MI-GAN on a device without WebGPU: the model is 28.2 MB and the runtime 15.7 MB (rounded to 16), so the pop-up reads: *You are downloading an AI object-remover model (MI-GAN, about 28.2 MB, MIT licence) from huggingface.co (huggingface.co/lxfater/inpaint-web), plus its runtime (about 16 MB, skipped if you already have it) from cdn.jsdelivr.net. About 44 MB in total.* (`round(28.2 + 15.7) = round(43.9) = 44`.) On a device with WebGPU the runtime is 30.4 MB, so it says about 30 MB and about 59 MB in total.
