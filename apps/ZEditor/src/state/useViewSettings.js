// Document-wide view settings: rulers and ruler guides, guides, center guide, page numbers, onion skin, and the Layers panel.

import { DEFAULT_GUIDE_BLEED_IN, DEFAULT_GUIDE_MARGIN_IN } from "../model/guides.js";
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
  const [rulerGuides, setRulerGuides] = useState([]);
  const [snapToGuidesOn, setSnapToGuidesOn] = useState(true);
  const [layersPosition, setLayersPosition] = useState(null);
  const [layersSize, setLayersSize] = useState(null); // { width, height } once its edges are dragged
  // Project > Embed Fonts…: save the system fonts the text uses inside the file (ON by default: a project saved before this existed gets them on its next save,
  // unless the box is unticked), and the face keys left out of that. Saved with the project.
  const [embedFonts, setEmbedFonts] = useState(true);
  const [embedFontsSkip, setEmbedFontsSkip] = useState([]);

  // The part of these settings a saved project carries.
  function settingsForSave() {
    return {
      guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn,
      onionSkinOn, onionSkinOpacity, pageNumbers,
      rulersOn, rulerUnit, rulerGuides, snapToGuidesOn,
      embedFonts, embedFontsSkip,
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
    setEmbedFonts(s.embedFonts !== false); // a project that says nothing (older files) gets the default: on
    setEmbedFontsSkip(Array.isArray(s.embedFontsSkip) ? s.embedFontsSkip.filter((k) => typeof k === "string") : []);
    setRulerGuides(Array.isArray(s.rulerGuides) ? s.rulerGuides.filter((g) => g && (g.axis === "x" || g.axis === "y") && Number.isFinite(g.pos)) : []);
  }

  return {
    guidesOn, setGuidesOn, centerGuideOn, setCenterGuideOn, guideFormat, setGuideFormat,
    guideMarginIn, setGuideMarginIn, guideBleedIn, setGuideBleedIn,
    pageNumbers, setPageNumbers, onionSkinOn, setOnionSkinOn, onionSkinOpacity, setOnionSkinOpacity,
    layersOpen, setLayersOpen, layersPosition, setLayersPosition, layersSize, setLayersSize,
    rulersOn, setRulersOn, rulerUnit, setRulerUnit, rulerGuides, setRulerGuides, snapToGuidesOn, setSnapToGuidesOn,
    embedFonts, setEmbedFonts, embedFontsSkip, setEmbedFontsSkip,
    settingsForSave, applySavedSettings,
  };
}
