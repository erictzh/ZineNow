# ZEditor guide: Remove & fill, Magic eraser and the Unlimited canvas

For people who use the app, not people who write code. Each part has two bits:

- **How to use it**: the steps, in plain words.
- **What's going on inside**: a simple explanation of how the code does it, so you know why it behaves the way it does and what to expect.

You can skip the "inside" bits and the tool still works the same.

A few words used below:

| Word | Meaning |
|---|---|
| **Pixel** | One tiny coloured dot. Every picture is a grid of pixels. |
| **Layer** | One item on the page (a picture, a shape, some text). Layers stack, like sheets of glass. |
| **Marquee** | The dotted box (or outline) you draw to say "this area". |
| **Undo** | Ctrl+Z. Everything below can be undone. |

---

## Part 1: Remove & fill (take something out and fill the gap)

### What it's for

You have a picture with something you don't want in it: a stray person, a mark, a bit of text, a cable. You draw around it, and the app replaces it with a fill made from what's around it, so it looks like it was never there.

### How to use it

1. **Choose the Marquee tool.** Press **M**, or tap the dotted-box icon in the toolbar.
2. **Draw the area.** Drag a box round the thing. Make the box a little **bigger** than the thing, including its shadow or soft edge. For an odd shape, set **Shape** to **Polygon** in the panel on the right and tap its corners one by one, then tap the first corner (or press Enter) to close it.
3. **Choose what it works on** (the **Works on** section):
   - **All visible**: everything you can see on the page, as one picture. The fill becomes a **new layer called "Filled area"** on top. Your original is untouched underneath, so you can hide or delete the new layer to get it back.
   - **Selected layer**: only the layer you selected first (select it with the Move tool before pressing M). That layer's own picture is changed.
4. **Set Marquee Action to "Remove & fill".** This is the dropdown in the right-hand panel.
5. **Pick a Style:**
   - **Pattern** (the default): copies real texture from elsewhere in the picture. Best for grass, leaves, brick, road, walls, anything with texture.
   - **Smooth**: blends the colours around the edge. Best for plain paper, flat colours and soft backgrounds.
   - **Detailed**: carries thin lines through the gap. Only good for small marks.
6. **Press "Remove & fill".** A big area takes a moment ("Filling…").
7. **Not right? Press "Try another".** It undoes the last fill and fills again, copying different bits. Press it a few times and keep the best.
8. **Still not right? Change a number under Fine-tune** (use the + and − buttons), then press Remove & fill again. Press **Ctrl+Z** first if you want to replace the last fill instead of filling over it:

| Setting | What it does | When to change it |
|---|---|---|
| **Pattern amount** | 100 = all copied texture. Lower mixes in the smooth blend. | You can see hard seams: try 60–80. |
| **Patch size** | The size of the pieces copied. Small suits fine texture. Large keeps lines and structure. | Branches or bricks look broken: raise it (21–31). |
| **Copy from within** | How far from the area it looks for texture to copy. | It copies the wrong thing (sky into rock): lower it (40–80). |
| **Grow the area by** | Makes the filled area bigger all round. | A halo or fringe of the old thing is left: 4–10. |
| **Grain** | How much noise like the picture's own is added to a smooth fill. | The fill looks flat or plastic. |

### Tips that matter

- **Cover the whole thing.** A twig, shadow or edge left outside the box gets pulled into the fill. This is the number one reason for a bad result.
- **Small and tight beats big.** Several small fills look better than one big one.
- Pattern works on areas up to about 130 px of the page. A bigger area switches to Smooth by itself and tells you so.
- **Make a layer instead:** if you want to remove something and keep it, set Marquee Action to **Make a new layer**, choose **Cut to a new layer**, and under "What a cut leaves behind" choose **Filled from the surroundings**.

### What's going on inside (the layman version)

Think of it as a very quick, very patient artist.

