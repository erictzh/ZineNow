// Asks where to insert another PDF's pages.

import { NumberBox } from "../../../../../shared/js/NumberBox.jsx";

// ---- Insert PDF dialog — asks where to splice the newly-chosen PDF's
// pages into the current document before actually doing it, rather
// than always appending at the end.
export function InsertPdfDialog({ file, pageCount, afterPage, onChangeAfterPage, onConfirm, onCancel }) {
  if (!file) return null;
  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head">Insert PDF</div>
        <div className="ze-modal-body">
          <p className="ze-format-hint" style={{ margin: "0 0 14px" }}>
            Inserting <strong>{file.name}</strong> into this document.
          </p>
          <label className="ze-format-field">
            <span className="ze-format-label">Insert after page (0 for the very beginning)</span>
            <NumberBox
              className="ze-format-number" min="0" max={pageCount} autoFocus
              value={afterPage}
              onChange={(e) => onChangeAfterPage(Math.max(0, Math.min(pageCount, Number(e.target.value) || 0)))}
            />
          </label>
          <span className="ze-format-hint">This document currently has {pageCount} page{pageCount === 1 ? "" : "s"}.</span>
        </div>
        <div className="ze-modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-solid" onClick={onConfirm}>Insert</button>
        </div>
      </div>
    </div>
  );
}
