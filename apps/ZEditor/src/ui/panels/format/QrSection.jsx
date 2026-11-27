// Format panel, QR code: pick what kind of code it is (website, Wi-Fi, contact card...) and fill in a few boxes; the text the phone reads is built
// from them (model/qrTypes.js). Boxes can use {{fields}}: the page then shows a grey QR until the data is merged (with data connected, the page
// preview shows each row's code). "Custom text" is a single free box.

import { qrPatch } from "../../../io/qrImage.js";
import { QR_TYPES, buildQrText, qrTypeByKey } from "../../../model/qrTypes.js";
import { PanelSection } from "../../controls/PanelSection.jsx";

export function QrSection({ ann, patch }) {
  const typeKey = ann.qrType || "custom";
  const type = qrTypeByKey(typeKey);
  const values = ann.qrValues || (typeKey === "custom" ? { text: ann.qrText || "" } : {});
  const text = ann.qrText || "";
  const update = (nextType, nextValues) => patch({ ...qrPatch(buildQrText(nextType, nextValues)), qrType: nextType, qrValues: nextValues });
  const chooseType = (key) => update(key, key === "custom" ? { text } : key === "wifi" ? { security: "WPA" } : {});
  return (
    <PanelSection id="image.qr" title="QR code" defaultOpen hint="Choose what the code does when someone scans it, then fill in the boxes. Put {{column}} in a box where a value from your data goes, for example https://example.com/{{id}}: the page then shows a grey QR, and each merged page gets its own code.">
      <label className="ze-format-label" htmlFor="qr-type">Type</label>
      <select id="qr-type" className="ze-format-select" value={typeKey} onChange={(e) => chooseType(e.target.value)}>
        {QR_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
      {type.fields.map((f, i) => (
        <div key={typeKey + f.key} style={{ marginTop: 8 }}>
          {f.checkbox ? (
            <label className="ze-format-label"><input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => update(typeKey, { ...values, [f.key]: e.target.checked })} /> {f.label}</label>
          ) : (
            <>
              <label className="ze-format-label">{f.label}</label>
              {f.options ? (
                <select className="ze-format-select" value={values[f.key] || f.options[0][0]} onChange={(e) => update(typeKey, { ...values, [f.key]: e.target.value })}>
                  {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input
                  type="text" className="ze-format-number" aria-label={f.label} placeholder={f.placeholder} autoFocus={i === 0 && text === ""}
                  value={values[f.key] || ""} onChange={(e) => update(typeKey, { ...values, [f.key]: e.target.value })} spellCheck="false"
                />
              )}
            </>
          )}
        </div>
      ))}
      <div className="ze-format-empty" style={{ marginTop: 8 }}>
        {text === "" ? "Fill in the boxes above and the code appears." : text.includes("{{") ? "Shows a grey QR here until the data is merged." : "Print one and scan it with a phone before you print many."}
      </div>
    </PanelSection>
  );
}
