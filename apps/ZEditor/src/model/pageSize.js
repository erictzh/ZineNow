// Page > Size: change the paper size of a blank page. Pure.
//
// A blank page stores its WHOLE size (`width`/`height` in pt, bleed included) and `bleedMm` (model/bleed.js). The size asked for here is the trimmed
// size, so the page becomes that plus the bleed on every side. Items keep their places (measured from the page's top-left corner): a different
// paper size is not a scale.

import { NEW_DOCUMENT_PRESETS } from "../constants.js";
import { bleedPt, mmToPt, ptToMm } from "./bleed.js";

export const SIZE_MIN_MM = 20, SIZE_MAX_MM = 1200;
export const cleanSizeMm = (value, fallback) => { const v = Number(value); return Number.isFinite(v) && v > 0 ? Math.round(Math.min(SIZE_MAX_MM, Math.max(SIZE_MIN_MM, v)) * 10) / 10 : fallback; };

// The page with its trimmed size set to widthMm x heightMm: { width, height } of the whole page (pt).
export function resizedPage(page, widthMm, heightMm) {
  const b = bleedPt(page);
  return { width: mmToPt(widthMm) + 2 * b, height: mmToPt(heightMm) + 2 * b };
}

// A page's trimmed size in mm, rounded to a tenth: { width, height }.
export function trimSizeMm(page) {
  const b = bleedPt(page);
  return { width: Math.round(ptToMm(page.width - 2 * b) * 10) / 10, height: Math.round(ptToMm(page.height - 2 * b) * 10) / 10 };
}

// The size in mm a preset gives in the chosen orientation.
export function presetSizeMm(preset, landscape) {
  const w = Math.round(ptToMm(preset.width) * 10) / 10, h = Math.round(ptToMm(preset.height) * 10) / 10;
  return landscape ? { width: h, height: w } : { width: w, height: h };
}

export const PAGE_SIZE_PRESETS = NEW_DOCUMENT_PRESETS;
