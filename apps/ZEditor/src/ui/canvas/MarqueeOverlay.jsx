// The marquee on the page: a rectangle's dotted box with 8 handles and a rotate knob, or a polygon's outline with a handle on each corner. Either can be moved, reshaped and turned.

import { resizedBox } from "../../model/geometry.js";
import { MARQUEE_MIN_SIZE, MIN_POLYGON_POINTS, marqueeCenter, pointsBounds, rotatedMarquee, translatedMarquee } from "../../model/marquee.js";
import { constrainTo45 } from "../../model/rulers.js";
import { dragDeltaFrom, trackPointerDrag } from "../pointer.js";
import { ALL_RESIZE_HANDLES, ResizeHandles } from "./ResizeHandles.jsx";

// `region` is the marquee (model/marquee.js), `onChange(next)` stores a changed one. Handles keep their
// on-screen size at any zoom (styles/compose.css) and get bigger for a finger (styles/touch.css).
// A polygon also needs the page size (for its outline), the pointer's place while it is being drawn
// (`hover`: { x, y, shift }, for the line that follows it) and `toPagePoint(event)` (to turn it).
export function MarqueeOverlay({ region, zoom, pageSize, hover, toPagePoint, onChange, brushLive }) {
  if (!region && !brushLive) return null;
  if ((region && region.kind === "brush") || brushLive) return <BrushMarquee region={region && region.kind === "brush" ? region : null} live={brushLive} pageSize={pageSize} />;
  if (region.kind === "polygon") return <PolygonMarquee region={region} zoom={zoom} pageSize={pageSize} hover={hover} toPagePoint={toPagePoint} onChange={onChange} />;
  return <RectMarquee region={region} zoom={zoom} onChange={onChange} />;
}

function RectMarquee({ region, zoom, onChange }) {
  const angle = region.angle || 0;

  // Dragging inside the box moves it.
  function startMove(e) {
    e.preventDefault();
    e.stopPropagation();
    const original = region;
    const dragDelta = dragDeltaFrom(e, zoom);
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      onChange(translatedMarquee(original, dx, dy));
    });
  }

  // The handle's drag is measured along the box's own (turned) axes; Shift keeps the proportions.
  function startResize(handle, e) {
    const original = region;
    const dragDelta = dragDeltaFrom(e, zoom, angle);
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      onChange({ ...original, ...resizedBox(original, handle, dx, dy, ev.shiftKey, MARQUEE_MIN_SIZE, angle) });
    });
  }

  return (
    <div
      className="ze-marquee"
      style={{ left: region.x, top: region.y, width: region.width, height: region.height, transform: angle ? `rotate(${angle}deg)` : undefined }}
      onMouseDown={startMove}
    >
      <ResizeHandles handles={ALL_RESIZE_HANDLES} onStart={startResize} onRotate={(degrees) => onChange({ ...region, angle: degrees })} />
    </div>
  );
}

