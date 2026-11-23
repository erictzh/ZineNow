# Ai Tools (Local): how to use it

A set of AI tools for pictures that run on your own device. Nothing is uploaded. Each AI model is downloaded once, only when you choose to, then the tools work offline.

## The screen

- **Left: the tools list.** Remove object, Remove background, and Models. (On a phone or in portrait it is a strip across the top.)
- **Middle: your picture.** Open one (Open picture, drop it, or paste with Ctrl+V). Scroll or pinch with two fingers to zoom, two fingers to move. The picture is shared by all tools: use one tool, then another on the result.
- **Right: the options of the selected tool**, and a status line at the bottom.
- **Top bar:** Open picture, Undo, Redo, Hold to compare (shows the picture as it was when opened), Save PNG, Send to ZEditor.

## Before a tool works: download its model

A tool that needs a model shows a red **Download required** and its buttons are greyed out. Press **Download** (in the tool, or on the **Models** page) and confirm in the pop-up, which says what is downloaded, from where, how big it is, and that the model does not connect to the internet. **Delete** removes a model again.

The **Models** page lists every model: its name, what it is for, licence, size, where it comes from, and whether it is on this device, plus the total stored. All models share one AI engine (ONNX Runtime Web, about 16 to 30 MB from cdn.jsdelivr.net), which is downloaded with the first model and removed with the last.

## Remove object

1. Mark what to remove: **Brush**, **Erase mark**, **Box**, or **Move** (to pan). Brush size is a number box (or `[` and `]`).
2. **Grow the marked area by**: a few pixels more than you painted covers shadows and fringes.
3. **Remove object** (or Enter). The model (MI-GAN, MIT licence) fills the marked area with what would plausibly be behind it. Several marks far apart are done one after another.
4. Not right? **Try another** undoes the fill and fills again showing the model the area from a slightly different view (a fixed cycle of 7; the differences are small). Or Undo and mark differently.

## Remove background

1. Pick the model: **U²-Netp (General)**, about 4.4 MB, Apache-2.0: any single subject (an object, an animal, a person), edges a little rough. **MODNet (Portrait)**, about 25 MB, Apache-2.0: photos of people (head and shoulders), soft hair edges, not for objects. (It finds a person's outline; it does not recognise or identify faces.)
2. **Find subject.** The picture shows the subject with everything else see-through (checkerboard).
3. Adjust **Edge cut-off (%)**, 0 to 100 (the - and + buttons move by 0.125; type finer values like 0.05) and **Soft edge (%)**. The useful cut-offs are very small. The picture updates live.
4. **Apply** makes it the picture (Undo brings it back), or **Discard**.

## Send to ZEditor

**Send to ZEditor** opens the picture in ZEditor as a new document. A picture that came from ZEditor ("Open in Ai Tools") goes back to that same ZEditor as a new layer.

## Tips

- It works best on one clear subject. A landscape or a crowd has no main subject.
- Big pictures are shrunk to 4096 pixels on the long side when opened (memory).
- The AI may freeze or lag on lower-end devices; the pop-up warns about it.
