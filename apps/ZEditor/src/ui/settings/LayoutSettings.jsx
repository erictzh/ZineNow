// Page > Layout: pick a ready-made layout (applied to this page, or as a new page after it), and the sizes the layouts use
// for this file (margin, gap, split, title size…). Each layout is shown as a small picture made from the same geometry.

import { DEFAULT_LAYOUT_SETTINGS, LAYOUTS, LAYOUT_SETTING_FIELDS, place } from "../../model/pageLayouts.js";
import { NumberBox } from "../../../../../shared/js/NumberBox.jsx";
const { useState } = React;

const PREVIEW_W = 70, PREVIEW_H = 99; // an A5-shaped little page

function LayoutPreview({ layout, settings }) {
  const boxes = place(layout, PREVIEW_W, PREVIEW_H, settings, 4, null);
  return (
    <svg viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} width={PREVIEW_W} height={PREVIEW_H} aria-hidden="true">
      <rect width={PREVIEW_W} height={PREVIEW_H} fill="#fff" stroke="#8a8078" strokeWidth="0.6" />
      {boxes.map((b, i) => {
        if (b.role === "picture") return <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={settings.slotGrey} />;
        const lineGap = b.role === "title" ? b.h : 4;
        const lines = Math.max(1, Math.floor(b.h / lineGap));
        const cols = b.columns > 1 ? b.columns : 1;
        const colW = (b.w - (cols - 1) * 3) / cols;
        const thick = b.role === "title" ? Math.max(2.5, b.h * 0.4) : 1.2;
        return (
          <g key={i} stroke="#4a4540" strokeWidth={thick} strokeLinecap="round">
            {Array.from({ length: cols }).flatMap((_, c) => Array.from({ length: lines }).map((__, l) => {
              const y = b.y + (b.role === "title" ? b.h / 2 : lineGap * (l + 0.6));
              const short = b.role !== "title" && l === lines - 1 ? 0.6 : 1;
              return <line key={c + "-" + l} x1={b.x + c * (colW + 3)} y1={y} x2={b.x + c * (colW + 3) + colW * (b.role === "title" ? 0.7 : short)} y2={y} />;
            }))}
          </g>
        );
      })}
    </svg>
  );
}

// `onApply(key, where)` where is "page" or "new"; `disabled`: no page to add to.
export function LayoutSettings({ settings, onChange, onApply, hasPage }) {
  const [where, setWhere] = useState("new");
  const target = hasPage ? where : "new";
  return (
    <div className="ze-layout-menu">
      <div className="ze-layout-where" role="group" aria-label="Where to add the layout">
        <button type="button" className={target === "page" ? "active" : ""} disabled={!hasPage} onClick={() => setWhere("page")}
          title="Applies the layout to this page, replacing an earlier layout on it (your own items stay on top)">On this page</button>
        <button type="button" className={target === "new" ? "active" : ""} onClick={() => setWhere("new")}
          title="Adds a new page after this one, holding the layout">New page after</button>
      </div>
      <div className="ze-layout-grid">
        {LAYOUTS.map((l) => (
          <button key={l.key} type="button" className="ze-layout-tile" title={l.label} onClick={() => onApply(l.key, target)}>
            <LayoutPreview layout={l} settings={settings} />
            <span>{l.label}</span>
          </button>
        ))}
      </div>
      <details className="ze-layout-settings">
        <summary>Layout settings (this file)</summary>
        {LAYOUT_SETTING_FIELDS.map((f) => (
          <label key={f.key} className="ze-layout-field">
            <span className="ze-format-label">{f.label} <small>({f.unit})</small></span>
            <NumberBox min={f.min} max={f.max} step={f.step} value={settings[f.key]}
              onChange={(e) => { const v = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(v)) onChange({ ...settings, [f.key]: Math.min(f.max, Math.max(f.min, v)) }); }}
              aria-label={f.label} />
          </label>
        ))}
        <button type="button" className="ze-layout-reset" onClick={() => onChange(DEFAULT_LAYOUT_SETTINGS)}>Reset to defaults</button>
        <p className="ze-layout-note">Only layouts added from now on use these sizes. Layouts already on a page are ordinary items and stay as they are. The margin follows the Page Guide when it is on.</p>
      </details>
    </div>
  );
}
