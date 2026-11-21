// The code block languages the editor offers: the tag written after ``` and the file extensions
// "From file…" recognises. The tags are names Prism knows (document/highlight.js colours them).

export const CODE_LANGUAGES = [
  { tag: "", label: "Plain text", ext: [".txt", ".log", ".csv"] },
  { tag: "json", label: "JSON", ext: [".json"] },
  { tag: "javascript", label: "JavaScript", ext: [".js", ".mjs", ".cjs", ".jsx"] },
  { tag: "php", label: "PHP", ext: [".php"] },
  { tag: "liquid", label: "Liquid (Shopify)", ext: [".liquid"] },
  { tag: "python", label: "Python", ext: [".py"] },
  { tag: "html", label: "HTML", ext: [".html", ".htm", ".xml", ".svg"] },
  { tag: "css", label: "CSS", ext: [".css"] },
  { tag: "bash", label: "Shell", ext: [".sh", ".bash", ".zsh"] },
  { tag: "yaml", label: "YAML", ext: [".yml", ".yaml"] },
  { tag: "excel-formula", label: "Excel formula", ext: [] },
  { tag: "markdown", label: "Markdown", ext: [".md", ".markdown"] },
];

// The language tag for a file name, by its extension ("" = plain text, also for unknown ones).
export function languageForFile(name) {
  const dot = String(name || "").lastIndexOf(".");
  if (dot < 0) return "";
  const ext = String(name).slice(dot).toLowerCase();
  const lang = CODE_LANGUAGES.find((l) => l.ext.includes(ext));
  return lang ? lang.tag : "";
}

// A tag's menu label ("json" → "JSON"); a typed tag the list doesn't have is shown as is.
export function languageLabel(tag) {
  const lang = CODE_LANGUAGES.find((l) => l.tag === tag);
  return lang ? lang.label : tag;
}

// Cleans a typed tag: no spaces or backticks (they would end the fence's info string), lower case.
export function cleanLanguageTag(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s`]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
}
