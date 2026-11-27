## Intro

**Page → Size** changes the paper size of a **blank** page, for example to turn an A5 page into an A4 sheet or into a name card. **New document** also lists **name card sizes**: 90 × 55 mm, 90 × 54 mm, 85.6 × 54 mm (bank-card size) and the US business card 3.5 × 2 in. Picking one switches the orientation to **landscape**, the way cards are usually made (you can switch it back).

## How to use

1. Open **Page → Size → Set…** (it is greyed out for pages made from a PDF, and for the no-paper canvas).
2. Choose a **Paper size** from the list (A3 to Digest and the name cards), or **Custom size (mm)** and type the width and height. For a list size, pick **Portrait** or **Landscape**.
3. The line **Will be … × … mm** says what you will get. It is the **trimmed** size: a page with a bleed stays that much bigger on every side.
4. **Apply to this page** or **Apply to all pages** (all blank pages; pages added later follow it). It is one undo step.

- Items stay exactly where they were, measured from the top-left corner. The size is **not a scale**: a bigger page just has more room, a smaller one may cut items off (move them back in).
- The row shows the page's current trimmed size.

## How it works

`model/pageSize.js` turns a trimmed size in mm into the page's whole size in points (adding the bleed on every side, as `model/bleed.js` does), and `state/usePageSize.js` applies it to the chosen blank pages in one undo step and makes new thumbnails. The list of sizes is `NEW_DOCUMENT_PRESETS` in `constants.js`; the name cards are marked `preferLandscape` and `noSize` (their label already says the size).
