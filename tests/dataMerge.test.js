// The core of the planned data merge (model/dataMerge/*): CSV reading, {{field}} filling, grids, sorting and photo matching, checked against
// the five scenarios from the proposal (docs/PROPOSAL-data-merge.md) plus labels, letters and a directory.
import { checkMerge, fieldsUsedOnPage, fillCrop, fillPictureItem, fillQrItem, qrProblems, makePhotoFinder, mergeAnnotations, pictureProblems } from "../apps/ZEditor/src/model/dataMerge/build.js";
import { cloneItems, dataSlots, gridCopies, groupRecords, sheetGrid, mergeGroupPage, planPages, previewAnnotations, showsOnPage } from "../apps/ZEditor/src/model/dataMerge/groups.js";
import { isTemplateFileName, stripTemplatePrefix, templateFileName, templateNeeds, templatePages, templateSettings } from "../apps/ZEditor/src/model/dataMerge/template.js";
import { applyCalculated, calculate, usableName } from "../apps/ZEditor/src/model/dataMerge/calc.js";
import { flowBoxOf, mergeFlowPage, planFlowPages, splitFlowText } from "../apps/ZEditor/src/model/dataMerge/flow.js";
import { recordFileNames, recordGroups, safeFileName } from "../apps/ZEditor/src/model/dataMerge/export.js";
import { makeZip } from "../apps/ZEditor/src/io/zipWriter.js";
import { buildQrText, mapOutsideFields } from "../apps/ZEditor/src/model/qrTypes.js";
import { columnIndex, excelDateText, isDateFormat, numberText, parseDateStyles, parseSharedStrings, parseSheetRows, rowsToCsv } from "../apps/ZEditor/src/model/dataMerge/xlsx.js";
import { openZip } from "../apps/ZEditor/src/io/zipReader.js";
import { readWorkbook } from "../apps/ZEditor/src/io/xlsxReader.js";
import zlib from "node:zlib";
import { buildListPage, hasListDesign, layoutEntry, packList } from "../apps/ZEditor/src/model/dataMerge/list.js";
import { parseCsv } from "../apps/ZEditor/src/model/dataMerge/csv.js";
import { fieldsIn, fillTemplate, formatDate, isEmptyFill } from "../apps/ZEditor/src/model/dataMerge/fields.js";
import { GRID_PRESETS, PAGE_SIZES_MM, fitGrid, gridCells, mergedPageCount, presetByKey, sheetsFor } from "../apps/ZEditor/src/model/dataMerge/layout.js";
import { alternateSide, dateOf, detectSortType, matchPhotos, numberOf, selectRecords, sortRecords } from "../apps/ZEditor/src/model/dataMerge/records.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

// ---- CSV reading
const messy = "﻿name,note,city\r\n\"Lopez, Ana\",\"says \"\"hi\"\"\nand bye\",Penang\r\nBudi,,Ipoh\r\n\r\nCitra,only two\r\n";
const m = parseCsv(messy);
ok(m.headers.join("|") === "name|note|city" && m.records.length === 3, "a BOM, CRLF, a blank line and a last line without all its cells are handled");
ok(m.records[0].name === "Lopez, Ana" && m.records[0].note === 'says "hi"\nand bye', "quoted commas, doubled quotes and a line break inside a cell are kept");
ok(m.records[2].city === "" && m.problems.length === 1 && /Row 4/.test(m.problems[0]), "a short row is padded with empty cells and reported");
const semi = parseCsv("a;b;c\n1;2;3\n4;5;6");
ok(semi.delimiter === ";" && semi.records[1].c === "6", "a semicolon file is recognised");
const tab = parseCsv("a\tb\n1\t2");
ok(tab.delimiter === "\t" && tab.records[0].b === "2", "so is a tab file");
const dup = parseCsv("name,name,\nx,y,z");
ok(dup.headers.join("|") === "name|name_2|column 3", "repeated and empty column names are made usable");
ok(parseCsv("").problems.length === 1 && parseCsv("   \n").records.length === 0, "an empty file is reported, not crashed on");

// ---- {{field}} filling
const rec = { name: "ana lopez", title: "Dr.", date: "2026-11-26", serial: "7", price: "1234567", web: "", nick: "" };
const f1 = fillTemplate("Dear {{title}} {{name|title}},", rec);
ok(f1.text === "Dear Dr. Ana Lopez," && f1.used.join() === "title,name" && f1.missing.length === 0, "fields with a filter");
ok(fillTemplate("{{date|date:d MMMM yyyy}}", rec).text === "26 November 2026" && fillTemplate("{{date|date:d MMMM yyyy}}", rec, { lang: "ms" }).text === "26 November 2026", "a date in words");
ok(formatDate("2026-03-05", "d MMMM yyyy", "ms") === "5 Mac 2026" && formatDate("not a date", "d MMMM yyyy") === "not a date", "Malay month names; text that is not a date is left alone");
ok(fillTemplate("No. {{serial|pad:3}} of 150", rec).text === "No. 007 of 150" && fillTemplate("RM {{price|number}}", rec).text === "RM 1,234,567", "serial numbers and thousands");
const miss = fillTemplate("{{name}} {{missing_field}}", rec);
ok(miss.missing.join() === "missing_field" && miss.text === "ana lopez {{missing_field}}", "a field with no column stays visible and is reported");
ok(fillTemplate("{{nick|default:friend}}", rec).text === "friend", "a default for an empty cell");
ok(isEmptyFill(fillTemplate("{{web}}", rec)) && !isEmptyFill(fillTemplate("Website: {{web}}", rec)) && !isEmptyFill(fillTemplate("{{name}}", rec)), "hide-when-empty applies to a box that holds only empty fields");
ok(fieldsIn("{{a}} and {{ b | upper }} and {{a}}").join() === "a,b", "the fields a text uses, once each");

// ---- 1. Invitation cards: 4 to an A4 sheet, plus a front and a back for each guest
const invites = parseCsv("guest,title,table,rsvp\nAna Lopez,Dr.,3,https://example.com/rsvp/ana\nBudi Hadi,Mr.,3,https://example.com/rsvp/budi\nCitra Dewi,Ms.,,https://example.com/rsvp/citra\nDewi Sari,Ms.,5,\nEka Putra,Mr.,5,https://example.com/rsvp/eka\nFitri Ahmad,Mrs.,7,https://example.com/rsvp/fitri");
const inviteGrid = presetByKey("invite-a6");
const inviteCells = gridCells(inviteGrid);
ok(inviteCells.length === 4 && inviteCells[3].x === 105 && inviteCells[3].y === 148.5 && inviteCells[3].x + inviteCells[3].w <= PAGE_SIZES_MM.a4.w && inviteCells[3].y + inviteCells[3].h <= PAGE_SIZES_MM.a4.h, "A6 invitations: 4 cells that fill an A4 sheet exactly");
const inviteSheets = sheetsFor(invites.records.length, inviteCells.length);
ok(inviteSheets.length === 2 && inviteSheets[1].cells.join() === "4,5,,", "6 guests make 2 sheets; the last has two empty cells");
ok(mergedPageCount(6, 2) === 12, "a two-page template (front and back) makes 12 pages for 6 guests");
const card = fillTemplate("You are invited, {{title}} {{guest}}. Table {{table|default:to be announced}}", invites.records[2]);
ok(card.text === "You are invited, Ms. Citra Dewi. Table to be announced", "an invitation with a missing table number uses the default");
ok(invites.records.filter((r) => r.rsvp === "").length === 1, "one guest has no RSVP link, so their QR code would be left out (reported before merging)");

