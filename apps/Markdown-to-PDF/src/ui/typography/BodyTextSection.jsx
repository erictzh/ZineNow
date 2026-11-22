// Typography: body text size, line spacing, alignment, paragraph spacing and weights.

import { DEFAULTS } from "../../settings/defaults.js";
import { BOLD_WEIGHT_OPTIONS } from "../../settings/initialConfig.js";
import { AlignField, CollapsibleSection, ControlField, SelectInput, TextInput } from "../fields.jsx";

// A saved value may still be a CSS length from before this box was in px: show it in px (1rem = 1em = 16px).
function paragraphPx(v) {
  const m = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(String(v == null ? "" : v).trim());
  if (!m) return "";
  return m[2] === "rem" || m[2] === "em" ? String(Number((Number(m[1]) * 16).toFixed(2))) : m[1];
}

export function BodyTextSection({ config, updateConfig }) {
  return (
    <CollapsibleSection label="Body Text">
      <div className="grid grid-cols-2 gap-3">
        <ControlField label="Body Font Size (px)" hint={`Default: ${DEFAULTS.fontSize}px`}>
          <TextInput
            type="number" step="1" min="1"
            value={config.fontSize}
            onChange={(v) => updateConfig("fontSize", v)}
            placeholder={String(DEFAULTS.fontSize)}
            inputMode="decimal"
          />
        </ControlField>
        <ControlField label="Line Spacing" hint={`Default: ${DEFAULTS.lineHeight}`}>
          <TextInput
            type="number" step="0.1" min="0.5"
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
      <ControlField label="Paragraph Spacing (px)" hint={`Default: ${DEFAULTS.paragraphSpacing}px`}>
        <TextInput
          type="number" step="1" min="0"
          value={paragraphPx(config.paragraphSpacing)}
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
