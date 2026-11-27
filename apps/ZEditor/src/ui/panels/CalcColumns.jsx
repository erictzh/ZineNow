// Data panel, Advanced tab: calculated columns. Pick a kind from a menu, fill in a few choices, and the new column appears among the fields.

import { CALC_KINDS, DEFAULTS, calculate, describe, usableName } from "../../model/dataMerge/calc.js";
const { useState } = React;

const SEPARATORS = [[" ", "a space"], [", ", "a comma"], [" - ", "a dash"], ["", "nothing"], [" / ", "a slash"]];

export function CalcColumns({ headers, fileHeaders, records, recordNo, defs, onAdd, onRemove }) {
  const [draft, setDraft] = useState(null); // { kind, name, ...settings } while the form is open
  const columnSelect = (key, label) => (
    <label className="ze-data-row">{label}{" "}
      <select value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}>
        <option value="">Choose…</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </label>
  );
  const choose = (kind) => setDraft({ ...DEFAULTS[kind], kind, name: CALC_KINDS.find((k) => k.key === kind).label });
  const sample = draft ? calculate(draft, records[recordNo] || {}, recordNo) : "";
  const ready = Boolean(draft && draft.kind) && (draft.kind === "join" ? draft.columns.filter(Boolean).length > 0 : !CALC_KINDS.find((k) => k.key === draft.kind).needs.includes("column") || draft.column);
  function add() {
    const name = usableName(draft.name, headers);
    if (!name) return;
    const { name: _ignored, ...rest } = draft;
    onAdd({ ...rest, name, ...(draft.kind === "join" ? { columns: draft.columns.filter(Boolean) } : {}) });
    setDraft(null);
  }
  return (
    <div className="ze-data-section">
      <div className="ze-data-title">Calculated columns</div>
      <p className="ze-data-help">Make a new column from the ones in your file, for example initials, an age from a birthday, or two columns joined. It shows among the fields.</p>
      {defs.map((def) => (
        <div key={def.name} className="ze-data-calc-row">
          <span title={describe(def)}><strong>{def.name}</strong> <span className="ze-data-help">{describe(def)}</span></span>
          <button type="button" className="ze-data-link" aria-label={"Remove " + def.name} onClick={() => onRemove(def.name)}>Remove</button>
        </div>
      ))}
      {!draft && <button type="button" className="ze-btn ze-data-wide" onClick={() => setDraft({ kind: "", name: "" })}>+ New column</button>}
      {draft && (
        <div className="ze-data-calc-form">
          <label className="ze-data-row">Kind{" "}
            <select value={draft.kind} onChange={(e) => e.target.value ? choose(e.target.value) : setDraft({ kind: "", name: "" })}>
              <option value="">Choose…</option>
              {CALC_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </label>
          {draft.kind && <p className="ze-data-help">{CALC_KINDS.find((k) => k.key === draft.kind).help}</p>}
          {draft.kind === "rownumber" && (
            <div className="ze-data-row">Start at <input className="ze-data-num" type="number" value={draft.start} onChange={(e) => setDraft({ ...draft, start: Number(e.target.value) || 0 })} />
              {" "}Digits <input className="ze-data-num" type="number" min="0" max="8" value={draft.pad} onChange={(e) => setDraft({ ...draft, pad: Math.max(0, Math.min(8, Number(e.target.value) || 0)) })} /></div>
          )}
          {draft.kind === "join" && (
            <>
              {[0, 1, 2].map((i) => (
                <label key={i} className="ze-data-row">{i === 0 ? "First" : "Then"}{" "}
                  <select value={draft.columns[i] || ""} onChange={(e) => { const columns = draft.columns.slice(); columns[i] = e.target.value; setDraft({ ...draft, columns }); }}>
                    <option value="">{i === 0 ? "Choose…" : "(none)"}</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
              <label className="ze-data-row">Between them{" "}
                <select value={draft.separator} onChange={(e) => setDraft({ ...draft, separator: e.target.value })}>{SEPARATORS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select>
              </label>
            </>
          )}
          {["initials", "word", "case", "text", "math", "age", "dateparts"].includes(draft.kind) && columnSelect("column", "Column")}
          {draft.kind === "initials" && (
            <label className="ze-data-row">Letters{" "}<select value={draft.max} onChange={(e) => setDraft({ ...draft, max: Number(e.target.value) })}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
          )}
          {draft.kind === "word" && (
            <label className="ze-data-row">Which{" "}<select value={draft.which} onChange={(e) => setDraft({ ...draft, which: e.target.value })}><option value="first">First word</option><option value="last">Last word</option><option value="allbutlast">All but the last word</option></select></label>
          )}
          {draft.kind === "case" && (
            <label className="ze-data-row">Style{" "}<select value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value })}><option value="upper">UPPER CASE</option><option value="lower">lower case</option><option value="title">Title Case</option></select></label>
          )}
          {draft.kind === "text" && (
            <>
              <label className="ze-data-row">Before <input type="text" value={draft.before} onChange={(e) => setDraft({ ...draft, before: e.target.value })} /></label>
              <label className="ze-data-row">After <input type="text" value={draft.after} onChange={(e) => setDraft({ ...draft, after: e.target.value })} /></label>
            </>
          )}
          {draft.kind === "math" && (
            <div className="ze-data-row">
              <select value={draft.op} onChange={(e) => setDraft({ ...draft, op: e.target.value })}><option value="+">add</option><option value="-">subtract</option><option value="*">multiply by</option><option value="/">divide by</option></select>
              <input className="ze-data-num" type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
            </div>
          )}
          {draft.kind === "dateparts" && (
            <label className="ze-data-row">Part{" "}<select value={draft.part} onChange={(e) => setDraft({ ...draft, part: e.target.value })}><option value="year">Year</option><option value="monthname">Month name</option><option value="month">Month number</option><option value="day">Day</option></select></label>
          )}
          {draft.kind && (
            <>
              <label className="ze-data-row">Name <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <p className="ze-data-help">{ready ? "Row " + (recordNo + 1) + " gives: " + (sample === "" ? "(nothing)" : "“" + sample + "”") : "Choose the column."}</p>
              <div className="ze-data-row">
                <button type="button" className="ze-btn ze-btn-primary" disabled={!ready || !usableName(draft.name, headers)} onClick={add}>Add column</button>
                <button type="button" className="ze-btn" onClick={() => setDraft(null)}>Cancel</button>
              </div>
            </>
          )}
          {!draft.kind && <button type="button" className="ze-btn" onClick={() => setDraft(null)}>Cancel</button>}
        </div>
      )}
    </div>
  );
}
