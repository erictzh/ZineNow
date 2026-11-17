// Draws trim, margin and bleed guide lines over the page.

import { MAIN_SCALE, POINTS_PER_INCH } from "../../constants.js";
import { GUIDE_FORMAT_PRESETS } from "../../model/guides.js";

// ---- Guides overlay -----------------------------------------------
// Trim/margin/bleed guides drawn in real page geometry: `width`/`height`
// are the page's current on-screen pixel size (points * MAIN_SCALE, same
// space annotations live in), so a preset's inch dimensions convert to
// px via POINTS_PER_INCH * MAIN_SCALE and the trim box centers exactly
// on the physical page — no matter the page's actual size or rotation.
export function GuidesOverlay({ width, height, format, marginIn, bleedIn }) {
  const preset = GUIDE_FORMAT_PRESETS.find((p) => p.key === format) || GUIDE_FORMAT_PRESETS[0];
  const toPx = (inches) => inches * POINTS_PER_INCH * MAIN_SCALE;

  const trimW = preset.widthIn ? Math.min(width, toPx(preset.widthIn)) : width;
  const trimH = preset.heightIn ? Math.min(height, toPx(preset.heightIn)) : height;
  const trimX = (width - trimW) / 2;
  const trimY = (height - trimH) / 2;
  const showTrim = preset.key !== "match"; // page edge already reads as the trim line otherwise

  const marginPx = toPx(marginIn || 0);
  const marginW = trimW - marginPx * 2, marginH = trimH - marginPx * 2;
  const showMargin = marginPx > 0 && marginW > 0 && marginH > 0;

  const bleedPx = toPx(bleedIn || 0);
  const showBleed = bleedPx > 0;

  return (
    <svg className="ze-guides-overlay" width={width} height={height} aria-hidden="true">
      {showBleed && (
        <rect
          x={trimX - bleedPx} y={trimY - bleedPx} width={trimW + bleedPx * 2} height={trimH + bleedPx * 2}
          fill="none" stroke="#dd531a" strokeDasharray="2 4" strokeWidth="1" opacity="0.6"
        />
      )}
      {showTrim && (
        <rect x={trimX} y={trimY} width={trimW} height={trimH} fill="none" stroke="#ffffff" strokeDasharray="5 3" strokeWidth="1.25" opacity="0.85" />
      )}
      {showMargin && (
        <rect
          x={trimX + marginPx} y={trimY + marginPx} width={marginW} height={marginH}
          fill="none" stroke="#dd531a" strokeDasharray="4 3" strokeWidth="1.25"
        />
      )}
    </svg>
  );
}
