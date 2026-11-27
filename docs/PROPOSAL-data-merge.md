# Proposal v2: Data merge for ZEditor (CSV to pages, with groups)

Status: **proposal, not built** (2026-11-26). Version 2 after the maintainer's decisions. The pure data side (CSV reading, `{{field}}` filling with filters, sorting, grids, photo matching) already exists and is tested in `apps/ZEditor/src/model/dataMerge/` and `tests/dataMerge.test.js`; there is no screen yet.

## 1. Principles

1. **Everything traditional mail merge has, and more**, in plain words, with no code needed.
2. **Custom first.** There are **no locked templates**. Starting points (labels, name cards...) are only ordinary ZEditor projects with fields already placed: optional, editable, and you can save your own. The engine never assumes "five cards per page": it follows **whatever you design**.
3. **Three levels:** starting points (optional), building blocks (no code), formulas (optional, advanced).
4. **Local and saved:** the CSV and the chosen photos are **embedded in the `.znow` file**. Nothing leaves the browser.

## 1b. Basic and Advanced are kept apart (decided)

So that new users are not intimidated, the Data panel has a **Basic** level and an **Advanced** level behind one switch ("Show advanced options", off by default, remembered).

| | **Basic** (all a new user sees) | **Advanced** (switched on) |
|---|---|---|
| Panel | Four steps: Connect, Fields, Preview, Create pages | More sections appear below |
| Fields | Click a column to insert it | Filters in fields (title case, dates, padding), merge variables |
| Layout | One record per page, or a grid on the page | Group pages, flowing lists, page roles, continuation designs |
| Pictures | Picture field and photo folder | Value maps, bind any setting to a field |
| Order | **CSV order, or by a column named `id`** | (later, if wanted: sort by date, words or number; the code for it already exists) |
| Conditions | One tick: "hide this box if the cell is empty" | "Show only if…" rules, nesting |
| Output | Create pages, Export PDF | One PDF per record, QR codes |
| Check | Plain list ("3 records have no photo") | Detail view |
| Starting points | A short list, optional | Save your own, share them |

Rules: the Basic panel stays short; plain words everywhere; no formula or code box in Basic; a one-time hint ("Connect a CSV and click a column to add it").

## 2. Where it lives

| Where | What |
|---|---|
| Top bar **Data** button (next to Page, Project, Export) | Opens the Data panel on the right |
| Data panel | Connect, Fields, Sort & choose, Page designs, Merge |
| Record stepper above the page | ◀ 3 of 120 ▶, find a record, preview on or off |
| Any setting in the Format panel | A ⚡ button: "bind to a field" |
| Page thumbnails | A role tag (template, group first, continuation...), the hidden eye, a ⚡ on merged pages |
| Merge window ("Create pages…") | Which records, which layout, then Create or Export |

## 3. Building blocks (all custom)

| Block | What you do yourself |
|---|---|
| **Bind (⚡)** | Bind any setting (text, picture source, colour, size, position, rotation, opacity, visibility, link) to a column |
| **Value map** | Your own table: Rock → red, Punk → black |
| **Show on / Show only if** | A condition on any item; and the *page scope* setting (section 5) |
| **Card slots** | Select cards you drew and "Use as card slots"; numbered 1..N, renumber by clicking |
| **Repeating block** | Or draw one card and repeat it as a grid, a list or a row, any cell size and gap |
| **Group (category header)** | Group by any column or a calculated one (year of a date, decade, first letter...), with header, detail and footer blocks; one or two levels |
| **Calculated columns** | A formula column ("first + last name", "year of date", "price × 1.1") |
| **Page designs and roles** | Each template page has a role: once at the start, for each record, group first page, group continuation page, group closing page, once at the end |
| **Merge variables** | Typed once, used everywhere: `{{@event_date}}` |
| **Text rules and filters** | `{{name|title}}`, `{{date|date:d MMMM yyyy}}`, `{{serial|pad:3}}`, `{{price|number}}`, `{{x|default:text}}`, text before/after when not blank |
| **Data tools** | Edit the table in the app, add/delete rows and columns, filter, sort, find duplicates, paste from a spreadsheet |

## 4. How records land on pages (all available)

| Layout | Meaning |
|---|---|
| **One record per page** | Letters, profile pages |
| **Several per page (grid or slots)** | Labels, name cards, invitations, gallery, any custom cell size |
| **Group pages** | One group (a year, a band) per page, a header, many cards under it, continuing on further pages |
| **Flowing list** | Records run on and on down pages (catalogue, timeline) |
| **Mixed** | Page roles combine them: cover, contents, group pages, index, back cover |

## 5. Group pages: how repetition and placement work

