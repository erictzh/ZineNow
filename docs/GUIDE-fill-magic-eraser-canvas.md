# ZEditor guide: Remove & fill, Magic eraser, the Unlimited canvas and Vectorize

Each part has three sections:

1. **What it's for**
2. **How to use it** (the practical steps and settings)
3. **How it works** (what the computer really does, the proper names of the techniques, and why the sliders behave the way they do)

You don't need part 3 to use the tools. It is there so you can understand what's happening, predict what a setting will do, and talk about it with a developer using the right words.

---

## The basics you need first (a short glossary)

| Word | What it means | Picture it as |
|---|---|---|
| **Pixel** | One tiny square of colour. A picture is a grid of them. | A mosaic tile. |
| **RGB / channel** | Each pixel's colour is three numbers from 0 to 255: how much **R**ed, **G**reen and **B**lue. Each one is a "channel". | Three dimmer knobs. |
| **Alpha** | A fourth number per pixel: how **solid** it is. 255 = fully visible, 0 = completely see-through. | How much of a tile is glass instead of paint. |
| **Mask** | A map with one yes/no (or 0 to 1) value per pixel saying "this pixel is selected". | Masking tape over a wall before painting. |
| **Neighbours** | The pixels touching a pixel. **4-neighbours** = up, down, left, right. **8-neighbours** = also the four corners. | The squares around a square on a chessboard. |
| **Algorithm** | A fixed recipe of steps a computer follows. | A cooking recipe. |
| **Vector vs raster** | A **raster** picture is a grid of pixels (blurry when enlarged). A **vector** picture is a list of shapes and curves described by maths (sharp at any size). | A photo versus a cut-out paper shape. |

Everything runs in your browser. Nothing is uploaded anywhere.

---

# Part 1: Remove & fill (take something out and fill the gap)

Technical name: **inpainting** (filling in missing or unwanted parts of an image). Photoshop calls its version "Content-Aware Fill".

## What it's for

You have a picture with something you don't want in it: a stray person, a mark, a bit of text, a cable. You draw around it, and the app replaces it with a fill made from what is around it.

## How to use it

1. **Choose the Marquee tool.** Press **M**, or tap the dotted-box icon in the toolbar.
2. **Draw the area.** Drag a box round the thing, a little **bigger** than the thing, including its shadow or soft edge. For an odd shape, set **Shape** to **Polygon** and tap its corners one by one, then tap the first corner (or press Enter) to close it.
3. **Choose what it works on** (**Works on**):
   - **All visible**: everything you can see on the page, treated as one picture. The fill becomes a **new layer called "Filled area"** on top. Your original is untouched, so hide or delete that layer to get it back.
   - **Selected layer**: only the layer you selected first (select it with the Move tool before pressing M). That layer's own picture is changed.
4. **Set Marquee Action to "Remove & fill".**
5. **Pick a Style:**
   - **Pattern** (the default): copies real texture from elsewhere in the picture. Best for grass, leaves, brick, road and walls.
   - **Smooth**: blends the colours around the edge. Best for plain paper, flat colours and soft backgrounds.
   - **Detailed**: carries thin lines through the gap. Only good for small marks.
6. **Press "Remove & fill".** A big area takes a moment ("Filling…").
7. **Not right? Press "Try another".** It undoes the last fill and fills again with different choices. Press it a few times and keep the best.
8. **Still not right? Change a number under Fine-tune** (use the + and − buttons), then press Remove & fill again. Press **Ctrl+Z** first to replace the last fill rather than fill over it:

| Setting | What it does | When to change it |
|---|---|---|
| **Pattern amount** | 100 = all copied texture. Lower mixes in the smooth blend. | You can see hard seams: try 60–80. |
| **Patch size** | The size of the pieces copied. Small suits fine texture. Large keeps lines and structure. | Branches or bricks look broken: raise it (21–31). |
| **Copy from within** | How far from the area it looks for texture to copy. | It copies the wrong thing (sky into rock): lower it (40–80). |
| **Grow the area by** | Makes the filled area bigger all round. | A halo or fringe of the old thing is left: 4–10. |
| **Grain** | How much noise like the picture's own is added to a smooth fill. | The fill looks flat or plastic. |

