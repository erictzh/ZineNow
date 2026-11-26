## Intro

**Data** (the table button next to the Layers button in the tool bar) is a **mail merge**: you design one page, put **fields** in its text, connect a spreadsheet, and ZEditor makes **one page for each row**. Use it for letters, invitation cards, name cards, certificates, or any page that repeats with different words. This is the Basic part; everything stays on your device.

## How to use

1. Save your sheet as a **CSV** file (in Excel or Google Sheets: *Save as / Download → CSV*). The **first line must be the column names**, then one line per row.
2. Click the **Data** button (the table icon beside Layers), then **Choose CSV file…** (or **Or paste the rows here**). The file is kept **inside your project**, so it travels with the .znow file.
3. Design your page. In a text box, write a field in double curly brackets, like `Dear {{name}},`, or click a **field chip** in the Data panel: it adds the field to the selected text box, or to a new one.
4. **Preview**: with *Show this row's words on the page* ticked, the page shows the chosen row's words. Use ◀ ▶ to step through rows. (A box you are typing in shows its field names, so you can edit it.)
5. **Order**: *As in the file*, or, if your sheet has a column named **id**, *lowest first* or *highest first*.
6. **Make pages**: choose which rows (leave blank for all), then **Make N pages**. The new pages go right after your designed page, which is **hidden** (crossed-out eye, so it is skipped when exporting) unless you untick that.
7. Changed your design or data? Go back to the designed page and **Make pages** again: the pages made earlier are **replaced** (it asks you to click once more to confirm). The made pages are ordinary pages: you can edit them by hand, but a re-merge replaces them.

- Under the panel you are told if the page uses a field the file has no column for, or if some rows are empty in a field.
- A field can have a **filter**: `{{name|upper}}`, `{{name|title}}`, `{{price|number}}`, `{{date|date:d MMMM yyyy}}`, `{{city|default:Malaysia}}`. Also `lower`, `trim`, `first`, `pad:3`.
- One undo step undoes the whole merge.
- Not yet: pictures from a folder, QR codes, label-sheet size presets for the grid helper.

## Advanced: data blocks and groups

At the bottom of the Data panel, **Show advanced options** switches this on (remembered in your browser). Basic stays as it is until you do.

- A **data block** is a group of items that shows **one record** (a photo, a name, a role). Select its items, group them (**Ctrl+G**), then **Mark the selected group as a data block**. Copy the block (select it, **Ctrl+C**, **Ctrl+V**; a pasted block lands 20 px down and right, so drag it to where you want it) as many times as you want on the page: each copy is a **slot**, filled in reading order (rows from the top, each left to right) with the next record. 10 records with 5 slots make 2 pages; empty slots on the last page are left out.
- Everything else on the page is a **non-data item**. Fields in it show the group's first row, plus `{{page in group}}`, `{{pages in group}}` and `{{records in group}}`.
- **Make a grid of copies** (shows when a data block is selected): choose **Columns**, **Rows** and a **Gap (mm)**, then the button. The block stays in the top-left cell and the copies fill the rest, one block width plus the gap apart. Size the block to one cell first (name card, label) and put it where the first cell should be. The panel tells you if some of the grid runs off the page. It is one undo step.
- **Group by** a column (for example `band`): each value starts on a new page, then fills its slots. Without it, records just fill the blocks page after page.
- **Repeat non-data items on the other pages** (ticked by default): the title, footer, logo and so on show on every page of a group. Unticked, they show on the group's first page only.
- **Selected item shows on**: for one non-data item, choose *Every page*, *First page of the group*, *Continuation pages only* or *Last page only*. It overrides the tick box for that item.
- The preview shows the chosen row in the first block, the following rows in the next blocks, and hides blocks with no record left.

## How it works

### Reading the file

`model/dataMerge/csv.js` reads commas, semicolons, tabs or bars, quoted cells with line breaks, and a leading byte-order mark. Duplicate or empty column names are made unique.

### Filling the text

`model/dataMerge/fields.js` (`fillTemplate`) replaces each `{{field}}` with the row's cell, applying filters. A field with no column stays visible as written. `model/dataMerge/build.js` (`mergeAnnotations`) copies a page's items with new ids (groups and linked text follow), filling the text boxes. A box whose length changes loses letter-by-letter colouring, which no longer lines up.

### Pages

`model/dataMerge/groups.js` (Advanced) finds the slots (`dataSlots`), groups the records (`groupRecords`), plans the pages (`planPages`) and fills one (`mergeGroupPage`; `showsOnPage` decides Show on). A data block's items carry `dataBlock: true` and a non-data item may carry `showOn`; made pages carry neither.

`gridCopies` lays out the grid of copies (`makeGrid` in the hook measures the block with `annotationBounds`; mm to pixels is mm / 25.4 x 72 x 1.1).

`state/useDataMerge.js` keeps the parsed rows, the order and the preview row. Made pages carry `mergedFrom` (the designed page's key) and `mergeRow`; that is how a re-merge finds the pages to replace. The preview is only drawn (`ComposeCanvas` `mergeRecord`); the page's own text is never changed by it.
