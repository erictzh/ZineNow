// Data merge (Data button), Basic: connect a spreadsheet (CSV), put its columns into text as {{column}}, preview each row on the page, and make
// one page per row from the page you designed. The file lives inside the project (view.dataSource).

import { checkMerge, mergeAnnotations } from "../model/dataMerge/build.js";
import { parseCsv } from "../model/dataMerge/csv.js";
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
  const previewRecord = view.dataPreviewOn && count > 0 ? records[shownNo] : null;

  const page = pages[selectedIdx] || null;
  const templatePage = page && page.mergedFrom !== undefined ? pages.find((p) => p.key === page.mergedFrom) || null : page;
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

  function usedCheck(from, to) {
    if (!templatePage) return { used: [], missing: [], emptyCounts: [] };
    const chosen = selectRecords(count, { from, to }).map((i) => records[i]);
    return checkMerge(templatePage.annotations || [], headers, chosen);
  }

  // One page per chosen row, placed after the template; earlier pages made from this template are replaced.
  function createPages({ from, to, hideTemplate }) {
    if (!templatePage || count === 0) return 0;
    const chosen = selectRecords(count, { from, to });
    if (!chosen.length) return 0;
    history.recordUndoCheckpoint();
    const newId = () => nextAnnIdRef.current++;
    const newGroupId = () => "g" + nextAnnIdRef.current++;
    const made = chosen.map((i) => {
      const { annotations } = mergeAnnotations(templatePage.annotations || [], records[i], { newId, newGroupId, lang: "en" });
      const copy = { ...templatePage, key: nextKeyRef.current++, annotations, mergedFrom: templatePage.key, mergeRow: i + 1, hidden: undefined };
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

  return {
    parsed, headers, records, count, idColumn, recordNo: shownNo, setRecordNo, previewRecord, message, setMessage,
    templatePage, earlierCount: earlierPages.length, onGeneratedPage: Boolean(page && page.mergedFrom !== undefined),
    connect, disconnect, insertField, usedCheck, createPages,
  };
}
