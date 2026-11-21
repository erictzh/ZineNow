// Typography: body text size, line spacing, alignment, paragraph spacing and weights.

import { DEFAULTS } from "../../settings/defaults.js";
import { BOLD_WEIGHT_OPTIONS } from "../../settings/initialConfig.js";
import { AlignField, CollapsibleSection, ControlField, SelectInput, TextInput } from "../fields.jsx";

export function BodyTextSection({ config, updateConfig }) {
  return (
    <CollapsibleSection label="Body Text">
      <div className="grid grid-cols-2 gap-3">
        <ControlField label="Body Font Size (px)" hint={`Default: ${DEFAULTS.fontSize}px`}>
          <TextInput
            value={config.fontSize}
            onChange={(v) => updateConfig("fontSize", v)}
            placeholder={String(DEFAULTS.fontSize)}
            inputMode="decimal"
          />
        </ControlField>
        <ControlField label="Line Spacing" hint={`Default: ${DEFAULTS.lineHeight}`}>
          <TextInput
            value={config.lineHeight}
            onChange={(v) => updateConfig("lineHeight", v)}
            placeholder={String(DEFAULTS.lineHeight)}
            inputMode="decimal"
          />
        </ControlField>
      </div>
      <AlignField
        label="Text Alignment"
        value={config.textAlign || "left"}
        onChange={(v) => updateConfig("textAlign", v)}
        hint="Code blocks and tables stay left-aligned."
      />
      <ControlField label="Paragraph Spacing" hint={`Default: ${DEFAULTS.paragraphSpacing} (accepts px, rem, em…)`}>
        <TextInput
          value={config.paragraphSpacing}
          onChange={(v) => updateConfig("paragraphSpacing", v)}
          placeholder={DEFAULTS.paragraphSpacing}
        />
      </ControlField>
      <ControlField label="Base Font Weight (Regular)" hint={`Default: ${DEFAULTS.baseWeight}`}>
        <SelectInput value={config.baseWeight} onChange={(v) => updateConfig("baseWeight", v)}>
          <option value="300">300 — Light</option>
          <option value="400">400 — Regular</option>
          <option value="500">500 — Medium</option>
        </SelectInput>
      </ControlField>
      <ControlField label="Bold Text Weight (Strong tags)" hint={`Default: ${DEFAULTS.boldWeight}`}>
        <SelectInput value={config.boldWeight} onChange={(v) => updateConfig("boldWeight", v)}>
          {BOLD_WEIGHT_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </SelectInput>
      </ControlField>
    </CollapsibleSection>
  );
}
