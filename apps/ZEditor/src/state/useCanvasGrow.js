// A "no paper" page (page.isCanvas, made in New document) grows to hold its items instead of having a fixed sheet.
// When an item comes within CANVAS_GROW_TRIGGER_PX of an edge (or past it, e.g. drawn on the outer canvas) the page
// grows on that side until there is CANVAS_GROW_MARGIN_PX of room beyond the content. It never shrinks.
// Growing left or up moves the page's origin, so every item is shifted by the same amount and the view is scrolled
// by the same amount (ComposeCanvas, canvasGrowShift), so nothing seems to move. It waits until the mouse/finger is
// released, so a drag in progress is never disturbed, and it is not an undo step of its own: the page's size and its
// items' places are saved together in every undo snapshot.

import { CANVAS_GROW_MARGIN_PX, CANVAS_GROW_TRIGGER_PX, MAIN_SCALE } from "../constants.js";
import { translatedAnnotation } from "../model/annotations.js";
import { annotationBounds } from "../render/itemGeometry.js";
import { makeBlankThumb } from "../render/pageRender.js";

const { useEffect, useRef, useState } = React;

// Set when the selected page grows left/up, read once by ComposeCanvas to keep the view still: { key, sx, sy, left, top, zoom }.
export const canvasGrowShift = { pending: null };

// What a no-paper page needs: null if nothing, else { sx, sy, width, height } (the shift in editor px, the new size in the page's own units).
export function growthPlan(page) {
  if (!page || !page.isCanvas || !page.annotations || !page.annotations.length) return null;
  const swapped = (page.rotation || 0) % 180 !== 0;
  const dispW = (swapped ? page.height : page.width) * MAIN_SCALE;
  const dispH = (swapped ? page.width : page.height) * MAIN_SCALE;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of page.annotations) {
    const b = annotationBounds(a);
    if (![b.x, b.y, b.width, b.height].every(Number.isFinite)) continue;
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
  }
  if (!Number.isFinite(x0)) return null;
  const T = CANVAS_GROW_TRIGGER_PX, M = CANVAS_GROW_MARGIN_PX;
  const left = x0 < T ? Math.min(0, x0 - M) : 0;
  const top = y0 < T ? Math.min(0, y0 - M) : 0;
  const right = x1 > dispW - T ? Math.max(dispW, x1 + M) : dispW;
  const bottom = y1 > dispH - T ? Math.max(dispH, y1 + M) : dispH;
  if (left === 0 && top === 0 && right === dispW && bottom === dispH) return null;
  const sx = Math.ceil(-left), sy = Math.ceil(-top);
  const w = Math.ceil(right + sx), h = Math.ceil(bottom + sy);
  return { sx, sy, width: (swapped ? h : w) / MAIN_SCALE, height: (swapped ? w : h) / MAIN_SCALE };
}

export function grownPage(page, plan) {
  const annotations = plan.sx || plan.sy ? page.annotations.map((a) => translatedAnnotation(a, plan.sx, plan.sy)) : page.annotations;
  // the sidebar thumbnail's base picture is made at the page's size, so it is made again at the new one
  return { ...page, annotations, width: plan.width, height: plan.height, dataUrl: makeBlankThumb(plan.width, plan.height, page.rotation || 0, undefined, true) };
}

export function useCanvasGrow({ doc, zoom }) {
  const { pages, setPages, selectedIdx } = doc;
  const heldRef = useRef(false);
  const [releaseTick, setReleaseTick] = useState(0);
  useEffect(() => {
    const down = () => { heldRef.current = true; };
    const up = () => { heldRef.current = false; setTimeout(() => setReleaseTick((t) => t + 1), 0); }; // after the gesture's last update
    window.addEventListener("mousedown", down, true);
    window.addEventListener("mouseup", up, true);
    return () => { window.removeEventListener("mousedown", down, true); window.removeEventListener("mouseup", up, true); };
  }, []);

  useEffect(() => {
    if (heldRef.current || !pages.some((p) => p.isCanvas)) return;
    const plans = new Map();
    for (const p of pages) { const plan = growthPlan(p); if (plan) plans.set(p, plan); }
    if (!plans.size) return;
    const current = selectedIdx !== null ? pages[selectedIdx] : null;
    const plan = current && plans.get(current);
    const board = document.querySelector(".ze-artboard-zoom");
    if (plan && board && (plan.sx || plan.sy)) {
      const r = board.getBoundingClientRect();
      canvasGrowShift.pending = { key: current.key, sx: plan.sx, sy: plan.sy, left: r.left, top: r.top, zoom };
    }
    setPages((prev) => prev.map((p) => (plans.has(p) ? grownPage(p, plans.get(p)) : p)));
  }, [pages, selectedIdx, releaseTick]);
}
