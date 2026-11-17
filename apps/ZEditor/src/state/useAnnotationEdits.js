// Every change to the items on a page: adding, editing, moving, rotating, grouping, layering, erasing, deleting; plus the page filter.

import { MAIN_SCALE } from "../constants.js";
import { orderAfterMove, translatedAnnotation, withGroupMates } from "../model/annotations.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { MIN_RECT_SIZE } from "../model/rect.js";
import { flattenedImagePatch, rasterizedRectPatch, rasterizedTextPatch } from "../render/bake.js";
import { rotatedAnnotation } from "../render/itemGeometry.js";
import { getPageDisplaySize } from "../render/pageRender.js";

const { useRef } = React;

export function useAnnotationEdits({ doc, history, selection, toolDefaults }) {
  const { pages, setPages, selectedIdx, selectedPageIndices, nextAnnIdRef, pdfDocsRef, pageFilter } = doc;
  const { recordUndoCheckpoint } = history;
  const {
    tool, selectTool, editingAnnId, setEditingAnnId, selectedAnnId, setSelectedAnnId, selectedAnnIds, setSelectedAnnIds,
    selectedAnnotationIds, currentAnnotations, handleSelectAnnotation,
  } = selection;
  const imageInputRef = useRef(null);

  function updateAnnotationsFor(pageIdx, updater, coalesceKey) {
    recordUndoCheckpoint(coalesceKey);
    setPages((prev) => prev.map((p, i) => (i === pageIdx ? { ...p, annotations: updater(p.annotations || []) } : p)));
  }

  // Patches the filter of every selected page — coalesced per-selection
  // so a slider drag or color-picker tug lands as one undo step, same
  // as handleUpdateAnnotation's per-id coalescing.
  function updatePageFilter(patch) {
    if (selectedIdx === null) return;
    const targets = new Set([selectedIdx, ...selectedPageIndices]);
    recordUndoCheckpoint("pagefilter:" + [...targets].sort((a, b) => a - b).join(","));
    setPages((prev) => prev.map((p, i) => (targets.has(i) ? { ...p, filter: { ...(p.filter || DEFAULT_PAGE_FILTER), ...patch } } : p)));
  }

  function handleRotateAnnotations(originals, degrees, cx, cy) {
    if (selectedIdx === null) return;
    const turned = new Map(originals.map((a) => [a.id, rotatedAnnotation(a, degrees, cx, cy)]));
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => turned.get(a.id) || a), "rotate:" + [...turned.keys()].join());
  }

  function handleMoveAnnotations(originals, dx, dy) {
    if (selectedIdx === null) return;
    const moved = new Map(originals.map((a) => [a.id, translatedAnnotation(a, dx, dy)]));
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => moved.get(a.id) || a), "move:" + [...moved.keys()].join());
  }

  // Finishing a text edit returns to Move, and a box left empty is
  // discarded rather than staying behind as an invisible item.
  function finishTextEdit() {
    if (editingAnnId === null) return;
    const edited = selectedIdx === null ? null : (pages[selectedIdx].annotations || []).find((a) => a.id === editingAnnId);
    setEditingAnnId(null);
    selection.setTool("select");
    if (edited && !edited.text.trim()) {
      updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => a.id !== edited.id), "ann:" + edited.id);
      setSelectedAnnId((id) => (id === edited.id ? null : id));
    }
  }

  // Group: the selected items become one group, stacked together at the
  // top-most member's place (their own order kept). Ungroup releases the
  // groups the selection touches. Both are one undo step.
  function handleGroupSelection() {
    const ids = selectedAnnotationIds();
    if (selectedIdx === null || ids.length < 2) return;
    const groupId = "g" + nextAnnIdRef.current++;
    updateAnnotationsFor(selectedIdx, (anns) => {
      const members = anns.filter((a) => ids.includes(a.id)).map((a) => ({ ...a, groupId }));
      const topIndex = Math.max(...anns.map((a, i) => (ids.includes(a.id) ? i : -1)));
      const rest = anns.filter((a) => !ids.includes(a.id));
      rest.splice(topIndex + 1 - members.length, 0, ...members);
      return rest;
    });
  }

  function handleUngroupSelection() {
    const ids = selectedAnnotationIds();
    if (selectedIdx === null) return;
    const groups = new Set(currentAnnotations().filter((a) => ids.includes(a.id) && a.groupId).map((a) => a.groupId));
    if (groups.size === 0) return;
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (groups.has(a.groupId) ? { ...a, groupId: undefined } : a)));
  }

  function handleAddText(x, y, width) {
    if (selectedIdx === null) return;
    const id = nextAnnIdRef.current++;
    // Shares handleUpdateAnnotation's coalesce key for this same id —
    // a brand-new box immediately followed by typing into it (the
    // normal flow, since it opens ready for typing) collapses into
    // one undo step, instead of "empty box" being its own step.
    updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
      id, type: "text", x, y, text: "", width,
      fontFamily: toolDefaults.textFontFamily,
      fontSize: toolDefaults.textFontSize,
      bold: toolDefaults.textBold,
      italic: toolDefaults.textItalic,
      underline: toolDefaults.textUnderline,
      color: toolDefaults.textColor,
      align: toolDefaults.textAlign,
    }], "ann:" + id);
    setSelectedAnnId(id);
    setSelectedAnnIds([]);
    setEditingAnnId(id);
  }

  function handleAddRect(box) {
    if (selectedIdx === null) return;
    const id = nextAnnIdRef.current++;
    updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
      id, type: "rect", shape: tool === "ellipse" ? "ellipse" : undefined, x: box.x, y: box.y,
      width: Math.max(MIN_RECT_SIZE, box.width),
      height: Math.max(MIN_RECT_SIZE, box.height),
      ...toolDefaults.rectDefaults,
    }]);
    selectTool("select");
    setSelectedAnnId(id);
  }

  function handleAddStroke(stroke) {
    if (selectedIdx === null) return;
    const id = nextAnnIdRef.current++;
    updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
      id, type: "stroke", tool: stroke.tool, points: stroke.points,
      color: stroke.color, strokeWidth: stroke.strokeWidth, taper: stroke.taper || 0,
    }]);
  }

  // A hidden or locked layer can't stay selected, which is what keeps
  // it safe from dragging, nudging, resizing and Delete.
  function handleToggleLayerFlag(ann, flag) {
    const on = !ann[flag];
    handleUpdateAnnotation(ann.id, { [flag]: on });
    if (on && (ann.id === selectedAnnId || selectedAnnIds.includes(ann.id))) handleSelectAnnotation(ann.id, true, true);
  }

  // `insertBeforeRow` is a slot in the panel's list, which runs top layer first.
  function handleReorderLayers(draggedIds, insertBeforeRow) {
    const topFirst = (pages[selectedIdx].annotations || []).slice().reverse();
    const ids = withGroupMates(topFirst, draggedIds); // a group always moves as one
    const fromRows = topFirst.flatMap((a, row) => (ids.includes(a.id) ? [row] : []));
    const newOrder = orderAfterMove(topFirst.length, fromRows, insertBeforeRow);
    if (newOrder) updateAnnotationsFor(selectedIdx, () => newOrder.map((row) => topFirst[row]).reverse());
  }

  // Image tool is a one-shot action now, not a persistent mode: click
  // the toolbar icon and the file picker opens immediately.
  function handleImageToolClick() {
    if (selectedIdx === null) return;
    imageInputRef.current && imageInputRef.current.click();
  }

  // Shared by the Image tool's file picker and pasting an image straight
  // from the system clipboard (Ctrl+V) — both just need a File/Blob and
  // the page to drop it on.
  function addImageAnnotationFromFile(file, pageIdx) {
    if (!file || pageIdx === null) return;
    const pageAtChooseTime = pages[pageIdx];
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();
      img.onload = async () => {
        const MAX_W = 260; // a sensible starting size — the resize handle takes it from there
        const scale = img.naturalWidth > MAX_W ? MAX_W / img.naturalWidth : 1;
        const width = img.naturalWidth * scale;
        const height = img.naturalHeight * scale;
        const display = await getPageDisplaySize(pageAtChooseTime, pdfDocsRef, MAIN_SCALE);
        const x = Math.max(0, (display.width - width) / 2);
        const y = Math.max(0, (display.height - height) / 2);
        const id = nextAnnIdRef.current++;
        updateAnnotationsFor(pageIdx, (anns) => [...anns, {
          id, type: "image", x, y, width, height,
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, src,
        }]);
        selectTool("select");
        setSelectedAnnId(id);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleImageFileChosen(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    addImageAnnotationFromFile(file, selectedIdx);
  }

  function handleUpdateAnnotation(id, patch) {
    if (selectedIdx === null) return;
    // Coalesced per-annotation: a drag's mousemoves, a resize, a
    // slider tug, or a burst of keystrokes editing this same
    // annotation all land in one undo step instead of one per event.
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (a.id === id ? { ...a, ...patch } : a)), "ann:" + id);
  }

  // Its own undo step: no coalesce key, so it can't merge with a
  // slider tug made just before it.
  async function handleFlattenImage(ann) {
    const pageIdx = selectedIdx;
    const patch = await flattenedImagePatch(ann, pageFilter);
    if (!patch) return;
    updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => (a.id === ann.id ? { ...a, ...patch } : a)));
  }

  async function handleRasterizeText(ann) {
    const pageIdx = selectedIdx;
    const patch = await rasterizedTextPatch(ann);
    if (!patch) return;
    updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => (a.id === ann.id ? { ...a, ...patch } : a)));
  }

  async function handleRasterizeRect(ann) {
    const pageIdx = selectedIdx;
    const patch = await rasterizedRectPatch(ann);
    if (!patch) return;
    updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => (a.id === ann.id ? { ...a, ...patch } : a)));
  }

  // Deletes the whole current selection (the primary item plus any
  // shift-selected extras), not just one id — see handleSelectAnnotation.
  function handleDeleteAnnotation() {
    if (selectedIdx === null || selectedAnnId === null) return;
    const idsToDelete = [selectedAnnId, ...selectedAnnIds];
    updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => !idsToDelete.includes(a.id)));
    setSelectedAnnId(null);
    setSelectedAnnIds([]);
  }

  // Eraser tool — same removal as handleDeleteAnnotation, kept as its
  // own function since it's triggered by a drag gesture over many
  // strokes in one go, not a single explicit delete click. Coalesced
  // under one shared key so a whole erase swipe (which can touch
  // several different stroke ids) is one undo step, not one per stroke.
  function handleEraseStroke(id) {
    if (selectedIdx === null) return;
    updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => a.id !== id), "eraser");
    setSelectedAnnId((cur) => (cur === id ? null : cur));
  }

  // Soft eraser: the erased picture replaces the image's own pixels.
  // No coalesce key, so every swipe is its own undo step.
  function handleEraseImagePixels(id, src) {
    if (selectedIdx === null) return;
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (a.id === id ? { ...a, src } : a)));
  }

  return {
    updateAnnotationsFor, updatePageFilter,
    handleRotateAnnotations, handleMoveAnnotations, finishTextEdit,
    handleGroupSelection, handleUngroupSelection,
    handleAddText, handleAddRect, handleAddStroke,
    handleToggleLayerFlag, handleReorderLayers,
    imageInputRef, handleImageToolClick, addImageAnnotationFromFile, handleImageFileChosen,
    handleUpdateAnnotation, handleFlattenImage, handleRasterizeText, handleRasterizeRect,
    handleDeleteAnnotation, handleEraseStroke, handleEraseImagePixels,
  };
}
