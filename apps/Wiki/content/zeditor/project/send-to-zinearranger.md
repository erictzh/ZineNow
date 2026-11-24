## Intro

**Send to ZineArranger** exports your zine as a PDF and opens it in **ZineArranger** in a new tab, already loaded, with no saving and re-opening in between. ZineArranger is the tool that lays pages out onto printer sheets (imposition), so this is the shortcut from "finished pages" to "ready to print". Markdown to PDF has the same button.

## How to use

1. **Export → Send to ZineArranger.** (Needs at least one page.)
2. A new tab opens with ZineArranger, and a moment later your zine is loaded in it, exactly as if you had picked the exported PDF yourself. Its log says *Received "name.pdf" from ZEditor (n KB).*
3. If nothing opens, your browser blocked the new tab: **allow popups** for the site and try again. If ZineArranger takes more than 15 seconds to answer you get a message saying so.

## How it works

Two web pages can pass messages to each other with **`postMessage`**: one page calls `otherWindow.postMessage(data)`, and the other has a listener for `message` events. The challenge is **timing**: you can only send once the receiver is listening.

1. **Open the tab** (`window.open`). This must be the **first thing** in the click handler: browsers allow a new tab only straight after a click, and not after the program has waited for something else.
2. **Start listening** for the receiver's "ready" message *before* doing anything slow. Otherwise ZineArranger could finish loading and say "ready" while ZEditor is still busy making the PDF; nobody would hear it, since messages are not stored for listeners that do not exist yet.
3. **ZineArranger announces itself** every 500 ms, up to 15 times (about 7.5 s), as soon as it loads. A single message could be lost; repeating makes it reliable.
4. **Make the PDF** (the same function as [Export PDF](zeditor/project/export-pdf)) while the tab loads.
5. **Send the bytes.** The PDF's bytes are put in an `ArrayBuffer` (a block of raw bytes) and *transferred* (not copied: ownership moves, which is instant even for big files). The message also carries the file name.
6. **ZineArranger receives** it, wraps the bytes in a `File`, puts it into the page's own file chooser and fires its `change` event, so the normal loading path runs and nothing special needs to be maintained.

> **Tip** The message type is called `zeditor-handoff-pdf` for historical reasons, but ZineArranger does not check who sent it, which is why Markdown to PDF can use it too.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `sendPdfToZineArranger` (the sender)

```js file=shared/js/zineArrangerHandoff.js fn=sendPdfToZineArranger
```

**The Logic:**
- `window.open("../ZineArranger/index.html", "_blank")` opens a new tab (the path is relative to the app's own page, so both ZEditor and Markdown to PDF find it). It returns the new window, or `null` if blocked: the function throws a readable error.
- `readyPromise` is a **Promise** (a placeholder for something that happens later). Inside, `setTimeout` starts a 15-second countdown that rejects with the "didn't respond" error; `onMessage` checks that the message came from *that* window (`event.source !== win`) and is the right type, then cancels the timer, removes itself and resolves. `addEventListener("message", …)` registers the listener *immediately*, before any slow work.
- `buildBytes()` makes the PDF (a `Uint8Array`, a list of bytes). `pdfBytes.buffer.slice(offset, offset + length)` copies exactly this PDF's bytes into a fresh `ArrayBuffer` (the underlying buffer may be bigger than the array's view of it).
- `await readyPromise` waits for the greeting; then `postMessage({ type, buffer, filename }, "*", [buffer])` sends. The third argument lists what to **transfer**. `"*"` means any origin may receive; fine here because the message is only a PDF the user is deliberately sending.

**Worked example.** A 2-second PDF build and a ZineArranger that loads in 1 second: the tab opens at t = 0; it starts greeting at t ≈ 1 s (and again at 1.5 s, 2 s…); the listener is already attached, so the first greeting is heard and `readyPromise` resolves at t ≈ 1 s; the PDF finishes at t = 2 s; the send happens at t = 2 s. Had the listener been attached only after the PDF was built, greetings at 1, 1.5 s would have been lost — but the later ones (up to 7.5 s) would still rescue it. If the PDF took longer than 15 s after opening the tab, the timeout would fire first.

### `handleSendToZineArranger` (ZEditor's button)

```js file=apps/ZEditor/src/state/useExport.js fn=handleSendToZineArranger
```

**The Logic:** it refuses when there are no pages or an export is running (`exporting`) or a send is in progress (`sendingToArranger`, which also disables the menu item so a second click cannot open a second tab). It passes `buildBytes` (the PDF builder) and the file name from the title, and turns any failure into an on-screen message.

### `setUpZEditorHandoff` (the receiver)

```js file=apps/ZineArranger/src/main.js
(function setUpZEditorHandoff() {
    function receivePdf(file) {
        var input = document.getElementById("selector");
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    window.addEventListener("message", function (event) {
        var data = event.data;
        if (!data || data.type !== HANDOFF_PDF_MESSAGE || !(data.buffer instanceof ArrayBuffer)) return;
        var file = new File([data.buffer], data.filename || "zine.pdf", { type: "application/pdf" });
        receivePdf(file);
        logSys("Received \"" + file.name + "\" from ZEditor (" + Math.round(file.size / 1024) + " KB).");
    });

    if (window.opener) {
        // Repeated rather than a single fire-and-forget ping: ZEditor
        // attaches its listener before doing anything else, so in
        // principle one ping right away is enough — but postMessage
        // doesn't queue for a listener that isn't there yet, so if
        // anything on either side delays that attachment, a single
        // ping arriving in the gap would be lost for good with no way
        // to recover. Repeating for a few seconds costs nothing (the
        // listener on the other end just resolves once and detaches)
        // and removes the failure mode entirely.
        var pingCount = 0;
        var pingInterval = setInterval(function () {
            pingCount++;
            try {
                window.opener.postMessage({ type: ARRANGER_READY_MESSAGE }, "*");
            } catch (err) {
                clearInterval(pingInterval); // opener gone or unreachable — this tab still works standalone
            }
            if (pingCount >= 15) clearInterval(pingInterval); // ~7.5s at 500ms apart
        }, 500);
    }
})();
```

**The Logic:** it is wrapped in `(function … )()`, a function that runs at once and keeps its names private. `receivePdf` builds a `DataTransfer` (the object a browser uses for drag-and-drop), adds the file, assigns it to the file input's `files`, and dispatches a `change` event: from that moment ZineArranger behaves as if the user had picked the file. The `message` listener ignores anything that is not the right type or has no `ArrayBuffer`, builds the `File` (with the name, or `zine.pdf`), and logs its size in kilobytes (`Math.round(size / 1024)`). If this tab has an `opener` (the tab that opened it), an interval sends the "ready" message every 500 ms, giving up after 15 tries or when the opener is gone; opened on its own, it simply works as normal.

**Worked example.** A 1,310,720-byte PDF arrives: the log says `Received "Issue 3.pdf" from ZEditor (1280 KB).` (1,310,720 ÷ 1024 = 1280).
