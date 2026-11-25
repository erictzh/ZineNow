# Ideas and decisions to come back to

A running list of what the maintainer and Claude have discussed but not built yet. Newest section last. Each item says its state: **decided**, **open question**, or **idea**.

## 1. Positioning and marketing (discussed 2026-11-25)

State: **decided** unless marked.

- **Audience:** independent artists, anarcho-punks, DIY people, leftists and anarchists who print zines on a home printer (sometimes a neighbourhood print shop). Many experienced, and the aim is to bring beginners in with a low entry barrier. Not for agencies that need strict PSD/CMYK workflows or an all-in-one suite.
- **Core promise:** everything needed to make a zine, light on low-end devices (to be measured: **open question**), free forever, on-device and private, no login.
- **Priorities in the pitch:** free, easy to pick up, features, convenient, customizable, secure.
- **Proudest of:** the essentials from Photoshop, Scribus and InDesign without the bloat; the image effects, especially halftone. Say "the essentials for zines", not "all the features".
- **Honesty:** list what is stable / beta / experimental and what is missing (PSD, CMYK) openly. Accept criticism.
- **Money:** always free. No donations for now.
- **Voice:** friendly, punk, DIY, anti-establishment, anti tech-feudalism. Name from *Now* (Invisible Committee) and *Inhabit*. Orange dark theme (the "little orange book" spirit).
- **Success:** users who genuinely like it and feel the spirit, and people who take it as a base for their own tools. Not user counts or likes.
- **Where to share:** school, work, kopitiam, activist spaces and meetings, zine fests, protests. **Open question:** which first community to ask for feedback.
- **Anonymity:** prefers low-key / anonymous. GitHub name `erictzh` is already public in the repository (decide whether to use a separate handle).
- **Proof:** two zines made fully with ZineNow in one night (use as examples or templates). A tester would be fine if anonymous.
- **First task for newcomers:** make a one-sheet folded minizine.
- **Time available:** about 20–40 hours per week.
- **Next steps (not done):** landing page text, a 30-second halftone demo, a "fold a zine from one sheet" tutorial from the wiki, a "report a problem" link, test on a real phone and tablet.

## 2. CMYK and print-ready PDF (discussed 2026-11-25)

- **Today (say publicly):** RGB only. Plan to show as a roadmap, not dates.
- **Idea: a PDF converter** (RGB PDF to print-friendly PDF). **Prototype done, not committed**, in the scratchpad (`.../scratchpad/cmyk/convert.cjs`, `make-sample.cjs`; may be cleaned up). It converts black and greys to K-only (one ink), grey pictures to one-channel greyscale, colour pictures and colours to CMYK with a plain formula, and keeps transparency. Checked with `pdfimages` and rendered comparisons on a small test PDF.
- **Known limits of the prototype:** JPEG pictures and predictor-encoded pictures are left as RGB; gradients/patterns not converted; colour detection is text matching (fine for pdf-lib-style pages, fragile for odd PDFs); colours look duller without an ICC profile; only a tiny page was tested, not a real ZEditor export.
- **Stages:** (1) black/grey to K-only, (2) grey pictures to greyscale, (3) colour pictures with a simple formula and a clear warning, (4) text and shape colours as CMYK, (5) ICC profiles later (needs a profile with a compatible licence and a conversion library).
- **Question: merge into ZineArranger?** ZineArranger currently draws pages onto canvases and prints them with the browser, so its output is RGB pictures and would undo CMYK. Merging properly needs ZineArranger to build the PDF itself (pdf-lib, real pages on sheets), which would also give sharp text, smaller files and Save PDF without the print dialog. **Open question.** Leaning: build the converter as a shared module (`shared/js`) with a small standalone page first; decide the ZineArranger output rewrite separately after re-reading its print path.
- **Next steps:** try the prototype on a real ZEditor export; then decide standalone app vs shared module.

## 3. Other observations

- ZEditor already has **Tracking** (character spacing, -10 to 100 % of font size) for a whole text box. **Open question:** per-selection (span) tracking has not been checked.
- Middle-button drag to pan was added to ZEditor (PR #130) but not yet tried in a real browser.
- The wiki is complete (132 pages) and installable as an app. The wiki build number only changes when page content changes, not styles (**idea:** make it include styles too).
- A readable Markdown copy of the wiki for GitHub was **parked** by the maintainer.

## 4. New ideas (add below)

### 4.1 Ready-made page layouts in ZEditor (2026-11-25) — idea, feasible

- **What:** pick a layout (like slide apps do) and get a page with light-grey rectangles as picture slots and text boxes filled with lorem ipsum (the app already has placeholder text, `model/text/placeholderText.js`).
- **How (sketch, not built):** layouts are a small data table of slots with positions as fractions of the page (so they fit any page size and respect the Page Guide margins): kind (picture / title / body / caption), x, y, width, height. Applying one creates ordinary items (`rect` and `text`, like `handleAddRect` / `handleAddText` in `state/useAnnotationEdits.js`), sharing a `groupId` so they move together; offered from the Page menu (add to the current page) and when adding a new page, possibly also in the New Document dialog.
- **Later extension:** drop a picture on a grey slot and clip it to that rectangle (ZEditor already has clipping masks).
- **Starter set to design:** cover, full-bleed picture, picture + caption, title + body, two columns, quote, 2x2 pictures, contents page, back cover.
- **Decided (2026-11-25, maintainer):** works **both ways** (apply to the current page, and add as new pages). On the current page it **adds beneath** the existing items (they stay on top, nothing is removed). **First set of layouts:** full text; half text + half picture in four variants (picture on top, picture at bottom, picture left, picture right). Picture slots are **plain light grey** (no label).
- **Still open:** margins and gap sizes; whether the pieces are grouped or separate (leaning separate); how much lorem ipsum fills the body; whether layout items are locked; where the new-page option lives in the menus.

- **Slot snapping (decided 2026-11-25, maintainer):** when Snap is on, an item snaps to **every rectangle** on the page (not only layout slots), both when **moving** and when **resizing** it (resizing does not snap to anything today). Uses the **same setting** as "Snap items to guides when moving them" (no rename). Works **even with rulers hidden** (today's snap needs rulers on). **Alt** still bypasses. The grey rectangle stays **visible** under the image. A later step ("snap and fit": the image fills and is clipped to the slot) is parked.
- **Still open:** do other items (text, shapes) also snap to rectangles, or only images? Do ellipses count? Are hidden or locked rectangles targets? (leaning: all item types, rectangles only, visible ones only).

_(Add more ideas below.)_
