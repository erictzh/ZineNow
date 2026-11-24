## Intro

Three tools can pass work to each other **without saving and re-opening files**: ZEditor and Markdown to PDF send a **PDF** to ZineArranger, and ZEditor and Ai Tools (Local) send **pictures** both ways. They do it with `postMessage`, the browser's way for one window to send data to another. This page is the whole protocol in one place.

## How to use

| From | To | Button | Sends |
|---|---|---|---|
| ZEditor, Markdown to PDF | ZineArranger | **Send to ZineArranger** | the exported PDF |
| ZEditor | Ai Tools (Local) | **Open in Ai Tools (remove objects)** (Image panel, on an image layer) | the layer's picture |
| Ai Tools (Local) | ZEditor | **Send to ZEditor** / **Send back to ZEditor** | the edited picture |
Allow pop-ups if the browser asks: each starts by opening the other app in a new tab.

## How it works

### The handshake (both protocols)

1. **Sender** opens the other app (`window.open`) as the *first* thing in the click handler (browsers allow tabs only straight after a click).
2. Sender **starts listening** for a "ready" message *before* doing slow work (messages are not kept for listeners that do not exist yet).
3. **Receiver** announces ready every 500 ms (PDF: 15 times; pictures: up to 40 times = 20 s), because a single message could be lost if the sender was not listening yet.
4. Sender makes the file, turns it into an `ArrayBuffer` and posts it, with the buffer in the **transfer list** (moved, not copied).
5. Receiver wraps it in a `File` and treats it as if the user had chosen it.

### Messages

| Message `type` | Direction | Payload |
|---|---|---|
| `zinearranger-ready` | ZineArranger → opener | none |
| `zeditor-handoff-pdf` | sender → ZineArranger | `{ buffer, filename }` |
| `zeditor-ready` | ZEditor → opener | none |
| `aitools-ready` | Ai Tools → opener | none |
| `zinenow-handoff-image` | either way | `{ buffer, filename, mime, meta }` |

### Security

- **PDF to ZineArranger** uses target origin `"*"` and does not check who sent it (the name `zeditor-handoff-pdf` is historic). That is why Markdown to PDF can use it, and why only a PDF the user deliberately sends is handled (loading it is exactly as if the user had picked it).
- **Pictures** are restricted to the **same origin**: both the ready message and the picture are sent with `location.origin` as the target, and every receiver rejects a message whose `event.origin` differs. A page on another website cannot inject a picture.
- **`meta`** is plain data that travels with the picture and returns unchanged; ZEditor stores a layer's page and box in it so the result lands in the same place.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The message names

```js file=shared/js/imageHandoff.js
export const HANDOFF_IMAGE_MESSAGE = "zinenow-handoff-image";

export async function sendImageToApp(path, readyType, getBlob, filename, meta) {
  const win = window.open(path, "_blank");
  if (!win) throw new Error("The browser blocked the new tab. Allow pop-ups for this page and try again.");
  // listen BEFORE any other await: the other app can be ready before the picture is
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { window.removeEventListener("message", onMessage); reject(new Error("The other app didn't answer. It may still be loading: try again in a moment.")); }, 20000);
```

```js file=shared/js/zineArrangerHandoff.js
// ZineArranger -> opener, repeated every 500ms for a few seconds once it has loaded.
export const ARRANGER_READY_MESSAGE = "zinearranger-ready";
// Sender -> ZineArranger: { type, buffer (ArrayBuffer, transferred), filename }.
// Named after ZEditor, but ZineArranger does not check who sent it.
export const HANDOFF_PDF_MESSAGE = "zeditor-handoff-pdf";
```

**The Logic:** constants are used instead of typing the names each time, so a typo becomes an error (an undefined name) instead of a silent mismatch. A short comment above each describes the payload.

### Receiving: `listenForHandoffImage`

```js file=shared/js/imageHandoff.js fn=listenForHandoffImage
```

**The Logic:** the `message` listener validates everything before trusting it: right origin (`e.origin !== location.origin` is rejected), right `type`, and a real `ArrayBuffer` payload. It then stops announcing, builds a `File` (defaults for missing name and type) and calls the app. `e.source === window.opener` tells the app whether the sender is the tab that opened it (so the button can say "Send back"). The announce loop `setInterval(send, 500)` stops after 40 tries or on the first picture; an error from a closed opener is swallowed.

**Worked example (timeline).** You press *Send to ZEditor* in Ai Tools. t = 0: the tab opens, Ai Tools listens for `zeditor-ready`. t = 0.4 s: ZEditor loads and announces (and again at 0.9 s, 1.4 s…). t = 0.5 s: Ai Tools hears it (resolves its `ready` promise), has meanwhile turned the PNG into bytes, and posts `zinenow-handoff-image` with `meta`. ZEditor stops announcing, adds the picture as a new layer. If ZEditor takes more than 20 s the sender gives up: *The other app didn't answer. It may still be loading: try again in a moment.*
