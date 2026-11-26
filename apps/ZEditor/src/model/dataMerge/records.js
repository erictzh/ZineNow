// Working with the records of a merge: choosing, ordering, and finding each record's photo. Pure.

// The records to merge, as their numbers (0-based): { all } or { from, to } (1-based, inclusive, as a person counts) or { ticked: [numbers] }.
export function selectRecords(count, choice = { all: true }) {
  const all = Array.from({ length: count }, (_, i) => i);
  if (choice.ticked) return all.filter((i) => choice.ticked.includes(i));
  if (choice.from || choice.to) {
    const from = Math.max(1, choice.from || 1), to = Math.min(count, choice.to || count);
    return all.filter((i) => i + 1 >= from && i + 1 <= to);
  }
  return all;
}

// A cell's text as a number for sorting: "1511", "c. 1400", "500 BCE" (negative), "-44", "RM 1,200". null when there is none.
export function numberOf(text) {
  const t = String(text).trim();
  const bce = /(\d[\d,]*)\s*(?:BCE|BC|B\.C\.E?\.?)/i.exec(t);
  if (bce) return -Number(bce[1].replace(/,/g, ""));
  const m = /-?\d[\d,]*(?:\.\d+)?/.exec(t);
  return m ? Number(m[0].replace(/,/g, "")) : null;
}

const MONTH_WORDS = {
  january: 1, jan: 1, januari: 1, february: 2, feb: 2, februari: 2, march: 3, mar: 3, mac: 3, april: 4, apr: 4, may: 5, mei: 5, june: 6, jun: 6,
  july: 7, jul: 7, julai: 7, august: 8, aug: 8, ogos: 8, ogo: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10, oktober: 10, okt: 10,
  november: 11, nov: 11, december: 12, dec: 12, disember: 12, dis: 12,
};

// A date in a cell as one number that sorts in calendar order (not a real timestamp), or null. Reads 2026-11-26 (also 2026-11 and 2026), 26/11/2026
// and 26-11-2026 (day first unless order is "mdy"; a first part over 12 is always the day), "26 Nov 2026", "26 November 2026", "Nov 26, 2026"
// (English or Malay month names), and "500 BCE".
export function dateOf(text, order = "dmy") {
  const t = String(text).trim();
  if (!t) return null;
  const key = (y, m, d) => y * 400 + m * 32 + d; // years apart by 400, months by 32: any real date keeps its order
  let m = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(t); // ISO: year first
  if (m && (m[2] || m[3] || m[1].length === 4 || m[1][0] === "-")) return key(Number(m[1]), m[2] ? Number(m[2]) : 0, m[3] ? Number(m[3]) : 0);
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(t);
  if (m) {
    let a = Number(m[1]), b = Number(m[2]);
    let day = order === "mdy" ? b : a, month = order === "mdy" ? a : b;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? key(year, month, day) : null;
  }
  m = /^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/.exec(t); // 26 November 2026
  if (m && MONTH_WORDS[m[2].toLowerCase()]) return key(Number(m[3]), MONTH_WORDS[m[2].toLowerCase()], Number(m[1]));
  m = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(t); // November 26, 2026
  if (m && MONTH_WORDS[m[1].toLowerCase()]) return key(Number(m[3]), MONTH_WORDS[m[1].toLowerCase()], Number(m[2]));
  m = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(t); // November 2026
  if (m && MONTH_WORDS[m[1].toLowerCase()]) return key(Number(m[2]), MONTH_WORDS[m[1].toLowerCase()], 0);
  const bce = /^(\d[\d,]*)\s*(?:BCE|BC|B\.C\.E?\.?)$/i.exec(t);
  if (bce) return key(-Number(bce[1].replace(/,/g, "")), 0, 0);
  return null;
}

// How a column can be sorted:
//   "text"    words, A to Z: capitals and accents do not matter ("émilie" sits among the E's), blanks last
//   "natural" IDs and codes with numbers inside: A2 before A10, ID-007 before ID-12
//   "number"  numbers (also "c. 1400", "500 BCE", "RM 1,200")
//   "date"    dates in the formats dateOf reads
//   "auto"    dates if every cell is one, else numbers if every cell is one, else text
export const SORT_TYPES = [
  { key: "auto", label: "Automatic" },
  { key: "text", label: "Words (A–Z)" },
  { key: "natural", label: "ID or code (A2 before A10)" },
  { key: "number", label: "Number" },
  { key: "date", label: "Date" },
];

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: false });
const naturalCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

