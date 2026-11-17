// Small inputs: slider with number box, colour pickers, select, draft text input.

const { useState } = React;

// ---- Right-side panel. What it shows depends on context, in priority
// order: a selected annotation's own formatting first (text or
// stroke), then the active tool's drawing defaults (text/pen/
// highlighter), then an empty state. Clicking a toolbar tool clears
// any selection (see App's selectTool), so picking a tool reliably
// brings up that tool's own defaults here.
// Props for a text-style input paired with another control: it keeps
// its own text while being typed in, so it can be cleared or hold a
// partial value, and `commitText` decides when that text is usable.
function useDraftInputProps(value, commitText) {
  const [draft, setDraft] = useState(null);
  return {
    value: draft != null ? draft : value,
    onChange: (e) => { setDraft(e.target.value); commitText(e.target.value); },
    onBlur: () => setDraft(null),
  };
}

export function SliderNumberInput({ min, max, value, onChange }) {
  const numberProps = useDraftInputProps(value, (text) => {
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
  });
  return (
    <div className="ze-format-slider-row">
      <input
        type="range" className="ze-format-slider" min={min} max={max} step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input type="number" className="ze-format-number" min={min} max={max} step="1" {...numberProps} />
    </div>
  );
}

// The "pick any colour" control beside a row of preset swatches. A rainbow
// ring around the current colour and an eyedropper on top say what it is;
// the eyedropper is drawn in a difference blend so it shows on any colour.
export function CustomColorInput({ value, onChange }) {
  return (
    <label className="ze-custom-color" title="Custom color — pick any color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Custom color" />
      <span className="ze-custom-color-face" style={{ backgroundColor: value }} />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m2 22 1-1h3l9-9" />
        <path d="M3 21v-3l9-9" />
        <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
      </svg>
    </label>
  );
}

function HexColorInput({ value, onChange }) {
  const hexProps = useDraftInputProps(value, (text) => {
    const hex = "#" + text.trim().replace(/^#/, "");
    if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(hex.toLowerCase());
  });
  return (
    <div className="ze-format-slider-row">
      <input type="color" className="ze-format-color-input" value={value} onChange={(e) => onChange(e.target.value)} />
      <input type="text" className="ze-format-number" spellCheck="false" maxLength="7" aria-label="Hex color" {...hexProps} />
    </div>
  );
}

export function SelectInput({ options, value, onChange }) {
  return (
    <select className="ze-format-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

export const EFFECT_CONTROL_INPUTS = { slider: SliderNumberInput, color: HexColorInput, select: SelectInput };