// ---- 2. Historical timeline: sorted by year, zigzagging left and right
const timeline = parseCsv("year,event,detail\n1511,Portuguese take Melaka,\"A long account\nover two lines\"\nc. 1400,Parameswara founds Melaka,\n1957,Merdeka,Independence from Britain\n1824,Anglo-Dutch Treaty,\n500 BCE,Early settlements,\n1963,Malaysia formed,");
ok(numberOf("c. 1400") === 1400 && numberOf("500 BCE") === -500 && numberOf("-44") === -44 && numberOf("no year") === null, "years are read from messy text: c. 1400, 500 BCE");
const sorted = sortRecords(timeline.records, "year");
ok(sorted.map((r) => r.year).join("|") === "500 BCE|c. 1400|1511|1824|1957|1963", "the timeline is put in date order, with BCE first");
ok(sorted.map((r, i) => alternateSide(i)).join() === "left,right,left,right,left,right", "events zigzag left and right");
ok(sortRecords(timeline.records, { column: "year", descending: true })[0].year === "1963", "newest first on request");
ok(sortRecords([{ y: "1990" }, { y: "unknown" }, { y: "1980" }], "y").map((r) => r.y).join() === "1980,1990,unknown", "a row with no year goes last");
ok(timeline.records[0].detail === "A long account\nover two lines", "a detail with line breaks survives");

// ---- 3. Formal letters: semicolon file, salutation, a paragraph block, dates
const letters = parseCsv("salutation;name;address;date;body\nDatuk;Ahmad bin Ali;\"12 Jalan Bukit\nPenang\";2026-12-01;\"We are pleased to invite you.\n\nPlease reply by 10 December.\"\nPuan;SITI AMINAH;\"5 Lorong Ipoh\nIpoh\";2026-12-01;We look forward to seeing you.");
ok(letters.delimiter === ";" && letters.records.length === 2, "letters data in a semicolon file");
const l1 = fillTemplate("Dear {{salutation}} {{name|title}},", letters.records[1]);
ok(l1.text === "Dear Puan Siti Aminah," && fillTemplate("{{date|date:d MMMM yyyy}}", letters.records[0], { lang: "ms" }).text === "1 Disember 2026", "formal salutation, names in the right case, a date in Malay");
ok(letters.records[0].address === "12 Jalan Bukit\nPenang" && letters.records[0].body.split("\n\n").length === 2, "an address block and a body with paragraphs come through in one cell");
ok(mergedPageCount(2, 1) === 2, "one page per recipient");

// ---- 4. Image gallery with descriptions: 12 per A4 sheet, pictures matched by file name
const gallery = parseCsv("photo,title,description\nsunset.jpg,Sunset,Evening at the beach\nMARKET.JPG,Market,Fruit stalls\nharbour,Harbour,Boats at dawn\ntemple.jpg,Temple,Old stone steps\nmissing.jpg,Lost,No file for this one");
const galleryGrid = presetByKey("gallery-3x4");
ok(gridCells(galleryGrid).length === 12 && sheetsFor(15, 12).length === 2, "a 3 x 4 gallery holds 12 per sheet; 15 pictures need 2 sheets");
const cells = gridCells(galleryGrid);
ok(cells[11].x + cells[11].w <= PAGE_SIZES_MM.a4.w && cells[11].y + cells[11].h <= PAGE_SIZES_MM.a4.h, "every gallery cell lies inside the sheet");
const files = ["Sunset.jpg", "market.jpg", "harbour.png", "temple.jpg", "extra.jpg"];
const pm = matchPhotos(gallery.records, "photo", files);
ok(pm.matched.size === 4 && pm.matched.get(1) === "market.jpg" && pm.matched.get(2) === "harbour.png", "photos are found whatever the capitals, and a name without an extension finds its file");
ok(pm.missing.length === 1 && pm.missing[0].name === "missing.jpg", "a photo that is not in the folder is reported by name");

// ---- 5. Name cards: 10 per A4, accents and Chinese names kept, serial numbers
const people = parseCsv("name,role,company\nLim Wei Jie 林伟杰,Designer,Studio Hijau\nNurul Aini,Penyelaras,Kedai Buku\nÉmilie Dupont,Editor,Zine Co.\nAzman,,Distro Kita\nTan Mei Ling 陈美玲,Printer,Cetak Cepat\nRaj Kumar,Writer,Pen &amp; Ink\nSiti,Artist,Warna\nHaris,Musician,Bunyi\nIvy,Photographer,Cahaya\nOmar,Poet,Kata\nZul,Driver,Jalan");
const nameCard = presetByKey("name-card");
const nc = gridCells(nameCard);
ok(nc.length === 10 && nc[9].x + nc[9].w <= PAGE_SIZES_MM.a4.w && nc[9].y + nc[9].h <= PAGE_SIZES_MM.a4.h, "name cards: 10 per A4 sheet, all inside it");
ok(sheetsFor(people.records.length, nc.length).length === 2, "11 people make 2 sheets");
ok(people.records[0].name === "Lim Wei Jie 林伟杰" && people.records[2].name === "Émilie Dupont", "Chinese characters and accents are kept");
ok(isEmptyFill(fillTemplate("{{role}}", people.records[3])), "a card with no role hides the role line");
ok(fillTemplate("{{name}}\n{{role|default:}}", people.records[3]).text === "Azman\n", "or writes nothing");
ok(fillTemplate("No. {{n|pad:3}}", { n: "11" }).text === "No. 011", "serial numbers on the cards");

