// Collapsible panel section (remembers open/closed per section).

const { useState, useRef, useEffect } = React;

// ---- Collapsible sections, CapCut-style. Every group of controls in the
// Format panel is one of these: an optional checkbox that switches the
// feature on (an unchecked section stays collapsed), a title that
// expands/collapses it, an optional "?" tooltip, a summary of the current
// value and an optional reset button. Whether a section is open is
// remembered by `id`, so it stays as you left it when you select
// something else.
const sectionOpenMemory = {};

// The essential sections of each panel, the ones a beginner should start with: their title gets an
// orange star. Listed here by id so every panel is marked in one place (a section can also pass `essential`).
export const ESSENTIAL_SECTIONS = new Set([
  "text.basic", "text.styles", "text.letters",                                // text box
  "image.filters", "image.filter",                                            // image: Photo Adjustments, Style
  "rect.fill", "rect.transform", "rect.wrap", "ellipse.wrap",                 // rectangle / ellipse (and their tool)
]);

export function PanelSection({ id, title, checked, onToggle, disabled, defaultOpen = false, group, hint, summary, onReset, essential, children }) {
  const isEssential = essential != null ? essential : ESSENTIAL_SECTIONS.has(id);
  const hasToggle = typeof onToggle === "function";
  const expandable = children != null && children !== false;
  const [open, setOpenState] = useState(() => (id in sectionOpenMemory ? sectionOpenMemory[id] : defaultOpen));
  const setOpen = (value) => { sectionOpenMemory[id] = value; setOpenState(value); };
  // Turning a feature on opens its controls.
  const wasChecked = useRef(checked);
  useEffect(() => {
    if (checked && !wasChecked.current && expandable) setOpen(true);
    wasChecked.current = checked;
  }, [checked]);
  const isOff = hasToggle && !checked;
  const isOpen = expandable && open && !isOff;
  function clickTitle() {
    if (isOff) { if (!disabled) onToggle(true); }
    else if (expandable) setOpen(!open);
    else if (hasToggle && !disabled) onToggle(false);
  }
  return (
    <section className={"ze-sec" + (isOpen ? " is-open" : "") + (isOff ? " is-off" : "")}>
      <div className="ze-sec-head">
        {hasToggle && (
          <input type="checkbox" className="ze-sec-check" checked={Boolean(checked)} disabled={disabled} aria-label={title} onChange={(e) => onToggle(e.target.checked)} />
        )}
        <button type="button" className="ze-sec-title" aria-expanded={expandable ? isOpen : undefined} onClick={clickTitle}>
          {isEssential && (
            <svg className="ze-sec-star" viewBox="0 0 24 24" width="11" height="11" aria-label="Essential" role="img">
              <title>Essential: start here</title>
              <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" />
            </svg>
          )}
          <span className="ze-sec-name">{title}</span>
          {expandable && (
            <svg className={"ze-sec-caret" + (isOff ? " is-hidden" : "")} viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
            </svg>
          )}
          {hint && <span className="ze-sec-help" title={hint}>?</span>}
          {summary && !isOpen && <span className="ze-sec-summary">{summary}</span>}
        </button>
        {onReset && isOpen && (
          <button type="button" className="ze-sec-reset" title="Reset to defaults" aria-label={"Reset " + title} onClick={onReset}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
        )}
      </div>
      {isOpen && <div className={"ze-sec-body" + (group ? " is-group" : "")}>{children}</div>}
    </section>
  );
}

// Setting these to undefined puts a control list back to its defaults.
export const resetPatch = (controls) => Object.fromEntries(controls.map((c) => [c.prop, undefined]));
