// New blank document: paper size, orientation, page count.

import { MAX_NEW_DOCUMENT_PAGES, NEW_DOCUMENT_PRESETS, POINTS_PER_INCH } from "../../constants.js";
const { useState } = React;

// ---- New blank document — pick a paper size, orientation and page
// count instead of opening an existing PDF. `onOpenPdf` (optional) adds
// an "Open a PDF instead" way out, for when this was reached via New Project.
export function NewDocumentDialog({ open, onCreate, onOpenPdf, onCancel }) {
  const [presetKey, setPresetKey] = useState("a5");
  const [orientation, setOrientation] = useState("portrait");
  const [pageCountText, setPageCountText] = useState("1");
  if (!open) return null;
  const preset = NEW_DOCUMENT_PRESETS.find((p) => p.key === presetKey) || NEW_DOCUMENT_PRESETS[0];
  const landscape = orientation === "landscape";
  const width = landscape ? preset.height : preset.width;
  const height = landscape ? preset.width : preset.height;
  const pageCount = Math.max(1, Math.min(MAX_NEW_DOCUMENT_PAGES, parseInt(pageCountText, 10) || 1));
  const mm = (pts) => Math.round(pts / POINTS_PER_INCH * 25.4);
  const inches = (pts) => +(pts / POINTS_PER_INCH).toFixed(2);
  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head">New document</div>
        <div className="ze-modal-body">
          <div className="ze-format-field">
            <span className="ze-format-label">Paper size</span>
            <select className="ze-format-select" value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
              {NEW_DOCUMENT_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div className="ze-format-field">
            <span className="ze-format-label">Orientation</span>
            <div className="ze-format-row">
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (!landscape ? " active" : "")} onClick={() => setOrientation("portrait")}>Portrait</button>
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (landscape ? " active" : "")} onClick={() => setOrientation("landscape")}>Landscape</button>
            </div>
          </div>
          <label className="ze-format-field">
            <span className="ze-format-label">Pages</span>
            <input
              type="number" className="ze-format-number" min="1" max={MAX_NEW_DOCUMENT_PAGES}
              value={pageCountText} onChange={(e) => setPageCountText(e.target.value)}
              onBlur={() => setPageCountText(String(pageCount))}
            />
          </label>
          <span className="ze-format-hint">
            {mm(width)} × {mm(height)} mm ({inches(width)} × {inches(height)} in). You can add or remove pages later.
          </span>
        </div>
        <div className="ze-modal-actions">
          {onOpenPdf && <button type="button" onClick={onOpenPdf}>Open a PDF instead</button>}
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-solid" onClick={() => onCreate({ width, height, pageCount })}>Create</button>
        </div>
      </div>
    </div>
  );
}