function PolygonMarquee({ region, zoom, pageSize, hover, toPagePoint, onChange }) {
  const { points, closed } = region;
  const line = 1 / zoom; // one screen px

  // The line that follows the pointer while the polygon is open.
  let follow = null;
  if (!closed && hover && points.length) {
    const last = points[points.length - 1];
    follow = hover.shift ? constrainTo45({ x: last[0], y: last[1] }, hover) : hover;
  }
  const corners = points.map(([x, y]) => x + "," + y).join(" ");

  function startMove(e) {
    e.preventDefault();
    e.stopPropagation();
    const original = region;
    const dragDelta = dragDeltaFrom(e, zoom);
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      onChange(translatedMarquee(original, dx, dy));
    });
  }

  // A corner handle: reshapes a closed polygon; while it is open, the first one closes it.
  function pressCorner(index, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!closed) {
      if (index === 0 && points.length >= MIN_POLYGON_POINTS) onChange({ ...region, closed: true });
      return;
    }
    const original = region;
    const dragDelta = dragDeltaFrom(e, zoom);
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      onChange({ ...original, points: original.points.map(([x, y], i) => (i === index ? [x + dx, y + dy] : [x, y])) });
    });
  }

  // The knob above the polygon turns every point about the middle of its box.
  function startTurn(e) {
    e.preventDefault();
    e.stopPropagation();
    const original = region;
    const { x: cx, y: cy } = marqueeCenter(original);
    const pointerAngle = (ev) => { const p = toPagePoint(ev); return Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI; };
    const startAngle = pointerAngle(e);
    trackPointerDrag((ev) => {
      let delta = pointerAngle(ev) - startAngle;
      delta = ev.shiftKey ? Math.round(delta / 15) * 15 : delta;
      onChange(rotatedMarquee(original, delta, cx, cy));
    });
  }

  const bounds = closed ? pointsBounds(points) : null;
  const dashes = { strokeDasharray: `${4 * line} ${4 * line}`, strokeWidth: line, fill: "none", strokeLinejoin: "round" };
  return (
    <React.Fragment>
      <svg className="ze-marquee-svg" width={pageSize.width} height={pageSize.height} aria-hidden="true">
        {/* A light line under a dark dashed one, so the outline shows on any picture. */}
        {closed
          ? <polygon points={corners} stroke="rgba(255,255,255,0.85)" strokeWidth={line * 3} fill="none" />
          : <polyline points={corners} stroke="rgba(255,255,255,0.85)" strokeWidth={line * 3} fill="none" />}
        {closed
          ? <polygon className="ze-marquee-poly" points={corners} stroke="#000" {...dashes} fill="transparent" onMouseDown={startMove} />
          : <polyline points={corners} stroke="#000" {...dashes} />}
        {follow && <line x1={points[points.length - 1][0]} y1={points[points.length - 1][1]} x2={follow.x} y2={follow.y} stroke="#000" {...dashes} />}
      </svg>
      {points.map(([x, y], i) => (
        <div
          key={i}
          className={"ze-resize-handle ze-marquee-corner" + (!closed && i === 0 ? " is-first" : "")}
          style={{ left: x, top: y }}
          title={!closed && i === 0 && points.length >= MIN_POLYGON_POINTS ? "Close the shape" : undefined}
          onMouseDown={(e) => pressCorner(i, e)}
        />
      ))}
      {closed && <div className="ze-rotate-handle" title="Rotate (hold Shift to snap to 15°)" style={{ left: bounds.x + bounds.width / 2, top: bounds.y - 22 / zoom }} onMouseDown={startTurn} />}
    </React.Fragment>
  );
}

// The Brush marquee: the painted area as a tint over the page. The strokes are drawn into an SVG mask in order (paint white, erase black),
// so a stroke that rubs out only rubs out what came before it, and the tint stays sharp at any zoom. It takes no presses itself.
const strokePathD = (s) => s.points.map(([x, y], i) => (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1)).join(" ") + (s.points.length === 1 ? " L" + (s.points[0][0] + 0.01).toFixed(2) + " " + s.points[0][1].toFixed(1) : "");
function BrushMarquee({ region, live, pageSize }) {
  const strokes = [...(region ? region.strokes : []), ...(live ? [live] : [])];
  return (
    <svg className="ze-brush-mask" width={pageSize.width} height={pageSize.height} aria-hidden="true">
      <defs>
        <mask id="ze-brush-mask-shape" maskUnits="userSpaceOnUse" x="0" y="0" width={pageSize.width} height={pageSize.height}>
          <rect width={pageSize.width} height={pageSize.height} fill="#000" />
          {strokes.map((s, i) => <path key={i} d={strokePathD(s)} fill="none" stroke={s.erase ? "#000" : "#fff"} strokeWidth={s.size} strokeLinecap="round" strokeLinejoin="round" />)}
        </mask>
      </defs>
      <rect width={pageSize.width} height={pageSize.height} fill="rgba(232, 98, 42, 0.5)" mask="url(#ze-brush-mask-shape)" />
    </svg>
  );
}
