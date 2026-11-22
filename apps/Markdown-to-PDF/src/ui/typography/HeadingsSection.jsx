// Typography: H1, H2 and H3 sections (each folds away) with size, weight, rule lines and alignment (H4–H6 follow H3).

import { DEFAULTS } from "../../settings/defaults.js";
import { BOLD_WEIGHT_OPTIONS } from "../../settings/initialConfig.js";
import { AlignField, CollapsibleSection, ControlField, HeadingLineControls, SelectInput, TextInput } from "../fields.jsx";

export function HeadingsSection({ config, updateConfig }) {
  return (
    <React.Fragment>
      <HeadingLevel level={1} config={config} updateConfig={updateConfig} />
      <HeadingLevel level={2} config={config} updateConfig={updateConfig} />
      <HeadingLevel level={3} config={config} updateConfig={updateConfig} alignHint="H4–H6 use the H3 setting." />
    </React.Fragment>
  );
}

// One heading level's section, collapsed by default; its settings are h{level}Size, h{level}Weight, h{level}TextAlign.
function HeadingLevel({ level, config, updateConfig, alignHint }) {
  const h = "h" + level;
  return (
    <CollapsibleSection label={`H${level} Heading`}>
      <div className="grid grid-cols-2 gap-3">
        <ControlField label={`H${level} Size (px)`} hint={`Default: ${DEFAULTS[h + "Size"]}px`}>
          <TextInput
            type="number" step="1" min="1"
            value={config[h + "Size"]}
            onChange={(v) => updateConfig(h + "Size", v)}
            placeholder={String(DEFAULTS[h + "Size"])}
            inputMode="decimal"
          />
        </ControlField>
        <ControlField label={`H${level} Weight`} hint={`Default: ${DEFAULTS[h + "Weight"]}`}>
          <SelectInput value={config[h + "Weight"]} onChange={(v) => updateConfig(h + "Weight", v)}>
            {BOLD_WEIGHT_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </SelectInput>
        </ControlField>
      </div>
      <HeadingLineControls level={level} config={config} updateConfig={updateConfig} />
      <AlignField
        label={`H${level} Alignment`}
        value={config[h + "TextAlign"]}
        onChange={(v) => updateConfig(h + "TextAlign", v)}
        allowInherit={true}
        inheritedValue={config.textAlign || "left"}
        hint={alignHint}
      />
    </CollapsibleSection>
  );
}
