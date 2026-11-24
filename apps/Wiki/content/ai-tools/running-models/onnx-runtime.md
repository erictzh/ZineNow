## Intro

**ONNX** (Open Neural Network Exchange) is a common file format for trained AI models. **ONNX Runtime Web** is a library that can run an ONNX model **inside a web page**. It has two ways to calculate: **WebGPU**, which uses the **graphics chip** (fast, if the device has a working one), and **WebAssembly (WASM)**, which uses the **processor** (works nearly everywhere, slower). This page shows how the apps choose and use them.

## How to use

You never choose directly: each tool picks what suits it. The Upscale tool has a *Run on* menu; Click-to-select's image reader uses the graphics chip when it works. The **Log** shows the backend that was really used (`gpu` or `cpu`) and the time per run, and the top of the log says whether WebGPU is available.

## How it works

### Loading the runtime

The runtime is a script from a CDN (pinned to one exact version, 1.31.1). It is loaded **once** by adding a `<script>` tag; later calls reuse the same Promise. If it cannot load (offline the first time) the error says *It needs the internet the first time*. After a download, a service worker keeps it so the app works offline.

### Choosing the chip

`navigator.gpu` exists in browsers with WebGPU; but a device may expose it yet have no usable adapter, so `requestAdapter()` is asked too. Creating a session with `executionProviders: ["webgpu"]` can still fail for models with operations WebGPU lacks; then the code **falls back** to `["wasm"]` automatically. Small models (face detection, background removal) go straight to the processor because compiling for the graphics chip would take longer than it saves.

### Threads

WASM can use several threads: `min(4, hardwareConcurrency || 2)`, i.e. up to 4, or 2 if the device does not say how many cores it has.

### Sessions

A **session** is a loaded model ready to run. They use a lot of memory, so each tool **creates it when first needed, keeps it while you work, and releases it after a quiet period** (one minute for most models, 90 s for MobileSAM, 2 minutes for the upscaler).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `loadOrt`, `gpuUsable`, `createSession`

```js file=shared/js/ai/runtime.js fn=loadOrt,gpuUsable,createSession
```

**The Logic:**
- `loadOrt`: `self.ort` is where the library puts itself when loaded; if it is there, answer at once with an already-finished Promise (`Promise.resolve`). Otherwise create the `<script>` once and remember its Promise in `ortPromise`; on error reset it to `null` so a later try can start again.
- `gpuUsable`: `navigator.gpu && await requestAdapter()` inside `try/catch`; any problem means `false`. `Boolean(...)` turns the result into true or false.
- `createSession(modelBytes, preferGpu)`: set the thread count, then if the graphics chip is wanted **and** usable, try `InferenceSession.create(bytes, { executionProviders: ["webgpu"] })`; the empty `catch` falls through. The default is WASM. It returns `{ session, backend }` so callers know what ran. `graphOptimizationLevel: "all"` lets the runtime simplify the model's graph before running.

**Worked example.** `numThreads`: 8 cores → **4**; 2 cores → **2**; 16 cores → **4**; unknown → **2**. On a phone without WebGPU: `createSession(bytes, true)` skips the GPU branch and returns `backend: "cpu"`. On a laptop whose graphics session fails to create: the `catch` runs, and the WASM session is returned.

### `runModel` and the tensors

```js file=shared/js/ai/runtime.js fn=runModel
```

**The Logic:** a **tensor** is a box of numbers with a shape. The input is `new ort.Tensor("float32", numbers, [1, 4, 512, 512])`: 32-bit decimals, one picture of four planes of 512 × 512 values. `session.run({ [name]: tensor })` takes an object whose key is the model's own input name (`session.inputNames[0]`); the square brackets make a key from a variable. The answer is an object by output name; `.data` is the flat list of numbers.

### A session that frees itself

```js file=shared/js/ai/session.js fn=releaseSession,touch,runOnSession
```

**The Logic:** `touch()` cancels the old timer and starts a new one that calls `releaseSession` after `IDLE_MS` (60 s): every use pushes the deadline back. `runOnSession` runs the model and, if the graphics chip throws an error, **retries once on the processor** with a new session built from the same bytes (`c.bytes` was kept for this).
