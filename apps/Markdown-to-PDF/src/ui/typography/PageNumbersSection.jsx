// Typography: page numbers on every page, and the number to start from.

import { DEFAULTS } from "../../settings/defaults.js";
import { ControlField, SectionLabel, TextInput, ToggleRow } from "../fields.jsx";

export function PageNumbersSection({ config, updateConfig }) {
  return (
    <React.Fragment>
      <SectionLabel>Page Numbers</SectionLabel>
      <ToggleRow
        checked={config.pageNumbersEnabled}
        onChange={(v) => updateConfig("pageNumbersEnabled", v)}
        label="Show page number on every page"
      />
      {config.pageNumbersEnabled ? (
        <ControlField label="Page Start From" hint={`Default: ${DEFAULTS.pageStartFrom}`}>
          <TextInput
            value={config.pageStartFrom}
            onChange={(v) => updateConfig("pageStartFrom", v)}
            placeholder={String(DEFAULTS.pageStartFrom)}
            inputMode="numeric"
          />
        </ControlField>
      ) : null}
    </React.Fragment>
  );
}
