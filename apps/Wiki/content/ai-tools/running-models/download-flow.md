## Intro

Nothing is downloaded unless **you** agree. This page follows a download from the click to the saved file: the **plan** (what and how big), the **confirmation**, the streaming download with **progress**, the **Cache API** that keeps the file, and **deleting**.

## How to use

See [Models page](ai-tools/hub/models-page) and [Dialogs](ai-tools/hub/dialogs). In short: click **Download…**, read the pop-up, **Confirm Download**; a progress bar and **Cancel download** appear; when finished the card says *Downloaded: works offline*. **Delete** removes the model (and the runtime if no model needs it).

## How it works

### A download has two parts

1. the **model file** (from Hugging Face or jsDelivr);
2. the **runtime** (the ONNX Runtime script plus a large `.wasm` engine file, from jsDelivr), **shared by all models** and fetched only once. Its size depends on the device: **15.7 MB** for the processor build, **30.4 MB** for the WebGPU build.

The **plan** adds them up so the pop-up can say the total honestly.

### The Cache API

The **Cache API** is a storage place in the browser (originally for service workers) that stores **request → response** pairs, such as a web address and the file it returned. It handles big files, survives closing the browser, and is controlled only by this site. The app checks "is it saved?" with `cache.match(url)` and removes with `cache.delete(url)`. The code asks the browser to keep it from being cleared (`navigator.storage.persist()`) when the download ends, but the browser may decline.

### Streaming with progress

A normal `fetch` waits for the whole file. Instead the code reads the response as a **stream**: `res.body.getReader()` gives pieces (**chunks**) as they arrive; each is kept and counted; the total comes from the `content-length` header. After the last chunk the pieces are joined into one block of bytes and stored. **Cancel** uses an `AbortSignal`, and the half-downloaded file is **never kept**: it is only stored once complete.

### Saved checks

"Ready" means the model **and** the runtime are both saved.

### Deleting

Deleting forgets the model's own file. The runtime is deleted only when **no other model** is saved: a loop over every model asks `isModelSaved`; if one is found, the runtime stays.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `getModelBytes`

```js file=shared/js/ai/modelStore.js fn=isModelSaved,getModelBytes
```

**The Logic:** it opens the named cache (inside `try/catch`, since some private modes forbid it, then it just downloads every time). If the cache already has the file, it returns its bytes at once with `downloaded: false`. Otherwise `fetch(url, { signal })`, a non-OK reply throws a readable error naming the HTTP status. The loop `for (;;)` reads chunks until `done`; `chunks.push(value)`, `got += value.length` and `onProgress(got, total)`. Then `new Uint8Array(got)` and `bytes.set(c, off)` copy each chunk to its place (`off` is the running offset). `cache.put(url, new Response(...))` stores it, ignoring a quota error.

**Worked example.** A 10-byte file arriving as chunks of 6 and 4 bytes: progress calls `(6, 10)` then `(10, 10)`; `bytes` has length 10; chunk 1 is copied at offset 0, chunk 2 at offset 6.

### The plan and the saved checks

```js file=shared/js/ai/manager.js fn=downloadPlan,aiSaved,bgPlan
```

**The Logic:** `downloadPlan` picks the runtime size by whether a graphics chip is usable. The total is `Math.round(model + runtime)`. `aiSaved` checks every runtime file with `caches.match` (any cache, since the service worker may have stored it) and the model file; `Promise.all` waits for all checks together; `.every(Boolean)` is true only if every check is true.

**Worked example (no WebGPU: runtime 15.7 MB).** MI-GAN `round(28.2 + 15.7) =` **44**; U²-Netp `round(4.4 + 15.7) = 20`; MODNet `round(25 + 15.7) = 41`; YuNet `round(0.23 + 15.7) = 16`; MobileSAM `round(44.7 + 15.7) = 60`; Real-ESRGAN `round(4.9 + 15.7) = 21`. With WebGPU (30.4 MB), MI-GAN is `round(58.6) = 59`. If the runtime is already saved, only the model's size is counted.

### `downloadAi`

```js file=shared/js/ai/manager.js fn=downloadAi
```

**The Logic:** it works out what is **missing** (`saved.runtime`, `saved.model`) and the `total` to fetch. `report(extra)` calls `onProgress(done + extra, total)`, capped at the total (`Math.min`). The runtime's three files are fetched through the page (so the service worker keeps them); `res.clone()` makes a second copy of the response to store ourselves if the worker did not. Then the right model branch downloads: two files for MobileSAM (reader first, then mask maker). Finally it asks the browser to persist storage and reports 100%.

### Deleting without breaking others

```js file=shared/js/ai/manager.js fn=anyModelSaved,deleteRuntime,deleteBg
```

**The Logic:** `anyModelSaved(except)` asks, one by one, whether any model **other than** `except` is saved. `deleteRuntime` goes through every cache and removes each request whose address contains `onnxruntime-web` (`/onnxruntime-web/.test(url)`). `deleteBg(key)` releases the running session first (frees memory), forgets that model's file, and deletes the runtime only if nothing else needs it.

**Worked example.** MI-GAN and U²-Netp are saved. Deleting U²-Netp: `anyModelSaved("u2netp")` finds MI-GAN → the runtime stays. Deleting MI-GAN next: nothing else is saved → the runtime goes too (and the page says *Nothing is downloaded yet*).
