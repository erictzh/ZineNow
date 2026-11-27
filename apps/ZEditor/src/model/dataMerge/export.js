// Export each record as its own document (data merge). Pure.
//
// Pages made by a merge carry `mergedFrom` (the designed page), `mergeRow` (the record's number) and `mergeRecord` (the row itself). The pages of
// one record are the pages with the same designed page and row; each record's pages become one PDF, named from a pattern like "{{id}} {{name}}".

import { fillTemplate } from "./fields.js";

// The records that have pages (of the designed page `templateKey` only, if given): [{ recordNo, record, pageIndices }], in page order. Hidden pages and pages without a kept row are skipped.
export function recordGroups(pages, templateKey) {
  const groups = new Map();
  pages.forEach((p, i) => {
    if (p.mergedFrom === undefined || !p.mergeRecord || p.hidden || (templateKey !== undefined && p.mergedFrom !== templateKey)) return;
    const key = p.mergedFrom + ":" + p.mergeRow;
    if (!groups.has(key)) groups.set(key, { recordNo: p.mergeRow, record: p.mergeRecord, pageIndices: [] });
    groups.get(key).pageIndices.push(i);
  });
  return [...groups.values()];
}

// A file name made safe: characters Windows and macOS forbid become spaces, no trailing dots or spaces, not too long.
export function safeFileName(text, fallback) {
  const safe = String(text || "").replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 120).trim();
  return safe || fallback;
}

// One file name (with .pdf) per group, from the pattern; a name used twice gets " (2)", " (3)"… (capital letters do not make names different,
// as the file systems of Windows and macOS do not tell them apart).
export function recordFileNames(groups, pattern, lang) {
  const used = new Set();
  return groups.map((g) => {
    const base = safeFileName(fillTemplate(pattern || "", g.record, { lang }).text, "record " + g.recordNo);
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = base + " (" + n++ + ")";
    used.add(name.toLowerCase());
    return name + ".pdf";
  });
}
