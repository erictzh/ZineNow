// Typography: code blocks — whether they are coloured by their language (document/highlight.js).

import { CollapsibleSection, ToggleRow } from "../fields.jsx";

export function CodeBlocksSection({ config, updateConfig }) {
  return (
    <CollapsibleSection label="Code Blocks">
      <ToggleRow
        checked={config.codeHighlight}
        onChange={(v) => updateConfig("codeHighlight", v)}
        label="Colour code by its language"
      />
      <p className="mb-3text-[11px] leading-relaxed text-fg-muted opacity-70">
        Uses the language after the opening ``` (json, php, liquid, excel-formula…), set with the {"{ }"} button's
        arrow in the Editor tab. Blocks without a language stay plain.
      </p>
    </CollapsibleSection>
  );
}
