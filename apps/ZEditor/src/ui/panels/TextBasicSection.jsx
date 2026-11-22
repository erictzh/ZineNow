// Font, size, style and alignment section of the text panel.

import { TEXT_COLOR_SWATCHES, TEXT_FILL_ALPHA_CONTROL } from "../../model/text/textControls.js";
import { ptToPx, pxToPt } from "../../model/text/textLook.js";
import { sizeStepPatch } from "../../model/text/textSize.js";
import { ControlList } from "../controls/ControlList.jsx";
import { FontCombobox } from "../controls/FontCombobox.jsx";
import { CustomColorInput } from "../controls/inputs.jsx";
import { PanelSection } from "../controls/PanelSection.jsx";
import { NumberBox } from "../../../../../shared/js/NumberBox.jsx";

// Font, size, B/I/U, alignment and colour: one section shared by a text
// box's own panel and the Text tool's defaults.
// `verticalAlign` / `frameHeight` are passed for a text box (not the Text tool's defaults): they add
// the Vertical Align buttons, which only take effect once the box has a fixed height.
const VERTICAL_ALIGNS = [
  { key: "top", label: "Align top", path: "M4 4h16M12 8v12M8 12l4-4 4 4" },
  { key: "center", label: "Align middle", path: "M4 12h16M12 3v5M9.5 5.5 12 8l2.5-2.5M12 21v-5M9.5 18.5 12 16l2.5 2.5" },
  { key: "bottom", label: "Align bottom", path: "M4 20h16M12 4v12M8 12l4 4 4-4" },
];

// `onStepSize(deltaPt)`: what T- / T+ do for a text box (its own size and any letter sizes move together,
// ui/panels/format/TextFormat.jsx); without it (the Text tool's defaults) they change the font size alone.
export function TextBasicSection({ fontOptions, setFontOptions, fontFamily, fontSize, bold, italic, underline, align, verticalAlign, frameHeight, color, fillAlphaSource, onFillAlpha, onChange, onStepSize }) {
  const stepSize = (deltaPt) => {
    if (onStepSize) { onStepSize(deltaPt); return; }
    const patch = sizeStepPatch({ fontSize }, deltaPt);
    if (patch) onChange(patch);
  };
  return (
    <PanelSection id="text.basic" title="Text/Character" defaultOpen>
      <div className="ze-format-field">
        <span className="ze-format-label">Font</span>
        <FontCombobox fontOptions={fontOptions} setFontOptions={setFontOptions} value={fontFamily} onChange={(v) => onChange({ fontFamily: v })} />
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Size &amp; style</span>
        <div className="ze-format-inline ze-format-inline-wrap">
          <NumberBox
            className="ze-format-number" min="4" max="200" step="0.5" aria-label="Font size (pt)" title="Font size (pt)"
            value={Math.round(pxToPt(fontSize) * 10) / 10}
            onChange={(e) => { const pt = Number(e.target.value); if (pt > 0) onChange({ fontSize: Math.round(ptToPx(pt) * 1000) / 1000 }); }}
          />
          <span className="ze-format-hint" style={{ margin: 0 }}>pt</span>
          <span className="ze-format-group">
            <button type="button" className="ze-format-toggle ze-format-sizestep" aria-label="Smaller text" title="Smaller: takes 1 pt off the whole text box" onClick={() => stepSize(-1)}>T−</button>
            <button type="button" className="ze-format-toggle ze-format-sizestep" aria-label="Bigger text" title="Bigger: adds 1 pt to the whole text box" onClick={() => stepSize(1)}>T+</button>
          </span>
          <span className="ze-format-group">
            <button type="button" className={"ze-format-toggle" + (bold ? " active" : "")} title="Bold" onClick={() => onChange({ bold: !bold })}><strong>B</strong></button>
            <button type="button" className={"ze-format-toggle" + (italic ? " active" : "")} title="Italic" onClick={() => onChange({ italic: !italic })}><em>I</em></button>
            <button type="button" className={"ze-format-toggle" + (underline ? " active" : "")} title="Underline" onClick={() => onChange({ underline: !underline })}><span style={{ textDecoration: "underline" }}>U</span></button>
          </span>
        </div>
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label" title="Resize the box (drag its corner while editing) to see centering/right-align take effect.">Horizontal Align</span>
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
          <button type="button" className={"ze-format-toggle" + (align === "justify" ? " active" : "")} title="Justify (the last line stays left; more options in Paragraph)" onClick={() => onChange({ align: "justify" })}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>
      {verticalAlign !== undefined && (
        <div className="ze-format-field">
          <span className="ze-format-label" title="Where the text sits in a box with a fixed height">Vertical Align</span>
          <div className="ze-format-row">
            {VERTICAL_ALIGNS.map((v) => (
              <button
                key={v.key} type="button" className={"ze-format-toggle" + ((verticalAlign || "top") === v.key ? " active" : "")}
                disabled={!(frameHeight > 0)}
                title={frameHeight > 0 ? v.label : "Give the box a fixed height first (drag its top or bottom handle, or set Frame height under Columns & frame)"}
                onClick={() => onChange({ verticalAlign: v.key === "top" ? undefined : v.key })}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={v.path} /></svg>
              </button>
            ))}
          </div>
        </div>
      )}
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
