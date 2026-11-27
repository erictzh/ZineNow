// Building merged pages from a template page and a record, for the data merge. Pure.

import { columnFor, fieldsIn, fillTemplate } from "./fields.js";

// The fields a page's text boxes use, in order of first use, each once.
export function fieldsUsedOnPage(annotations) {
  const out = [];
  for (const a of annotations || []) {
    const sources = [a.type === "text" ? a.text : "", a.type === "image" ? a.qrText : ""]; // a QR code's text can use fields too
    for (const t of sources) for (const f of t ? fieldsIn(t) : []) if (!out.includes(f)) out.push(f);
  }
  return out;
}

// A text box's text with the record's values put in. A box with no field is returned as it is. If the new text is a different length, custom
// letter-by-letter styling (colorRuns) no longer lines up with it and is dropped.
export function fillTextItem(ann, record, options) {
  if (ann.type !== "text" || !ann.text || !ann.text.includes("{{")) return { ann, result: null };
  const result = fillTemplate(ann.text, record, options);
  if (result.text === ann.text) return { ann, result };
  const filled = { ...ann, text: result.text };
  if (filled.colorRuns && filled.colorRuns.length) filled.colorRuns = undefined;
  return { ann: filled, result };
}

// ---- Picture fields: a picture item with `picField: "<column>"` is swapped for the photo that column names (a file in the chosen photo
// folder), cropped to fill the picture's frame.

// A function that finds a photo ({ name, src, width, height }) from a cell: matched by file name, without regard to folders or capital letters,
// and a cell without an extension ("ana") matches "ana.jpg". Returns null when there is none.
export function makePhotoFinder(photos) {
  const base = (t) => String(t === undefined || t === null ? "" : t).replace(/\\/g, "/").split("/").pop().trim().toLowerCase();
  const stem = (t) => base(t).replace(/\.[^.]+$/, "");
  const byName = new Map(), byStem = new Map();
  for (const photo of photos || []) { byName.set(base(photo.name), photo); if (!byStem.has(stem(photo.name))) byStem.set(stem(photo.name), photo); }
  return (cell) => {
    const name = base(cell);
    if (!name) return null;
    return byName.get(name) || (/\.[^.]+$/.test(name) ? null : byStem.get(name)) || null;
  };
}

// The crop that makes a photo fill a frame (centred; the photo's own proportions kept).
export function fillCrop(natW, natH, frameW, frameH) {
  const frame = frameW / frameH;
  if (natW / natH > frame) { const w = natH * frame; return { cropX: (natW - w) / 2, cropY: 0, cropW: w, cropH: natH }; }
  const h = natW / frame;
  return { cropX: 0, cropY: (natH - h) / 2, cropW: natW, cropH: h };
}

// A picture item for one record: { handled: false } if it is not a picture field; otherwise { handled: true, ann } with the photo in place, or
// ann null when the cell is empty or names no photo (the item is left out rather than showing someone else's picture).
export function fillPictureItem(ann, record, find) {
  if (ann.type !== "image" || !ann.picField) return { handled: false, ann };
  const photo = find ? find(record[columnFor(record, ann.picField) || ann.picField]) : null;
  if (!photo) return { handled: true, ann: null };
  return { handled: true, ann: { ...ann, src: photo.src, naturalWidth: photo.width, naturalHeight: photo.height, ...fillCrop(photo.width, photo.height, ann.width, ann.height) } };
}

// The picture columns a page uses, and per column how many of the records leave the picture out: { column, empty, notFound: [names] }.
export function pictureProblems(annotations, records, find) {
  const columns = [];
  for (const a of annotations || []) if (a.type === "image" && a.picField && !columns.includes(a.picField)) columns.push(a.picField);
  return columns.map((column) => {
    let empty = 0;
    const notFound = [];
    for (const r of records) {
      const key = columnFor(r, column) || column;
      const cell = String(r[key] === undefined ? "" : r[key]).trim();
      if (!cell) empty++;
      else if (!find || !find(cell)) { if (!notFound.includes(cell)) notFound.push(cell); }
    }
    return { column, empty, notFound };
  });
}

