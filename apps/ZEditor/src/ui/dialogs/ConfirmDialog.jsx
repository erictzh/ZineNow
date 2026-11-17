// Two-step "this erases your work" confirmation.

export function ConfirmDialog({ step, onProceed, onYes, onCancel }) {
  if (!step) return null;
  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head">{step === 1 ? "This will erase your unsaved edits" : "Confirm"}</div>
        <div className="ze-modal-body">
          <p className="ze-format-hint" style={{ margin: 0 }}>
            {step === 1
              ? "This will ERASE all your current unsaved edits."
              : "Are you sure to proceed?"}
          </p>
        </div>
        <div className="ze-modal-actions">
          <button type="button" onClick={onCancel}>Back</button>
          {step === 1 ? (
            <button type="button" className="btn-solid" onClick={onProceed}>Proceed</button>
          ) : (
            <button type="button" className="btn-solid" onClick={onYes}>Yes</button>
          )}
        </div>
      </div>
    </div>
  );
}
