// Small things drawn over the page while editing: the stroke being drawn, the soft-eraser cursor, and the guide/page-number previews.

import { MAIN_SCALE } from "../../constants.js";
import { smoothPathD, taperedPathD } from "../../model/strokes.js";
import { GuidesOverlay } from "./GuidesOverlay.jsx";

// The pen/highlighter stroke while the mouse is still down.
export function LiveStroke({ drawing, pageSize }) {
  return (
    <svg className="ze-stroke-svg" width={pageSize.width} height={pageSize.height}>
      {drawing && (drawing.taper > 0 ? (
        <path
          d={taperedPathD(drawing.points, drawing.width, drawing.taper)}
          fill={drawing.color}
          fillOpacity={drawing.tool === "highlighter" ? 0.45 : 1}
          stroke="none"
        />
      ) : (
        <path
          d={smoothPathD(drawing.points)}
          fill="none"
          stroke={drawing.color}
          strokeWidth={drawing.width}
          strokeOpacity={drawing.tool === "highlighter" ? 0.45 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// The soft eraser's brush circle, with its hard core when partly soft.
export function BrushCursor({ pos, softEraser }) {
  return (
    <div className="ze-brush-cursor" style={{ left: pos.x, top: pos.y, width: softEraser.size, height: softEraser.size }}>
      {softEraser.softness > 0 && softEraser.softness < 100 && (
        <div className="ze-brush-cursor-core" style={{ width: `${100 - softEraser.softness}%`, height: `${100 - softEraser.softness}%` }} />
      )}
    </div>
  );
}

// Page number preview, trim guides and the center guide. Editor-only:
// the page number shows where it will print (the real one is drawn at
// Export); guides are never drawn into Export.
export function PageOverlays({ pageSize, numberSpec, guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn }) {
  if (pageSize.width <= 0) return null;
  return (
    <React.Fragment>
      {numberSpec && (
        <div
          className="ze-page-number"
          style={{
            fontSize: numberSpec.size * MAIN_SCALE,
            color: numberSpec.color,
            [numberSpec.vertical]: numberSpec.marginIn * 72 * MAIN_SCALE,
            ...(numberSpec.horizontal === "center"
              ? { left: 0, right: 0, textAlign: "center" }
              : { [numberSpec.horizontal]: numberSpec.marginIn * 72 * MAIN_SCALE }),
          }}
        >{numberSpec.text}</div>
      )}
      {guidesOn && (
        <GuidesOverlay
          width={pageSize.width}
          height={pageSize.height}
          format={guideFormat}
          marginIn={guideMarginIn}
          bleedIn={guideBleedIn}
        />
      )}
      {centerGuideOn && (
        // The page's vertical middle — where a two-page spread folds.
        <svg className="ze-guides-overlay" width={pageSize.width} height={pageSize.height} aria-hidden="true">
          <line
            x1={pageSize.width / 2} y1={0} x2={pageSize.width / 2} y2={pageSize.height}
            stroke="#1d9bf0" strokeDasharray="6 4" strokeWidth="1.25"
          />
        </svg>
      )}
    </React.Fragment>
  );
}
