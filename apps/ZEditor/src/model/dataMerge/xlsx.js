// Reading the parts of an .xlsx workbook that the data merge needs, from their XML text. Pure (no DOM: a small scanner, so it runs the same in the
// browser and in the tests). The zip itself is opened by io/zipReader.js; io/xlsxReader.js puts them together.

const decodeEntities = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  const x = e.toLowerCase();
  if (x === "amp") return "&"; if (x === "lt") return "<"; if (x === "gt") return ">"; if (x === "quot") return '"'; if (x === "apos") return "'";
  const code = x[1] === "x" ? parseInt(x.slice(2), 16) : parseInt(x.slice(1), 10);
  return Number.isFinite(code) ? String.fromCodePoint(code) : m;
});

const attr = (tag, name) => { const m = new RegExp("(?:^|\\s)" + name.replace(":", "\\:") + '="([^"]*)"').exec(tag); return m ? decodeEntities(m[1]) : null; };

// "A" -> 0, "B" -> 1, "AA" -> 26 (the column of a cell reference such as "C12").
export function columnIndex(ref) {
  const letters = /^[A-Z]+/i.exec(ref || "");
  if (!letters) return -1;
  let n = 0;
  for (const ch of letters[0].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// The shared strings: each <si> is one string (plain <t>, or rich text made of runs; phonetic hints are left out).
export function parseSharedStrings(xml) {
  const out = [];
  for (const si of xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)) {
    const body = (si[1] || "").replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
    out.push(decodeEntities([...body.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)].map((t) => t[1] || "").join("")));
  }
  return out;
}

// Built-in number formats that are dates or times (the ones Excel numbers 14 to 22, 27 to 36, 45 to 47 and 50 to 58).
const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

// Is a custom number format code a date or time ("yyyy-mm-dd", "d mmm yy", "h:mm")? Quoted text, [colours] and escaped letters do not count.
export function isDateFormat(code) {
  const plain = String(code).replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "").replace(/_./g, "");
  if (/^\s*general\s*$/i.test(plain)) return false;
  return /[dmyhs]/i.test(plain.replace(/general/gi, ""));
}

// Which cell formats (the `s` of a cell) show a date: returns a function (styleIndex) => true when it does.
export function parseDateStyles(stylesXml) {
  const custom = new Map();
  for (const f of stylesXml.matchAll(/<numFmt\b[^>]*>/g)) custom.set(Number(attr(f[0], "numFmtId")), attr(f[0], "formatCode") || "");
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml);
  const isDate = [];
  for (const xf of (cellXfs ? cellXfs[1] : "").matchAll(/<xf\b[^>]*>/g)) {
    const id = Number(attr(xf[0], "numFmtId") || 0);
    isDate.push(BUILTIN_DATE_FORMATS.has(id) || (custom.has(id) && isDateFormat(custom.get(id))));
  }
  return (style) => Boolean(isDate[Number(style)]);
}

const pad = (n, w = 2) => String(n).padStart(w, "0");

// An Excel date number as text: "2026-12-05", with the time ("2026-12-05 14:30") when it has one, or just the time when it is under a day.
// `date1904`: workbooks from old Mac Excel count from 1904.
export function excelDateText(serial, date1904 = false) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 0) return String(serial);
  const day = Math.floor(n + 1e-9), fraction = n - day;
  let minutes = Math.round(fraction * 1440);
  let whole = day;
  if (minutes >= 1440) { whole += 1; minutes -= 1440; }
  const time = pad(Math.floor(minutes / 60)) + ":" + pad(minutes % 60);
  if (day === 0 && !date1904) return time; // a time on its own (the "day 0" of the 1900 system)
  const base = date1904 ? Date.UTC(1904, 0, 1) : whole < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30); // 1900 is wrongly a leap year in Excel
  const d = new Date(base + whole * 86400000);
  const text = d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  return minutes ? text + " " + time : text;
}

// A number cell's text: whole numbers without ".0", others without floating-point dust (Excel keeps 15 significant digits).
export function numberText(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toPrecision(15)));
}

// The rows of a worksheet as arrays of text, from column A on, with holes filled with "". `strings`: the shared strings; `isDate`: from
// parseDateStyles; `date1904`: the workbook's date system.
export function parseSheetRows(xml, strings, isDate = () => false, date1904 = false) {
  const rows = [];
  for (const row of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells = [];
    let next = 0;
    const rowNumber = Number(attr(row[1], "r") || rows.length + 1) - 1;
    for (const c of (row[2] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = columnIndex(attr(c[1], "r")) >= 0 ? columnIndex(attr(c[1], "r")) : next;
      next = col + 1;
      const type = attr(c[1], "t"), body = c[2] || "";
      const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body);
      let text = "";
      if (type === "s") text = v ? strings[Number(v[1])] || "" : "";
      else if (type === "inlineStr") text = decodeEntities([...body.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)].map((t) => t[1] || "").join(""));
      else if (type === "str") text = v ? decodeEntities(v[1]) : "";
      else if (type === "b") text = v ? (v[1].trim() === "1" ? "TRUE" : "FALSE") : "";
      else if (type === "e") text = "";
      else if (type === "d") text = v ? decodeEntities(v[1]).replace("T", " ").replace(/Z$/, "") : "";
      else if (v && v[1].trim() !== "") text = isDate(attr(c[1], "s")) ? excelDateText(v[1], date1904) : numberText(v[1]);
      cells[col] = text;
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = "";
    while (rows.length < rowNumber) rows.push([]);
    rows[rowNumber] = cells;
  }
  return rows;
}

const csvCell = (t) => (/[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t);

// Rows of text as CSV text (what the data merge keeps): leading empty rows and trailing empty rows and columns are dropped, so the first
// row left is the column names. Returns { csv, rows } (`rows`: how many rows of data), or null when nothing is there.
export function rowsToCsv(rows) {
  const filled = rows.map((r) => r.map((c) => String(c)));
  let start = filled.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (start < 0) return null;
  let end = filled.length - 1;
  while (end > start && !filled[end].some((c) => c.trim() !== "")) end--;
  const table = filled.slice(start, end + 1);
  const width = Math.max(...table.map((r) => { let w = r.length; while (w > 0 && r[w - 1].trim() === "") w--; return w; }));
  if (width === 0) return null;
  const lines = table.map((r) => Array.from({ length: width }, (_, i) => csvCell(r[i] || "")).join(","));
  return { csv: lines.join("\n") + "\n", rows: table.length - 1 };
}

// The sheets of a workbook (workbook.xml) in order: [{ name, rid, hidden }]; and the target file of each relationship id (workbook.xml.rels).
export function parseWorkbook(xml) {
  return {
    date1904: /<workbookPr\b[^>]*date1904="(?:1|true)"/i.test(xml),
    sheets: [...xml.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ name: attr(m[0], "name") || "Sheet", rid: attr(m[0], "r:id"), hidden: /^(hidden|veryHidden)$/.test(attr(m[0], "state") || "") })),
  };
}
export function parseRelationships(xml) {
  const map = new Map();
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) map.set(attr(m[0], "Id"), attr(m[0], "Target"));
  return map;
}
