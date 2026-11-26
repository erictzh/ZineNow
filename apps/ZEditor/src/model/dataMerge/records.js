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

// A cell's text as a number for sorting: "1511", "c. 1400", "500 BCE" (negative), "-44". null when there is none.
export function numberOf(text) {
  const t = String(text).trim();
  const bce = /(\d[\d,]*)\s*(?:BCE|BC|B\.C\.E?\.?)/i.exec(t);
  if (bce) return -Number(bce[1].replace(/,/g, ""));
  const m = /-?\d[\d,]*(?:\.\d+)?/.exec(t);
  return m ? Number(m[0].replace(/,/g, "")) : null;
}

// A copy of the records in the order of `column`. as: "number" (also reads "c. 1400" and "500 BCE"), "text", or "auto" (numbers when every
// cell has one). The sort is stable: equal values keep their order. Cells with no number go last in a number sort.
export function sortRecords(records, column, { as = "auto", descending = false } = {}) {
  const asNumber = as === "number" || (as === "auto" && records.length > 0 && records.every((r) => numberOf(r[column]) !== null));
  const keyed = records.map((r, i) => ({ r, i, key: asNumber ? numberOf(r[column]) : String(r[column]).toLowerCase() }));
  keyed.sort((a, b) => {
    if (asNumber) {
      if (a.key === null && b.key === null) return a.i - b.i;
      if (a.key === null) return 1;
      if (b.key === null) return -1;
    }
    const c = a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    return (descending ? -c : c) || a.i - b.i;
  });
  return keyed.map((k) => k.r);
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
