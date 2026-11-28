// Data merge (Data button), Basic: connect a spreadsheet (CSV), put its columns into text as {{column}}, preview each row on the page, and make
// one page per row from the page you designed. The file lives inside the project (view.dataSource).

import { checkMerge, makePhotoFinder, mergeAnnotations, pictureProblems, qrProblems } from "../model/dataMerge/build.js";
import { titleToFileName } from "../model/documentTitle.js";
import { recordFileNames, recordGroups } from "../model/dataMerge/export.js";
import { saveFile, writeFileHandle } from "../io/fileSave.js";
import { buildExportPdfBytes } from "../io/pdfExport.js";
import { makeZip } from "../io/zipWriter.js";
import { qrDataUrl, qrPatch } from "../io/qrImage.js";
import { readPhotos } from "../io/dataPhotos.js";
import { applyCalculated } from "../model/dataMerge/calc.js";
import { parseCsv } from "../model/dataMerge/csv.js";
import { annotationBounds } from "../render/itemGeometry.js";
import { fitLength, itemBox, textHeightFor } from "../render/textFit.js";
import { buildListPage, hasListDesign, layoutEntry, listAreaOf, listEntryItems, listHeadingItems, packList } from "../model/dataMerge/list.js";
import { fillTextItem } from "../model/dataMerge/build.js";
import { flowBoxOf, mergeFlowPage, planFlowPages } from "../model/dataMerge/flow.js";
import { groupRecords } from "../model/dataMerge/groups.js";
import { cloneItems, dataSlots, gridCopies, mergeGroupPage, sheetGrid, planPages, previewAnnotations } from "../model/dataMerge/groups.js";
import { PAGE_SIZES_MM, presetByKey, sheetsFor } from "../model/dataMerge/layout.js";
import { cellOffsets, mergeSheetPage, sheetCellOf, sheetPreviewExtras, splitSheet } from "../model/dataMerge/sheet.js";
import { resizedPage } from "../model/pageSize.js";
import { bleedPt } from "../model/bleed.js";
import { makeBlankThumb } from "../render/pageRender.js";
import { translatedAnnotation } from "../model/annotations.js";
import { selectRecords, sortRecords } from "../model/dataMerge/records.js";

import { MAIN_SCALE } from "../constants.js";
const { useDeferredValue, useMemo, useRef, useState } = React;

