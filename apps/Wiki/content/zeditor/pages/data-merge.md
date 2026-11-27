## Intro

**Data** (the table button next to the Layers button in the tool bar) is a **mail merge**: you design one page, put **fields** in its text, connect a spreadsheet, and ZEditor makes **one page for each row**. Use it for letters, invitation cards, name cards, certificates, or any page that repeats with different words. This is the Basic part; everything stays on your device.

## How to use

1. Save your sheet as a **CSV** file (in Excel or Google Sheets: *Save as / Download → CSV*). The **first line must be the column names**, then one line per row.
2. Click the **Data** button (the table icon beside Layers), then **Choose CSV file…** (or **Or paste the rows here**). The file is kept **inside your project**, so it travels with the .znow file.
3. Design your page. In a text box, write a field in double curly brackets, like `Dear {{name}},`, or click a **field chip** in the Data panel: it adds the field to the selected text box, or to a new one.
4. **Preview**: with *Show this row's words on the page* ticked, the page shows the chosen row's words. Use ◀ ▶ to step through rows. (A box you are typing in shows its field names, so you can edit it.)
5. **Order**: *As in the file*, or, if your sheet has a column named **id**, *lowest first* or *highest first*.
6. **Make pages**: choose which rows (leave blank for all), then **Make N pages**. The new pages go right after your designed page, which is **hidden** (crossed-out eye, so it is skipped when exporting) unless you untick that.
7. **Make pages for rows … to …**, **Hide the page you designed** and the warnings sit under the panel with the Make button (the same on both tabs).
8. Changed your design or data? Go back to the designed page and **Make pages** again: the pages made earlier are **replaced** (it asks you to click once more to confirm). The made pages are ordinary pages: you can edit them by hand, but a re-merge replaces them.

- Under the panel you are told if the page uses a field the file has no column for, or if some rows are empty in a field.
- A field can have a **filter**: `{{name|upper}}`, `{{name|title}}`, `{{price|number}}`, `{{date|date:d MMMM yyyy}}`, `{{city|default:Malaysia}}`. Also `lower`, `trim`, `first`, `pad:3`.
- One undo step undoes the whole merge.
- Not yet: QR codes, a page-size switch for the sheets.

## Advanced: data blocks and groups

Under the file name at the top of the Data panel there are two tabs, **Basic** and **Advanced** (the file and the tabs stay in place while the rest scrolls). Basic is the default; the tab you leave open is remembered in your browser.

