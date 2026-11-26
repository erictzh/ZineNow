// Data merge (Data button), Basic: connect a spreadsheet (CSV), put its columns into text as {{column}}, preview each row on the page, and make
// one page per row from the page you designed. The file lives inside the project (view.dataSource).

import { checkMerge, mergeAnnotations } from "../model/dataMerge/build.js";
import { parseCsv } from "../model/dataMerge/csv.js";
import { dataSlots, mergeGroupPage, planPages, previewAnnotations } from "../model/dataMerge/groups.js";
import { selectRecords, sortRecords } from "../model/dataMerge/records.js";

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
  const showPreview = view.dataPreviewOn && count > 0;
  // What the page canvas runs its items through to show the chosen row (and, with data blocks, the rows after it in the other blocks).
  const previewFill = showPreview ? (anns, editingId) => previewAnnotations(anns, records, shownNo, editingId, "en") : null;

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
    return { ...result, missing: result.missing.filter((f) => !VIRTUAL_FIELDS.includes(f)) };
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
        ? mergeGroupPage(templatePage.annotations || [], item, { newId, newGroupId, lang: "en", repeatOthers: view.dataRepeatOthers })
        : mergeAnnotations(templatePage.annotations || [], records[item], { newId, newGroupId, lang: "en" });
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
  };
  function markDataBlock(on) {
    if (!selected.grouped) { setMessage("Group the items first (select them and press Ctrl+G), then mark the group as a data block."); return; }
    setMessage("");
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedGroups.has(a.groupId) ? { ...a, dataBlock: on || undefined, showOn: on ? undefined : a.showOn } : a)));
  }
  function setShowOn(value) {
    edits.updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (selectedIds.includes(a.id) && !a.dataBlock ? { ...a, showOn: value === "every" ? undefined : value } : a)));
  }

  return {
    parsed, headers, records, count, idColumn, recordNo: shownNo, setRecordNo, previewFill, slotCount, blockMode, groupBy, selected, markDataBlock, setShowOn, plannedPages, message, setMessage,
    templatePage, earlierCount: earlierPages.length, onGeneratedPage: Boolean(page && page.mergedFrom !== undefined),
    connect, disconnect, insertField, usedCheck, createPages,
  };
}