// New ids for filled items (`chosen`): every item gets one (`newId()`), groups a new group id (`newGroupId()`), links to other items (threaded
// text) follow, and the merge markers are removed. Shared by Basic and Advanced pages.
export function remapItems(chosen, newId, newGroupId) {
  const ids = new Map(), groups = new Map();
  for (const a of chosen) ids.set(a.id, newId());
  return chosen.map((a) => {
    const copy = { ...a, id: ids.get(a.id), dataBlock: undefined, showOn: undefined, picField: undefined, qrText: undefined, flowText: undefined };
    if (copy.groupId) {
      if (!groups.has(copy.groupId)) groups.set(copy.groupId, newGroupId());
      copy.groupId = groups.get(copy.groupId);
    }
    if (copy.threadFrom != null) copy.threadFrom = ids.has(copy.threadFrom) ? ids.get(copy.threadFrom) : undefined;
    return copy;
  });
}

// ---- QR codes: a picture item with `qrText` (text that may use {{fields}}, e.g. "https://example.com/{{id}}") becomes the QR code of that text.
// `makeQr(text)` draws it: { src, width, height } or null (the text cannot be made into a code). The code is square and centred in the frame.
export function fillQrItem(ann, record, makeQr, lang) {
  if (ann.type !== "image" || !ann.qrText) return { handled: false, ann };
  const result = fillTemplate(ann.qrText, record, { lang });
  const text = result.text.trim();
  if (!text || result.missing.length || result.empty.length || !makeQr) return { handled: true, ann: null };
  const qr = makeQr(text);
  if (!qr) return { handled: true, ann: null };
  const side = Math.min(ann.width, ann.height);
  return { handled: true, ann: { ...ann, src: qr.src, naturalWidth: qr.width, naturalHeight: qr.height, cropX: undefined, cropY: undefined, cropW: undefined, cropH: undefined, x: ann.x + (ann.width - side) / 2, y: ann.y + (ann.height - side) / 2, width: side, height: side } };
}

// The QR codes a page uses: [{ text, empty }]: how many of the records leave the code out (a field is empty or missing, so the code would be wrong).
export function qrProblems(annotations, records, lang) {
  return (annotations || []).filter((a) => a.type === "image" && a.qrText).map((a) => {
    let empty = 0;
    for (const r of records) { const res = fillTemplate(a.qrText, r, { lang }); if (!res.text.trim() || res.missing.length || res.empty.length) empty++; }
    return { text: a.qrText, empty };
  });
}

// One item filled for a record: text gets its fields, a picture field its photo, a QR code item its code. Returns { ann, missing } (ann null:
// leave it out).
export function fillItem(a, record, { lang, findPhoto, makeQr } = {}) {
  const pic = fillPictureItem(a, record, findPhoto);
  if (pic.handled) return { ann: pic.ann, missing: [] };
  const qr = fillQrItem(a, record, makeQr, lang);
  if (qr.handled) return { ann: qr.ann, missing: [] };
  const { ann, result } = fillTextItem(a, record, { lang });
  return { ann, missing: result ? result.missing : [] };
}

// The items of a template page filled for one record, as new items (see remapItems). Returns { annotations, missing } where missing lists fields
// the text asks for that the data does not have. `findPhoto` (makePhotoFinder) supplies the photos for picture fields.
export function mergeAnnotations(annotations, record, { newId, newGroupId, lang, findPhoto, makeQr } = {}) {
  const missing = [];
  const chosen = [];
  for (const a of annotations) {
    const filled = fillItem(a, record, { lang, findPhoto, makeQr });
    for (const f of filled.missing) if (!missing.includes(f)) missing.push(f);
    if (filled.ann) chosen.push(filled.ann);
  }
  return { annotations: remapItems(chosen, newId, newGroupId), missing };
}

// What to tell the person before merging: fields the text asks for that the file has no column for, and how many of the chosen records have
// an empty cell in a field that is used.
export function checkMerge(annotations, headers, records) {
  const used = fieldsUsedOnPage(annotations);
  const header = (f) => headers.find((h) => h === f) || headers.find((h) => h.trim().toLowerCase() === f.trim().toLowerCase()) || null; // capital letters do not matter
  const missing = used.filter((f) => header(f) === null);
  const emptyCounts = used.filter((f) => header(f) !== null).map((f) => ({ field: f, count: records.filter((r) => String(r[header(f)] === undefined ? "" : r[header(f)]).trim() === "").length })).filter((e) => e.count > 0);
  return { used, missing, emptyCounts };
}
