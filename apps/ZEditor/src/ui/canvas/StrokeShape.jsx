// One pen or highlighter stroke on the page.

import { bboxOf } from "../../model/annotations.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS, smoothPathD, taperedPathD } from "../../model/strokes.js";

// ---- One freehand stroke (pen or highlighter) -----------------------
// Rendered as a smoothed SVG path; a dashed bounding box appears around
// it when selected. The stroke itself only captures clicks in Select
// tool (pointer-events toggle below) so it doesn't intercept
// drawing/text clicks meant for the page background.
export function StrokeShape({ ann, tool, isSelected, onPress }) {
  const isHi = ann.tool === "highlighter";
  const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
  const width = ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width);
  const taper = ann.taper || 0;
  const box = bboxOf(ann);
  const handleMouseDown = (e) => { if (tool === "select") onPress(e, ann); };
  const pickable = tool === "select" && !ann.locked;
  const selectCursor = { cursor: pickable ? "move" : "default" };
  return (
    <React.Fragment>
      {taper > 0 ? (
        <path
          data-ann-id={ann.id}
          d={taperedPathD(ann.points, width, taper)}
          fill={color}
          fillOpacity={isHi ? 0.45 : 1}
          stroke="none"
          style={{ pointerEvents: pickable ? "fill" : "none", ...selectCursor }}
          onMouseDown={handleMouseDown}
        />
      ) : (
        <path
          data-ann-id={ann.id}
          d={smoothPathD(ann.points)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeOpacity={isHi ? 0.45 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: pickable ? "stroke" : "none", ...selectCursor }}
          onMouseDown={handleMouseDown}
        />
      )}
      {isSelected && (
        <rect
          x={box.x - 6} y={box.y - 6}
          width={box.width + 12} height={box.height + 12}
          fill="none" stroke="#dd531a" strokeDasharray="4 3" strokeWidth="1.5"
          pointerEvents="none"
        />
      )}
    </React.Fragment>
  );
}