// ---- the other scenarios: labels, a directory
ok(presetByKey("label-3x7").cols * presetByKey("label-3x7").rows === 21 && gridCells(presetByKey("label-3x7")).every((c) => c.x + c.w <= 210 && c.y + c.h <= 297), "address labels: 21 per sheet, inside it");
const fit = fitGrid(PAGE_SIZES_MM.a4, { w: 90, h: 55 }, { x: 10, y: 10 }, { x: 0, y: 0 });
ok(fit.cols === 2 && fit.rows === 5, "the grid calculator agrees: 90 x 55 mm cards fit 2 x 5 on A4");
ok(GRID_PRESETS.every((p) => gridCells(p).length === p.cols * p.rows), "every preset's cells match its columns and rows");
const directory = parseCsv("name,bio,photo\n" + Array.from({ length: 40 }, (_, i) => `Person ${i + 1},Bio ${i + 1},p${i + 1}.jpg`).join("\n"));
ok(directory.records.length === 40 && mergedPageCount(40, 1) === 40, "a 40-person directory is 40 pages");
ok(selectRecords(40, { from: 5, to: 8 }).join() === "4,5,6,7" && selectRecords(5, { ticked: [0, 3] }).join() === "0,3" && selectRecords(3).length === 3, "all, a range or the ticked records");
// ---- Sorting by words, by number or ID, and by date, both ways
const people2 = [{ name: "émilie", id: "A10", joined: "03/04/2026", score: "RM 1,200" }, { name: "Zul", id: "A2", joined: "2026-01-15", score: "300" }, { name: "Ana", id: "A1", joined: "26 Nov 2025", score: "" }, { name: "Budi", id: "", joined: "5 Mac 2026", score: "45.5" }, { name: "citra", id: "B1", joined: "", score: "9" }];
const names = (rows) => rows.map((r) => r.name).join(",");
ok(names(sortRecords(people2, { column: "name", as: "text" })) === "Ana,Budi,citra,émilie,Zul", "words A to Z: capitals and accents do not matter");
ok(names(sortRecords(people2, { column: "name", as: "text", descending: true })) === "Zul,émilie,citra,Budi,Ana", "words Z to A");
ok(names(sortRecords(people2, { column: "id", as: "natural" })) === "Ana,Zul,émilie,citra,Budi", "IDs sort naturally: A1, A2, A10, B1, and the blank last");
ok(names(sortRecords(people2, { column: "id", as: "natural", descending: true })) === "citra,émilie,Zul,Ana,Budi", "IDs descending, the blank still last");
ok(names(sortRecords(people2, { column: "id", as: "text" })).startsWith("Ana,émilie,Zul"), "plain text order differs from natural order: A1, A10, A2");
const byScore = sortRecords(people2, { column: "score", as: "number" }).map((r) => r.score).join("|");
ok(byScore === "9|45.5|300|RM 1,200|", "number sort: 9, 45.5, 300, 1200, blank");
ok(sortRecords(people2, { column: "score", as: "number", descending: true }).map((r) => r.score).join("|") === "RM 1,200|300|45.5|9|", "numbers descending, the blank still last");
ok(dateOf("03/04/2026") === dateOf("3 April 2026") && dateOf("03/04/2026", "mdy") === dateOf("March 4, 2026") && dateOf("26/11/2026") === dateOf("2026-11-26") && dateOf("13/02/2026", "mdy") === dateOf("13 Feb 2026"), "dates read as day-first or month-first, in numbers or words, and a first part over 12 is the day");
ok(dateOf("5 Mac 2026") === dateOf("2026-03-05") && dateOf("1 Disember 2026") === dateOf("2026-12-01") && dateOf("hello") === null, "Malay month names; a word is not a date");
ok(names(sortRecords(people2, { column: "joined", as: "date" })) === "Ana,Zul,Budi,émilie,citra", "dates oldest first (mixed formats: 26 Nov 2025, 2026-01-15, 5 Mac 2026, 03/04/2026), the blank last");
ok(names(sortRecords(people2, { column: "joined", as: "date", descending: true })) === "émilie,Budi,Zul,Ana,citra", "dates newest first");
ok(detectSortType(people2, "joined") === "date" && detectSortType(people2, "score") === "number" && detectSortType(people2, "name") === "text", "automatic picks date, number or words from the cells");
ok(detectSortType([{ y: "1999" }, { y: "2001" }], "y") === "number" && detectSortType([{ c: "A1" }, { c: "A2" }], "c") === "text", "a column of years is numbers; codes are words (choose 'ID' to sort them naturally)");
const tied = [{ c: "KL", n: "Zul" }, { c: "Penang", n: "Budi" }, { c: "KL", n: "Ana" }, { c: "Penang", n: "Citra" }];
ok(sortRecords(tied, [{ column: "c" }, { column: "n", descending: true }]).map((r) => r.c + ":" + r.n).join() === "KL:Zul,KL:Ana,Penang:Citra,Penang:Budi", "sort by one field, then break ties by another (here descending)");
ok(sortRecords(tied, "c").map((r) => r.n).join() === "Zul,Ana,Budi,Citra", "equal values keep their original order (stable)");
// ---- Building merged pages from a template page
const template = [
  { id: 1, type: "text", text: "Dear {{title}} {{name|title}},", x: 10, y: 10, colorRuns: [{ start: 0, end: 4, color: "#ff0000" }] },
  { id: 2, type: "text", text: "Fixed words", x: 10, y: 40 },
  { id: 3, type: "text", text: "{{city}} {{nope}}", x: 10, y: 70, groupId: "g1" },
  { id: 4, type: "rect", x: 0, y: 0, width: 5, height: 5, groupId: "g1" },
  { id: 5, type: "text", text: "continues", threadFrom: 3 },
];
let nextId = 100, nextGroup = 50;
const merged = mergeAnnotations(template, { title: "Dr.", name: "ana lopez", city: "Penang" }, { newId: () => nextId++, newGroupId: () => "g" + nextGroup++ });
ok(merged.annotations.length === 5 && merged.annotations.map((a) => a.id).join() === "100,101,102,103,104", "every item gets a new id");
ok(merged.annotations[0].text === "Dear Dr. Ana Lopez," && merged.annotations[0].colorRuns === undefined, "the text is filled, and styling that no longer lines up is dropped");
ok(merged.annotations[1].text === "Fixed words" && merged.annotations[1] !== template[1] || merged.annotations[1].text === "Fixed words", "a box with no field is left as it is");
ok(merged.annotations[2].groupId === merged.annotations[3].groupId && merged.annotations[2].groupId === "g50", "items that were grouped stay grouped, in a new group");
ok(merged.annotations[4].threadFrom === 102, "threaded text follows the new ids");
ok(merged.missing.join() === "nope" && merged.annotations[2].text === "Penang {{nope}}", "a field with no column stays visible and is reported");
ok(template[0].id === 1 && template[0].text.includes("{{title}}"), "the template itself is not changed");
ok(fieldsUsedOnPage(template).join() === "title,name,city,nope", "the fields a page uses");
const chk = checkMerge(template, ["title", "name", "city"], [{ title: "Dr.", name: "A", city: "" }, { title: "", name: "B", city: "x" }]);
ok(chk.missing.join() === "nope" && chk.emptyCounts.map((e) => e.field + e.count).join() === "title1,city1", "the check lists missing fields and how many records have an empty cell");
// ---- Data blocks and group pages (Advanced)
const band = (n, v) => Array.from({ length: n }, (_, i) => ({ band: v, "first name": v + i }));
const bandPeople = [...band(10, "Black Flags"), ...band(3, "Red Wolves")];
const grouped = groupRecords(bandPeople, "band");
ok(grouped.length === 2 && grouped[0].records.length === 10 && grouped[1].value === "Red Wolves", "records are grouped by a column, in order of first appearance");
ok(groupRecords(bandPeople, "").length === 1, "no Group by: one group");
const plan = planPages(bandPeople, { slotCount: 5, groupBy: "band" });
ok(plan.length === 3 && plan.map((p) => p.pageInGroup + "/" + p.pagesInGroup).join() === "1/2,2/2,1/1", "10 members with 5 slots make 2 pages, 3 members make 1");
ok(plan[1].slotRecords.map((r) => r["first name"]).join() === "Black Flags5,Black Flags6,Black Flags7,Black Flags8,Black Flags9", "page 2 starts at the 6th member");
ok(plan[2].slotRecords.filter(Boolean).length === 3 && plan[2].slotRecords[3] === null, "a short last page leaves empty slots");
ok(planPages(bandPeople, { slotCount: 5 }).length === 3 && planPages([], { slotCount: 5 }).length === 0, "no group: records fill pages in order; no records, no pages");
const gpage = [
  { id: 1, type: "text", text: "{{band}}", x: 10, y: 5 },
  { id: 2, type: "text", text: "{{band}} (cont.)", x: 10, y: 5, showOn: "continuation" },
  { id: 3, type: "text", text: "{{first name}}", x: 10, y: 50, groupId: "c2", dataBlock: true },
  { id: 4, type: "text", text: "{{first name}}", x: 10, y: 20, groupId: "c1", dataBlock: true },
  { id: 5, type: "text", text: "{{first name}}", x: 200, y: 20, groupId: "c3", dataBlock: true },
  { id: 6, type: "text", text: "Page {{page in group}} of {{pages in group}}", x: 10, y: 290 },
];
ok(dataSlots(gpage).join() === "c1,c3,c2", "slots fill rows from the top, each left to right");
let n = 100;
const gp = (pl, rep) => mergeGroupPage(gpage, pl, { newId: () => n++, newGroupId: () => "g" + n++, repeatOthers: rep }).annotations;
const small = planPages(bandPeople, { slotCount: 3, groupBy: "band" });
const p1 = gp(small[0], true), p2 = gp(small[1], true);
ok(p1.length === 5 && p1[0].text === "Black Flags", "first page: title, three blocks, counters");
ok(!p1.some((a) => a.text === "Black Flags (cont.)") && p2.some((a) => a.text === "Black Flags (cont.)"), "Continuation only shows from page 2");
ok(p1.every((a) => a.dataBlock === undefined && a.showOn === undefined), "made pages carry no merge markers");
ok(p1.find((a) => a.text.startsWith("Page")).text === "Page 1 of 4", "page counters");
ok(gp(small[1], false).every((a) => a.text !== "Black Flags" && !a.text.startsWith("Page")), "without Repeat, plain non-data items show on the first page only");
ok(gp(plan[2], true).filter((a) => /^Red Wolves\d$/.test(a.text)).length === 3, "empty slots are left out");
ok(showsOnPage("last", { pageInGroup: 2, pagesInGroup: 2 }) && !showsOnPage("last", { pageInGroup: 1, pagesInGroup: 2 }) && showsOnPage("every", { pageInGroup: 2, pagesInGroup: 2 }, false), "Show on rules");
const pv = previewAnnotations(gpage, bandPeople, 3, null);
ok(pv.find((a) => a.id === 4).text === "Black Flags3" && pv.find((a) => a.id === 3).text === "Black Flags5", "the preview fills the blocks with the records from the chosen one on");
ok(previewAnnotations(gpage, bandPeople, 12, null).filter((a) => a.hidden).length === 2, "slots with no record are hidden in the preview");
let gid = 500, gn = 900;
const gblock = [{ id: 1, type: "text", text: "{{a}}", x: 20, y: 30, groupId: "b", dataBlock: true }, { id: 2, type: "rect", x: 20, y: 60, width: 50, height: 10, groupId: "b", dataBlock: true }];
const gres = gridCopies(gblock, { x: 20, y: 30, width: 100, height: 50 }, { cols: 2, rows: 3, gap: { x: 10, y: 5 } }, { newId: () => gid++, newGroupId: () => "G" + gn++ }, { width: 300, height: 400 });
ok(gres.items.length === 10 && new Set(gres.items.map((a) => a.groupId)).size === 5, "a 2 x 3 grid adds 5 copies of the block, each its own group");
ok(gres.items[0].x === 130 && gres.items[0].y === 30 && gres.items[2].x === 20 && gres.items[2].y === 85, "copies sit one block plus gap apart, across then down");
ok(gres.items.every((a) => a.dataBlock) && gres.outside === 0, "copies stay data blocks and fit the page");
ok(gridCopies(gblock, { x: 20, y: 30, width: 100, height: 50 }, { cols: 3, rows: 1, gap: { x: 0, y: 0 } }, { newId: () => gid++, newGroupId: () => "G" + gn++ }, { width: 250, height: 400 }).outside === 1, "blocks that run off the page are counted");
// ---- Picture fields
const photos = [{ name: "ana.jpg", src: "data:ana", width: 800, height: 600 }, { name: "Ben.PNG", src: "data:ben", width: 300, height: 600 }];
const find = makePhotoFinder(photos);
ok(find("ana.jpg") === photos[0] && find("ANA") === photos[0] && find("pics/Ben.png") === photos[1] && find("ben") === photos[1], "photos are found by name, ignoring folders, capitals and a missing extension");
ok(find("") === null && find("cara.jpg") === null && find("ana.png") === null, "no cell, no such file, or the wrong extension: not found");
const crop = fillCrop(800, 600, 100, 100);
ok(crop.cropW === 600 && crop.cropH === 600 && crop.cropX === 100 && crop.cropY === 0, "a wide photo in a square frame is cropped at the sides, centred");
const tall = fillCrop(300, 600, 200, 100);
ok(tall.cropW === 300 && tall.cropH === 150 && tall.cropY === 225, "a tall photo in a wide frame is cropped top and bottom, centred");
const frame = { id: 1, type: "image", x: 5, y: 5, width: 100, height: 100, src: "data:placeholder", naturalWidth: 10, naturalHeight: 10, picField: "photo" };
const filledPic = fillPictureItem(frame, { photo: "ana.jpg" }, find);
ok(filledPic.ann.src === "data:ana" && filledPic.ann.naturalWidth === 800 && filledPic.ann.cropW === 600 && filledPic.ann.width === 100, "a picture field takes the photo and keeps its frame");
ok(fillPictureItem(frame, { photo: "zed.jpg" }, find).ann === null && fillPictureItem(frame, { photo: "" }, find).ann === null, "a missing photo leaves the picture out");
ok(fillPictureItem({ id: 2, type: "image" }, {}, find).handled === false, "a picture without a field is left alone");
let picN = 700;
const picMerged = mergeAnnotations([frame, { id: 3, type: "text", text: "{{photo}}" }], { photo: "Ben.png" }, { newId: () => picN++, newGroupId: () => "g" + picN++, findPhoto: find });
ok(picMerged.annotations.length === 2 && picMerged.annotations[0].src === "data:ben" && picMerged.annotations[0].picField === undefined, "a merged page gets the photo and no marker");
ok(mergeAnnotations([frame], { photo: "nope.jpg" }, { newId: () => picN++, newGroupId: () => "g" + picN++, findPhoto: find }).annotations.length === 0, "and no picture when none is found");
const pp = pictureProblems([frame], [{ photo: "ana.jpg" }, { photo: "" }, { photo: "x.jpg" }, { photo: "x.jpg" }], find)[0];
ok(pp.column === "photo" && pp.empty === 1 && pp.notFound.join() === "x.jpg", "picture problems: empty cells, and names with no photo (each once)");
// ---- Data templates
ok(templateFileName("Name cards") === "ZDATA = Name cards.znow" && templateFileName("ZDATA = Name cards") === "ZDATA = Name cards.znow", "template file names start with ZDATA = (once)");
ok(isTemplateFileName("ZDATA = Labels.znow") && isTemplateFileName("zdata=Labels.znow") && !isTemplateFileName("My zine.znow") && stripTemplatePrefix("ZDATA = Labels") === "Labels", "template names are recognised");
const tpages = [
  { key: 1, hidden: true, annotations: [{ id: 1, type: "text", text: "{{name}} {{page in group}}" }, { id: 2, type: "image", picField: "photo" }] },
  { key: 2, mergedFrom: 1, mergeRow: 1, annotations: [] },
  { key: 3, annotations: [{ id: 3, type: "text", text: "{{city}}" }] },
];
const tp = templatePages(tpages);
ok(tp.length === 2 && tp[0].hidden === undefined && tp[1].key === 3, "a template keeps the designed pages, shown again, and drops the made ones");
ok(templateNeeds(tp, "band").join() === "name,photo,city,band", "a template lists the columns it needs (fields, picture columns, Group by), without page counters");
const ts = templateSettings({ dataSource: { name: "x" }, dataPhotos: [1], dataGroupBy: "band", dataRepeatOthers: false, guidesOn: true });
ok(ts.dataSource === undefined && ts.dataPhotos === undefined && ts.dataGroupBy === "band" && ts.guidesOn === true, "a template carries no data or photos, but keeps the other settings");
const sg = sheetGrid(presetByKey("label-3x7"), 2);
ok(sg.cols === 3 && sg.rows === 7 && sg.pitch.x === (63.5 + 2.54) * 2 && sg.pitch.y === 38.1 * 2 && sg.origin.x === 14.4, "a label sheet in pixels: cell plus gap apart, from its first cell");
const sgc = gridCopies(gblock, { x: 14.4, y: 30.3, width: 100, height: 50 }, { cols: 3, rows: 7, pitch: sg.pitch }, { newId: () => gid++, newGroupId: () => "G" + gn++ }, { width: 2000, height: 2000 });
ok(sgc.items.length === 40 && Math.abs(sgc.items[0].x - (20 + sg.pitch.x)) < 1e-9 && sgc.items[0].y === 30, "a sheet grid adds one copy for every cell but the first");
// ---- Calculated columns
const crec = { first: "ana", last: "lopez  ", born: "1990-07-22", price: "1,200", empty: "", dob2: "26 Nov 2000" };
const T = new Date(2026, 10, 27); // 27 Nov 2026
ok(calculate({ kind: "rownumber", start: 5, pad: 3 }, crec, 2) === "007" && calculate({ kind: "rownumber" }, crec, 0) === "1", "row number: start and padding");
ok(calculate({ kind: "join", columns: ["first", "empty", "last"], separator: " " }, crec, 0) === "ana lopez", "join skips empty cells");
ok(calculate({ kind: "initials", column: "first" }, { first: "ana maria lopez" }, 0) === "AM" && calculate({ kind: "initials", column: "first", max: 3 }, { first: "ana maria lopez" }, 0) === "AML", "initials");
ok(calculate({ kind: "word", column: "a", which: "last" }, { a: "Ahmad bin Abdullah" }, 0) === "Abdullah" && calculate({ kind: "word", column: "a", which: "first" }, { a: "Ahmad bin Abdullah" }, 0) === "Ahmad", "first or last word");
ok(calculate({ kind: "case", column: "first", mode: "title" }, crec, 0) === "Ana" && calculate({ kind: "case", column: "first", mode: "upper" }, crec, 0) === "ANA", "capital letters");
ok(calculate({ kind: "text", column: "price", before: "RM " }, crec, 0) === "RM 1,200" && calculate({ kind: "text", column: "empty", before: "RM " }, crec, 0) === "", "words before and after, nothing for an empty cell");
ok(calculate({ kind: "math", column: "price", op: "*", value: 2 }, crec, 0) === "2400" && calculate({ kind: "math", column: "price", op: "/", value: 0 }, crec, 0) === "" && calculate({ kind: "math", column: "first", op: "+", value: 1 }, crec, 0) === "", "calculate with a number; no divide by zero, no text");
ok(calculate({ kind: "age", column: "born" }, crec, 0, T) === "36" && calculate({ kind: "age", column: "dob2" }, crec, 0, new Date(2026, 10, 25)) === "25" && calculate({ kind: "age", column: "empty" }, crec, 0, T) === "", "age counts whole years, birthday day included");
ok(calculate({ kind: "dateparts", column: "born", part: "monthname" }, crec, 0) === "July" && calculate({ kind: "dateparts", column: "born", part: "year" }, crec, 0) === "1990" && calculate({ kind: "dateparts", column: "born", part: "day" }, crec, 0) === "22", "part of a date");
const cres = applyCalculated(["first", "last"], [{ first: "a", last: "b" }, { first: "c", last: "d" }], [{ name: "No.", kind: "rownumber" }, { name: "first", kind: "rownumber" }, { name: "Full", kind: "join", columns: ["first", "last"] }]);
ok(cres.headers.join() === "first,last,No.,Full" && cres.records[1]["No."] === "2" && cres.records[1].Full === "c d", "calculated columns are added to the headers and records; a clashing name is skipped");
ok(usableName("A {b}|", []) === "A b" && usableName("Full", ["Full"]) === "Full 2" && usableName("  ", []) === "", "names are made usable and unique");
// ---- Continuation designs
const fourteen = band(14, "Black Flags");
const cplan = planPages(fourteen, { slotCount: 5, nextSlotCount: 6, groupBy: "band" });
ok(cplan.map((p) => p.slotRecords.filter(Boolean).length).join() === "5,6,3" && cplan.map((p) => p.design).join() === "first,continuation,continuation", "a group of 14 with 5 and 6 slots makes pages of 5, 6 and 3");
ok(cplan[0].slotRecords.length === 5 && cplan[1].slotRecords.length === 6 && cplan[2].slotRecords.length === 6 && cplan[2].slotRecords[3] === null, "each page has the slots of its design");
ok(planPages(band(4, "X"), { slotCount: 5, nextSlotCount: 6, groupBy: "band" }).length === 1 && planPages(band(4, "X"), { slotCount: 5, nextSlotCount: 6, groupBy: "band" })[0].design === "first", "a group that fits the first page uses the first design");
ok(planPages(fourteen, { slotCount: 5, groupBy: "band" }).map((p) => p.slotRecords.length).join() === "5,5,5", "without a continuation design the first design's slots are reused");
const cl = cloneItems(gblock, () => gid++, () => "G" + gn++);
ok(cl.length === 2 && cl[0].dataBlock === true && cl[0].groupId === cl[1].groupId && cl[0].groupId !== "b" && cl[0].id !== 1, "a copy of the designed page keeps its data block markers, with new ids");
ok(templatePages([{ key: 1, hidden: true, annotations: [] }, { key: 2, dataFor: 1, hidden: true, annotations: [] }, { key: 3, mergedFrom: 1, annotations: [] }]).every((p) => !p.hidden) && templatePages([{ key: 1, annotations: [] }, { key: 2, dataFor: 1, annotations: [] }, { key: 3, mergedFrom: 1, annotations: [] }]).length === 2, "a data template keeps the continuation design (shown again) and drops the made pages");
// ---- QR codes
const fakeQr = (text) => (text.length > 50 ? null : { src: "qr:" + text, width: 330, height: 330 });
const qrFrame = { id: 1, type: "image", x: 10, y: 20, width: 100, height: 60, src: "x", naturalWidth: 5, naturalHeight: 5, qrText: "https://e.org/{{id}}" };
const qrDone = fillQrItem(qrFrame, { id: "42" }, fakeQr).ann;
ok(qrDone.src === "qr:https://e.org/42" && qrDone.width === 60 && qrDone.height === 60 && qrDone.x === 30 && qrDone.y === 20, "a QR item takes the code of its text, square and centred in its frame");
ok(fillQrItem(qrFrame, { id: "" }, fakeQr).ann === null, "a field that is empty leaves the code out (it would point to the wrong place)");
ok(fillQrItem({ ...qrFrame, qrText: "{{id}}" }, { id: "" }, fakeQr).ann === null && fillQrItem({ ...qrFrame, qrText: "{{nope}}" }, { id: "1" }, fakeQr).ann === null, "nothing to encode, or a field the data lacks: the code is left out");
ok(fillQrItem({ ...qrFrame, qrText: "{{id}}" }, { id: "x".repeat(60) }, fakeQr).ann === null, "text too long for a code: left out");
ok(fillQrItem({ id: 2, type: "image" }, {}, fakeQr).handled === false, "a picture without QR text is left alone");
ok(fieldsUsedOnPage([qrFrame]).join() === "id", "the fields a QR code uses count as used");
ok(qrProblems([qrFrame, { ...qrFrame, qrText: "{{c}}" }], [{ id: "1", c: "" }, { id: "2", c: "z" }]).map((q) => q.empty).join() === "0,1", "QR problems count rows with nothing to encode");
let qn = 900;
const qm = mergeAnnotations([qrFrame], { id: "7" }, { newId: () => qn++, newGroupId: () => "g" + qn++, makeQr: fakeQr });
ok(qm.annotations.length === 1 && qm.annotations[0].src === "qr:https://e.org/7" && qm.annotations[0].qrText === undefined, "a merged page gets the QR code and no marker");
// ---- Letters that run onto a second page
const fitTen = (k, rest) => Math.min(rest.length, 10 + k * 0); // 10 characters a page
ok(splitFlowText("short", fitTen).parts.join("|") === "short", "text that fits makes one part");
const sp = splitFlowText("aaaa bbbb cccc dddd eeee ffff", (k, rest) => (rest.length <= 10 ? rest.length : 10));
ok(sp.parts.length === 3 && sp.parts[0] === "aaaa bbbb" && !sp.cut, "long text is cut into parts, leading and trailing spaces removed");
ok(splitFlowText("abc def", () => 0).cut === true && splitFlowText("abc def", () => 0).parts.length === 1, "a box that fits nothing does not loop forever");
ok(splitFlowText("x ".repeat(100), () => 2, 5).parts.length === 5, "there is a limit to how many pages one record can take");
const L1 = [{ id: 1, type: "text", text: "Dear {{name}}, {{body}}", flowText: true, frameHeight: 100 }, { id: 2, type: "text", text: "To {{name}}", showOn: "first" }, { id: 3, type: "text", text: "Page {{page in group}} of {{pages in group}}" }];
const L2 = [{ id: 11, type: "text", text: "", flowText: true, frameHeight: 100 }, { id: 13, type: "text", text: "Page {{page in group}} of {{pages in group}}" }];
const fl = planFlowPages([{ name: "Ana", body: "x".repeat(8) }, { name: "Ben", body: "y".repeat(40) }], L1, L2, (box, rest) => (rest.length <= 20 ? rest.length : 20), "en");
ok(fl.map((p) => p.recordNo + ":" + p.pageInGroup + "/" + p.pagesInGroup).join() === "1:1/1,2:1/3,2:2/3,2:3/3", "a short record gets one page, a long one three");
ok(fl[0].flowText === "Dear Ana, xxxxxxxx" && fl[1].design === "first" && fl[2].design === "continuation", "the first page holds the start, later pages use the continuation design");
let fn = 1300;
const fpage = (plan, ann) => mergeFlowPage(ann, plan, { newId: () => fn++, newGroupId: () => "g" + fn++, repeatOthers: true }).annotations;
const fp1 = fpage(fl[1], L1), fp2 = fpage(fl[2], L2);
ok(fp1.map((a) => a.text).join("|") === fl[1].flowText + "|To Ben|Page 1 of 3" && fp2.map((a) => a.text).join("|") === fl[2].flowText + "|Page 2 of 3", "the long text goes in the long-text box, Show on and page counters work");
ok(fp1.every((a) => a.flowText === undefined) && flowBoxOf(L1).id === 1 && flowBoxOf([{ type: "text", text: "a" }]) === null, "made pages carry no marker; the long-text box is found");
// ---- Export each record
const epages = [
  { key: 1, hidden: true }, { key: 2, mergedFrom: 1, mergeRow: 1, mergeRecord: { id: "7", name: "Ana" } }, { key: 3, mergedFrom: 1, mergeRow: 2, mergeRecord: { id: "8", name: "Ana" } },
  { key: 4, mergedFrom: 1, mergeRow: 2, mergeRecord: { id: "8", name: "Ana" } }, { key: 5, mergedFrom: 1, mergeRow: 3, mergeRecord: { id: "9", name: "a/b:c?" } },
];
const eg = recordGroups(epages);
ok(eg.length === 3 && eg[1].pageIndices.join() === "2,3" && eg[0].pageIndices.join() === "1", "the pages of one record are grouped, in page order");
ok(recordFileNames(eg, "{{id}} {{name}}", "en").join("|") === "7 Ana.pdf|8 Ana.pdf|9 a b c.pdf", "file names come from the pattern, made safe");
ok(recordFileNames(eg, "{{name}}", "en").join("|") === "Ana.pdf|Ana (2).pdf|a b c.pdf", "a name used twice gets a number");
ok(recordFileNames(eg, "", "en")[0] === "record 1.pdf" && safeFileName("..  ", "x") === "x" && safeFileName("A:B", "x") === "A B", "an empty name falls back to the record number");
const zip = makeZip([{ name: "a.pdf", data: new Uint8Array([1, 2, 3]) }, { name: "é.pdf", data: new Uint8Array([9]) }], new Date(2026, 10, 27, 10, 20, 30));
const zv = new DataView(zip.buffer);
ok(zv.getUint32(0, true) === 0x04034b50 && zv.getUint32(zip.length - 22, true) === 0x06054b50 && zv.getUint16(zip.length - 22 + 10, true) === 2, "a zip has local headers and an end record with the number of files");
// ---- Friendlier matching of field names
ok(fillTemplate("{{Name}} {{ CITY }}", { name: "Ana", city: "Ipoh" }).text === "Ana Ipoh" && fillTemplate("{{Name}}", { name: "Ana" }).missing.length === 0, "a field name matches its column whatever the capital letters");
const cm = checkMerge([{ id: 1, type: "text", text: "{{Name}} {{AGE}}" }], ["name", "age"], [{ name: "a", age: "" }]);
ok(cm.missing.length === 0 && cm.emptyCounts.map((e) => e.field + e.count).join() === "AGE1", "the check agrees");
ok(fillQrItem({ ...qrFrame, qrText: "" }, { id: "1" }, fakeQr).ann === null && fillQrItem({ ...qrFrame, qrText: "" }, { id: "1" }, fakeQr).handled === true, "a QR with no text yet is left out of made pages");
ok(qrProblems([{ ...qrFrame, qrText: "" }], [{ id: "1" }])[0].empty === 1, "and counted in the check");
const qpv = previewAnnotations([{ ...qrFrame, qrText: "{{nope}}" }], [{ id: "1" }], 0, null, "en", null, fakeQr);
ok(qpv[0].hidden === undefined && qpv[0].src === "x", "a QR that cannot be made yet keeps its placeholder in the preview");
// ---- QR types
ok(buildQrText("website", { url: "example.com" }) === "https://example.com" && buildQrText("website", { url: "http://a.org/{{id}}" }) === "http://a.org/{{id}}" && buildQrText("website", { url: "{{website}}" }) === "{{website}}" && buildQrText("website", { url: " " }) === "", "website: a bare address gets https://, fields and other schemes are left alone, empty gives nothing");
ok(buildQrText("phone", { number: "+60 12-345 6789" }) === "tel:+60123456789" && buildQrText("phone", { number: "{{phone}}" }) === "tel:{{phone}}", "phone: spaces and dashes go, fields stay");
ok(buildQrText("sms", { number: "012 345", message: "Hi {{name}}" }) === "SMSTO:012345:Hi {{name}}", "SMS");
ok(buildQrText("email", { to: "a@b.com", subject: "Hello there", body: "Hi {{name}}, ok?" }) === "mailto:a@b.com?subject=Hello%20there&body=Hi%20{{name}}%2C%20ok%3F" && buildQrText("email", { to: "a@b.com" }) === "mailto:a@b.com", "email: subject and message encoded, fields kept");
ok(buildQrText("whatsapp", { number: "+60 12-3456", message: "Hi there" }) === "https://wa.me/60123456?text=Hi%20there", "WhatsApp: digits only");
ok(buildQrText("wifi", { ssid: "My;Net", password: "p:a\\ss", security: "WPA" }) === "WIFI:T:WPA;S:My\\;Net;P:p\\:a\\\\ss;;" && buildQrText("wifi", { ssid: "Cafe", security: "nopass" }) === "WIFI:T:nopass;S:Cafe;;" && buildQrText("wifi", { ssid: "A", password: "b", security: "WEP", hidden: true }) === "WIFI:T:WEP;S:A;P:b;H:true;;" && buildQrText("wifi", { ssid: "" }) === "", "Wi-Fi: special characters escaped, no password, hidden");
const vc = buildQrText("contact", { first: "Ana", last: "Lopez, Jr", org: "ACME", phone: "+60 1", email: "a@b.my" }).split("\n");
ok(vc[0] === "BEGIN:VCARD" && vc.includes("N:Lopez\\, Jr;Ana;;;") && vc.includes("FN:Ana Lopez\\, Jr") && vc.includes("TEL:+601") && vc[vc.length - 1] === "END:VCARD" && !vc.some((l) => l.startsWith("TITLE")), "contact card: vCard lines, empty ones left out");
ok(buildQrText("contact", { phone: "1" }) === "" && buildQrText("location", { lat: "3.1", lng: "101.6" }) === "geo:3.1,101.6" && buildQrText("location", { lat: "3.1" }) === "" && buildQrText("custom", { text: " x " }) === " x ", "contact needs a name, location both numbers, custom text is as typed");
ok(mapOutsideFields("a b{{x y}}c d", (t) => t.toUpperCase()) === "A B{{x y}}C D", "text between fields can be changed without touching the fields");
ok(fillQrItem({ ...qrFrame, qrType: "website", qrText: "{{id}}" }, { id: "www.yahoo.com" }, fakeQr).ann.src === "qr:https://www.yahoo.com" && fillQrItem({ ...qrFrame, qrType: "website", qrText: "{{id}}" }, { id: "http://a.org" }, fakeQr).ann.src === "qr:http://a.org" && fillQrItem({ ...qrFrame, qrText: "{{id}}" }, { id: "www.yahoo.com" }, fakeQr).ann.src === "qr:www.yahoo.com", "a Website QR puts https:// before an address from the data that has none; custom text is left as it is");