1. **The app takes a photo of the page.** For "All visible" it renders the whole page into one flat picture (the same way it does for exporting). For "Selected layer" it uses just that layer's picture.
2. **Your box becomes a mask.** The app marks every pixel inside your outline as "to be replaced" and every other pixel as "known".
3. **A fill is worked out from the known pixels.** There are three methods, which is the **Style**:
   - **Smooth** treats the colours around the edge like a rubber sheet pinned at the edges, and lets the middle relax into the smoothest shape. Maths name: a "harmonic" fill. That's why it looks soft and a bit blurry, and why it is perfect for plain areas.
   - **Pattern** works like patching a hole in a wall with bricks from elsewhere on the same wall. It works from the edge of the hole inwards. At each step it looks at the little square of known pixels at the edge, searches the picture for the best-matching square, and copies that square's pixels into the hole. Because it copies real pixels, the texture and grain are real. The search is the slow part, which is why a big area takes a moment, and why it can't invent anything that isn't already in the picture. Maths name: "exemplar-based inpainting".
   - **Detailed** fills from the edge inwards, letting lines and edges continue. It is fast but only works on thin things.
4. **Grain is added back.** Smooth fills look too clean, so the app measures how noisy the surrounding pixels are and adds the same amount of random noise to the fill.
5. **The result is put back** as a new layer (or into the layer's own picture), and counted as one Undo step.

**"Try another"** works because Pattern normally picks the *single* best match. With "Try another" it picks randomly among the *three* best, using a different random number each time, so you get a different but equally good result.

The code lives in `apps/ZEditor/src/render/`: `inpaint.js` (Smooth, Detailed, grain), `patchFill.js` (Pattern) and `marqueeLayer.js` (puts it all together and handles the marquee).

---

## Part 2: Magic eraser (erase a colour, or clean up an edge)

### What it's for

Removing a background, or any area of similar colour, from a picture, so it becomes see-through. Like clicking on a white sky and having it vanish. The cut edge can then be cleaned up.

### How to use it

1. **Select the Eraser tool** (the eraser icon) and in the right-hand panel, set **Mode** to **Magic**.
2. **Click on the image** on the colour you want gone. Nothing is changed yet: a **preview** opens.
3. **Adjust until it looks right.** Change any setting in the panel and the preview updates:

| Setting | What it does | When to change it |
|---|---|---|
| **Brightness tolerance** | How different in brightness a pixel can be and still count as "the same". | Raise it to catch shadows and lighter or darker patches of the same surface. |
| **Colour tolerance** | How different in colour a pixel can be and still count. | Raise it if the background has colour variation. Lower it if the erase spills onto your subject. |
| **Smoothing** | Averages nearby pixels before comparing. | Raise it for grainy backgrounds (paper, carpet, noise). Lower it for thin lines. |
| **Connected only / Whole image** | Erase only pixels touching the one you clicked, or every matching pixel anywhere. | Use Whole image to remove the same colour in several separate places. |
| **Edges only / Corners too** | Whether the erase can squeeze through one-pixel diagonal gaps. | Leave on Edges only unless the erase stops short. Corners too can leak through thin outlines. |
| **Edge softness** | A soft fade at the borderline instead of a hard cut. | Use 0 for a hard cut-off. |
| **Opacity** | How completely matching pixels are erased. | Below 100 fades the background instead of removing it. |

4. **Press Apply (or Enter)** to keep it, or **Cancel (or Esc)** to throw it away. Apply is one Undo step. Clicking another spot on the image applies the current one and starts the next, so you can click several times in a row.

**Cleaning up the edge afterwards:** set **Click does** to **Refine edge**, then press **Refine edges**. It finds the boundary between see-through and coloured pixels and lets you change **Feather** (soften the edge), **Edge shift** (grow or shrink the erased area to remove a fringe), **Specks** (remove tiny leftover dots) and **Defringe** (remove the old-background colour halo).

### Tips that matter

- It works on **images**. For text or a shape, use **Rasterize to Image** first.
- It reads the image's **original pixels**, before any filters.
- **Order:** erase first, apply, then refine. The edge settings only apply in the Refine edge mode.
- Hair, fur and fine detail are hard. Lower the Smoothing and use Refine edge with a small Feather.

### What's going on inside

1. **Your click picks a colour.** The app looks at the pixel you clicked and treats it as the "target".
2. **It measures "how similar" every other pixel is.** Not just one number: brightness and colour are measured separately. That's why you have two tolerances. It lets shadows on a white wall match while a coloured object doesn't. Smoothing blurs the picture slightly first, so noise doesn't confuse the comparison.
3. **It decides which matching pixels go.** "Connected only" starts at your click and spreads outwards like paint filling a bucket, stopping at anything that doesn't match. This is called a "flood fill". "Whole image" skips the spreading and takes every matching pixel.
4. **It softens and finishes the edge.** Pixels that only just match are erased partly, so the edge fades. The Refine edge steps then move the cut edge, blur it, delete specks and pull colours away from the old background.
5. **Nothing is changed until Apply.** The preview is drawn from a copy. Apply replaces the image's pixels with the copy, as one Undo step. Cancel throws the copy away. That's why you can change settings freely.

The code lives in `apps/ZEditor/src/render/magicErase.js` (the maths), `apps/ZEditor/src/state/useMagicErase.js` (the preview and Apply/Cancel logic) and `apps/ZEditor/src/model/magicEraser.js` (the settings and what each means).

---

## Part 3: The Unlimited canvas (no paper)

### What it's for

Working without a fixed sheet, like Figma or a whiteboard: put things anywhere, in any direction, and the page grows to hold them. Good for mood boards, laying out pieces before arranging them, or building something whose size you don't know yet.

### How to use it

1. **Start a new one.** Use **New document**, and in the **Paper size** list choose **"No paper: auto-expanding canvas"**. Pick how many pages and press Create. (There's no orientation choice because there's no paper.)
2. **Draw anywhere.** There's no white sheet: you see the dotted background. Use any tool: rectangle, ellipse, text, pen, images. You can start in the middle, or draw out on the grey area around the first view.
3. **It grows by itself.** When you draw close to the edge of the current space (or past it), the page grows to leave room around what you added. It grows left, right, up and down, and it **never shrinks**.
4. **Look around.** Zoom from 10% to 600% and scroll. At 10% you can see a huge area at once.
5. **Save the project** (the Project menu, or Ctrl+S) to keep it. It's stored in a **.znow** file, and the canvas size comes back exactly as you left it.

### Good to know

- It grows only when you let go of the mouse or finger, so nothing jumps while you're dragging.
- When it grows to the left or up, everything is shifted by the same amount and the view moves with it, so you don't notice anything move.
- Undo goes back to the earlier size too.
- **Ruler guides** you've dragged out don't move when the page grows to the left or up, so they can look offset afterwards.
- **Exporting** treats the canvas like a normal page of its current size.
- **Group in the Layers panel:** the three-dot menu on a group row lets you **Save group as .znow**. In the Layers header menu, **Import .znow as a group** brings one back into any page. This is handy for moving pieces between canvases.
- Drawing on the grey area **outside** the page works on normal paper too, not only on this canvas.

### What's going on inside

A normal page has a fixed size. This one has a size too, but the app keeps adjusting it:

1. **After you finish drawing**, the app measures the box that holds *all* the things on the page (their "bounding box").
2. **It compares that with the page size.** If anything is within about 40 pixels of an edge or beyond it, the page is made bigger on that side, until there's about 240 pixels of room beyond the content.
3. **Growing left or up** is the clever bit. A page's top-left corner is always position 0,0. To add space on the left, the app can't put things at negative numbers, so it **slides every item right by the same amount** and makes the page wider, then **scrolls your view by the same amount**. The things stay exactly where they were on your screen, while the page's "0,0" corner quietly moved.
4. **It only does this when you let go**, because moving every item while you're still dragging one would break the drag.
5. **It's saved with the page.** The page remembers that it is a "no paper" one (a flag called `isCanvas`) and its current size, so a saved project reopens the same way.
6. **No sheet:** for this page type the app skips the step that paints the white rectangle, so the dotted background shows through.

The code lives in `apps/ZEditor/src/state/useCanvasGrow.js` (the growing), `apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx` (keeping your view still) and `apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx` (the menu choice).

---

## When something goes wrong

| What you see | What to do |
|---|---|
| Remove & fill left a blurry smudge | Switch Style to **Pattern**, or for plain areas use **Smooth** with some grain. |
| Remove & fill copied the wrong texture | Lower **Copy from within**. |
| A ghost or outline of the old thing remains | Make the box bigger, or raise **Grow the area by**. |
| "Pattern fill could not be used here" | The area is too big. Draw a smaller box, or accept the Smooth fill it used. |
| Magic eraser erased too much | Lower the two tolerances, or switch to **Connected only**. |
| Magic eraser left bits behind | Raise the tolerances, or use **Whole image**. |
| The canvas doesn't grow | You have to let go of the mouse or finger first. Check you created it with "No paper". |
| Something looks wrong on the tablet but fine elsewhere | Close and reopen the app to load the newest version, then tell me what you see. |

Everything here can be undone with **Ctrl+Z**.
