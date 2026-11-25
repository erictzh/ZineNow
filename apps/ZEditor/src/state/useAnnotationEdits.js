// Every change to the items on a page: adding, editing, moving, rotating, grouping, layering, erasing, deleting; plus the page filter.

import { cutOutCanvas, segmentCanvas } from "../../../../shared/js/ai/bgSession.js";
import { sendImageToAiTools } from "../../../../shared/js/imageHandoff.js";
import { MAIN_SCALE } from "../constants.js";
import { orderAfterMove, translatedAnnotation, withGroupMates } from "../model/annotations.js";
import { clipTargets } from "../model/clipping.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { MIN_RECT_SIZE } from "../model/rect.js";
import { captureTextStyle, relinkPatch, resolvedStyleProps, styleDiff, textStylePatch, withStyleOverrides } from "../model/text/textStyles.js";
import { isThreaded, removeFromPages } from "../model/text/threads.js";
import { patchedPages } from "../render/storyEdits.js";
import { flattenedImagePatch, rasterizedRectPatch, rasterizedTextPatch } from "../render/bake.js";
import { rotatedAnnotation } from "../render/itemGeometry.js";
import { getPageDisplaySize } from "../render/pageRender.js";
import { isSvgFile, svgFileToPng } from "../io/images.js";
import { resolvePageText } from "../render/pageText.js";
import { makeTextFrameActions } from "./textFrameActions.js";

const { useEffect, useRef } = React;

