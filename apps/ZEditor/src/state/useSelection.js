// What is selected and how: the current tool, selected items, the text box being typed in, crop mode, and page selection.

import { withGroupMates } from "../model/annotations.js";

const { useState, useEffect } = React;

export function useSelection({ pages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices }) {
  const [tool, setTool] = useState("select"); // 'select' | 'text' | 'rect' | 'ellipse' | 'pen' | 'highlighter' | 'eraser'
  const [selectedAnnId, setSelectedAnnId] = useState(null);
  // Shift+Click multi-select — `selectedAnnId` stays the single
  // "primary" item (the one resize/crop/drag/Ctrl+C/the FormatPanel's
  // per-object editing all still act on, unchanged from before this
  // existed); `selectedAnnIds` holds any ADDITIONAL items shift-clicked
  // alongside it, purely for the shared selection outline and group
  // delete. Dragging the primary does not drag the others — a
  // deliberate scope cut, not an oversight.
  const [selectedAnnIds, setSelectedAnnIds] = useState([]);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [croppingAnnId, setCroppingAnnId] = useState(null);

  // Clicking any toolbar tool switches the format panel to that tool's
  // own settings — any previous selection is cleared so the panel
  // can't keep showing a stale object's properties instead.
  // Going back to Move keeps what's selected; any other tool starts clean.
  function selectTool(t) {
    setTool(t);
    setEditingAnnId(null);
    if (t === "select") return;
    setSelectedAnnId(null);
    setSelectedAnnIds([]);
  }

  const currentAnnotations = () => (selectedIdx === null ? [] : pages[selectedIdx].annotations || []);

  function handleSelectAnnotations(ids, additive) {
    const existing = additive && selectedAnnId !== null ? [selectedAnnId, ...selectedAnnIds] : [];
    const all = [...new Set([...existing, ...withGroupMates(currentAnnotations(), ids)])];
    setSelectedAnnId(all.length > 0 ? all[0] : null);
    setSelectedAnnIds(all.slice(1));
  }

  // Shift+Click toggles membership in a selection set, keeping one
  // "primary" item (selectedAnnId/selectedIdx) for everything that
  // only ever makes sense for a single object — resize, crop, drag,
  // Ctrl+C, the FormatPanel's own property editing — and a side set of
  // "also selected" ids purely for the shared outline and group
  // delete. A plain click (no shift) always resets to that one item.
  // An item in a group brings its whole group along, unless `single`.
  function handleSelectAnnotation(id, shiftKey, single) {
    if (id === null) {
      setSelectedAnnId(null);
      setSelectedAnnIds([]);
      return;
    }
    const members = single ? [id] : withGroupMates(currentAnnotations(), [id]);
    if (!shiftKey) {
      setSelectedAnnId(id);
      setSelectedAnnIds(members.filter((m) => m !== id));
      return;
    }
    const currentAll = selectedAnnId !== null ? [selectedAnnId, ...selectedAnnIds] : [...selectedAnnIds];
    if (currentAll.includes(id)) {
      const next = currentAll.filter((x) => !members.includes(x));
      setSelectedAnnId(next.length > 0 ? next[0] : null);
      setSelectedAnnIds(next.slice(1));
    } else {
      setSelectedAnnIds([...new Set([...currentAll, ...members.filter((m) => m !== id)])]);
      setSelectedAnnId(id);
    }
  }

  // Picking a row in the Layers panel switches to Move and selects it.
  function handleSelectLayer(id, shiftKey, single) {
    selectTool("select");
    handleSelectAnnotation(id, shiftKey, single);
  }

  function selectedAnnotationIds() {
    return [selectedAnnId, ...selectedAnnIds].filter((id) => id !== null);
  }

  function handleSelectPage(idx, shiftKey) {
    if (!shiftKey || idx === null) {
      setSelectedIdx(idx);
      setSelectedPageIndices([]);
      return;
    }
    const currentAll = selectedIdx !== null ? [selectedIdx, ...selectedPageIndices] : [...selectedPageIndices];
    if (currentAll.includes(idx)) {
      const next = currentAll.filter((x) => x !== idx);
      setSelectedIdx(next.length > 0 ? next[0] : null);
      setSelectedPageIndices(next.slice(1));
    } else {
      setSelectedPageIndices(currentAll);
      setSelectedIdx(idx);
    }
  }

  // Keeps the page currently open as the primary, so selecting all
  // doesn't jump the preview to page 1.
  function handleSelectAllPages() {
    if (pages.length === 0) return;
    const primary = selectedIdx !== null ? selectedIdx : 0;
    setSelectedIdx(primary);
    setSelectedPageIndices(pages.map((_, i) => i).filter((i) => i !== primary));
  }

  // A page action targets the whole selection only when the page it
  // was invoked on is part of an active multi-selection.
  function pagesActedOn(idx) {
    const inMultiSelection = selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx));
    return inMultiSelection ? [selectedIdx, ...selectedPageIndices] : [idx];
  }

  function handleToggleCrop(id) {
    setCroppingAnnId((cur) => (cur === id ? null : id));
  }

  // Clear the annotation selection whenever the selected page changes —
  // a selection outline shouldn't survive a page switch.
  useEffect(() => { setSelectedAnnId(null); }, [selectedIdx]);

  // Cropping only makes sense while its image stays selected — picking
  // a different tool or annotation (both of which change selectedAnnId)
  // should fall out of crop mode automatically rather than leaving it
  // stuck open on a no-longer-selected image.
  useEffect(() => {
    if (croppingAnnId !== null && croppingAnnId !== selectedAnnId) setCroppingAnnId(null);
  }, [selectedAnnId]);

  return {
    tool, setTool, selectTool,
    selectedAnnId, setSelectedAnnId, selectedAnnIds, setSelectedAnnIds, selectedAnnotationIds, currentAnnotations,
    editingAnnId, setEditingAnnId, croppingAnnId, handleToggleCrop,
    handleSelectAnnotations, handleSelectAnnotation, handleSelectLayer,
    handleSelectPage, handleSelectAllPages, pagesActedOn,
  };
}
