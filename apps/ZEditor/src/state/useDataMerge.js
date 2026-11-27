// Data merge (Data button), Basic: connect a spreadsheet (CSV), put its columns into text as {{column}}, preview each row on the page, and make
// one page per row from the page you designed. The file lives inside the project (view.dataSource).

import { checkMerge, makePhotoFinder, mergeAnnotations, pictureProblems, qrProblems } from "../model/dataMerge/build.js";
import { qrDataUrl } from "../io/qrImage.js";
import { readPhotos } from "../io/dataPhotos.js";
import { applyCalculated } from "../model/dataMerge/calc.js";
import { parseCsv } from "../model/dataMerge/csv.js";
import { annotationBounds } from "../render/itemGeometry.js";
import { fitLength } from "../render/textFit.js";
import { flowBoxOf, mergeFlowPage, planFlowPages } from "../model/dataMerge/flow.js";
import { cloneItems, dataSlots, gridCopies, mergeGroupPage, sheetGrid, planPages, previewAnnotations } from "../model/dataMerge/groups.js";
import { PAGE_SIZES_MM, presetByKey } from "../model/dataMerge/layout.js";
import { translatedAnnotation } from "../model/annotations.js";
import { selectRecords, sortRecords } from "../model/dataMerge/records.js";

import { MAIN_SCALE } from "../constants.js";
const { useMemo, useRef, useState } = React;

