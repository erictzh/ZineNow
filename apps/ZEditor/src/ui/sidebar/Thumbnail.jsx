// One page thumbnail with rotate and delete buttons.

import { withTouchModifier } from "../touchInput.js";

// ---- One sidebar thumbnail ------------------------------------------
export function Thumbnail({ p, idx, isSelected, onSelect, onRotate, onDelete, dragHandlers }) {
  return (
    <div
      className={"ze-thumb" + (isSelected ? " is-selected" : "")}
      draggable="true"
      onClick={(e) => onSelect(idx, withTouchModifier("shift", e))}
      {...dragHandlers}
    >
      <div className="ze-thumb-img-wrap">
        <img src={p.dataUrl} alt={p.isBlank ? "Blank page" : "Page " + p.pageNumber} />
      </div>
      <div className="ze-thumb-footer">
        <span className="ze-thumb-num">{idx + 1}</span>
        <div className="ze-thumb-actions">
          <button
            type="button"
            className="log-btn"
            title="Rotate"
            onClick={(e) => { e.stopPropagation(); onRotate(idx); }}
          >⟳</button>
          <button
            type="button"
            className="log-btn"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M9 7V4h6v3" />
              <path d="M6 7l1 13h10l1-13" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
