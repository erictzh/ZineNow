// Format panel for a selected text box.

import { ANGLE_CONTROL } from "../../../model/controls.js";
import { CASE_CONTROL, COLUMN_CONTROLS, COMPOSER_CONTROL, FIT_HEIGHT_CONTROL, HYPHENATE_CONTROL, JUSTIFY_LAST_CONTROL, KERNING_CONTROL, LEADING_CONTROL, LETTER_SPACING_CONTROL, LINE_SPACING_CONTROL, PARAGRAPH_CONTROLS, STRIKE_CONTROL, TEXT_EFFECTS, TEXT_GRADIENT_EFFECT, VERTICAL_CONTROL } from "../../../model/text/textControls.js";
import { ControlList } from "../../controls/ControlList.jsx";
import { PanelSection, resetPatch } from "../../controls/PanelSection.jsx";
import { SelectInput } from "../../controls/inputs.jsx";
import { EffectControls } from "../EffectControls.jsx";
import { TextBasicSection } from "../TextBasicSection.jsx";
import { TextPhotoFill } from "../TextPhotoFill.jsx";
import { TextPlaceholder } from "../TextPlaceholder.jsx";
import { TextSpans } from "../TextSpans.jsx";
import { TextStyles } from "../TextStyles.jsx";
import { FormatPanelShell } from "./FormatPanelShell.jsx";

const SPACING_CONTROLS = [LINE_SPACING_CONTROL, LEADING_CONTROL, LETTER_SPACING_CONTROL, KERNING_CONTROL, CASE_CONTROL, VERTICAL_CONTROL, FIT_HEIGHT_CONTROL, STRIKE_CONTROL];
const ALL_PARAGRAPH_CONTROLS = [COMPOSER_CONTROL, HYPHENATE_CONTROL, JUSTIFY_LAST_CONTROL, ...PARAGRAPH_CONTROLS];

export function TextFormat({ ann, onUpdate, onRasterizeText, onOutlineText, toolDefaults, styleActions }) {
  const patch = (p) => onUpdate(ann.id, p);
  const { fontOptions, setFontOptions, textStyles, handleSaveTextStyle, handleDeleteTextStyle } = toolDefaults;
  return (
    <FormatPanelShell title="Format — Text">
      <TextPlaceholder ann={ann} patch={patch} />
      <TextBasicSection
        fontOptions={fontOptions} setFontOptions={setFontOptions}
        fontFamily={ann.fontFamily} fontSize={ann.fontSize || 16}
        bold={ann.bold} italic={ann.italic} underline={ann.underline}
        align={ann.align} verticalAlign={ann.verticalAlign || null} frameHeight={ann.frameHeight} color={ann.color}
        fillAlphaSource={ann} onFillAlpha={patch}
        onChange={patch}
      />
      {/* Fill: the letters' colour (set above) or a gradient from it to a second colour. The same setting as the old Gradient effect, now beside the colour. */}
      <PanelSection id="text.fill" title="Fill" defaultOpen summary={ann.textGradient ? "Gradient" : undefined} onReset={() => patch({ ...resetPatch(TEXT_GRADIENT_EFFECT.controls), textGradient: false })}
        hint="Solid color uses the Color above. Gradient fades from that color to the second color across the whole text box.">
        <div className="ze-format-field">
          <span className="ze-format-label">Fill</span>
          <SelectInput options={[{ key: "solid", label: "Solid color" }, { key: "gradient", label: "Gradient" }]} value={ann.textGradient ? "gradient" : "solid"} onChange={(key) => patch({ textGradient: key === "gradient" })} />
        </div>
        {ann.textGradient && <ControlList controls={TEXT_GRADIENT_EFFECT.controls} source={ann} onPatch={patch} />}
      </PanelSection>
      <PanelSection
        id="text.paragraph" title="Paragraph" onReset={() => patch(resetPatch(ALL_PARAGRAPH_CONTROLS))}
        hint="Justification, indents and paragraph spacing are set by one layout that the editor and Export share (paragraphs are split at each new line). Not used with Ransom, Curve or Stacked text."
      >
        <ControlList
          controls={[COMPOSER_CONTROL, HYPHENATE_CONTROL, ...(ann.align === "justify" ? [JUSTIFY_LAST_CONTROL] : []), ...PARAGRAPH_CONTROLS]}
          source={ann}
          onPatch={(p) => patch(p.composer === "auto" ? { composer: undefined } : p)}
        />
      </PanelSection>
      <PanelSection
        id="text.frame" title="Columns & frame" onReset={() => patch({ ...resetPatch(COLUMN_CONTROLS), verticalAlign: undefined })}
        hint="Several columns balance the text. Give the frame a height and the text fills the columns in order; if it doesn't all fit, the rest is hidden and a red + shows in the corner (click it to continue the text in a new linked box). Set the box's width first (drag its side handle)."
      >
        <ControlList controls={COLUMN_CONTROLS} source={ann} onPatch={(p) => patch(p.columnRule === "none" ? { columnRule: undefined } : p)} />
      </PanelSection>
      <PanelSection id="text.styles" title="Presets">
        <TextStyles ann={ann} patch={patch} textStyles={textStyles} onSaveStyle={handleSaveTextStyle} onDeleteStyle={handleDeleteTextStyle} styleActions={styleActions} />
      </PanelSection>
      <PanelSection id="text.spacing" title="Spacing & layout" onReset={() => patch(resetPatch(SPACING_CONTROLS))}>
        <ControlList controls={SPACING_CONTROLS} source={ann} onPatch={patch} />
      </PanelSection>
      <PanelSection
        id="text.letters" title="Custom Text Style (span)"
        hint="Changes only the letters you select (font, size, bold, italic, underline, strike-through, color), or the alignment of the paragraphs they're in. Custom fonts, sizes, bold, italic or alignment set the box with the paragraph layout, as Justify does."
      >
        <TextSpans ann={ann} patch={patch} fontOptions={fontOptions} setFontOptions={setFontOptions} />
      </PanelSection>
      <EffectControls ann={ann} onPatch={patch} effects={TEXT_EFFECTS.filter((effect) => effect !== TEXT_GRADIENT_EFFECT)} before={<TextPhotoFill ann={ann} patch={patch} />} beforeLabel={ann.fillSrc ? "Photo fill" : undefined} />
      <PanelSection id="text.transform" title="Rotation" hint="Opacity and blend are in the Layers panel." onReset={() => patch(resetPatch([ANGLE_CONTROL]))}>
        <ControlList controls={[ANGLE_CONTROL]} source={ann} onPatch={patch} />
      </PanelSection>
      <PanelSection id="text.rasterize" title="Rasterize or outline" hint="Rasterize turns this text into an image of what it looks like now, so you can apply Halftone, Xerox or Threshold to it. Outline Text to Shape turns the letters into a vector shape (it needs the font file). Either way the words can't be edited afterwards; Undo brings the text back.">
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={!ann.text || ann.storyHeadId != null} title={ann.storyHeadId != null ? "Unlink the threaded frames first" : undefined} onClick={() => onRasterizeText(ann)}>
          Rasterize to Image
        </button>
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={!ann.text || ann.storyHeadId != null} title={ann.storyHeadId != null ? "Unlink the threaded frames first" : "Turns the letters into a vector shape layer (needs the font file). The words can't be edited afterwards; Undo brings the text back."} onClick={() => onOutlineText(ann)}>
          Outline Text to Shape
        </button>
      </PanelSection>
    </FormatPanelShell>
  );
}