export function useDataMerge({ doc, history, view, edits, selection }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, nextKeyRef, nextAnnIdRef } = doc;
  const [recordNo, setRecordNo] = useState(0); // the row the page shows (0-based, in the chosen order)
  const [message, setMessage] = useState("");

  const parsed = useMemo(() => (view.dataSource ? parseCsv(view.dataSource.text) : null), [view.dataSource]);
  const fileHeaders = parsed ? parsed.headers : [];
  const idColumn = fileHeaders.find((h) => h.trim().toLowerCase() === "id") || null;
  // The rows in the chosen order, with the calculated columns added (so "row number" follows the order the pages come in).
  const table = useMemo(() => {
    if (!parsed) return { headers: [], records: [] };
    const ordered = view.dataOrder !== "file" && idColumn ? sortRecords(parsed.records, { column: idColumn, as: "natural", descending: view.dataOrder === "id-desc" }) : parsed.records;
    return applyCalculated(parsed.headers, ordered, view.dataCalc);
  }, [parsed, view.dataOrder, idColumn, view.dataCalc]);
  const headers = table.headers, records = table.records;
  const count = records.length;
  const shownNo = Math.min(recordNo, Math.max(0, count - 1));
  const findPhoto = useMemo(() => makePhotoFinder(view.dataPhotos), [view.dataPhotos]);
  const showPreview = view.dataPreviewOn && count > 0;
  // What the page canvas runs its items through to show the chosen row (and, with data blocks, the rows after it in the other blocks).
  const previewFill = showPreview ? (anns, editingId) => previewAnnotations(anns, records, shownNo, editingId, "en", findPhoto, qrDataUrl) : null;

  const page = pages[selectedIdx] || null;
  // The designed page this page belongs to: itself, or (for a made page or a continuation design) the page it came from or is for.
  const ownerKey = page ? (page.mergedFrom !== undefined ? page.mergedFrom : page.dataFor) : undefined;
  const templatePage = page && ownerKey !== undefined ? pages.find((p) => p.key === ownerKey) || null : page;
  // The continuation design: a copy of the designed page used for pages 2 onward of a group (`dataFor` = the designed page's key).
  const continuationPage = templatePage ? pages.find((p) => p.dataFor === templatePage.key) || null : null;
  const slotCount = templatePage ? dataSlots(templatePage.annotations || []).length : 0; // data blocks on the designed page (Advanced)
  const nextSlotCount = continuationPage ? dataSlots(continuationPage.annotations || []).length : 0; // 0: no continuation design (or none in it)
  const blockMode = slotCount > 0;
  // Letters: no data blocks, but a long-text box that can run onto the next page (model/dataMerge/flow.js).
  const letterMode = !blockMode && Boolean(templatePage && flowBoxOf(templatePage.annotations));
  // The long-text box needs a fixed height, or it just grows and never overflows.
  const flowProblem = letterMode && [templatePage, continuationPage].some((p) => p && flowBoxOf(p.annotations) && !(flowBoxOf(p.annotations).frameHeight > 0));
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
  function addCalc(def) { view.setDataCalc([...view.dataCalc, def]); }
  function removeCalc(name) { view.setDataCalc(view.dataCalc.filter((d) => d.name !== name)); }
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
    const result = checkMerge([...(templatePage.annotations || []), ...(continuationPage ? continuationPage.annotations || [] : [])], headers, chosen);
    const qrs = qrProblems([...(templatePage.annotations || []), ...(continuationPage ? continuationPage.annotations || [] : [])], chosen, "en");
    const pictures = pictureProblems([...(templatePage.annotations || []), ...(continuationPage ? continuationPage.annotations || [] : [])], chosen, findPhoto);
    return { ...result, missing: result.missing.filter((f) => !VIRTUAL_FIELDS.includes(f)), pictures, qrs, photoCount: view.dataPhotos.length };
  }

  // The pages a merge would make for the chosen rows.
  const flowCache = useRef(null);
  function flowPlansFor(chosen) {
    return planFlowPages(chosen, templatePage.annotations || [], continuationPage ? continuationPage.annotations || [] : null, fitLength, "en");
  }
  function plannedPages(from, to) {
    const chosen = selectRecords(count, { from, to }).map((i) => records[i]);
    if (letterMode) { // measuring every record is slow, so it is kept until the page, the design or the rows change
      const key = [templatePage.annotations, continuationPage && continuationPage.annotations, records, from, to];
      if (!flowCache.current || flowCache.current.key.some((v, i) => v !== key[i])) flowCache.current = { key, plans: flowPlansFor(chosen) };
      return flowCache.current.plans;
    }
    return blockMode ? planPages(chosen, { slotCount, nextSlotCount, groupBy }) : chosen.map((r) => ({ groupRecord: r }));
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
    const flowPlans = letterMode ? flowPlansFor(chosen.map((i) => records[i])) : null;
    const plans = blockMode ? planPages(chosen.map((i) => records[i]), { slotCount, nextSlotCount, groupBy }) : flowPlans;
    const made = (plans || chosen).map((item, n) => {
      const merged = flowPlans
        ? mergeFlowPage((item.design === "continuation" && continuationPage ? continuationPage : templatePage).annotations || [], item, { newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers, findPhoto, makeQr: qrDataUrl })
        : plans
          ? mergeGroupPage((item.design === "continuation" && continuationPage ? continuationPage : templatePage).annotations || [], item, { newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers, findPhoto, makeQr: qrDataUrl })
          : mergeAnnotations(templatePage.annotations || [], records[item], { newId, newGroupId, lang: "en", findPhoto, makeQr: qrDataUrl });
      // `mergeRecord`: the row this page was made from, kept so Export each record as a PDF can name and group the pages (not for data blocks: a page holds several rows).
      const record = flowPlans ? item.record : plans ? null : records[item];
      const copy = { ...templatePage, key: nextKeyRef.current++, annotations: merged.annotations, mergedFrom: templatePage.key, mergeRow: flowPlans ? item.recordNo : plans ? n + 1 : item + 1, ...(record ? { mergeRecord: record } : {}), hidden: undefined };
      if (templatePage.guides) copy.guides = templatePage.guides.map((g) => ({ ...g }));
      return copy;
    });
    const before = pages.filter((p) => p.mergedFrom !== templatePage.key);
    const lastDesign = Math.max(before.findIndex((p) => p.key === templatePage.key), ...before.map((p, i) => (p.dataFor === templatePage.key ? i : -1)));
    const firstIndex = lastDesign + 1;
    setPages((prev) => {
      const kept = prev.filter((p) => p.mergedFrom !== templatePage.key);
      const at = kept.findIndex((p) => p.key === templatePage.key);
      const next = kept.map((p) => (hideTemplate && (p.key === templatePage.key || p.dataFor === templatePage.key) ? { ...p, hidden: true } : p));
      let last = at;
      next.forEach((p, i) => { if (p.dataFor === templatePage.key) last = Math.max(last, i); }); // made pages go after the designs
      next.splice(last + 1, 0, ...made);
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
    isText: selectedItems.length === 1 && selectedItems[0].type === "text",
    flowText: selectedItems.length === 1 && Boolean(selectedItems[0].flowText),
    isPicture: selectedItems.length > 0 && selectedItems.every((a) => a.type === "image"),
    qrText: selectedItems.length > 0 && selectedItems.every((a) => (a.qrText || "") === (selectedItems[0].qrText || "")) ? selectedItems[0].qrText || "" : "",
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
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && a.type === "image" ? { ...a, picField: column || undefined, qrText: column ? undefined : a.qrText } : a)));
  }
  // A picture becomes the QR code of `text` (which may use {{fields}}); an empty text makes it an ordinary picture again.
  function setQrText(text) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && a.type === "image" ? { ...a, qrText: text || undefined, picField: text ? undefined : a.picField } : a)), "qr:" + selectedIds.join(","));
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
  // Page designs: a copy of the designed page for pages 2 onward of a group (a different number of blocks, no title). Edit it like any page.
  function addContinuationDesign() {
    if (!templatePage || continuationPage) return;
    history.recordUndoCheckpoint();
    const copy = {
      ...templatePage, key: nextKeyRef.current++, dataFor: templatePage.key, hidden: undefined,
      annotations: cloneItems(templatePage.annotations || [], () => nextAnnIdRef.current++, () => "g" + nextAnnIdRef.current++),
      ...(templatePage.guides ? { guides: templatePage.guides.map((g) => ({ ...g })) } : {}),
    };
    const at = pages.findIndex((p) => p.key === templatePage.key);
    setPages((prev) => { const next = prev.slice(); next.splice(prev.findIndex((p) => p.key === templatePage.key) + 1, 0, copy); return next; });
    setSelectedIdx(at + 1);
    setSelectedPageIndices([]);
    setMessage("A copy of the page was added for pages 2 onward of a group. Change it (for example remove the title), then make the pages.");
  }
  function goToContinuationDesign() {
    const at = pages.findIndex((p) => continuationPage && p.key === continuationPage.key);
    if (at >= 0) { setSelectedIdx(at); setSelectedPageIndices([]); }
  }
  function removeContinuationDesign() {
    if (!continuationPage) return;
    history.recordUndoCheckpoint();
    setPages((prev) => prev.map((p) => (p.key === continuationPage.key ? { ...p, dataFor: undefined } : p)));
    setMessage("That page is an ordinary page again.");
  }
  // The selected text box is the long text: it continues onto the next page when it is full. One per page.
  function setFlowText(on) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => {
      if (a.type !== "text") return a;
      if (selectedIds.includes(a.id)) return { ...a, flowText: on || undefined };
      return on && a.flowText ? { ...a, flowText: undefined } : a;
    }));
  }
  function setShowOn(value) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && !a.dataBlock ? { ...a, showOn: value === "every" ? undefined : value } : a)));
  }

  return {
    parsed, headers, fileHeaders, records, count, idColumn, recordNo: shownNo, setRecordNo, previewFill, slotCount, blockMode, groupBy, selected, continuationPage, nextSlotCount, addContinuationDesign, removeContinuationDesign, goToContinuationDesign, pageSlotCount: page ? dataSlots(page.annotations || []).length : 0, onContinuationPage: Boolean(page && page.dataFor !== undefined), markDataBlock, setGroupDataBlock, makeGrid, addPhotos, setPicField, setQrText, setFlowText, letterMode, flowProblem, setShowOn, plannedPages, message, setMessage,
    templatePage, earlierCount: earlierPages.length, onGeneratedPage: Boolean(page && page.mergedFrom !== undefined),
    connect, disconnect, addCalc, removeCalc, insertField, usedCheck, createPages,
  };
}