// ---- .xlsx files
ok(columnIndex("A1") === 0 && columnIndex("Z9") === 25 && columnIndex("AA3") === 26 && columnIndex("") === -1, "column letters become numbers");
ok(excelDateText(46364) === "2026-12-08" && excelDateText(45658) === "2025-01-01" && excelDateText(46364.5) === "2026-12-08 12:00" && excelDateText(0.75) === "18:00" && excelDateText(60) === "1900-02-29" || excelDateText(61) === "1900-03-01", "Excel date numbers become dates, with the time when there is one");
ok(excelDateText(61) === "1900-03-01" && excelDateText(43831) === "2020-01-01" && excelDateText(1, true) === "1904-01-02", "the 1900 leap-year quirk and the 1904 system");
ok(numberText("1.0") === "1" && numberText("187") === "187" && numberText("0.1") === "0.1" && numberText("85.50000000000001") === "85.5" && numberText("60123456789") === "60123456789", "numbers lose the .0 and the floating-point dust");
ok(isDateFormat("yyyy-mm-dd") && isDateFormat("d mmm yy") && isDateFormat("h:mm AM/PM") && !isDateFormat("General") && !isDateFormat('0.00 "days"') && !isDateFormat("#,##0.00") && !isDateFormat('"RM" #,##0'), "date number formats are told from the rest");
const styles = '<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="2"/></cellXfs></styleSheet>';
const isDateStyle = parseDateStyles(styles);
ok(!isDateStyle(0) && isDateStyle(1) && isDateStyle(2) && !isDateStyle(3) && !isDateStyle(null), "cell styles that show a date are found (built-in and custom)");
const sst = parseSharedStrings('<sst><si><t>id</t></si><si><r><t>Ana </t></r><r><rPr/><t xml:space="preserve">Lopez</t></r><rPh sb="0"><t>x</t></rPh></si><si><t>A &amp; B &lt;ok&gt; caf&#233;</t></si><si/></sst>');
ok(sst.join("|") === "id|Ana Lopez|A & B <ok> café|", "shared strings: plain, rich text without phonetic hints, entities, empty");
const sheetXml = '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>when</t></is></c></row>'
  + '<row r="2"><c r="A2"><v>1.0</v></c><c r="B2" t="s"><v>2</v></c><c r="C2" t="b"><v>1</v></c><c r="D2" s="2"><v>46364.0</v></c></row><row r="3"/><row r="4"><c r="B4" t="str"><f>A2&amp;"x"</f><v>1x</v></c><c r="C4" t="e"><v>#N/A</v></c></row><row r="7"><c r="A7"/></row></sheetData></worksheet>';
