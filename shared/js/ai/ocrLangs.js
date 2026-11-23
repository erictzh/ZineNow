// The text-reading (OCR) languages: facts to show people (name, size, licence, where the file comes from). The reader is Tesseract.js (Apache-2.0)
// with the "best, integer" trained data from the Tesseract project (Apache-2.0), served by jsDelivr from the npm package @tesseract.js-data/<code>.
export const TJS_VERSION = "5.1.1", CORE_VERSION = "5.1.0", DATA_VERSION = "1.0.0";
export const TJS_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@" + TJS_VERSION + "/dist/tesseract.min.js";
export const WORKER_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@" + TJS_VERSION + "/dist/worker.min.js";
export const CORE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js-core@" + CORE_VERSION;
export const OCR_ENGINE_MB = 4.1; // the reader's code (the core about 3.9 MB, the worker 0.12 MB, the loader 0.07 MB)
export const OCR_ENGINE = { name: "Tesseract.js reader", licence: "Apache-2.0", host: "cdn.jsdelivr.net", repo: "cdn.jsdelivr.net/npm/tesseract.js@" + TJS_VERSION, mb: OCR_ENGINE_MB };

export const OCR_LANGS = [
  { code: "eng", name: "English", mb: 2.95 },
  { code: "msa", name: "Malay (Bahasa Melayu)", mb: 1.18 },
  { code: "ind", name: "Indonesian", mb: 1.19 },
  { code: "chi_sim", name: "Chinese (simplified)", mb: 1.72 },
  { code: "chi_tra", name: "Chinese (traditional)", mb: 1.66 },
  { code: "tam", name: "Tamil", mb: 1.45 },
];
export const ocrLang = (code) => OCR_LANGS.find((l) => l.code === code) || OCR_LANGS[0];
export const ocrLangUrl = (code) => "https://cdn.jsdelivr.net/npm/@tesseract.js-data/" + code + "@" + DATA_VERSION + "/4.0.0_best_int";

// The language as a "model" row like the other models (see modelList.js).
export function ocrModel(l) {
  return {
    key: "ocr-" + l.code, name: l.name, kind: "Text reading (OCR)", label: l.name + " (Text reading)",
    mb: l.mb, licence: "Apache-2.0", host: "cdn.jsdelivr.net", repo: "cdn.jsdelivr.net/npm/@tesseract.js-data/" + l.code,
    about: "The " + l.name + " language file for the Tesseract text reader.",
  };
}
