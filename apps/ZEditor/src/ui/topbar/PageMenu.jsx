// The Page menu body: toggle rows and the in-place Customize view.

const { useState } = React;

// ---- Page menu — Filter, Onion Skin, Page Numbers and Guides, each a row
// with an on/off toggle and "Customize…", which swaps the menu to that
// feature's settings (with a back arrow) instead of opening a second popup.
// A row with `onOpen` (instead of `settings`) opens something else, such as a window, when its button is pressed, and then closes the menu (`close`).
export function PageMenuBody({ rows, close }) {
  const [customizing, setCustomizing] = useState(null);
  const active = rows.find((r) => r.key === customizing);

  if (active) {
    return (
      <div className="ze-menu-settings">
        <div className="ze-menu-settings-head">
          <button type="button" className="ze-menu-back" title="Back" onClick={() => setCustomizing(null)}>
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12.5 5.5L8 10l4.5 4.5" />
            </svg>
          </button>
          <span>{active.label}</span>
        </div>
        {active.settings}
      </div>
    );
  }

  return rows.map((row) => (
    <div key={row.key} className={"ze-menu-toggle-row" + (row.disabled ? " disabled" : "")}>
      <div className="ze-menu-toggle-text">
        <span className="ze-menu-toggle-label">{row.label}</span>
        {row.detail && <span className="ze-menu-toggle-detail">{row.detail}</span>}
      </div>
      <button type="button" className="ze-menu-customize" disabled={row.disabled} onClick={() => { if (row.onOpen) { row.onOpen(); if (close) close(); } else setCustomizing(row.key); }}>
        {row.openLabel || "Customize…"}
      </button>
      {!row.noToggle && (
        <label className="toggle-switch" title={(row.checked ? "Turn off " : "Turn on ") + row.label}>
          <input type="checkbox" checked={row.checked} disabled={row.disabled} onChange={(e) => row.onToggle(e.target.checked)} />
          <span className="toggle-slider"></span>
        </label>
      )}
    </div>
  ));
}
