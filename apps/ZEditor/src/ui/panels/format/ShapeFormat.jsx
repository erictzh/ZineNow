// Format panel for a selected rectangle or ellipse.

import { ANGLE_CONTROL, BLEND_CONTROL, OPACITY_CONTROL } from "../../../model/controls.js";
import { isEllipse } from "../../../model/outlines.js";
import { RECT_FILL_CONTROLS } from "../../../model/rect.js";
import { ControlList } from "../../controls/ControlList.jsx";
import { PanelSection, resetPatch } from "../../controls/PanelSection.jsx";
import { EffectControls } from "../EffectControls.jsx";
import { TextWrapSection } from "../TextWrapSection.jsx";
import { FormatPanelShell, SizeReadout } from "./FormatPanelShell.jsx";

const TRANSFORM_CONTROLS = [ANGLE_CONTROL, OPACITY_CONTROL, BLEND_CONTROL];

export function ShapeFormat({ ann, onUpdate, onRasterizeRect }) {
  const patch = (p) => onUpdate(ann.id, p);
  return (
    <FormatPanelShell title={isEllipse(ann) ? "Format — Ellipse" : "Format — Rectangle"}>
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
        onReset={() => patch(resetPatch(TRANSFORM_CONTROLS))}
      >
        <SizeReadout ann={ann} />
        <ControlList controls={TRANSFORM_CONTROLS} source={ann} onPatch={patch} />
      </PanelSection>
      <EffectControls ann={ann} onPatch={patch} />
      <TextWrapSection ann={ann} patch={patch} />
      <PanelSection id="rect.rasterize" title="Rasterize" hint="Turns this shape into an image of what it looks like now — gradient, edge shape, stroke and shadow included — so image filters and effects can be applied to it. Undo brings the shape back.">
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => onRasterizeRect(ann)}>
          Rasterize to Image
        </button>
      </PanelSection>
    </FormatPanelShell>
  );
}
