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
- **Decided too (2026-11-25, "go with your suggestions"):** all item types snap to rectangles (not only images); ellipses are not targets; only **visible** rectangles count (hidden ones do not; locked ones that are visible still count).
- **Layout details decided (suggestions accepted):** default margin from the Page Guide, else about 8% of the page width; gap between pieces about 4%; split 50/50; pieces separate (not grouped) and not locked; body text filled with enough lorem ipsum to fill its box (fixed height, extra text hidden); text uses the current tool defaults; "Add layout" in the Page menu for the current page and "New page with layout" next to the new-page action; the whole layout is one undo step.
- **Build order (not started; waiting for the maintainer's go):** (1) layout data + "apply to current page"; (2) "new page with layout"; (3) snap to rectangles when moving; (4) snap to rectangles when resizing; (5) tests, wiki pages, notes.

### 4.2 Coloured ruler guide groups, layout guides, bleed export (2026-11-25) — under discussion

- **Coloured guide groups (idea):** each ruler guide gets a colour (8 defaults: white, yellow, light blue, light green, light red, pink, light grey, orange). Guides of one colour form a group shown in the Layers panel, where the whole group can be locked or hidden; each guide can still be dragged on its own. Today guides are a document-wide list `{ id, axis, pos }` in view settings (`useViewSettings.js`), not shown in the Layers panel, with one global lock.
- **Layout guides (idea):** creating a layout also adds guide lines (margins, the split line, the gap) in their own colour group. Needs a decision: guides are document-wide today (same on every page), so per-page guides need a data change.
- **Bleed in PDF export (idea, feasible):** bleed today is only an editor guide (Page Guide: trim centred on the page, bleed outside it); export ignores it. Plan: export option **with bleed / without bleed**; "without" crops to the trim box, "with" keeps trim + bleed; also write the PDF TrimBox/BleedBox so print shops see where to cut. Items must lie inside the page area to be drawn (bleed content has to be within the page). ZineArranger would need to use the trimmed pages for imposition.
- **Decided so far (2026-11-25):** a new guide gets the last-used colour; the existing "Lock guides" stays as a master lock; guides belong to a **page** but can be made **global** (all pages), toggled from a vertical three-dot (⋮) menu; the **Measure tool is to be integrated with guides and rulers**, with the side panel holding the settings (details still to be settled); **bleed** is a number box (mm, default 4 mm) in the New Document dialog and also under the page settings; the bleed's inner border (the trim edge) is drawn as a **dotted rectangle guide**.
- **Decided (2026-11-25, round 2):** the **Measure tool integration = the side panel shows the selected guide's settings** (colour, exact position in the ruler unit, this page / all pages, lock, hide); distance read-outs between guides come later. **Guide groups, two kinds per colour:** "Page Guides (Yellow)" and "Global Guides (Yellow)" (same for every colour; a group appears only if it has guides). A ⋮ toggle on a **group** moves all of its guides to the other scope and merges them into the group of the same colour and scope if one exists; a ⋮ toggle on a **single guide** (its row in the Layers panel, or the guide itself) moves just that guide to the other group. **Bleed:** page area = trim + bleed on every side (grows when bleed is added, shrinks when removed); default bleed **0**; unit **mm**; a special **dotted rectangle** marks the trim edge, everything outside it is bleed; blank pages only (not imported PDF pages); replaces the Page Guide's inch bleed (old projects keep working).
- **Interpretation (confirmed):** page size entered = trim size; the editable page area = trim + bleed on every side; changing bleed on an existing page grows/shrinks the page and shifts items so the trim area stays put; export asks with/without bleed (without = crop to trim), TrimBox/BleedBox written.
- **Open questions:** what "integrate Measure" means exactly; ⋮ menu placement (group header, each guide, or both); bleed for imported PDF pages; replacing the Page Guide's bleed inches with the new mm bleed; crop marks; ZineArranger gets the trimmed version.

_(Add more ideas below.)_
