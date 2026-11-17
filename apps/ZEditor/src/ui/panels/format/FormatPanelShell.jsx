// The Format panel's frame (title bar + scrolling body) and the size readout several panels share.

// Every panel is a stack of collapsible sections (see PanelSection):
// the essentials open, everything else one click away, effects behind
// their own checkbox.
export function FormatPanelShell({ title, sections = true, children }) {
  return (
    <aside className="ze-format-panel">
      <div className="ze-format-panel-head">{title}</div>
      <div className={"ze-format-panel-body" + (sections ? " ze-sections" : "")}>{children}</div>
    </aside>
  );
}

export function SizeReadout({ ann }) {
  return (
    <div className="ze-format-field">
      <span className="ze-format-label">Size</span>
      <span className="ze-format-hint" style={{ display: "block", marginTop: 0 }}>{Math.round(ann.width)} × {Math.round(ann.height)} px</span>
    </div>
  );
}
