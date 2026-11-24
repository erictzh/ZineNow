## Intro

The **Models** entry in the tools list opens a page listing **every AI model** the tools can use, with the facts you need before you download one: who made it, its **licence**, how **open** it is, its **size**, where it is downloaded from, and whether it is on your device. It is also where you **delete** a model to free space.

## How to use

- Each model is a card: **Used by** (the tool), name and kind, size in grey at the top right, licence (a link to the licence text), how open it is, a **Project page** link, and a **Download** button, or *Downloaded: works offline* with a **Delete** button.
- A progress bar and a **Cancel download** button appear while downloading.
- Below the models: the shared **AI engine** (ONNX Runtime Web) and, for text reading, the **Tesseract text reader**. Both are removed automatically when the last model that needs them is deleted.
- A line at the top says what is saved: *Saved on this device: 3 models, the AI engine, about 180 MB in total*, or *Nothing is downloaded yet.*
- Inside each tool, the same card appears (without Delete), so you can download the model you need right there.
- Nothing downloads until you confirm in a pop-up ([Dialogs](ai-tools/hub/dialogs)).

## How it works

### One controller per model

For each model there is a **controller**: an object that knows the model's **phase** and offers actions. The phases are `checking`, `none` (not on this device), `downloading` (with MB done and total) and `ready`. Controllers are made once and cached in a `Map`, so the Models page and a tool's own card always agree. Whoever wants updates **subscribes** (`subscribe(fn)` returns an "unsubscribe" function); each change calls every subscriber and a global one that updates the totals.

### The model card

`modelBox(id)` builds the card as a small page fragment and redraws its live part (`draw`) each time the controller changes.

### Cancel

A download is started with an **AbortController**: an object whose `signal` is passed to the download. Calling `abort()` makes the download stop with an `AbortError`, which is recognised and not shown as a failure.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `modelControl`

```js file=apps/AiToolsLocal/src/models.js fn=modelControl
```

**The Logic:**
- `controls.has(id)` returns the cached controller if there is one.
- The `const isFill = id === "fill", isFace = …` line decides which family of model it is; OCR models have ids like `ocr:eng` (language code after the colon, `id.slice(4)`).
- `set(patch)` merges changes into the state (`Object.assign`) then notifies. `refresh()` asks the manager ([The opt-in download flow](ai-tools/running-models/download-flow)) whether the model **and** its runtime are saved, and what a download would cost (`plan`). `Promise.all([...])` waits for two checks at once.
- `download()` creates the `AbortController`, sets phase `downloading`, calls `downloadAi({ which, model, signal, onProgress })`, and reports progress as `doneMb` and `totalMb`. After success, or any end, it calls `refresh()` to find out the truth. An `AbortError` is silent; any other error is shown.
- `remove()` calls the matching delete function, then `refresh()`.

### `sizeLabel`

```js file=apps/AiToolsLocal/src/models.js fn=sizeLabel
```

**The Logic:** 1000 MB or more is shown as GB with one decimal (`round(mb / 100) / 10`); under 1 MB it shows two decimals (`toFixed(2)`); otherwise one decimal (`round(mb × 10) / 10`).

**Worked example.** `sizeLabel(0.23)` → `0.23 MB`; `sizeLabel(28.2)` → `28.2 MB`; `sizeLabel(1234)` → `1.2 GB`; `sizeLabel(28.24)` → `28.2 MB`.

### `modelBox`

```js file=apps/AiToolsLocal/src/models.js fn=modelBox
```

**The Logic:** it builds the title, a "facts" sentence (the model's description, licence, size and source, always saying that it runs on your device and nothing is uploaded), and on the Models page also the author, licence link, openness and project link. `draw(s)` clears the live area and rebuilds it for the current phase: `checking` → "Checking…"; `none` → a **Download** button that first asks (`askDownload`) and downloads only if the answer is yes; `downloading` → a `<progress>` element (`max` and `value` in MB), text, and a Cancel button; `ready` → "Downloaded: works offline", and a Delete button if `deletable`. The box subscribes to its controller, and `box.dispose` is the unsubscribe function, called when the page is torn down, so no old boxes keep listening.

### The page: totals

```js file=apps/AiToolsLocal/src/modelsPage.js fn=createModelsPage
```

**The Logic:** `build()` empties the host and rebuilds all the cards from `MODEL_ROWS` (the table of models, see [Model list and licences](ai-tools/running-models/model-list-licences)). `updateTotals` adds up the size of the models in phase `ready`, plus the engine if saved, plus the text reader if saved, and writes the sentence; it runs whenever any model changes (`onModelsChanged`). `hide()` unsubscribes everything and clears the page.

**Worked example.** The remove-object model (28.2 MB) and the engine on a device without WebGPU (15.7 MB) are saved: `mb = 15.7 + 28.2 = 43.9`, so the page says *Saved on this device: 1 model, the AI engine, about 44 MB in total.* On a device with WebGPU the engine is 30.4 MB, giving 58.6, shown as *about 59 MB*. With nothing saved: *Nothing is downloaded yet.*
