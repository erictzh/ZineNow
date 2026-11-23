# ZEditor: Remove a picture's background (on-device AI)

Cuts the main subject out of a picture and makes everything else see-through. It uses a small open-source AI model (U²-Netp, Apache-2.0, about 5 MB) that runs on your device. Nothing is uploaded.

## Steps

1. Select a picture on the page (Move tool, click it).
2. In the **Format — Image** panel on the right, open **Remove background**.
3. First time only: press **Download AI model** and confirm. It downloads the model (about 5 MB) and the AI runtime (about 16-30 MB, skipped if you already use the AI fill). Delete it any time with **Delete model**.
4. Set the two numbers if you like, then press **Remove background**.
5. **Ctrl+Z** undoes it (the original comes back).

## The two numbers

| Setting | What it does | Try it when |
|---|---|---|
| **Edge cut-off (%)** | How sure the model must be before it keeps a pixel. Higher = a tighter cut. | Bits of background are left: raise it. Part of the subject is missing: lower it. |
| **Soft edge (%)** | How gradually the edge fades. | The edge looks harsh: raise it. It looks fuzzy: lower it. |

To change a number after running it, press Ctrl+Z, change it, and run again.

## Tips and limits

- It works best on **one clear subject** (a person, a product, an animal). A landscape or a crowd has no single main subject, so the result can be odd.
- Hair, fur, glass and thin lines come out rough: the model makes a hard-ish mask, not a fine matte.
- The picture is cut as it looks now (crop, adjustments and effects are baked in first), like Flatten.
- The model looks at a small 320 x 320 version, so the edge is as sharp as that mask scaled up.
- It runs on the processor and takes about a second or a few on a tablet.