// The type "auto" chooses for a column of records.
export function detectSortType(records, column, order = "dmy") {
  const cells = records.map((r) => String(r[column] === undefined ? "" : r[column]).trim()).filter((c) => c !== "");
  if (!cells.length) return "text";
  if (cells.every((c) => dateOf(c, order) !== null) && cells.some((c) => /[A-Za-z\/.\-]/.test(c))) return "date"; // a column of bare years counts as numbers
  if (cells.every((c) => numberOf(c) !== null && /^(?:[A-Za-z]{1,3}\.?\s+|[$€£¥]\s*)?-?\d[\d,.\s]*%?$|BCE|BC\b|^c\.?\s*\d/i.test(c))) return "number";
  return "text";
}

// A copy of the records in the order of `keys`: one { column, as, descending } or a list of them (the later ones break ties: "by city, then by
// name"). `as` is one of SORT_TYPES. A cell with nothing in it (or, in a number or date sort, no number or date) always goes LAST, whichever way
// round. The sort is stable: equal records keep their order. options.dateOrder: "dmy" (default) or "mdy" for 03/04/2026.
export function sortRecords(records, keys, options = {}) {
  const list = Array.isArray(keys) ? keys : [keys];
  const spec = list.map((k) => {
    const key = typeof k === "string" ? { column: k } : k;
    const as = !key.as || key.as === "auto" ? detectSortType(records, key.column, options.dateOrder) : key.as;
    return { column: key.column, as, descending: Boolean(key.descending) };
  });
  const keyOf = (r, k) => {
    const raw = String(r[k.column] === undefined ? "" : r[k.column]);
    if (raw.trim() === "") return null;
    if (k.as === "number") return numberOf(raw);
    if (k.as === "date") return dateOf(raw, options.dateOrder);
    return raw;
  };
  const rows = records.map((r, i) => ({ r, i, keys: spec.map((k) => keyOf(r, k)) }));
  rows.sort((a, b) => {
    for (let n = 0; n < spec.length; n++) {
      const x = a.keys[n], y = b.keys[n];
      if (x === null && y === null) continue;
      if (x === null) return 1; // blanks last, even when descending
      if (y === null) return -1;
      let c;
      if (spec[n].as === "number" || spec[n].as === "date") c = x < y ? -1 : x > y ? 1 : 0;
      else c = (spec[n].as === "natural" ? naturalCollator : collator).compare(String(x).trim(), String(y).trim());
      if (c !== 0) return spec[n].descending ? -c : c;
    }
    return a.i - b.i;
  });
  return rows.map((x) => x.r);
}

// Left or right for a record in a timeline that zigzags: the first on the left, the second on the right...
export const alternateSide = (index) => (index % 2 === 0 ? "left" : "right");

// Which of the chosen photo files each record's `column` names. Names are matched without regard to folders or capital letters, and a cell
// without an extension ("ana") matches "ana.jpg". Returns { matched: Map(recordNumber -> file name), missing: [{ record, name }] }.
export function matchPhotos(records, column, fileNames) {
  const base = (s) => String(s).replace(/\\/g, "/").split("/").pop().trim().toLowerCase();
  const stem = (s) => base(s).replace(/\.[^.]+$/, "");
  const byName = new Map(), byStem = new Map();
  for (const f of fileNames) { byName.set(base(f), f); if (!byStem.has(stem(f))) byStem.set(stem(f), f); }
  const matched = new Map(), missing = [];
  records.forEach((r, i) => {
    const name = String(r[column] || "").trim();
    if (!name) return; // nothing asked for
    const hit = byName.get(base(name)) || (/\.[^.]+$/.test(base(name)) ? null : byStem.get(base(name)));
    if (hit) matched.set(i, hit); else missing.push({ record: i, name });
  });
  return { matched, missing };
}
