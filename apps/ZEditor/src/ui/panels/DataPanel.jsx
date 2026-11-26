// The Data panel (Basic): connect a spreadsheet, put its columns into text, preview each row, and make one page per row.

import { SHOW_ON } from "../../model/dataMerge/groups.js";
import { trackPointerDrag } from "../pointer.js";
const { useRef, useState } = React;

// Dragging and resizing work as in the Layers panel. Where the panel was left is kept while the editor is open.
const MIN_WIDTH = 240, MIN_HEIGHT = 200;
const EDGES = [
  { key: "w", left: true }, { key: "e", right: true }, { key: "s", bottom: true },
  { key: "sw", left: true, bottom: true }, { key: "se", right: true, bottom: true },
];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
let rememberedPlace = { position: null, size: null };

export function DataPanel({ merge, view, hasPage }) {
  const fileRef = useRef(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [hideTemplate, setHideTemplate] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [grid, setGrid] = useState({ cols: 2, rows: 5, gap: 0 });
  const panelRef = useRef(null), headRef = useRef(null);
  const [position, setPositionState] = useState(rememberedPlace.position);
  const [size, setSizeState] = useState(rememberedPlace.size);
  const setPosition = (v) => { rememberedPlace.position = v; setPositionState(v); };
  const setSize = (v) => { rememberedPlace.size = v; setSizeState(v); };
  const { parsed, headers, count, idColumn } = merge;
  const from = Number(range.from) || undefined, to = Number(range.to) || undefined;
  const check = merge.usedCheck(from, to);
  const chosenCount = count === 0 ? 0 : merge.plannedPages(from, to).length; // pages that would be made

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

  // Keeps the title bar on screen so the panel can always be grabbed.
  const inView = (x, y) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - panelRef.current.offsetWidth)),
    y: Math.max(0, Math.min(y, window.innerHeight - headRef.current.offsetHeight)),
  });
  function startDrag(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = panelRef.current.getBoundingClientRect();
    const { clientX, clientY } = e;
    trackPointerDrag((ev) => setPosition(inView(start.left + ev.clientX - clientX, start.top + ev.clientY - clientY)));
  }
  function startResize(e, edge) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const start = panelRef.current.getBoundingClientRect();
    const { clientX, clientY, pointerId } = e;
    const handle = e.currentTarget;
    handle.setPointerCapture(pointerId);
    const move = (ev) => {
      const dx = ev.clientX - clientX, dy = ev.clientY - clientY;
      let left = start.left, width = start.width, height = start.height;
      if (edge.right) width = clamp(start.width + dx, MIN_WIDTH, window.innerWidth - start.left);
      if (edge.left) { width = clamp(start.width - dx, MIN_WIDTH, start.right); left = start.right - width; }
      if (edge.bottom) height = clamp(start.height + dy, MIN_HEIGHT, window.innerHeight - start.top);
      setSize({ width: Math.round(width), height: Math.round(height) });
      setPosition({ x: Math.round(left), y: Math.round(start.top) });
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }

  return (
    <aside
      className={"ze-data-panel" + (size ? " is-sized" : "")} aria-label="Data merge" ref={panelRef}
      style={{
        ...(position ? { left: position.x, top: position.y } : null),
        ...(size ? { width: size.width, height: Math.min(size.height, window.innerHeight - (position ? position.y : 96)) } : null),
      }}
    >
      <div className="ze-format-panel-head ze-layers-head" ref={headRef} onMouseDown={startDrag}>
        <span>Data</span>
        <span className="ze-layers-head-actions" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="ze-guides-settings-btn" title="Minimize to the bottom right" aria-label="Minimize the Data panel" onMouseDown={(e) => e.stopPropagation()} onClick={() => view.setDataMinimized(true)}>
          <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M5 10h10" />
          </svg>
        </button>
          <button type="button" className="ze-guides-settings-btn" title="Close (remembers its place and size)" aria-label="Close the Data panel" onMouseDown={(e) => e.stopPropagation()} onClick={() => view.setDataPanelOpen(false)}>
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </span>
      </div>
      {parsed && (
        <div className="ze-data-pinned">
          <div className="ze-data-file"><strong title={view.dataSource.name}>{view.dataSource.name}</strong><span>{count} {count === 1 ? "row" : "rows"}</span></div>
          <button type="button" className="ze-data-link" onClick={merge.disconnect}>Remove this data</button>
          <div className="ze-data-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={!view.dataAdvanced} className={"ze-data-tab" + (!view.dataAdvanced ? " is-active" : "")} onClick={() => view.setDataAdvanced(false)}>Basic</button>
            <button type="button" role="tab" aria-selected={view.dataAdvanced} className={"ze-data-tab" + (view.dataAdvanced ? " is-active" : "")} onClick={() => view.setDataAdvanced(true)}>Advanced</button>
          </div>
        </div>
      )}
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
            {!view.dataAdvanced && (
              <>
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
              </>
            )}
            {view.dataAdvanced && (
              <div className="ze-data-section">
                <div className="ze-data-title">Data blocks</div>
                <p className="ze-data-help">Put several records on one page, or group records (for example one page of members for each band). Design one block that shows a record, group its items (Ctrl+G), mark the group as a data block, and copy it as many times as you want on the page.</p>
                <button type="button" className="ze-btn ze-data-wide" disabled={!hasPage || merge.selected.count === 0} onClick={() => merge.markDataBlock(!merge.selected.isBlock)}>
                  {merge.selected.isBlock ? "Not a data block" : "Mark the selected group as a data block"}
                </button>
                {merge.selected.isBlock && (
                  <div className="ze-data-grid">
                    <div className="ze-data-title">Make a grid of copies</div>
                    <p className="ze-data-help">Copies the selected block into columns and rows from its top-left corner. Place the block where the first cell should be, at the size of one cell.</p>
                    <div className="ze-data-row">
                      Columns <input className="ze-data-num" type="number" min="1" max="12" value={grid.cols} onChange={(e) => setGrid({ ...grid, cols: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
                      Rows <input className="ze-data-num" type="number" min="1" max="12" value={grid.rows} onChange={(e) => setGrid({ ...grid, rows: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
                    </div>
                    <div className="ze-data-row">Gap (mm) <input className="ze-data-num" type="number" min="0" max="50" step="0.5" value={grid.gap} onChange={(e) => setGrid({ ...grid, gap: Math.max(0, Number(e.target.value) || 0) })} /></div>
                    <button type="button" className="ze-btn ze-data-wide" onClick={() => merge.makeGrid({ cols: grid.cols, rows: grid.rows, gapMm: grid.gap })}>Make {grid.cols * grid.rows - 1} copies</button>
                  </div>
                )}
                <p className="ze-data-help">{merge.slotCount === 0 ? "No data blocks on this page: one record per page." : merge.slotCount + " data block" + (merge.slotCount === 1 ? "" : "s") + " on this page: each takes the next record."}</p>
                {merge.blockMode && (
                  <>
                    <label className="ze-data-row">Group by{" "}
                      <select value={merge.groupBy} onChange={(e) => view.setDataGroupBy(e.target.value)}>
                        <option value="">No grouping</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </label>
                    <p className="ze-data-help">{merge.groupBy ? "Each " + merge.groupBy + " starts on a new page. Fields in non-data items show the group's first row; {{page in group}}, {{pages in group}} and {{records in group}} are available." : "Records fill the blocks page after page."}</p>
                    <label className="ze-data-row"><input type="checkbox" checked={view.dataRepeatOthers} onChange={(e) => view.setDataRepeatOthers(e.target.checked)} /> Repeat non-data items on the other pages</label>
                  </>
                )}
                {merge.selected.count > 0 && !merge.selected.hasBlock && merge.blockMode && (
                  <label className="ze-data-row">Selected item shows on{" "}
                    <select value={merge.selected.showOn} onChange={(e) => merge.setShowOn(e.target.value)}>
                      {merge.selected.showOn === "" && <option value="">Mixed</option>}
                      {SHOW_ON.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </label>
                )}
              </div>
            )}
            <div className="ze-data-section">
              <div className="ze-data-title">Make pages</div>
              <p className="ze-data-help">Design one page with fields in it, then make a page for each row.</p>
              <div className="ze-data-row">Rows{" "}
                <input className="ze-data-num" type="number" min="1" max={count} placeholder="1" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                {" "}to{" "}
                <input className="ze-data-num" type="number" min="1" max={count} placeholder={String(count)} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
              </div>
              <label className="ze-data-row"><input type="checkbox" checked={hideTemplate} onChange={(e) => setHideTemplate(e.target.checked)} /> Hide the page you designed (it is skipped when exporting)</label>
            </div>
          </>
        )}
        {merge.message && <p className="ze-data-note" role="status">{merge.message}</p>}
      </div>
      {parsed && (
        <div className="ze-data-foot">
                {check.missing.length > 0 && <p className="ze-data-warn">The page uses {check.missing.map((f) => "{{" + f + "}}").join(", ")}, but the file has no such column.</p>}
                {check.emptyCounts.map((e) => <p key={e.field} className="ze-data-warn">{e.count} of the chosen rows have nothing in “{e.field}”.</p>)}
                {check.used.length === 0 && hasPage && <p className="ze-data-warn">No field is used on this page yet.</p>}
                {merge.earlierCount > 0 && <p className="ze-data-help">{merge.earlierCount} page{merge.earlierCount === 1 ? "" : "s"} made from this page earlier will be replaced.</p>}
                <button type="button" className="ze-btn ze-btn-primary ze-data-wide" disabled={!hasPage || chosenCount < 1 || check.used.length === 0} onClick={make}>
                  {confirming ? "Replace " + merge.earlierCount + " and make " + chosenCount + " — click to confirm" : "Make " + chosenCount + " page" + (chosenCount === 1 ? "" : "s")}
                </button>
                {merge.onGeneratedPage && <p className="ze-data-help">This page was made by a merge. Edit the page you designed, then make the pages again.</p>}
        </div>
      )}
      {EDGES.map((edge) => <div key={edge.key} className={"ze-layers-resize ze-layers-resize--" + edge.key} aria-hidden="true" onPointerDown={(e) => startResize(e, edge)} />)}
    </aside>
  );
}
