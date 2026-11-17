// Format panels for a tool with nothing selected: the settings for the next rectangle/ellipse, text box or stroke, and the eraser.

import { BLEND_CONTROL, OPACITY_CONTROL } from "../../../model/controls.js";
import { MAGIC_ERASER_DEFAULTS, MAGIC_FEATHER_MAX, MAGIC_SHIFT_MAX, MAGIC_SMOOTHING_MAX, MAGIC_SPECKS_MAX, MAGIC_TOLERANCE_MAX } from "../../../model/magicEraser.js";
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

export function EraserToolPanel({ toolDefaults, magicErase }) {
  const { eraserMode, setEraserMode, softEraser, setSoftEraser, magicEraser, setMagicEraser } = toolDefaults;
  const refine = magicEraser.clickMode === "refine";
  const onChangeMagic = (patch) => setMagicEraser((cur) => ({ ...cur, ...patch }));
  const onChangeSoftEraser = (patch) => setSoftEraser((cur) => ({ ...cur, ...patch }));
  const magicSlider = (prop, label, min, max, hint) => (
    <div className="ze-format-field">
      <span className="ze-format-label">{label}</span>
      <SliderNumberInput min={min} max={max} value={magicEraser[prop]} onChange={(v) => onChangeMagic({ [prop]: v })} />
      {hint && <span className="ze-format-hint">{hint}</span>}
    </div>
  );
  const slider = (prop, label, min, max, unit) => (
    <div className="ze-format-field">
      <span className="ze-format-label">{label} ({softEraser[prop]}{unit})</span>
      <input type="range" className="ze-format-slider" min={min} max={max} step="1" value={softEraser[prop]}
        onChange={(e) => onChangeSoftEraser({ [prop]: Number(e.target.value) })} />
    </div>
  );
  return (
    <FormatPanelShell title="Eraser">
      {eraserMode === "magic" && magicErase && magicErase.active && (
        <div className="ze-magic-bar">
          <span className="ze-format-label">Preview: change any setting until it looks right</span>
          <div className="ze-format-row">
            <button type="button" className="ze-format-toggle ze-format-toggle-wide active" title="Apply (Enter)" onClick={magicErase.commit}>Apply</button>
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" title="Cancel (Esc)" onClick={magicErase.cancel}>Cancel</button>
          </div>
          <span className="ze-format-hint">Enter applies, Esc cancels. Clicking another spot on the image applies this one and starts the next.</span>
        </div>
      )}
      <PanelSection id="eraser.mode" title="Mode" defaultOpen>
        <div className="ze-format-row">
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "stroke" ? " active" : "")} onClick={() => setEraserMode("stroke")}>Strokes</button>
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "soft" ? " active" : "")} onClick={() => setEraserMode("soft")}>Soft (images)</button>
          <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "magic" ? " active" : "")} onClick={() => setEraserMode("magic")}>Magic</button>
        </div>
        {eraserMode === "stroke" && <span className="ze-format-hint">Removes any pen or highlighter stroke you drag across.</span>}
      </PanelSection>
      {eraserMode === "magic" && (
        <PanelSection id="eraser.magic" title="Magic eraser" defaultOpen hint="Click an image to open a preview, then change any setting until it looks right. Nothing is changed until you Apply (the button, or Enter), and Apply is one Ctrl+Z step. It reads the image's original pixels (before filters). To use it on text or a shape, Rasterize to Image first.">
          <div className="ze-format-field">
            <span className="ze-format-label">Click does</span>
            <div className="ze-seg-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={!refine} className={"ze-seg-tab" + (!refine ? " active" : "")} onClick={() => onChangeMagic({ clickMode: "match" })}>Erase a colour</button>
              <button type="button" role="tab" aria-selected={refine} className={"ze-seg-tab" + (refine ? " active" : "")} onClick={() => onChangeMagic({ clickMode: "refine" })}>Refine edge</button>
            </div>
            <span className="ze-format-hint">
              {refine
                ? "Finds every edge between transparent and coloured pixels by itself and refines them all at once. It needs an image that already has transparent areas (for example after erasing a background, or an imported cut-out). Press Refine edges, or click anywhere on an image (not on its edge) to pick that one."
                : "Erases the colour you click, and every colour close enough to it."}
            </span>
            {refine && magicErase && (
              <button type="button" className="ze-format-toggle ze-format-toggle-wide active" style={{ marginTop: 8 }} onClick={magicErase.startRefine}>Refine edges</button>
            )}
            {refine && magicErase && magicErase.notice && <span className="ze-format-hint is-error">{magicErase.notice}</span>}
          </div>

          {/* ---- Erase a colour ---- */}
          {!refine && magicSlider("tolerance", `Brightness tolerance (0 = same brightness, ${MAGIC_TOLERANCE_MAX} = any)`, 0, MAGIC_TOLERANCE_MAX,
            "Raise it to catch shadows and lighter or darker patches of the same surface.")}
          {!refine && magicSlider("colorTolerance", `Colour tolerance (0 = same colour, ${MAGIC_TOLERANCE_MAX} = any)`, 0, MAGIC_TOLERANCE_MAX,
            "Raise it if the background has colour variation; lower it if the erase spills onto a similar-brightness subject.")}
          {!refine && magicSlider("smoothing", `Smoothing (${magicEraser.smoothing}px, 0 = off)`, 0, MAGIC_SMOOTHING_MAX,
            "Averages nearby pixels before comparing, so grainy backgrounds (carpet, paper, noise) erase cleanly. Turn it down for thin lines or fine detail.")}
          {!refine && (
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
          )}
          {!refine && magicEraser.contiguous && (
            <div className="ze-format-field">
              <span className="ze-format-label">Connect through corners</span>
              <div className="ze-format-row">
                <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (!magicEraser.diagonal ? " active" : "")} onClick={() => onChangeMagic({ diagonal: false })}>Edges only</button>
                <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (magicEraser.diagonal ? " active" : "")} onClick={() => onChangeMagic({ diagonal: true })}>Corners too</button>
              </div>
              <span className="ze-format-hint">"Corners too" spreads through 1px diagonal gaps, which can leak past thin outlines.</span>
            </div>
          )}
          {!refine && magicSlider("softness", `Edge softness (${magicEraser.softness}%)`, 0, 100,
            "Pixels just past the tolerance are erased partly instead of all-or-nothing, so the edge fades where the colour is borderline. 0 = hard cut-off.")}
          {!refine && magicSlider("opacity", `Opacity (${magicEraser.opacity}%)`, 1, 100,
            "How completely matching pixels are erased. Below 100 fades the background instead of removing it.")}
          {!refine && <span className="ze-format-hint" style={{ marginTop: 0, marginBottom: 16 }}>To clean up the edge afterwards (feather, shift, specks, defringe), apply this erase and switch to the Refine edge tab.</span>}

          {/* ---- Refine edge (these also finish every Erase a colour click) ---- */}
          {refine && magicSlider("feather", `Feather (${magicEraser.feather}px)`, 0, MAGIC_FEATHER_MAX,
            "Blurs the edge so it fades instead of cutting off. The fade reaches about this many pixels either side.")}
          {refine && magicSlider("edgeShift", `Edge shift (${magicEraser.edgeShift > 0 ? "+" : ""}${magicEraser.edgeShift}px)`, -MAGIC_SHIFT_MAX, MAGIC_SHIFT_MAX,
            "Moves the edge. Positive trims the image inward (removes a halo of old background); negative keeps more, but can't bring back pixels that are already transparent.")}
          {refine && magicSlider("specks", `Remove specks (${magicEraser.specks ? magicEraser.specks + "px" : "off"})`, 0, MAGIC_SPECKS_MAX,
            "Removes stray bits of image up to this many pixels that are left floating in the transparent area. 0 = off.")}
          {refine && magicSlider("defringe", `Defringe (${magicEraser.defringe}%)`, 0, 100,
            "Pulls the colour of half-erased edge pixels toward the colour next to them, removing the leftover tint of the old background.")}
          <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => setMagicEraser(MAGIC_ERASER_DEFAULTS)}>Reset to defaults</button>
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
