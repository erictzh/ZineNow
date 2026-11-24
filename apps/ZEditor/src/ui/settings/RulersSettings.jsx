// Settings for the rulers and ruler guides (Page menu → Rulers & Guides → Customize).

import { RULER_UNITS, formatInUnit } from "../../model/rulers.js";

export function RulersSettings({ unit, onUnitChange, guides, onClearGuides, snap, onSnapChange, locked, onLockedChange }) {
  const sorted = [...guides].sort((a, b) => (a.axis === b.axis ? a.pos - b.pos : a.axis === "x" ? -1 : 1));
  return (
    <React.Fragment>
      <div className="ze-format-field">
        <span className="ze-format-label">Units</span>
        <select className="ze-format-select" value={unit} onChange={(e) => onUnitChange(e.target.value)}>
          {RULER_UNITS.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
        </select>
      </div>
      <label className="ze-format-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={snap} onChange={(e) => onSnapChange(e.target.checked)} />
        <span>Snap items to guides when moving them</span>
      </label>
      <label className="ze-format-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={locked} onChange={(e) => onLockedChange(e.target.checked)} />
        <span>Lock guides (freeze them where they are)</span>
      </label>
      <div className="ze-format-field">
        <span className="ze-format-label">Guides ({guides.length})</span>
        {sorted.length > 0 && (
          <span className="ze-format-hint" style={{ margin: "0 0 6px" }}>
            {sorted.map((g) => (g.axis === "x" ? "| " : "— ") + formatInUnit(g.pos, unit)).join(" · ")}
          </span>
        )}
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={locked || !guides.length} onClick={onClearGuides}>Clear all guides</button>
      </div>
      <span className="ze-format-hint">
        Drag from the top ruler for a horizontal guide, or from the left ruler for a vertical one. Drag a guide to move it, or back onto its ruler to remove it. Hold Shift to land on whole units. Guides show on every page, are saved with the project, and never print.
      </span>
    </React.Fragment>
  );
}
