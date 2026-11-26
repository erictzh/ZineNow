// Shown when a data template (a ZDATA = file) is opened: use it with your own data, or edit the template itself.

const { useEffect } = React;

export function DataTemplateDialog({ prompt, onChoose }) {
  useEffect(() => {
    if (!prompt) return undefined;
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); onChoose(null); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [prompt]);
  if (!prompt) return null;
  return (
    <div className="ze-modal-backdrop" onMouseDown={() => onChoose(null)}>
      <div className="ze-modal" role="dialog" aria-label="Data template" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head ze-modal-head--with-close">
          <span>Data template</span>
          <button type="button" className="ze-modal-close" aria-label="Cancel" title="Cancel (Esc)" onClick={() => onChoose(null)}>×</button>
        </div>
        <div className="ze-modal-body">
          <p><strong>{prompt.name}</strong> is a data template: designs that are filled from a spreadsheet.</p>
          {prompt.columns.length > 0 && <p>It expects a CSV with these columns: <strong>{prompt.columns.join(", ")}</strong>.</p>}
          <p><strong>Use this template</strong> opens a copy that is not saved anywhere yet, with the Data panel open so you can choose your own CSV. The template file is never changed.</p>
          <p><strong>Edit it</strong> opens the template itself, so you can change its design. Saving keeps it a template.</p>
          <div className="ze-modal-actions">
            <button type="button" className="ze-btn ze-btn-primary" onClick={() => onChoose("use")}>Use this template</button>
            <button type="button" className="ze-btn" onClick={() => onChoose("edit")}>Edit it</button>
          </div>
        </div>
      </div>
    </div>
  );
}
