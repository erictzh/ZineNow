// Text from image: the language list and the facts shown for it (shared/js/ai/ocrLangs.js).
import { OCR_LANGS, TJS_URL, WORKER_URL, ocrLang, ocrLangUrl, ocrModel } from "../shared/js/ai/ocrLangs.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

ok(new Set(OCR_LANGS.map((l) => l.code)).size === OCR_LANGS.length, "language codes are unique");
ok(OCR_LANGS[0].code === "eng", "English is first (the default)");
ok(OCR_LANGS.every((l) => /^[a-z_]{3,8}$/.test(l.code) && l.mb > 0.5 && l.mb < 10), "every language has a plausible code and size");
ok(ocrLang("msa").name.startsWith("Malay") && ocrLang("nope").code === "eng", "a language is found by code, an unknown one falls back to English");
ok(ocrLangUrl("eng") === "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int", "the language file address is pinned to a version on jsDelivr");
ok(/tesseract\.js@5\.1\.1\/dist\/tesseract\.min\.js$/.test(TJS_URL) && /worker\.min\.js$/.test(WORKER_URL), "the reader's code addresses are version-pinned");
const m = ocrModel(ocrLang("chi_sim"));
ok(m.label === "Chinese (simplified) (Text reading)" && m.licence === "Apache-2.0" && m.host === "cdn.jsdelivr.net" && m.kind === "Text reading (OCR)" && m.mb === 1.72, "a language's facts: name, licence, host, size");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);
