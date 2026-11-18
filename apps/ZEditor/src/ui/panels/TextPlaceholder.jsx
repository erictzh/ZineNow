// "Placeholder text" section of the text panel: fill the box with lorem ipsum or 中文假文.

import { MAX_PLACEHOLDER_PARAGRAPHS, PLACEHOLDER_KINDS, placeholderText } from "../../model/text/placeholderText.js";
import { PanelSection } from "../controls/PanelSection.jsx";

const { useState } = React;

export function TextPlaceholder({ ann, patch }) {
  const [kind, setKind] = useState("latin");
  const [count, setCount] = useState(3);
  const text = ann.text || "";
  // Colour runs belong to the old words, so they're dropped with them.
  const replace = () => patch({ text: placeholderText(kind, count), colorRuns: undefined });
  const append = () => patch({ text: (text && !text.endsWith("\n") ? text + "\n" : text) + placeholderText(kind, count) });
  return (
    <PanelSection
      id="text.placeholder" title="Placeholder text"
      hint="Fills the box with dummy text, to try a layout before the real words are ready. Each paragraph is a new line. In linked frames, the text flows on into the next frame."
    >
      <div className="ze-format-field">
        <span className="ze-format-label">Text</span>
        <div className="ze-format-inline">
          <select className="ze-format-select" aria-label="Placeholder language" value={kind} onChange={(e) => setKind(e.target.value)}>
            {PLACEHOLDER_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
          <input
            type="number" className="ze-format-number" min="1" max={MAX_PLACEHOLDER_PARAGRAPHS} step="1"
            aria-label="Paragraphs" title="Number of paragraphs" value={count}
            onChange={(e) => setCount(e.target.value)}
            onBlur={() => setCount(Math.max(1, Math.min(MAX_PLACEHOLDER_PARAGRAPHS, Math.round(Number(count)) || 1)))}
          />
          <span className="ze-format-hint" style={{ margin: 0 }}>¶</span>
        </div>
      </div>
      <div className="ze-format-row">
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={replace} title="Replace this box's text with the placeholder">Replace text</button>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={append} title="Add the placeholder after this box's text">Append</button>
      </div>
    </PanelSection>
  );
}
