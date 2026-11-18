// The Text wrap section of the image and shape panels: whether this item pushes text frames aside, and how far.

import { TEXT_WRAP_CONTROLS } from "../../model/text/textWrap.js";
import { ControlList } from "../controls/ControlList.jsx";
import { PanelSection, resetPatch } from "../controls/PanelSection.jsx";

export function TextWrapSection({ ann, patch }) {
  const controls = TEXT_WRAP_CONTROLS.filter((c) => c.prop !== "wrapOffset" || (ann.textWrap && ann.textWrap !== "none"));
  return (
    <PanelSection
      id={ann.type + ".wrap"} title="Text wrap" onReset={() => patch(resetPatch(TEXT_WRAP_CONTROLS))}
      hint="Text frames this overlaps set their lines around it. Object shape follows an image's visible (non-transparent) pixels, or an ellipse's outline. Works on text boxes with a set width that aren't rotated."
    >
      <ControlList controls={controls} source={ann} onPatch={(p) => patch(p.textWrap === "none" ? { textWrap: undefined } : p)} />
    </PanelSection>
  );
}
