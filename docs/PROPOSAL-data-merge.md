# Proposal: Data merge for ZEditor (CSV to pages)

Status: **proposal, not built** (2026-11-26). Written for the maintainer to decide.

## 1. The idea in one paragraph

You design **one template page** and connect a **CSV file** (a spreadsheet saved as text). ZEditor fills the template once per row and makes one page (or one grid cell) per record. It is a mail merge, but built for zines: pictures, many records per page, serial numbers, and output that goes straight into the folded-zine tools. Everything stays in the browser; the CSV never leaves the device.

## 2. Where everything is

| Where | What |
|---|---|
| **Top bar: Data** button (next to Page, Project, Export) | Opens the Data panel on the right |
| **Data panel** (right side, where the Format panel is) | Connect, Fields, Preview, Merge |
| **Record stepper** (a small bar above the page) | ◀ 3 of 120 ▶, find a record, preview on/off |
| **Text box with fields** | a small ⚡ badge in its corner; its Format panel gets a **Data** section |
| **Page thumbnail** | the template page shows a "template" tag and a crossed-out eye (hidden: not exported); merged pages show a small ⚡ |
| **Merge window** (opens from "Create pages…") | which records, one per page or a grid, then Create or Export |

## 3. Pictures of the screens (text drawings)

### 3.1 The editor with data connected

```
┌ ZEditor   New Zine ───────────────  [Page] [Data] [Project] [Export] ┐
├──────────┬──────────────────────────────────────────┬────────────────┤
│PAGES (6) │ ◀  Record 3 of 120  ▶   [find: ana____]  │ DATA           │
│[+PDF][Lay│                         [x] Preview      │                │
│ [All]    │      ┌──────────────────────┐            │ people.csv  ✓  │
│          │      │  ⚡ Ana Lopez        │            │ 120 rows       │
│ ┌──────┐ │      │  ┌────────┐          │            │ 6 columns      │
│ │templ.│ │      │  │ photo  │  Bassist │            │                │
│ │ 👁̸   │ │      │  └────────┘  Penang  │            │ FIELDS         │
│ └──────┘ │      │  ana@mail…           │            │ [name] [role]  │
│ ┌──────┐ │      └──────────────────────┘            │ [city] [email] │
│ │ 1 ⚡ │ │                                          │ [photo] [bio]  │
│ └──────┘ │                                          │                │
│  ...     │                                          │ [Create pages…]│
└──────────┴──────────────────────────────────────────┴────────────────┘
```

### 3.2 The Data panel, top to bottom

```
DATA
 1 CONNECT
   people.csv        120 rows · 6 columns        [Change…] [Remove]
   ┌ name ──────┬ role ───┬ city ───┬ photo ──┐   (first rows, to check
   │ Ana Lopez  │ Bassist │ Penang  │ ana.jpg │    accents and commas)
   │ Budi Hadi  │ Drums   │ Ipoh    │ budi.jpg│
   └────────────┴─────────┴─────────┴─────────┘
   Delimiter: [auto ▾]   Encoding: [UTF-8 ▾]

 2 FIELDS      click a chip to put {{field}} in the selected text box
   [name] [role] [city] [email] [photo] [bio]
   Pictures:  Photo folder: [Choose folder…]  (3 of 120 not found ⚠)

 3 PREVIEW
   [x] Show record   ◀ 3 / 120 ▶   Missing field → shows {{field}} in red

 4 MERGE
   [Create pages…]   [Export PDF…]
```

### 3.3 The Merge window

```
┌ Create pages from data ───────────────────────────────  × ┐
│ Records     (•) All 120   ( ) Range [1]–[120]   ( ) Ticked│
│ Layout      (•) One record per page                       │
│             ( ) A grid on each page:  [3] across [8] down │
│                  Gap [4] mm   Preset [Avery-style L7160 ▾]│
│ Extras      [ ] crop marks (needs bleed)  [ ] serial no.  │
│ Template    [x] hide the template page (not exported)     │
│ Place       (•) right after the template  ( ) at the end  │
│                                                           │
│ Creates 120 pages (or 15 sheets).  Undo takes it back.    │
│                              [Cancel]   [Create pages]    │
└───────────────────────────────────────────────────────────┘
```

### 3.4 A grid (labels or cards): 3 across, 4 down

```
┌─────────────────────────┐
│ ┌───────┐┌───────┐┌─────┐│   each cell = the template,
│ │ Ana   ││ Budi  ││ Citra││   filled with one record
│ └───────┘└───────┘└─────┘│   (gaps, cut marks optional)
│ ┌───────┐┌───────┐┌─────┐│
│ │ Dewi  ││ Eka   ││ Fitri││
│ └───────┘└───────┘└─────┘│
└─────────────────────────┘
```

## 4. What it can do

### Basic (like any mail merge)
- Import a CSV (quoted commas, line breaks in cells, UTF-8 so Malay, Chinese and accents work, comma or semicolon).
- `{{field}}` in any text box (also in the middle of a sentence: "Dear {{first_name}},").
- Preview each record with a stepper; find a record by typing.
- Create one page per record; Export PDF.
- Merge **again** after you change the template or the CSV.

