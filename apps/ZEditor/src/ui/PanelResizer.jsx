// A draggable line between the canvas and a side panel (the Pages list on the left, the Format panel on
// the right): drag it to make the panel wider or narrower, double-click it (or press Home) to go back to
// the default width. The width is remembered for next time. Each panel's width is a CSS variable
// (base.css), so the handle only has to set it; the canvas and the rulers re-measure themselves.

const { useLayoutEffect, useRef } = React;

const MIN_CANVAS = 360; // px: the canvas always keeps at least this much room
const KEY_STEP = 16;

// `side` is the side the panel is on ("left" | "right"); `cssVar` its width variable and `otherVar` the
// other panel's (so the two together never crowd the canvas); `bodyRef` the row holding all three.
export function PanelResizer({ bodyRef, side, cssVar, otherVar, storageKey, min, max, label }) {
  const widthRef = useRef(null); // px, or null while it's the default

  const cssPx = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  // Kept between the panel's own limits and what leaves the canvas its room.
  const clamp = (px) => {
    const body = bodyRef.current;
    const room = (body ? body.getBoundingClientRect().width : window.innerWidth) - (otherVar ? cssPx(otherVar) : 0) - MIN_CANVAS;
    return Math.round(Math.min(Math.max(min, Math.min(max, room)), Math.max(min, px)));
  };
  // The page sits in padding worked out from the pane's width (styles/layout.css: the outer canvas), so a pane that gets a
  // little wider would slide the page along by several times as much. This measures where the page is before the
  // change, makes the change, and scrolls the pane by the difference, so the page stays exactly where it was.
  const keepCanvasStill = (change) => {
    const pane = document.querySelector(".preview-pane");
    const board = pane && pane.querySelector(".ze-artboard-zoom");
    if (!board) { change(); return; }
    const where = () => { const p = pane.getBoundingClientRect(), b = board.getBoundingClientRect(); return [b.left - p.left, b.top - p.top]; };
    const before = where();
    change();
    const after = where(); // reading it makes the browser lay the page out again with the new width
    pane.scrollLeft += after[0] - before[0];
    pane.scrollTop += after[1] - before[1];
  };
  const apply = (px, save) => keepCanvasStill(() => applyWidth(px, save));
  const applyWidth = (px, save) => {
    const root = document.documentElement;
    if (px == null) {
      widthRef.current = null;
      root.style.removeProperty(cssVar);
      try { localStorage.removeItem(storageKey); } catch (e) { /* storage blocked: the width just isn't remembered */ }
    } else {
      widthRef.current = clamp(px);
      root.style.setProperty(cssVar, widthRef.current + "px");
      if (save) { try { localStorage.setItem(storageKey, String(widthRef.current)); } catch (e) { /* as above */ } }
    }
  };

  // A saved width is used again before the first paint, and a smaller window pulls the panel in so the canvas keeps its room.
  useLayoutEffect(() => {
    let saved = null;
    try { saved = parseInt(localStorage.getItem(storageKey), 10); } catch (e) { /* no saved width */ }
    if (saved > 0) apply(saved, false);
    const onResize = () => {
      if (widthRef.current != null && clamp(widthRef.current) !== widthRef.current) apply(widthRef.current, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Dragging: a left panel's width is the distance from the row's left edge to the pointer; a right panel's, from the pointer to the row's right edge.
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add("is-dragging");
    document.body.style.userSelect = "none";
  };
  const onPointerMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const box = bodyRef.current.getBoundingClientRect();
    apply(side === "left" ? e.clientX - box.left : box.right - e.clientX, false);
  };
  const endDrag = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    e.currentTarget.classList.remove("is-dragging");
    document.body.style.userSelect = "";
    if (widthRef.current != null) { try { localStorage.setItem(storageKey, String(widthRef.current)); } catch (err) { /* not remembered */ } }
  };
  // From the keyboard: the arrows nudge it (toward the canvas makes the panel narrower), Home resets it.
  const onKeyDown = (e) => {
    const grow = side === "left" ? "ArrowRight" : "ArrowLeft", shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
    if (e.key === grow) { e.preventDefault(); apply(cssPx(cssVar) + KEY_STEP, true); }
    else if (e.key === shrink) { e.preventDefault(); apply(cssPx(cssVar) - KEY_STEP, true); }
    else if (e.key === "Home") { e.preventDefault(); apply(null); }
  };

  return (
    <div
      className={"ze-panel-resizer ze-panel-resizer-" + side}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => apply(null)}
      onKeyDown={onKeyDown}
    />
  );
}
