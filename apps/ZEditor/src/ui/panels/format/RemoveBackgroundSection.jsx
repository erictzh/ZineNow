// Image panel: "AI Background Removal" with an on-device model of your choice (U²-Netp General, MODNet Portrait). Each model is an opt-in
// download (confirm popup, progress, Cancel, Delete); the panel says which model it is, its licence, its size and where it comes from.
// The result replaces the picture with the subject only; Undo brings it back.

import { NumberBox } from "../../../../../../shared/js/NumberBox.jsx";
import { BG_MODELS, bgModel } from "../../../../../../shared/js/ai/bgModel.js";
import { PanelSection } from "../../controls/PanelSection.jsx";
import { AiModelDialog } from "../../dialogs/AiModelDialog.jsx";
import { useAiModel } from "../../../state/useAiModel.js";
const { useState } = React;

const DEFAULT_CUTOFF = 0.1; // % (the useful cut-offs are very small: the models answer close to 0 on the background)

// A decimal number box: any value in min..max may be typed (0.05), the - and + buttons move by `step`.
function DecimalBox({ value, onChange, min, max, step, label, disabled }) {
  const [draft, setDraft] = useState(null);
  return (
    <NumberBox
      className="ze-format-number" min={min} max={max} step={step} aria-label={label} disabled={disabled}
      value={draft != null ? draft : value}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export function RemoveBackgroundSection({ ann, onRemoveBackground, disabled }) {
  const [modelKey, setModelKey] = useState(BG_MODELS[0].key);
  const info = bgModel(modelKey);
  const ai = useAiModel("background", modelKey);
  const [dialog, setDialog] = useState(null);
  const [cutoff, setCutoff] = useState(DEFAULT_CUTOFF);
  const [soft, setSoft] = useState(10);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const ready = ai.phase === "ready";
  const run = async () => {
    setError(""); setBusy("Starting…");
    try { await onRemoveBackground(ann, { model: modelKey, cutoff: cutoff / 100, soft: Math.max(0.1, soft) / 100 }, setBusy); }
    catch (e) { setError(e && e.message ? e.message : String(e)); }
    finally { setBusy(""); }
  };
  return (
    <PanelSection
      id="image.removebg"
      title="AI Background Removal"
      hint="An AI model that runs on your device finds the main subject and makes everything else see-through. It works best on one clear subject. Nothing is uploaded. Not right? Undo (Ctrl+Z), change the numbers and run it again."
    >
      <div className="ze-format-field">
        <span className="ze-format-label">Model</span>
        {BG_MODELS.map((m) => (
          <label className="ze-format-check" key={m.key}>
            <input type="radio" name="ze-bg-model" checked={modelKey === m.key} onChange={() => { setModelKey(m.key); setError(""); }} />
            <span>{m.label} · {m.mb} MB</span>
          </label>
        ))}
      </div>
      <div className="ze-ai-box">
        <b>{info.name} ({info.kind})</b>
        <span className="ze-format-hint">{info.about}</span>
        <span className="ze-format-hint">{info.licence} licence (free and open source). Downloaded from {info.repo}. It runs on your device and nothing is uploaded. It also needs the AI engine (ONNX Runtime Web, from cdn.jsdelivr.net), shared with the AI fill.</span>
        {ai.phase === "checking" && <span className="ze-format-hint">Checking…</span>}
        {ai.phase === "none" && (
          <button type="button" className="ze-format-toggle ze-format-toggle-wide active" onClick={() => setDialog("download")}>Download {info.name} (about {ai.plan ? ai.plan.totalMb : Math.round(info.mb)} MB)</button>
        )}
        {ai.phase === "downloading" && (
          <React.Fragment>
            <progress className="ze-ai-progress" max={ai.totalMb || 1} value={ai.doneMb} />
            <span className="ze-format-hint">Downloading… {ai.doneMb.toFixed(1)} of {ai.totalMb.toFixed(1)} MB</span>
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={ai.cancel}>Cancel download</button>
          </React.Fragment>
        )}
        {ready && (
          <React.Fragment>
            <span className="ze-format-hint">Downloaded: works offline.</span>
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => setDialog("delete")}>Delete {info.name}</button>
          </React.Fragment>
        )}
        {ai.error && <span className="ze-format-hint is-error">{ai.error}</span>}
      </div>
      <div className="ze-format-field" aria-disabled={!ready}>
        <span className="ze-format-label">Edge cut-off (%)</span>
        <DecimalBox min={0} max={100} step={0.125} label="Edge cut-off" value={cutoff} onChange={setCutoff} disabled={!ready} />
        {!ready ? <span className="ze-format-hint is-required">Download required</span> : <span className="ze-format-hint">Higher keeps less of the edge (a tighter cut). You can type finer values like 0.05.</span>}
      </div>
      <div className="ze-format-field" aria-disabled={!ready}>
        <span className="ze-format-label">Soft edge (%)</span>
        <DecimalBox min={0.1} max={50} step={0.5} label="Soft edge" value={soft} onChange={setSoft} disabled={!ready} />
        {!ready && <span className="ze-format-hint is-required">Download required</span>}
      </div>
      <button type="button" className="ze-format-toggle ze-format-toggle-wide active" disabled={!ready || disabled || Boolean(busy)} onClick={run}>{busy || "Remove background"}</button>
      {error && <span className="ze-format-hint is-error">{error}</span>}
      <AiModelDialog
        kind="background" info={info} mode={dialog} plan={ai.plan} onCancel={() => setDialog(null)}
        onConfirm={() => { const mode = dialog; setDialog(null); if (mode === "download") ai.download(); else ai.remove(); }}
      />
    </PanelSection>
  );
}
