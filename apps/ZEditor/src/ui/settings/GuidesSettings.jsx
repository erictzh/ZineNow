// Guide format, margin and bleed settings.

import { GUIDE_FORMAT_PRESETS } from "../../model/guides.js";

// ---- Guides settings — format/margin/bleed for the trim guides.
export function GuidesSettings({ format, onFormatChange, marginIn, onMarginChange, bleedIn, onBleedChange }) {
  return (
    <React.Fragment>
      <div className="ze-format-field">
        <span className="ze-format-label">Format</span>
        <select className="ze-format-select" value={format} onChange={(e) => onFormatChange(e.target.value)}>
          {GUIDE_FORMAT_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>
      <label className="ze-format-field">
        <span className="ze-format-label">Margin (in)</span>
        <input
          type="number" className="ze-format-number" min="0" max="3" step="0.0625"
          value={marginIn}
          onChange={(e) => onMarginChange(Math.max(0, Number(e.target.value) || 0))}
        />
      </label>
      <label className="ze-format-field">
        <span className="ze-format-label">Bleed (in)</span>
        <input
          type="number" className="ze-format-number" min="0" max="1" step="0.0625"
          value={bleedIn}
          onChange={(e) => onBleedChange(Math.max(0, Number(e.target.value) || 0))}
        />
      </label>
      <span className="ze-format-hint">
        Trim is centered on the page; margin sits inside it, bleed extends outside. Pick "Match Page Size" if the page is already trimmed to its final size.
      </span>
    </React.Fragment>
  );
}
