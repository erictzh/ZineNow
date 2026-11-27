// Data merge (Data button), Basic: connect a spreadsheet (CSV), put its columns into text as {{column}}, preview each row on the page, and make
// one page per row from the page you designed. The file lives inside the project (view.dataSource).

import { checkMerge, makePhotoFinder, mergeAnnotations, pictureProblems } from "../model/dataMerge/build.js";
import { readPhotos } from "../io/dataPhotos.js";
import { parseCsv } from "../model/dataMerge/csv.js";
import { annotationBounds } from "../render/itemGeometry.js";
import { dataSlots, gridCopies, mergeGroupPage, sheetGrid, planPages, previewAnnotations } from "../model/dataMerge/groups.js";
import { PAGE_SIZES_MM, presetByKey } from "../model/dataMerge/layout.js";
import { translatedAnnotation } from "../model/annotations.js";
import { selectRecords, sortRecords } from "../model/dataMerge/records.js";

import { MAIN_SCALE } from "../constants.js";
const { useMemo, useState } = React;

export function useDataMerge({ doc, history, view, edits, selection }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, nextKeyRef, nextAnnIdRef } = doc;
  const [recordNo, setRecordNo] = useState(0); // the row the page shows (0-based, in the chosen order)
  const [message, setMessage] = useState("");

  const parsed = useMemo(() => (view.dataSource ? parseCsv(view.dataSource.text) : null), [view.dataSource]);
  const headers = parsed ? parsed.headers : [];
  const idColumn = headers.find((h) => h.trim().toLowerCase() === "id") || null;
  const records = useMemo(() => {
    if (!parsed) return [];
    if (view.dataOrder !== "file" && idColumn) return sortRecords(parsed.records, { column: idColumn, as: "natural", descending: view.dataOrder === "id-desc" });
    return parsed.records;
  }, [parsed, view.dataOrder, idColumn]);
  const count = records.length;
  const shownNo = Math.min(recordNo, Math.max(0, count - 1));
  const findPhoto = useMemo(() => makePhotoFinder(view.dataPhotos), [view.dataPhotos]);
  const showPreview = view.dataPreviewOn && count > 0;
  // What the page canvas runs its items through to show the chosen row (and, with data blocks, the rows after it in the other blocks).
  const previewFill = showPreview ? (anns, editingId) => previewAnnotations(anns, records, shownNo, editingId, "en", findPhoto) : null;

  const page = pages[selectedIdx] || null;
  const templatePage = page && page.mergedFrom !== undefined ? pages.find((p) => p.key === page.mergedFrom) || null : page;
  const slotCount = templatePage ? dataSlots(templatePage.annotations || []).length : 0; // data blocks on the designed page (Advanced)
  const blockMode = slotCount > 0;
  const groupBy = blockMode && headers.includes(view.dataGroupBy) ? view.dataGroupBy : "";
  const earlierPages = templatePage ? pages.filter((p) => p.mergedFrom === templatePage.key) : [];

  function connect(name, text) {
    const result = parseCsv(text);
    if (!result.headers.length || !result.records.length) { setMessage("That file has no rows. A CSV needs a first line of column names, then one line per row."); return false; }
    view.setDataSource({ name, text });
    view.setDataTemplateColumns([]);
    view.setDataOrder("file");
    setRecordNo(0);
    setMessage(result.problems && result.problems.length ? result.problems[0] : "");
    return true;
  }
  function disconnect() { view.setDataSource(null); setRecordNo(0); setMessage(""); }

  // Puts {{column}} at the end of the selected text box, or into a new text box on the page.
  function insertField(name) {
    const token = "{{" + name + "}}";
    const ann = page && (page.annotations || []).find((a) => a.id === selection.selectedAnnId);
    if (ann && ann.type === "text") {
      const text = ann.text || "";
      edits.handleUpdateAnnotation(ann.id, { text: text + (text && !/\s$/.test(text) ? " " : "") + token, colorRuns: undefined });
      return;
    }
    if (!page) return;
    const id = nextAnnIdRef.current;
    edits.handleAddText(60, 60, 320, 0);
    edits.handleUpdateAnnotation(id, { text: token });
  }

  const VIRTUAL_FIELDS = ["page in group", "pages in group", "records in group"];
  function usedCheck(from, to) {
    if (!templatePage) return { used: [], missing: [], emptyCounts: [] };
    const chosen = selectRecords(count, { from, to }).map((i) => records[i]);
    const result = checkMerge(templatePage.annotations || [], headers, chosen);
    const pictures = pictureProblems(templatePage.annotations || [], chosen, findPhoto);
    return { ...result, missing: result.missing.filter((f) => !VIRTUAL_FIELDS.includes(f)), pictures, photoCount: view.dataPhotos.length };
  }

  // The pages a merge would make for the chosen rows.
  function plannedPages(from, to) {
    const chosen = selectRecords(count, { from, to }).map((i) => records[i]);
    return blockMode ? planPages(chosen, { slotCount, groupBy }) : chosen.map((r) => ({ groupRecord: r }));
  }

  // One page per chosen row (with data blocks: one page per group of rows that fit the blocks), placed after the designed page; earlier pages
  // made from it are replaced.
  function createPages({ from, to, hideTemplate }) {
    if (!templatePage || count === 0) return 0;
    const chosen = selectRecords(count, { from, to });
    if (!chosen.length) return 0;
    history.recordUndoCheckpoint();
    const newId = () => nextAnnIdRef.current++;
    const newGroupId = () => "g" + nextAnnIdRef.current++;
    const plans = blockMode ? planPages(chosen.map((i) => records[i]), { slotCount, groupBy }) : null;
    const made = (plans || chosen).map((item, n) => {
      const merged = plans
        ? mergeGroupPage(templatePage.annotations || [], item, { newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers, findPhoto })
        : mergeAnnotations(templatePage.annotations || [], records[item], { newId, newGroupId, lang: "en", findPhoto });
      const copy = { ...templatePage, key: nextKeyRef.current++, annotations: merged.annotations, mergedFrom: templatePage.key, mergeRow: plans ? n + 1 : item + 1, hidden: undefined };
      if (templatePage.guides) copy.guides = templatePage.guides.map((g) => ({ ...g }));
      return copy;
    });
    const before = pages.filter((p) => p.mergedFrom !== templatePage.key);
    const firstIndex = before.findIndex((p) => p.key === templatePage.key) + 1;
    setPages((prev) => {
      const kept = prev.filter((p) => p.mergedFrom !== templatePage.key);
      const at = kept.findIndex((p) => p.key === templatePage.key);
      const next = kept.map((p) => (hideTemplate && p.key === templatePage.key ? { ...p, hidden: true } : p));
      next.splice(at + 1, 0, ...made);
      return next;
    });
    setSelectedIdx(firstIndex);
    setSelectedPageIndices([]);
    setMessage(made.length + (made.length === 1 ? " page made." : " pages made."));
    return made.length;
  }

  // ---- Advanced: mark the selected group as a data block, and say which pages a non-data item shows on.
  const selectedIds = selection.selectedAnnotationIds();
  const selectedItems = page ? (page.annotations || []).filter((a) => selectedIds.includes(a.id)) : [];
  const selectedGroups = new Set(selectedItems.map((a) => a.groupId).filter(Boolean));
  const blockTargets = page ? (page.annotations || []).filter((a) => selectedGroups.has(a.groupId)) : [];
  const selected = {
    count: selectedItems.length,
    grouped: selectedItems.length > 0 && selectedItems.every((a) => a.groupId),
    isBlock: blockTargets.length > 0 && blockTargets.every((a) => a.dataBlock),
    showOn: selectedItems.length > 0 && selectedItems.every((a) => (a.showOn || "") === (selectedItems[0].showOn || "")) ? selectedItems[0].showOn || "every" : "",
    hasBlock: selectedItems.some((a) => a.dataBlock),
    isPicture: selectedItems.length > 0 && selectedItems.every((a) => a.type === "image"),
    picField: selectedItems.length > 0 && selectedItems.every((a) => (a.picField || "") === (selectedItems[0].picField || "")) ? selectedItems[0].picField || "" : "\u0000",
  };
  // Photos for picture fields: choose a folder (or files); each is shrunk and kept in the project.
  async function addPhotos(files) {
    setMessage("Reading photos…");
    const added = await readPhotos(files);
    if (!added.length) { setMessage("No pictures found there (JPEG, PNG, WebP or GIF)."); return; }
    const kept = view.dataPhotos.filter((p) => !added.some((n) => n.name.toLowerCase() === p.name.toLowerCase()));
    view.setDataPhotos([...kept, ...added]);
    setMessage(added.length + (added.length === 1 ? " photo" : " photos") + " added.");
  }
  function setPicField(column) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && a.type === "image" ? { ...a, picField: column || undefined } : a)));
  }
  function markDataBlock(on) {
    if (!selected.grouped) { setMessage("Group the items first (select them and press Ctrl+G), then mark the group as a data block."); return; }
    setMessage("");
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedGroups.has(a.groupId) ? { ...a, dataBlock: on || undefined, showOn: on ? undefined : a.showOn } : a)));
  }
  // Copies of the selected data block laid out as `cols` x `rows` (the block stays top left); `gapMm` between them. With `preset` (a ready-made
  // sheet) the block is first moved to the sheet's first cell and the copies follow the sheet's cell spacing.
  function makeGrid({ cols, rows, gapMm, preset }) {
    if (!page || !selected.isBlock) return;
    const k = 72 / 25.4 * MAIN_SCALE; // pixels per mm
    const sheet = preset ? presetByKey(preset) : null;
    const grid = sheet ? sheetGrid(sheet, k) : null;
    const notes = [];
    let targets = blockTargets;
    const boxes = () => targets.map(annotationBounds);
    const boundsOf = () => { const b = boxes(); const x = Math.min(...b.map((v) => v.x)), y = Math.min(...b.map((v) => v.y)); return { x, y, width: Math.max(...b.map((v) => v.x + v.width)) - x, height: Math.max(...b.map((v) => v.y + v.height)) - y }; };
    let bounds = boundsOf();
    if (grid) {
      const dx = grid.origin.x - bounds.x, dy = grid.origin.y - bounds.y;
      const ids = new Set(targets.map((a) => a.id));
      targets = targets.map((a) => translatedAnnotation(a, dx, dy));
      edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (ids.has(a.id) ? targets.find((t) => t.id === a.id) : a)));
      bounds = boundsOf();
      const pageMm = { w: page.width / 72 * 25.4, h: page.height / 72 * 25.4 };
      const want = PAGE_SIZES_MM[sheet.page];
      if (want && (Math.abs(pageMm.w - want.w) > 2 || Math.abs(pageMm.h - want.h) > 2)) notes.push("This sheet is " + sheet.page.toUpperCase() + " (" + want.w + " × " + want.h + " mm), but your page is " + Math.round(pageMm.w) + " × " + Math.round(pageMm.h) + " mm.");
      if (bounds.width > grid.cell.w + 1 || bounds.height > grid.cell.h + 1) notes.push("Your block (" + Math.round(bounds.width / k) + " × " + Math.round(bounds.height / k) + " mm) is bigger than one cell (" + sheet.cell.w + " × " + sheet.cell.h + " mm).");
    }
    const gap = (gapMm || 0) * k;
    const result = gridCopies(targets, bounds, { cols: grid ? grid.cols : cols, rows: grid ? grid.rows : rows, gap: { x: gap, y: gap }, pitch: grid ? grid.pitch : null }, { newId: () => nextAnnIdRef.current++, newGroupId: () => "g" + nextAnnIdRef.current++ }, { width: page.width * MAIN_SCALE, height: page.height * MAIN_SCALE });
    if (result.items.length) edits.updateAnnotationsFor(selectedIdx, (anns) => [...anns, ...result.items]);
    const total = (grid ? grid.cols * grid.rows : cols * rows);
    if (!result.items.length && !grid) { setMessage("A grid of 1 × 1 is just the block."); return; }
    if (result.outside) notes.push(result.outside + " of the blocks are partly off the page: make the block smaller, or the gap, or fewer columns and rows.");
    setMessage(total + " blocks in a grid." + (notes.length ? " " + notes.join(" ") : ""));
  }
  // The Layers panel's group menu: mark or unmark one group (by id) on the open page.
  function setGroupDataBlock(groupId, on) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (a.groupId === groupId ? { ...a, dataBlock: on || undefined, showOn: on ? undefined : a.showOn } : a)));
  }
  function setShowOn(value) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && !a.dataBlock ? { ...a, showOn: value === "every" ? undefined : value } : a)));
  }

  return {
    parsed, headers, records, count, idColumn, recordNo: shownNo, setRecordNo, previewFill, slotCount, blockMode, groupBy, selected, markDataBlock, setGroupDataBlock, makeGrid, addPhotos, setPicField, setShowOn, plannedPages, message, setMessage,
    templatePage, earlierCount: earlierPages.length, onGeneratedPage: Boolean(page && page.mergedFrom !== undefined),
    connect, disconnect, insertField, usedCheck, createPages,
  };
}
