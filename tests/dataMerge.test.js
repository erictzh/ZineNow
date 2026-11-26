// The core of the planned data merge (model/dataMerge/*): CSV reading, {{field}} filling, grids, sorting and photo matching, checked against
// the five scenarios from the proposal (docs/PROPOSAL-data-merge.md) plus labels, letters and a directory.
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
if (fails) { console.log(fails + " failed"); process.exit(1); }
