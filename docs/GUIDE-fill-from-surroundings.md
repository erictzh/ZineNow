# ZEditor: Remove something and fill it from what is around it

Use this to take a thing out of a picture (a stray object, a mark, a bit of text, a person in the background) and have the gap filled with what is around it, so it looks like it was never there. It works on a PDF page, on a picture you inserted, and on a no-paper canvas.

## The short version

1. Press **M** (Marquee tool) and draw a box round the thing. Draw it a little **bigger** than the thing.
2. In the right-hand panel, set **Action** (below Shape and Works on) to **Remove & fill** and press **Remove & fill**.
3. Not happy? Press **Try another** a few times. Still not right? Open **Fine-tune** (just below) and change a number (see below).
4. **Ctrl+Z** undoes any of it.

## Step by step

### 1. Choose the area

- Press **M**, or tap the dotted-box tool in the toolbar.
- **Shape** (top of the panel): **Rectangle** (drag a box) or **Polygon** (tap the corners one by one, then tap the first corner or press Enter to close it). Use Polygon for a thing with an odd outline; the less background you take in, the better the fill.
- Draw the box so it covers the **whole** thing, including its shadow, glow or soft edge. A bit of the thing left outside the box gets copied into the fill. This is the most common reason for a bad result.
- You can move, resize and turn the box afterwards by its handles.

### 2. Choose what it works on ("Works on")

- **All visible**: everything you can see on the page, as one picture. The fill becomes a **new layer called "Filled area"** placed on top, so your original is untouched underneath. Delete or hide that layer to get the original back.
- **Selected layer**: only the layer you selected first (Move tool or Layers panel, then M). The layer's own picture is changed. (A text box or shape is turned into an image first so it can be changed.)

### 3. Fill it

The **Action** dropdown chooses between **Make a new layer** and **Remove & fill**, and the panel shows only the options for the one you picked. For **Remove & fill**:

- **Style**
  - **Pattern** (default): copies real texture from the rest of the picture. Best for grass, leaves, road, brick, walls, sky with grain, anything with texture. Works on areas up to about 130 px of the page. A bigger area switches to Smooth by itself and tells you so.
  - **Smooth**: blends the colours round the edge. Best for plain paper, flat colours and soft backgrounds. It also works on big areas.
  - **Detailed**: carries thin lines and edges through the gap. Only good for small marks and scratches.
- **Remove & fill**: does it. A big area takes a moment; the button says "Filling…".
- **Try another**: undoes the fill you just made and fills again, copying different patches. Press it several times and keep the best one. (Only for the Pattern style.)

### 4. Fine-tune (the section under the Remove & fill button)

Change a number with the **+** and **−** buttons (or type it), then press **Remove & fill** again. Press Ctrl+Z first if you want to replace the previous fill instead of filling over it. Sizes are in pixels of the picture.

| Setting | What it does | Try it when |
|---|---|---|
| **Pattern amount (%)** | 100 = all copied texture. Lower mixes in the smooth blend. | You can see hard seams: lower it to 60–80. Fill is too blurry: set 100. |
| **Patch size** | The size of the pieces copied. Small suits fine texture, large keeps lines and structure. | Branches, brick lines or edges look broken: raise it (21–31). Texture looks stretched or repeated: lower it (9–13). |
| **Copy from within** | How far from the area it looks for texture to copy. | It copies from a different part of the scene (sky into rock): lower it (40–80). The area is surrounded by something it can't match: raise it. |
| **Grow the area by** | Makes the filled area bigger all round. | A halo or fringe of the old thing is left at the edge: 4–10. |
| **Grain (%)** | How much noise like the picture's own is added to a smooth fill. Shown for Smooth and Detailed, or when Pattern amount is below 100. | The fill looks too flat or plastic: raise it. Too noisy: lower it. 0 = none. |

### 5. Fill and cut in one go (optional)

If you want to remove something **and keep it** as its own layer: set Action to **Make a new layer** and choose **Cut to a new layer**, then under **What a cut leaves behind** choose **Filled from the surroundings** (it uses the style and numbers saved for Remove & fill), then press **Make layer** (Ctrl+Shift+J). You get the cut-out as a new layer on top, and the gap behind it is already filled.

## Tips

- **Small and tight is best.** Several small fills in a row look better than one big one.
- Include the thing's **shadow and soft edge** in the box, or use **Grow the area by**.
- A thing that sticks out past the box (a twig, a cable, a person's arm) will be pulled into the fill. Cover it all, or fill the pieces one at a time.
- Start with **Pattern**. If it looks muddy, try **Smooth** with some grain. For plain paper, go straight to Smooth.
- For a thin line across a gap, try **Detailed** on a small box, or Pattern with a large Patch size.
- The result lives in the picture's real pixels, so it is included when you export or save the project.

## If it doesn't look right

| What you see | What to do |
|---|---|
| A blurry smudge | Switch to Pattern, or raise Pattern amount to 100. For plain areas that is normal for Smooth: add Grain. |
| The wrong texture (sky in the rocks) | Lower **Copy from within**. |
| Broken or smeared lines | Raise **Patch size**. |
| A ghost or outline of the old thing | Raise **Grow the area by**, or make the box bigger. |
| A visible edge or patch | Lower **Pattern amount** to 60–80, or press **Try another**. |
| A "Pattern fill could not be used here" notice | The area is too big. Draw a smaller box, or accept the Smooth fill it used instead. |
| Rainbow colours or streaks | This was a bug in the Detailed style that has been fixed. If you still see it, tell me where. |
| Nothing happens | Draw the box first. For "Selected layer", select a layer first. Locked or hidden layers can't be filled. |

## Where things are

- Panel: **Format** panel on the right, with the **Marquee** tool active. It remembers which Action (Make a new layer or Remove & fill) you used last.
- After a fill the Marquee panel stays open, so you can change a number and fill again straight away.
- Shortcuts: **M** Marquee tool, **Ctrl+Z** undo, **Ctrl+J** copy to a new layer, **Ctrl+Shift+J** cut to a new layer.
- The settings are kept while the editor is open (not saved with the project).
