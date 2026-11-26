// Document-wide view settings: rulers and ruler guides, guides, center guide, page numbers, onion skin, and the Layers panel.

import { DEFAULT_GUIDE_COLOR, GUIDE_COLORS, normalizeGuides } from "../model/guideSet.js";
import { DEFAULT_GUIDE_BLEED_IN, DEFAULT_GUIDE_MARGIN_IN } from "../model/guides.js";
import { DEFAULT_LAYOUT_SETTINGS, normalizeLayoutSettings } from "../model/pageLayouts.js";
import { DEFAULT_PAGE_NUMBERS } from "../model/pageNumbers.js";
import { DEFAULT_RULER_UNIT } from "../model/rulers.js";

const { useState } = React;

export function useViewSettings() {
  const [guidesOn, setGuidesOn] = useState(false);
  const [centerGuideOn, setCenterGuideOn] = useState(false);
  const [guideFormat, setGuideFormat] = useState("match");
  const [guideMarginIn, setGuideMarginIn] = useState(DEFAULT_GUIDE_MARGIN_IN);
  const [guideBleedIn, setGuideBleedIn] = useState(DEFAULT_GUIDE_BLEED_IN);
  const [pageNumbers, setPageNumbers] = useState(DEFAULT_PAGE_NUMBERS);
  const [onionSkinOn, setOnionSkinOn] = useState(false);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.3);
  const [layersOpen, setLayersOpen] = useState(true);
  // Rulers along the canvas, and the guides dragged out of them (model/rulers.js).
  const [rulersOn, setRulersOn] = useState(true);
  const [rulerUnit, setRulerUnit] = useState(DEFAULT_RULER_UNIT);
  const [rulerGuides, setRulerGuides] = useState([]); // the global guides (every page); page guides live on their page
  const [guideColor, setGuideColor] = useState(DEFAULT_GUIDE_COLOR); // the colour of the next guide drawn (the last one chosen)
  const [snapToGuidesOn, setSnapToGuidesOn] = useState(true);
  const [guidesLocked, setGuidesLocked] = useState(false); // frozen: guides can't be dragged, removed or added
  // Page > Layout: the sizes every ready-made layout uses (model/pageLayouts.js), for this file only; saved with the project.
  const [layoutSettings, setLayoutSettings] = useState(DEFAULT_LAYOUT_SETTINGS);
  // Export PDF with the bleed (on) or trimmed to the cut size (off), and crop marks (only with bleed). Saved with the project.
  const [exportBleed, setExportBleed] = useState(true);
  const [exportCropMarks, setExportCropMarks] = useState(false);
  const [svgOutlineText, setSvgOutlineText] = useState(true); // SVG export: letters as outlines (no fonts needed to open it in Illustrator)
  const [layersPosition, setLayersPosition] = useState(null);
  const [layersSize, setLayersSize] = useState(null); // { width, height } once its edges are dragged
  // Project > Embed Fonts…: save the system fonts the text uses inside the file (ON by default: a project saved before this existed gets them on its next save,
  // unless the box is unticked), and the face keys left out of that. Saved with the project.
  const [embedFonts, setEmbedFonts] = useState(true);
  const [embedFontsSkip, setEmbedFontsSkip] = useState([]);
  // Data merge (Data button): the spreadsheet file kept inside the project ({ name, text } or null), the order of its rows ("file", "id-asc", "id-desc"),
  // whether the page shows the chosen row's values, and whether the Data panel is open. Saved with the project (except the panel being open).
  const [dataSource, setDataSource] = useState(null);
  const [dataOrder, setDataOrder] = useState("file");
  const [dataPreviewOn, setDataPreviewOn] = useState(true);
  const [dataPanelOpen, setDataPanelOpen] = useState(false);
  // Advanced data merge (data blocks, Group by): off until switched on; the choice is remembered in this browser, not in the project.
  const [dataAdvanced, setDataAdvancedState] = useState(() => { try { return localStorage.getItem("zeditor.dataAdvanced") === "1"; } catch { return false; } });
  const setDataAdvanced = (on) => { setDataAdvancedState(on); try { localStorage.setItem("zeditor.dataAdvanced", on ? "1" : "0"); } catch { /* not remembered */ } };
  const [dataPhotos, setDataPhotos] = useState([]); // the photo folder for picture fields: [{ name, src, width, height }]; saved with the project
  const [dataGroupBy, setDataGroupBy] = useState(""); // the column the records are grouped by ("" = none); saved with the project
  const [dataRepeatOthers, setDataRepeatOthers] = useState(true); // non-data items repeat on every page of a group; saved with the project
  // Minimized (– button): the panel folds to a small bar at the bottom right; closed (× button) hides it. Neither is saved with the project.
  const [dataMinimized, setDataMinimized] = useState(false);
  const [layersMinimized, setLayersMinimized] = useState(false);

  // The part of these settings a saved project carries.
  function settingsForSave() {
    return {
      guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn,
      onionSkinOn, onionSkinOpacity, pageNumbers,
      rulersOn, rulerUnit, rulerGuides, guideColor, snapToGuidesOn, guidesLocked,
      embedFonts, embedFontsSkip, layoutSettings, exportBleed, exportCropMarks, svgOutlineText, dataSource, dataOrder, dataPreviewOn, dataGroupBy, dataRepeatOthers, dataPhotos,
    };
  }

  // Restores settings from an opened project; ones it doesn't mention stay as they are.
  function applySavedSettings(s) {
    if (s.guidesOn !== undefined) setGuidesOn(s.guidesOn);
    if (s.centerGuideOn !== undefined) setCenterGuideOn(s.centerGuideOn);
    if (s.guideFormat !== undefined) setGuideFormat(s.guideFormat);
    if (s.guideMarginIn !== undefined) setGuideMarginIn(s.guideMarginIn);
    if (s.guideBleedIn !== undefined) setGuideBleedIn(s.guideBleedIn);
    if (s.onionSkinOn !== undefined) setOnionSkinOn(s.onionSkinOn);
    if (s.onionSkinOpacity !== undefined) setOnionSkinOpacity(s.onionSkinOpacity);
    setPageNumbers({ ...DEFAULT_PAGE_NUMBERS, ...(s.pageNumbers || {}) });
    if (s.rulersOn !== undefined) setRulersOn(s.rulersOn);
    if (s.rulerUnit !== undefined) setRulerUnit(s.rulerUnit);
    if (s.snapToGuidesOn !== undefined) setSnapToGuidesOn(s.snapToGuidesOn);
    setGuidesLocked(s.guidesLocked === true);
    setExportBleed(s.exportBleed !== false);
    setExportCropMarks(s.exportCropMarks === true);
    setSvgOutlineText(s.svgOutlineText !== false);
    setLayoutSettings(normalizeLayoutSettings(s.layoutSettings)); // older files: the app's defaults
    setEmbedFonts(s.embedFonts !== false); // a project that says nothing (older files) gets the default: on
    setEmbedFontsSkip(Array.isArray(s.embedFontsSkip) ? s.embedFontsSkip.filter((k) => typeof k === "string") : []);
    setDataSource(s.dataSource && typeof s.dataSource.text === "string" ? { name: String(s.dataSource.name || "data.csv"), text: s.dataSource.text } : null);
    setDataOrder(["file", "id-asc", "id-desc"].includes(s.dataOrder) ? s.dataOrder : "file");
    setDataPreviewOn(s.dataPreviewOn !== false);
    setDataGroupBy(typeof s.dataGroupBy === "string" ? s.dataGroupBy : "");
    setDataRepeatOthers(s.dataRepeatOthers !== false);
    setDataPhotos(Array.isArray(s.dataPhotos) ? s.dataPhotos.filter((p) => p && typeof p.name === "string" && typeof p.src === "string" && p.width > 0 && p.height > 0) : []);
    setRulerGuides(normalizeGuides(s.rulerGuides)); // older files: guides without a colour get the default
    setGuideColor(GUIDE_COLORS.some((c) => c.key === s.guideColor) ? s.guideColor : DEFAULT_GUIDE_COLOR);
  }

  return {
    guidesOn, setGuidesOn, centerGuideOn, setCenterGuideOn, guideFormat, setGuideFormat,
    guideMarginIn, setGuideMarginIn, guideBleedIn, setGuideBleedIn, exportBleed, setExportBleed, exportCropMarks, setExportCropMarks, svgOutlineText, setSvgOutlineText,
    pageNumbers, setPageNumbers, onionSkinOn, setOnionSkinOn, onionSkinOpacity, setOnionSkinOpacity,
    layersOpen, setLayersOpen, layersPosition, setLayersPosition, layersSize, setLayersSize,
    rulersOn, setRulersOn, rulerUnit, setRulerUnit, rulerGuides, setRulerGuides, guideColor, setGuideColor, snapToGuidesOn, setSnapToGuidesOn, guidesLocked, setGuidesLocked,
    embedFonts, setEmbedFonts, embedFontsSkip, setEmbedFontsSkip, layoutSettings, setLayoutSettings,
    dataSource, setDataSource, dataOrder, setDataOrder, dataPreviewOn, setDataPreviewOn, dataPanelOpen, setDataPanelOpen, dataAdvanced, setDataAdvanced, dataGroupBy, setDataGroupBy, dataRepeatOthers, setDataRepeatOthers, dataPhotos, setDataPhotos, dataMinimized, setDataMinimized, layersMinimized, setLayersMinimized,
    settingsForSave, applySavedSettings,
  };
}
