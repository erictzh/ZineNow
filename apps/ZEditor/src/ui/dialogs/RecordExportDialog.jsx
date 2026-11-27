// Data panel: Export each record as its own PDF. The file name pattern uses {{fields}}; the files go into a zip, or (Chrome and Edge) into a folder.

const { useEffect } = React;

export function RecordExportDialog({ open, onClose, merge, view }) {
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [open]);
  if (!open) return null;
  const pages = merge.exportGroups.reduce((n, g) => n + g.pageIndices.length, 0);
  const canFolder = typeof window.showDirectoryPicker === "function";
  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div className="ze-modal" role="dialog" aria-label="Export each record" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head ze-modal-head--with-close">
          <span>Export each record as a PDF</span>
          <button type="button" className="ze-modal-close" aria-label="Close" title="Close (Esc)" onClick={onClose}>×</button>
        </div>
        <div className="ze-modal-body">
          <p>{merge.exportGroups.length} record{merge.exportGroups.length === 1 ? "" : "s"}, {pages} page{pages === 1 ? "" : "s"}: one PDF for each record, with all of its pages.</p>
          <label className="ze-data-row">File name{" "}
            <input type="text" value={view.dataExportPattern} placeholder={merge.exportPattern} onChange={(e) => view.setDataExportPattern(e.target.value)} />
          </label>
          <p className="ze-data-help">Put {"{{column}}"} where a value goes, for example {"{{id}} {{last name}}"}. Names that come out the same get a number. The first files would be called:</p>
          <ul className="ze-data-help">{merge.exportNames.slice(0, 3).map((n, i) => <li key={i}>{n}</li>)}{merge.exportNames.length > 3 && <li>…</li>}</ul>
          <div className="ze-modal-actions">
            <button type="button" className="ze-btn ze-btn-primary" disabled={merge.exporting} onClick={() => merge.exportRecords("zip")}>Save as a zip</button>
            {canFolder && <button type="button" className="ze-btn" disabled={merge.exporting} onClick={() => merge.exportRecords("folder")}>Save to a folder…</button>}
          </div>
          {!canFolder && <p className="ze-data-help">Saving into a folder needs Chrome or Edge on a computer; here, the zip is the way.</p>}
          {merge.message && <p className="ze-data-note" role="status">{merge.message}</p>}
        </div>
      </div>
    </div>
  );
}
