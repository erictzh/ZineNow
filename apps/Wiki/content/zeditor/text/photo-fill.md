## Intro

**Photo fill** shows a photo **through the letters**: the letters are cut-out windows onto the picture. It is a classic poster look. Lower the photo's opacity to let the text colour or gradient show through.

## How to use

In the Text panel (above the effects), the **Photo fill** section:
- Switch it on: a file chooser asks for the photo. Switch off to remove it. **Change photo…** picks another.
- **Photo scale (%)**, 20–400, default 100: at 100% the photo just **covers** the text area.
- **Photo X / Y (%)**, −100 to 100: move the photo, in percent of the text area's size (0 = centred).
- **Photo opacity (%)**: below 100, the box's colour or gradient shows underneath the faded photo.
- Big, bold letters work best. The text stays editable.

## How it works

### Read once, shrink, store

A chosen photo is loaded, **downscaled to at most 2000 pixels** on its long side, and stored inside the text box (as a *data URL*, the picture written out as text), so it travels with the project. Shrinking matters: a 12-megapixel phone photo seen only through letters would bloat the file for no visible gain. PNG files stay PNG (they may be transparent); everything else becomes JPEG at 92% quality.

### "Cover" placement

`photoPlacement` is the same idea as CSS's `object-fit: cover`: scale the photo by the **larger** of (area width ÷ photo width) and (area height ÷ photo height), so that it fills the area completely with nothing left blank, cropping what overflows. The scale slider multiplies that, and X and Y shift by a percent of the area.

### Cutting the letters out: compositing

The text is drawn **solid black** on a separate off-screen layer. Then the canvas is told to use the blend rule `source-in`: *the next thing drawn only appears where something already is, and takes the alpha of what is there*. The photo is then drawn on the layer, and it shows only inside the letters. Finally the layer is copied onto the page. This is **alpha compositing** (the Porter-Duff "source-in" operator).

### A faded photo

With photo opacity below 100%, the photo is drawn with `globalAlpha`. Then the layer's rule is switched to `destination-over` (*draw behind what is already there*) and the letters are drawn again in the text colour or gradient: they show through the faded photo, not the white page.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `readPhotoFile`

```js file=apps/ZEditor/src/io/images.js fn=readPhotoFile
```

**The Logic:**
- It returns a **Promise**: a value that arrives later. `new Promise((resolve, reject) => {...})` runs the work; `resolve(value)` reports success, `reject(error)` failure. The caller uses `await`.
- A `FileReader` reads the file as a **data URL**. When loaded (`onload`), an `Image` decodes it (`img.src = reader.result`).
- `shrink = Math.min(1, 2000 / Math.max(naturalWidth, naturalHeight))`: 1 for small photos (never enlarge), less than 1 for big ones. `Math.round` and `Math.max(1, …)` give whole-pixel sizes of at least 1.
- The image is drawn onto a canvas of that size, and `canvas.toDataURL(type, 0.92)` writes it back out.

**Worked example.** A 4000 × 3000 photo: `shrink = min(1, 2000 / 4000) = 0.5`, so it is stored as **2000 × 1500**. A 1200 × 800 photo: `min(1, 2000 / 1200) = 1`: unchanged.

### `photoPlacement`

```js file=apps/ZEditor/src/model/text/textLook.js fn=photoPlacement
```

**The Logic:** `w`, `h` are the text area; `photo.natW/natH` the photo's pixel size. `cover = max(w / natW, h / natH) × fillScale / 100` is the scale factor. The photo's drawn size is `natW × cover` by `natH × cover`. `left = (w − photoW) / 2 + fillX / 100 × w`: centre it (half the difference), then shift by X percent of the area's width; `top` the same vertically.

**Worked example.** A 2000 × 1000 photo, a text area of 300 × 100:
- Scale 100%: `cover = max(300 / 2000, 100 / 1000) = max(0.15, 0.1) = 0.15`. The photo is **300 × 150**; `left = 0`, `top = (100 − 150) / 2 = −25`. It fills the width exactly, and 25 px of its top and bottom stick out and are hidden.
- Scale 200%, X = 25%: `cover = 0.3`: **600 × 300**; `left = (300 − 600) / 2 + 0.25 × 300 = −75`; `top = (100 − 300) / 2 = −100`.

### Drawing through the letters (inside `drawTextOnCanvas`)

```js file=apps/ZEditor/src/render/drawText.js
      lctx.fillStyle = "#000";
      runs.forEach((run) => { if (!run.color) withRun(lctx, run, () => lctx.fillText(run.text, run.x, run.baselineY)); });
      lctx.globalCompositeOperation = "source-in";
      if (photoImg) {
        const place = photoPlacement(look.photo, innerWidth / scaleFactor, textHeight / scaleFactor);
        lctx.globalAlpha = look.photo.fillPhotoAlpha / 100;
        lctx.drawImage(photoImg, x + padX + place.left * scaleFactor, y + padY + place.top * scaleFactor, place.width * scaleFactor, place.height * scaleFactor);
```

**The Logic:** `lctx` is the layer's drawing context. The first two lines draw every run (piece of text) in solid black onto the empty layer (runs with their **own** colour are skipped here, they are painted afterwards in that colour). Then `globalCompositeOperation = "source-in"` switches the rule. `photoPlacement` is asked in editor units (the sizes are divided by `scaleFactor`), and the result multiplied back by `scaleFactor` for the canvas's resolution, so screen and export agree. `globalAlpha` makes the photo semi-transparent when its opacity is below 100. `drawImage` then paints it, appearing only inside the black letters.

**Worked example.** Alpha of one pixel after drawing: inside a letter the layer has alpha 255 (black); the photo pixel has alpha 255; `source-in` gives the photo's colour at alpha 255 × 255 / 255: **visible**. Outside a letter the layer has alpha 0: the result alpha is 0: **nothing**. At a letter's smooth edge (layer alpha 128) the result alpha is 128: a smooth edge.
