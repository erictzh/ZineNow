// Effect toggles with their settings, for images, shapes and text.

import { ELLIPSE_EFFECT } from "../../model/edgeShapes.js";
import { IMAGE_EFFECTS } from "../../model/imageEffects.js";
import { isEllipse } from "../../model/outlines.js";
import { ControlList } from "../controls/ControlList.jsx";
import { PanelSection, resetPatch } from "../controls/PanelSection.jsx";

// One section per effect, each with its own on/off checkbox. The edge
// shapes (Rounded, Ellipse, Torn Edge, Scissor Cut) replace each other.
export function EffectControls({ ann, onPatch, effects = IMAGE_EFFECTS }) {
  const toggleEffect = (effect, on) => {
    const otherEdgesOff = effect.outline && on
      ? Object.fromEntries(effects.filter((e) => e.outline).map((e) => [e.key, false]))
      : {};
    onPatch({ ...otherEdgesOff, [effect.key]: on });
  };
  // An ellipse already has its own outline, so the rectangle edge shapes
  // are left out; a rectangle has the Ellipse tool instead of the Ellipse edge.
  const available = effects.filter((effect) => !(effect.outline && isEllipse(ann)) && !(effect === ELLIPSE_EFFECT && ann.type === "rect"));
  const active = available.filter((effect) => ann[effect.key]).map((effect) => effect.label);
  return (
    <PanelSection id="effects" title="Effect" group summary={active.length > 0 ? active.join(", ") : undefined}>
      {available.map((effect) => {
        const hint = [effect.outline && "Only one edge shape can be on at a time.", effect.hint].filter(Boolean).join(" ");
        return (
          <PanelSection
            key={effect.key}
            id={"fx." + effect.key}
            title={effect.label}
            checked={Boolean(ann[effect.key])}
            onToggle={(on) => toggleEffect(effect, on)}
            hint={hint || undefined}
            onReset={effect.controls.length > 0 ? () => onPatch(resetPatch(effect.controls)) : undefined}
          >
            {effect.controls.length > 0 && <ControlList controls={effect.controls} source={ann} onPatch={onPatch} />}
          </PanelSection>
        );
      })}
    </PanelSection>
  );
}
