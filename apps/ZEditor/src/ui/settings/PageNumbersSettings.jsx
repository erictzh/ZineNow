// Page-number settings.

import { ColorPickerButton } from "../controls/ColorPicker.jsx";
import { PAGE_NUMBER_FORMATS, PAGE_NUMBER_POSITIONS } from "../../model/pageNumbers.js";
import { SelectInput } from "../controls/inputs.jsx";
import { NumberBox } from "../../../../../shared/js/NumberBox.jsx";

// ---- Page number settings — which pages are numbered (from / to), the
// first number, and the look.
export function PageNumbersSettings({ settings, pageCount, onChange }) {
  const whole = (value, fallback, min = 0) => Math.max(min, Math.round(Number(value)) || fallback);
  return (
    <React.Fragment>
      <label className="ze-format-field">
        <span className="ze-format-label">Start numbering on page</span>
        <NumberBox className="ze-format-number" min="1" max={Math.max(1, pageCount)} value={settings.from} onChange={(e) => onChange({ from: whole(e.target.value, 1, 1) })} />
      </label>
      <label className="ze-format-field">
        <span className="ze-format-label">Stop after page (empty = last)</span>
        <NumberBox className="ze-format-number" min="1" max={Math.max(1, pageCount)} placeholder="last" data-allow-empty value={settings.to || ""} onChange={(e) => onChange({ to: e.target.value === "" ? 0 : whole(e.target.value, 0, 1) })} />
      </label>
      <label className="ze-format-field">
        <span className="ze-format-label">First page shows number</span>
        <NumberBox className="ze-format-number" step="1" value={settings.first} onChange={(e) => onChange({ first: Math.round(Number(e.target.value)) || 0 })} />
      </label>
      <div className="ze-format-field">
        <span className="ze-format-label">Position</span>
        <SelectInput options={PAGE_NUMBER_POSITIONS} value={settings.position} onChange={(position) => onChange({ position })} />
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Style</span>
        <SelectInput options={PAGE_NUMBER_FORMATS} value={settings.format} onChange={(format) => onChange({ format })} />
      </div>
      <label className="ze-format-field">
        <span className="ze-format-label">Size (pt)</span>
        <NumberBox className="ze-format-number" min="4" max="48" value={settings.size} onChange={(e) => onChange({ size: Math.min(48, whole(e.target.value, 10, 4)) })} />
      </label>
      <label className="ze-format-field">
        <span className="ze-format-label">Distance from edge (in)</span>
        <NumberBox className="ze-format-number" min="0" max="3" step="0.05" value={settings.marginIn} onChange={(e) => onChange({ marginIn: Math.max(0, Number(e.target.value) || 0) })} />
      </label>
      <div className="ze-format-field">
        <span className="ze-format-label">Color</span>
        <ColorPickerButton ariaLabel="Page number colour" value={settings.color} onChange={(hex) => onChange({ color: hex })} />
      </div>
      <span className="ze-format-hint">
        Pages are counted by their place in the document. "Outer corner" puts odd pages on the right and even pages on the left, like a printed booklet. Drawn on top of everything in Export PDF and Send to ZineArranger.
      </span>
    </React.Fragment>
  );
}