**Tips that matter**
- **Cover the whole thing.** A twig, shadow or edge left outside the box gets pulled into the fill. This is the number one reason for a bad result.
- **Small and tight beats big.** Several small fills look better than one big one.
- Pattern works on areas up to about 130 px of the page. A bigger area switches to Smooth by itself and tells you.
- To remove something **and keep it**, set Marquee Action to **Make a new layer**, choose **Cut to a new layer**, and under "What a cut leaves behind" choose **Filled from the surroundings**.

## How it works

### Step 0: Turning your drawing into a "hole mask"

When you press the button, the app first makes a **flat picture** of what you're working on. For "All visible" it draws the whole page into one image at export quality; for "Selected layer" it uses that layer's own pixels.

Then your marquee outline is drawn onto a blank sheet to make a **mask**: a map where every pixel your outline touches is marked **"hole"** and every other pixel is marked **"known"**. (Any pixel the outline touches even slightly counts as hole, so no thin rim of the old thing is left behind.) **"Grow the area by"** simply draws the outline thicker before this, which makes the hole bigger. In maths this is called a **dilation**: the shape swells outwards by N pixels.

The app does not work on the whole page, only on the hole plus a margin of known pixels around it (the margin is bigger when "Copy from within" is bigger). That keeps it fast.

From here on, the three Styles are three different ways of deciding what colour each "hole" pixel should become.

### Style 1: Smooth

Technical name: a **harmonic fill**, which solves **Laplace's equation** with the known pixels as the boundary.

**Picture a stretchy rubber sheet.** Pin its edge to the colours around your hole (red on one side, blue on another). The sheet in the middle relaxes into the smoothest possible surface that joins those pinned edges. That surface is the fill. It has no lines or texture, only smooth blends, which is why it suits plain areas and looks blurry on busy ones.

How the computer finds that smooth surface:
1. **Start with a rough guess:** every hole pixel is set to the average colour of the known pixels.
2. **Relax:** go through the hole pixels over and over, and set each one to the **average of its four neighbours**. Each pass lets colour flow a little further inwards from the edges. This repeated averaging is called **relaxation** (the specific version is **Gauss-Seidel iteration**).
3. **The problem with big holes:** colour only moves one pixel per pass, so a large hole would need thousands of passes. To avoid that the app uses a **pyramid** (also called **multigrid**, or "coarse-to-fine"): it shrinks the picture to half size, solves the shrunken (small, quick) version first, then scales that answer back up and polishes it with a few passes at the full size. It repeats this down several levels. The shrunken answer gets the big colour gradients right quickly, and the polish fixes the details.

### Style 2: Detailed

