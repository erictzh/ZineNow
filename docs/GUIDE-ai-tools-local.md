# Ai Tools (Local): how to use it

A set of AI tools for pictures that run on your own device. Nothing is uploaded. Each AI model is downloaded once, only when you choose to, then the tools work offline.

## The screen

- **Left: the tools list.** Remove object, Remove background, and Models. (On a phone or in portrait it is a strip across the top.)
- **Middle: your picture.** Open one (Open picture, drop it, or paste with Ctrl+V). Scroll or pinch with two fingers to zoom, two fingers to move. The picture is shared by all tools: use one tool, then another on the result.
- **Right: the options of the selected tool**, and a status line at the bottom.
- **Top bar:** Open picture, Undo, Redo, Hold to compare (shows the picture as it was when opened), Save PNG, Send to ZEditor.

## Before a tool works: download its model

A tool that needs a model shows a red **Download required** and its buttons are greyed out. Press **Download** (in the tool, or on the **Models** page) and confirm in the pop-up, which says what is downloaded, from where, how big it is, and that the model does not connect to the internet. Models are deleted on the **Models** page only (the tools have no Delete button).

The **Models** page lists every model (its size is shown in grey at the top right of its card): its name, what it is for, licence, size, where it comes from, and whether it is on this device, plus the total stored. All models share one AI engine (ONNX Runtime Web, about 16 to 30 MB from cdn.jsdelivr.net), which is downloaded with the first model and removed with the last.

## Remove object

1. Mark what to remove: **Brush**, **Erase mark**, **Box**, or **Move** (to pan). Brush size is a number box (or `[` and `]`).
2. **Grow the marked area by**: a few pixels more than you painted covers shadows and fringes.
3. **Remove object** (or Enter). The model (MI-GAN, MIT licence) fills the marked area with what would plausibly be behind it. Several marks far apart are done one after another.
4. Not right? **Try another** undoes the fill and fills again showing the model the area from a slightly different view (a fixed cycle of 7; the differences are small). Or Undo and mark differently.

## Remove background

1. Pick the model at the bottom of the panel (the model card is always last): **U²-Netp (General)**, about 4.4 MB, Apache-2.0: any single subject (an object, an animal, a person), edges a little rough. **MODNet (Portrait)**, about 25 MB, Apache-2.0: photos of people (head and shoulders), soft hair edges, not for objects. (It finds a person's outline; it does not recognise or identify faces.)
2. Optional **Crop first…**: a box appears on the picture. Drag the box, its edges or its corners. Only what is inside is used (this also helps the model on a busy picture). When you Apply, **the picture becomes the cropped area**; Undo brings the whole picture back. (**Hold to compare** is unavailable while the picture is cropped, because it no longer lines up with the original.)
3. **Find subject.** The picture shows the subject with everything else see-through (checkerboard).
4. Adjust **Edge cut-off (%)**, 0 to 100 (the - and + buttons move by 0.125; type finer values like 0.05) and **Soft edge (%)**. The useful cut-offs are very small, and 0 keeps everything. The picture updates live.
5. **Apply** makes it the picture (Undo brings it back), or **Discard**.

## Face blur

Hides faces with Blur, Pixelate or a Black box. It uses a tiny face detector, **YuNet** (MIT licence, about 0.23 MB, from huggingface.co/opencv/face_detection_yunet), that only finds where faces are. **It does not recognise or identify anyone.**

1. Download the model (about 16 MB in total with the AI engine, if you have not already).
2. **Find faces.** Orange boxes with a number and a score appear on the picture. **Minimum score (%)** hides the unsure ones (lower shows more, including false ones).
3. **Tap a box** to leave that face alone (it turns grey and dashed); tap again to include it. A face the detector missed: **Draw a box by hand** and drag on the picture.
4. Choose **Blur**, **Pixelate** or **Black box**, the **Strength**, and **Grow each box by (%)** (the detector's box is tight; a little extra covers forehead, ears and chin; hand-drawn boxes are used as drawn).
5. **Hide N faces** applies it to the picture. Undo brings the faces back. Use the **Log** if the boxes look wrong.

Limits: very small, turned away, covered or blurry faces can be missed (draw a box). The detector looks at a 640 pixel version of the picture, so tiny faces in a big group photo may need a crop first (use Remove background's Crop, or crop before you open it).

## Click-to-select

Click a thing and the model outlines it. It uses **MobileSAM** (Apache-2.0), two files that are downloaded together (about 44.7 MB: an image reader of about 28 MB and a mask maker of about 16.5 MB, from huggingface.co/Acly/MobileSAM).

1. Download the model, then press **Read the picture**. The model reads the picture once: about 7 to 11 seconds on a tablet (faster on the graphics chip when there is one). Read it again after you change the picture.
2. **Click or tap** a thing. It is outlined in orange (about half a second per click). If it picked too little, click again to add more (green dots). To remove a part that should not be included, switch to **Take away** and click on that part (red dots). **Remove the last click** and **Clear the selection** undo clicks.
3. Use the selection: **Cut it out** keeps only the selection and makes everything else see-through; **Make it see-through** does the opposite; **Send to Remove object** switches to Remove object with the selection already marked, so the AI fills it with what is behind it. Undo brings the picture back.

Tips: several clicks on different things select all of them together. A big picture is read at up to 1280 pixels (the selection is scaled back up). The model is not perfect on thin parts, shadows and busy backgrounds; add or take away clicks to fix them.

## Text from image (OCR)

Reads the text in a picture on your device and lets you copy it or save it as a .txt file. It uses **Tesseract.js** (Apache-2.0), with one language file per language (from cdn.jsdelivr.net).

1. Pick the **Language** (English, Malay, Indonesian, Chinese simplified or traditional, Tamil) and download it (the language file is 1 to 3 MB; the reader's code, about 4 MB, is downloaded with the first language and shared).
2. Pick **How the page is laid out**: Automatic for normal pages with paragraphs, **Scattered text** for posters, signs and zine pages, One block, or One line.
3. Press **Read text** (or Enter). To read only part of the picture, press **Read only an area (draw a box)** and drag; **Read the whole picture again** clears the area.
4. The text appears in the box (you can fix mistakes in it). **Copy text** or **Save as .txt**. The words it found are boxed on the picture: green = sure, yellow = unsure, red = very unsure (untick the box to hide them).

Limits: it works best on clean printed text. Handwriting and decorative fonts read poorly. After the language is downloaded it works offline. The Models page lists each language file and the reader's code with their sizes; **Delete** removes a language, and the reader's code goes with the last one.

## Send to ZEditor

**Send to ZEditor** opens the picture in ZEditor as a new document. A picture that came from ZEditor ("Open in Ai Tools") goes back to that same ZEditor as a new layer.

## The Log window

The bottom of the right-hand sidebar is a **Log**: your device, every message from the app and the tools, how long each step took, numbers about the model's answer and the picture, and, after **Save PNG**, what the saved file really is (for example "RGBA (has transparency)"). Press **Copy** (top right of the Log) to copy the whole log, and paste it in a message, ideally with a screenshot. **Snapshot** adds the picture's current numbers, **Clear** empties the log, and **▾** folds it away (also Ctrl+Shift+D). Nothing is sent anywhere: the text only goes where you paste it.

## Tips

- It works best on one clear subject. A landscape or a crowd has no main subject.
- Big pictures are shrunk to 4096 pixels on the long side when opened (memory).
- The AI may freeze or lag on lower-end devices; the pop-up warns about it.