### Made for zines
- **Pictures from a field:** the column holds a file name (`ana.jpg`); you pick the photo folder once; pictures are matched by name and fit the picture box.
- **Hide when empty:** a box (or a picture frame) disappears if its field is empty (no "Website:" with nothing after it).
- **Colour from a field:** a shape or text takes its colour from a column (one colour per section).
- **Grids and label sheets:** many records per page, with gaps, label-sheet presets, bleed and crop marks.
- **Serial numbers and counters:** No. 001 of 150, page-order numbers, "record 3 of 120".
- **Repeat blocks (later):** records flow down a column or into linked text frames, like a directory or a listings page.
- **Straight into the folded zine:** merged pages go to ZineArranger as one PDF for the one-sheet minizine.
- **Hidden template:** the template page can be hidden, so it is not exported or numbered.

## 5. Compared with a traditional mail merge (Word, Google Docs)

| | Traditional mail merge | This proposal |
|---|---|---|
| Data | Spreadsheet or contacts list | A CSV file (any spreadsheet can save one) |
| Placeholders | `«Name»` merge fields | `{{name}}` typed in text boxes (and chips to click) |
| Preview | Preview Results, arrows | Record stepper over the page; live while you edit the template |
| Output | One long letter, or one file per record | One page per record, or a **grid of records per page**, as real editable pages or a PDF |
| Pictures | Awkward, fields in picture file names are hard | **Picture fields**, matched by file name from a folder |
| Layout | Text flows; mostly letters and labels | Full page design: shapes, effects, text on pictures, bleed |
| Conditions | IF fields, clumsy | **Hide when empty** and colour-from-field per box |
| Labels | Label wizard, fixed sheets | Grid with presets and your own sizes |
| Result | Print it | Print it, or send it into the **minizine folding tools** |
| Privacy | Often cloud-based | Never leaves the browser |

Same as traditional: one template plus a table, a preview, the ability to merge a range, and the fact that the merged output is a separate set of pages. Different: it is a layout tool, so a spreadsheet can become a zine, not just a stack of letters.

## 6. How to use it (the short version)

1. Prepare a CSV: first row has the column names (`name,role,city,photo`). Save as CSV (UTF-8) from your spreadsheet.
2. Design **one page** in ZEditor with normal boxes; put `{{name}}` and so on where the values go. For pictures, draw a picture box and mark it "use field: photo".
3. Click **Data**, then **Connect** and choose the CSV. Check the preview table.
4. If you use pictures, **Choose folder** for the photos.
5. Step through a few records with ◀ ▶ and fix long text (shrink to fit) or missing fields.
6. Click **Create pages…**, choose records and one-per-page or a grid, then **Create pages** (or **Export PDF**).
7. Optionally **Send to ZineArranger** to fold it into a minizine.

## 7. Case scenarios

| Scenario | Template | Data columns | Output | Phase |
|---|---|---|---|---|
| Mailing labels for sending out the zine | One label, address block | name, address, city, postcode | Grid, 3 x 8 per A4 sheet | 1 and 3 |
| Personal letter to subscribers | A letter page | first_name, issue, amount | One page per person | 1 |
| Contributor or band directory zine | One profile page: photo, name, bio | name, bio, photo, links | One page per row, 40 pages | 1 and 2 |
| Recipe zine | Recipe page | title, ingredients, steps, photo | One page per recipe | 1 and 2 |
| Trading cards or character cards | One card with colour band | name, stats, colour, picture | Grid 3 x 3, bleed and crop marks | 2 and 3 |
| Numbered tickets or zine copies | One ticket | serial, name, seat | Grid, with serial numbers | 3 |
| Gig flyer variants (one per venue) | Poster | venue, date, price, map picture | One page per venue | 1 and 2 |
| Distro catalogue listings | A listing line | title, price, format, contact | Records flowing in columns | 4 |
| Calendar or zine fest schedule | A day card | date, event, place | One card per row, hide empty lines | 2 and 3 |
| Quote or poem zine | A quote page | quote, author | One page per quote, colour by theme | 1 and 2 |

## 8. Rules and edge cases

- **The template stays.** Creating pages adds the merged pages after it (or at the end); the template is hidden from export by default (it keeps `{{name}}` text).
- **Merge again replaces** the generated pages; the window warns first, and Undo restores them. A page you edit by hand can be **unlinked** so merging again leaves it alone.
- **Missing field or empty cell:** shown as `{{field}}` in red in the preview, and listed in a check before creating pages.
- **Text too long:** the box shows the overset warning; an option "shrink to fit" scales the text; linked frames can continue the text.
- **Photos not found:** listed with their file names; the picture box stays empty (or hides, if "hide when empty" is on).
- **Many records:** 500 records are fine; pages are made in a batch with a progress bar, and the PDF is written page by page.
- **The CSV is saved inside the project**, so opening the project later restores the merge.

## 9. Suggested phases

1. **Core:** CSV import, `{{field}}` text, stepper preview, create one page per record, hidden template, export.
2. **Pictures and logic:** picture fields from a folder, hide when empty, colour from a field.
3. **Layouts:** grids and label presets, serial numbers, bleed and crop marks.
4. **Flow:** repeating records in columns; starter templates (directory zine, labels, cards).

## 10. Decisions needed

1. Which to make first: labels and letters, or a directory-style zine from a spreadsheet?
2. Pictures matched by **file name from a folder**: acceptable?
3. Merged pages as **plain editable pages** (recommended), or live pages that follow the template?
4. Is a **QR code from a field** wanted? (needs a small extra library)
5. Where should the button be: top bar **Data** (proposed), or inside the Project menu?
