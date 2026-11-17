// Format panel for a selected text box.

import { ANGLE_CONTROL, BLEND_CONTROL } from "../../../model/controls.js";
import { CASE_CONTROL, FIT_HEIGHT_CONTROL, LETTER_SPACING_CONTROL, LINE_SPACING_CONTROL, STRIKE_CONTROL, TEXT_EFFECTS, VERTICAL_CONTROL } from "../../../model/text/textControls.js";
import { ControlList } from "../../controls/ControlList.jsx";
import { PanelSection, resetPatch } from "../../controls/PanelSection.jsx";
import { EffectControls } from "../EffectControls.jsx";
import { LetterColors } from "../LetterColors.jsx";
import { TextBasicSection } from "../TextBasicSection.jsx";
import { TextPhotoFill } from "../TextPhotoFill.jsx";
import { TextStyles } from "../TextStyles.jsx";
import { FormatPanelShell } from "./FormatPanelShell.jsx";

const SPACING_CONTROLS = [LINE_SPACING_CONTROL, LETTER_SPACING_CONTROL, CASE_CONTROL, VERTICAL_CONTROL, FIT_HEIGHT_CONTROL, STRIKE_CONTROL];

export function TextFormat({ ann, onUpdate, onRasterizeText, toolDefaults }) {
  const patch = (p) => onUpdate(ann.id, p);
  const { fontOptions, setFontOptions, textStyles, handleSaveTextStyle, handleDeleteTextStyle } = toolDefaults;
  return (
    <FormatPanelShell title="Format — Text">
      <TextBasicSection
        fontOptions={fontOptions} setFontOptions={setFontOptions}
        fontFamily={ann.fontFamily} fontSize={ann.fontSize || 16}
        bold={ann.bold} italic={ann.italic} underline={ann.underline}
        align={ann.align} color={ann.color}
        fillAlphaSource={ann} onFillAlpha={patch}
        onChange={patch}
      />
      <PanelSection id="text.styles" title="Saved styles">
        <TextStyles ann={ann} patch={patch} textStyles={textStyles} onSaveStyle={handleSaveTextStyle} onDeleteStyle={handleDeleteTextStyle} />
      </PanelSection>
      <PanelSection id="text.spacing" title="Spacing & layout" onReset={() => patch(resetPatch(SPACING_CONTROLS))}>
        <ControlList controls={SPACING_CONTROLS} source={ann} onPatch={patch} />
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
    </FormatPanelShell>
  );
}
