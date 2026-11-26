## Intro

Wherever ZEditor asks for a colour (text, shapes, strokes, page numbers, image tones, vectorized colours), the round colour button opens ZEditor's **own colour picker**. It looks and works the same on every browser, computer and tablet. (The browser's built-in picker is different on each, and cannot be styled or used well by a finger.)

## How to use

- Click or tap the round colour button. A small panel opens beside it.
- **The big square:** left to right is how strong the colour is (saturation), bottom to top is how bright it is. Drag the small ring.
- **The tall bar:** the hue (the "which colour" slider: red, magenta, blue, cyan, green, yellow). Drag the marker or click on the bar.
- **Hex:** type or paste a colour like `#E63946`, `E63946` or even `#e39`. **R, G, B:** the same colour as three numbers from 0 to 255; you can also type `26, 26, 26` or `rgb(26 26 26)` into the Hex box.
- **In this document:** the colours already used on your pages (most used first), so you can match one exactly. It also lists colours stored by effects that are switched off.
- **Recent:** the last colours you picked, kept in this browser. **Zine colours:** a few ready colours (black, ink, grey, white, paper cream, punk red, orange, yellow, green, blue, purple, pink).
- **Pick a colour from the screen:** an eyedropper, shown only in browsers that support it (Chrome and Edge).
- Click anywhere outside, or press **Esc**, to close. Changes apply as you drag.

## How it works

### Two ways of describing a colour

Screens make colour from **R**ed, **G**reen and **B**lue light, each 0 to 255; a hex code like `#E63946` is just those three numbers in base 16. People think differently: *which colour* (hue, 0 to 360° round a wheel), *how pure* (saturation) and *how bright* (value). That is **HSV**, and the square and the bar draw it. `rgbToHsv` and `hsvToRgb` convert between the two; the colour you finish with is always stored as the same `#rrggbb` text as before, so older projects are unaffected.

### Keeping the hue

A grey or black has no hue, so converting a hex code back to HSV would lose it and the hue bar would jump to red while you drag. The picker keeps its own HSV values while you work and only re-reads the hex code when something else changes the colour (a swatch, Undo).

## Code

### Hex, RGB and HSV

```js file=apps/ZEditor/src/model/colorSpaces.js fn=rgbToHsv
```

```js file=apps/ZEditor/src/model/colorSpaces.js fn=hsvToRgb
```

```js file=apps/ZEditor/src/model/colorSpaces.js fn=parseColorText
```

**The Logic:** `rgbToHsv` finds the brightest and darkest channel; their gap `d` is the saturation's raw size; which channel is brightest decides which part of the colour wheel the hue sits in. `hsvToRgb` does the reverse in six slices of 60° each. `parseColorText` accepts the shapes of colour people type: 6 or 3 hex digits, or three numbers up to 255, and gives back `null` for anything else.
