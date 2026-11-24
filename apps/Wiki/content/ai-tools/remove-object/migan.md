## Intro

**Remove object** (Ai Tools) lets you paint over something unwanted (a person in the background, a sign, a blemish) and replaces it with what the AI thinks belongs there. The model is **MI-GAN**, a small image-filling network (MIT licence, 28.2 MB). Nothing is uploaded.

## How to use

1. **Download the model** the first time (the box at the bottom of the panel; see [Dialogs](ai-tools/hub/dialogs)).
2. **Mark what to remove:** **Brush** (paint), **Erase mark** (rub out part of the marks), **Box** (drag a rectangle) or **Move** (pan). Set **Brush size** (px). Keys: **[** makes the brush smaller and **]** bigger. A ring shows the brush size. Two fingers always move and zoom the picture.
3. **Grow the marked area by (px)** (default 6): a few extra pixels cover shadows and fuzzy edges.
4. Press **Remove object** (or **Enter**). Status shows the time. Not right? **Try another** ([next page](ai-tools/remove-object/try-another)), **Undo**, or mark a little differently.
5. Marks that are far apart are filled one after another (up to 12 separate areas); an area that is too big for the model says so. **Clear marks** removes all marks. Selections made by [Click-to-select](ai-tools/click-to-select) can be sent here as the marks.

## How it works

1. **Marks are a hidden layer.** Painting draws on a transparent overlay canvas; "marked" simply means a pixel whose opacity is at least 64 out of 255.
2. **Grow** makes the marked area bigger by *g* pixels in every direction (`dilate`).
3. **Cut a window.** The model only handles a **512 × 512** square. A square window around the marked area (at least 1.5 times its size, and never below 512) is cut out, shrunk or enlarged to 512, and given to the model with the marked part blanked.
4. **The model answers** with a complete 512 × 512 picture.
5. **Paste back** only where you marked, with a soft 3 px edge so the join does not show. Everything outside the window is untouched.
6. **Undo safety:** a snapshot is taken first; if anything fails, the picture is restored and the error is shown.

The window maths, mask handling and the model session are the same code ZEditor's AI fill uses, and are explained in detail in [Remove and fill with AI](zeditor/eraser-marquee/remove-and-fill-ai). This page covers the tool around it.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Reading and painting the marks

```js file=apps/AiToolsLocal/src/tools/removeObject.js
    const markedPixels = () => {
      const d = maskX.getImageData(0, 0, maskC.width, maskC.height).data;
      const m = new Uint8Array(maskC.width * maskC.height);
      for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 64 ? 1 : 0;
      return m;
    };
```

```js file=apps/AiToolsLocal/src/tools/removeObject.js
    function paintLine(a, b) {
      maskX.save();
      maskX.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
      maskX.strokeStyle = maskX.fillStyle = "#e8622a"; maskX.lineCap = maskX.lineJoin = "round";
      maskX.lineWidth = settings.brush;
      maskX.beginPath(); maskX.moveTo(a.x, a.y); maskX.lineTo(b.x + 0.01, b.y); maskX.stroke();
      maskX.restore();
    }
```

**The Logic:** `getImageData` returns four numbers per pixel (red, green, blue, **alpha**). `markedPixels` creates a flat list `m` with one slot per pixel (`Uint8Array`, a list of small whole numbers) and puts a 1 where alpha is at least 64: `d[i * 4 + 3]` is the alpha of pixel `i` (the 4th number of its group of 4). `paintLine` draws a thick round-capped line from the last pointer position to the new one; **Erase mark** uses the drawing mode `destination-out`, which *removes* what is already drawn instead of adding. `b.x + 0.01` makes a single click draw a dot (a zero-length line would draw nothing).

**Worked example.** A pixel with alpha 63 is *not* marked and one with alpha 64 is, so the soft, semi-transparent fringe of a brush stroke is treated as marked only from about a quarter opacity upwards. A brush of size 40 at a zoom of 0.5 shows a ring of `40 × 0.5 =` **20** screen pixels.

### Boxes and the pointer

```js file=apps/AiToolsLocal/src/tools/removeObject.js
    const handler = {
      down(pt, e) {
        if (tool === "pan") stroke = { kind: "pan", sx: e.clientX, sy: e.clientY, v: picture.view };
        else if (tool === "box") stroke = { kind: "box", a: pt, b: pt };
        else { stroke = { kind: "paint", last: pt }; paintLine(pt, pt); }
      },
      move(pt, e) {
        if (!stroke) return;
        if (stroke.kind === "pan") picture.setView({ ...stroke.v, x: stroke.v.x + e.clientX - stroke.sx, y: stroke.v.y + e.clientY - stroke.sy });
        else if (stroke.kind === "paint") { paintLine(stroke.last, pt); stroke.last = pt; }
        else if (stroke.kind === "box") {
          stroke.b = pt; draftX.clearRect(0, 0, draftC.width, draftC.height);
          const s = picture.view.s;
          draftX.strokeStyle = "#ffffff"; draftX.setLineDash([8 / s, 6 / s]); draftX.lineWidth = 2 / s;
          draftX.strokeRect(stroke.a.x, stroke.a.y, pt.x - stroke.a.x, pt.y - stroke.a.y);
        }
      },
      up() {
        if (stroke && stroke.kind === "box") {
          draftX.clearRect(0, 0, draftC.width, draftC.height);
          maskX.fillStyle = "#e8622a"; maskX.fillRect(Math.min(stroke.a.x, stroke.b.x), Math.min(stroke.a.y, stroke.b.y), Math.abs(stroke.b.x - stroke.a.x), Math.abs(stroke.b.y - stroke.a.y));
        }
        stroke = null;
      },
      cancel() { draftX.clearRect(0, 0, draftC.width, draftC.height); stroke = null; },
    };
```

