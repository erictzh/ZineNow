// Page > Size: the paper size of a blank page, from the list of sizes or typed in mm.

import { PAGE_SIZE_PRESETS, SIZE_MAX_MM, SIZE_MIN_MM, cleanSizeMm, presetSizeMm, trimSizeMm } from "../../model/pageSize.js";
import { NumberBox } from "../../../../../shared/js/NumberBox.jsx";
const { useState } = React;

export function PageSizeSettings({ page, onApply }) {
  const current = page ? trimSizeMm(page) : { width: 148, height: 210 };
  const [presetKey, setPresetKey] = useState("custom");
  const [landscape, setLandscape] = useState(current.width > current.height);
  const [wText, setWText] = useState(String(current.width));
  const [hText, setHText] = useState(String(current.height));
  const preset = PAGE_SIZE_PRESETS.find((p) => p.key === presetKey);
  const size = preset ? presetSizeMm(preset, landscape) : { width: cleanSizeMm(wText, current.width), height: cleanSizeMm(hText, current.height) };
  const choose = (key) => {
    setPresetKey(key);
    const chosen = PAGE_SIZE_PRESETS.find((p) => p.key === key);
    if (chosen && chosen.preferLandscape) setLandscape(true);
    if (chosen) { const s = presetSizeMm(chosen, chosen.preferLandscape || landscape); setWText(String(s.width)); setHText(String(s.height)); }
  };
  return (
    <React.Fragment>
      <label className="ze-format-field">
        <span className="ze-format-label">Paper size</span>
        <select className="ze-format-select" value={presetKey} onChange={(e) => choose(e.target.value)}>
          <option value="custom">Custom size (mm)</option>
          {PAGE_SIZE_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>
      {preset ? (
        <label className="ze-format-field">
          <span className="ze-format-label">Orientation</span>
          <select className="ze-format-select" value={landscape ? "landscape" : "portrait"} onChange={(e) => setLandscape(e.target.value === "landscape")}>
            <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
          </select>
        </label>
      ) : (
        <div className="ze-format-inline">
          <NumberBox className="ze-format-number" min={SIZE_MIN_MM} max={SIZE_MAX_MM} step="0.5" aria-label="Width (mm)" title="Width (mm)" value={wText} onChange={(e) => setWText(e.target.value)} onBlur={() => setWText(String(size.width))} />
          <span className="ze-format-hint" style={{ margin: 0 }}>×</span>
          <NumberBox className="ze-format-number" min={SIZE_MIN_MM} max={SIZE_MAX_MM} step="0.5" aria-label="Height (mm)" title="Height (mm)" value={hText} onChange={(e) => setHText(e.target.value)} onBlur={() => setHText(String(size.height))} />
          <span className="ze-format-hint" style={{ margin: 0 }}>mm</span>
        </div>
      )}
      <span className="ze-format-hint">Will be {size.width} × {size.height} mm (the trimmed size; a bleed adds to it).</span>
      <div className="ze-format-row">
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => onApply(size.width, size.height, false)}>Apply to this page</button>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => onApply(size.width, size.height, true)}>Apply to all pages</button>
      </div>
      <span className="ze-format-hint">Items stay where they are (measured from the top-left corner); the size is not a scale. Blank pages only.</span>
    </React.Fragment>
  );
}
