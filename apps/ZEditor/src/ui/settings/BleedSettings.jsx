// Page > Bleed: how far the picture runs past the trimmed edge of a blank page, in mm.

import { MAX_BLEED_MM, cleanBleedMm } from "../../model/bleed.js";
import { NumberBox } from "../../../../../shared/js/NumberBox.jsx";
const { useState } = React;

export function BleedSettings({ currentMm, onApply }) {
  const [text, setText] = useState(String(currentMm || 0));
  const value = cleanBleedMm(text);
  return (
    <React.Fragment>
      <label className="ze-format-field">
        <span className="ze-format-label">Bleed (mm)</span>
        <NumberBox
          className="ze-format-number" min="0" max={MAX_BLEED_MM} step="0.5"
          aria-label="Bleed (mm)" value={text}
          onChange={(e) => setText(e.target.value)} onBlur={() => setText(String(value))}
        />
      </label>
      <div className="ze-format-row">
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => onApply(value, false)}>Apply to this page</button>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => onApply(value, true)}>Apply to all pages</button>
      </div>
      <span className="ze-format-hint">
        Bleed is extra picture past the trimmed edge, so no white shows after cutting. The page grows by the bleed on every side; the dotted line marks where it will be cut, and your items stay where they are relative to it. 0 means no bleed. Blank pages only.
      </span>
    </React.Fragment>
  );
}
