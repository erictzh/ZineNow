// Page layouts as a window over the editor: pick where it goes (this page or a new page after it), click a layout, and tune the sizes the
// layouts use for this file. Closes with its button, Esc or a click outside; picking a layout applies it and closes.

import { LayoutSettings } from "../settings/LayoutSettings.jsx";
const { useEffect } = React;

export function LayoutDialog({ open, onClose, settings, onChange, hasPage, onApply }) {
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [open]);
  if (!open) return null;
  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div className="ze-modal ze-modal--layout" role="dialog" aria-label="Page layouts" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head ze-modal-head--with-close">
          <span>Page layouts</span>
          <button type="button" className="ze-modal-close" aria-label="Close" title="Close (Esc)" onClick={onClose}>×</button>
        </div>
        <div className="ze-modal-body ze-layout-dialog-body">
          <LayoutSettings
            settings={settings} onChange={onChange} hasPage={hasPage}
            onApply={(key, where) => { onApply(key, where); onClose(); }}
          />
        </div>
      </div>
    </div>
  );
}
