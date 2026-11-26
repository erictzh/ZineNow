// Effect toggles with their settings, for images, shapes and text.

import { controlValues } from "../../model/controls.js";
import { ELLIPSE_EFFECT } from "../../model/edgeShapes.js";
import { IMAGE_EFFECTS } from "../../model/imageEffects.js";
import { isEllipse } from "../../model/outlines.js";
import { ControlList } from "../controls/ControlList.jsx";
import { SelectInput } from "../controls/inputs.jsx";
import { PanelSection, resetPatch } from "../controls/PanelSection.jsx";
import { DEFAULT_SHADOW, DEFAULT_STROKE, shadowsPatch, strokesPatch, storedShadows as shadowLayersAny, storedStrokes as strokeLayersAny } from "../../model/effectStacks.js";
import { ShadowStack, StrokeStack } from "./StackedEffects.jsx";

// One section per effect, each with its own on/off checkbox. The edge
// shapes (Rounded, Ellipse, Torn Edge, Scissor Cut) replace each other.
// `before` (optional) is shown first inside the group, e.g. the text panel's Photo fill;
// `beforeLabel` names it in the group's summary while it's on.
export function EffectControls({ ann, onPatch, effects = IMAGE_EFFECTS, before, beforeLabel, essential }) {
  // Pictures and shapes keep any number of strokes and shadows (a list each); text keeps one of each.
  const stacked = (effect) => ann.type !== "text" && (effect.key === "stroke" || effect.key === "shadow");
  const toggleStack = (effect, on) => {
    const make = effect.key === "stroke" ? strokesPatch : shadowsPatch;
    const layers = effect.key === "stroke" ? strokeLayersAny(ann) : shadowLayersAny(ann);
    if (!on) { onPatch({ [effect.key]: false }); return; }
    const first = effect.key === "stroke" ? [DEFAULT_STROKE] : [DEFAULT_SHADOW];
    onPatch(make(layers.length ? layers : first));
  };
  const toggleEffect = (effect, on) => {
    if (stacked(effect)) { toggleStack(effect, on); return; }
    const otherEdgesOff = effect.outline && on
      ? Object.fromEntries(effects.filter((e) => e.outline).map((e) => [e.key, false]))
      : {};
    // some effects don't go together (Feather and Stroke): turning one on turns the other off
    const excluded = on && effect.excludes ? Object.fromEntries(effect.excludes.map((key) => [key, false])) : {};
    onPatch({ ...otherEdgesOff, ...excluded, [effect.key]: on });
  };
  // An ellipse already has its own outline, so the rectangle edge shapes
  // are left out; a rectangle has the Ellipse tool instead of the Ellipse edge.
  const available = effects.filter((effect) => !(effect.outline && isEllipse(ann)) && !(effect === ELLIPSE_EFFECT && ann.type === "rect"));
  const active = [...(beforeLabel ? [beforeLabel] : []), ...available.filter((effect) => ann[effect.key]).map((effect) => effect.label)];
  return (
    <PanelSection id="effects" title="Effect" essential={Boolean(essential)} group summary={active.length > 0 ? active.join(", ") : undefined}>
      {before}
      {available.map((effect) => {
        const hint = [effect.outline && "Only one edge shape can be on at a time.", effect.hint, effect.excludes && "Turns " + effect.excludes.map((key) => (effects.find((e) => e.key === key) || { label: key }).label).join(" and ") + " off."].filter(Boolean).join(" ");
        return (
          <PanelSection
            key={effect.key}
            id={"fx." + effect.key}
            title={effect.label}
            checked={Boolean(ann[effect.key])}
            onToggle={(on) => toggleEffect(effect, on)}
            hint={hint || undefined}
            onReset={stacked(effect) ? undefined : effect.controls.length > 0 ? () => onPatch(resetPatch(effect.controls)) : undefined}
          >
            {effect.presets && <PresetPicker effect={effect} ann={ann} onPatch={onPatch} />}
            {stacked(effect) && (effect.key === "stroke" ? <StrokeStack ann={ann} onPatch={onPatch} /> : <ShadowStack ann={ann} onPatch={onPatch} />)}
            {!stacked(effect) && effect.controls.length > 0 && <ControlList controls={effect.controls} source={ann} onPatch={onPatch} />}
          </PanelSection>
        );
      })}
    </PanelSection>
  );
}

// An effect's presets: one pick sets all of its numbers; it reads "Custom" once any of them differs.
function PresetPicker({ effect, ann, onPatch }) {
  const values = controlValues(ann, effect.controls);
  const same = (preset) => Object.entries(preset.values).every(([prop, v]) => values[prop] === v);
  const current = (effect.presets.find(same) || { key: "custom" }).key;
  return (
    <div className="ze-format-field">
      <span className="ze-format-label">Preset</span>
      <SelectInput
        options={[...effect.presets.map((p) => ({ key: p.key, label: p.label })), { key: "custom", label: "Custom" }]}
        value={current}
        onChange={(key) => { const preset = effect.presets.find((p) => p.key === key); if (preset) onPatch(preset.values); }}
      />
    </div>
  );
}
