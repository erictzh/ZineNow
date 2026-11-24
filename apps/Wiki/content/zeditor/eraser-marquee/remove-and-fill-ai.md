## Intro

**Remove & fill with AI** repairs the marked area with **MI-GAN**, a small neural network trained to *imagine* what should be behind an object. It handles photos with complicated backgrounds, where the classical fills can only blur or copy. It runs **on your device**: nothing is uploaded. It is an experimental feature: switch on "Experimental AI features", and download the model first (a pop-up shows its licence, size and source).

## How to use

1. Turn on **Experimental AI features** (the gear at the bottom left). In the Marquee panel, *Remove & fill → Style → AI (on-device)*.
2. Press **Download** for the model (MI-GAN, about 28 MB, MIT licence, plus the AI engine ONNX Runtime if you do not have it yet; **Cancel** or **Delete** it any time; after downloading it works offline).
3. Mark the area (any [Marquee](zeditor/eraser-marquee/marquee) shape) and press **Remove & fill**. **Grow** makes the area a few pixels bigger, which often helps: the model does better when the area covers the object's soft edges and shadow.
4. **Try another** undoes that fill and fills again with a slightly different view: the model gives the same answer for the same input, so each press shows it a different window. There is a fixed cycle of 7 variations.
- Very big areas ("too big for the AI") must be marked in smaller parts. Up to 12 separate areas can be done at once.

## How it works

### GAN inpainting

MI-GAN is a **generative adversarial network (GAN)** model: a network trained against a "critic" network that tried to tell its repairs from real photos, until its repairs were convincing. For inpainting it is given the picture with a hole and a **mask** that says where the hole is, and it **generates** plausible content for the hole, including textures and objects, based on millions of example photos. It cannot know the truth, it **imagines** something believable.

### The model has a fixed size

MI-GAN works on a **512 × 512** square. A bigger picture cannot be fed in whole, so the code cuts a **square window** around the marked area (with surroundings for context, at least 1.5 times as big as the area), **scales** it to 512 × 512, lets the model fill it, scales the answer back to the window's real size, and **pastes it back only where the area was**, with a short soft fade at the edge so the join does not show. Everything outside the window stays exactly as it was.

### Several objects

Marks far apart are filled one after another, each with its own window. Marks whose windows would overlap are filled **together**, so a window never contains marked pixels it is not filling. First the marked pixels are split into separate **connected pieces** (a flood fill that treats diagonal neighbours as connected), then pieces are **grouped**: if two pieces' windows overlap, they are merged into one group, repeatedly, until no two groups' windows overlap.

### The model's input

Four channels of numbers: channel 0 is **"known − 0.5"** (0.5 where the picture is known, −0.5 in the hole); channels 1–3 are red, green and blue scaled to −1…1, with the hole **blanked to 0**. Models differ on which way round the mask channel goes, so the app **tests** it once on a made-up smooth picture with a round hole: the right orientation gives back the smooth picture inside the hole; the wrong one gives something else.

### Try another

The network is **deterministic**: the same input always gives the same answer. So "try another" changes the *input* a little: the window is **moved** sideways or up/down by 12% or 8% of its size, made 25% bigger or 15% smaller, and the area **grown** by 1–3 pixels (never shrunk, which could leave a ring of the old object). Variation 0 is the normal fill; the seven variations repeat in a fixed cycle (press number N always gives variation N mod 7).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `aiFillMask`: the whole job

```js file=shared/js/ai/fillMask.js fn=aiFillMask
```

