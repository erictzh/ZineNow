// Format panels for a tool with nothing selected: the settings for the next rectangle/ellipse, text box or stroke, and the eraser.

import { BLEND_CONTROL, OPACITY_CONTROL } from "../../../model/controls.js";
import { MAGIC_TOLERANCE_MAX } from "../../../model/magicEraser.js";
import { RECT_FILL_CONTROLS } from "../../../model/rect.js";
import { HIGHLIGHTER_COLOR_SWATCHES, PEN_COLOR_SWATCHES } from "../../../model/strokes.js";
import { ControlList } from "../../controls/ControlList.jsx";
import { SliderNumberInput } from "../../controls/inputs.jsx";
import { PanelSection, resetPatch } from "../../controls/PanelSection.jsx";
import { StrokeFormatFields } from "../../controls/StrokeFormatFields.jsx";
import { TextBasicSection } from "../TextBasicSection.jsx";
import { FormatPanelShell } from "./FormatPanelShell.jsx";

export function ShapeToolPanel({ tool, toolDefaults }) {
  const { rectDefaults, setRectDefaults } = toolDefaults;
  const onChangeRectDefaults = (patch) => setRectDefaults((d) => ({ ...d, ...patch }));
  const shapeName = tool === "ellipse" ? "ellipse" : "rectangle";
  return (
    <FormatPanelShell title={tool === "ellipse" ? "Ellipse" : "Rectangle"}>
      <span className="ze-sec-intro">Drag on the page to draw, or click for a default size. These settings apply to the next {shapeName} (rectangles and ellipses share them).</span>
      <PanelSection id="rect.fill" title="Fill" defaultOpen onReset={() => onChangeRectDefaults(resetPatch(RECT_FILL_CONTROLS))}>
        <ControlList controls={RECT_FILL_CONTROLS} source={rectDefaults} onPatch={onChangeRectDefaults} />
      </PanelSection>
      <PanelSection id="rect.look" title="Opacity & blend" onReset={() => onChangeRectDefaults(resetPatch([OPACITY_CONTROL, BLEND_CONTROL]))}>
        <ControlList controls={[OPACITY_CONTROL, BLEND_CONTROL]} source={rectDefaults} onPatch={onChangeRectDefaults} />
      </PanelSection>
    </FormatPanelShell>
  );
}

export function TextToolPanel({ toolDefaults: t }) {
  const setters = {
    fontFamily: t.setTextFontFamily, fontSize: t.setTextFontSize, bold: t.setTextBold,
    italic: t.setTextItalic, underline: t.setTextUnderline, color: t.setTextColor, align: t.setTextAlign,
  };
  const changeDefaults = (p) => Object.keys(p).forEach((prop) => setters[prop](p[prop]));
  return (
    <FormatPanelShell title="Text">
      <span className="ze-sec-intro">Sets the font, size, style, alignment and color for the next text box you add.</span>
      <TextBasicSection
        fontOptions={t.fontOptions} setFontOptions={t.setFontOptions}
        fontFamily={t.textFontFamily} fontSize={t.textFontSize}
        bold={t.textBold} italic={t.textItalic} underline={t.textUnderline}
        align={t.textAlign} color={t.textColor}
        onChange={changeDefaults}
      />
    </FormatPanelShell>
  );
}

export function StrokeToolPanel({ tool, toolDefaults: t }) {
  const isHi = tool === "highlighter";
  return (
    <FormatPanelShell title={isHi ? "Highlighter" : "Draw"}>
      <span className="ze-sec-intro">Sets the color and thickness for the next stroke you draw.</span>
      <PanelSection id={"stroke.basic"} title="Stroke" defaultOpen>
        <StrokeFormatFields
          swatches={isHi ? HIGHLIGHTER_COLOR_SWATCHES : PEN_COLOR_SWATCHES}
          color={isHi ? t.highlighterColor : t.penColor}
          width={isHi ? t.highlighterWidth : t.penWidth}
          minWidth={isHi ? 6 : 1}
          maxWidth={isHi ? 40 : 20}
          taper={isHi ? t.highlighterTaper : t.penTaper}
          onColor={isHi ? t.setHighlighterColor : t.setPenColor}
          onWidth={isHi ? t.setHighlighterWidth : t.setPenWidth}
          onTaper={isHi ? t.setHighlighterTaper : t.setPenTaper}
        />
      </PanelSection>
    </FormatPanelShell>
  );
}

export function EraserToolPanel({ toolDefaults }) {
  const { eraserMode, setEraserMode, softEraser, setSoftEraser, magicEraser, setMagicEraser } = toolDefaults;
  const onChangeMagic = (patch) => setMagicEraser((cur) => ({ ...cur, ...patch }));
  const onChangeSoftEraser = (patch) => setSoftEraser((cur) => ({ ...cur, ...patch }));
  const slider = (prop, label, min, max, unit) => (
    <div className="ze-format-field">
      <span className="ze-format-label">{label} ({softEraser[prop]}{unit})</span>
      <input type="range" className="ze-format-slider" min={min} max={max} step="1" value={softEraser[prop]}
        onChange={(e) => onChangeSoftEraser({ [prop]: Number(e.target.value) })} />
    </div>
  );
  return (
    <FormatPanelShell title="Eraser">
      <PanelSection id="eraser.mode" title="Mode" defaultOpen>
        <div className="ze-format-row">
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "stroke" ? " active" : "")} onClick={() => setEraserMode("stroke")}>Strokes</button>
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "soft" ? " active" : "")} onClick={() => setEraserMode("soft")}>Soft (images)</button>
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "magic" ? " active" : "")} onClick={() => setEraserMode("magic")}>Magic</button>
        </div>
        {eraserMode === "stroke" && <span className="ze-format-hint">Removes any pen or highlighter stroke you drag across.</span>}
      </PanelSection>
      {eraserMode === "magic" && (
        <PanelSection id="eraser.magic" title="Magic eraser" defaultOpen hint="Click an image: the colour you click, and every colour within the Tolerance of it, becomes transparent. Each click is its own Ctrl+Z step. To use it on text or a shape, Rasterize to Image first.">
          <div className="ze-format-field">
            <span className="ze-format-label">Tolerance (0 = exact colour, {MAGIC_TOLERANCE_MAX} = everything)</span>
            <SliderNumberInput min={0} max={MAGIC_TOLERANCE_MAX} value={magicEraser.tolerance} onChange={(tolerance) => onChangeMagic({ tolerance })} />
          </div>
          <div className="ze-format-field">
            <span className="ze-format-label">Erase</span>
            <div className="ze-format-row">
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (magicEraser.contiguous ? " active" : "")} onClick={() => onChangeMagic({ contiguous: true })}>Connected only</button>
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (!magicEraser.contiguous ? " active" : "")} onClick={() => onChangeMagic({ contiguous: false })}>Whole image</button>
            </div>
            <span className="ze-format-hint">
              {magicEraser.contiguous
                ? "Only matching pixels touching the one you click (like Photoshop's Contiguous)."
                : "Every matching pixel in the image, connected or not."}
            </span>
          </div>
        </PanelSection>
      )}
      {eraserMode === "soft" && (
        <PanelSection id="eraser.brush" title="Brush" defaultOpen hint="Drag over an image to fade it to transparent with a feathered edge. Each swipe is its own Ctrl+Z step. To erase text or a shape, use its Rasterize to Image button first.">
          {slider("size", "Size", 4, 300, "px")}
          {slider("softness", "Softness", 0, 100, "%")}
          {slider("strength", "Strength", 5, 100, "%")}
        </PanelSection>
      )}
    </FormatPanelShell>
  );
}