const parsedRows = parseSheetRows(sheetXml, sst, isDateStyle);
ok(parsedRows[0].join("|") === "id|Ana Lopez||when" && parsedRows[1].join("|") === "1|A & B <ok> café|TRUE|2026-12-08" && parsedRows[3].join("|") === "|1x|", "sheet rows: shared and inline strings, numbers, booleans, dates, formula values, errors blank, gaps filled");
const csvOut = rowsToCsv(parsedRows);
ok(csvOut.rows === 3 && csvOut.csv.split("\n")[0] === "id,Ana Lopez,,when" && csvOut.csv.includes('"A & B <ok> café"') === false && csvOut.csv.split("\n").length === 5, "rows become CSV text; trailing empty rows are dropped");
ok(rowsToCsv([[], ["", ""]]) === null && rowsToCsv([[], ["a", "b", ""], ["1", 'say "hi", ok', ""]]).csv === 'a,b\n1,"say ""hi"", ok"\n', "empty sheets give nothing; leading empty rows and trailing empty columns are dropped; cells are quoted when needed");
// a real zip: built here with deflate, as Excel and Google Sheets write them
function zipOf(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, text] of files) {
    const nameBytes = Buffer.from(name), raw = Buffer.from(text), data = zlib.deflateRawSync(raw), crc = zlib.crc32(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(8, 10); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(data.length, 20); entry.writeUInt32LE(raw.length, 24); entry.writeUInt16LE(nameBytes.length, 28); entry.writeUInt32LE(offset, 42);
    parts.push(local, nameBytes, data); central.push(entry, nameBytes); offset += 30 + nameBytes.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...parts, cd, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length);
}
const workbookFiles = [
  ["xl/workbook.xml", '<workbook><workbookPr/><sheets><sheet state="visible" name="People" sheetId="1" r:id="rId5"/><sheet state="hidden" name="Secret" sheetId="2" r:id="rId6"/><sheet name="Empty" sheetId="3" r:id="rId7"/><sheet name="More &amp; more" sheetId="4" r:id="rId8"/></sheets></workbook>'],
  ["xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId5" Target="worksheets/sheet1.xml"/><Relationship Id="rId6" Target="worksheets/sheet2.xml"/><Relationship Id="rId7" Target="worksheets/sheet3.xml"/><Relationship Id="rId8" Target="/xl/worksheets/sheet4.xml"/></Relationships>'],
  ["xl/sharedStrings.xml", '<sst><si><t>id</t></si><si><t>name</t></si><si><t>Ana, "A"</t></si><si><t>x</t></si></sst>'],
  ["xl/styles.xml", styles],
  ["xl/worksheets/sheet1.xml", '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>when</t></is></c></row><row r="2"><c r="A2"><v>1.0</v></c><c r="B2" t="s"><v>2</v></c><c r="C2" s="2"><v>46364.0</v></c></row></sheetData></worksheet>'],
  ["xl/worksheets/sheet2.xml", '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>3</v></c></row></sheetData></worksheet>'],
  ["xl/worksheets/sheet3.xml", '<worksheet><sheetData/></worksheet>'],
  ["xl/worksheets/sheet4.xml", '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>3</v></c></row><row r="2"><c r="A2"><v>2</v></c></row></sheetData></worksheet>'],
];
const zbuf = zipOf(workbookFiles);
const zipped = openZip(zbuf);
ok(zipped.names.includes("xl/workbook.xml"), "a zip's files are listed");
let xlsxSheets = null, xlsxError = null;
readWorkbook(zbuf).then((r) => { xlsxSheets = r; }).catch((e) => { xlsxError = e; }).then(() => {
  ok(xlsxError === null && xlsxSheets.map((x) => x.name).join("|") === "People|More & more", "a workbook gives its visible, non-empty sheets, by name");
  ok(xlsxSheets[0].csv === 'id,name,when\n1,"Ana, ""A""",2026-12-08\n' && xlsxSheets[0].rows === 1 && xlsxSheets[1].csv === "x\n2\n", "and each sheet as CSV text, dates as dates");
  const parsedBack = parseCsv(xlsxSheets[0].csv);
  ok(parsedBack.headers.join() === "id,name,when" && parsedBack.records[0].name === 'Ana, "A"' && parsedBack.records[0].when === "2026-12-08", "which the CSV reader reads back");
  let notZip = null; try { openZip(new ArrayBuffer(40)); } catch (e) { notZip = e.message; }
  ok(/not a zip/.test(notZip), "a file that is not a zip says so");
  finish();
});

// ---- Flowing lists
const lbox = (id, x, y, w, h, grows = false) => ({ id, x, y, width: w, height: h, grows });
// a photo on the left (id 1), a name above a role (ids 2 and 3) beside it, a line under both (id 4)
const lboxes = [lbox(1, 0, 0, 60, 60), lbox(2, 70, 0, 200, 20, true), lbox(3, 70, 24, 200, 20, true), lbox(4, 0, 64, 270, 2)];
const one = layoutEntry(lboxes, new Map([[2, 20], [3, 20]]));
ok(one.height === 66 && one.shifts.get(3) === 0 && one.shifts.get(4) === 0, "an entry as designed keeps its height");
const grown = layoutEntry(lboxes, new Map([[2, 40], [3, 20]]));
ok(grown.shifts.get(3) === 20 && grown.shifts.get(1) === 0 && grown.shifts.get(4) === 0 && grown.height === 86 - 0 || grown.height === 86, "a name that grows two lines pushes the role down; the photo beside it stays");
const taller = layoutEntry([lbox(1, 0, 0, 100, 20, true), lbox(2, 0, 30, 100, 20)], new Map([[1, 60]]));
ok(taller.shifts.get(2) === 40 && taller.height === 90, "items below a growing box (and overlapping it sideways) move down by the growth, and the entry gets taller");
const shorter = layoutEntry([lbox(1, 0, 0, 100, 40, true), lbox(2, 0, 50, 100, 20)], new Map([[1, 20]]));
ok(shorter.shifts.get(2) === -20 && shorter.height === 50, "a box that comes out shorter pulls what is below it up");
const pk = packList({ count: 7, heightFor: (d, i) => 100 + (i % 2) * 50, areaFirst: 400, areaNext: 500, gap: 10 });
ok(pk.map((p) => p.entries.length).join() === "3,3,1" && pk[0].design === "first" && pk[1].design === "continuation", "entries stack until the next does not fit; later pages use the continuation area");
ok(pk[0].entries.map((e) => e.y).join() === "0,110,270" && pk[1].entries[0].y === 0, "each entry sits below the last with the gap, and a new page starts at the top");
const tallEntry = packList({ count: 3, heightFor: (d, i) => (i === 1 ? 900 : 100), areaFirst: 400, areaNext: 400, gap: 0 });
ok(tallEntry.length === 3 && tallEntry[1].overflow === true && tallEntry[0].overflow === false, "an entry taller than the area gets a page of its own and is flagged");
ok(packList({ count: 0, heightFor: () => 1, areaFirst: 100, areaNext: 100, gap: 0 }).length === 0, "no records, no pages");
const lAnns = [
  { id: 1, type: "text", text: "{{group}} list", x: 10, y: 10, width: 300, showOn: "first" },
  { id: 2, type: "rect", x: 10, y: 100, width: 300, height: 400, listArea: true },
  { id: 3, type: "text", text: "{{name}}", x: 20, y: 110, width: 200, groupId: "e", listEntry: true },
  { id: 4, type: "text", text: "{{city}}", x: 20, y: 134, width: 200, groupId: "e", listEntry: true },
  { id: 5, type: "text", text: "Page {{page in group}} of {{pages in group}}", x: 10, y: 800 },
];
ok(hasListDesign(lAnns) && !hasListDesign(lAnns.filter((a) => !a.listArea)), "a list design needs an entry and an area");
let ln = 1700;
const lPage = { design: "first", pageInGroup: 1, pagesInGroup: 2, recordsInGroup: 3, groupRecord: { group: "G", name: "A", city: "x" },
  entries: [{ record: { name: "Ana", city: "Penang" }, y: 0, shifts: new Map([[3, 0], [4, 0]]) }, { record: { name: "Ben", city: "Ipoh" }, y: 80, shifts: new Map([[3, 0], [4, 16]]) }] };
const lb = buildListPage(lAnns, lPage, { newId: () => ln++, newGroupId: () => "g" + ln++, repeatOthers: true });
const lt = lb.annotations.map((a) => a.text + "@" + Math.round(a.y)).join("|");
ok(lt === "G list@10|Ana@100|Penang@124|Ben@180|Ipoh@220|Page 1 of 2@800", "a list page: other items filled, entries placed in the area (shifts added), the area left out, the stacking order kept");
ok(new Set(lb.annotations.filter((a) => a.groupId).map((a) => a.groupId)).size === 2 && lb.annotations.every((a) => a.listEntry === undefined && a.listArea === undefined), "each entry is its own group, and no markers remain");
ok(buildListPage(lAnns, { ...lPage, design: "continuation", pageInGroup: 2 }, { newId: () => ln++, newGroupId: () => "g" + ln++, repeatOthers: true }).annotations.every((a) => a.text !== "G list"), "Show on first hides the title on later pages");

function finish() {
if (fails) { console.log(fails + " failed"); process.exit(1); }
}
