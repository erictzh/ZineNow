// Typography: the table of contents (which headings, title, per-level style, page numbers).

import { DEFAULTS } from "../../settings/defaults.js";
import { AlignField, ControlField, SectionLabel, SelectInput, TextInput, TocLevelStyle, ToggleRow } from "../fields.jsx";

export function TocSection({ config, updateConfig }) {
  return (
    <React.Fragment>
      <SectionLabel>Table of Contents</SectionLabel>
      <p className="mb-3 text-[11px] leading-relaxed text-fg-muted opacity-70">
        {"Put "}
        <code className="text-[10px]">\toc</code>
        {" on its own line (or use + ToC above the editor) where the list should go. Entries link to their headings in the PDF."}
      </p>
      <ControlField label="Include Headings">
        <SelectInput value={config.tocLevels} onChange={(v) => updateConfig("tocLevels", v)}>
          <option value="1">H1 only</option>
          <option value="2">H1 – H2</option>
          <option value="3">H1 – H3</option>
        </SelectInput>
      </ControlField>
      <ToggleRow checked={config.tocShowTitle} onChange={(v) => updateConfig("tocShowTitle", v)} label="Show title" />
      {config.tocShowTitle ? (
        <ControlField label="Title" hint={`Default: ${DEFAULTS.tocTitle || "Contents"}. Styled like H2.`}>
          <TextInput
            value={config.tocTitle}
            onChange={(v) => updateConfig("tocTitle", v)}
            placeholder={String(DEFAULTS.tocTitle || "Contents")}
          />
        </ControlField>
      ) : null}
      {config.tocShowTitle ? (
        <AlignField
          label="Title Alignment"
          value={config.tocTitleAlign}
          onChange={(v) => updateConfig("tocTitleAlign", v)}
          allowInherit={true}
          linkLabel="H2"
          inheritedValue={config.h2TextAlign || config.textAlign || "left"}
        />
      ) : null}
      {[1, 2, 3]
        .filter((n) => n <= (parseInt(config.tocLevels, 10) || 3))
        .map((n) => (
          <TocLevelStyle key={n} level={n} config={config} updateConfig={updateConfig} />
        ))}
      <p className="-mt-2 mb-3 text-[11px] text-fg-muted opacity-70">Leave a box blank to match body text.</p>
      <ToggleRow checked={config.tocPageNumbers} onChange={(v) => updateConfig("tocPageNumbers", v)} label="Show page numbers" />
      {config.tocPageNumbers ? (
        <ToggleRow checked={config.tocDotLeaders} onChange={(v) => updateConfig("tocDotLeaders", v)} label="Dotted line to page number" />
      ) : null}
      <ToggleRow
        checked={config.tocPageBreakAfter}
        onChange={(v) => updateConfig("tocPageBreakAfter", v)}
        label="Start a new page after the contents"
      />
    </React.Fragment>
  );
}
