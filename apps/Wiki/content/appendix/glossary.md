<!-- no-parts -->

Terms used across the wiki, in alphabetical order, with the page that explains each in context.

| Term | Meaning | Learn more |
|---|---|---|
| **AGPL-3.0-or-later** | The free-software licence of ZineNow: you may use, change and share it, but must share your changes (even for a service run over a network). | [licences](appendix/licences) |
| **Alpha (channel)** | The fourth number of every pixel after red, green and blue: how opaque it is, 0 (see-through) to 255 (solid). Remove background works by setting it. | [cutoff softness](ai-tools/remove-background/cutoff-softness) |
| **Annotation / item** | Anything placed on a ZEditor page: a text box, image, shape or stroke. Stored bottom layer first. | [layers panel](zeditor/arrange/layers-panel) |
| **Array** | An ordered list of values, such as `[3, 5, 8]`; the first item is number 0. | [what is zinenow](start/what-is-zinenow) |
| **Async / await / Promise** | A **Promise** stands for a result that arrives later (a file read, a download). `await` waits for it without freezing the page; `async` marks a function that may wait. | [dialogs](ai-tools/hub/dialogs) |
| **Base64** | A way to write any bytes using only 64 safe text characters (A to Z, a to z, 0 to 9, +, /), 4 characters for every 3 bytes. Used to put PDFs and fonts inside `.znow` text. | [znow file](zeditor/project/znow-file) |
| **Bleed / trim / margin** | Print terms: the *trim* is where the paper is cut, the *margin* the empty border inside it, the *bleed* extra picture beyond the trim so no white edge shows. | [page guide](zeditor/pages/page-guide) |
| **Blob** | The browser's name for a chunk of file data in memory, with a type. Saved or downloaded as a file. | [download and save](start/shared-parts/download-and-save) |
| **Build number** | A 7-character fingerprint of an app's code and styles, shown in the app so you can tell which version a device runs. | [how its built](start/how-its-built) |
| **Bundle / esbuild** | Joining many small source files into one script (the *bundle*) with a tool called esbuild. | [how its built](start/how-its-built) |
| **Cache API** | Browser storage of request → response pairs; used for offline files and downloaded AI models. | [download flow](ai-tools/running-models/download-flow) |
| **Canvas** | A rectangle of pixels that code can draw on. Pages, previews and exports are canvases. | [export pdf](zeditor/project/export-pdf) |
| **Capture phase** | The first stage of a browser event's journey, when it travels *down* to its target. Listeners registered with `true` run before the page's own. | [drop images](start/shared-parts/drop-images) |
| **CDN** | Content delivery network: a public host (such as jsDelivr) that serves libraries by address. | [offline and install](start/offline-and-install) |
| **Clamp** | Forcing a number to stay between a minimum and a maximum. | [display gear](start/shared-parts/display-gear) |
| **Closure** | A function that remembers the variables around it, so they live on between calls. | [touch and pinch](start/shared-parts/touch-and-pinch) |
| **Contour / curve fitting** | Vectorizing a picture: finding the outlines of colour regions, then replacing their jagged pixel edges by smooth curves. | [contours](zeditor/images/vectorize/contours) |
| **CORS** | The rule that stops one website reading another's data (such as pictures) unless that site allows it. | [dropped pictures](md2pdf/editor/dropped-pictures) |
| **CSS variable** | A named value in a stylesheet (`--zn-ui-zoom`) that settings can change in one place. | [display gear](start/shared-parts/display-gear) |
| **Dilate** | Growing a marked area by some pixels in every direction. | [migan](ai-tools/remove-object/migan) |
| **Embedding (font)** | Storing a copy of a font inside a file so it looks the same elsewhere. | [embed fonts](zeditor/project/embed-fonts) |
| **Embeddings (AI)** | The compact grid of numbers an image model produces to describe a picture, reused for fast follow-up steps. | [click to select](ai-tools/click-to-select) |
| **Event** | A message the browser sends when something happens (a click, a key, a drop). Code **listens** for it. | [leave warning](start/shared-parts/leave-warning) |
| **Face detection / NMS** | Finding boxes round faces; *non-maximum suppression* keeps only the best of overlapping boxes. | [face blur](ai-tools/face-blur) |
| **Fenced code block** | Code in Markdown between two lines of backticks, with an optional language word. | [code blocks](md2pdf/typography/code-blocks) |
| **File System Access API** | The browser feature behind the native Save As and Open dialogs and re-saving to the same file. | [znow file](zeditor/project/znow-file) |
| **Hash** | A fixed-length fingerprint of data: same data, same hash; any change, a different one. | [how its built](start/how-its-built) |
| **Histogram** | A count of how many values fall in each range. | [otsu](ai-tools/remove-background/otsu) |
| **Hook (React)** | A function starting with `use` that gives a component memory or side effects. | [header menu sidebar](md2pdf/workspace/header-menu-sidebar) |
| **Hyphenation (Liang)** | Splitting words at syllables using patterns; with the Knuth–Plass composer it makes even paragraphs. | [composer hyphenation](zeditor/text/composer-hyphenation) |
| **Imposition** | Arranging pages on printer sheets so that, folded and cut, they read in order. | [imposition](zinearranger/imposition) |
| **IndexedDB** | A database inside the browser for larger data, such as the reload snapshot and OCR language files. | [znow file](zeditor/project/znow-file) |
| **IoU** | Intersection over union: how much two boxes overlap, as shared area ÷ combined area. | [face blur](ai-tools/face-blur) |
| **JSON** | A text format for data: `{ "name": value }` pairs and lists. `.znow` and config files are JSON. | [file formats](appendix/file-formats) |
| **JSX** | HTML-like syntax inside JavaScript, converted to plain calls by the build. | [how its built](start/how-its-built) |
| **Kerning / tracking / ligature** | Spacing tweaks between letters (kerning pairs, tracking overall) and joined letter shapes (fi). | [composer hyphenation](zeditor/text/composer-hyphenation) |
| **Layer** | One item in the stack on a page; later ones sit on top. | [layers panel](zeditor/arrange/layers-panel) |
| **localStorage** | Small per-site browser storage for settings; survives closing the tab. | [display gear](start/shared-parts/display-gear) |
| **Manifest (PWA)** | The card that describes an installable app: name, colours, icons. | [offline and install](start/offline-and-install) |
| **Markdown** | Plain text with light markers (`**bold**`, `# Heading`) that become formatting. | [markdown to html](md2pdf/building/markdown-to-html) |
| **Mask** | A picture of 0s and 1s (or 0 to 1) saying which pixels are selected or kept. | [u2net modnet](ai-tools/remove-background/u2net-modnet) |
| **Meta (handoff)** | Extra data sent along with a picture and returned unchanged, e.g. where a layer was. | [handoff protocol](appendix/handoff-protocol) |
| **MIME type** | The standard name of a file's kind, e.g. `image/png`. | [export images](zeditor/project/export-images) |
| **Model (AI)** | A trained neural network stored as a file; the app downloads it only on request. | [model list licences](ai-tools/running-models/model-list-licences) |
| **ONNX** | A common file format for trained AI models, run here by ONNX Runtime Web. | [onnx runtime](ai-tools/running-models/onnx-runtime) |
| **Origin** | Scheme + host + port of a website. Pages of one origin may talk to each other freely. | [send to zeditor](ai-tools/hub/send-to-zeditor) |
| **Otsu's method** | A way to choose the threshold that best splits values into two groups. | [otsu](ai-tools/remove-background/otsu) |
| **Pagination** | Cutting flowing content into pages. | [preview pagination](md2pdf/building/preview-pagination) |
| **Pixel / DPI** | The smallest dot of a picture; *dpi* is dots per inch (ZEditor exports at 200). | [export pdf](zeditor/project/export-pdf) |
| **Point (pt)** | A print length: 1/72 of an inch. | [export pdf](zeditor/project/export-pdf) |
| **Pointer events** | One browser system for mouse, finger and pen. | [touch and pinch](start/shared-parts/touch-and-pinch) |
| **postMessage** | The browser's way for two windows or tabs to send each other data. | [handoff protocol](appendix/handoff-protocol) |
| **PWA / service worker** | An installable website; a background script that answers requests from saved copies so the app works offline. | [offline and install](start/offline-and-install) |
| **Ref (React)** | A box whose contents survive redraws without causing one. | [leave warning](start/shared-parts/leave-warning) |
| **Regular expression** | A pattern language for finding text, e.g. `^\d+$` for digits only. | [format toolbar](md2pdf/editor/format-toolbar) |
| **Runtime (AI)** | The program that runs a model: ONNX Runtime Web. | [onnx runtime](ai-tools/running-models/onnx-runtime) |
| **Sandbox (iframe)** | Restrictions on a frame so its content cannot reach the app. | [preview pagination](md2pdf/building/preview-pagination) |
| **Signature** | A group of sheets folded together; long zines are several signatures. | [signatures](zinearranger/imposition/signatures) |
| **Slot** | A numbered position for a zine page, counted from 0. | [load pdf](zinearranger/load-pdf) |
| **SPDX** | The standard list of licence identifiers (MIT, Apache-2.0…). | [model list licences](ai-tools/running-models/model-list-licences) |
| **Spec string** | ZineArranger's short layout name, e.g. `8-1ps`. | [options display](zinearranger/options-display) |
| **Subsetting (font)** | Embedding only the characters a document uses. | [export pdf](zeditor/project/export-pdf) |
| **Tensor** | A box of numbers with a shape; the input and output of an AI model. | [onnx runtime](ai-tools/running-models/onnx-runtime) |
| **Tile** | A small square piece of a big picture processed separately. | [upscale](ai-tools/upscale) |
| **Transfer (postMessage)** | Moving a block of bytes to another window instead of copying it. | [download and save](start/shared-parts/download-and-save) |
| **Vector / raster** | Vector: shapes described by maths, sharp at any size. Raster: a grid of pixels. | [vectorize](zeditor/images/vectorize) |
| **WebGPU / WASM** | Two ways ONNX Runtime calculates: on the graphics chip, or on the processor. | [onnx runtime](ai-tools/running-models/onnx-runtime) |
| **Worked example** | In this wiki: a walk through a function with real numbers, checked by running it. | [start](start) |
