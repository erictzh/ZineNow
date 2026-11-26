// Panels folded away with their – button: small title bars in a row at the bottom right. Click one to open the panel again where it was;
// its × closes it for good (until it is opened from the top bar or tool bar).

export function PanelDock({ items }) {
  if (!items.length) return null;
  return (
    <div className="ze-panel-dock">
      {items.map((item) => (
        <div key={item.key} className="ze-panel-dock-item">
          <button type="button" className="ze-format-panel-head ze-panel-dock-open" title={"Open " + item.label} onClick={item.onOpen}>{item.label}</button>
          <button type="button" className="ze-guides-settings-btn" title="Close" aria-label={"Close " + item.label} onClick={item.onClose}>
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
