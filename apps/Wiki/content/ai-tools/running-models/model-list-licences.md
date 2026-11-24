## Intro

Every model the app can download is written down in **one table**, with the facts people deserve to know: who made it, its **licence**, how **open** it is, its size and where it is downloaded from. The same table feeds the **Models page**, the **download pop-ups** and the status shown in each tool. Behind it is a written **policy** about which models are allowed at all.

## How to use

On the **Models** page, each card shows: *Made by …*, *Licence* (a link to the licence text on spdx.org), whether it is **Open weights** or **Fully open**, and a **Project page** link. The links at the bottom give the **Source code**, **Third-party notices** and the **AI model policy**.

**The twelve models** (counting each OCR language):

| Model | Used by | Licence | Size |
|---|---|---|---|
| MI-GAN | Remove object | MIT | 28.2 MB |
| U²-Netp | Remove background (General) | Apache-2.0 | 4.4 MB |
| MODNet | Remove background (Portrait) | Apache-2.0 | 25 MB |
| YuNet | Face blur | MIT | 0.23 MB |
| MobileSAM | Click-to-select | Apache-2.0 | 44.7 MB (28.2 + 16.5) |
| Real-ESRGAN x4v3 | Upscale | BSD-3-Clause | 4.9 MB |
| Tesseract language data | Text from image | Apache-2.0 | 1.2 to 3 MB each (6 languages) |

Plus two shared engines: **ONNX Runtime Web** (MIT) and **Tesseract.js** (Apache-2.0, 4.1 MB).

## How it works

### Facts as data

Each model is a small object: `key`, `name`, `kind`, `label`, `mb`, `licence`, `host`, `repo`, `author`, `homepage`, `openness`, `url`, `about`. One list, `MODEL_ROWS`, turns them into rows `{ id, tool, model }`; the id (`fill`, `bg:u2netp`, `ocr:eng`…) is what the rest of the app uses. OCR languages are turned into the same shape by `ocrModel`. **Adding a model means adding its facts here**; the Models page and pop-ups then show it automatically.

### What "open" means

- **Open weights:** the trained model file is free to use, change and share under an open licence, but the training data and recipe are not published (like receiving a free finished program, not the material it was built from). Most image models.
- **Fully open:** the file, the training data and the training code are all public (preferred when quality is close).

### The policy (docs/AI-MODELS-POLICY.md)

ZineNow is **AGPL-3.0-or-later** free software, and a model must fit that spirit. For the exact file downloaded:
1. An open-source licence for that file (not just its family).
2. **Commercial use allowed** (non-commercial or research-only licences are refused).
3. **No use restrictions** (OpenRAIL-style "responsible AI" licences are refused).
4. Compatible with AGPL-3.0 for anything copied into the code.
5. **Provenance written down** (original project, who hosts the copy, how it was checked).
6. A line in `THIRD-PARTY-NOTICES.md` and the licence shown on the Models page.

**Accepted:** Apache-2.0, MIT, BSD-2/3-Clause, ISC, MPL-2.0, LGPL, GPL-3.0, AGPL-3.0, CC0, public domain. **Refused:** CC-BY-NC, OpenRAIL, custom "community" licences (such as Llama's), and anything with no licence stated. Watch for **mixed licences in one family** (for example one size of a model Apache-2.0 and its bigger sizes non-commercial).

### Downloading is not bundling

The apps contain **no model**; your browser downloads each one from the host named in the pop-up. So a model's licence does not change the app's own licence. Re-hosting a model would bring its redistribution terms into play.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The table and its helpers

```js file=shared/js/ai/modelList.js fn=FILL_MODEL
```

```js file=shared/js/ai/modelList.js
// { id, tool, model } rows for the Models page: id is "fill" or "bg:<key>".
export const MODEL_ROWS = [
  { id: "fill", tool: "Remove object", model: FILL_MODEL },
  ...BG_MODELS.map((m) => ({ id: "bg:" + m.key, tool: "Remove background", model: m })),
  { id: "face", tool: "Face blur", model: FACE_MODEL },
  { id: "sam", tool: "Click-to-select", model: SAM_MODEL },
  { id: "upscale", tool: "Upscale", model: UPSCALE_MODEL },
  ...OCR_LANGS.map((l) => ({ id: "ocr:" + l.code, tool: "Text from image", model: ocrModel(l) })),
];
```

**The Logic:** `...BG_MODELS.map(...)` spreads a list of rows built from the two background models into the main list. `"bg:" + m.key` makes the id. The OCR rows come from `OCR_LANGS.map(...)`.

**Worked example.** `MODEL_ROWS` has `1 + 2 + 1 + 1 + 1 + 6 =` **12** rows: fill, `bg:u2netp`, `bg:modnet`, face, sam, upscale and six `ocr:` languages.

### Licence links and openness

```js file=shared/js/ai/licences.js
export const licenceUrl = (spdx) => "https://spdx.org/licenses/" + encodeURIComponent(spdx) + ".html";
export const OPENNESS = {
  weights: "Open weights: the model file is free under this licence; the training data and recipe are not included",
  full: "Fully open: the model file, the training data and the training code are all public",
};
```

**The Logic:** `licenceUrl("Apache-2.0")` is `https://spdx.org/licenses/Apache-2.0.html`: **SPDX** is the standard list of licence identifiers. `encodeURIComponent` makes the name safe inside an address (a licence with a space or symbol would be encoded). The `OPENNESS` table holds the two sentences shown on the cards, picked by `m.openness` (defaulting to `weights`).

### An OCR language as a model

```js file=shared/js/ai/ocrLangs.js fn=ocrModel,ocrLangUrl
```

**The Logic:** a language is `{ code, name, mb }`; `ocrModel` fills in all the other facts the same way for every language: Apache-2.0, `cdn.jsdelivr.net`, the Tesseract project as author. `ocrLangUrl` builds the address of the data package for the language and the "best integer" data folder.

**Worked example.** `ocrLangUrl("eng")` → `https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int`. `ocrModel` for Malay gives `name: "Malay (Bahasa Melayu)"`, `mb: 1.18`, `label: "Malay (Bahasa Melayu) (Text reading)"`. Chinese (simplified) is `chi_sim`, 1.72 MB.
