// Document-wide view settings: guides, center guide, page numbers, onion skin, and the Layers panel.

import { DEFAULT_GUIDE_BLEED_IN, DEFAULT_GUIDE_MARGIN_IN } from "../model/guides.js";
import { DEFAULT_PAGE_NUMBERS } from "../model/pageNumbers.js";

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
  const [layersPosition, setLayersPosition] = useState(null);

  // The part of these settings a saved project carries.
  function settingsForSave() {
    return {
      guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn,
      onionSkinOn, onionSkinOpacity, pageNumbers,
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
  }

  return {
    guidesOn, setGuidesOn, centerGuideOn, setCenterGuideOn, guideFormat, setGuideFormat,
    guideMarginIn, setGuideMarginIn, guideBleedIn, setGuideBleedIn,
    pageNumbers, setPageNumbers, onionSkinOn, setOnionSkinOn, onionSkinOpacity, setOnionSkinOpacity,
    layersOpen, setLayersOpen, layersPosition, setLayersPosition,
    settingsForSave, applySavedSettings,
  };
}
