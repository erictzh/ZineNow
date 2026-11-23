# Third-party notices

ZineNow itself is licensed under the **GNU AGPL v3 or later** (see `LICENSE`). It uses the free software and models below, each under its own licence. Rules for adding AI models: `docs/AI-MODELS-POLICY.md`.

Licences of the libraries were read from each package's own metadata or licence file (version as pinned in the apps). The AI-model rows come from the original projects as remembered, with the exact download source listed; they should be re-checked against the original repositories (see the policy).

## Software this project is based on

| Work | Used in | Licence | Made by | Project |
|---|---|---|---|---|
| **Zine Arranger** | ZineArranger (ZineNow's version of it, with changes and additions under the AGPL) | MIT | **Nash High** (copyright 2024) | https://codeberg.org/nashhigh/zine-arranger (also https://nashhigh.itch.io/zinearranger) |

Nash High's copyright and MIT licence notice must stay with any copy of ZineArranger or substantial parts of it: it is kept in `apps/ZineArranger/LICENSE`, his original README is kept in `apps/ZineArranger/README.md`, and the app says "Originally by Nash High" (the ⓘ next to the title). Thank you, Nash High.

## Ideas and algorithms (written from the papers, no code copied)

- ZEditor's "Remove & fill" (smooth, detailed and pattern fills) uses the ideas of fast-marching image inpainting (A. Telea, 2004) and exemplar-based inpainting (A. Criminisi, P. Pérez, K. Toyama, 2004).

## AI models (downloaded by the user's browser when they choose to; not part of this repository)

| Model | Used in | Licence | Made by | Project | Downloaded from |
|---|---|---|---|---|---|
| MI-GAN | Ai Tools (Local): Remove object; ZEditor: AI fill | MIT | Picsart AI Research | https://github.com/Picsart-AI-Research/MI-GAN | huggingface.co/lxfater/inpaint-web |
| U²-Netp | Ai Tools (Local) and ZEditor: Remove background | Apache-2.0 | Xuebin Qin et al. | https://github.com/xuebinqin/U-2-Net | huggingface.co/edgetools/u2netp |
| MODNet | same | Apache-2.0 | Zhanghan Ke et al. | https://github.com/ZHKKKe/MODNet | huggingface.co/Xenova/modnet |
| YuNet | Ai Tools (Local): Face blur | MIT | Shiqi Yu et al. (OpenCV Zoo) | https://github.com/opencv/opencv_zoo | huggingface.co/opencv/face_detection_yunet |
| MobileSAM | Ai Tools (Local): Click-to-select | Apache-2.0 | Chaoning Zhang et al. | https://github.com/ChaoningZhang/MobileSAM | huggingface.co/Acly/MobileSAM |
| Real-ESRGAN general x4v3 | Ai Tools (Local): Upscale | BSD-3-Clause | Xintao Wang et al. | https://github.com/xinntao/Real-ESRGAN | huggingface.co/OwlMaster/AllFilesRope |
| Tesseract language data (tessdata_best, integer) | Ai Tools (Local): Text from image | Apache-2.0 | The Tesseract OCR project | https://github.com/tesseract-ocr/tessdata_best | cdn.jsdelivr.net (`@tesseract.js-data/<lang>`) |

## AI engines (loaded from jsDelivr when needed)

| Library | Used for | Licence | Project |
|---|---|---|---|
| ONNX Runtime Web 1.31.1 | runs the ONNX models in the browser | MIT | https://github.com/microsoft/onnxruntime |
| Tesseract.js 5.1.1 and tesseract.js-core 5.1.0 | text from image | Apache-2.0 | https://github.com/naptha/tesseract.js |

## Libraries in the apps (vendored in `shared/vendor/`, or loaded from a CDN with a pinned version)

| Library | Version | Licence | Project |
|---|---|---|---|
| PDF.js | vendored | Apache-2.0 | https://github.com/mozilla/pdf.js |
| pdf-lib | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib |
| @pdf-lib/fontkit | 1.1.1 | MIT | https://github.com/Hopding/fontkit |
| React and ReactDOM | 18.3.1 | MIT | https://github.com/facebook/react |
| DOMPurify | 3.1.6 | MPL-2.0 OR Apache-2.0 | https://github.com/cure53/DOMPurify |
| JSZip | 3.10.1 | MIT OR GPL-3.0-or-later | https://github.com/Stuk/jszip |
| mammoth.js | 1.8.0 | BSD-2-Clause | https://github.com/mwilliamson/mammoth.js |
| marked | 12.0.2 | MIT | https://github.com/markedjs/marked |
| Turndown | 7.2.0 | MIT | https://github.com/mixmark-io/turndown |
| html2canvas | 1.4.1 | MIT | https://github.com/niklasvh/html2canvas |
| Paged.js | 0.4.3 | MIT | https://github.com/pagedjs/pagedjs |
| Prism | 1.29.0 | MIT | https://github.com/PrismJS/prism |

## Fonts

Markdown-to-PDF loads **Inter**, **Merriweather** and **JetBrains Mono** from Google Fonts (SIL Open Font License 1.1). ZEditor's font picker can load other Google Fonts at the user's request; each family has its own licence (SIL OFL 1.1, Apache-2.0 or the Ubuntu Font Licence), shown on fonts.google.com.

## Build tools (not distributed)

esbuild (MIT) builds the apps from `src/`. The test scripts use Playwright (Apache-2.0).

## Where the source code is

https://github.com/erictzh/ZineNow. A small "Source code" link is also in each app's gear pop-up and on Ai Tools (Local)'s Models page.
