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
- **Filters inside a field:** `{{name|title}}` (Ana Lopez), `{{date|date:d MMMM yyyy}}` (26 November 2026, also in Malay), `{{serial|pad:3}}` (007), `{{price|number}}` (1,234,567), `{{nick|default:friend}}`.
- **Sort and choose records:** put a timeline in date order (it reads "c. 1400" and "500 BCE"), or merge only a range or the ticked ones.
- **Front and back:** a template of two pages makes a front and a back for every record.
- **Zigzag layouts:** odd records on the left, even on the right (timelines).
- **QR codes from a field:** see section 11.
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
| **Invitation cards** | A6 card; optionally a front and a back | guest, title, table, rsvp link | 4 per A4 sheet, or 2 pages per guest; a QR code to RSVP | 1, 3 and QR |
| **Historical timeline** | One event block (year, title, detail, picture) | year, event, detail, picture | Records sorted by date, zigzagging left and right down a page | sort in 1; flow in 4 |
| **Formal / invitational letters** | A letter page with a letterhead | salutation, name, address, date, body | One page per recipient; names and dates formatted | 1 |
| **Image gallery with descriptions** | One cell: picture and caption | photo, title, description | 12 per A4 sheet (3 x 4) | 2 and 3 |
| **Name cards** | One 90 x 55 mm card | name, role, company, serial | 10 per A4 sheet, bleed and crop marks; optional QR contact | 3 and QR |

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

## 10. Decisions (answered 2026-11-26, with plain explanations)

1. **What do I build first?** (This only decides the order.) The five new scenarios, plus labels, letters and a directory, all need the same core first. After the core, the next steps open different scenarios: *pictures and grids* give the gallery, name cards and labels; *flow* gives the timeline and directory. **My plan:** core, then pictures and grids, then flow. Say if you would rather have the timeline sooner.
2. **Pictures from a folder:** yes. When you choose the photo folder, the pictures are **copied into the project (.znow)**, so the merge still works later even if the folder is gone. The file gets bigger by the size of the photos, and ZEditor will show the total and offer to shrink large photos.
3. **Merged pages: plain or live?** Plain means the merged pages become ordinary pages you can edit freely, like any page you made by hand; to refresh them after changing the template, you run "Merge again" (it replaces them, after a warning). Live would keep every merged page permanently tied to the template, so you could not touch a single page by hand. **Decided: plain** (the proposal as written).
4. **QR codes:** yes, see section 11.
5. **Data button:** top bar, next to Page, Project and Export. Decided.

## 11. QR codes: how they would work

- A **QR box** is a new item you place on the template, like a picture box. In its settings you say what goes in the code: one field (`{{rsvp}}`) or a sentence with fields, such as a link, a phone number, a Wi-Fi name, or a contact card.
- For each record ZEditor works out the code from that record's value. Ana gets a code for her own RSVP link, Budi gets his.
- The code is drawn as **small squares (vector shapes)**, not a picture, so it stays sharp at any print size and in the PDF.
- Settings: **size** (a code should be at least about 20 mm), **error correction** (higher survives a stain or a fold better, but is denser), a **quiet margin** round the code, and colours (dark squares on a light background scan best).
- A record with an **empty** field gets no code, and the check before merging lists it.
- It needs a **small open-source QR library** (a few KB, MIT licence). It runs in the browser, so no data is sent anywhere. I would check its licence before adding it, as with every library.
- **Scanning is a real-world test:** ZEditor cannot know if your printer prints a code well. Print one sheet and scan a few with a phone before printing 200.

## 12. Do the five new scenarios work with this design?

I checked what each one needs and tested the parts that are pure logic (reading the CSV, filling the fields, laying out grids, sorting, matching photos) in `tests/dataMerge.test.js`, using sample data for all five. **This proves the data side works. The panel, the page creation and the QR drawing are not built yet.**

| Scenario | What it needs | Works in the design? | Tested in the data core | Still to build |
|---|---|---|---|---|
| Invitation cards | A6 grid or front/back pages, names, optional table, QR RSVP | Yes | 4 per A4 exactly fill the sheet; 6 guests make 2 sheets; a two-page template makes 12 pages; a missing table number takes a default; a missing RSVP link is reported | Grid page maker; QR box |
| Historical timeline | Sort by year, zigzag sides, long details, optional pictures | Yes, after the flow phase | Years like "c. 1400" and "500 BCE" sort correctly; sides alternate; rows with no year go last; details with line breaks survive | Records flowing down a page (phase 4); a line or arrows between events |
| Formal letters | One page per person; titles, names in the right case, address blocks, dates, long paragraphs | Yes (needs only phase 1) | Semicolon files; `Siti Aminah` from `SITI AMINAH`; "1 Disember 2026"; multi-line addresses and bodies in one cell | Page maker and the field panel |
| Image gallery with descriptions | Picture and caption cells, 12 per sheet, photo files matched by name | Yes | 3 x 4 cells all inside A4; 15 pictures need 2 sheets; photos found whatever the capitals or missing extension; missing files listed by name | Picture fields; photos stored in the .znow |
| Name cards | 10 per A4, accents and Chinese names, serial numbers, hide an empty line | Yes | 2 x 5 fits A4 exactly; 11 people make 2 sheets; `Lim Wei Jie 林伟杰` and `Émilie` kept; an empty role hides its line; `No. 011` | Grid page maker; bleed and crop marks per card (bleed exists, grid use is new); QR box |

**Known limits for these scenarios**
- A timeline with spacing **proportional to the dates** (a long gap for a long time) is a stretch goal; the plan zigzags evenly in date order.
- Fancy invitation **fonts** must be uploaded or allowed, as for outlines and PDF text.
- Very **long descriptions** need a "shrink to fit" or a bigger cell; the check before merging lists any that overflow.
- Gallery pictures of different shapes are **fitted** (cropped to fill, or shrunk to fit: a setting).
