// Typography: paper size and margins.

import { DEFAULTS } from "../../settings/defaults.js";
import { PAPER_SIZE_OPTIONS } from "../../settings/initialConfig.js";
import { CollapsibleSection, ControlField, SelectInput, TextInput } from "../fields.jsx";

export function PageSection({ config, updateConfig }) {
  return (
    <CollapsibleSection label="Page" defaultOpen={true}>
      <ControlField label="Paper Size">
        <SelectInput value={config.paperSize} onChange={(v) => updateConfig("paperSize", v)}>
          {PAPER_SIZE_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </SelectInput>
      </ControlField>
      <div className="grid grid-cols-2 gap-3">
        <ControlField label="Margin — Vertical (in)" hint={`Default: ${DEFAULTS.marginVerticalIn}in`}>
          <TextInput
            value={config.marginVertical}
            onChange={(v) => updateConfig("marginVertical", v)}
            placeholder={String(DEFAULTS.marginVerticalIn)}
            inputMode="decimal"
          />
        </ControlField>
        <ControlField label="Margin — Horizontal (in)" hint={`Default: ${DEFAULTS.marginHorizontalIn}in`}>
          <TextInput
            value={config.marginHorizontal}
            onChange={(v) => updateConfig("marginHorizontal", v)}
            placeholder={String(DEFAULTS.marginHorizontalIn)}
            inputMode="decimal"
          />
        </ControlField>
      </div>
    </CollapsibleSection>
  );
}
