// Format panel, QR code: the text the code holds. Plain text draws its code at once; text with {{fields}} shows a grey QR until the data is merged
// (with data connected, the page preview shows each row's code).

import { qrPatch } from "../../../io/qrImage.js";
import { PanelSection } from "../../controls/PanelSection.jsx";

export function QrSection({ ann, patch }) {
  const text = ann.qrText || "";
  return (
    <PanelSection id="image.qr" title="QR code" defaultOpen hint="The code holds this text. Put {{column}} where a value from your data goes, for example https://example.com/{{id}}: the page then shows a grey QR, and each merged page gets its own code.">
      <input
        type="text" className="ze-format-number" aria-label="Text of the QR code" placeholder="https://example.com" autoFocus={text === ""}
        value={text} onChange={(e) => patch(qrPatch(e.target.value))} spellCheck="false"
      />
      <div className="ze-format-empty" style={{ marginTop: 6 }}>
        {text === "" ? "Type the text or web address the code should hold." : text.includes("{{") ? "Shows a grey QR here until the data is merged." : "Print one and scan it with a phone before you print many."}
      </div>
    </PanelSection>
  );
}
