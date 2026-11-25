// The Format panel for a selected ruler guide: colour, exact position, this page / all pages, lock, hide, delete.

import { GUIDE_COLORS } from "../../../model/guideSet.js";
import { ptToUnit, unitToPt } from "../../../model/rulers.js";
import { NumberBox } from "../../../../../../shared/js/NumberBox.jsx";
import { FormatPanelShell } from "./FormatPanelShell.jsx";
const { useState } = React;

export function GuideFormat({ guide, unit, guides }) {
  const shown = Math.round(ptToUnit(guide.pos, unit) * 1000) / 1000;
  const [text, setText] = useState(String(shown));
  const commit = () => {
    const v = Number(text);
    if (Number.isFinite(v)) guides.update(guide.id, { pos: Math.round(unitToPt(v, unit) * 100) / 100 });
    else setText(String(shown));
  };
  return (
    <FormatPanelShell title="Guide" sections={false}>
      <label className="ze-format-field">
        <span className="ze-format-label">{guide.axis === "x" ? "Position from the left" : "Position from the top"} ({unit})</span>
        <NumberBox className="ze-format-number" step="0.1" value={text} disabled={Boolean(guide.locked)}
          onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
      </label>
      <div className="ze-format-field">
        <span className="ze-format-label">Shown on</span>
        <div className="ze-format-row">
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide is-choice" + (guide.scope === "page" ? " active" : "")} onClick={() => guides.setScope([guide.id], "page")}>This page</button>
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide is-choice" + (guide.scope === "global" ? " active" : "")} onClick={() => guides.setScope([guide.id], "global")}>All pages</button>
        </div>
      </div>
      <label className="ze-format-field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={Boolean(guide.locked)} onChange={(e) => guides.update(guide.id, { locked: e.target.checked || undefined })} />
        <span className="ze-format-label">Lock this guide</span>
      </label>
      <label className="ze-format-field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={Boolean(guide.hidden)} onChange={(e) => guides.update(guide.id, { hidden: e.target.checked || undefined })} />
        <span className="ze-format-label">Hide this guide</span>
      </label>
      <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => guides.remove(guide.id)}>Delete guide</button>
      <span className="ze-format-hint">Drag a guide to move it, or drag it back onto the ruler to remove it. Items snap to visible guides.</span>
      <div className="ze-format-field">
        <span className="ze-format-label">Colour and purpose</span>
        <div className="ze-guide-cards" role="radiogroup" aria-label="Guide colour and purpose">
          {GUIDE_COLORS.map((c) => (
            <button key={c.key} type="button" role="radio" aria-checked={guide.color === c.key}
              className={"ze-guide-card" + (guide.color === c.key ? " active" : "")} onClick={() => guides.update(guide.id, { color: c.key })}>
              <span className="ze-guide-card-title"><span className="ze-guide-dot" style={{ background: c.css }} aria-hidden="true" />{c.purpose}</span>
              <span className="ze-guide-card-desc">{c.description}</span>
            </button>
          ))}
        </div>
      </div>
    </FormatPanelShell>
  );
}
