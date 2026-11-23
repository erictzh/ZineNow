// Image panel: "Remove background" with an on-device AI model (U²-Netp, Apache-2.0). The model is an opt-in download (same flow as the
// AI fill style: confirm popup, progress, Cancel, Delete). The result replaces the picture with the subject only; Undo brings it back.

import { PanelSection } from "../../controls/PanelSection.jsx";
import { StepperNumberInput } from "../../controls/inputs.jsx";
import { AiModelDialog } from "../../dialogs/AiModelDialog.jsx";
import { useAiModel } from "../../../state/useAiModel.js";
const { useState } = React;

export function RemoveBackgroundSection({ ann, onRemoveBackground, disabled }) {
  const ai = useAiModel("background");
  const [dialog, setDialog] = useState(null);
  const [cutoff, setCutoff] = useState(50);
  const [soft, setSoft] = useState(10);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const run = async () => {
    setError(""); setBusy("Starting…");
    try { await onRemoveBackground(ann, { cutoff: cutoff / 100, soft: Math.max(1, soft) / 100 }, setBusy); }
    catch (e) { setError(e && e.message ? e.message : String(e)); }
    finally { setBusy(""); }
  };
  return (
    <PanelSection
      id="image.removebg"
      title="Remove background"
      hint="An AI model that runs on your device finds the main subject and makes everything else see-through. It works best on one clear subject. Nothing is uploaded. Not right? Undo (Ctrl+Z), change the numbers and run it again."
    >
      <div className="ze-ai-box">
        <b>AI model</b>
        {ai.phase === "checking" && <span className="ze-format-hint">Checking…</span>}
        {ai.phase === "none" && (
          <React.Fragment>
            <span className="ze-format-hint">Not downloaded. It is only downloaded if you choose to.</span>
            <button type="button" className="ze-format-toggle ze-format-toggle-wide active" onClick={() => setDialog("download")}>Download AI model{ai.plan ? " (about " + ai.plan.totalMb + " MB)" : ""}</button>
          </React.Fragment>
        )}
        {ai.phase === "downloading" && (
          <React.Fragment>
            <progress className="ze-ai-progress" max={ai.totalMb || 1} value={ai.doneMb} />
            <span className="ze-format-hint">Downloading… {ai.doneMb.toFixed(1)} of {ai.totalMb.toFixed(1)} MB</span>
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={ai.cancel}>Cancel download</button>
          </React.Fragment>
        )}
        {ai.phase === "ready" && (
          <React.Fragment>
            <span className="ze-format-hint">Downloaded: runs on this device, works offline.</span>
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => setDialog("delete")}>Delete model</button>
          </React.Fragment>
        )}
        {ai.error && <span className="ze-format-hint is-error">{ai.error}</span>}
      </div>
      {ai.phase === "ready" && (
        <React.Fragment>
          <div className="ze-format-field">
            <span className="ze-format-label">Edge cut-off (%)</span>
            <StepperNumberInput min={5} max={95} step={5} label="Edge cut-off" value={cutoff} onChange={setCutoff} />
            <span className="ze-format-hint">Higher keeps less of the edge (a tighter cut). Lower keeps more.</span>
          </div>
          <div className="ze-format-field">
            <span className="ze-format-label">Soft edge (%)</span>
            <StepperNumberInput min={1} max={50} step={5} label="Soft edge" value={soft} onChange={setSoft} />
            <span className="ze-format-hint">How gradually the edge fades. Higher is softer.</span>
          </div>
          <button type="button" className="ze-format-toggle ze-format-toggle-wide active" disabled={disabled || Boolean(busy)} onClick={run}>{busy || "Remove background"}</button>
        </React.Fragment>
      )}
      {error && <span className="ze-format-hint is-error">{error}</span>}
      <AiModelDialog
        kind="background" mode={dialog} plan={ai.plan} onCancel={() => setDialog(null)}
        onConfirm={() => { const mode = dialog; setDialog(null); if (mode === "download") ai.download(); else ai.remove(); }}
      />
    </PanelSection>
  );
}