You design the page yourself:
- a **header block** (band name, city, `{{count}}` members),
- **card slots**: for example five cards laid out as you like, marked "Use as card slots" and numbered 1 to 5 (or one card repeated in a grid),
- anything else (frame, footer).

The merge fills the slots **in order**. When the slots are full and records remain, it repeats the page as a **continuation page** and fills the slots again. A group of 10 with five slots makes 2 pages; 11 makes 3. The engine **never assumes a number**: it uses the slots you made.

### Show on (per item)
Every item has a **Show on** setting:

| Show on | Typical use |
|---|---|
| Every page of the group | Logo, border |
| **First page only** | Band name and big title (your "repeat title" off) |
| **Continuation pages only** | A small "The Black Flags (continued)" |
| **Last page only** | Totals, a closing line |

### The space left on page 2: cards keep their places (decided)
By default the cards **keep their positions**; a hidden header leaves its space empty. This is simple and predictable.

### Different continuation design (optional, from the start)
If you want page 2 to be different (for example six cards and no header), you give it its own page design:

1. In the Pages strip, select the first group page design and click **Add continuation design** (in the Data panel under *Page designs*, or the page thumbnail's role menu). ZEditor **duplicates** the page and tags it "Group: continuation".
2. Edit the copy like any page: delete the header, add a sixth card, make the slots different. Its slots are numbered separately.
3. Optionally add a **closing design** the same way (a last page that carries the totals).

The engine then uses the **first design** for page 1 (with its slot count), the **continuation design** for pages 2 and on (with its own slot count), and the **closing design** for the last page if you made one. Example: first = 5 slots, continuation = 6 slots, a group of 14 gives 5 + 6 + 3 (the last page's three empty slots are hidden). A group that fits on the first page uses the first design (its "last page only" items show too). With no continuation design, the first design is reused and its "first page only" items are hidden on later pages.

### Details you control
- **Leftover (empty) slots:** hidden by default; or show a placeholder.
- **Balance the last pages:** an **option, off by default**. Off means strictly "as many as the slots hold per page". On avoids a single card alone on the last page (11 with five slots gives 4 + 4 + 3).
- **Fill order:** across then down, or down then across, per slot set.
- **Page numbers:** `{{group_page}}` / `{{group_pages}}` ("page 2 of 2") inside the group; the ordinary page numbers keep running.
- **Group order and member order:** by default the groups come in the order they first appear in the file, and the cards in file order; or both follow the `id` column.
- **Group from a value:** year, decade, month of a date; first letter; number range.
- **Two levels:** year then month, or country then band.
- **Contents page and index:** made automatically from the groups, respecting hidden pages.
- **Totals:** count, sum, lowest, highest, joined list ("Ana, Budi, Citra").
- **Careful grouping:** warns when "Black Flags" and "black flags" look like one group.
- **Preview:** the stepper shows each group's pages (Black Flags 1/2, 2/2, next band...).

### Data shape
- **One flat file** where each row repeats its group value (works from the start).
- **Two linked files** (bands plus members, joined by a key) later.

## 6. Traditional mail merge: everything is covered

| Traditional (Word) | Ours |
|---|---|
| Letters, envelopes, labels, directory | Layouts in section 4; envelope and label presets as optional starting points |
| Data sources | CSV, paste from a spreadsheet (later .xlsx), saved in the project, editable in the app |
| Edit recipient list (tick, search) | Tick, search, edit a cell, add or delete a row |
| Sort (several fields) | **Basic: CSV order, or by a column named `id`.** Date, words, number/ID sorting, ascending or descending, with a second field, exists as tested code and can be switched on in Advanced later (**built and tested**) |
| Filter (equals, not equal, less, greater, contains, does not contain, is blank, is not blank; and/or) | The same, in plain words |
| Duplicates | Show and remove by a column |
| Insert merge field, highlight fields | Chips and ⚡ badges |
| Address block, greeting line | "Address block" that drops empty lines; greeting with a fallback ("Dear Sir/Madam") |
| Match fields | Map a column to a meaning once |
| If…Then…Else | "Show only if…" on any item (and `{{if}}` for advanced users) |
| Skip Record If / Next Record If | Filter conditions |
| Next Record | Grids and card slots |
| Merge Record # / Sequence # | `{{#record}}`, `{{#number}}` with padding |
| Ask / Fill-in | Merge variables |
| Number, date, currency, case formats; text before/after | Filters (**built and tested**) |
| Preview, find recipient, check for errors | Stepper, find box, a Check list in plain words |
| Edit individual documents, print, email | Create pages, Export PDF, one PDF per record (zip). Email is not possible in a browser-only app |
| Postal barcodes | QR codes instead |

## 7. Beyond traditional

Groups with headers and continuation pages; card slots you place yourself; picture fields (embedded in the project); QR codes from a field; value maps and bind-anything; calculated columns; sort by date, words, number or ID both ways; page roles (cover, groups, index); contents and index pages; the hidden-page eye (built) so the template is not exported or numbered; front and back templates; zigzag layouts; straight into ZineArranger for folding.

**QR codes:** a QR box on the template says what goes in it (`{{rsvp}}` or a sentence). Each record gets its own code, drawn as vector squares (sharp at any size). Size, error correction and quiet margin are settings; an empty field gives no code and is listed in the Check. A small open-source (MIT) QR library would be added after a licence check.

## 8. Friendlier than traditional

- A **"What are you making?"** start screen with optional starting points and a sample CSV for each.
- Plain words instead of codes; the code view is tucked away.
- Live preview with real data; click a chip to insert a field.
- Column types are detected and shown with icons (date, number, words, picture, link).
- A **Check** list: "3 records have no photo", "Row 12's text is too long".
- Edit data in a small table, refresh from the CSV after changing it in the spreadsheet.
- Everything saved in the project, with Undo for each step.

## 9. Scenarios

| Scenario | Layout | Notes |
|---|---|---|
| Mailing labels | Grid | Presets or your own size |
| Letters | One per page | Formatted names, dates |
| Directory zine | One per page or flowing | Photos from a folder |
| Invitation cards | Grid, or front and back pages | QR RSVP |
| Name cards | Grid, with bleed | Serial, optional QR |
| Image gallery with descriptions | Grid | Photos embedded |
| Historical timeline | Flowing, sorted by date, zigzag | Or group by decade |
| **Year pages** (2016 as header, its rows below) | Group pages | Group by year |
| **Band pages** (band name, member cards) | Group pages with card slots and a continuation design | Group by band |
| Glossary or directory with A–Z dividers | Group by first letter | Contents and index |
| Gig flyers per venue | One per page | |
| Distro catalogue, schedules | Flowing or grouped | |

## 10. Phases (revised)

1. **Core:** CSV import and embedding, `{{field}}` text, stepper preview, sort and filter, one record per page, hidden template, Export PDF, the Check list.
2. **Pictures and slots:** picture fields (embedded), card slots and grids, hide-when-empty, bind-anything, value maps, label sheet sizes, bleed and crop marks.
3. **Groups:** group by a column or a calculated one, header, detail, footer, Show on, continuation designs, page roles, totals.
4. **Flow and extras:** flowing lists, contents and index, two levels, QR codes, calculated columns, merge variables, one PDF per record.
5. **Linked files** (bands plus members), .xlsx, shareable starting points.

### Order of work from 2026-11-27 (maintainer's decision)

Now: **calculated columns**, then the **second design for continuation pages**, then **QR codes** (library licence checked: `qrcode-generator` is MIT, which is compatible with AGPL-3.0-or-later; it goes into THIRD-PARTY-NOTICES).

**Last phase, for the future only (built but hidden, or not built):** the **grid helper** ("Make a grid of copies" with ready-made sheets; code and tests exist, hidden by `SHOW_GRID_HELPER` in `DataPanel.jsx`) and the **page-size switch for sheets** (one button that sets the page to a sheet's size; not built). Contents pages and flowing lists stay later too.

## 11. Decisions so far

| Decision | Answer |
|---|---|
| Data button in the top bar | Yes |
| Basic and Advanced kept apart, Advanced off by default | Yes |
| Pictures from a folder, embedded in the .znow | Yes |
| Merged pages are plain editable pages, merge again replaces them | Yes |
| Show on: first page / continuation / last page per item | Yes |
| Cards keep their places on page 2 | Yes (no sliding up) |
| No built-in "five per page" or other fixed templates; the engine follows the design | Yes |
| Different continuation design | Yes, by duplicating the page and tagging its role (section 5) |
| QR codes | Yes (after a library licence check) |
| **Ordering** | **CSV order, or a column named `id`. No other sorting in the first versions.** |
| **Data shape** | **One flat file, with the group value repeated in each row** (no linked files) |
| **Contents and index pages** | **Later** |
| **Calculated columns** | **Built from a menu** (tap or click choices such as "Join columns", "Year of date", "First letter"); no typing of formulas, which works the same on a PC and a tablet |
| **Shareable templates** | **Yes: a normal `.znow` whose name starts with `ZDATA = `** (for example `ZDATA = Name cards.znow`), and also marked inside the file. Opening one offers "Use this template" or "Edit it". |
| Two levels of groups | One level first (a second level could come later in Advanced) |

## 12. Still open

1. Whether the descending order on `id` (newest first) is wanted in Basic, or only ascending.
2. Whether Basic should also offer **"Group by"** (one level) or whether groups are Advanced only. Suggestion: one-level grouping in Advanced, since it needs a template with a header and card slots.
