// Trim-guide paper formats and default margin/bleed.

export const GUIDE_FORMAT_PRESETS = [
  { key: "match", label: "Match Page Size" },
  { key: "half-letter", label: "Half Letter (5.5 × 8.5 in)", widthIn: 5.5, heightIn: 8.5 },
  { key: "digest", label: "Digest (5.5 × 8.25 in)", widthIn: 5.5, heightIn: 8.25 },
  { key: "a5", label: "A5 (5.83 × 8.27 in)", widthIn: 5.83, heightIn: 8.27 },
  { key: "a6", label: "A6 (4.13 × 5.83 in)", widthIn: 4.13, heightIn: 5.83 },
  { key: "quarter-letter", label: "Quarter Letter (4.25 × 5.5 in)", widthIn: 4.25, heightIn: 5.5 },
  { key: "letter", label: "US Letter (8.5 × 11 in)", widthIn: 8.5, heightIn: 11 },
  { key: "a4", label: "A4 (8.27 × 11.69 in)", widthIn: 8.27, heightIn: 11.69 },
];
export const DEFAULT_GUIDE_MARGIN_IN = 0.25;
export const DEFAULT_GUIDE_BLEED_IN = 0.125;
