## Intro

**Text from image** reads the text in a picture (or in an area you draw) and gives it to you as editable text you can **copy** or **save as .txt**. It uses **Tesseract**, a famous open-source text-recognition engine (Apache-2.0), running as **Tesseract.js** in your browser, so the picture never leaves your device. This is called **OCR**: optical character recognition.

## How to use

1. Pick the **Language** (English, Malay, Indonesian, Chinese simplified or traditional, Tamil) and download its small language file the first time (1 to 3 MB, plus the 4 MB reader the first time).
2. Pick **How the page is laid out**: *Automatic* (a normal page), *Scattered text* (signs, posters, zine pages), *One block of text*, or *One line*.
3. *(Optional)* **Read only an area (draw a box)**. **Read text.**
4. The words found are boxed on the picture, **coloured by confidence**: green = sure (80% or more), yellow = unsure (55 to 79), red = very unsure. The status line gives the average confidence and the word count.
5. Fix mistakes in the text box, then **Copy text** or **Save as .txt**. Untick *Show the words found* to hide the boxes.
- Works best on **clean printed text**; handwriting and decorative fonts read poorly. No text found? Try another layout, or draw a box.

## How it works

### Page layout modes (PSM)

Tesseract first has to find the text blocks. Its **page segmentation mode** (PSM) tells it what to expect: `3` automatic, `11` sparse scattered text, `6` one block, `7` one line. A wrong mode on a poster can give nothing at all.

### Downloading

Tesseract.js's own code loads from a CDN; the language file is "trained data" (`eng.traineddata`, the "best, integer" version) from an npm package. Tesseract.js keeps the language file itself in the browser's database (**IndexedDB**) under a key like `./eng.traineddata`; the app keeps a small flag in `localStorage` for "reader code saved". Progress is read from the reader's own log messages: first the **core** (the engine), then the **language**.

### Reading

A **worker** (a background thread) per language is started once, kept for a minute, and reused. For each run the page-layout mode is set, then `recognize(canvas)` returns the text, an overall **confidence** (0 to 100), and a list of words, each with its own confidence and **bounding box** (x0, y0, x1, y1 in the picture).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `recognizeText`

```js file=shared/js/ai/ocr.js fn=recognizeText,makeWorker
```

**The Logic:** it first checks the language is saved, else throws *… is not downloaded*. `workers` is a `Map` from language code to a worker (or the Promise while it starts), so a second click never starts another. `await workers.get(lang)` waits for it. `setParameters({ tessedit_pageseg_mode: String(psm) })` picks the layout mode. The result is trimmed, and words with empty text are filtered out (`.filter(w => w.text && w.text.trim())`). `makeWorker` calls `Tesseract.createWorker(language, 1, { workerPath, corePath, langPath, logger })` with the three CDN addresses.

### Is a language saved? Downloading it

```js file=shared/js/ai/ocr.js fn=idb,ocrLangSaved,downloadOcr
```

**The Logic:** `idb(fn)` opens IndexedDB (a database inside the browser) called `keyval-store` and runs `fn` on it, always closing it afterwards; any failure resolves to `null` rather than throwing. `ocrLangSaved` asks the object store `keyval` whether the key `./<code>.traineddata` exists (`getKey` returns `undefined` if not). `downloadOcr` works out the total (the reader's 4.1 MB, unless already saved, plus the language's size) and **starts a worker once** (that is what fetches and stores everything), mapping its progress messages (`core`, `language`, `initializing`) onto a single 0 to total MB bar; then it terminates the worker and sets the flag. Cancelling is checked at the end (`aborted`): the files that had already arrived are kept.

**Worked example.** English (2.95 MB) with no reader yet: total `4.1 + 2.95 = 7.05` MB. Halfway through the language file, the bar reads `4.1 + 0.5 × 2.95 =` **5.575** MB of 7.05. With the reader already saved, the total is just 2.95.

### Deleting

```js file=shared/js/ai/ocr.js fn=deleteOcrLang,deleteEngineFiles
```

**The Logic:** it stops the workers, deletes that language's key from IndexedDB, then checks whether **any other language** is still saved (`ocrLangSaved`); only if none is left does it remove the reader's own cached files (every cached request whose address matches `/tesseract/i`) and clear the flag.

### Confidence colours

```js file=apps/AiToolsLocal/src/tools/ocr.js
export const confColor = (c) => (c >= 80 ? "#3fd26f" : c >= 55 ? "#f2c94c" : "#ff5a5a");
```

**The Logic:** a chain of conditions: 80 or more green, 55 or more yellow, otherwise red.

**Worked example.** `confColor(95)` → green `#3fd26f`; `confColor(60)` → yellow `#f2c94c`; `confColor(30)` → red `#ff5a5a`. A word with `bbox { x0: 10, y0: 20, x1: 90, y1: 50 }` read from an area starting at `(100, 200)` is drawn at `x = 100 + 10 = 110`, `y = 200 + 20 = 220`, width `80`, height `30`: the area's offset is added because the reader only sees the cropped area.
