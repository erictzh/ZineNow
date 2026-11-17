// Renders a list of controls from their descriptors.

import { controlValues } from "../../model/controls.js";
import { EFFECT_CONTROL_INPUTS } from "./inputs.jsx";

// Labelled inputs for a list of controls, reading from and patching
// whichever object holds their values (an annotation or a filter).
export function ControlList({ controls, source, onPatch }) {
  const values = controlValues(source, controls);
  return controls.filter((c) => !c.showIf || c.showIf(values)).map(({ kind, prop, label, min, max, options }) => {
    const ControlInput = EFFECT_CONTROL_INPUTS[kind];
    return (
      <div className="ze-format-field" key={prop}>
        <span className="ze-format-label">{label}</span>
        <ControlInput min={min} max={max} options={options} value={values[prop]} onChange={(v) => onPatch({ [prop]: v })} />
      </div>
    );
  });
}
