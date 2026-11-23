// Asks before the AI model is downloaded (and before it is deleted). Short on purpose: what is downloaded and from where, that it
// stays on the device, and the cost.

export function AiModelDialog({ mode, plan, onConfirm, onCancel }) {
  if (!mode || !plan) return null;
  const mb = (n) => Math.round(n);
  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal" role="dialog" aria-label={mode === "download" ? "Download the AI model" : "Delete the AI model"} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head">{mode === "download" ? "Download AI model?" : "Delete AI model?"}</div>
        <div className="ze-modal-body">
          {mode === "download" ? (
            <ul className="ze-ai-points">
              <li><b>What:</b> an AI object-remover model (MI-GAN, {mb(plan.modelMb)} MB) from <b>huggingface.co</b>, plus its runtime (about {mb(plan.runtimeMb)} MB) from <b>cdn.jsdelivr.net</b>. About {plan.totalMb} MB in total.</li>
              <li><b>Private:</b> it is a local AI model. It runs on your device and no file or picture leaves it.</li>
              <li><b>Cost:</b> it may cause lag on lower-end devices. You can delete it later (Delete model button).</li>
            </ul>
          ) : (
            <ul className="ze-ai-points">
              <li>This removes the AI model and its runtime from this device (about {plan.totalMb} MB).</li>
              <li>Ai Tools (Local) uses the same files, so it will need to download them again.</li>
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
