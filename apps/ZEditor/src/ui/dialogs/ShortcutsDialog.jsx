// The keyboard shortcuts window.

import { KEYBOARD_SHORTCUTS } from "./shortcuts.js";
const { useEffect } = React;

export function ShortcutsDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  if (!open) return null;
  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div className="ze-modal ze-modal--shortcuts" role="dialog" aria-label="Keyboard shortcuts" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head ze-modal-head--with-close">
          Keyboard Shortcuts
          <button type="button" className="ze-tool-icon-btn ze-tool-icon-btn--round" title="Close (Esc)" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="ze-shortcuts-scroll">
          <table className="ze-shortcuts-table">
            {KEYBOARD_SHORTCUTS.map(({ group, rows }) => (
              <tbody key={group}>
                <tr><th colSpan="2">{group}</th></tr>
                {rows.map(([keys, action]) => (
                  <tr key={keys}>
                    <td><kbd>{keys}</kbd></td>
                    <td>{action}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          <span className="ze-format-hint">On a Mac, use Cmd instead of Ctrl. Shortcuts pause while you're typing in a text box or field.</span>
        </div>
      </div>
    </div>
  );
}
