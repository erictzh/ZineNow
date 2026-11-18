// Trim-guide paper formats and default margin/bleed.

// Labels show the size in mm, e.g. "A5 (148mm × 210mm)".
const mmText = (inches) => String(Math.round(inches * 254) / 10);
const sized = (key, name, widthIn, heightIn) => ({ key, label: `${name} (${mmText(widthIn)}mm × ${mmText(heightIn)}mm)`, widthIn, heightIn });
export const GUIDE_FORMAT_PRESETS = [
  { key: "match", label: "Match Page Size" },
  sized("half-letter", "Half Letter", 5.5, 8.5),
  sized("digest", "Digest", 5.5, 8.25),
  sized("a5", "A5", 148 / 25.4, 210 / 25.4),
  sized("a6", "A6", 105 / 25.4, 148 / 25.4),
  sized("quarter-letter", "Quarter Letter", 4.25, 5.5),
  sized("letter", "US Letter", 8.5, 11),
  sized("a4", "A4", 210 / 25.4, 297 / 25.4),
];
export const DEFAULT_GUIDE_MARGIN_IN = 0.25;
export const DEFAULT_GUIDE_BLEED_IN = 0.125;
