// Page-number settings and which number (if any) each page shows.

// ---- Page numbers. One document-wide setting: which pages carry a number
// (from / to, counted by position in the document; to = 0 means the last
// page), what number the first of them shows, and how it looks. Drawn
// last on each exported page, and shown as a live overlay in the editor.
export const DEFAULT_PAGE_NUMBERS = { on: false, from: 1, to: 0, first: 1, position: "bottom-outside", format: "n", size: 10, color: "#1a1a1a", marginIn: 0.4 };
export const PAGE_NUMBER_POSITIONS = [
  { key: "bottom-outside", label: "Bottom, outer corner" },
  { key: "bottom-center", label: "Bottom, center" },
  { key: "bottom-left", label: "Bottom left" },
  { key: "bottom-right", label: "Bottom right" },
  { key: "top-outside", label: "Top, outer corner" },
  { key: "top-center", label: "Top, center" },
  { key: "top-left", label: "Top left" },
  { key: "top-right", label: "Top right" },
];
export const PAGE_NUMBER_FORMATS = [{ key: "n", label: "1" }, { key: "dash", label: "– 1 –" }, { key: "page", label: "Page 1" }];

// What to print on the page at `pageIdx` (0-based), or null when it has no
// number. "Outer corner" puts odd pages (right-hand, as in a printed
// booklet) at the right edge and even pages at the left.
export function pageNumberSpec(settings, pageIdx, pageCount) {
  if (!settings.on || pageIdx === null || pageIdx < 0) return null;
  const position = pageIdx + 1;
  const last = settings.to > 0 ? Math.min(settings.to, pageCount) : pageCount;
  if (position < settings.from || position > last) return null;
  const number = settings.first + (position - settings.from);
  const text = settings.format === "dash" ? `– ${number} –` : settings.format === "page" ? `Page ${number}` : String(number);
  let place = settings.position;
  if (place.endsWith("-outside")) place = place.replace("outside", position % 2 === 1 ? "right" : "left");
  const [vertical, horizontal] = place.split("-");
  return { text, vertical, horizontal, size: settings.size, color: settings.color, marginIn: settings.marginIn };
}