export function useAnnotationEdits({ doc, history, selection, toolDefaults }) {
  const { pages, setPages, selectedIdx, selectedPageIndices, nextAnnIdRef, pdfDocsRef, pageFilter } = doc;
  const { recordUndoCheckpoint } = history;
  const {
    tool, selectTool, editingAnnId, setEditingAnnId, selectedAnnId, setSelectedAnnId, selectedAnnIds, setSelectedAnnIds,
    selectedAnnotationIds, currentAnnotations, handleSelectAnnotation,
  } = selection;
  const imageInputRef = useRef(null);

  // Like updateAnnotationsFor, but for a change that can reach another page too (a story's head). `updater(pages)` returns the new pages.
  function updatePagesFor(updater, coalesceKey) {
    recordUndoCheckpoint(coalesceKey);
    setPages((prev) => updater(prev));
  }

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

  // Finishing a text edit returns to Move. The box stays selected, so its panel, handles and
  // a drag still work on it; an empty box is only thrown away once it's deselected (below).
  function finishTextEdit() {
    if (editingAnnId === null) return;
    setEditingAnnId(null);
    selection.setTool("select");
  }

  // A text box left empty is discarded when it stops being selected (clicking the empty page,
  // another item, or another page), rather than staying behind as an invisible item. Using the
  // side panel, resizing or moving it keeps it selected, so it stays.
  // (A frame in a thread stays: it's part of the story's layout even while empty.)
  const lastSelectionRef = useRef({ pageIdx: null, ids: [] });
  useEffect(() => {
    const now = [selectedAnnId, ...selectedAnnIds, editingAnnId].filter((id) => id != null);
    const prev = lastSelectionRef.current;
    lastSelectionRef.current = { pageIdx: selectedIdx, ids: now };
    if (prev.pageIdx == null || !pages[prev.pageIdx]) return;
    const anns = pages[prev.pageIdx].annotations || [];
    const samePage = prev.pageIdx === selectedIdx;
    const empty = prev.ids.filter((id) => {
      if (samePage && now.includes(id)) return false;
      const a = anns.find((x) => x.id === id);
      return a && a.type === "text" && !(a.text || "").trim() && !isThreaded(anns, id);
    });
    if (!empty.length) return;
    updateAnnotationsFor(prev.pageIdx, (list) => list.filter((a) => !empty.includes(a.id)), "ann:" + empty.join());
  }, [selectedAnnId, selectedAnnIds, editingAnnId, selectedIdx]);

  // Group: the selected items become one group, stacked together at the
  // top-most member's place (their own order kept). Ungroup releases the
  // groups the selection touches. Both are one undo step.
  function handleGroupSelection() {
    const ids = selectedAnnotationIds();
    if (selectedIdx === null || ids.length < 2) return;
    // A group id no page uses yet (a safety net: the counter could lag behind ids from an older file).
    const used = new Set(pages.flatMap((p) => (p.annotations || []).map((a) => a.groupId).filter(Boolean)));
    let groupId = "g" + nextAnnIdRef.current++;
    while (used.has(groupId)) groupId = "g" + nextAnnIdRef.current++;
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
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (groups.has(a.groupId) ? { ...a, groupId: undefined, groupName: undefined } : a)));
  }

  // Clipping masks (model/clipping.js), each its own undo step. `handleSetClip(ids, true)` clips them as
  // `clipTargets` says (one layer: to the layer below; several: all but the bottom-most, which becomes their
  // base); `false` releases those that are clipped.
  function handleSetClip(ids, on) {
    if (selectedIdx === null) return;
    const items = currentAnnotations();
    const targets = new Set(on ? clipTargets(items, ids) : ids.filter((id) => (items.find((a) => a.id === id) || {}).clipToBelow));
    if (targets.size === 0) return;
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (targets.has(a.id) ? { ...a, clipToBelow: on ? true : undefined } : a)));
  }
  // One layer: clipped if it isn't, released if it is.
  function handleToggleClip(id) {
    const item = currentAnnotations().find((a) => a.id === id);
    if (item) handleSetClip([id], !item.clipToBelow);
  }
  // Ctrl+Alt+G and the touch bar: clips the selection (as the Layers panel's "Clip to below (multiple)"
  // does), or releases it when there's nothing left to clip.
  function handleClipSelection() {
    const ids = selectedAnnotationIds();
    handleSetClip(ids, clipTargets(currentAnnotations(), ids).length > 0);
  }

  // A group's name lives on each of its members (`groupName`), so it travels with them in saved projects.
  function handleRenameGroup(groupId, name) {
    if (selectedIdx === null) return;
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (a.groupId === groupId ? { ...a, groupName: name || undefined } : a)));
  }

  // Locks / hides (or unlocks / shows) every layer of a group at once. Locked or hidden layers
  // can't stay selected, so the selection lets go of them.
  function handleSetGroupFlag(groupId, flag, on) {
    if (selectedIdx === null) return;
    const members = currentAnnotations().filter((a) => a.groupId === groupId).map((a) => a.id);
    updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => (a.groupId === groupId ? { ...a, [flag]: on || undefined } : a)));
    if (on && [selectedAnnId, ...selectedAnnIds].some((id) => members.includes(id))) {
      setSelectedAnnId(null);
      setSelectedAnnIds([]);
    }
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
  // An SVG is drawn into a PNG first (io/images.js svgFileToPng); it starts at its own size,
  // as another picture would, while its pixels are high resolution for printing.
  // `opts.center` ({ x, y } in page pixels): put its middle there (kept on the page) instead of in
  // the middle of the page, e.g. where a picture was dropped.
  function addImageAnnotationFromFile(file, pageIdx, opts = {}) {
    if (!file || pageIdx === null) return;
    const pageAtChooseTime = pages[pageIdx];
    if (isSvgFile(file)) {
      svgFileToPng(file)
        .then((png) => placeImage(png.src, png.width, png.height))
        .catch((err) => window.alert(err.message || "That SVG file couldn't be opened."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => placeImage(reader.result, null, null);
    reader.readAsDataURL(file);

    // `shownW/H`: the size to start from, if not the image's own pixels (an SVG's).
    function placeImage(src, shownW, shownH) {
      const img = new Image();
      img.onload = async () => {
        const MAX_W = 260; // a sensible starting size — the resize handle takes it from there
        const baseW = shownW || img.naturalWidth;
        const baseH = shownH || img.naturalHeight;
        const scale = baseW > MAX_W ? MAX_W / baseW : 1;
        const width = baseW * scale;
        const height = baseH * scale;
        const display = await getPageDisplaySize(pageAtChooseTime, pdfDocsRef, MAIN_SCALE);
        const c = opts.center;
        const x = c ? Math.min(Math.max(0, c.x - width / 2), Math.max(0, display.width - width)) : Math.max(0, (display.width - width) / 2);
        const y = c ? Math.min(Math.max(0, c.y - height / 2), Math.max(0, display.height - height)) : Math.max(0, (display.height - height) / 2);
        const id = nextAnnIdRef.current++;
        updateAnnotationsFor(pageIdx, (anns) => [...anns, {
          id, type: "image", x, y, width, height,
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, src,
        }]);
        selectTool("select");
        setSelectedAnnId(id);
      };
      img.src = src;
    }
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
    // A look setting changed on a box linked to a text style becomes that box's override.
    updatePagesFor((all) => patchedPages(all, selectedIdx, id, patch, (a, p) => ({ ...a, ...withStyleOverrides(a, p) })), "ann:" + id);
  }

  // The Layers panel's Opacity and Blend: `patch` ({ opacity } or { blend }) goes on every selected
  // layer. Coalesced per selection and setting, so a slider drag is one undo step.
  function handleSetLayerLook(ids, patch) {
    if (selectedIdx === null || ids.length === 0) return;
    const merge = (a, p) => ({ ...a, ...withStyleOverrides(a, p) });
    const key = "look:" + Object.keys(patch).join() + ":" + ids.join();
    updatePagesFor((all) => ids.reduce((list, id) => patchedPages(list, selectedIdx, id, patch, merge), all), key);
  }

  // ---- Linked text styles (model/text/textStyles.js). Each is its own undo step.
  // (The style list itself isn't part of undo: undoing a redefine puts the boxes back, not the style.)
  const patchBox = (id, patch) => updatePagesFor((all) => patchedPages(all, selectedIdx, id, patch, (a, p) => ({ ...a, ...p })));
  // Gives a box a saved style's look and links it to it (a built-in style is applied as a plain copy).
  function handleApplyTextStyle(ann, style) {
    if (selectedIdx === null) return;
    const builtIn = Boolean(style.builtIn);
    const props = builtIn ? style.props : resolvedStyleProps(toolDefaults.textStyles, style.name);
    patchBox(ann.id, { ...textStylePatch({ props }), styleName: builtIn ? undefined : style.name, styleOverrides: undefined });
  }
  // Makes this box's look the style's new definition and updates every box linked to it
  // (on every page), except for the settings each of them overrides.
  function handleRedefineTextStyle(name, source) {
    const styles = toolDefaults.textStyles;
    const style = styles.find((s) => s.name === name);
    if (!style) return;
    const captured = captureTextStyle(source);
    const props = style.basedOn ? styleDiff(resolvedStyleProps(styles, style.basedOn), captured) : captured;
    const next = styles.map((s) => (s.name === name ? { ...s, props } : s));
    toolDefaults.setTextStyles(next);
    recordUndoCheckpoint();
    setPages((prev) => prev.map((p) => ({
      ...p,
      annotations: (p.annotations || []).map((a) => {
        if (a.id === source.id) return { ...a, styleName: name, styleOverrides: undefined };
        const patch = relinkPatch(a, next);
        return patch ? { ...a, ...patch } : a;
      }),
    })));
  }
  // Takes back the box's own changes, so it matches its style again.
  function handleResetStyleOverrides(ann) {
    if (selectedIdx === null) return;
    const patch = relinkPatch({ ...ann, styleOverrides: undefined }, toolDefaults.textStyles);
    if (patch) patchBox(ann.id, { ...patch, styleOverrides: undefined });
  }
  function handleUnlinkTextStyle(ann) {
    if (selectedIdx === null) return;
    patchBox(ann.id, { styleName: undefined, styleOverrides: undefined });
  }

  // Its own undo step: no coalesce key, so it can't merge with a
  // slider tug made just before it.
  async function handleFlattenImage(ann) {
    const pageIdx = selectedIdx;
    const patch = await flattenedImagePatch(ann, pageFilter);
    if (!patch) return;
    updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => (a.id === ann.id ? { ...a, ...patch } : a)));
  }

  // Remove background (Image panel): bakes the picture as it looks, finds the subject with the on-device model (the model must be
  // downloaded, shared/js/ai/manager.js), and replaces the picture with the subject only (everything else see-through). One undo step.
  // opts: { model: "u2netp" | "modnet", cutoff 0..1, soft 0..1 }. `onStatus(text)` for the slow parts.
  async function handleRemoveBackground(ann, opts, onStatus) {
    const pageIdx = selectedIdx;
    const patch = await flattenedImagePatch(ann, pageFilter);
    if (!patch) throw new Error("There is nothing visible on that picture.");
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Couldn't read the picture.")); i.src = patch.src; });
    const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    const { mask, side } = await segmentCanvas(canvas, opts.model, onStatus);
    const out = cutOutCanvas(canvas, mask, side, opts.cutoff, opts.soft);
    updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => (a.id === ann.id ? { ...a, ...patch, src: out.toDataURL("image/png") } : a)));
  }

  // Sends the picture, as it looks (crop, adjustments, effects baked in), to Ai Tools (Local) in a new tab (shared/js/imageHandoff.js).
  // Called straight from the button's click, so the browser allows the new tab. The result comes back as a new layer
  // (state/useImageHandoff.js adds it to the document that is open here).
  function handleOpenInAiTools(ann) {
    const name = (ann.name || "picture").replace(/[^\w .-]+/g, "") || "picture";
    const pageKey = selectedIdx !== null && pages[selectedIdx] ? pages[selectedIdx].key : null;
    sendImageToAiTools(async () => {
      const patch = await flattenedImagePatch(ann, pageFilter);
      if (!patch) throw new Error("There is nothing visible on that picture to send.");
      // the baked picture's own box goes along, so the result comes back exactly over it
      return { blob: await (await fetch(patch.src)).blob(), meta: { pageKey, x: patch.x, y: patch.y, width: patch.width, height: patch.height, angle: patch.angle, name } };
    }, name + ".png").catch((err) => window.alert("Couldn't open Ai Tools (Local): " + (err && err.message ? err.message : err)));
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
    // Deleting a frame of a threaded story keeps the story: the frames around it link up.
    updatePagesFor((all) => removeFromPages(all, idsToDelete));
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
  // No coalesce key, so every swipe is its own undo step. `pageIdx` is for the
  // magic eraser's preview, which can be applied after the page has changed;
  // it defaults to the current page.
  function handleEraseImagePixels(id, src, pageIdx) {
    const idx = pageIdx === undefined ? selectedIdx : pageIdx;
    if (idx === null) return;
    updateAnnotationsFor(idx, (anns) => anns.map((a) => (a.id === id ? { ...a, src } : a)));
  }

  const frameActions = makeTextFrameActions({ pages, selectedIdx, pdfDocsRef, nextAnnIdRef, updateAnnotationsFor, updatePagesFor, setSelectedAnnId, setSelectedAnnIds });

  return {
    frameActions,
    updateAnnotationsFor, updatePagesFor, updatePageFilter,
    handleRotateAnnotations, handleMoveAnnotations, finishTextEdit,
    handleGroupSelection, handleUngroupSelection, handleSetClip, handleToggleClip, handleClipSelection,
    handleAddText, handleAddRect, handleAddStroke,
    handleToggleLayerFlag, handleReorderLayers, handleRenameGroup, handleSetGroupFlag,
    imageInputRef, handleImageToolClick, addImageAnnotationFromFile, handleImageFileChosen,
    handleUpdateAnnotation, handleSetLayerLook, handleFlattenImage, handleRemoveBackground, handleOpenInAiTools, handleRasterizeText, handleRasterizeRect,
    handleDeleteAnnotation, handleEraseStroke, handleEraseImagePixels,
    styleActions: { apply: handleApplyTextStyle, redefine: handleRedefineTextStyle, resetOverrides: handleResetStyleOverrides, unlink: handleUnlinkTextStyle },
  };
}
