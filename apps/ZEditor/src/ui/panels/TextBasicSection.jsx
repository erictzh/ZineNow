// Font, size, style and alignment section of the text panel.

import { TEXT_COLOR_SWATCHES, TEXT_FILL_ALPHA_CONTROL } from "../../model/text/textControls.js";
import { ControlList } from "../controls/ControlList.jsx";
import { FontCombobox } from "../controls/FontCombobox.jsx";
import { CustomColorInput } from "../controls/inputs.jsx";
import { PanelSection } from "../controls/PanelSection.jsx";

// Font, size, B/I/U, alignment and colour: one section shared by a text
// box's own panel and the Text tool's defaults.
export function TextBasicSection({ fontOptions, setFontOptions, fontFamily, fontSize, bold, italic, underline, align, color, fillAlphaSource, onFillAlpha, onChange }) {
  return (
    <PanelSection id="text.basic" title="Basic" defaultOpen>
      <div className="ze-format-field">
        <span className="ze-format-label">Font</span>
        <FontCombobox fontOptions={fontOptions} setFontOptions={setFontOptions} value={fontFamily} onChange={(v) => onChange({ fontFamily: v })} />
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Size &amp; style</span>
        <div className="ze-format-inline">
          <input
            type="number" className="ze-format-number" min="8" max="200" aria-label="Font size (px)"
            value={fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) || 16 })}
          />
          <button type="button" className={"ze-format-toggle" + (bold ? " active" : "")} title="Bold" onClick={() => onChange({ bold: !bold })}><strong>B</strong></button>
          <button type="button" className={"ze-format-toggle" + (italic ? " active" : "")} title="Italic" onClick={() => onChange({ italic: !italic })}><em>I</em></button>
          <button type="button" className={"ze-format-toggle" + (underline ? " active" : "")} title="Underline" onClick={() => onChange({ underline: !underline })}><span style={{ textDecoration: "underline" }}>U</span></button>
        </div>
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label" title="Resize the box (drag its corner while editing) to see centering/right-align take effect.">Align</span>
        <div className="ze-format-row">
          <button type="button" className={"ze-format-toggle" + (align === "left" ? " active" : "")} title="Align left" onClick={() => onChange({ align: "left" })}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h13" /></svg>
          </button>
          <button type="button" className={"ze-format-toggle" + (align === "center" ? " active" : "")} title="Align center" onClick={() => onChange({ align: "center" })}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M7 12h10M5.5 18h13" /></svg>
          </button>
          <button type="button" className={"ze-format-toggle" + (align === "right" ? " active" : "")} title="Align right" onClick={() => onChange({ align: "right" })}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M10 12h10M7 18h13" /></svg>
          </button>
        </div>
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Color</span>
        <div className="ze-format-row ze-format-swatches">
          {TEXT_COLOR_SWATCHES.map((c) => (
            <button key={c} type="button" className={"ze-format-swatch" + (color === c ? " active" : "")} style={{ backgroundColor: c }} title={c} onClick={() => onChange({ color: c })} />
          ))}
          <CustomColorInput value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#1a1a1a"} onChange={(c) => onChange({ color: c })} />
        </div>
      </div>
      {fillAlphaSource && <ControlList controls={[TEXT_FILL_ALPHA_CONTROL]} source={fillAlphaSource} onPatch={onFillAlpha} />}
    </PanelSection>
  );
}