- A **data block** is a group of items that shows **one record** (a photo, a name, a role). Select its items, group them (**Ctrl+G**), then **Mark the selected group as a data block**. Or, once data is connected, use the **⋮** menu on the group's row in the Layers panel: **Make data block** (a small *data* tag then shows on the group's row; the same menu says **Not a data block** to undo it). Copy the block (select it, **Ctrl+C**, **Ctrl+V**; a pasted block lands 20 px down and right, so drag it to where you want it) as many times as you want on the page: each copy is a **slot**, filled in reading order (rows from the top, each left to right) with the next record. 10 records with 5 slots make 2 pages; empty slots on the last page are left out.
- Everything else on the page is a **non-data item**. Fields in it show the group's first row, plus `{{page in group}}`, `{{pages in group}}` and `{{records in group}}`.
- *(Hidden for now.)* **Make a grid of copies** (would show when a data block is selected): choose **Columns**, **Rows** and a **Gap (mm)**, then the button. The block stays in the top-left cell and the copies fill the rest, one block width plus the gap apart. Size the block to one cell first (name card, label) and put it where the first cell should be. Or pick a **Sheet** (name card 90 × 55, address labels 3 × 7 or 2 × 7, invitation A6, picture gallery 3 × 4): the block moves to the sheet's first cell and the copies follow the sheet's exact cell spacing. The panel warns if your page is not the sheet's size (they are A4), or your block is bigger than one cell. Label sizes are a guide: check them against your own sheet and print one test page on plain paper first. The panel tells you if some of the grid runs off the page. It is one undo step.
- **Pictures** (Advanced tab): put a **different photo** on each page or block. Add a column that holds each photo's file name (`ana.jpg`; the extension and capital letters may be left out). **Choose photo folder…** (or **Or choose photo files**) keeps the photos inside the project, shrunk to at most 1600 px on the longest side (PNG stays PNG, the rest become JPEG). Put an ordinary picture on your page as the frame, select it, and under **Selected picture shows the photo named in** choose the column. Each made page then shows that row's photo, cropped to fill the frame and centred. The preview shows it too. If a row has no photo name, or no file with that name, the picture is **left out** (never someone else's photo) and the panel warns you. Many large photos make the project file big: every made page carries its own copy.
- **Group by** a column (for example `band`): each value starts on a new page, then fills its slots. Without it, records just fill the blocks page after page.
- **Repeat non-data items on the other pages** (ticked by default): the title, footer, logo and so on show on every page of a group. Unticked, they show on the group's first page only.
- **Selected item shows on**: for one non-data item, choose *Every page*, *First page of the group*, *Continuation pages only* or *Last page only*. It overrides the tick box for that item.
- The preview shows the chosen row in the first block, the following rows in the next blocks, and hides blocks with no record left.

## Data templates (sharing a design)

A **data template** is a design someone else can fill with their own spreadsheet: name cards, labels, certificates.

- **Project → Save as data template…** saves a copy named **`ZDATA = <title>.znow`** (for example `ZDATA = Name cards.znow`). It holds your designed pages and merge settings (Group by, Repeat non-data items) but **not the spreadsheet and not the photos**, and it leaves out the pages a merge made. The file is also marked as a template inside, with the list of columns it needs. Your own project is not changed.
- **Opening** a data template asks: **Use this template** opens a copy that is not saved anywhere yet (so the template file is never overwritten) with the Data panel open, which says which columns your CSV needs; **Edit it** opens the template itself, and **Save** keeps it a template (no data, no photos).
- Share it like any file. System fonts are **not** put inside a template, so the other person needs them (or sees a stand-in); fonts you uploaded travel with it.

## How it works

### Reading the file

`model/dataMerge/csv.js` reads commas, semicolons, tabs or bars, quoted cells with line breaks, and a leading byte-order mark. Duplicate or empty column names are made unique.

### Filling the text

`model/dataMerge/fields.js` (`fillTemplate`) replaces each `{{field}}` with the row's cell, applying filters. A field with no column stays visible as written. `model/dataMerge/build.js` (`mergeAnnotations`) copies a page's items with new ids (groups and linked text follow), filling the text boxes. A box whose length changes loses letter-by-letter colouring, which no longer lines up.

### Pages

`model/dataMerge/groups.js` (Advanced) finds the slots (`dataSlots`), groups the records (`groupRecords`), plans the pages (`planPages`) and fills one (`mergeGroupPage`; `showsOnPage` decides Show on). A data block's items carry `dataBlock: true` and a non-data item may carry `showOn`; made pages carry neither.

`model/dataMerge/build.js` also has `makePhotoFinder` (cell text to photo), `fillCrop` (centre-crop to the frame), `fillPictureItem` and `pictureProblems`; `io/dataPhotos.js` reads and shrinks the photos. A picture item with `picField: "column"` is the frame.

`model/dataMerge/template.js` names the file (`templateFileName`), keeps the designed pages (`templatePages`), lists the columns needed (`templateNeeds`) and drops the data and photos from the settings (`templateSettings`). The marker is `dataTemplate: { version, columns }` in the project file (`io/projectFile.js`); `state/useProject.js` asks "use or edit" when it finds one (`DataTemplateDialog.jsx`) and keeps `editingTemplate` so Save keeps a template a template.

`sheetGrid` turns a ready-made sheet (`GRID_PRESETS` in `layout.js`) into pixels; `gridCopies` takes its cell spacing as `pitch`. `gridCopies` lays out the grid of copies (`makeGrid` in the hook measures the block with `annotationBounds`; mm to pixels is mm / 25.4 x 72 x 1.1).

`state/useDataMerge.js` keeps the parsed rows, the order and the preview row. Made pages carry `mergedFrom` (the designed page's key) and `mergeRow`; that is how a re-merge finds the pages to replace. The preview is only drawn (`ComposeCanvas` `mergeRecord`); the page's own text is never changed by it.