**The Logic:** one handler object for the picture's single-pointer gestures ([Picture handling](ai-tools/hub/picture-handling)). `down` starts a pan, a box or a paint stroke according to the chosen tool; `move` continues it; for a box it clears and redraws a dashed **draft** rectangle (line widths are divided by the zoom `s` so they look the same at any zoom); `up` turns a finished box into marks with `fillRect` (`Math.min` and `Math.abs` make it work whichever corner you dragged from).

### The fill

```js file=apps/AiToolsLocal/src/tools/removeObject.js
    async function runFill(marked, variation) {
      const w = picture.width, h = picture.height;
      const grow = Math.max(0, Math.round(settings.grow));
      picture.setBusy(true);
      const t0 = performance.now();
      let before = null;
      try {
        before = await picture.snapshot();
        ctx.status("Removing it…");
        await new Promise((r) => setTimeout(r, 30)); // let the message show
        const ok = await aiFillMask(picture.ctx, (extra) => dilate(marked, w, h, grow + extra), variation, (t) => ctx.status(t));
        if (!ok) { before.close(); ctx.status("Paint over the object first (Brush or Box), then press Remove object.", "bad"); return; }
        picture.commit(before); before = null;
        clearMarks();
        last = { marked, variation, depth: picture.depth };
        ctx.status("Done in " + ((performance.now() - t0) / 1000).toFixed(1) + " s" + (variation ? " (variation " + variation + ")" : "") + ". Not right? Try another, Undo, or mark a bit differently.", "ok");
      } catch (e) {
        if (before) { picture.ctx.clearRect(0, 0, w, h); picture.ctx.drawImage(before, 0, 0); before.close(); } // put the picture back as it was
        ctx.status("Something went wrong: " + (e && e.message ? e.message : e) + " The picture was left as it was.", "bad");
      } finally { picture.setBusy(false); }
    }
```

**The Logic:** the picture is told it is **busy** (buttons grey out). A `before` snapshot is taken. After a 30 ms pause (`setTimeout`, so the message "Removing it…" can appear before the heavy work freezes the screen) it calls `aiFillMask`, giving it a function that builds the grown mask: `dilate(marked, w, h, grow + extra)`, where `extra` is the "Try another" growth. `aiFillMask` returns `false` if nothing was marked. On success the snapshot becomes an undo step (`commit`), the marks are cleared, and `last` is remembered for Try another. On an error the old picture is drawn back from the snapshot. `finally` always releases the busy state.

**Worked example.** Marks cover a 120 × 80 px area in a 1600 × 1200 picture. With the default grow of 6 the area becomes about 132 × 92. The window is `max(512, ceil(132 × 1.5) = 198) = 512` pixels square (no scaling at all), centred on the area and kept inside the picture.

### Starting

```js file=apps/AiToolsLocal/src/tools/removeObject.js
    function removeObject() {
      if (picture.busy || !picture.loaded) return;
      if (ctl.state.phase !== "ready") { ctx.status("Download the model first (below).", "bad"); return; }
      const marked = markedPixels();
      if (!holeBounds(marked, picture.width, picture.height)) { ctx.status("Paint over the object first (Brush or Box), then press Remove object.", "bad"); return; }
      runFill(marked, 0);
    }
```

**The Logic:** it does nothing while busy or with no picture; asks to download the model first if its phase is not `ready`; and checks with `holeBounds` (the box round every marked pixel, or `null`) that something is marked, before calling `runFill(marked, 0)` (variation 0 = the normal fill).

### The brush keys

```js file=apps/AiToolsLocal/src/tools/removeObject.js
      onKey(e) {
        if (e.key !== "[" && e.key !== "]") return false;
        const v = Math.min(400, Math.max(1, Math.round(settings.brush * (e.key === "]" ? 1.2 : 1 / 1.2) + (e.key === "]" ? 1 : -1))));
        settings.brush = v; if (ui.brush) ui.brush.value = v; save();
        return true;
      },
```

**The Logic:** `]` multiplies the size by 1.2 and adds 1, `[` divides by 1.2 and subtracts 1 (so small sizes still change), then the value is rounded and limited to 1 to 400. Returning `true` tells the shell the key was used ([Shell and tool registry](ai-tools/hub/shell-registry)).

**Worked example.** From 40: `]` gives `round(40 × 1.2 + 1) =` **49**; `[` gives `round(40 / 1.2 − 1) = round(32.33) =` **32**. From 1: `[` gives `max(1, …)`, so it stays 1.