**The Logic:**
- `variationFor(variation)` picks the variation's numbers. `buildMask(v.grow)` makes the mask of the marked pixels, grown by the caller's amount plus the variation's.
- `labelPieces` splits the mask into connected pieces (with a bounding box each); no pieces means nothing marked (returns false). `groupPieces` groups them. If a group has no `crop` (too big), or there are more than 12 groups, it throws an **error** with a plain-language message.
- For each group: the window `crop` is either the standard one or, for a "Try another", moved by `varyCrop`. The group's own mask (`groupMask`) is used.
- The window is drawn onto a 512 × 512 canvas (`drawImage` from the big canvas's source rectangle to the full small canvas), with `imageSmoothingQuality = "high"` (a good-quality resize). `getImageData` reads its bytes.
- `runOnSession(rgba, windowMask(...), onStatus)` runs the model (an `await`: it takes a moment) and returns the answer as 512 × 512 RGBA bytes.
- The answer is scaled back to the window's size and **pasted only over the marked area**: `blendWeights` gives a weight per pixel (1 inside the area, a short fade just outside it, 0 elsewhere), and `paste` mixes the answer with the picture by those weights. `putImageData` writes the window back.

### `cropWindow`: which square to hand the model

```js file=shared/js/ai/fill.js fn=cropWindow
```

**The Logic:** `need` is the longer side of the area's box; `short` the picture's shorter side. If the area is more than 92% of the short side, no window fits (`null`). Otherwise `side = max(512, ceil(need × 1.5))` (never smaller than the model's size, and at least 1.5 times the area, for context), but no bigger than the picture's short side. The window is **centred on the area** and then clamped to stay inside the picture: `min(max(0, centre − side / 2), w − side)`.

**Worked example (real output).** A 1000 × 800 picture. An area of 60 × 70 px at `x 400…459`, `y 300…369`: `need = 70`, `side = max(512, 105) = 512`; centre `(430, 335)`; `x = 430 − 256 = 174`, `y = 335 − 256 = 79`: window **`(174, 79)` 512 px**. An area of 400 × 200 at `x 100…499`, `y 100…299`: `need = 400`, `side = max(512, 600) = 600`; the centre `(300, 200)` would put the window at `x = 0` (300 − 300 = 0), `y = −100` clamped to 0: **`(0, 0)`, 600 px**. An area 800 px wide on a picture with a short side of 800: `800 > 0.92 × 800 = 736`: **`null`**, "too big for the AI".

### `windowMask`, `buildInput`, `outputToRgba`

```js file=shared/js/ai/fill.js fn=windowMask,buildInput,outputToRgba
```

**The Logic:**
- `windowMask`: the model's mask is 512 × 512 but the window may be bigger (`k = side / 512`). For each mask pixel, the block of picture pixels it covers is examined; **any marked pixel in the block marks the whole block** (`hit`), so a thin mark does not vanish when scaled down.
- `buildInput`: for each pixel, `known = hole ? 0 : 1`. Channel 0 is `sign × (known − 0.5)`; channels 1–3 are `(rgba / 127.5 − 1) × known`: a colour value 0–255 scaled to −1…1 (127.5 is the middle), and multiplied by `known` so the hole is **blanked to 0**. `sign` flips the mask channel for models that expect it reversed. The result is `4 × 512 × 512` numbers in one `Float32Array`, laid out channel by channel.
- `outputToRgba`: models differ in the range of their answer, so the range is **guessed from the values**: sampling every 7th value, a minimum below −0.01 with a maximum up to 1.5 means "signed" (−1…1: `(v + 1) × 127.5`); a maximum up to 1.5 only means "unit" (0…1: `v × 255`); otherwise they are already bytes. Alpha is 255 (fully opaque).

**Worked example (real numbers).** A known pixel with red 200 (green and blue also 200): mask channel `1 × (1 − 0.5) = 0.5` (or −0.5 with `sign = −1`); red channel `200 / 127.5 − 1 =` **0.569**. A hole pixel: mask channel `−0.5`, colours **0**. An answer value of −1 becomes `(−1 + 1) × 127.5 =` **0**, +1 becomes **255**, 0 becomes **127.5 → 128** (mid grey).

### `blendWeights` and `paste`

```js file=shared/js/ai/fill.js fn=blendWeights,paste
```

**The Logic:** the answer is only used where the area was, so the join must not show. `blendWeights` starts with `inside`, 1 for marked pixels in the window. It **blurs** that mask with a `(2 × feather + 1)`-wide box (using the same sliding-window sum as the feather blur: `rowSum` then columns), multiplies by 2 and caps at 1 (so the soft ring reaches full strength sooner), then sets marked pixels to exactly 1. The result is 1 inside the area, a ring fading from about 0.67 to 0 just outside, 0 elsewhere. `paste` then mixes each pixel: `picture + (answer − picture) × weight`, a **linear interpolation**: weight 1 takes the answer, 0 keeps the picture.

**Worked example (real output).** A 10 × 10 window with a 3 × 3 marked area at `x 4…6, y 4…6` and feather 1 (a 3 × 3 blur window). The weights of rows 3 to 6, left to right:
`0 0 0 0.22 0.44 0.67 0.44 0.22 0 0` (row 3: just above the area),
`0 0 0 0.44 1 1 1 0.44 0 0` (row 4: inside is 1),
`0 0 0 0.67 1 1 1 0.67 0 0`, `0 0 0 0.44 1 1 1 0.44 0 0`.
A pixel just outside the left edge sees 3 marked pixels in its window: `3 / 9 × 2 = 0.67`; at a corner only 1: `1 / 9 × 2 = 0.22`. So at 0.67 the picture is mixed two-thirds with the model's answer: a soft, seamless edge.

### `labelPieces` and `groupPieces`

```js file=shared/js/ai/fill.js fn=labelPieces,groupPieces
```

**The Logic:**
- `labelPieces` is a **connected-component labelling** with an explicit **stack**: for each marked pixel not yet labelled, give it a new number, then repeatedly pop a pixel, update the piece's bounding box, and push every unlabelled marked neighbour (the 8 around it, corners included: the nested `dy`/`dx` loops). It returns a `labels` array (0 = unmarked) and a box per piece.
- `groupPieces` starts with one group per piece and a window for each (`cropWindow`). The loop `while (merged && …)` looks for two groups whose windows **overlap** (or where one has no window): they are merged (their boxes combined, a new window computed), and the search restarts (`break outer` leaves both loops; `outer:` is a **label**). It ends when no merge happens. The groups are sorted top to bottom and left to right.

**Worked example (real output).** A 10 × 10 mask with three marked pieces: a 2 × 2 block at the top left, a 2 × 2 block at `(3, 2)`, and a single pixel at `(9, 9)`. `labelPieces` finds 3 pieces with boxes `(0,0)-(1,1)`, `(3,2)-(4,3)`, `(9,9)-(9,9)`. Note that the first two are not touching (columns 2 is empty between them), so they are separate pieces. On a real photo the three windows (each at least 512 px) would overlap and be merged into **one** group; on a very large picture, far-apart marks stay separate groups, each with its own model run.

### `dilate`: growing the area

```js file=shared/js/ai/fill.js fn=dilate
```

**The Logic:** the area is grown by `r` pixels in a **square** shape, one direction at a time (a "separable" dilation, much cheaper than checking a full square around every pixel). For each row, it sweeps left to right remembering the last marked x (`last`), and marks a pixel if it is within `r` of it; then right to left the same way. Then the same for columns. **Worked example (real output).** A row `[0,0,1,0,0,0,0]` grown by 1 gives **`[0,1,1,1,0,0,0]`**.

### `varyCrop` and `variationFor`: "Try another"

```js file=shared/js/ai/variations.js fn=variationFor,varyCrop
```

**The Logic:** `variationFor(n)` picks entry `n` of the list of 7 with a **modulo that is safe for negative numbers**: `((n % 7) + 7) % 7`. `varyCrop` changes the window: `side` is the old side times the scale (clamped to the picture; if it would no longer cover the area it keeps the old side). The new centre is the old centre moved by `dx × side`, `dy × side`. The window is then **clamped** four times: to the picture, to still contain the whole area, and again to the picture; if it still cannot contain the area it returns the original window unchanged.

**Worked example (real output).** A 1000 × 800 picture, the standard window `{ x: 100, y: 100, side: 512 }`, an area at `x 300…340, y 300…340`:
- Variation 1 (`dx = −0.12`): the centre `356` moves by `−0.12 × 512 = −61`, to 295: **`{ x: 39, y: 100, side: 512 }`**: shifted left, so the model sees more of the left side.
- Variation 5 (`scale = 1.25`): `side = round(512 × 1.25) = 640`: **`{ x: 36, y: 36, side: 640 }`**: a wider view, so it is scaled down more when fed to the model, giving different content.
- The variation numbers cycle: 7 is variation 0 again; `variationFor(8)` is variation 1; `variationFor(−1)` is variation 6 (`dx 0.08, dy 0.08, scale 0.85, grow 3`).

### `tryAnotherFill`

```js file=apps/ZEditor/src/state/useMarquee.js fn=tryAnotherFill
```

**The Logic:** `seed` is the previous one plus 1 (the variation number; also used by Pattern fill for another random pick of patches). `last` remembers how deep the undo list was just after the last fill; `canUndo` is true only if **nothing else has been done since** (the undo list is still that deep and it is the same page): then the last fill is **undone** (`hist.handleUndo()`) so the new one starts from the original picture, not on top of the previous fill. `setTimeout(…, 120)` waits for the undo to be applied before the new fill reads the page; 0 if there was nothing to undo. **Worked example.** First fill: `fillSeed = 0`, variation 0. Press Try another: `seed = 1`, undo, fill with variation 1. Press again: `seed = 2`, undo that fill, variation 2 (the window moved right). After you do anything else (say, move a layer), `canUndo` is false and the next Try another fills on top of the result instead.

### `findMaskSign`: which way round?

```js file=shared/js/ai/fill.js fn=findMaskSign
```

**The Logic:** it builds a made-up **smooth picture** (red rising left to right, green rising downwards, blue rising along the diagonal) with a **round hole** of radius 60 in the middle (`hypot(x − 256, y − 256) < 60`). The function `run(rgba, hole, sign)` is the model; it is run with each sign (1 and −1). For each, the **mean absolute difference** inside the hole between the model's answer and the known smooth truth is measured (`errors`). The sign with the **smaller error** is returned: a model with the right orientation fills the hole with the continuation of the smooth gradient; one with the wrong orientation does not. A simple, automatic **calibration**.
