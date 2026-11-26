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
- Not yet: pictures from a folder, several cards on one sheet, grouping rows, QR codes.

## How it works

### Reading the file

`model/dataMerge/csv.js` reads commas, semicolons, tabs or bars, quoted cells with line breaks, and a leading byte-order mark. Duplicate or empty column names are made unique.

### Filling the text

`model/dataMerge/fields.js` (`fillTemplate`) replaces each `{{field}}` with the row's cell, applying filters. A field with no column stays visible as written. `model/dataMerge/build.js` (`mergeAnnotations`) copies a page's items with new ids (groups and linked text follow), filling the text boxes. A box whose length changes loses letter-by-letter colouring, which no longer lines up.

### Pages

`state/useDataMerge.js` keeps the parsed rows, the order and the preview row. Made pages carry `mergedFrom` (the designed page's key) and `mergeRow`; that is how a re-merge finds the pages to replace. The preview is only drawn (`ComposeCanvas` `mergeRecord`); the page's own text is never changed by it.
