// Asks before the AI model is downloaded (and before it is deleted). Short on purpose: what is downloaded and from where, that the model
// does not connect to the internet and nothing leaves the device, and the warning about lag on lower-end devices (wording by the user).

export function AiModelDialog({ mode, plan, onConfirm, onCancel, kind = "fill" }) {
  if (!mode || !plan) return null;
  const mb = (n) => Math.round(n);
  const bg = kind === "background";
  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal" role="dialog" aria-label={mode === "download" ? "Download the AI model" : "Delete the AI model"} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head">{mode === "download" ? "Download AI model?" : "Delete AI model?"}</div>
        <div className="ze-modal-body">
          {mode === "download" ? (
            <ul className="ze-ai-points">
              <li>{bg ? <>You are downloading an AI background-remover model (U²-Netp, about {plan.modelMb.toFixed(1)} MB) from <b>huggingface.co</b>,</> : <>You are downloading an AI object-remover model (MI-GAN, {mb(plan.modelMb)} MB) from <b>huggingface.co</b>,</>} plus its runtime (about {mb(plan.runtimeMb)} MB, skipped if you already have it) from <b>cdn.jsdelivr.net</b>. About {plan.totalMb} MB in total.</li>
              <li>The AI model will not connect to the internet. It runs on your device and no file or picture leaves your device.</li>
              <li><b>Warning:</b> it may freeze or cause lag on certain lower-end devices. You can delete it later (Delete model button).</li>
            </ul>
          ) : (
            <ul className="ze-ai-points">
              <li>This removes the {bg ? "background-removal" : "AI fill"} model from this device{bg ? "" : " (and the runtime, if the other AI model is not saved)"}. The runtime is only removed when no AI model needs it.</li>
              <li>Ai Tools (Local) uses the same runtime files, so it may need to download them again.</li>
              <li>You can download it again any time.</li>
            </ul>
          )}
        </div>
        <div className="ze-modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-solid" onClick={onConfirm}>{mode === "download" ? "Confirm Download" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}
