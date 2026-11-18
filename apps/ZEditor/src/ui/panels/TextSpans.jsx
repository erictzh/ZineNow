// "Custom Text Style (span)" section of the text panel: restyle just the selected letters
// (colour, font, size, bold, italic, underline, strike-through) or the selected paragraphs' alignment.

import { clearRunProps, runAt, setRunProps } from "../../model/text/colorRuns.js";
import { TEXT_COLOR_SWATCHES } from "../../model/text/textControls.js";
import { ptToPx, pxToPt } from "../../model/text/textLook.js";
import { FontCombobox } from "../controls/FontCombobox.jsx";
import { CustomColorInput } from "../controls/inputs.jsx";
import { textSelectionStore } from "../textSelection.js";
const { useState } = React;

const ALIGNS = [
  { key: "left", label: "Align left", path: "M4 6h16M4 12h10M4 18h13" },
  { key: "center", label: "Align center", path: "M4 6h16M7 12h10M5.5 18h13" },
  { key: "right", label: "Align right", path: "M4 6h16M10 12h10M7 18h13" },
  { key: "justify", label: "Justify", path: "M4 6h16M4 12h16M4 18h16" },
];

// It works on whatever was last selected inside this box's editor. Buttons and
// swatches don't take focus when pressed, so the selection stays put while you pick.
export function TextSpans({ ann, patch, fontOptions, setFontOptions }) {
  const [message, setMessage] = useState(null);
  const keepFocus = (e) => e.preventDefault();
  const text = ann.text || "";
  const runs = ann.colorRuns;

  // The selected range in this box, or null (with a hint shown) when there isn't one.
  function selection(allowCaret) {
    const { annId, start } = textSelectionStore;
    const end = Math.min(textSelectionStore.end, text.length);
    if (annId !== ann.id || end < start || (!allowCaret && end === start)) {
      setMessage(allowCaret ? "Double-click the text and put the caret in a paragraph first." : "Double-click the text and select some letters first.");
      return null;
    }
    setMessage(null);
    return { start, end };
  }
  const setProps = (props) => {
    const sel = selection(false);
    if (sel) patch({ colorRuns: setRunProps(runs, sel.start, sel.end, props) });
  };
  // What the selection's first letter shows now: its span's setting, else the box's.
  const current = (key) => {
    const { annId, start } = textSelectionStore;
    const run = annId === ann.id ? runAt(runs, start) : null;
    return run && run[key] != null ? run[key] : ann[key];
  };
  const toggle = (key) => setProps({ [key]: !current(key) });
  const strikeNow = () => {
    const { annId, start } = textSelectionStore;
    const run = annId === ann.id ? runAt(runs, start) : null;
    return run && run.strike != null ? run.strike : Boolean(ann.strike && ann.strike !== "none");
  };
  // Alignment belongs to whole paragraphs: every paragraph the selection (or caret) touches.
  function setAlign(align) {
    const sel = selection(true);
    if (!sel) return;
    const from = text.lastIndexOf("\n", sel.start - 1) + 1;
    let to = text.indexOf("\n", sel.end);
    if (to < 0) to = text.length;
    patch({ colorRuns: setRunProps(runs, from, Math.max(to, from + 1), { align }) });
  }
  // The size box keeps what you type until Enter or leaving it, then sizes the selected letters.
  const [sizeDraft, setSizeDraft] = useState(null);
  function applySize() {
    if (sizeDraft == null) return;
    const pt = Number(sizeDraft);
    setSizeDraft(null);
    if (pt > 0) setProps({ fontSize: Math.round(ptToPx(pt) * 1000) / 1000 });
  }
  const count = (runs || []).reduce((total, run) => total + run.end - run.start, 0);

  return (
    <div className="ze-format-field">
      <div className="ze-format-field">
        <span className="ze-format-label">Font</span>
        <FontCombobox fontOptions={fontOptions} setFontOptions={setFontOptions} value={current("fontFamily")} onChange={(v) => setProps({ fontFamily: v })} />
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Size</span>
        <div className="ze-format-inline">
          <input
            type="number" className="ze-format-number" min="4" max="200" step="0.5" aria-label="Size of the selected letters (pt)"
            title="Size of the selected letters (pt). Press Enter or leave the box to apply."
            value={sizeDraft != null ? sizeDraft : Math.round(pxToPt(current("fontSize") || 16) * 10) / 10}
            onChange={(e) => setSizeDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applySize(); }}
            onBlur={applySize}
          />
          <span className="ze-format-hint" style={{ margin: 0 }}>pt</span>
        </div>
      </div>
      <div className="ze-format-field" onMouseDown={keepFocus}>
        <span className="ze-format-label">Style</span>
        <div className="ze-format-row">
          <button type="button" className="ze-format-toggle" title="Bold the selected letters" onClick={() => toggle("bold")}><strong>B</strong></button>
          <button type="button" className="ze-format-toggle" title="Italicize the selected letters" onClick={() => toggle("italic")}><em>I</em></button>
          <button type="button" className="ze-format-toggle" title="Underline the selected letters" onClick={() => toggle("underline")}><span style={{ textDecoration: "underline" }}>U</span></button>
          <button type="button" className="ze-format-toggle" title="Strike through the selected letters" onClick={() => setProps({ strike: !strikeNow() })}><span style={{ textDecoration: "line-through" }}>S</span></button>
        </div>
      </div>
      <div className="ze-format-field" onMouseDown={keepFocus}>
        <span className="ze-format-label" title="Applies to the whole paragraphs the selection or caret is in">Paragraph align</span>
        <div className="ze-format-row">
          {ALIGNS.map((a) => (
            <button key={a.key} type="button" className="ze-format-toggle" title={a.label + " (the selected paragraphs)"} onClick={() => setAlign(a.key)}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d={a.path} /></svg>
            </button>
          ))}
        </div>
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Color</span>
        <div className="ze-format-row ze-format-swatches" onMouseDown={keepFocus}>
          {TEXT_COLOR_SWATCHES.map((c) => (
            <button key={c} type="button" className="ze-format-swatch" style={{ backgroundColor: c }} title={"Color the selected letters " + c} onClick={() => setProps({ color: c })} />
          ))}
          <CustomColorInput value="#dd531a" onChange={(c) => setProps({ color: c })} />
        </div>
      </div>
      <div className="ze-format-row" onMouseDown={keepFocus}>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" title="The selected letters go back to the box's own settings" onClick={() => { const sel = selection(false); if (sel) patch({ colorRuns: clearRunProps(runs, sel.start, sel.end) }); }}>Reset selected</button>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={!count} onClick={() => { setMessage(null); patch({ colorRuns: undefined }); }}>Reset all</button>
      </div>
      <span className="ze-format-hint">{message || (count
        ? count + " letter" + (count === 1 ? "" : "s") + " customized. Select letters while editing, then change them here."
        : "Double-click the text, select some letters, then change them here. The rest of the box keeps its own settings.")}</span>
    </div>
  );
}
