// New blank document: paper size (a preset or a custom size in mm), orientation, page count.

import { CANVAS_PAGE_START, MAX_NEW_DOCUMENT_PAGES, NEW_DOCUMENT_PRESETS, POINTS_PER_INCH } from "../../constants.js";
import { cleanBleedMm, mmToPt as bleedMmToPt } from "../../model/bleed.js";
import { NumberBox } from "../../../../../shared/js/NumberBox.jsx";
const { useState } = React;

const MM_PER_INCH = 25.4;
const ptToMm = (pts) => (pts / POINTS_PER_INCH) * MM_PER_INCH;
const mmToPt = (mm) => (mm / MM_PER_INCH) * POINTS_PER_INCH;
// "148" or "139.7": whole millimetres where the size is whole, else one decimal.
export const formatMm = (pts) => String(Math.round(ptToMm(pts) * 10) / 10);
// A preset's name with its size, e.g. "A5 (148mm × 210mm)".
export const presetLabel = (p) => (p.noSize ? p.label : `${p.label} (${formatMm(p.width)}mm × ${formatMm(p.height)}mm)`);

const CUSTOM_MIN_MM = 20, CUSTOM_MAX_MM = 1200;
const clampMm = (text, fallback) => {
  const v = Number(text);
  return Number.isFinite(v) && v > 0 ? Math.max(CUSTOM_MIN_MM, Math.min(CUSTOM_MAX_MM, v)) : fallback;
};

// ---- New blank document — pick a paper size, orientation and page
// count instead of opening an existing PDF. `onOpenPdf` (optional) adds
// an "Open a PDF instead" way out, for when this was reached via New Project.
export function NewDocumentDialog({ open, onCreate, onOpenPdf, onCancel }) {
  const [presetKey, setPresetKey] = useState("a5");
  const [orientation, setOrientation] = useState("portrait");
  const [pageCountText, setPageCountText] = useState("1");
  const [bleedText, setBleedText] = useState("0"); // mm of bleed on every side (0: none)
  // Custom size, typed in mm (kept as text while typing; checked when used).
  const [customWText, setCustomWText] = useState("148");
  const [customHText, setCustomHText] = useState("210");
  if (!open) return null;
  const noPaper = presetKey === "canvas"; // an auto-expanding canvas with no paper
  const custom = presetKey === "custom";
  const customW = clampMm(customWText, 148), customH = clampMm(customHText, 210);
  const preset = custom
    ? { width: mmToPt(customW), height: mmToPt(customH) }
    : noPaper ? CANVAS_PAGE_START
    : NEW_DOCUMENT_PRESETS.find((p) => p.key === presetKey) || NEW_DOCUMENT_PRESETS[0];
  const landscape = orientation === "landscape";
  const width = landscape ? preset.height : preset.width;
  const height = landscape ? preset.width : preset.height;
  const pageCount = Math.max(1, Math.min(MAX_NEW_DOCUMENT_PAGES, parseInt(pageCountText, 10) || 1));
  const bleedMm = noPaper ? 0 : cleanBleedMm(bleedText);
  const inches = (pts) => +(pts / POINTS_PER_INCH).toFixed(2);
  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head">New document</div>
        <div className="ze-modal-body">
          <div className="ze-format-field">
            <span className="ze-format-label">Paper size</span>
            <select className="ze-format-select" value={presetKey} onChange={(e) => { setPresetKey(e.target.value); const chosen = NEW_DOCUMENT_PRESETS.find((p) => p.key === e.target.value); if (chosen && chosen.preferLandscape) setOrientation("landscape"); }}>
              {NEW_DOCUMENT_PRESETS.map((p) => <option key={p.key} value={p.key}>{presetLabel(p)}</option>)}
              <option value="custom">Custom size (mm)…</option>
              <option value="canvas">No paper: auto-expanding canvas</option>
            </select>
          </div>
          {custom && (
            <div className="ze-format-field">
              <span className="ze-format-label">Custom size (mm)</span>
              <div className="ze-format-inline">
                <NumberBox
                  className="ze-format-number" min={CUSTOM_MIN_MM} max={CUSTOM_MAX_MM} step="0.5"
                  aria-label="Width (mm)" title="Width (mm)" value={customWText}
                  onChange={(e) => setCustomWText(e.target.value)} onBlur={() => setCustomWText(String(customW))}
                />
                <span className="ze-format-hint" style={{ margin: 0 }}>×</span>
                <NumberBox
                  className="ze-format-number" min={CUSTOM_MIN_MM} max={CUSTOM_MAX_MM} step="0.5"
                  aria-label="Height (mm)" title="Height (mm)" value={customHText}
                  onChange={(e) => setCustomHText(e.target.value)} onBlur={() => setCustomHText(String(customH))}
                />
                <span className="ze-format-hint" style={{ margin: 0 }}>mm</span>
              </div>
            </div>
          )}
          {!noPaper && <div className="ze-format-field">
            <span className="ze-format-label">Orientation</span>
            <div className="ze-format-row">
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide is-choice" + (!landscape ? " active" : "")} onClick={() => setOrientation("portrait")}>Portrait</button>
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide is-choice" + (landscape ? " active" : "")} onClick={() => setOrientation("landscape")}>Landscape</button>
            </div>
          </div>}
          <label className="ze-format-field">
            <span className="ze-format-label">Pages</span>
            <NumberBox
              className="ze-format-number" min="1" max={MAX_NEW_DOCUMENT_PAGES}
              value={pageCountText} onChange={(e) => setPageCountText(e.target.value)}
              onBlur={() => setPageCountText(String(pageCount))}
            />
          </label>
          {!noPaper && <label className="ze-format-field">
            <span className="ze-format-label">Bleed (mm)</span>
            <NumberBox
              className="ze-format-number" min="0" max="25" step="0.5"
              aria-label="Bleed (mm)" title="Extra picture past the trimmed edge, on every side. 0 means no bleed."
              value={bleedText} onChange={(e) => setBleedText(e.target.value)} onBlur={() => setBleedText(String(bleedMm))}
            />
          </label>}
          <span className="ze-format-hint">
            {noPaper ? "No paper: draw anywhere, even outside the first view; the canvas grows to hold everything. Save the project (.znow) to keep it. " : `${formatMm(width)} × ${formatMm(height)} mm (${inches(width)} × ${inches(height)} in)${bleedMm > 0 ? `, trimmed; with ${bleedMm} mm bleed each page is ${formatMm(width + 2 * bleedMmToPt(bleedMm))} × ${formatMm(height + 2 * bleedMmToPt(bleedMm))} mm` : ""}.`}{custom ? ` Sizes from ${CUSTOM_MIN_MM} to ${CUSTOM_MAX_MM} mm.` : ""} You can add or remove pages later.
          </span>
        </div>
        <div className="ze-modal-actions">
          {onOpenPdf && <button type="button" onClick={onOpenPdf}>Open a PDF instead</button>}
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-solid" onClick={() => onCreate({ width: width + 2 * bleedMmToPt(bleedMm), height: height + 2 * bleedMmToPt(bleedMm), pageCount, canvas: noPaper, bleedMm })}>Create</button>
        </div>
      </div>
    </div>
  );
}
