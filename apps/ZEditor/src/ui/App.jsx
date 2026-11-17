// The editor: all app state and handlers, and the page layout. (To be split into state/ hooks next.)

import { DEFAULT_PAGE_SIZE, EXPORT_SCALE, MAIN_SCALE, THUMB_SCALE, ZOOM_PERCENT } from "../constants.js";
import { legacyLayerOrder, orderAfterMove, translatedAnnotation, withGroupMates } from "../model/annotations.js";
import { hexToRgb } from "../model/color.js";
import { controlValues } from "../model/controls.js";
import { stripExtension, titleStamp, titleToFileName } from "../model/documentTitle.js";
import { DEFAULT_GUIDE_BLEED_IN, DEFAULT_GUIDE_MARGIN_IN } from "../model/guides.js";
import { MAX_UNDO_HISTORY, UNDO_COALESCE_MS } from "../model/history.js";
import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT, DEFAULT_PAGE_FILTER, PAGE_FILTER_OPTIONS } from "../model/pageFilters.js";
import { DEFAULT_PAGE_NUMBERS, pageNumberSpec } from "../model/pageNumbers.js";
import { MIN_RECT_SIZE, RECT_CONTROLS } from "../model/rect.js";
import { SOFT_ERASER_DEFAULTS } from "../model/softEraser.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS } from "../model/strokes.js";
import { DEFAULT_FONT_OPTIONS } from "../model/text/textControls.js";
import { TEXT_STYLES_STORAGE_KEY, captureTextStyle, readStoredTextStyles } from "../model/text/textStyles.js";
import { flattenedImagePatch, rasterizedRectPatch, rasterizedTextPatch } from "../render/bake.js";
import { LUMINANCE_MATRIX_VALUES } from "../render/filters/luma.js";
import { rotatedAnnotation } from "../render/itemGeometry.js";
import { docFor, getPageDisplaySize, makeBlankThumb, renderPageToCanvas } from "../render/pageRender.js";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../io/base64.js";
import { customFontStore, registerCustomFont } from "../io/customFonts.js";
import { canvasToArrayBuffer, saveFile, savePdfBytes, writeFileHandle } from "../io/fileSave.js";
import { ComposeCanvas } from "./canvas/ComposeCanvas.jsx";
import { SliderNumberInput } from "./controls/inputs.jsx";
import { ConfirmDialog } from "./dialogs/ConfirmDialog.jsx";
import { InsertPdfDialog } from "./dialogs/InsertPdfDialog.jsx";
import { NewDocumentDialog } from "./dialogs/NewDocumentDialog.jsx";
import { ShortcutsDialog } from "./dialogs/ShortcutsDialog.jsx";
import { FormatPanel } from "./panels/FormatPanel.jsx";
import { LayersPanel } from "./panels/LayersPanel.jsx";
import { FilterSettings } from "./settings/FilterSettings.jsx";
import { GuidesSettings } from "./settings/GuidesSettings.jsx";
import { OnionSkinSettings } from "./settings/OnionSkinSettings.jsx";
import { PageNumbersSettings } from "./settings/PageNumbersSettings.jsx";
import { Sidebar } from "./sidebar/Sidebar.jsx";
import { PageMenuBody } from "./topbar/PageMenu.jsx";
import { MenuItem, TopMenu } from "./topbar/TopMenu.jsx";
const { useState, useRef, useEffect, useLayoutEffect, useMemo } = React;

