// Welcome pop-up shown when ZEditor opens with nothing loaded: start a new document, or open an
// existing ZineNow project (.znow) or a PDF.

const { useEffect, useState } = React;

const OPEN_KINDS = [
  { key: "project", label: "ZineNow project (.znow)", hint: "Keep editing a zine you saved." },
  { key: "pdf", label: "PDF file", hint: "Its pages become the zine's pages." },
];

export function WelcomeDialog({ open, onNewDocument, onOpenProject, onOpenPdf, onClose }) {
  const [kind, setKind] = useState("project");
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  const chosen = OPEN_KINDS.find((k) => k.key === kind);
  return (
    <div className="ze-modal-backdrop">
      <div className="ze-modal ze-modal--welcome" role="dialog" aria-labelledby="ze-welcome-title">
        <button type="button" className="ze-welcome-close" aria-label="Close" title="Close (Esc)" onClick={onClose}>×</button>
        <div className="ze-welcome-title" id="ze-welcome-title">Let's make a Zine!</div>
        <p className="ze-welcome-lead">Start something new, or open what you have.</p>

        <button type="button" className="ze-welcome-option" onClick={onNewDocument}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 3h8l4 4v14H6z" />
            <path d="M14 3v4h4" />
            <path d="M12 11v6M9 14h6" />
          </svg>
          <span className="ze-welcome-option-text">
            <strong>New document</strong>
            <span>Blank pages in A5, A4, Digest… or your own size.</span>
          </span>
        </button>

        <div className="ze-welcome-option ze-welcome-open">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
            <path d="M3 7v11a2 2 0 0 0 2 2h13l3-9H7l-3 9" />
          </svg>
          <span className="ze-welcome-option-text">
            <strong>Open existing</strong>
            <span>{chosen.hint}</span>
            <span className="ze-welcome-open-row">
              <select className="ze-format-select" aria-label="What to open" value={kind} onChange={(e) => setKind(e.target.value)}>
                {OPEN_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              <button type="button" className="btn-solid" onClick={kind === "pdf" ? onOpenPdf : onOpenProject}>Open…</button>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
