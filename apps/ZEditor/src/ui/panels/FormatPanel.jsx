// The right-hand Format panel: settings for the selected item or current tool.

import { ANGLE_CONTROL, BLEND_CONTROL, OPACITY_CONTROL, angleOf } from "../../model/controls.js";
import { isEllipse } from "../../model/outlines.js";
import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT, FILTER_CONTROLS, IMAGE_FILTER_OPTIONS } from "../../model/pageFilters.js";
import { PHOTO_ADJUST_CONTROLS, PHOTO_ADJUST_SECTIONS, isAdjusted } from "../../model/photoAdjust.js";
import { RECT_FILL_CONTROLS } from "../../model/rect.js";
import { HIGHLIGHTER_COLOR_SWATCHES, HIGHLIGHTER_DEFAULTS, PEN_COLOR_SWATCHES, PEN_DEFAULTS } from "../../model/strokes.js";
import { CASE_CONTROL, FIT_HEIGHT_CONTROL, LETTER_SPACING_CONTROL, LINE_SPACING_CONTROL, STRIKE_CONTROL, TEXT_EFFECTS, VERTICAL_CONTROL } from "../../model/text/textControls.js";
import { cropResetPatch } from "../../render/bake.js";
import { ControlList } from "../controls/ControlList.jsx";
import { SelectInput } from "../controls/inputs.jsx";
import { PanelSection, resetPatch } from "../controls/PanelSection.jsx";
import { StrokeFormatFields } from "../controls/StrokeFormatFields.jsx";
import { EffectControls } from "./EffectControls.jsx";
import { LetterColors } from "./LetterColors.jsx";
import { TextBasicSection } from "./TextBasicSection.jsx";
import { TextPhotoFill } from "./TextPhotoFill.jsx";
import { TextStyles } from "./TextStyles.jsx";