export function useDataMerge({ doc, history, view, edits, selection, project, status }) {
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
  // The page follows the row a moment after the stepper does, so quick clicks on ◀ ▶ stay responsive on a slow device (React skips the in-between pages).
  const previewNo = useDeferredValue(shownNo);
  const showPreview = view.dataPreviewOn && count > 0;
  const page = pages[selectedIdx] || null;
  // The designed page this page belongs to: itself, or (for a made page or a continuation design) the page it came from or is for.
  const ownerKey = page ? (page.mergedFrom !== undefined ? page.mergedFrom : page.dataFor) : undefined;
  const templatePage = page && ownerKey !== undefined ? pages.find((p) => p.key === ownerKey) || null : page;
  // The continuation design: a copy of the designed page used for pages 2 onward of a group (`dataFor` = the designed page's key).
  const continuationPage = templatePage ? pages.find((p) => p.dataFor === templatePage.key) || null : null;
  const slotCount = templatePage ? dataSlots(templatePage.annotations || []).length : 0; // data blocks on the designed page (Advanced)
  const nextSlotCount = continuationPage ? dataSlots(continuationPage.annotations || []).length : 0; // 0: no continuation design (or none in it)
  // Flowing list: an entry group and an area on the designed page (model/dataMerge/list.js). It comes before data blocks and letters.
  // Cards or labels on a sheet: the page names a ready-made sheet and has a cell rectangle (model/dataMerge/sheet.js). It comes first.
  const sheetPreset = templatePage && templatePage.dataSheet ? presetByKey(templatePage.dataSheet) : null;
  const sheetMode = Boolean(sheetPreset && sheetCellOf(templatePage.annotations));
  const sheetOffsets = useMemo(() => (sheetMode ? cellOffsets(sheetPreset, 72 / 25.4 * MAIN_SCALE) : []), [sheetMode, sheetPreset]);
  const sheetPerPage = sheetMode ? sheetPreset.cols * sheetPreset.rows : 0;
  const listMode = !sheetMode && Boolean(templatePage && hasListDesign(templatePage.annotations));
  const blockMode = slotCount > 0 && !listMode && !sheetMode;
  // Letters: no data blocks, but a long-text box that can run onto the next page (model/dataMerge/flow.js).
  const letterMode = !blockMode && !listMode && !sheetMode && Boolean(templatePage && flowBoxOf(templatePage.annotations));
  // What the page canvas runs its items through to show the chosen row (and, with data blocks, the rows after it in the other blocks; with a sheet,
  // the whole sheet: copies of the card in the other cells, not selectable).
  // Kept as one function per chosen row, and it hands back the same list for the same page items: the canvas lays text out again whenever the list
  // it is given is a new one, so a fresh list on every render made stepping through rows (and every other redraw) slow.
  const previewFill = useMemo(() => {
    if (!showPreview) return null;
    let lastAnns = null, lastEditing, lastOut = null;
    return (anns, editingId) => {
      if (anns === lastAnns && editingId === lastEditing) return lastOut;
      const start = Math.min(previewNo, Math.max(0, count - 1));
      lastOut = previewAnnotations(anns, records, start, editingId, "en", findPhoto, qrDataUrl);
      if (sheetMode && !splitSheet(anns).card.some((a) => a.id === editingId)) lastOut = [...lastOut, ...sheetPreviewExtras(anns, records, start, sheetOffsets, 2000000000, { lang: "en", findPhoto, makeQr: qrDataUrl })];
      lastAnns = anns; lastEditing = editingId;
      return lastOut;
    };
  }, [showPreview, records, previewNo, findPhoto, sheetMode, sheetOffsets]);

  // The long-text box needs a fixed height, or it just grows and never overflows.
  const flowProblem = letterMode && [templatePage, continuationPage].some((p) => p && flowBoxOf(p.annotations) && !(flowBoxOf(p.annotations).frameHeight > 0));
  const groupBy = blockMode && headers.includes(view.dataGroupBy) ? view.dataGroupBy : "";
  const earlierPages = templatePage ? pages.filter((p) => p.mergedFrom === templatePage.key) : [];

  // A text box that is still being typed in shows its field names, not the row's words, so the stepper and the field chips end that first.
  function endTextEditing() { if (selection.editingAnnId !== null) { selection.setEditingAnnId(null); selection.setTool("select"); } }
  function stepRecord(n) { endTextEditing(); setRecordNo(n); }

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
      endTextEditing();
      return;
    }
    if (!page) return;
    const id = nextAnnIdRef.current;
    edits.handleAddText(60, 60, 320, 0);
    edits.handleUpdateAnnotation(id, { text: token });
    selection.setEditingAnnId(null); // it is not typed in, so the preview shows right away
    selection.setTool("select");
  }

  const VIRTUAL_FIELDS = ["page in group", "pages in group", "records in group"];
  const checkCache = useRef(null);
  function usedCheck(from, to) {
    const key = [templatePage && templatePage.annotations, continuationPage && continuationPage.annotations, records, headers, from, to, findPhoto];
    if (checkCache.current && checkCache.current.key.every((v, i) => v === key[i])) return checkCache.current.value;
    const value = usedCheckNow(from, to);
    checkCache.current = { key, value };
    return value;
  }
  function usedCheckNow(from, to) {
    if (!templatePage) return { used: [], missing: [], emptyCounts: [] };
    const chosen = selectRecords(count, { from, to }).map((i) => records[i]);
    const result = checkMerge([...(templatePage.annotations || []), ...(continuationPage ? continuationPage.annotations || [] : [])], headers, chosen);
    const qrs = qrProblems([...(templatePage.annotations || []), ...(continuationPage ? continuationPage.annotations || [] : [])], chosen, "en");
    const pictures = pictureProblems([...(templatePage.annotations || []), ...(continuationPage ? continuationPage.annotations || [] : [])], chosen, findPhoto);
    return { ...result, missing: result.missing.filter((f) => !VIRTUAL_FIELDS.includes(f)), pictures, qrs, photoCount: view.dataPhotos.length };
  }

  // The pages a merge would make for the chosen rows.
  // ---- Flowing list: how the chosen records stack into pages.
  const listCache = useRef(null);
  const listColumns = Math.max(1, Math.min(4, view.dataListColumns));
  function listPlansFor(chosen) {
    const k = 72 / 25.4 * MAIN_SCALE; // pixels per mm
    const gap = view.dataListGap * k, colGap = view.dataListColumnGap * k;
    const designs = [templatePage.annotations || [], continuationPage && hasListDesign(continuationPage.annotations) ? continuationPage.annotations : templatePage.annotations || []];
    const specOf = (items) => ({ items, boxes: items.map(itemBox) });
    const specs = designs.map((ann) => ({ area: listAreaOf(ann), entry: specOf(listEntryItems(ann)), heading: specOf(listHeadingItems(ann)) }));
    const groupColumn = specs[0].heading.items.length && headers.includes(view.dataGroupBy) ? view.dataGroupBy : "";
    const sequence = [];
    groupRecords(chosen, groupColumn).forEach((g, gi) => {
      if (groupColumn) sequence.push({ kind: "heading", record: g.records[0], keep: true, newPage: view.dataListNewPage && gi > 0 });
      g.records.forEach((r) => sequence.push({ kind: "entry", record: r }));
    });
    const layouts = new Map();
    const layoutFor = (d, i) => {
      const key = d + ":" + i;
      if (!layouts.has(key)) {
        const item = sequence[i], spec = specs[d][item.kind === "heading" && specs[d].heading.items.length ? "heading" : "entry"];
        const filled = new Map();
        spec.items.forEach((a) => { if (a.type === "text" && !(a.frameHeight > 0)) filled.set(a.id, textHeightFor(a, fillTextItem(a, item.record, { lang: "en" }).ann.text || "")); });
        layouts.set(key, layoutEntry(spec.boxes, filled));
      }
      return layouts.get(key);
    };
    const packed = packList({ items: sequence, heightFor: (d, i) => layoutFor(d, i).height, areaFirst: specs[0].area.height, areaNext: specs[1].area.height, gap, columns: listColumns });
    return packed.map((pg, n) => {
      const d = pg.design === "first" ? 0 : 1;
      const step = (specs[d].area.width + colGap) / listColumns;
      return {
        design: pg.design, overflow: pg.overflow, pageInGroup: n + 1, pagesInGroup: packed.length, recordsInGroup: chosen.length, groupRecord: chosen[0],
        entries: pg.entries.map((e) => ({ kind: sequence[e.index].kind, record: sequence[e.index].record, y: e.y, xOffset: e.col * step, shifts: layoutFor(d, e.index).shifts })),
      };
    });
  }
  // An entry wider than its column would run into the next column.
  const listTooWide = (() => {
    if (!listMode || listColumns < 2) return false;
    const boxes = listEntryItems(templatePage.annotations).map(itemBox), area = listAreaOf(templatePage.annotations);
    if (!boxes.length || !area) return false;
    const width = Math.max(...boxes.map((b) => b.x + b.width)) - Math.min(...boxes.map((b) => b.x));
    const colGap = view.dataListColumnGap * 72 / 25.4 * MAIN_SCALE;
    return width > (area.width + colGap) / listColumns - colGap + 1;
  })();
  const flowCache = useRef(null);
  function plannedPagesNow() { return templatePage ? plannedPages(undefined, undefined) : []; }
  function flowPlansFor(chosen) {
    return planFlowPages(chosen, templatePage.annotations || [], continuationPage ? continuationPage.annotations || [] : null, fitLength, "en");
  }
  function plannedPages(from, to) {
    const chosen = selectRecords(count, { from, to }).map((i) => records[i]);
    if (sheetMode) return sheetsFor(chosen.length, sheetPerPage).map(() => ({}));
    if (listMode) {
      const key = [templatePage.annotations, continuationPage && continuationPage.annotations, records, from, to, view.dataListGap, view.dataListColumns, view.dataListColumnGap, view.dataListNewPage, view.dataGroupBy];
      if (!listCache.current || listCache.current.key.some((v, i) => v !== key[i])) listCache.current = { key, plans: chosen.length ? listPlansFor(chosen) : [] };
      return listCache.current.plans;
    }
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
    const chosenRows = chosen.map((i) => records[i]);
    const sheetPlans = sheetMode ? sheetsFor(chosenRows.length, sheetPerPage).map((sh, n, all) => ({ slotRecords: sh.cells.map((i) => (i === null ? null : chosenRows[i])), groupRecord: chosenRows[0], pageInGroup: n + 1, pagesInGroup: all.length, recordsInGroup: chosenRows.length })) : null;
    const listPlans = listMode ? listPlansFor(chosen.map((i) => records[i])) : null;
    const flowPlans = letterMode ? flowPlansFor(chosen.map((i) => records[i])) : null;
    const plans = sheetPlans || listPlans || (blockMode ? planPages(chosen.map((i) => records[i]), { slotCount, nextSlotCount, groupBy }) : flowPlans);
    const made = (plans || chosen).map((item, n) => {
      const merged = sheetPlans
        ? mergeSheetPage(templatePage.annotations || [], item, { offsets: sheetOffsets, drawOutline: view.dataSheetOutline, newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers, findPhoto, makeQr: qrDataUrl })
        : listPlans
        ? buildListPage((item.design === "continuation" && continuationPage && hasListDesign(continuationPage.annotations) ? continuationPage : templatePage).annotations || [], item, { newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers, findPhoto, makeQr: qrDataUrl })
        : flowPlans
        ? mergeFlowPage((item.design === "continuation" && continuationPage ? continuationPage : templatePage).annotations || [], item, { newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers, findPhoto, makeQr: qrDataUrl })
        : plans
          ? mergeGroupPage((item.design === "continuation" && continuationPage ? continuationPage : templatePage).annotations || [], item, { newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers, findPhoto, makeQr: qrDataUrl })
          : mergeAnnotations(templatePage.annotations || [], records[item], { newId, newGroupId, lang: "en", findPhoto, makeQr: qrDataUrl });
      // `mergeRecord`: the row this page was made from, kept so Export each record as a PDF can name and group the pages (not for data blocks: a page holds several rows).
      const record = flowPlans ? item.record : plans ? null : records[item]; // (list and data block pages hold several rows)
      const copy = { ...templatePage, key: nextKeyRef.current++, annotations: merged.annotations, mergedFrom: templatePage.key, dataSheet: undefined, mergeRow: flowPlans ? item.recordNo : plans ? n + 1 : item + 1, ...(record ? { mergeRecord: record } : {}), hidden: undefined };
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

  // ---- Export each record as its own PDF: a zip, or files written into a folder.
  const exportGroups = useMemo(() => (templatePage ? recordGroups(pages, templatePage.key) : []), [pages, templatePage && templatePage.key]);
  const exportPattern = view.dataExportPattern || "{{" + (idColumn || fileHeaders[0] || "id") + "}}";
  const exportNames = useMemo(() => recordFileNames(exportGroups, exportPattern, "en"), [exportGroups, exportPattern]);
  const [exporting, setExporting] = useState(false);
  async function exportRecords(target) {
    if (!exportGroups.length || exporting) return;
    setExporting(true);
    try {
      let folder = null;
      if (target === "folder") {
        try { folder = await window.showDirectoryPicker({ mode: "readwrite" }); } catch (err) { if (err && err.name === "AbortError") return; throw err; }
      }
      const files = [];
      for (let i = 0; i < exportGroups.length; i++) {
        setMessage("Making PDF " + (i + 1) + " of " + exportGroups.length + "…");
        const bytes = await buildExportPdfBytes(exportGroups[i].pageIndices.map((n) => pages[n]), doc.pdfDocsRef, view.pageNumbers, () => {}, { bleed: view.exportBleed, cropMarks: view.exportCropMarks });
        const data = new Uint8Array(bytes);
        if (folder) await writeFileHandle(await folder.getFileHandle(exportNames[i], { create: true }), new Blob([data], { type: "application/pdf" }));
        else files.push({ name: exportNames[i], data });
      }
      if (!folder) {
        const saved = await saveFile(new Blob([makeZip(files)], { type: "application/zip" }), titleToFileName(project.docTitle + " - records", ".zip"), "application/zip", "Zip file", [".zip"]);
        if (saved === "cancelled") { setMessage(""); return; }
      }
      setMessage(exportGroups.length + (exportGroups.length === 1 ? " PDF" : " PDFs") + " saved" + (folder ? ' to "' + folder.name + '"' : " in a zip") + ".");
    } catch (err) {
      setMessage("Couldn't export — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setExporting(false);
    }
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
    isListHeading: blockTargets.length > 0 && blockTargets.every((a) => a.listHeading),
    isListEntry: blockTargets.length > 0 && blockTargets.every((a) => a.listEntry),
    isRect: selectedItems.length === 1 && selectedItems[0].type === "rect",
    isListArea: selectedItems.length === 1 && Boolean(selectedItems[0].listArea),
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
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && a.type === "image" ? { ...a, ...(text ? { ...qrPatch(text), qrType: "custom", qrValues: { text } } : { qrText: undefined, qrType: undefined, qrValues: undefined }), picField: text ? undefined : a.picField } : a)), "qr:" + selectedIds.join(","));
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
  // The Sheet choice: the page becomes that sheet's paper size (a blank page only), its first cell is drawn as a dashed rectangle at the sheet's
  // first position, and the merge repeats whatever is designed inside it. "" turns the sheet off (the rectangle stays as an ordinary one).
  function chooseSheet(key) {
    if (!templatePage) return;
    if (!key) {
      history.recordUndoCheckpoint();
      setPages((prev) => prev.map((p) => (p.key === templatePage.key ? { ...p, dataSheet: undefined, annotations: (p.annotations || []).map((a) => (a.sheetCell ? { ...a, sheetCell: undefined } : a)) } : p)));
      return;
    }
    const preset = presetByKey(key), size = PAGE_SIZES_MM[preset.page];
    if (!preset || !templatePage.isBlank || templatePage.isCanvas) { setMessage("A sheet needs a blank page (not a page from a PDF)."); return; }
    history.recordUndoCheckpoint();
    const k = 72 / 25.4 * MAIN_SCALE;
    const bleed = bleedPt(templatePage) * MAIN_SCALE;
    const next = resizedPage(templatePage, size.w, size.h);
    const cell = { x: preset.origin.x * k + bleed, y: preset.origin.y * k + bleed, width: preset.cell.w * k, height: preset.cell.h * k };
    const newId = nextAnnIdRef.current++;
    setPages((prev) => prev.map((p) => {
      if (p.key !== templatePage.key) return p;
      const anns = p.annotations || [];
      const frame = { type: "rect", fillType: "solid", fillColor: "#ffffff", fillAlpha: 0, stroke: true, strokes: [{ color: "#8a8f98", thickness: 1, position: "inside" }], name: "Card frame", sheetCell: true, ...cell };
      const has = anns.some((a) => a.sheetCell);
      return {
        ...p, width: next.width, height: next.height, dataSheet: key, dataUrl: makeBlankThumb(next.width, next.height, p.rotation),
        annotations: has ? anns.map((a) => (a.sheetCell ? { ...a, ...cell } : a)) : [...anns, { ...frame, id: newId }],
      };
    }));
    setMessage("The page is now " + size.w + " × " + size.h + " mm. Design one card inside the dashed frame; every cell of the sheet gets a copy with the next row.");
  }

  // The selected group is the list entry; the selected rectangle is the list area (one of each per page).
  function setListEntry(on) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedGroups.has(a.groupId) ? { ...a, listEntry: on || undefined, listHeading: on ? undefined : a.listHeading, dataBlock: on ? undefined : a.dataBlock } : on && a.listEntry ? { ...a, listEntry: undefined } : a)));
  }
  function setListHeading(on) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedGroups.has(a.groupId) ? { ...a, listHeading: on || undefined, listEntry: on ? undefined : a.listEntry, dataBlock: on ? undefined : a.dataBlock } : on && a.listHeading ? { ...a, listHeading: undefined } : a)));
  }
  function setListArea(on) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && a.type === "rect" ? { ...a, listArea: on || undefined } : on && a.listArea ? { ...a, listArea: undefined } : a)));
  }
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
    parsed, headers, fileHeaders, records, count, idColumn, recordNo: shownNo, setRecordNo: stepRecord, previewFill, slotCount, blockMode, groupBy, selected, continuationPage, nextSlotCount, addContinuationDesign, removeContinuationDesign, goToContinuationDesign, pageSlotCount: page ? dataSlots(page.annotations || []).length : 0, onContinuationPage: Boolean(page && page.dataFor !== undefined), markDataBlock, setGroupDataBlock, makeGrid, exportGroups, exportNames, exportPattern, exporting, exportRecords, addPhotos, setPicField, setQrText, setFlowText, letterMode, flowProblem, sheetMode, sheetPreset, sheetPerPage, chooseSheet, listMode, listColumns, listTooWide, listHasHeading: Boolean(templatePage && listHeadingItems(templatePage.annotations).length), setListEntry, setListHeading, setListArea, listOverflow: listMode && plannedPagesNow().some((p) => p.overflow), listHasEntry: Boolean(templatePage && listEntryItems(templatePage.annotations).length), listHasArea: Boolean(templatePage && listAreaOf(templatePage.annotations)), setShowOn, plannedPages, message, setMessage,
    templatePage, earlierCount: earlierPages.length, onGeneratedPage: Boolean(page && page.mergedFrom !== undefined),
    connect, disconnect, addCalc, removeCalc, insertField, usedCheck, createPages,
  };
}
