// Reading a CSV file (a spreadsheet saved as text) for the data merge. Pure.
//
// Handles what spreadsheets really produce: a byte-order mark at the start, "quoted, cells", doubled quotes ("") inside them, line breaks inside
// quoted cells, Windows or Unix line ends, a semicolon, tab or pipe instead of the comma (the delimiter is guessed), a last line without a
// newline, short or long rows, and empty or repeated column names.

const DELIMITERS = [",", ";", "\t", "|"];

// The delimiter that splits the first few lines into the same number of cells, the most cells winning. Quoted text is skipped over.
export function guessDelimiter(text) {
  const sample = text.slice(0, 20000);
  let best = ",", bestScore = -1;
  for (const d of DELIMITERS) {
    const rows = splitRows(sample, d).slice(0, 8).filter((r) => r.length > 1 || r[0] !== "");
    if (!rows.length) continue;
    const width = rows[0].length;
    const consistent = rows.every((r) => r.length === width);
    const score = width > 1 ? (consistent ? width * 10 : width) : 0;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

// All the rows of `text` as arrays of cell texts.
function splitRows(text, delimiter) {
  const rows = [];
  let row = [], cell = "", i = 0, quoted = false, wasQuoted = false;
  const endCell = () => { row.push(cell); cell = ""; wasQuoted = false; };
  const endRow = () => { endCell(); rows.push(row); row = []; };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      cell += ch; i++; continue;
    }
    if (ch === '"' && cell === "" && !wasQuoted) { quoted = true; wasQuoted = true; i++; continue; }
    if (ch === delimiter) { endCell(); i++; continue; }
    if (ch === "\r") { endRow(); i += text[i + 1] === "\n" ? 2 : 1; continue; }
    if (ch === "\n") { endRow(); i++; continue; }
    cell += ch; i++;
  }
  if (cell !== "" || row.length > 0 || wasQuoted) endRow();
  return rows;
}

// A column name made usable as a field: spaces and edges trimmed; an empty name becomes "column 3"; a repeated name gets "_2", "_3".
function cleanHeaders(raw) {
  const seen = new Map();
  return raw.map((h, i) => {
    let name = String(h).trim() || `column ${i + 1}`;
    const n = (seen.get(name) || 0) + 1;
    seen.set(name, n);
    if (n > 1) name = `${name}_${n}`;
    return name;
  });
}

// text: the file's text. Returns { headers, records: [{ column: value }], delimiter, problems: [sentence] }.
// A record is an object keyed by the column names; every value is a string (cells are never turned into numbers or dates).
export function parseCsv(text, delimiter) {
  const clean = String(text || "").replace(/^﻿/, "");
  const d = delimiter || guessDelimiter(clean);
  const rows = splitRows(clean, d).filter((r) => !(r.length === 1 && r[0].trim() === "")); // blank lines are skipped
  const problems = [];
  if (!rows.length) return { headers: [], records: [], delimiter: d, problems: ["The file is empty."] };
  const headers = cleanHeaders(rows[0]);
  const records = [];
  rows.slice(1).forEach((r, k) => {
    if (r.length !== headers.length) problems.push(`Row ${k + 2} has ${r.length} cells but there are ${headers.length} columns${r.length < headers.length ? " (the missing ones are empty)" : " (the extra ones are ignored)"}.`);
    const rec = {};
    headers.forEach((h, c) => { rec[h] = r[c] !== undefined ? r[c] : ""; });
    records.push(rec);
  });
  return { headers, records, delimiter: d, problems };
}
