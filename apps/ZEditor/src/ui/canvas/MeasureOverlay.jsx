// The Measure tool's line over the page: two endpoints (drag either to adjust), the distance between them
// in the ruler's unit, and the two legs and angle. Editor only: never exported.
//
// Sits inside the zoomed page, so lengths are page px and everything that should keep its on-screen
// size (handles, label) is scaled back by 1/zoom.

import { MAIN_SCALE } from "../../constants.js";
import { formatInUnit, measureBetween } from "../../model/rulers.js";

export function MeasureOverlay({ measure, pageSize, zoom, unit, onHandleDown }) {
  const { a, b } = measure;
  const pt = measureBetween({ x: a.x / MAIN_SCALE, y: a.y / MAIN_SCALE }, { x: b.x / MAIN_SCALE, y: b.y / MAIN_SCALE });
  const back = `scale(${1 / zoom})`;
  // While waiting for the second click only point a shows, as a plain dot a click passes through.
  const handle = (which, p) => (
    <div
      key={which} className={"ze-measure-handle" + (measure.pending ? " is-waiting" : "")}
      style={{ left: p.x, top: p.y, transform: `translate(-50%, -50%) ${back}` }}
      onMouseDown={measure.pending ? undefined : (e) => onHandleDown(e, which)}
    />
  );
  return (
    <React.Fragment>
      {!measure.pending && (
        <svg className="ze-measure-svg" width={pageSize.width} height={pageSize.height} aria-hidden="true">
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="ze-measure-halo" vectorEffect="non-scaling-stroke" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="ze-measure-line" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {handle("a", a)}
      {!measure.pending && handle("b", b)}
      {!measure.pending && pt.length > 0 && (
        // Beside the far end, flipped to its other side near the page's right or bottom edge so it stays in view.
        <div
          className="ze-measure-readout"
          style={{
            left: b.x, top: b.y,
            transform: `${back} translate(${b.x > pageSize.width * 0.6 ? "calc(-100% - 12px)" : "12px"}, ${b.y > pageSize.height * 0.9 ? "calc(-100% - 12px)" : "12px"})`,
          }}
        >
          <strong>{formatInUnit(pt.length, unit)}</strong>
          <span>Δx {formatInUnit(Math.abs(pt.dx), unit)} · Δy {formatInUnit(Math.abs(pt.dy), unit)} · {pt.angle}°</span>
        </div>
      )}
    </React.Fragment>
  );
}
