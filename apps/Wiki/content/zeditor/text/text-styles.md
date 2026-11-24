## Intro

A **text style** saves a whole look (font, size, colour, spacing, case, paragraph settings and effects, but not the words, position or photo) under a name, so you can give it to other boxes in one click. Boxes **linked** to a style follow it: change the style and they all change. This is the idea of **paragraph styles** in InDesign and Word.

## How to use

In the Text panel's **Presets** section:
- **H1, H2, H3, P, Quote, Remark** are built in. They are sized for an A5 zine (P is 11 pt; H1 is twice that). Clicking one gives the box that look as a plain copy (not linked).
- **Save:** type a name, press Save. The box is now **linked** to the new style (it shows as a highlighted chip). Pick **Based on** another style to store only what differs from it.
- Click a saved chip to apply it and link the box.
- **Update style:** make the box's current look the style's new definition: every linked box follows, except the settings each has changed on its own.
- **Reset changes:** drop this box's own changes so it matches the style again. **Unlink:** keep the look, stop following.
- Styles are saved in the project file and in the browser.

## How it works

### The box keeps its own settings

A linked box does **not** look its style up each time it is drawn. It carries `styleName` and all the settings itself. This keeps all drawing code simple (it knows nothing about styles). A style change is applied by **copying** the new settings into every linked box, which is what "Update style" does.

### Overrides

When you change a setting on a linked box, its name is added to `styleOverrides`. On a later update, those settings are skipped, so your one-off change survives. "Reset changes" clears the list and re-copies.

### Based-on styles: inheritance

A style can be based on another, storing only the **difference** (`styleDiff`). To find its full look, the code walks up the chain of "based on" links, collects the styles from the base to the child, and merges them so that later (more specific) ones win. A `null` value in a child means "remove what my base sets". A cycle (A based on B based on A) or a missing base just stops the walk.

### What a style contains

`TEXT_STYLE_PROPS` lists exactly which settings belong to a style: the basics (font, size, bold, italic, underline, colour, align), spacing, case, direction, fill opacity, the paragraph settings, and every effect with all its controls.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `captureTextStyle`

```js file=apps/ZEditor/src/model/text/textStyles.js fn=captureTextStyle
```

**The Logic:** it makes an empty object `props` and copies into it every property from the list `TEXT_STYLE_PROPS` that the box actually has (`!== undefined`). `forEach` runs a function once per list item. The result contains only what the box has set: a box with only a font size set gives `{ fontSize: 16 }`. The words, position and photo are not on the list, so they are never captured.

### `textStylePatch`: giving a box a style's look

```js file=apps/ZEditor/src/model/text/textStyles.js fn=textStylePatch
```

**The Logic:** a **patch** is an object of changes to lay over a box. For every property in the list: if the style sets it, copy the style's value; else if it is one of the four resets (bold, italic, underline off, align left), set that; else if it is not one of the kept three (font, size, colour), set it to `undefined` (which removes it, giving the default). So applying a style **fully decides** the look: it does not mix with leftovers of the old look, except for the font, size and colour a style does not mention. Built-ins do not set font or colour, so they respect yours.

**Worked example.** Applying the built-in **H1** (`fontSize 24.2, bold true, lineSpacing 110`) to a box that was italic, centred and had a drop shadow: `fontSize`, `bold` and `lineSpacing` are copied; `italic` becomes `false`, `underline` `false`, `align` `"left"`; the shadow, case, tracking and everything else on the list become `undefined` (removed). The font family and colour stay as they were.

### `resolvedStyleProps`: inheritance

```js file=apps/ZEditor/src/model/text/textStyles.js fn=resolvedStyleProps
```

**The Logic:**
- `chain` will hold the styles from the base to the style asked for, and `seen` the names already visited (a **Set**, for cycle protection).
- The `for` loop starts at the style named `name` and repeats: add it to the **front** of the chain (`unshift`), then move to the style it is `basedOn` (or `null`, ending the loop). It also ends when a style has already been `seen`.
- `Object.assign({}, ...chain.map((s) => s.props))` merges the `props` objects in order into one new object: later ones overwrite earlier ones.
- A final loop deletes any property whose merged value is `null`: in a child style, `null` means "this style removes what its base sets".

**Worked example.** Styles: **Body** = `{ fontSize: 12, lineSpacing: 140 }`; **Lead** based on Body = `{ fontSize: 16, bold: true }`; **Plain** based on Lead = `{ bold: null }`. `resolvedStyleProps(styles, "Plain")`: the chain is [Body, Lead, Plain]; merged: `{ fontSize: 16, lineSpacing: 140, bold: null }`; the `null` is deleted: **`{ fontSize: 16, lineSpacing: 140 }`** (real output).

### `styleDiff`

```js file=apps/ZEditor/src/model/text/textStyles.js fn=styleDiff
```

**The Logic:** it compares a captured look with its base's. For each key in `captured`, if its value differs from the base's (compared by writing both as JSON text, `JSON.stringify`, which works for any value), it is kept in `diff`. Then for each key the base has that the captured look does **not**, `diff[key] = null`: the "remove it" marker. **Worked example.** Base `{ fontSize: 12, lineSpacing: 140 }`, captured look `{ fontSize: 16, lineSpacing: 140, bold: true }`: the diff is **`{ fontSize: 16, bold: true }`** (the equal `lineSpacing` is not stored).

### `withStyleOverrides`

```js file=apps/ZEditor/src/model/text/textStyles.js fn=withStyleOverrides
```

**The Logic:** when a setting of a linked box is changed, this adds its name to the override list. It does nothing (returns the patch unchanged) if the box is not linked, or the patch itself is changing the link. `changed` keeps only the changed keys that are style properties (`text` is not). `new Set([...current, ...changed])` merges old and new names without duplicates. If nothing new was added (`merged.length === current.length`) the patch is returned as is, otherwise the patch plus the new list. **Worked example.** Box linked to "Body" (`styleName: "Body"`), patch `{ fontSize: 20, text: "x" }`: only `fontSize` belongs to a style, so the result is **`{ fontSize: 20, text: "x", styleOverrides: ["fontSize"] }`**.

### `relinkPatch`: following a changed style

```js file=apps/ZEditor/src/model/text/textStyles.js fn=relinkPatch
```

**The Logic:** it returns `null` (nothing to do) if the box is not a linked text box or its style is gone. `full` is the complete patch for the style's current resolved look. `keep` is the set of overridden names. The loop builds `patch` from every key of `full` that is **not** in `keep`. **Worked example.** A box linked to Body has `styleOverrides: ["fontSize"]`. You redefine Body (`fontSize` 13, `lineSpacing` 150). The patch has `lineSpacing: 150`, `bold: false` and so on, but **no** `fontSize`: the box keeps the size you chose for it.

### Reading saved styles safely

```js file=apps/ZEditor/src/model/text/textStyles.js fn=readStoredTextStyles
```

**The Logic:** `localStorage` is a small key-value store in the browser. Its value is text, so it is read back with `JSON.parse`. The `try { … } catch (err) { return []; }` makes any failure (storage blocked, text damaged) harmless: the result is simply "no saved styles". `Array.isArray(saved) ? saved.filter(...) : []` makes sure it really is a list, and drops entries lacking a name or props.
