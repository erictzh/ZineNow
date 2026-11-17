// Format panel for a selected pen or highlighter stroke.

import { BLEND_CONTROL } from "../../../model/controls.js";
import { HIGHLIGHTER_COLOR_SWATCHES, HIGHLIGHTER_DEFAULTS, PEN_COLOR_SWATCHES, PEN_DEFAULTS } from "../../../model/strokes.js";
import { ControlList } from "../../controls/ControlList.jsx";
import { PanelSection } from "../../controls/PanelSection.jsx";
import { StrokeFormatFields } from "../../controls/StrokeFormatFields.jsx";
import { FormatPanelShell } from "./FormatPanelShell.jsx";

export function StrokeFormat({ ann, onUpdate }) {
  const isHi = ann.tool === "highlighter";
  const patch = (p) => onUpdate(ann.id, p);
  return (
    <FormatPanelShell title={"Format — " + (isHi ? "Highlighter" : "Draw") + " stroke"}>
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
    </FormatPanelShell>
  );
}
