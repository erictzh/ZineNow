// The Data panel (Basic): connect a spreadsheet, put its columns into text, preview each row, and make one page per row.

const { useRef, useState } = React;

export function DataPanel({ merge, view, hasPage }) {
  const fileRef = useRef(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [hideTemplate, setHideTemplate] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const { parsed, headers, count, idColumn } = merge;
  const from = Number(range.from) || undefined, to = Number(range.to) || undefined;
  const check = merge.usedCheck(from, to);
  const chosenCount = count === 0 ? 0 : Math.min(count, to || count) - Math.max(1, from || 1) + 1;

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    merge.connect(file.name, await file.text());
  }
  function make() {
    if (merge.earlierCount > 0 && !confirming) { setConfirming(true); return; }
    setConfirming(false);
    merge.createPages({ from, to, hideTemplate });
  }

  return (
    <aside className="ze-data-panel" aria-label="Data merge">
      <div className="ze-data-head">
        <span>Data</span>
        <button type="button" className="ze-modal-close" aria-label="Close" title="Close" onClick={() => view.setDataPanelOpen(false)}>×</button>
      </div>
      <div className="ze-data-body">
        {!parsed && (
          <div className="ze-data-section">
            <p className="ze-data-help">Fill pages from a spreadsheet: one page for each row. Save your sheet as a CSV file, then choose it here. It stays on your device and is saved inside this project.</p>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={onFile} />
            <button type="button" className="ze-btn ze-data-wide" onClick={() => fileRef.current && fileRef.current.click()}>Choose CSV file…</button>
            <button type="button" className="ze-data-link" onClick={() => setPasting(!pasting)}>{pasting ? "Hide" : "Or paste the rows here"}</button>
            {pasting && (
              <>
                <textarea className="ze-data-paste" rows={6} placeholder={"name,city\nAna,Penang\nBen,Ipoh"} value={pasted} onChange={(e) => setPasted(e.target.value)} />
                <button type="button" className="ze-btn ze-data-wide" disabled={!pasted.trim()} onClick={() => { if (merge.connect("pasted data.csv", pasted)) { setPasted(""); setPasting(false); } }}>Use these rows</button>
              </>
            )}
          </div>
        )}
        {parsed && (
          <>
            <div className="ze-data-section">
              <div className="ze-data-file"><strong title={view.dataSource.name}>{view.dataSource.name}</strong><span>{count} {count === 1 ? "row" : "rows"}</span></div>
              <button type="button" className="ze-data-link" onClick={merge.disconnect}>Remove this data</button>
            </div>
            <div className="ze-data-section">
              <div className="ze-data-title">Fields</div>
              <p className="ze-data-help">{hasPage ? "Click a field to put it in the selected text box, or in a new one." : "Open a page first."}</p>
              <div className="ze-data-chips">
                {headers.map((h) => <button key={h} type="button" className="ze-data-chip" disabled={!hasPage} title={"Insert {{" + h + "}}"} onClick={() => merge.insertField(h)}>{h}</button>)}
              </div>
            </div>
            <div className="ze-data-section">
              <div className="ze-data-title">Preview</div>
              <label className="ze-data-row"><input type="checkbox" checked={view.dataPreviewOn} onChange={(e) => view.setDataPreviewOn(e.target.checked)} /> Show this row's words on the page</label>
              <div className="ze-data-stepper">
                <button type="button" className="ze-btn" aria-label="Previous row" disabled={merge.recordNo <= 0} onClick={() => merge.setRecordNo(merge.recordNo - 1)}>◀</button>
                <span>row {merge.recordNo + 1} of {count}</span>
                <button type="button" className="ze-btn" aria-label="Next row" disabled={merge.recordNo >= count - 1} onClick={() => merge.setRecordNo(merge.recordNo + 1)}>▶</button>
              </div>
              <label className="ze-data-row">Order{" "}
                <select value={view.dataOrder} onChange={(e) => view.setDataOrder(e.target.value)}>
                  <option value="file">As in the file</option>
                  {idColumn && <option value="id-asc">By “{idColumn}”, lowest first</option>}
                  {idColumn && <option value="id-desc">By “{idColumn}”, highest first</option>}
                </select>
              </label>
              {!idColumn && <p className="ze-data-help">To order rows yourself, add a column named id.</p>}
            </div>
            <div className="ze-data-section">
              <div className="ze-data-title">Make pages</div>
              <p className="ze-data-help">Design one page with fields in it, then make a page for each row.</p>
              <div className="ze-data-row">Rows{" "}
                <input className="ze-data-num" type="number" min="1" max={count} placeholder="1" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                {" "}to{" "}
                <input className="ze-data-num" type="number" min="1" max={count} placeholder={String(count)} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
              </div>
              <label className="ze-data-row"><input type="checkbox" checked={hideTemplate} onChange={(e) => setHideTemplate(e.target.checked)} /> Hide the page you designed (it is skipped when exporting)</label>
              {check.missing.length > 0 && <p className="ze-data-warn">The page uses {check.missing.map((f) => "{{" + f + "}}").join(", ")}, but the file has no such column.</p>}
              {check.emptyCounts.map((e) => <p key={e.field} className="ze-data-warn">{e.count} of the chosen rows have nothing in “{e.field}”.</p>)}
              {check.used.length === 0 && hasPage && <p className="ze-data-warn">No field is used on this page yet.</p>}
              {merge.earlierCount > 0 && <p className="ze-data-help">{merge.earlierCount} page{merge.earlierCount === 1 ? "" : "s"} made from this page earlier will be replaced.</p>}
              <button type="button" className="ze-btn ze-btn-primary ze-data-wide" disabled={!hasPage || chosenCount < 1 || check.used.length === 0} onClick={make}>
                {confirming ? "Replace " + merge.earlierCount + " and make " + chosenCount + " — click to confirm" : "Make " + chosenCount + " page" + (chosenCount === 1 ? "" : "s")}
              </button>
              {merge.onGeneratedPage && <p className="ze-data-help">This page was made by a merge. Edit the page you designed, then make the pages again.</p>}
            </div>
          </>
        )}
        {merge.message && <p className="ze-data-note" role="status">{merge.message}</p>}
      </div>
    </aside>
  );
}
