# AI models: the FOSS check

ZineNow is free software under the **GNU AGPL v3 or later** (`LICENSE`). The idea behind the licence choice, in the maintainer's words: everyone may use the work, change it, and even make money from it, but nobody may turn the community's work into closed source. Every AI model and library we add must fit that idea. This page is the checklist, and the decisions behind it.

## The FOSS check (all of these, for the exact file we download)

1. **An open-source licence for that exact model file.** Check the file or its original project, not just the family or a re-upload.
2. **Commercial use allowed.** A licence that stops anyone from profiting (non-commercial, research-only) also stops users of a fork or a business from using the tool, so it is refused.
3. **No use restrictions.** Licences that pass on a list of forbidden uses (the "Responsible AI" family: OpenRAIL, BigScience RAIL, ...) are not free software and are refused.
4. **Compatible with AGPL-3.0 for anything we copy into our code.** Permissive (MIT, BSD-2/3, Apache-2.0, ISC), MPL-2.0, LGPL, GPL-3.0 and AGPL-3.0 are fine. GPL-2.0-only code is not.
5. **Provenance written down:** the original project, who hosts the copy we download from (many files come from third-party re-uploads, which can state the wrong licence), and how we checked.
6. **A line in `THIRD-PARTY-NOTICES.md`** (which also credits the work ZineNow is based on: ZineArranger by Nash High, MIT) and the licence shown on Ai Tools (Local)'s Models page (name, a link to the licence text, who made it, how open it is, a link to the project).

## What is accepted and what is refused

| Accepted | Refused |
|---|---|
| Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0 | CC-BY-NC and any "non-commercial" or "research only" licence (BRIA RMBG, CodeFormer, NLLB, the Stability "turbo" models, Depth Anything V2 Base and Large, ...) |
| LGPL, GPL-3.0, AGPL-3.0 (for example Ultralytics YOLO is AGPL-3.0: compatible, and in the same spirit) | OpenRAIL / RAIL licences (Stable Diffusion 1.5, BLOOM, ...) |
| CC0, public domain, Unlicense | Custom "community" or "acceptable use" licences (Llama, Gemma, Stability community licence, ...) |
| CC-BY 4.0 for data and weights, with the attribution given (ask first) | No licence stated, or a licence that contradicts the project's own page |

Watch for **mixed licences inside one family**: Depth Anything V2 *Small* is Apache-2.0 but its Base and Large sizes are non-commercial; always check the exact file.

## How open does a model have to be? (decision, 2026-11-23)

- **"Open weights" under an OSI licence is allowed.** That means the trained model file is free to use, change and share under a real open licence, but the training data and the training recipe are not published, so nobody can rebuild it from scratch. (It is like a free program you may copy and modify, where you only receive the finished program for one part and not the material it was made from.) Most image models are like this.
- **"Fully open" is preferred** when quality is close: the model file, the training data and the training code are all public (for language models, for example AI2's OLMo and Hugging Face's SmolLM).
- **Prefer community-run projects** (OpenCV, Tesseract, Mozilla, the research groups that publish their code) over a company's "open weights" release when the choice is real, but this is not strict. When two models are about equal, the more open one wins.

The Models page labels every model as "open weights" or "fully open".

## Downloading is not bundling

The apps do not contain any model. The user's browser downloads each model (after a confirmation pop-up) from the host named in the pop-up and keeps it in its own storage. So a model's licence does not change our AGPL licence, and AGPL does not apply to the model. If we ever **re-host or bundle** a model, its redistribution terms start to apply: keep the copyright notice, include the licence text, and for Apache-2.0 the NOTICE file.

## Checklist when adding a model

- [ ] Found the original project and read the licence of the exact file (not a re-upload's card).
- [ ] The licence is in the accepted column, with no extra terms.
- [ ] Wrote down the host we download from and the original project.
- [ ] Added the facts to the model's definition (`shared/js/ai/*Model.js`: `licence`, `author`, `homepage`, `openness`) so the Models page shows them.
- [ ] Added a row to `THIRD-PARTY-NOTICES.md`.
- [ ] The download pop-up wording says what is downloaded and from where.

## The models in use (2026-11-23)

| Model | Used for | Licence | Made by | Open level | Downloaded from |
|---|---|---|---|---|---|
| MI-GAN | Remove object | MIT | Picsart AI Research | Open weights | huggingface.co/lxfater/inpaint-web (a re-upload) |
| U²-Netp | Remove background (General) | Apache-2.0 | Xuebin Qin et al. | Open weights | huggingface.co/edgetools/u2netp (a re-upload) |
| MODNet | Remove background (Portrait) | Apache-2.0 | Zhanghan Ke et al. | Open weights | huggingface.co/Xenova/modnet (a conversion) |
| YuNet | Face blur | MIT | Shiqi Yu et al. (OpenCV Zoo) | Open weights | huggingface.co/opencv/face_detection_yunet |
| MobileSAM | Click-to-select | Apache-2.0 | Chaoning Zhang et al. | Open weights | huggingface.co/Acly/MobileSAM (a conversion) |
| Real-ESRGAN general x4v3 | Upscale | BSD-3-Clause | Xintao Wang et al. | Open weights | huggingface.co/OwlMaster/AllFilesRope (a re-upload) |
| Tesseract language data | Text from image | Apache-2.0 | The Tesseract OCR project | Open weights | cdn.jsdelivr.net (npm package `@tesseract.js-data/<lang>`) |

Re-uploads and conversions are marked above. Their licences are taken from the original projects as I recall them; **re-check each against the original repository** when time allows (YuNet's licence in particular), and prefer the original author's own file if one exists.

## Decisions

- 2026-11-23, the maintainer: the licence stays AGPL-3.0-or-later; non-commercial, RAIL and custom licences are refused; open-weights models under an OSI licence are allowed, fully open ones are preferred; prefer FOSS developers when there is a real choice, but not strictly.
