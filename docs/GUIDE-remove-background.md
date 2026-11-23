# ZEditor: AI Background Removal (experimental)

Cuts the main subject out of a picture and makes everything else see-through. It uses a small open-source AI model that runs on your device. Nothing is uploaded.

## Turn it on first

The AI features are hidden by default. Click the **gear** at the bottom left of ZEditor and tick **Experimental AI features**. A pop-up explains that they are still being developed and tested and may need you to download models and use your device's processing power. Press **Enable**. (Cancel leaves it off. Untick it any time to hide them again. The choice is remembered.) This also shows the **AI (on-device)** fill style in the Marquee panel.

## Steps

1. Select a picture on the page (Move tool, click it).
2. In the **Format - Image** panel, open **AI Background Removal**.
3. Choose a **Model**:
   - **U²-Netp (General)**: about 4.4 MB, Apache-2.0 licence, from huggingface.co/edgetools/u2netp. Any single subject: an object, an animal or a person. Edges are a little rough.
   - **MODNet (Portrait)**: about 25 MB, Apache-2.0 licence, from huggingface.co/Xenova/modnet. Photos of people (head and shoulders), with soft hair edges. Not for objects or animals. (It finds a person's outline. It does not recognise or identify faces.)
4. First time per model: press **Download** and confirm. The panel and the pop-up say what is downloaded and from where. Both models also need the AI engine (ONNX Runtime Web, about 16-30 MB from cdn.jsdelivr.net), downloaded once and shared with the AI fill. **Delete** removes a model; the engine goes only when no AI model is left.
5. Until the chosen model is downloaded, the two numbers are greyed out with a red "Download required".
6. Press **Remove background**. **Ctrl+Z** undoes it.

## The two numbers

| Setting | What it does | Try it when |
|---|---|---|
| **Edge cut-off (%)** | How sure the model must be before a pixel is kept. 0 to 100. The - and + buttons move by 0.125; you can type finer values like 0.05. The default is 0.1. | Bits of background are left: raise it. Part of the subject is missing: lower it. |
| **Soft edge (%)** | How gradually the edge fades. | The edge looks harsh: raise it. It looks fuzzy: lower it. |

The useful cut-offs are very small, because the models answer close to 0 on the background. To change a number after running it, press Ctrl+Z, change it, and run again.

## Tips and limits

- It works best on **one clear subject**. A landscape or a crowd has no single main subject, so the result can be odd.
- U²-Netp can drop parts of busy patterns (e.g. a patterned shirt): lower the cut-off.
- The picture is cut as it looks now (**crop, adjustments and effects are baked in first**, like Flatten). The parts outside a crop are gone from the layer; Ctrl+Z restores them. To keep the full original, duplicate the layer first.
- It runs on the processor, about 1-2 seconds for a picture on a normal PC or tablet.
