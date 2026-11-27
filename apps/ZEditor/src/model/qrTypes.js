// The kinds of QR code the QR tool can make (a "type chooser"): each is a small form that builds the text a phone recognises. Pure.
//
// A QR code only holds text; "Wi-Fi", "Contact" and so on are text formats the phone understands. Every box can use {{fields}} from the data
// merge: they are kept as they are here (not encoded or escaped), and the merge fills them in later.

export const QR_TYPES = [
  { key: "website", label: "Website", fields: [{ key: "url", label: "Web address", placeholder: "example.com or https://example.com/{{id}}" }] },
  { key: "phone", label: "Phone call", fields: [{ key: "number", label: "Phone number", placeholder: "+60123456789" }] },
  { key: "sms", label: "SMS", fields: [{ key: "number", label: "Phone number", placeholder: "+60123456789" }, { key: "message", label: "Message (optional)", placeholder: "Hello" }] },
  { key: "email", label: "Email", fields: [{ key: "to", label: "To", placeholder: "name@example.com" }, { key: "subject", label: "Subject (optional)", placeholder: "" }, { key: "body", label: "Message (optional)", placeholder: "" }] },
  { key: "whatsapp", label: "WhatsApp", fields: [{ key: "number", label: "Phone number with country code", placeholder: "60123456789" }, { key: "message", label: "Message (optional)", placeholder: "" }] },
  { key: "wifi", label: "Wi-Fi", fields: [{ key: "ssid", label: "Network name", placeholder: "" }, { key: "password", label: "Password", placeholder: "" }, { key: "security", label: "Security", options: [["WPA", "WPA / WPA2"], ["WEP", "WEP"], ["nopass", "No password"]] }, { key: "hidden", label: "Hidden network", checkbox: true }] },
  { key: "contact", label: "Contact card", fields: [{ key: "first", label: "First name", placeholder: "" }, { key: "last", label: "Last name", placeholder: "" }, { key: "org", label: "Organisation (optional)", placeholder: "" }, { key: "title", label: "Job title (optional)", placeholder: "" }, { key: "phone", label: "Phone (optional)", placeholder: "+60123456789" }, { key: "email", label: "Email (optional)", placeholder: "" }, { key: "url", label: "Website (optional)", placeholder: "" }] },
  { key: "location", label: "Map location", fields: [{ key: "lat", label: "Latitude", placeholder: "3.1390" }, { key: "lng", label: "Longitude", placeholder: "101.6869" }] },
  { key: "custom", label: "Custom text", fields: [{ key: "text", label: "Text", placeholder: "https://example.com" }] },
];
export const qrTypeByKey = (key) => QR_TYPES.find((t) => t.key === key) || QR_TYPES[QR_TYPES.length - 1];

const FIELD = /\{\{[^{}]*\}\}/g;

// Applies `fn` to the text between {{fields}} and leaves the fields as they are.
export function mapOutsideFields(text, fn) {
  let out = "", last = 0;
  for (const m of String(text).matchAll(FIELD)) { out += fn(text.slice(last, m.index)) + m[0]; last = m.index + m[0].length; }
  return out + fn(String(text).slice(last));
}
const encode = (text) => mapOutsideFields(text, (s) => encodeURIComponent(s)); // for web addresses
const escapeWifi = (text) => mapOutsideFields(text, (s) => s.replace(/([\\;,:"])/g, "\\$1"));
const escapeCard = (text) => mapOutsideFields(text, (s) => s.replace(/([\\;,])/g, "\\$1").replace(/\r?\n/g, "\\n"));
const trim = (v) => String(v === undefined || v === null ? "" : v).trim();
const digitsOnly = (text) => mapOutsideFields(text, (s) => s.replace(/[^\d]/g, ""));
const phoneChars = (text) => mapOutsideFields(text, (s) => s.replace(/[\s\-().]/g, ""));

// The text for a type and its box values. "" when what the type cannot do without is empty (the code is then left out).
export function buildQrText(typeKey, values = {}) {
  const v = (k) => trim(values[k]);
  switch (typeKey) {
    case "website": {
      const url = v("url");
      return !url ? "" : /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("{{") ? url : "https://" + url; // a bare "example.com" gets https://
    }
    case "phone": return v("number") ? "tel:" + phoneChars(v("number")) : "";
    case "sms": return v("number") ? "SMSTO:" + phoneChars(v("number")) + ":" + v("message") : "";
    case "email": {
      if (!v("to")) return "";
      const parts = [v("subject") && "subject=" + encode(v("subject")), v("body") && "body=" + encode(v("body"))].filter(Boolean);
      return "mailto:" + v("to") + (parts.length ? "?" + parts.join("&") : "");
    }
    case "whatsapp": return v("number") ? "https://wa.me/" + digitsOnly(v("number")) + (v("message") ? "?text=" + encode(v("message")) : "") : "";
    case "wifi": {
      if (!v("ssid")) return "";
      const security = ["WPA", "WEP", "nopass"].includes(values.security) ? values.security : "WPA";
      return "WIFI:T:" + security + ";S:" + escapeWifi(v("ssid")) + ";" + (security === "nopass" ? "" : "P:" + escapeWifi(values.password === undefined ? "" : String(values.password)) + ";") + (values.hidden ? "H:true;" : "") + ";";
    }
    case "contact": {
      if (!v("first") && !v("last")) return "";
      const lines = ["BEGIN:VCARD", "VERSION:3.0", "N:" + escapeCard(v("last")) + ";" + escapeCard(v("first")) + ";;;", "FN:" + escapeCard((v("first") + " " + v("last")).trim())];
      if (v("org")) lines.push("ORG:" + escapeCard(v("org")));
      if (v("title")) lines.push("TITLE:" + escapeCard(v("title")));
      if (v("phone")) lines.push("TEL:" + phoneChars(v("phone")));
      if (v("email")) lines.push("EMAIL:" + v("email"));
      if (v("url")) lines.push("URL:" + v("url"));
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    case "location": return v("lat") && v("lng") ? "geo:" + v("lat") + "," + v("lng") : "";
    default: return values.text === undefined ? "" : String(values.text);
  }
}
