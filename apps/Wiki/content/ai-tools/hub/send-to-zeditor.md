## Intro

**Send to ZEditor** moves the picture you are working on from Ai Tools (Local) into ZEditor as a **new layer**. It also works the other way round: ZEditor's **Open in Ai Tools** sends a picture here, and the button then changes to **Send back to ZEditor**, which returns the result to the **same ZEditor tab** and the same place in the document. Both apps are on the same website, so they can talk directly.

## How to use

- Click **Send to ZEditor** (top bar). ZEditor opens in a new tab with the picture as a new layer. Allow pop-ups if the browser asks.
- If the picture came **from ZEditor** (you chose Open in Ai Tools there), the button says **Send back to ZEditor** and the result goes back to the tab it came from, positioned where the original layer was.
- If the other tab has been closed, you get *The app that opened this one has been closed*, and the normal Send to ZEditor can be used instead.
- Another app's tab never needs to be refreshed: messages carry the picture bytes.

## How it works

This is the same handshake as [Send to ZineArranger](zeditor/project/send-to-zinearranger), with three changes: it works **both ways**, it carries a little **extra data** (`meta`) that is handed back unchanged, and it is **restricted to the same website** (**origin**: scheme + host + port).

1. The sender opens the other app (`window.open`) **first thing** in the click.
2. The sender listens for a "ready" message **before** doing anything slow, because messages are not kept for listeners that do not exist yet.
3. The receiver announces *ready* every 500 ms for up to 20 s, until the first picture arrives.
4. The sender prepares the PNG, turns it into an `ArrayBuffer` (raw bytes) and **transfers** it with `postMessage` (moved, not copied).
5. The receiver wraps the bytes in a `File` and treats it as if you had opened it.

**`meta`:** ZEditor stores the layer's page and box in it. The result carries it back, so the new layer lands exactly where the original was.

**Security:** both sides check that `event.origin` equals their own `location.origin`, and the sender names `location.origin` as the **target** of `postMessage`, so only a page of the same site can receive or send pictures.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `sendImageToApp`

```js file=shared/js/imageHandoff.js fn=sendImageToApp
```

**The Logic:** `window.open(path, "_blank")` returns the new window or `null` if blocked. `ready` is a Promise with a 20-second timeout that rejects; its `onMessage` accepts only a message **from that window** (`e.source !== win`), **from our own origin**, of the right type. `getBlob()` makes the picture; the result may be a plain Blob or `{ blob, meta }`. `blob.arrayBuffer()` gives the bytes. After `await ready`, `win.postMessage(message, location.origin, [buffer])` sends the message, with the buffer in the **transfer list**.

### `hasOpener`, `sendImageToOpener`, `listenForHandoffImage`

```js file=shared/js/imageHandoff.js fn=hasOpener,sendImageToOpener,listenForHandoffImage
```

**The Logic:** `window.opener` is the tab that opened this one; it must exist, be a different window, not be closed, and be on the same origin (reading `.location.origin` of a different site throws an error, hence the `try/catch` returning `false`). `listenForHandoffImage` registers a `message` listener, and if there is an opener it **pings** every 500 ms; `++n > 40` stops after 40 tries (20 s). When a picture arrives, pinging stops and `onImage(file, fromOpener, meta)` is called (`e.source === window.opener` tells the app whether the sender is the tab that opened it).

**Worked example.** ZEditor opens Ai Tools with a layer; Ai Tools pings at 0.0, 0.5, 1.0 s…; ZEditor, listening already, replies with the PNG at 1.2 s; pinging stops after the first picture. The button text changes to *Send back to ZEditor* since `fromOpener` is true. You remove an object and press it: `sendImageToOpener` posts the new PNG with the same `meta` to the opener tab, and ZEditor puts it back where the layer was. If instead you opened Ai Tools by itself, the button sends to a **new** ZEditor tab.

### The button's handler

```js file=apps/AiToolsLocal/src/main.js
$("send").addEventListener("click", async () => {
  if (!picture.loaded) return;
  try {
    // a picture that came from ZEditor goes back to that same tab (as a new layer in its document); otherwise ZEditor opens in a new tab
    if (cameFromZEditor && hasOpener()) { await sendImageToOpener(picture.toBlob, picture.name + "-edited.png", handoffMeta); status("Sent back to ZEditor: a new layer in the document it came from.", "ok"); return; }
    status("Opening ZEditor…");
    await sendImageToZEditor(picture.toBlob, picture.name + "-edited.png"); status("Sent to ZEditor (it opened in a new tab).", "ok");
  } catch (e) { status("Couldn't send it: " + (e && e.message ? e.message : e), "bad"); }
});
```

**The Logic:** `picture.toBlob` is passed as a **function** (not called yet): the sender calls it when it is ready, after opening the tab. The file name is `name-edited.png`. A thrown error becomes a red status message.
