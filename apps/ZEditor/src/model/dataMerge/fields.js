// Filling `{{field}}` placeholders from a record, for the data merge. Pure.
//
//   Dear {{title}} {{name|title}},        a field, with an optional filter
//   {{date|date:d MMMM yyyy}}             "2026-11-26" becomes "26 November 2026"
//   No. {{serial|pad:3}} of {{total}}     7 becomes 007
//   {{price|number}}                      1234567 becomes 1,234,567
//   {{nickname|default:friend}}           what to write when the cell is empty

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ms: ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"],
};
const MARK = /\{\{\s*([^{}|]+?)\s*((?:\|[^{}]*)?)\}\}/g;

// "2026-11-26" (or "2026-11" / "2026") with a pattern: yyyy yy MMMM MMM MM M dd d. Anything that is not a date comes back unchanged.
export function formatDate(text, pattern, lang = "en") {
  const m = /^\s*(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?\s*$/.exec(text);
  if (!m) return text;
  const year = Number(m[1]), month = m[2] ? Number(m[2]) : 1, day = m[3] ? Number(m[3]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return text;
  const names = MONTHS[lang] || MONTHS.en;
  return pattern.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d/g, (t) => ({
    yyyy: String(year), yy: String(year).slice(-2).padStart(2, "0"), MMMM: names[month - 1], MMM: names[month - 1].slice(0, 3),
    MM: String(month).padStart(2, "0"), M: String(month), dd: String(day).padStart(2, "0"), d: String(day),
  }[t]));
}

const title = (s) => s.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// Applies one filter ("upper", "pad:3", "date:d MMMM yyyy"...) to a value. An unknown filter leaves the value alone.
export function applyFilter(value, spec, lang) {
  const colon = spec.indexOf(":");
  const name = (colon < 0 ? spec : spec.slice(0, colon)).trim().toLowerCase();
  const arg = colon < 0 ? "" : spec.slice(colon + 1);
  switch (name) {
    case "upper": return value.toUpperCase();
    case "lower": return value.toLowerCase();
    case "title": return title(value);
    case "trim": return value.trim();
    case "first": return value.trim().split(/\s+/)[0] || "";
    case "number": { const n = Number(value.replace(/,/g, "")); return value.trim() !== "" && Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 20 }) : value; }
    case "pad": return value.padStart(Math.max(0, Number(arg) || 0), "0");
    case "date": return formatDate(value, arg.trim() || "d MMMM yyyy", lang);
    case "default": return value.trim() === "" ? arg : value;
    default: return value;
  }
}

// The names of the fields a text uses, in order, each once.
export function fieldsIn(text) {
  const out = [];
  for (const m of String(text).matchAll(MARK)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

// Fills `text` from `record` (an object of column values). Returns { text, used, missing, empty }:
//   used: the fields the text asks for; missing: ones the file has no column for (they stay as {{field}} in the text, so they are easy to see);
//   empty: ones whose cell is empty.
// options.lang: "en" or "ms" month names for the date filter.
export function fillTemplate(text, record, options = {}) {
  const used = [], missing = [], empty = [];
  const filled = String(text).replace(MARK, (whole, field, filters) => {
    if (!used.includes(field)) used.push(field);
    if (!Object.prototype.hasOwnProperty.call(record, field)) { if (!missing.includes(field)) missing.push(field); return whole; }
    let value = String(record[field]);
    if (value.trim() === "" && !empty.includes(field)) empty.push(field);
    for (const f of filters.split("|").slice(1)) value = applyFilter(value, f, options.lang);
    return value;
  });
  return { text: filled, used, missing, empty };
}

// "Hide when empty": a box whose text uses fields and every one of them is empty (or the text has nothing left) is left out.
export function isEmptyFill(result) {
  return result.used.length > 0 && result.used.every((f) => result.empty.includes(f)) && result.text.trim() === "";
}
