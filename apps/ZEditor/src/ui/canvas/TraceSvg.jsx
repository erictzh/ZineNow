// An Image Trace layer's shapes as an SVG filling its box, in one of the View modes (result, outlines, source).

import { normalizeTraceSettings } from "../../model/trace/traceSettings.js";
import { traceDrawList } from "../../model/trace/traceLayer.js";

const OUTLINE_COLOR = "#2b7fff";

// `view` overrides the layer's own View (the Layers thumbnail always shows the result).
export function TraceSvg({ ann, view }) {
  const shown = view || normalizeTraceSettings(ann.trace).view;
  const box = { width: "100%", height: "100%", display: "block" };
  if (!ann.traceW || !ann.traceH) return null;
  const outlines = shown === "outlines" || shown === "outlinesSource";
  const showSource = (shown === "source" || shown === "outlinesSource") && ann.traceSource;
  return (
    <React.Fragment>
      {showSource && <img src={ann.traceSource} alt="" draggable="false" style={{ ...box, position: "absolute", inset: 0, opacity: shown === "outlinesSource" ? 0.45 : 1 }} />}
      {shown !== "source" && (
        <svg viewBox={`0 0 ${ann.traceW} ${ann.traceH}`} preserveAspectRatio="none" style={{ ...box, position: "absolute", inset: 0, overflow: "visible" }} aria-hidden="true">
          {outlines
            ? (ann.paths || []).map((p, i) => <path key={i} d={p.d} fill="none" stroke={OUTLINE_COLOR} strokeWidth="1" vectorEffect="non-scaling-stroke" />)
            : traceDrawList(ann).map((item, i) => (
              <path
                key={i} d={item.d}
                fill={item.fill || "none"}
                stroke={item.stroke || undefined} strokeWidth={item.stroke ? item.strokeWidth : undefined}
                strokeLinejoin="round" strokeLinecap="round"
              />
            ))}
        </svg>
      )}
    </React.Fragment>
  );
}
