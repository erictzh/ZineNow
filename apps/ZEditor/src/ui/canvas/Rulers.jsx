// Rulers along the top and left of the canvas, and the guides dragged out of them (as in Photoshop).
//
// Drag from the top ruler for a horizontal guide, from the left ruler for a vertical one. Drag a
// guide to move it; drag it back onto its ruler to remove it. Hold Shift to land on whole units.
// The rulers count from the page's top-left corner and follow scrolling and zoom. Guides are
// stored in points (model/rulers.js) with the view settings, so they're saved with the project.
// Editor only: never exported.

import { MAIN_SCALE } from "../../constants.js";
import { dragGain, formatInUnit, guideGap, rulerTicks, snapToUnit } from "../../model/rulers.js";
import { trackPointerDrag } from "../pointer.js";

const { useEffect, useLayoutEffect, useRef, useState } = React;
export const RULER_SIZE = 18; // px, the rulers' thickness (layout.css uses the same)

// Draws one ruler on its canvas. `origin` is where the page's 0 sits along it (css px).
function drawRuler(canvas, horizontal, length, origin, pxPerPt, unit, marks) {
  const dpr = window.devicePixelRatio || 1;
  const w = horizontal ? length : RULER_SIZE, h = horizontal ? RULER_SIZE : length;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(canvas);
  ctx.fillStyle = css.getPropertyValue("--ruler-bg").trim() || "#2a2522";
  ctx.fillRect(0, 0, w, h);
  // The page's own extent, a shade lighter.
  ctx.fillStyle = css.getPropertyValue("--ruler-page").trim() || "#3a3330";
  if (marks.pageLen > 0) {
    if (horizontal) ctx.fillRect(origin, 0, marks.pageLen * pxPerPt, h);
    else ctx.fillRect(0, origin, w, marks.pageLen * pxPerPt);
  }
  // The gap between the two guides around the pointer, lightly tinted.
  if (marks.span) {
    ctx.fillStyle = css.getPropertyValue("--ruler-cursor").trim() || "#f97316";
    ctx.globalAlpha = 0.25;
    const s0 = origin + marks.span.from * pxPerPt, sLen = (marks.span.to - marks.span.from) * pxPerPt;
    if (horizontal) ctx.fillRect(s0, 0, sLen, h);
    else ctx.fillRect(0, s0, w, sLen);
    ctx.globalAlpha = 1;
  }
  const fg = css.getPropertyValue("--ruler-fg").trim() || "#a99f97";
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = 1;
  ctx.font = "9px system-ui, sans-serif";
  ctx.textBaseline = "top";
  const fromPt = -origin / pxPerPt, toPt = (length - origin) / pxPerPt;
  ctx.beginPath();
  for (const t of rulerTicks(fromPt, toPt, pxPerPt, unit)) {
    const at = Math.round(origin + t.pt * pxPerPt) + 0.5;
    const tick = t.size === "major" ? RULER_SIZE : t.size === "mid" ? 7 : 4;
    if (horizontal) { ctx.moveTo(at, RULER_SIZE); ctx.lineTo(at, RULER_SIZE - tick); }
    else { ctx.moveTo(RULER_SIZE, at); ctx.lineTo(RULER_SIZE - tick, at); }
    if (t.size === "major") {
      const label = String(t.value);
      if (horizontal) ctx.fillText(label, at + 2, 1);
      else {
        ctx.save();
        ctx.translate(1, at + 2);
        ctx.rotate(Math.PI / 2);
        ctx.translate(0, -RULER_SIZE + 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }
  ctx.stroke();
  // Where the pointer is, as a thin accent line.
  if (marks.cursor != null) {
    ctx.strokeStyle = css.getPropertyValue("--ruler-cursor").trim() || "#f97316";
    ctx.beginPath();
    const at = Math.round(marks.cursor) + 0.5;
    if (horizontal) { ctx.moveTo(at, 0); ctx.lineTo(at, RULER_SIZE); }
    else { ctx.moveTo(0, at); ctx.lineTo(RULER_SIZE, at); }
    ctx.stroke();
  }
}

export function Rulers({ paneRef, zoom, unit, guides, setGuides, pageKey }) {
  const topRef = useRef(null);
  const leftRef = useRef(null);
  const [geom, setGeom] = useState(null); // { left, top, width, height, pageW, pageH }: the page's 0 and the pane's size (pane px), the page's size (pt)
  const [cursor, setCursor] = useState(null); // { x, y } pointer in pane px, for the ruler marks
  const [drag, setDrag] = useState(null); // { id, axis, pos, isNew, removing, x, y }
  // Where the dragged guide's measurement shows, from the pointer (pane px). With a mouse: just
  // below-right of the pointer. With a finger it would sit under the finger and hand, so it goes
  // well above and to the right of the touch point instead, kept inside the pane (styles: the
  // touch size in styles/touch.css).
  const readoutSpot = (x, y) => {
    if (document.documentElement.getAttribute("data-ze-input") !== "touch") return { left: x + 12, top: y + 12 };
    const pane = paneRef.current;
    const w = pane ? pane.clientWidth : Infinity;
    const left = x + 40 > w - 90 ? x - 130 : x + 40; // flip to the left near the right edge
    return { left: Math.max(4, left), top: Math.max(4, y - 72) };
  };
  const [hover, setHover] = useState(null); // { axis, at }: the pointer over a ruler, `at` px along it
  const pxPerPt = MAIN_SCALE * zoom;

  // The gap between the two guides either side of the pointer while it's over a ruler (not mid-drag).
  // The top ruler measures across, so it looks at the vertical (x) guides; the left ruler at the y ones.
  const gap = hover && geom && !drag
    ? guideGap(guides, hover.axis, (hover.at - geom[hover.axis === "x" ? "left" : "top"]) / pxPerPt)
    : null;
  const hoverOn = (axis) => (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ axis, at: axis === "x" ? e.clientX - r.left : e.clientY - r.top });
  };

  // Where the page sits inside the pane: re-measured on scroll, resize, zoom and page change.
  useLayoutEffect(() => {
    const pane = paneRef.current;
    if (!pane) return undefined;
    let frame = 0;
    const measureNow = () => {
      const art = pane.querySelector(".ze-artboard-zoom");
      const p = pane.getBoundingClientRect();
      if (!art) { setGeom(null); return; }
      const a = art.getBoundingClientRect();
      const k = MAIN_SCALE * zoom;
      setGeom({ left: a.left - p.left, top: a.top - p.top, width: pane.clientWidth, height: pane.clientHeight, pageW: a.width / k, pageH: a.height / k });
    };
    // Scrolling and resizing fire often: those re-measure once per frame.
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measureNow); };
    measureNow();
    pane.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    const art = pane.querySelector(".ze-artboard-zoom");
    if (art) ro.observe(art);
    const onMove = (e) => { const p = pane.getBoundingClientRect(); setCursor({ x: e.clientX - p.left, y: e.clientY - p.top }); };
    const onLeave = () => setCursor(null);
    pane.addEventListener("mousemove", onMove);
    pane.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      pane.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      pane.removeEventListener("mousemove", onMove);
      pane.removeEventListener("mouseleave", onLeave);
      ro.disconnect();
    };
  }, [paneRef, zoom, pageKey]);

  useEffect(() => {
    if (!geom || !topRef.current || !leftRef.current) return;
    const dragAt = drag ? geom[drag.axis === "x" ? "left" : "top"] + drag.pos * pxPerPt : null;
    drawRuler(topRef.current, true, geom.width, geom.left, pxPerPt, unit, {
      pageLen: geom.pageW,
      cursor: drag && drag.axis === "x" ? dragAt : cursor ? cursor.x : null,
      span: gap && hover.axis === "x" ? gap : null,
    });
    drawRuler(leftRef.current, false, geom.height, geom.top, pxPerPt, unit, {
      pageLen: geom.pageH,
      cursor: drag && drag.axis === "y" ? dragAt : cursor ? cursor.y : null,
      span: gap && hover.axis === "y" ? gap : null,
    });
  }, [geom, pxPerPt, unit, cursor, drag, gap && gap.from, gap && gap.to]);

  // Drags a guide (a new one from a ruler, or one already placed). Dropped back on its ruler, or
  // outside the pane, it's removed.
  function startDrag(e, guide) {
    e.preventDefault();
    e.stopPropagation();
    const pane = paneRef.current;
    const coord = (ev) => (guide.axis === "x" ? ev.clientX : ev.clientY);
    const cursorPos = (ev) => {
      const art = pane.querySelector(".ze-artboard-zoom");
      if (!art) return 0;
      const a = art.getBoundingClientRect();
      return (coord(ev) - (guide.axis === "x" ? a.left : a.top)) / pxPerPt;
    };
    // Precision dragging: the guide moves by the pointer's movement times a gain that drops
    // when the pointer slows down (model/rulers.js `dragGain`), so fine steps are easy. A new
    // guide starts under the pointer; an existing one starts where it is.
    let raw = guide.isNew ? cursorPos(e) : guide.pos;
    let last = { c: coord(e), t: e.timeStamp };
    let speed = 0; // px per ms, lightly smoothed (mostly the latest move, so it reacts at once)
    const follow = (ev) => {
      const c = coord(ev), dt = Math.max(1, ev.timeStamp - last.t);
      speed = speed * 0.3 + (Math.abs(c - last.c) / dt) * 0.7;
      raw += ((c - last.c) * dragGain(speed)) / pxPerPt;
      last = { c, t: ev.timeStamp };
    };
    const posAt = (ev) => (ev.shiftKey ? snapToUnit(raw, unit) : Math.round(raw * 100) / 100);
    const outside = (ev) => {
      const p = pane.getBoundingClientRect();
      return guide.axis === "x" ? ev.clientX < p.left || ev.clientX > p.right : ev.clientY < p.top || ev.clientY > p.bottom;
    };
    const update = (ev) => {
      if (ev !== e) follow(ev);
      const p = pane.getBoundingClientRect();
      setDrag({ ...guide, pos: posAt(ev), removing: outside(ev), x: ev.clientX - p.left, y: ev.clientY - p.top });
    };
    update(e);
    trackPointerDrag(update, (ev) => {
      setDrag(null);
      const pos = posAt(ev);
      if (outside(ev)) { if (!guide.isNew) setGuides((gs) => gs.filter((g) => g.id !== guide.id)); return; }
      if (guide.isNew) setGuides((gs) => [...gs, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), axis: guide.axis, pos }]);
      else setGuides((gs) => gs.map((g) => (g.id === guide.id ? { ...g, pos } : g)));
    });
  }

  const shown = guides.filter((g) => !drag || g.id !== drag.id);
  const lineStyle = (axis, pos) => (axis === "x"
    ? { left: geom.left + pos * pxPerPt }
    : { top: geom.top + pos * pxPerPt });

  return (
    <React.Fragment>
      <div className="ze-ruler-corner" title="Rulers count from the page's top-left corner. Drag from a ruler to add a guide." />
      <canvas
        ref={topRef} className="ze-ruler ze-ruler-top"
        onMouseDown={(e) => startDrag(e, { axis: "y", isNew: true, pos: 0 })}
        onMouseMove={hoverOn("x")} onMouseLeave={() => setHover(null)}
      />
      <canvas
        ref={leftRef} className="ze-ruler ze-ruler-left"
        onMouseDown={(e) => startDrag(e, { axis: "x", isNew: true, pos: 0 })}
        onMouseMove={hoverOn("y")} onMouseLeave={() => setHover(null)}
      />
      {geom && (
        <div className="ze-ruler-guides">
          {shown.map((g) => (
            <div
              key={g.id} className={"ze-ruler-guide ze-ruler-guide-" + g.axis} style={lineStyle(g.axis, g.pos)}
              title={`${formatInUnit(g.pos, unit)} · drag to move, drag onto the ruler to remove`}
              onMouseDown={(e) => startDrag(e, g)}
            />
          ))}
          {gap && (
            <div
              className="ze-ruler-readout"
              style={hover.axis === "x" ? { left: hover.at + 12, top: 4 } : { left: 4, top: hover.at + 12 }}
            >
              {formatInUnit(gap.length, unit)}
            </div>
          )}
          {drag && (
            <React.Fragment>
              <div className={"ze-ruler-guide ze-ruler-guide-" + drag.axis + " is-dragging" + (drag.removing ? " is-removing" : "")} style={lineStyle(drag.axis, drag.pos)} />
              <div className="ze-ruler-readout" style={readoutSpot(drag.x, drag.y)}>
                {drag.removing ? "Remove guide" : formatInUnit(drag.pos, unit)}
              </div>
            </React.Fragment>
          )}
        </div>
      )}
    </React.Fragment>
  );
}
