// Calculated columns for the data merge: new columns made from the file's own, chosen from a menu (no formulas to type). Pure.
//
// A definition is { name, kind, ...settings }. Each gives a text for every record; `applyCalculated` adds them to the records (after any
// ordering, so "row number" follows the order the pages come in).

import { dateOf } from "./records.js";
import { applyFilter } from "./fields.js";

export const CALC_KINDS = [
  { key: "rownumber", label: "Row number", help: "1, 2, 3… in the order of the pages", needs: [] },
  { key: "join", label: "Join columns", help: "for example first name + last name", needs: ["columns"] },
  { key: "initials", label: "Initials", help: "Ana Lopez gives AL", needs: ["column"] },
  { key: "word", label: "First or last word", help: "of a name or address", needs: ["column"] },
  { key: "case", label: "Capital letters", help: "UPPER, lower or Title Case", needs: ["column"] },
  { key: "text", label: "Add words before or after", help: "for example RM before a price", needs: ["column"] },
  { key: "math", label: "Calculate with a number", help: "add, subtract, multiply or divide", needs: ["column"] },
  { key: "age", label: "Age from a date", help: "years since a birthday or date", needs: ["column"] },
  { key: "dateparts", label: "Part of a date", help: "the year, the month name, the day", needs: ["column"] },
];

export const DEFAULTS = {
  rownumber: { start: 1, pad: 0 },
  join: { columns: [], separator: " " },
  initials: { column: "", max: 2 },
  word: { column: "", which: "first" },
  case: { column: "", mode: "upper" },
  text: { column: "", before: "", after: "" },
  math: { column: "", op: "+", value: 1 },
  age: { column: "" },
  dateparts: { column: "", part: "year" },
};

const cell = (record, column) => String(record[column] === undefined ? "" : record[column]).trim();

// A date cell as { y, m, d } (m and d 0 when the cell has none), or null.
function dateParts(text) {
  const key = dateOf(text);
  if (key === null) return null;
  const y = Math.floor(key / 400), rest = key - y * 400;
  return { y, m: Math.floor(rest / 32), d: rest % 32 };
}

// The value of one definition for one record (`index`: its place in the order, from 0). `today` is a Date (for ages).
export function calculate(def, record, index, today = new Date()) {
  const d = { ...DEFAULTS[def.kind], ...def };
  switch (def.kind) {
    case "rownumber": {
      const n = String(Number(d.start) + index);
      return d.pad > 0 ? n.padStart(Number(d.pad), "0") : n;
    }
    case "join": return d.columns.map((c) => cell(record, c)).filter((v) => v !== "").join(d.separator);
    case "initials": {
      const words = cell(record, d.column).split(/\s+/).filter((w) => /\p{L}/u.test(w));
      return words.slice(0, Number(d.max) || 2).map((w) => (w.match(/\p{L}/u) || [""])[0].toUpperCase()).join("");
    }
    case "word": {
      const words = cell(record, d.column).split(/\s+/).filter(Boolean);
      return d.which === "last" ? words[words.length - 1] || "" : d.which === "allbutlast" ? words.slice(0, -1).join(" ") : words[0] || "";
    }
    case "case": {
      const v = cell(record, d.column);
      return d.mode === "title" ? applyFilter(v, "title") : d.mode === "lower" ? v.toLowerCase() : v.toUpperCase();
    }
    case "text": {
      const v = cell(record, d.column);
      return v === "" ? "" : d.before + v + d.after;
    }
    case "math": {
      const v = cell(record, d.column).replace(/,/g, "");
      const n = Number(v), k = Number(d.value);
      if (v === "" || !Number.isFinite(n) || !Number.isFinite(k)) return "";
      const r = d.op === "-" ? n - k : d.op === "*" ? n * k : d.op === "/" ? (k === 0 ? NaN : n / k) : n + k;
      return Number.isFinite(r) ? String(Math.round(r * 1e6) / 1e6) : "";
    }
    case "age": {
      const p = dateParts(cell(record, d.column));
      if (!p || !p.m || !p.d) return "";
      let age = today.getFullYear() - p.y;
      if (today.getMonth() + 1 < p.m || (today.getMonth() + 1 === p.m && today.getDate() < p.d)) age--;
      return age >= 0 ? String(age) : "";
    }
    case "dateparts": {
      const p = dateParts(cell(record, d.column));
      if (!p) return "";
      if (d.part === "year") return String(p.y);
      if (!p.m) return "";
      if (d.part === "month") return String(p.m);
      if (d.part === "monthname") return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][p.m - 1];
      return p.d ? String(p.d) : "";
    }
    default: return "";
  }
}

// A name that can be used as a field: no braces or bars, not empty, and not one the file already has.
export function usableName(name, taken) {
  const clean = String(name || "").replace(/[{}|]/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (!taken.includes(clean)) return clean;
  let n = 2;
  while (taken.includes(clean + " " + n)) n++;
  return clean + " " + n;
}

// The records with the calculated columns added, and the headers with their names added (a definition whose name clashes is skipped).
export function applyCalculated(headers, records, defs, today = new Date()) {
  const names = [], valid = [];
  for (const def of defs || []) {
    if (!def || !def.name || headers.includes(def.name) || names.includes(def.name)) continue;
    names.push(def.name); valid.push(def);
  }
  if (!valid.length) return { headers, records };
  return {
    headers: [...headers, ...names],
    records: records.map((r, i) => { const out = { ...r }; for (const def of valid) out[def.name] = calculate(def, out, i, today); return out; }),
  };
}

// What a definition reads, for the list ("Age from birthday").
export function describe(def) {
  const kind = CALC_KINDS.find((k) => k.key === def.kind);
  const from = def.kind === "join" ? (def.columns || []).join(" + ") : def.column;
  return (kind ? kind.label : def.kind) + (from ? ": " + from : "");
}
