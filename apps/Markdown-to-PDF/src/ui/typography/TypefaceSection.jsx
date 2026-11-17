// Typography: body font, and the heading font (same as body, or its own).

import { ControlField, SectionLabel, ToggleRow } from "../fields.jsx";
import { FontCombobox } from "../FontCombobox.jsx";

export function TypefaceSection({ config, updateConfig, fontOptions, setFontOptions }) {
  return (
    <React.Fragment>
      <SectionLabel>Typeface</SectionLabel>
      <ControlField label="Font Family">
        <FontCombobox
          fontOptions={fontOptions}
          setFontOptions={setFontOptions}
          value={config.fontFamily}
          onChange={(v) => updateConfig("fontFamily", v)}
        />
      </ControlField>
      <span className="block text-xs font-medium text-fg-muted mb-1.5">Heading Font Family</span>
      <ToggleRow
        checked={config.headingFontSameAsBody}
        label="Same as body font"
        onChange={(same) => {
          updateConfig("headingFontSameAsBody", same);
          // Unticking starts the custom picker on the current body font
          // rather than an empty box.
          if (!same && !String(config.headingFontFamily || "").trim()) updateConfig("headingFontFamily", config.fontFamily);
        }}
      />
      {!config.headingFontSameAsBody ? (
        <ControlField label="Custom Heading Font" hint="Used for H1–H6. Leave blank to fall back to the body font.">
          <FontCombobox
            fontOptions={fontOptions}
            setFontOptions={setFontOptions}
            value={config.headingFontFamily}
            onChange={(v) => updateConfig("headingFontFamily", v)}
          />
        </ControlField>
      ) : null}
    </React.Fragment>
  );
}
