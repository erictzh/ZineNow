// Per-letter colour section of the text panel.

import { setRunColor } from "../../model/text/colorRuns.js";
import { TEXT_COLOR_SWATCHES } from "../../model/text/textControls.js";
import { CustomColorInput } from "../controls/inputs.jsx";
import { textSelectionStore } from "../textSelection.js";
const { useState } = React;

// The text panel's "colour individual letters" section. It colours
// whatever was last selected inside this box's editor; the swatches don't
// take focus when pressed, so the selection stays put while you pick.
export function LetterColors({ ann, patch }) {
  const [message, setMessage] = useState(null);
  const keepFocus = (e) => e.preventDefault();
  function applyColor(color) {
    const text = ann.text || "";
    const { annId, start } = textSelectionStore;
    const end = Math.min(textSelectionStore.end, text.length);
    if (annId !== ann.id || end <= start) {
      setMessage("Double-click the text and select some letters first.");
      return;
    }
    setMessage(null);
    patch({ colorRuns: setRunColor(ann.colorRuns, start, end, color) });
  }
  const count = (ann.colorRuns || []).reduce((total, run) => total + run.end - run.start, 0);
  return (
    <div className="ze-format-field">
      <div className="ze-format-row ze-format-swatches" onMouseDown={keepFocus}>
        {TEXT_COLOR_SWATCHES.map((c) => (
          <button key={c} type="button" className="ze-format-swatch" style={{ backgroundColor: c }} title={"Color the selected letters " + c} onClick={() => applyColor(c)} />
        ))}
        <CustomColorInput value="#dd531a" onChange={applyColor} />
      </div>
      <div className="ze-format-row" onMouseDown={keepFocus}>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => applyColor(null)}>Reset selected</button>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={!count} onClick={() => { setMessage(null); patch({ colorRuns: undefined }); }}>Reset all</button>
      </div>
      <span className="ze-format-hint">{message || (count ? count + " letter" + (count === 1 ? "" : "s") + " colored. Select letters while editing, then pick a color." : "Double-click the text, select some letters, then pick a color.")}</span>
    </div>
  );
}