export function App() {
  const [guidesOn, setGuidesOn] = useState(false);
  const [centerGuideOn, setCenterGuideOn] = useState(false);
  const [guideFormat, setGuideFormat] = useState("match");
  const [guideMarginIn, setGuideMarginIn] = useState(DEFAULT_GUIDE_MARGIN_IN);
  const [guideBleedIn, setGuideBleedIn] = useState(DEFAULT_GUIDE_BLEED_IN);
  const [pageNumbers, setPageNumbers] = useState(DEFAULT_PAGE_NUMBERS);
  const [onionSkinOn, setOnionSkinOn] = useState(false);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.3);
  const [onionGhostSrc, setOnionGhostSrc] = useState(null);
  const [pages, setPages] = useState([]); // {key, pageNumber, rotation, dataUrl, isBlank, annotations, filter}
  const [selectedIdx, setSelectedIdx] = useState(null);
  // Page filter (grayscale/duotone/halftone) is a per-page property
  // (page.filter) rather than app-wide state — each page keeps its own
  // look, and switching pages shows/edits that page's own setting
  // instead of one filter bleeding onto every page.
  const selectedPage = selectedIdx !== null ? pages[selectedIdx] : null;
  // Undo/redo — each entry is {pages, selectedIdx}, with each page's
  // dataUrl thumbnail stripped out before storing (see stripDataUrls):
  // it's fully derivable from pageNumber/rotation/isBlank, and at
  // several KB–100KB+ per page as a base64 PNG, it's by far the
  // heaviest part of a page object. Everything else (annotations
  // included) is already produced through this app's existing
  // immutable-update style — unrelated pages/annotations keep their
  // same object references across a change — so these snapshots share
  // structure with each other for free rather than deep-cloning.
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const lastCommitRef = useRef({ time: 0, key: null });
  const clipboardRef = useRef(null); // last copied annotation (Ctrl+C/Ctrl+V) — a plain ref, not state, since copying shouldn't trigger a re-render
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sendingToArranger, setSendingToArranger] = useState(false);
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
  const [selectedPageIndices, setSelectedPageIndices] = useState([]);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [croppingAnnId, setCroppingAnnId] = useState(null);
  // Insert PDF — holds the chosen file while the "Insert after page"
  // dialog is open; the actual insert only happens on confirm.
  const [pendingInsertFile, setPendingInsertFile] = useState(null);
  const [newDocOpen, setNewDocOpen] = useState(false);
  // True when the New Document dialog was reached through New Project
  // (so it offers "Open a PDF instead"); false from the empty-state button.
  const [newDocFromProject, setNewDocFromProject] = useState(false);
  const [insertAfterPage, setInsertAfterPage] = useState(0);
  const [savingProject, setSavingProject] = useState(false);
  // Two-step "this erases your work" confirmation, shared by New
  // Project and Load Project — action is null (closed), "newProject",
  // or "loadProject"; step is 1 (first warning) or 2 (final check).
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmStep, setConfirmStep] = useState(1);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(ZOOM_PERCENT.initial);
  const previewPaneRef = useRef(null);
  const zoomAnchorRef = useRef(null);

  // Zooming holds the point at the middle of the view in place: note
  // where it is on the page now, then scroll back to it after the
  // page has been laid out at its new size.
  function artboardElement() {
    return previewPaneRef.current && previewPaneRef.current.querySelector(".ze-artboard-zoom");
  }

  function handleZoomChange(percent) {
    const pane = previewPaneRef.current, board = artboardElement();
    if (board) {
      zoomAnchorRef.current = {
        x: (pane.scrollLeft + pane.clientWidth / 2 - board.offsetLeft) / zoomPercent,
        y: (pane.scrollTop + pane.clientHeight / 2 - board.offsetTop) / zoomPercent,
      };
    }
    setZoomPercent(percent);
  }

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current, pane = previewPaneRef.current, board = artboardElement();
    if (!anchor || !board) return;
    zoomAnchorRef.current = null;
    pane.scrollLeft = anchor.x * zoomPercent + board.offsetLeft - pane.clientWidth / 2;
    pane.scrollTop = anchor.y * zoomPercent + board.offsetTop - pane.clientHeight / 2;
  }, [zoomPercent]);
  const [fontOptions, setFontOptions] = useState(DEFAULT_FONT_OPTIONS);
  // The user's saved text styles: kept in this browser between visits and
  // inside each saved project, so they follow the project to another PC.
  const [textStyles, setTextStyles] = useState(readStoredTextStyles);
  useEffect(() => {
    try { localStorage.setItem(TEXT_STYLES_STORAGE_KEY, JSON.stringify(textStyles)); } catch (err) { /* storage blocked: styles last for this visit */ }
  }, [textStyles]);
  function handleSaveTextStyle(name, ann) {
    setTextStyles((prev) => [...prev.filter((s) => s.name !== name), { name, props: captureTextStyle(ann) }]);
  }
  function handleDeleteTextStyle(name) {
    setTextStyles((prev) => prev.filter((s) => s.name !== name));
  }
  const [penColor, setPenColor] = useState(PEN_DEFAULTS.color);
  const [penWidth, setPenWidth] = useState(PEN_DEFAULTS.width);
  const [penTaper, setPenTaper] = useState(0);
  // Eraser: "soft" fades image pixels (the default); "stroke" removes whole pen strokes.
  const [eraserMode, setEraserMode] = useState("soft");
  const [softEraser, setSoftEraser] = useState(SOFT_ERASER_DEFAULTS);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_DEFAULTS.color);
  const [highlighterWidth, setHighlighterWidth] = useState(HIGHLIGHTER_DEFAULTS.width);
  const [highlighterTaper, setHighlighterTaper] = useState(0);
  // Text tool defaults — applied to each NEW text box; editing an
  // existing one only changes that one annotation, same relationship
  // pen/highlighter defaults already have to their own strokes.
  const [textFontFamily, setTextFontFamily] = useState(DEFAULT_FONT_OPTIONS[0]);
  const [textFontSize, setTextFontSize] = useState(16);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textColor, setTextColor] = useState("#1a1a1a");
  const [textAlign, setTextAlign] = useState("left");
  const [rectDefaults, setRectDefaults] = useState(() => controlValues({}, RECT_CONTROLS));
  const [layersOpen, setLayersOpen] = useState(true);
  const [layersPosition, setLayersPosition] = useState(null);

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
    setTool("select");
    if (edited && !edited.text.trim()) {
      updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => a.id !== edited.id), "ann:" + edited.id);
      setSelectedAnnId((id) => (id === edited.id ? null : id));
    }
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

  // Group: the selected items become one group, stacked together at the
  // top-most member's place (their own order kept). Ungroup releases the
  // groups the selection touches. Both are one undo step.
  function selectedAnnotationIds() {
    return [selectedAnnId, ...selectedAnnIds].filter((id) => id !== null);
  }

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

  // Narrower than selectTool: switches the toolbar/panel to Text
  // without clearing the current selection — used when clicking an
  // existing text box to edit it, where that box should stay selected.
  // Map of docId -> { doc, bytes } — a page can come from any one of
  // several loaded source PDFs (the original load, plus anything
  // brought in via Insert PDF), not just a single document.
  const pdfDocsRef = useRef({});
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const insertPdfInputRef = useRef(null);
  const projectInputRef = useRef(null);
  // The .znow file this project was last saved to or opened from, so
  // Save can write straight back to it (Save As picks a new one). Only
  // browsers with the File System Access API give us a handle; elsewhere
  // this stays null and Save always downloads a copy.
  const [projectFile, setProjectFile] = useState(null); // { handle, name } | null
  // The topbar title box (see titleStamp). Set whenever a document is
  // started fresh or a project is opened; edited freely after that.
  const [docTitle, setDocTitle] = useState("");
  // Briefly true after a save lands, so the Project menu button can say
  // "Saved" — a quick Save (or Ctrl+S) opens no dialog to show it worked.
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef(null);
  function flashSaved() {
    setJustSaved(true);
    clearTimeout(justSavedTimerRef.current);
    justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 1800);
  }
  const nextKeyRef = useRef(1);
  const nextAnnIdRef = useRef(1);
  const nextDocIdRef = useRef(1);
  const pageSizeRef = useRef(null); // captured from the first loaded PDF page; used as the default size for new blank pages

  const pageFilter = useMemo(() => (selectedPage && selectedPage.filter) || DEFAULT_PAGE_FILTER, [selectedPage]);
  // Feeds the hidden SVG duotone filter (see the JSX below) — kept as
  // plain values, not memoized, since hexToRgb is a cheap regex match.
  const duotoneDarkRgb = hexToRgb(pageFilter.darkColor || DEFAULT_DUOTONE_DARK);
  const duotoneLightRgb = hexToRgb(pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT);

  // Builds the onion-skin ghost from the previous page's full composite
  // (background + its own annotations, via the same renderPageToCanvas
  // export uses) at MAIN_SCALE, using that previous page's OWN filter
  // (each page carries its own now). Deliberately NOT re-run on every
  // `pages` change — that would refire on every drag mousemove anywhere
  // in the document — only when the toggle or selected page changes, so
  // editing (or re-filtering) the previous page won't refresh its ghost
  // until you navigate away and back to the current one.
  useEffect(() => {
    if (!onionSkinOn || selectedIdx === null || selectedIdx === 0) { setOnionGhostSrc(null); return; }
    const prevPage = pages[selectedIdx - 1];
    if (!prevPage) { setOnionGhostSrc(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const canvas = await renderPageToCanvas(prevPage, pdfDocsRef, MAIN_SCALE, prevPage.filter || DEFAULT_PAGE_FILTER);
        if (!cancelled) setOnionGhostSrc(canvas.toDataURL());
      } catch (err) {
        if (!cancelled) setOnionGhostSrc(null);
      }
    })();
    return () => { cancelled = true; };
  }, [onionSkinOn, selectedIdx]);

  async function renderThumb(doc, pageNumber, rotation) {
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: THUMB_SCALE, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL();
  }

  async function handleFile(file) {
    setErrorMsg(null);
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      // A separate copy goes to pdf.js — it may take ownership of the
      // buffer it's given, and `buf` itself needs to stay intact so
      // Save Project can re-embed these exact original bytes later.
      const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      const docId = "doc" + nextDocIdRef.current++;
      pdfDocsRef.current = { [docId]: { doc, bytes: buf } }; // fresh start — drop any previously loaded docs

      const newPages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const dataUrl = await renderThumb(doc, i, 0);
        newPages.push({ key: nextKeyRef.current++, docId, pageNumber: i, rotation: 0, dataUrl, isBlank: false, annotations: [] });
      }
      if (!pageSizeRef.current) {
        const p1 = await doc.getPage(1);
        const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
        pageSizeRef.current = { width: vp1.width, height: vp1.height };
      }
      setPages(newPages);
      setSelectedIdx(newPages.length > 0 ? 0 : null);
      setSelectedPageIndices([]);
      setUndoStack([]); // loading a document is a fresh start, not an undoable step
      setRedoStack([]);
      setProjectFile(null); // a new document — Save must not overwrite the previous project's file
      setDocTitle(stripExtension(file.name) + " - " + titleStamp());
    } catch (err) {
      setErrorMsg("Couldn't load that PDF — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  function handleLoadClick() {
    fileInputRef.current && fileInputRef.current.click();
  }

  // Starts a fresh document of blank pages at the chosen size, replacing
  // whatever was open (the caller has already confirmed that where it
  // matters). Orientation is baked into width/height rather than a
  // rotation, so page 1 isn't "rotated" from the user's point of view.
  function handleCreateBlankDocument({ width, height, pageCount }) {
    setNewDocOpen(false);
    setErrorMsg(null);
    pdfDocsRef.current = {};
    pageSizeRef.current = { width, height }; // new blank pages added later match this
    const thumb = makeBlankThumb(width, height, 0);
    const newPages = Array.from({ length: pageCount }, () => ({
      key: nextKeyRef.current++,
      isBlank: true,
      rotation: 0,
      width,
      height,
      dataUrl: thumb,
      annotations: [],
    }));
    setPages(newPages);
    setSelectedIdx(0);
    setSelectedPageIndices([]);
    setSelectedAnnId(null);
    setSelectedAnnIds([]);
    setUndoStack([]);
    setRedoStack([]);
    setProjectFile(null); // a new document — Save must not overwrite the previous project's file
    setDocTitle("New Zine - " + titleStamp());
  }

  function handleNewDocumentOpenPdf() {
    setNewDocOpen(false);
    handleLoadClick();
  }

  function handleFileInputChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) handleFile(file);
  }

  function handleInsertPdfClick() {
    insertPdfInputRef.current && insertPdfInputRef.current.click();
  }

  // Picking a file doesn't insert it yet — it opens the "Insert after
  // page" dialog first (see InsertPdfDialog), defaulting to right
  // after whichever page is currently selected.
  function handleInsertPdfInputChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setInsertAfterPage(selectedIdx !== null ? selectedIdx + 1 : pages.length);
    setPendingInsertFile(file);
  }

  async function handleConfirmInsertPdf() {
    const file = pendingInsertFile;
    const atIndex = Math.max(0, Math.min(pages.length, insertAfterPage));
    setPendingInsertFile(null);
    if (!file) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      const docId = "doc" + nextDocIdRef.current++;
      pdfDocsRef.current[docId] = { doc, bytes: buf }; // additive — existing docs stay loaded

      const newPages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const dataUrl = await renderThumb(doc, i, 0);
        newPages.push({ key: nextKeyRef.current++, docId, pageNumber: i, rotation: 0, dataUrl, isBlank: false, annotations: [] });
      }
      if (!pageSizeRef.current) {
        const p1 = await doc.getPage(1);
        const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
        pageSizeRef.current = { width: vp1.width, height: vp1.height };
      }
      recordUndoCheckpoint();
      setPages((prev) => {
        const next = prev.slice();
        next.splice(atIndex, 0, ...newPages);
        return next;
      });
      setSelectedIdx(atIndex);
      setSelectedPageIndices([]);
    } catch (err) {
      setErrorMsg("Couldn't insert that PDF — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // Shared by "Export PDF" and "Send to ZineArranger" — both need the
  // exact same rendered bytes, just handed off differently afterward.
  async function buildExportPdfBytes() {
    const outDoc = await PDFLib.PDFDocument.create();
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const canvas = await renderPageToCanvas(page, pdfDocsRef, EXPORT_SCALE, page.filter || DEFAULT_PAGE_FILTER, pageNumberSpec(pageNumbers, pageIdx, pages.length));
      const pngBytes = await canvasToArrayBuffer(canvas);
      const pngImage = await outDoc.embedPng(pngBytes);
      const pageWidthPts = canvas.width / EXPORT_SCALE;
      const pageHeightPts = canvas.height / EXPORT_SCALE;
      const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
      outPage.drawImage(pngImage, { x: 0, y: 0, width: pageWidthPts, height: pageHeightPts });
    }
    return outDoc.save();
  }

  async function handleExportPdf() {
    if (pages.length === 0 || exporting) return;
    setErrorMsg(null);
    setExporting(true);
    try {
      const pdfBytes = await buildExportPdfBytes();
      await savePdfBytes(pdfBytes, titleToFileName(docTitle, ".pdf"));
    } catch (err) {
      setErrorMsg("Couldn't export PDF — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setExporting(false);
    }
  }

  // Saves everything needed to reopen and keep editing: every loaded
  // source PDF's original bytes (base64, so the file is fully
  // self-contained — no need to also keep track of and re-attach the
  // original PDF(s) by hand), every page's annotations and own filter,
  // and the document-wide Guides/Onion Skin settings. Thumbnails are
  // regenerated on load instead of saved, same reasoning as the undo
  // snapshots — they're the one part that's both heavy and fully
  // derivable from everything else here.
  // `saveAs` always asks where to save; otherwise it overwrites the
  // file from the last save/open, asking only the first time.
  async function handleSaveProject({ saveAs = false } = {}) {
    if (pages.length === 0 || savingProject) return;
    setErrorMsg(null);
    setSavingProject(true);
    try {
      const docs = {};
      for (const docId of Object.keys(pdfDocsRef.current)) {
        docs[docId] = arrayBufferToBase64(pdfDocsRef.current[docId].bytes);
      }
      // Only the uploaded fonts some text actually uses are stored.
      const usedFamilies = new Set();
      pages.forEach((p) => (p.annotations || []).forEach((a) => { if (a.type === "text" && a.fontFamily) usedFamilies.add(a.fontFamily); }));
      const fonts = customFontStore.filter((f) => usedFamilies.has(f.family));
      const project = {
        version: 2, // 2: the annotation list is the stacking order
        title: docTitle,
        docs,
        fonts,
        textStyles,
        pages: pages.map(({ dataUrl, ...rest }) => rest),
        settings: {
          guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn,
          onionSkinOn, onionSkinOpacity, pageNumbers,
        },
      };
      // Plain JSON under the hood — .znow is just a distinct extension
      // so a saved project doesn't get mistaken for a generic .json
      // file (or opened by something else that happens to claim it).
      const json = JSON.stringify(project);
      if (!saveAs && projectFile) {
        try {
          await writeFileHandle(projectFile.handle, json);
          flashSaved();
          return;
        } catch (err) {
          // The file was moved/deleted or editing it was refused — fall
          // back to asking where to save, rather than losing the save.
        }
      }
      // The dialog suggests the title box's name (a quick Save above keeps
      // writing to whatever file was picked, even if the title changed since).
      const handle = await saveFile(json, titleToFileName(docTitle, ".znow"), "application/json", "ZEditor project file", [".znow"]);
      if (handle !== "cancelled") flashSaved();
      if (handle && handle !== "cancelled") setProjectFile({ handle, name: handle.name });
    } catch (err) {
      setErrorMsg("Couldn't save the project — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setSavingProject(false);
    }
  }

  // Prefers the File System Access picker so the opened file's handle can
  // be kept, letting Save write back to it. Falls back to the hidden file
  // input (no handle) where that API isn't available.
  async function openProjectPicker() {
    if (typeof window.showOpenFilePicker === "function") {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "ZEditor project file", accept: { "application/json": [".znow"] } }],
        });
        handleLoadProjectFile(await handle.getFile(), handle);
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // dialog closed
      }
    }
    projectInputRef.current && projectInputRef.current.click();
  }

  // "New Project" only ever appears once a project is already loaded
  // (Load PDF covers the empty-state case), so it always needs the
  // warning. "Load Project" appears at all times, but only needs it
  // once there's actually something on screen to lose.
  function handleNewProjectClick() {
    setConfirmAction("newProject");
    setConfirmStep(1);
  }

  function handleLoadProjectClick() {
    if (pages.length > 0) {
      setConfirmAction("loadProject");
      setConfirmStep(1);
    } else {
      openProjectPicker();
    }
  }

  function handleConfirmProceed() {
    setConfirmStep(2);
  }

  function handleConfirmCancel() {
    setConfirmAction(null);
    setConfirmStep(1);
  }

  function handleConfirmYes() {
    const action = confirmAction;
    setConfirmAction(null);
    setConfirmStep(1);
    if (action === "newProject") { setNewDocFromProject(true); setNewDocOpen(true); }
    else if (action === "loadProject") openProjectPicker();
  }

  function handleProjectInputChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) handleLoadProjectFile(file);
  }

  async function handleLoadProjectFile(file, handle = null) {
    setErrorMsg(null);
    setLoading(true);
    try {
      const text = await file.text();
      const project = JSON.parse(text);
      if (!project || !Array.isArray(project.pages)) throw new Error("That doesn't look like a ZEditor project file.");

      const newDocsMap = {};
      for (const docId of Object.keys(project.docs || {})) {
        const bytes = base64ToArrayBuffer(project.docs[docId]);
        const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
        newDocsMap[docId] = { doc, bytes };
      }
      pdfDocsRef.current = newDocsMap;

      // Fonts the project carried: registered before anything is drawn,
      // so the text lays out in them rather than in a fallback.
      const loadedFamilies = [];
      for (const font of project.fonts || []) {
        if (customFontStore.some((f) => f.family === font.family && f.data === font.data)) { loadedFamilies.push(font.family); continue; }
        try {
          await registerCustomFont(font.family, base64ToArrayBuffer(font.data));
          customFontStore.push({ family: font.family, data: font.data });
          loadedFamilies.push(font.family);
        } catch (err) { /* a damaged font falls back to the default; the text is still there */ }
      }
      // Styles the project carried join the ones already here (same name: the project's wins).
      if (Array.isArray(project.textStyles) && project.textStyles.length) {
        const incoming = project.textStyles.filter((s) => s && s.name && s.props);
        setTextStyles((prev) => [...prev.filter((s) => !incoming.some((i) => i.name === s.name)), ...incoming]);
      }
      if (loadedFamilies.length) setFontOptions((prev) => Array.from(new Set([...prev, ...loadedFamilies])).sort((a, b) => a.localeCompare(b)));

      const newPages = await Promise.all(project.pages.map(async (p) => {
        const dataUrl = p.isBlank
          ? makeBlankThumb(p.width, p.height, p.rotation)
          : await renderThumb(newDocsMap[p.docId].doc, p.pageNumber, p.rotation);
        const annotations = project.version >= 2 ? p.annotations : legacyLayerOrder(p.annotations || []);
        return { ...p, annotations, key: nextKeyRef.current++, dataUrl };
      }));

      // Keep the id counters past anything restored, so new pages,
      // annotations, or an Insert PDF afterward never collide with ids
      // that came from this project file.
      let maxDocNum = 0;
      Object.keys(newDocsMap).forEach((id) => {
        const m = /^doc(\d+)$/.exec(id);
        if (m) maxDocNum = Math.max(maxDocNum, Number(m[1]));
      });
      nextDocIdRef.current = maxDocNum + 1;
      let maxAnnId = 0;
      newPages.forEach((p) => (p.annotations || []).forEach((a) => { maxAnnId = Math.max(maxAnnId, a.id || 0); }));
      nextAnnIdRef.current = maxAnnId + 1;

      if (!pageSizeRef.current) {
        const firstReal = newPages.find((p) => !p.isBlank);
        if (firstReal) {
          const p1 = await newDocsMap[firstReal.docId].doc.getPage(firstReal.pageNumber);
          const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
          pageSizeRef.current = { width: vp1.width, height: vp1.height };
        } else if (newPages.length > 0) {
          pageSizeRef.current = { width: newPages[0].width, height: newPages[0].height };
        }
      }

      setPages(newPages);
      setSelectedIdx(newPages.length > 0 ? 0 : null);
      setSelectedPageIndices([]);
      setUndoStack([]);
      setRedoStack([]);
      setProjectFile(handle ? { handle, name: handle.name } : null);
      // Projects saved before titles existed take their file's name.
      setDocTitle(typeof project.title === "string" && project.title ? project.title : stripExtension(file.name));

      const s = project.settings || {};
      if (s.guidesOn !== undefined) setGuidesOn(s.guidesOn);
      if (s.centerGuideOn !== undefined) setCenterGuideOn(s.centerGuideOn);
      if (s.guideFormat !== undefined) setGuideFormat(s.guideFormat);
      if (s.guideMarginIn !== undefined) setGuideMarginIn(s.guideMarginIn);
      if (s.guideBleedIn !== undefined) setGuideBleedIn(s.guideBleedIn);
      if (s.onionSkinOn !== undefined) setOnionSkinOn(s.onionSkinOn);
      if (s.onionSkinOpacity !== undefined) setOnionSkinOpacity(s.onionSkinOpacity);
      setPageNumbers({ ...DEFAULT_PAGE_NUMBERS, ...(s.pageNumbers || {}) });
    } catch (err) {
      setErrorMsg("Couldn't load that project — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // Skips the manual export-then-reopen round trip: opens ZineArranger
  // in a new tab, waits for it to announce it's ready (its own script
  // posts back once loaded — see its "ZEditor handoff" block), then
  // hands the exported bytes over via postMessage. ZineArranger feeds
  // them into its own file input under the hood, so from there it's
  // exactly as if the user had picked the file themselves.
  async function handleSendToZineArranger() {
    if (pages.length === 0 || exporting || sendingToArranger) return;
    setErrorMsg(null);
    setSendingToArranger(true);
    let win = null;
    try {
      win = window.open("../ZineArranger/index.html", "_blank");
      if (!win) throw new Error("The browser blocked the new tab — allow popups for this page and try again.");

      // Attach the listener BEFORE any other await — ZineArranger starts
      // loading the instant window.open() returns, and can finish and
      // fire its "ready" ping while we're still off rendering pages for
      // export. postMessage doesn't queue for a listener that isn't
      // attached yet, so arriving early would mean losing it for good.
      // (ZineArranger also repeats its ready ping for a few seconds
      // rather than sending it once, as a second line of defense.)
      const readyPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          window.removeEventListener("message", onMessage);
          reject(new Error("ZineArranger didn't respond — it may still be loading, or didn't open as a new tab."));
        }, 15000);
        function onMessage(event) {
          if (event.source !== win || !event.data || event.data.type !== "zinearranger-ready") return;
          clearTimeout(timeoutId);
          window.removeEventListener("message", onMessage);
          resolve();
        }
        window.addEventListener("message", onMessage);
      });

      const pdfBytes = await buildExportPdfBytes();
      const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

      await readyPromise;
      win.postMessage({ type: "zeditor-handoff-pdf", buffer, filename: titleToFileName(docTitle, ".pdf") }, "*", [buffer]);
    } catch (err) {
      setErrorMsg("Couldn't send to ZineArranger — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setSendingToArranger(false);
    }
  }

  async function handleRotate(idx) {
    const updatesByKey = new Map();
    for (const i of pagesActedOn(idx)) {
      const target = pages[i];
      const rotation = (target.rotation + 90) % 360;
      const dataUrl = target.isBlank
        ? makeBlankThumb(target.width, target.height, rotation)
        : await renderThumb(docFor(pdfDocsRef, target), target.pageNumber, rotation);
      updatesByKey.set(target.key, { rotation, dataUrl });
    }
    recordUndoCheckpoint();
    setPages((prev) => prev.map((p) => (updatesByKey.has(p.key) ? { ...p, ...updatesByKey.get(p.key) } : p)));
  }

  function handleInsertBlank(atIndex) {
    const size = pageSizeRef.current || DEFAULT_PAGE_SIZE;
    const newPage = {
      key: nextKeyRef.current++,
      isBlank: true,
      rotation: 0,
      width: size.width,
      height: size.height,
      dataUrl: makeBlankThumb(size.width, size.height, 0),
      annotations: [],
    };
    recordUndoCheckpoint();
    setPages((prev) => {
      const next = prev.slice();
      next.splice(atIndex, 0, newPage);
      return next;
    });
    setSelectedIdx(atIndex);
    setSelectedPageIndices([]);
  }

  function handleDelete(idx) {
    recordUndoCheckpoint();
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next;
    });
    setSelectedIdx((prevSel) => {
      if (prevSel === null) return null;
      if (idx === prevSel) return null;
      if (idx < prevSel) return prevSel - 1;
      return prevSel;
    });
  }

  // Deletes every currently shift-selected page at once, rather than
  // one at a time — unlike a single delete, there's no single obvious
  // "next" page to land on afterward, so this just clears selection.
  function handleDeleteSelectedPages() {
    if (selectedIdx === null) return;
    const idxToDelete = new Set([selectedIdx, ...selectedPageIndices]);
    recordUndoCheckpoint();
    setPages((prev) => prev.filter((_, i) => !idxToDelete.has(i)));
    setSelectedIdx(null);
    setSelectedPageIndices([]);
  }

  // Routes a specific thumbnail's own trash-icon click: deletes just
  // that page normally, unless it's part of an active multi-selection,
  // in which case the whole selection goes together.
  function handleDeleteThumbnail(idx) {
    if (selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx))) {
      handleDeleteSelectedPages();
    } else {
      handleDelete(idx);
    }
  }

  // `insertBefore` is a slot in the current, pre-move page list. Moved
  // pages keep their document order, not the order they were selected.
  function handleReorder(fromIndices, insertBefore) {
    const newOrder = orderAfterMove(pages.length, fromIndices, insertBefore);
    if (!newOrder) return;

    const newIdxOf = new Array(newOrder.length);
    newOrder.forEach((oldIdx, newIdx) => { newIdxOf[oldIdx] = newIdx; });

    recordUndoCheckpoint();
    setPages((prev) => newOrder.map((oldIdx) => prev[oldIdx]));
    setSelectedIdx((prevSel) => (prevSel === null ? null : newIdxOf[prevSel]));
    setSelectedPageIndices((prevSel) => prevSel.map((oldIdx) => newIdxOf[oldIdx]));
  }

  // ---- Undo/redo -------------------------------------------------------
  function stripDataUrls(pagesArr) {
    return pagesArr.map(({ dataUrl, ...rest }) => rest);
  }

  // Call BEFORE a mutating setPages, with the CURRENT (pre-mutation)
  // pages/selectedIdx still in scope, to snapshot what Undo should
  // restore. `coalesceKey` lets repeated calls from the same ongoing
  // gesture (same key, within UNDO_COALESCE_MS of the last one) skip
  // pushing another entry — so a whole drag, slider tug, or burst of
  // keystrokes lands as one undo step instead of one per event. Pass
  // no key for anything that's already a single discrete action
  // (a click, a drop) — it always gets its own step.
  function recordUndoCheckpoint(coalesceKey) {
    const now = Date.now();
    if (coalesceKey && lastCommitRef.current.key === coalesceKey && now - lastCommitRef.current.time < UNDO_COALESCE_MS) {
      lastCommitRef.current.time = now;
      return;
    }
    lastCommitRef.current = { time: now, key: coalesceKey || null };
    setUndoStack((stack) => {
      const next = [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }];
      return next.length > MAX_UNDO_HISTORY ? next.slice(next.length - MAX_UNDO_HISTORY) : next;
    });
    setRedoStack([]);
  }

  // Re-attaches each restored page's thumbnail — reusing the current
  // page with the same key/rotation/size when it's unchanged (the
  // common case for an undo/redo that only touched one page) instead
  // of re-rendering every thumbnail on every step.
  async function restoreSnapshot(snapshot) {
    const currentByKey = new Map(pages.map((p) => [p.key, p]));
    const withThumbs = await Promise.all(snapshot.pages.map(async (p) => {
      const existing = currentByKey.get(p.key);
      const reusable = existing && existing.dataUrl && existing.rotation === p.rotation &&
        existing.isBlank === p.isBlank && existing.pageNumber === p.pageNumber &&
        existing.docId === p.docId && existing.width === p.width && existing.height === p.height;
      if (reusable) return { ...p, dataUrl: existing.dataUrl };
      const dataUrl = p.isBlank ? makeBlankThumb(p.width, p.height, p.rotation) : await renderThumb(docFor(pdfDocsRef, p), p.pageNumber, p.rotation);
      return { ...p, dataUrl };
    }));
    setPages(withThumbs);
    setSelectedIdx(snapshot.selectedIdx);
    setSelectedPageIndices(snapshot.selectedPageIndices);
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
    lastCommitRef.current = { time: 0, key: null }; // next edit shouldn't coalesce with whatever came before the undo
    restoreSnapshot(entry);
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
    lastCommitRef.current = { time: 0, key: null };
    restoreSnapshot(entry);
  }

  // Ctrl+S calls Save through this ref: the keydown effect below only
  // re-subscribes on some state, and a stale handleSaveProject would
  // save stale settings (guides, page numbers, styles…).
  const saveProjectRef = useRef(handleSaveProject);
  saveProjectRef.current = handleSaveProject;

  useEffect(() => {
    function handleKeyDown(e) {
      // Save works even mid-typing in a field; the browser's own "Save
      // page" dialog is always suppressed.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!(pendingInsertFile || confirmAction || shortcutsOpen || newDocOpen)) saveProjectRef.current({ saveAs: e.shiftKey });
        return;
      }
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return; // let native undo/typing run inside text fields
      if (pendingInsertFile || confirmAction || shortcutsOpen || newDocOpen) return; // a modal is up — its own buttons handle input
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        if (key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
        if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); handleRedo(); return; }
        if (key === "r") { e.preventDefault(); if (selectedIdx !== null) handleRotate(selectedIdx); return; }
        if (key === "g") { e.preventDefault(); if (e.shiftKey) handleUngroupSelection(); else handleGroupSelection(); return; }
        if (key === "c") {
          if (selectedIdx !== null && selectedAnnId !== null) {
            const ann = (pages[selectedIdx].annotations || []).find((a) => a.id === selectedAnnId);
            if (ann) { e.preventDefault(); clipboardRef.current = JSON.parse(JSON.stringify(ann)); }
          }
          return;
        }
        if (key === "v") {
          if (clipboardRef.current && selectedIdx !== null) {
            e.preventDefault();
            const clip = clipboardRef.current;
            const id = nextAnnIdRef.current++;
            // Offset the paste from the original so it's visibly a
            // second copy, not sitting invisibly on top of the first —
            // a stroke's whole point list has to shift together, not
            // just some single x/y the way text/image annotations work.
            const newAnn = { ...translatedAnnotation(clip, 20, 20), id, groupId: undefined }; // a copy isn't part of the original's group
            updateAnnotationsFor(selectedIdx, (anns) => [...anns, newAnn]);
            setSelectedAnnId(id);
          }
          return;
        }
        return; // any other Ctrl/Cmd combo — leave the browser's own default alone
      }

      if (key === "delete") {
        e.preventDefault();
        if (selectedAnnId !== null) handleDeleteAnnotation();
        else if (selectedIdx !== null) {
          if (selectedPageIndices.length > 0) handleDeleteSelectedPages();
          else handleDelete(selectedIdx);
        }
        return;
      }
      const nudge = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
      if (nudge && selectedAnnId !== null) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const ids = [selectedAnnId, ...selectedAnnIds];
        handleMoveAnnotations((pages[selectedIdx].annotations || []).filter((a) => ids.includes(a.id)), nudge[0] * step, nudge[1] * step);
        return;
      }
      if (key === "v") { selectTool("select"); return; }
      if (key === "t") { selectTool("text"); return; }
      if (key === "i") { handleImageToolClick(); return; }
      if (key === "r") { selectTool("rect"); return; }
      if (key === "e") { selectTool("ellipse"); return; }
      if (key === "h") { selectTool("highlighter"); return; }
      if (key === "d") { selectTool("pen"); return; } // "Draw" in the UI — see the toolbar button below
      if (key === "arrowup") { e.preventDefault(); setSelectedPageIndices([]); setSelectedIdx((cur) => (cur === null ? cur : Math.max(0, cur - 1))); return; }
      if (key === "arrowdown") { e.preventDefault(); setSelectedPageIndices([]); setSelectedIdx((cur) => (cur === null ? cur : Math.min(pages.length - 1, cur + 1))); return; }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack, pages, selectedIdx, selectedAnnId, selectedAnnIds, selectedPageIndices, pendingInsertFile, confirmAction, shortcutsOpen, newDocOpen]);

  // Ctrl+V with an image on the system clipboard (a screenshot, or an
  // image copied from another app/page) drops it onto the current page
  // as a new image annotation — separate from the keydown handler's
  // Ctrl+V, which only replays an annotation this app itself copied.
  // Native `paste` is the only event that actually exposes clipboard
  // file contents, hence its own listener rather than folding into
  // handleKeyDown above.
  useEffect(() => {
    function handlePaste(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
      if (pendingInsertFile || confirmAction || shortcutsOpen || newDocOpen || selectedIdx === null) return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.type && item.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      addImageAnnotationFromFile(imageItem.getAsFile(), selectedIdx);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [selectedIdx, pendingInsertFile, confirmAction, shortcutsOpen, newDocOpen]);

  // ---- Annotations (Compose mode) ------------------------------------
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

  function handleAddText(x, y, width) {
    if (selectedIdx === null) return;
    const id = nextAnnIdRef.current++;
    // Shares handleUpdateAnnotation's coalesce key for this same id —
    // a brand-new box immediately followed by typing into it (the
    // normal flow, since it opens ready for typing) collapses into
    // one undo step, instead of "empty box" being its own step.
    updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
      id, type: "text", x, y, text: "", width,
      fontFamily: textFontFamily,
      fontSize: textFontSize,
      bold: textBold,
      italic: textItalic,
      underline: textUnderline,
      color: textColor,
      align: textAlign,
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
      ...rectDefaults,
    }]);
    selectTool("select");
    setSelectedAnnId(id);
  }

  // ---- Layers ----------------------------------------------------------
  function handleSelectLayer(id, shiftKey, single) {
    selectTool("select");
    handleSelectAnnotation(id, shiftKey, single);
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

  function handleAddStroke(stroke) {
    if (selectedIdx === null) return;
    const id = nextAnnIdRef.current++;
    updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
      id, type: "stroke", tool: stroke.tool, points: stroke.points,
      color: stroke.color, strokeWidth: stroke.strokeWidth, taper: stroke.taper || 0,
    }]);
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

  function handleToggleCrop(id) {
    setCroppingAnnId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="ze-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">ZE</div>
          <div className="topbar-brand-text">
            <div className="topbar-title">ZEditor</div>
            <div className="topbar-subtitle">Compose zine pages</div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="ze-tool-bar-group">
            <button type="button" className="ze-tool-icon-btn" title="Undo (Ctrl+Z)" disabled={undoStack.length === 0} onClick={handleUndo}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 7L4 12l5 5" />
                <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
              </svg>
            </button>
            <button type="button" className="ze-tool-icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={redoStack.length === 0} onClick={handleRedo}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 7l5 5-5 5" />
                <path d="M20 12H9a5 5 0 0 0 0 10h1" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            className="ze-title-input"
            aria-label="Zine title"
            placeholder="Untitled zine"
            title="Zine title — names the saved project and exported PDF"
            disabled={pages.length === 0}
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); }}
            onBlur={() => setDocTitle((t) => t.trim())}
          />
          <TopMenu label="Page">
            {() => (
              <PageMenuBody
                rows={[
                  {
                    key: "filter",
                    label: "Filter",
                    // Per page, so it needs a page to act on. Turning it off
                    // remembers the filter it was on, and turning it back on
                    // restores that (its settings stay on the page throughout).
                    disabled: !selectedPage,
                    detail: pageFilter.type !== "none"
                      ? (PAGE_FILTER_OPTIONS.find((o) => o.key === pageFilter.type) || PAGE_FILTER_OPTIONS[0]).label
                      : null,
                    checked: pageFilter.type !== "none",
                    onToggle: (on) => updatePageFilter(on
                      ? { type: pageFilter.lastType && pageFilter.lastType !== "none" ? pageFilter.lastType : "grayscale" }
                      : { type: "none", lastType: pageFilter.type }),
                    settings: (
                      <FilterSettings
                        filterType={pageFilter.type}
                        onFilterTypeChange={(type) => updatePageFilter({ type })}
                        duotoneDark={pageFilter.darkColor || DEFAULT_DUOTONE_DARK}
                        duotoneLight={pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT}
                        onDuotoneDarkChange={(darkColor) => updatePageFilter({ darkColor })}
                        onDuotoneLightChange={(lightColor) => updatePageFilter({ lightColor })}
                        filter={pageFilter}
                        onFilterPatch={updatePageFilter}
                      />
                    ),
                  },
                  {
                    key: "onion",
                    label: "Onion Skin",
                    checked: onionSkinOn,
                    onToggle: setOnionSkinOn,
                    settings: <OnionSkinSettings opacity={onionSkinOpacity} onOpacityChange={setOnionSkinOpacity} />,
                  },
                  {
                    key: "pageNumbers",
                    label: "Page Numbers",
                    checked: pageNumbers.on,
                    onToggle: (on) => setPageNumbers((current) => ({ ...current, on })),
                    settings: (
                      <PageNumbersSettings
                        settings={pageNumbers}
                        pageCount={pages.length}
                        onChange={(patch) => setPageNumbers((current) => ({ ...current, ...patch }))}
                      />
                    ),
                  },
                  {
                    key: "guides",
                    label: "Guides",
                    checked: guidesOn,
                    onToggle: setGuidesOn,
                    settings: (
                      <GuidesSettings
                        format={guideFormat}
                        onFormatChange={setGuideFormat}
                        marginIn={guideMarginIn}
                        onMarginChange={setGuideMarginIn}
                        bleedIn={guideBleedIn}
                        onBleedChange={setGuideBleedIn}
                      />
                    ),
                  },
                ]}
              />
            )}
          </TopMenu>
          <TopMenu label={savingProject ? "Saving…" : justSaved ? "Saved ✓" : "Project"}>
            {({ close }) => (
              <React.Fragment>
                <MenuItem
                  close={close}
                  label="New Project"
                  // Only meaningful once something is loaded — it starts over.
                  disabled={pages.length === 0}
                  onClick={handleNewProjectClick}
                  hint="Start over by loading a different PDF — erases the current unsaved project"
                />
                <MenuItem
                  close={close}
                  label="Save"
                  shortcut="Ctrl+S"
                  detail={projectFile ? projectFile.name : null}
                  disabled={pages.length === 0 || savingProject}
                  onClick={() => handleSaveProject()}
                  hint={projectFile
                    ? "Saves over " + projectFile.name
                    : "Saves an editable project file — pages, text, images, and settings — to reopen and keep editing later"}
                />
                <MenuItem
                  close={close}
                  label="Save As…"
                  shortcut="Ctrl+Shift+S"
                  disabled={pages.length === 0 || savingProject}
                  onClick={() => handleSaveProject({ saveAs: true })}
                  hint="Saves this project to a new file, and keeps saving there"
                />
                <MenuItem
                  close={close}
                  label="Load Project"
                  disabled={loading}
                  onClick={handleLoadProjectClick}
                  hint="Reopen a saved ZEditor project file"
                />
              </React.Fragment>
            )}
          </TopMenu>
          <TopMenu label={exporting ? "Exporting…" : sendingToArranger ? "Sending…" : "Export"} solid>
            {({ close }) => (
              <React.Fragment>
                <MenuItem
                  close={close}
                  label="Export PDF"
                  disabled={pages.length === 0 || exporting}
                  onClick={handleExportPdf}
                />
                <MenuItem
                  close={close}
                  label="Send to ZineArranger"
                  disabled={pages.length === 0 || exporting || sendingToArranger}
                  onClick={handleSendToZineArranger}
                  hint="Exports the current zine and opens it directly in ZineArranger — no manual save/reopen step"
                />
              </React.Fragment>
            )}
          </TopMenu>
        </div>
      </header>

      {errorMsg && <div className="ze-error-bar">{errorMsg}</div>}

      <div className="ze-body">
        <Sidebar
          pages={pages}
          selectedIdx={selectedIdx}
          selectedPageIndices={selectedPageIndices}
          onSelect={handleSelectPage}
          onSelectAll={handleSelectAllPages}
          onRotate={handleRotate}
          onDelete={handleDeleteThumbnail}
          onReorder={handleReorder}
          onLoadClick={handleLoadClick}
          onNewDocClick={() => { setNewDocFromProject(false); setNewDocOpen(true); }}
          onInsertPdfClick={handleInsertPdfClick}
          onInsertBlank={handleInsertBlank}
          loading={loading}
        />
        <div className="ze-compose-area">
          {selectedPage && (
            <div className="ze-tool-bar">
              <div className="ze-tool-bar-group">
                <button type="button" className={"ze-tool-icon-btn" + (tool === "select" ? " active" : "")} title="Move (V)" onClick={() => selectTool("select")}>
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 3l6.5 16 2-6.5L19 10.5z" fill="currentColor" /></svg>
                </button>
                <button type="button" className={"ze-tool-icon-btn" + (tool === "text" ? " active" : "")} title="Text (T)" onClick={() => selectTool("text")}>
                  <span className="ze-tool-icon-text">T</span>
                </button>
                <button type="button" className="ze-tool-icon-btn" title="Insert Image (I)" onClick={handleImageToolClick}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
                    <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L5 19" />
                  </svg>
                </button>
                <button type="button" className={"ze-tool-icon-btn" + (tool === "rect" ? " active" : "")} title="Rectangle (R)" onClick={() => selectTool("rect")}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3.5" y="6" width="17" height="12" />
                  </svg>
                </button>
                <button type="button" className={"ze-tool-icon-btn" + (tool === "ellipse" ? " active" : "")} title="Ellipse (E)" onClick={() => selectTool("ellipse")}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <ellipse cx="12" cy="12" rx="8.5" ry="6" />
                  </svg>
                </button>
                <button type="button" className={"ze-tool-icon-btn" + (tool === "pen" ? " active" : "")} title="Draw (D)" onClick={() => selectTool("pen")}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20l1-4L16 5l3 3L8 19z" />
                    <path d="M14 7l3 3" />
                  </svg>
                </button>
                <button type="button" className={"ze-tool-icon-btn" + (tool === "highlighter" ? " active" : "")} title="Highlight (H)" onClick={() => selectTool("highlighter")}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 20l1-3.5 8-8 3.5 3.5-8 8z" />
                    <path d="M14 9l3.5 3.5" />
                    <path d="M3 21h5" />
                  </svg>
                </button>
                <button type="button" className={"ze-tool-icon-btn" + (tool === "eraser" ? " active" : "")} title="Eraser" onClick={() => selectTool("eraser")}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 3l4 4-9.5 9.5H7L3 12z" />
                    <path d="M7 21h13" />
                    <path d="M9.5 5.5l6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={"ze-tool-icon-btn" + (layersOpen ? " active" : "")}
                  aria-pressed={layersOpen}
                  aria-label="Layers panel"
                  title={layersOpen ? "Minimize the Layers panel" : "Show the Layers panel"}
                  onClick={() => setLayersOpen((open) => !open)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l9 5-9 5-9-5z" />
                    <path d="M3 12.5l9 5 9-5" />
                    <path d="M3 17l9 5 9-5" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={"ze-tool-icon-btn" + (centerGuideOn ? " active" : "")}
                  aria-pressed={centerGuideOn}
                  aria-label="Center guide"
                  title={centerGuideOn ? "Hide the center guide" : "Show a guide down the middle of the page (for covers and two-page spreads)"}
                  onClick={() => setCenterGuideOn((on) => !on)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="1" />
                    <path d="M12 3v18" strokeDasharray="2.5 2.5" />
                  </svg>
                </button>
              </div>
              <div className="ze-zoom-control">
                <span className="ze-format-label">Zoom (%)</span>
                <SliderNumberInput min={ZOOM_PERCENT.min} max={ZOOM_PERCENT.max} value={zoomPercent} onChange={handleZoomChange} />
              </div>
              <div className="ze-tool-bar-group">
                <button
                  type="button"
                  className="ze-tool-icon-btn"
                  title="Delete selected (Delete)"
                  disabled={selectedAnnId === null}
                  onClick={handleDeleteAnnotation}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16" />
                    <path d="M9 7V4h6v3" />
                    <path d="M6 7l1 13h10l1-13" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="ze-tool-icon-btn ze-tool-icon-btn--round"
                  title="Keyboard shortcuts"
                  aria-label="Keyboard shortcuts"
                  onClick={() => setShortcutsOpen(true)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 11v7" />
                    <path d="M12 6.5v.01" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="preview-pane" ref={previewPaneRef}>
            <div className="preview-canvas-wrapper">
              <ComposeCanvas
                zoom={zoomPercent / 100}
                pdfDocsRef={pdfDocsRef}
                page={selectedPage}
                guidesOn={guidesOn}
                centerGuideOn={centerGuideOn}
                guideFormat={guideFormat}
                guideMarginIn={guideMarginIn}
                guideBleedIn={guideBleedIn}
                pageFilter={pageFilter}
                onionGhostSrc={onionSkinOn ? onionGhostSrc : null}
                onionSkinOpacity={onionSkinOpacity}
                pageNumberSpec={pageNumberSpec(pageNumbers, selectedIdx, pages.length)}
                tool={tool}
                penColor={penColor}
                penWidth={penWidth}
                penTaper={penTaper}
                highlighterColor={highlighterColor}
                highlighterWidth={highlighterWidth}
                highlighterTaper={highlighterTaper}
                annotations={selectedPage ? (selectedPage.annotations || []) : []}
                selectedAnnId={selectedAnnId}
                selectedAnnIds={selectedAnnIds}
                editingAnnId={editingAnnId}
                onStartTextEdit={setEditingAnnId}
                onFinishTextEdit={finishTextEdit}
                onSelectAnnotations={handleSelectAnnotations}
                onMoveAnnotations={handleMoveAnnotations}
                onRotateAnnotations={handleRotateAnnotations}
                croppingAnnId={croppingAnnId}
                onSelectAnnotation={handleSelectAnnotation}
                onAddText={handleAddText}
                onAddRect={handleAddRect}
                onAddStroke={handleAddStroke}
                onUpdateAnnotation={handleUpdateAnnotation}
                onEraseStroke={handleEraseStroke}
                onToggleCrop={handleToggleCrop}
                eraserMode={eraserMode}
                softEraser={softEraser}
                onEraseImagePixels={handleEraseImagePixels}
              />
            </div>
          </div>
        </div>
        {selectedPage && (
          <FormatPanel
            key={selectedAnnId} // so a half-typed field never carries over to the next item
            tool={tool}
            rectDefaults={rectDefaults}
            onChangeRectDefaults={(patch) => setRectDefaults((d) => ({ ...d, ...patch }))}
            selectedAnn={(selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null}
            onUpdate={handleUpdateAnnotation}
            onFlattenImage={handleFlattenImage}
            onRasterizeRect={handleRasterizeRect}
            onRasterizeText={handleRasterizeText}
            textStyles={textStyles}
            onSaveTextStyle={handleSaveTextStyle}
            onDeleteTextStyle={handleDeleteTextStyle}
            fontOptions={fontOptions}
            setFontOptions={setFontOptions}
            croppingAnnId={croppingAnnId}
            onToggleCrop={handleToggleCrop}
            textFontFamily={textFontFamily}
            textFontSize={textFontSize}
            textBold={textBold}
            textItalic={textItalic}
            textUnderline={textUnderline}
            textColor={textColor}
            textAlign={textAlign}
            onChangeTextFontFamily={setTextFontFamily}
            onChangeTextFontSize={setTextFontSize}
            onChangeTextBold={setTextBold}
            onChangeTextItalic={setTextItalic}
            onChangeTextUnderline={setTextUnderline}
            onChangeTextColor={setTextColor}
            onChangeTextAlign={setTextAlign}
            penColor={penColor}
            penWidth={penWidth}
            penTaper={penTaper}
            onChangePenColor={setPenColor}
            onChangePenWidth={setPenWidth}
            onChangePenTaper={setPenTaper}
            highlighterColor={highlighterColor}
            highlighterWidth={highlighterWidth}
            highlighterTaper={highlighterTaper}
            onChangeHighlighterColor={setHighlighterColor}
            onChangeHighlighterWidth={setHighlighterWidth}
            onChangeHighlighterTaper={setHighlighterTaper}
            eraserMode={eraserMode}
            onChangeEraserMode={setEraserMode}
            softEraser={softEraser}
            onChangeSoftEraser={(patch) => setSoftEraser((cur) => ({ ...cur, ...patch }))}
          />
        )}
      </div>

      {selectedPage && layersOpen && (
        <LayersPanel
          position={layersPosition}
          onMove={setLayersPosition}
          onMinimize={() => setLayersOpen(false)}
          annotations={selectedPage.annotations || []}
          selectedIds={[selectedAnnId, ...selectedAnnIds].filter((id) => id !== null)}
          onSelect={handleSelectLayer}
          onGroup={handleGroupSelection}
          onUngroup={handleUngroupSelection}
          onToggleFlag={handleToggleLayerFlag}
          onRename={(id, name) => handleUpdateAnnotation(id, { name })}
          onReorder={handleReorderLayers}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageFileChosen}
      />
      <input
        ref={insertPdfInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={handleInsertPdfInputChange}
      />
      <input
        ref={projectInputRef}
        type="file"
        accept=".znow"
        style={{ display: "none" }}
        onChange={handleProjectInputChange}
      />

      <InsertPdfDialog
        file={pendingInsertFile}
        pageCount={pages.length}
        afterPage={insertAfterPage}
        onChangeAfterPage={setInsertAfterPage}
        onConfirm={handleConfirmInsertPdf}
        onCancel={() => setPendingInsertFile(null)}
      />

      <NewDocumentDialog
        open={newDocOpen}
        onCreate={handleCreateBlankDocument}
        onOpenPdf={newDocFromProject ? handleNewDocumentOpenPdf : undefined}
        onCancel={() => setNewDocOpen(false)}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ConfirmDialog
        step={confirmAction ? confirmStep : 0}
        onProceed={handleConfirmProceed}
        onYes={handleConfirmYes}
        onCancel={handleConfirmCancel}
      />

      {/* Grayscale/duotone SVG filters for live image previews — see
          AnnotationImage. color-interpolation-filters="sRGB" keeps the
          math in the same byte space applyColorRemap uses on canvas
          (browsers default filter primitives to linearRGB, which would
          throw preview and Export PDF out of sync). */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="ze-filter-grayscale" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={LUMINANCE_MATRIX_VALUES} />
          </filter>
          <filter id="ze-filter-duotone" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={LUMINANCE_MATRIX_VALUES} />
            <feComponentTransfer>
              <feFuncR type="linear" slope={(duotoneLightRgb.r - duotoneDarkRgb.r) / 255} intercept={duotoneDarkRgb.r / 255} />
              <feFuncG type="linear" slope={(duotoneLightRgb.g - duotoneDarkRgb.g) / 255} intercept={duotoneDarkRgb.g / 255} />
              <feFuncB type="linear" slope={(duotoneLightRgb.b - duotoneDarkRgb.b) / 255} intercept={duotoneDarkRgb.b / 255} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
    </div>
  );
}