export function FormatPanel({
  tool, selectedAnn, onUpdate, fontOptions, setFontOptions, croppingAnnId, onToggleCrop,
  rectDefaults, onChangeRectDefaults,
  textFontFamily, textFontSize, textBold, textItalic, textUnderline, textColor, textAlign,
  onChangeTextFontFamily, onChangeTextFontSize, onChangeTextBold, onChangeTextItalic, onChangeTextUnderline, onChangeTextColor, onChangeTextAlign,
  penColor, penWidth, penTaper, onChangePenColor, onChangePenWidth, onChangePenTaper,
  highlighterColor, highlighterWidth, highlighterTaper, onChangeHighlighterColor, onChangeHighlighterWidth, onChangeHighlighterTaper,
  onFlattenImage, onRasterizeRect, onRasterizeText,
  textStyles, onSaveTextStyle, onDeleteTextStyle,
  eraserMode, onChangeEraserMode, softEraser, onChangeSoftEraser,
}) {
  // Every panel below is a stack of collapsible sections (see PanelSection):
  // the essentials open, everything else one click away, effects behind
  // their own checkbox.
  const sizeReadout = (ann) => (
    <div className="ze-format-field">
      <span className="ze-format-label">Size</span>
      <span className="ze-format-hint" style={{ display: "block", marginTop: 0 }}>{Math.round(ann.width)} × {Math.round(ann.height)} px</span>
    </div>
  );

  if (selectedAnn && selectedAnn.type === "text") {
    const ann = selectedAnn;
    const patch = (p) => onUpdate(ann.id, p);
    const spacingControls = [LINE_SPACING_CONTROL, LETTER_SPACING_CONTROL, CASE_CONTROL, VERTICAL_CONTROL, FIT_HEIGHT_CONTROL, STRIKE_CONTROL];
    return (
      <aside className="ze-format-panel" key={ann.id}>
        <div className="ze-format-panel-head">Format — Text</div>
        <div className="ze-format-panel-body ze-sections">
          <TextBasicSection
            fontOptions={fontOptions} setFontOptions={setFontOptions}
            fontFamily={ann.fontFamily} fontSize={ann.fontSize || 16}
            bold={ann.bold} italic={ann.italic} underline={ann.underline}
            align={ann.align} color={ann.color}
            fillAlphaSource={ann} onFillAlpha={patch}
            onChange={patch}
          />
          <PanelSection id="text.styles" title="Saved styles">
            <TextStyles ann={ann} patch={patch} textStyles={textStyles} onSaveStyle={onSaveTextStyle} onDeleteStyle={onDeleteTextStyle} />
          </PanelSection>
          <PanelSection id="text.spacing" title="Spacing & layout" onReset={() => patch(resetPatch(spacingControls))}>
            <ControlList controls={spacingControls} source={ann} onPatch={patch} />
          </PanelSection>
          <PanelSection id="text.letters" title="Letter color">
            <LetterColors ann={ann} patch={patch} />
          </PanelSection>
          <TextPhotoFill ann={ann} patch={patch} />
          <EffectControls ann={ann} onPatch={patch} effects={TEXT_EFFECTS} />
          <PanelSection id="text.transform" title="Rotation & blend" onReset={() => patch(resetPatch([ANGLE_CONTROL, BLEND_CONTROL]))}>
            <ControlList controls={[ANGLE_CONTROL, BLEND_CONTROL]} source={ann} onPatch={patch} />
          </PanelSection>
          <PanelSection id="text.rasterize" title="Rasterize" hint="Turns this text into an image of what it looks like now, so you can apply Halftone, Xerox or Threshold to it. The words can't be edited afterwards; Undo brings the text back.">
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={!ann.text} onClick={() => onRasterizeText(ann)}>
              Rasterize to Image
            </button>
          </PanelSection>
        </div>
      </aside>
    );
  }

  if (selectedAnn && selectedAnn.type === "stroke") {
    const ann = selectedAnn;
    const isHi = ann.tool === "highlighter";
    const patch = (p) => onUpdate(ann.id, p);
    return (
      <aside className="ze-format-panel" key={ann.id}>
        <div className="ze-format-panel-head">Format — {isHi ? "Highlighter" : "Draw"} stroke</div>
        <div className="ze-format-panel-body ze-sections">
          <PanelSection id="stroke.basic" title="Stroke" defaultOpen hint="Drag the round knob above the stroke to rotate it.">
            <StrokeFormatFields
              swatches={isHi ? HIGHLIGHTER_COLOR_SWATCHES : PEN_COLOR_SWATCHES}
              color={ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color)}
              width={ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width)}
              minWidth={isHi ? 6 : 1}
              maxWidth={isHi ? 40 : 20}
              taper={ann.taper || 0}
              onColor={(c) => patch({ color: c })}
              onWidth={(w) => patch({ strokeWidth: w })}
              onTaper={(t) => patch({ taper: t })}
            />
          </PanelSection>
          <PanelSection id="stroke.blend" title="Blend">
            <ControlList controls={[BLEND_CONTROL]} source={ann} onPatch={patch} />
          </PanelSection>
        </div>
      </aside>
    );
  }

  if (selectedAnn && selectedAnn.type === "image") {
    const ann = selectedAnn;
    const patch = (p) => onUpdate(ann.id, p);
    const isCroppingThis = croppingAnnId === ann.id;
    const hasCrop = ann.cropW != null && (ann.cropX || ann.cropY || ann.cropW !== ann.naturalWidth || ann.cropH !== ann.naturalHeight);
    const cropReset = cropResetPatch(ann);
    const filterType = (ann.filter && ann.filter.type) || "match";
    const filterOption = IMAGE_FILTER_OPTIONS.find((o) => o.key === filterType);
    const adjustedCount = PHOTO_ADJUST_CONTROLS.filter((c) => isAdjusted(ann, c)).length;
    const filtersSummary = [adjustedCount > 0 && adjustedCount + " adjusted", filterType !== "match" && filterOption && filterOption.label].filter(Boolean).join(" · ") || undefined;
    return (
      <aside className="ze-format-panel" key={ann.id}>
        <div className="ze-format-panel-head">Format — Image</div>
        <div className="ze-format-panel-body ze-sections">
          <PanelSection id="image.basic" title="Basic" defaultOpen hint="Drag the image to move it. Drag a handle to resize; hold Shift to stretch it freely." onReset={() => patch(resetPatch([OPACITY_CONTROL, ANGLE_CONTROL, BLEND_CONTROL]))}>
            {sizeReadout(ann)}
            <ControlList controls={[OPACITY_CONTROL, ANGLE_CONTROL, BLEND_CONTROL]} source={ann} onPatch={patch} />
          </PanelSection>
          <PanelSection
            id="image.crop"
            title="Crop"
            checked={isCroppingThis || Boolean(hasCrop)}
            disabled={Boolean(angleOf(ann)) && !isCroppingThis && !hasCrop}
            hint="While cropping: drag inside the window to reposition the photo, drag a corner to resize the crop. Set the rotation to 0° to crop."
            onToggle={(on) => {
              if (on) { if (!isCroppingThis) onToggleCrop(ann.id); return; }
              if (isCroppingThis) onToggleCrop(ann.id);
              patch(cropReset);
            }}
            onReset={hasCrop ? () => patch(cropReset) : undefined}
          >
            <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (isCroppingThis ? " active" : "")} onClick={() => onToggleCrop(ann.id)}>
              {isCroppingThis ? "Done Cropping" : "Edit Crop"}
            </button>
          </PanelSection>
          <PanelSection
            id="image.filters"
            title="Filters"
            group
            summary={filtersSummary}
            hint="Adjust the photo's light, color and levels. Adjustments are applied before the Style filter, so a filter works on the adjusted photo."
          >
            {PHOTO_ADJUST_SECTIONS.map((group) => {
              const changed = group.controls.filter((c) => isAdjusted(ann, c)).length;
              return (
                <PanelSection
                  key={group.id}
                  id={"image.adjust." + group.id}
                  title={group.title}
                  summary={changed > 0 ? changed + " changed" : undefined}
                  onReset={() => patch(resetPatch(group.controls))}
                >
                  <ControlList controls={group.controls} source={ann} onPatch={patch} />
                </PanelSection>
              );
            })}
          </PanelSection>
          <PanelSection
            id="image.filter"
            title="Style"
              summary={filterOption ? filterOption.label : undefined}
            hint={'Overrides the page filter for just this image. "Match Page" follows whatever the page filter is set to.'}
          >
            <div className="ze-format-field">
              <SelectInput options={IMAGE_FILTER_OPTIONS} value={filterType} onChange={(type) => patch({ filter: { ...ann.filter, type } })} />
            </div>
            {ann.filter && ann.filter.type === "duotone" && (
              <React.Fragment>
                <div className="ze-format-field">
                  <span className="ze-format-label">Dark tone</span>
                  <input
                    type="color" className="ze-format-color-input"
                    value={ann.filter.darkColor || DEFAULT_DUOTONE_DARK}
                    onChange={(e) => patch({ filter: { ...ann.filter, darkColor: e.target.value } })}
                  />
                </div>
                <div className="ze-format-field">
                  <span className="ze-format-label">Light tone</span>
                  <input
                    type="color" className="ze-format-color-input"
                    value={ann.filter.lightColor || DEFAULT_DUOTONE_LIGHT}
                    onChange={(e) => patch({ filter: { ...ann.filter, lightColor: e.target.value } })}
                  />
                </div>
              </React.Fragment>
            )}
            {ann.filter && FILTER_CONTROLS[ann.filter.type] && (
              <ControlList
                controls={FILTER_CONTROLS[ann.filter.type]}
                source={ann.filter}
                onPatch={(p) => patch({ filter: { ...ann.filter, ...p } })}
              />
            )}
          </PanelSection>
          <EffectControls ann={ann} onPatch={patch} />
          <PanelSection
            id="image.flatten"
            title="Flatten"
            summary={Math.round(ann.src.length * 0.75 / 1024) + " KB"}
            hint="Bakes the crop, filter and effects into one image, so you can stack new effects on top. Undo brings them back."
          >
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={isCroppingThis} onClick={() => onFlattenImage(ann)}>
              Flatten Image
            </button>
          </PanelSection>
        </div>
      </aside>
    );
  }

  if (selectedAnn && selectedAnn.type === "rect") {
    const ann = selectedAnn;
    const patch = (p) => onUpdate(ann.id, p);
    const transformControls = [ANGLE_CONTROL, OPACITY_CONTROL, BLEND_CONTROL];
    return (
      <aside className="ze-format-panel" key={ann.id}>
        <div className="ze-format-panel-head">{isEllipse(ann) ? "Format — Ellipse" : "Format — Rectangle"}</div>
        <div className="ze-format-panel-body ze-sections">
          <PanelSection id="rect.fill" title="Fill" defaultOpen onReset={() => patch(resetPatch(RECT_FILL_CONTROLS))}>
            <ControlList controls={RECT_FILL_CONTROLS} source={ann} onPatch={patch} />
          </PanelSection>
          <PanelSection
            id="rect.transform"
            title="Transform"
            defaultOpen
            hint={isEllipse(ann)
              ? "Drag a handle to resize; hold Shift to keep its proportions (a circle stays a circle). Use Stroke for an outline."
              : "Drag a handle to resize; hold Shift to keep its proportions. Use Rounded for corner radius and Stroke for a border."}
            onReset={() => patch(resetPatch(transformControls))}
          >
            {sizeReadout(ann)}
            <ControlList controls={transformControls} source={ann} onPatch={patch} />
          </PanelSection>
          <EffectControls ann={ann} onPatch={patch} />
          <PanelSection id="rect.rasterize" title="Rasterize" hint="Turns this shape into an image of what it looks like now — gradient, edge shape, stroke and shadow included — so image filters and effects can be applied to it. Undo brings the shape back.">
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => onRasterizeRect(ann)}>
              Rasterize to Image
            </button>
          </PanelSection>
        </div>
      </aside>
    );
  }

  if (tool === "rect" || tool === "ellipse") {
    const shapeName = tool === "ellipse" ? "ellipse" : "rectangle";
    return (
      <aside className="ze-format-panel">
        <div className="ze-format-panel-head">{tool === "ellipse" ? "Ellipse" : "Rectangle"}</div>
        <div className="ze-format-panel-body ze-sections">
          <span className="ze-sec-intro">Drag on the page to draw, or click for a default size. These settings apply to the next {shapeName} (rectangles and ellipses share them).</span>
          <PanelSection id="rect.fill" title="Fill" defaultOpen onReset={() => onChangeRectDefaults(resetPatch(RECT_FILL_CONTROLS))}>
            <ControlList controls={RECT_FILL_CONTROLS} source={rectDefaults} onPatch={onChangeRectDefaults} />
          </PanelSection>
          <PanelSection id="rect.look" title="Opacity & blend" onReset={() => onChangeRectDefaults(resetPatch([OPACITY_CONTROL, BLEND_CONTROL]))}>
            <ControlList controls={[OPACITY_CONTROL, BLEND_CONTROL]} source={rectDefaults} onPatch={onChangeRectDefaults} />
          </PanelSection>
        </div>
      </aside>
    );
  }

  if (tool === "text") {
    const handlers = {
      fontFamily: onChangeTextFontFamily, fontSize: onChangeTextFontSize, bold: onChangeTextBold,
      italic: onChangeTextItalic, underline: onChangeTextUnderline, color: onChangeTextColor, align: onChangeTextAlign,
    };
    const changeDefaults = (p) => Object.keys(p).forEach((prop) => handlers[prop](p[prop]));
    return (
      <aside className="ze-format-panel">
        <div className="ze-format-panel-head">Text</div>
        <div className="ze-format-panel-body ze-sections">
          <span className="ze-sec-intro">Sets the font, size, style, alignment and color for the next text box you add.</span>
          <TextBasicSection
            fontOptions={fontOptions} setFontOptions={setFontOptions}
            fontFamily={textFontFamily} fontSize={textFontSize}
            bold={textBold} italic={textItalic} underline={textUnderline}
            align={textAlign} color={textColor}
            onChange={changeDefaults}
          />
        </div>
      </aside>
    );
  }

  if (tool === "pen" || tool === "highlighter") {
    const isHi = tool === "highlighter";
    return (
      <aside className="ze-format-panel">
        <div className="ze-format-panel-head">{isHi ? "Highlighter" : "Draw"}</div>
        <div className="ze-format-panel-body ze-sections">
          <span className="ze-sec-intro">Sets the color and thickness for the next stroke you draw.</span>
          <PanelSection id={"stroke.basic"} title="Stroke" defaultOpen>
            <StrokeFormatFields
              swatches={isHi ? HIGHLIGHTER_COLOR_SWATCHES : PEN_COLOR_SWATCHES}
              color={isHi ? highlighterColor : penColor}
              width={isHi ? highlighterWidth : penWidth}
              minWidth={isHi ? 6 : 1}
              maxWidth={isHi ? 40 : 20}
              taper={isHi ? highlighterTaper : penTaper}
              onColor={isHi ? onChangeHighlighterColor : onChangePenColor}
              onWidth={isHi ? onChangeHighlighterWidth : onChangePenWidth}
              onTaper={isHi ? onChangeHighlighterTaper : onChangePenTaper}
            />
          </PanelSection>
        </div>
      </aside>
    );
  }

  if (tool === "eraser") {
    const slider = (prop, label, min, max, unit) => (
      <div className="ze-format-field">
        <span className="ze-format-label">{label} ({softEraser[prop]}{unit})</span>
        <input type="range" className="ze-format-slider" min={min} max={max} step="1" value={softEraser[prop]}
          onChange={(e) => onChangeSoftEraser({ [prop]: Number(e.target.value) })} />
      </div>
    );
    return (
      <aside className="ze-format-panel">
        <div className="ze-format-panel-head">Eraser</div>
        <div className="ze-format-panel-body ze-sections">
          <PanelSection id="eraser.mode" title="Mode" defaultOpen>
            <div className="ze-format-row">
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "stroke" ? " active" : "")} onClick={() => onChangeEraserMode("stroke")}>Strokes</button>
              <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (eraserMode === "soft" ? " active" : "")} onClick={() => onChangeEraserMode("soft")}>Soft (images)</button>
            </div>
            {eraserMode === "stroke" && <span className="ze-format-hint">Removes any pen or highlighter stroke you drag across.</span>}
          </PanelSection>
          {eraserMode === "soft" && (
            <PanelSection id="eraser.brush" title="Brush" defaultOpen hint="Drag over an image to fade it to transparent with a feathered edge. Each swipe is its own Ctrl+Z step. To erase text or a shape, use its Rasterize to Image button first.">
              {slider("size", "Size", 4, 300, "px")}
              {slider("softness", "Softness", 0, 100, "%")}
              {slider("strength", "Strength", 5, 100, "%")}
            </PanelSection>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="ze-format-panel">
      <div className="ze-format-panel-head">Format</div>
      <div className="ze-format-panel-body">
        <div className="ze-format-empty">
          Select a text box, image, rectangle, or stroke to edit it, or pick a tool to set defaults for the next one you add.
        </div>
      </div>
    </aside>
  );
}