Technical name: **Telea inpainting** (also called **fast marching method** inpainting, from a 2004 research paper; the same method as OpenCV's `INPAINT_TELEA`).

**Picture the hole filling like a spreading puddle, from the rim inwards, like peeling an onion in reverse.** The app fills the outermost ring of hole pixels first, then the next ring, and so on.

- The order is decided by **distance from the known area** (found with the "fast marching" method, which is a way of working out how far each hole pixel is from the nearest known pixel).
- Each new pixel gets a colour that is a **weighted average of the known pixels within 5 pixels**. Pixels that are nearer, and pixels lying in the direction the edge arrives from, get more weight.
- It also takes into account how the colour is **changing** near each known pixel (the **gradient**), so a line or edge running into the hole continues through it for a short way.

My first version of this got "rainbow starbursts" on photos. Cause: at a sharp edge (a dark twig on blue sky) the gradient is huge, and extrapolating it independently in the red, green and blue channels pushed the channels in different directions. It now carries only the **brightness gradient** and scales the colour by it, so the **hue** stays put. Lesson: Detailed is for thin lines and small marks, not for big photo areas.

### Style 3: Pattern

Technical name: **exemplar-based inpainting**, from the paper by Criminisi, Pérez and Toyama (2004). An "exemplar" is a real sample taken from the picture.

**Picture patching a hole in a brick wall using bricks from the rest of the same wall.** Instead of calculating colours, it copies real chunks.

It repeats this loop until the hole is full:

1. **Find the front line:** the hole pixels that touch known pixels.
2. **Choose where to work next** by a **priority score** for each front pixel: **confidence × data term**.
   - **Confidence** = how much of the little square around the pixel is already reliable. Pixels with lots of known neighbours go first.
   - **Data term** = how strongly a line or edge in the picture is running *into* the hole at that point. Pixels where a line meets the hole go first.
   - Together this means **structure is filled before texture**, so a branch or a brick edge is continued first and the plain areas are filled in afterwards.
3. **Take a "patch":** the square of pixels around that front pixel (15 × 15 by default; that is "Patch size"). Part of it is known, part is hole.
4. **Search for the best match.** The app tries up to about 3,000 candidate squares from the known area (within "Copy from within" of the hole) and scores each by comparing **only the known part** of your patch to the same part of the candidate. The score is the **sum of squared differences (SSD)**: for each pixel, the difference in R, G and B is squared and added up. Smaller is a better match.
5. **Copy.** The hole pixels of your patch are filled by copying the matching pixels of the winning candidate. Because they are real pixels, the grain and texture are real too.
6. **Update** the confidence values and the front line, and go back to step 2.

Why it behaves the way it does:
- **Bigger patch size** copies bigger chunks, so structure like brick courses survives, but there is less variety and more chance of a mismatch.
- **Smaller patch size** copies tiny chunks, so fine texture works, but long lines can break.
- **"Copy from within"** limits the search area. Small means it only borrows from nearby, which stays consistent. Large can borrow from a completely different part of the scene.
- It is slow because step 4 compares thousands of candidates for every patch. The app does it in small slices (a pause for the browser every 30 milliseconds) so the screen doesn't freeze.
- **"Try another"** swaps step 4's "take the single best match" for "pick randomly among the **three** best, using a different random number each time" (a **seeded random generator**, so the same number always gives the same result).
- **"Pattern amount"** below 100 also runs the Smooth fill and **blends the two results pixel by pixel**.
- It **can't invent**: it can only reuse what is already in the picture. That is why foliage and walls work well, and a one-off object does not.

### The last step for all styles: Grain

A smooth fill looks too clean next to a noisy photo. So the app **measures the noise** in the known pixels around the hole: for each pixel it compares its value with the average of its four neighbours, and the typical size of that difference is the noise level. It then adds **random noise of the same size** to the filled pixels (a **Gaussian** pattern, like film grain), from a seeded generator so the result is repeatable. The "Grain" setting scales it up or down.

### Putting the result back

The filled area is cropped to the outline's box and its edge is cut along the outline (with a smooth, anti-aliased edge). It becomes a new image layer ("Filled area") placed on top, or is written into the selected layer's picture. It counts as **one Undo step**.

The code: `apps/ZEditor/src/render/inpaint.js` (Smooth, Detailed, grain), `patchFill.js` (Pattern), `marqueeLayer.js` (the mask, running the fill and placing the result).

---

# Part 2: Magic eraser (erase a colour, or clean up an edge)

Technical names: **colour keying** / **colour-range selection**, plus a **flood fill**. Photoshop's version is the "Magic Wand" and "Magic Eraser".

## What it's for

Removing a background, or any area of similar colour, so it becomes see-through, like clicking a white sky and having it vanish. The cut edge can then be cleaned up.

## How to use it

1. **Select the Eraser tool** and in the right-hand panel set **Mode** to **Magic**.
2. **Click the image** on the colour you want gone. A **preview** opens. Nothing is changed yet.
3. **Adjust until it looks right.** The preview updates as you change settings:

| Setting | What it does | When to change it |
|---|---|---|
| **Brightness tolerance** | How different in lightness a pixel can be and still count as "the same". | Raise it to catch shadows and lighter or darker patches of the same surface. |
| **Colour tolerance** | How different in colour a pixel can be and still count. | Raise it if the background has colour variation. Lower it if the erase spills onto your subject. |
| **Smoothing** | Averages nearby pixels before comparing. | Raise it for grainy backgrounds (paper, carpet). Lower it for thin lines. |
| **Connected only / Whole image** | Erase only pixels touching the one you clicked, or every matching pixel anywhere. | Whole image removes the same colour in several separate places. |
| **Edges only / Corners too** | Whether the erase can squeeze through one-pixel diagonal gaps. | Corners too can leak through thin outlines. |
| **Edge softness** | A soft fade at the borderline instead of a hard cut. | 0 gives a hard cut-off. |
| **Opacity** | How completely matching pixels are erased. | Below 100 fades the background instead of removing it. |

4. **Press Apply (or Enter)** to keep it, **Cancel (or Esc)** to throw it away. Apply is one Undo step. Clicking another spot on the image applies the current one and starts the next.

**Cleaning up the edge:** set **Click does** to **Refine edge** and press **Refine edges**. It finds the boundary between see-through and coloured pixels and lets you set **Feather**, **Edge shift**, **Specks** and **Defringe** (explained below).

**Tips:** it works on **images** (for text or a shape, use **Rasterize to Image** first). It reads the image's **original pixels**, before filters. **Erase first, apply, then refine:** the edge settings only apply in Refine edge mode.

## How it works

### The central idea: a "coverage map"

The app does **not** change the picture while you play. It builds a hidden **coverage map**: one number from 0 to 1 per pixel saying **how much of that pixel to erase** (1 = fully erase, 0 = keep, 0.4 = fade it out a little). All the settings shape this map. Only at the very end is the map turned into the picture's **alpha** (see-through-ness). That is why a preview is possible: changing a slider just rebuilds the map from the untouched original, and Cancel throws it away.

### Step 1: Compare every pixel to the colour you clicked

1. **Smoothing (box averaging).** Each pixel's colour is replaced, for comparing purposes, by the **average colour of the little square around it** (the "Smoothing" number is how many pixels out the square reaches). This stops grain from making a single background look like a thousand slightly different colours. The average is **alpha-weighted**, so pixels that are already see-through don't drag the average towards black.
2. **Split "how different" into two numbers.** For a pixel, the app subtracts your clicked colour to get a difference in red, green and blue. It then separates that into:
   - a **brightness difference**: the average of the three differences (did it get lighter or darker?), and
   - a **colour difference**: what's *left* once the brightness shift is removed (did the hue or saturation change?).
   
   This is why there are two tolerances. A shadow on a white wall differs a lot in brightness but hardly at all in colour, so a high brightness tolerance and a low colour tolerance catches shadows without catching a red object.
3. **Score.** Each difference is divided by its tolerance, and the larger of the two ratios decides: **1 or less = a match** (coverage 1); between 1 and about 1+softness = **a partial match that fades from 1 to 0**; beyond that = no match. That fade is the "**Edge softness**" setting.

### Step 2: Decide which matching pixels to erase

- **Whole image:** every pixel with a score is erased, wherever it is.
- **Connected only:** the app uses a **flood fill**. Think of **pouring paint at the pixel you clicked**: it spreads to a neighbouring pixel only if that pixel matches, then to *its* neighbours, and stops at anything that doesn't. Technically it keeps a "to-do" list of pixels, takes one, scores it, and if it matches adds its neighbours to the list. "**Edges only**" means the paint flows only through the 4 sides of a pixel (4-neighbours); "**Corners too**" lets it also leak diagonally (8-neighbours), which is why it can squeeze through one-pixel diagonal gaps in an outline.

### Step 3: Finish the edge (the Refine edge settings)

All of these work on the coverage map:

- **Specks.** Finds **connected islands** of pixels (technically *connected components*) up to a set size. A small island of "kept" pixels inside the erased area (a speck the match missed) gets erased; in Whole image mode, tiny erased islands elsewhere are put back.
- **Edge shift.** Moves the border in or out. Growing it is a **dilation** and shrinking it is an **erosion** (the two basic shape operations in image processing). It moves **one pixel per pass**, alternating between 4- and 8-neighbour passes so the result comes out roughly round, not diamond-shaped or square.
- **Feather.** **Blurs the coverage map** so the edge fades gradually instead of cutting off. The blur is two **box-blur** passes in each direction (a cheap way of approximating a smooth Gaussian blur). The fade reaches about the "Feather" number of pixels each side of the edge.
- **Defringe.** When you erase a white background, the half-erased edge pixels still carry a bit of white, which shows as a pale halo on a dark background. Defringe pulls the **colour** of those edge pixels towards the **average colour of the fully-kept pixels within 3 pixels**, by an amount that's stronger for pixels that are mostly erased. The old background colour is removed from the edge.
- **Opacity.** Scales the whole map down, so matches are only partly erased.

### Step 4: Apply

Only on **Apply** is the map multiplied into each pixel's **alpha** channel. That replaces the image's pixels with the erased version, as one Undo step. Matches that are only partly covered become partly see-through.

The code: `apps/ZEditor/src/render/magicErase.js` (the maths above), `apps/ZEditor/src/state/useMagicErase.js` (the preview, Apply and Cancel) and `apps/ZEditor/src/model/magicEraser.js` (what each setting means).

---

# Part 3: The Unlimited canvas (no paper)

Technical names: an **infinite canvas** with an **auto-expanding bounds** (as in Figma or a whiteboard app).

## What it's for

Working without a fixed sheet: put things anywhere and the page grows to hold them. Good for mood boards, laying out pieces before arranging them, or building something whose size you don't know yet.

## How to use it

1. **Start one.** Use **New document**, and in **Paper size** choose **"No paper: auto-expanding canvas"**. Pick how many pages and press Create. (There's no orientation choice because there's no paper.)
2. **Draw anywhere.** You see the dotted background instead of a white sheet. Use any tool, including on the grey area around the first view.
3. **It grows by itself.** When you draw near the edge of the current space (or past it), the page grows to leave room. It grows in all four directions and **never shrinks**.
4. **Look around.** Zoom from 10% to 600% and scroll.
5. **Save the project** (Project menu, or Ctrl+S). It's stored in a **.znow** file and the size comes back exactly as you left it.

**Good to know:** it only grows when you let go of the mouse or finger. **Ruler guides** you've dragged out don't move when the page grows to the left or up, so they can look offset afterwards. **Exporting** treats the canvas like a normal page of its current size. Drawing on the grey area **outside** the page also works on normal paper. In the Layers panel, a group's three-dot menu has **Save group as .znow**, and the Layers header menu has **Import .znow as a group**, handy for moving pieces between canvases.

## How it works

### The page is just a rectangle with a size

Every page in ZEditor has a width and height and a **coordinate system**: a way of naming places on the page, with **(0, 0) at the top-left corner**, x going right and y going down. Every item stores where it is as an x and a y in that system. A "no paper" page is an ordinary page, with two differences: it has a flag called `isCanvas` that means "don't paint a white sheet and don't add page numbers", and the program **keeps changing its width and height**.

### The growth rule

After each change (and only once you've let go of the mouse or finger), the app computes the **bounding box** of everything on the page: the smallest rectangle that contains all the items, allowing for rotation and text size. Then:

1. If any item comes within **40 pixels** of an edge, or goes past it, that side needs to grow.
2. The page is grown until there are **240 pixels** of free room between the content and that edge. (Using two different numbers, 40 and 240, means it doesn't grow on every tiny move. It waits until you get close, then makes a generous amount of room. This is called **hysteresis**, as in a thermostat that doesn't flick on and off at one exact temperature.)
3. It never shrinks.

### The clever problem: growing left or up

Adding space on the right or bottom is easy: just increase the width or height. But the top-left corner is always (0, 0), so adding space on the **left or top** means everything has to move:

1. The app **adds the same amount to the x (or y) of every item**, sliding them all right (or down).
2. It makes the page wider (or taller) by that amount.
3. It **scrolls your view by the same amount** the other way, so on your screen nothing appears to move. The page's (0, 0) corner has quietly shifted, but you never see it.

It waits for you to **let go** because sliding every item while you're still dragging one would break the drag.

### Undo and saving

Growing is **not a separate Undo step**: the size and the item positions are saved together in every Undo snapshot, so Undo returns to the earlier size and the earlier positions at once. Saving stores the page's size and the `isCanvas` flag in the .znow file, so it reopens the same.

The code: `apps/ZEditor/src/state/useCanvasGrow.js` (the rule), `ui/canvas/ComposeCanvas.jsx` (keeping your view still) and `ui/dialogs/NewDocumentDialog.jsx` (the menu choice).

---

# Part 4: Vectorize (turn a picture into editable shapes)

Technical names: **image tracing** or **vectorization** (Illustrator calls it "Image Trace"). The result is an **SVG-style vector path**.

## What it's for

A normal picture is a grid of coloured dots, which goes blocky or blurry when enlarged. **Vectorize** turns it into **shapes** (outlines filled with colour) that stay sharp at any size and that you can recolour. Good for logos, line drawings, stamps, stencils, posters, riso or screen-print looks, and cut-paper effects.

## How to use it

1. **Select an image** (Move tool).
2. In the right-hand panel open **Vectorize**, pick a **Preset** (start with **Black & White**) and press **Vectorize**.
3. **A new layer appears above your image**, and the original is **hidden** (not deleted; show it again in the Layers panel).
4. That layer's panel now belongs to the trace, and every change re-traces live:

| Control | What it does | When to change it |
|---|---|---|
| **Preset** | Starting points: Black & White, Line Art, Silhouette, Outline, Shades of Grey, 3, 6 or 16 Colours. | Pick the nearest to what you want, then fine-tune. |
| **Mode** | Black & white, shades of grey, or colour. | Colour for a poster look; Black & white for stamps and stencils. |
| **Threshold** (black & white) | Higher turns more of the picture black. | The drawing is too thin or too heavy. |
| **Colours** (grey/colour) | How many colours the picture is reduced to. | 3–6 for a bold look, 16 for detail. |
| **View** | The result, only outlines, outlines over the source, or the source. | "Outlines with source image" shows how closely it follows. |

5. **Advanced:**

| Setting | What it does |
|---|---|
| **Paths** | Low = loose, smooth, blobby outlines. High = outlines hug the pixels closely. |
| **Corners** | Low = bends become round curves. High = bends become sharp, cut-paper corners. |
| **Noise** | Drops specks and dust smaller than this. |
| **White areas** | **Leave see-through** lets the paper (or what's below) show where the picture was white. |
| **Method** | **Overlapping** hides hairline gaps between colours. **Abutting** makes each shape exactly its own area. |

6. **Create:** choose **Fills**, **Strokes** (outlines) or both, and the stroke width. For an outline-only look, turn Fills off and Strokes on.
7. **Colours:** every traced colour has a row. Recolour it, **Hide** it (e.g. to drop a background colour) or **Reset** it. Your colour changes survive changes to the trace settings as long as the trace finds that colour again.
8. **When you're done:** **Save as SVG** (a vector file that opens in Illustrator, Inkscape, Affinity and browsers); **Expand** (locks the shapes and discards the stored copy of the original, so the project file is smaller; the trace settings then stop working); **Rasterize to Image** (paints the shapes back into pixels so filters and effects can be used).

**Tips:** start with the preset and move one slider at a time. High-contrast pictures trace best; soft shadows give blobs. A grainy photo gives tiny specks: raise **Noise**. The picture is traced at up to **900 pixels on its long side**, so very fine detail in a big photo is lost (the result is still sharp when scaled). The Lomo and Feather effects are not included in what is traced.

## How it works

Vectorize is a three-stage pipeline. Each stage has a proper name.

### Stage 1: Colour quantization (cut the picture down to a few colours)

Technical name: **colour quantization**, done with **k-means clustering**.

- In **Black & white** it is trivial: each pixel's **luma** (brightness, calculated as 0.299 × red + 0.587 × green + 0.114 × blue, which weights green most because our eyes are most sensitive to it) is compared to the **Threshold**. Darker = black, lighter = white.
- In **grey** and **colour** modes the app has to *discover* the best handful of colours. It uses **k-means**, which works like this:
  1. Take a sample of up to 20,000 pixels (enough to find the colours, quick to process).
  2. Pick *k* starting colours (k is your "Colours" number), spread evenly from dark to light, so the same picture always gives the same result.
  3. Give every sampled pixel to its **nearest** starting colour (nearest in RGB space, using the squared distance).
  4. Replace each colour with the **average of the pixels that chose it**.
  5. Repeat (up to 12 rounds) until the colours stop moving.

  Picture sorting a pile of sweets into k bowls: each sweet goes to the bowl whose "average sweet" is most like it, then you recompute each bowl's average, and repeat until no sweet changes bowl.
- Then **every** pixel is given the label of its nearest final colour. Pixels that are mostly see-through, and (with "White areas: see-through") near-white ones, are labelled "none".

The result is a **label map**: every pixel says "I belong to colour 3". Fewer colours means a flatter, more poster-like result.

### Stage 2: Contour tracing (find the outlines)

Technical name: **boundary / contour tracing** along pixel edges.

For each colour, the app builds a **mask** of the pixels that have that label, then walks round its edges:

1. It looks at every pixel in the mask and records which of its four sides border a pixel that is *not* in the mask. Those sides are the boundary.
2. It then **joins those little edges end to end** into closed **loops**, always keeping the inside on the right-hand side as it walks. A blob gets one loop going clockwise; a **hole** inside a blob gets a loop going the other way. This directed-loop trick is what lets the shapes be filled correctly later (the "**non-zero winding rule**": a point is inside if the loops wind round it a non-zero number of times).
3. At this point the loops are **staircases**, because pixels are square. A diagonal line is a jagged zigzag.

With the "Overlapping" method, each colour's mask also includes every colour drawn *above* it. That way, when smoothing later nudges the edges slightly, there is never a thin gap where the paper shows through between two colours.

### Stage 3: Curve fitting (smooth the stairs into curves)

Technical names: **Ramer–Douglas–Peucker simplification** and **Bézier-style smoothing**, written as an **SVG path**.

1. **Midpoints.** The app takes the **middle of each little edge** along a loop instead of the corners. This alone turns one-pixel steps into diagonals, so the stairs soften.
2. **Simplify.** It runs **Douglas–Peucker**: draw a straight line between two points, find the point of the outline that is furthest from the line, and if it's farther than a tolerance, keep it and split the problem there; otherwise throw away everything in between. The result keeps **the fewest points that stay within the tolerance** of the original outline. This is what the **Paths** slider controls: a loose tolerance makes smooth, blobby, few-point outlines; a tight one hugs every pixel.
3. **Corners or curves.** At each remaining point the app measures **how sharply the outline turns** (the **turn angle**). If it's sharper than a threshold it stays a **sharp corner**; otherwise it is **rounded** by a curve that starts and ends on the two sides of the corner. The **Corners** slider sets that angle threshold: low means almost everything is rounded, high means most bends stay sharp.
4. **Drop tiny shapes.** Any loop smaller than a set area is discarded. That is the **Noise** slider; it removes specks and dust.
5. **Write the path.** Each colour becomes one **SVG path**: a text string of commands such as "move to here, curve to there, close the shape" (the same format an Illustrator or Inkscape file stores). Colours are stacked in order, most-used colour at the bottom.

### What gets stored, and the three buttons at the bottom

The layer stores **the paths** (the shapes) and **a copy of the source picture**, so changing a slider can re-run the three stages. **Expand** deletes that copy, so the shapes are fixed but the file is smaller. **Rasterize** paints the finished shapes back into ordinary pixels. **Save as SVG** writes just the paths to a standalone file.

The code: `apps/ZEditor/src/model/trace/` (`quantize.js` = stage 1, `contours.js` = stage 2, `curves.js` = stage 3, run in order by `traceImage.js`; `traceSettings.js` holds the presets and what each slider means), `state/useImageTrace.js` (live re-tracing) and `ui/panels/format/TraceFormat.jsx` (the panel).

---

## When something goes wrong

| What you see | What to do |
|---|---|
| Remove & fill left a blurry smudge | Use **Pattern**; for plain areas use **Smooth** with some grain. |
| Remove & fill copied the wrong texture | Lower **Copy from within**. |
| A ghost or outline of the old thing remains | Make the box bigger, or raise **Grow the area by**. |
| "Pattern fill could not be used here" | The area is too big. Draw a smaller box, or accept the Smooth fill it used. |
| Magic eraser erased too much | Lower the two tolerances, or switch to **Connected only**. |
| Magic eraser left bits behind | Raise the tolerances, or use **Whole image**. |
| Magic eraser left a pale halo | Use Refine edge: raise **Defringe** and/or **Edge shift**. |
| The canvas doesn't grow | Let go of the mouse or finger first. Check you created it with "No paper". |
| Vectorize gives blobs or too much detail | Change **Colours**, **Paths** and **Noise** one at a time. High-contrast pictures work best. |
| Vectorize result has tiny specks | Raise **Noise**. |
| Something looks wrong on the tablet but fine elsewhere | Close and reopen the app to load the newest version, then tell me what you see. |

Everything here can be undone with **Ctrl+Z**.
