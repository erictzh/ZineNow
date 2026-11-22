// Zoom level of the page view, keeping a point of the page in place while it changes: the middle
// of the view for the zoom controls and keys, the spot between two fingers for a pinch, the pointer for
// Ctrl + wheel (a touchpad pinch on a PC arrives as Ctrl + wheel too).

import { ZOOM_PERCENT } from "../constants.js";
import { createPinchGate } from "../../../../shared/js/pinchGate.js";

const { useState, useRef, useLayoutEffect, useEffect } = React;

// The steps Ctrl + and Ctrl - move through (percent).
const ZOOM_STEPS = [10, 15, 25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500, 600];

// Fired on window by ui/touchInput.js while two fingers are on the canvas:
//   detail: { phase: "start" | "move" | "end", scale, x, y }
// where scale is the fingers' spread relative to when they landed and (x, y) their midpoint on
// screen. The page point that was between them at the start stays under their midpoint, so
// spreading zooms and moving both scrolls, together.
export const PINCH_EVENT = "ze-pinch";

// Fired on window when a document is created or opened (a PDF, a new blank document, a saved project): the view
// starts fresh, the page in the middle at 100%. Not for Insert PDF or new pages in a document being worked on.
export const DOCUMENT_OPENED_EVENT = "ze-document-opened";
export const announceDocumentOpened = () => window.dispatchEvent(new Event(DOCUMENT_OPENED_EVENT));

// Scrolls the pane so the page is in the middle of it, or, for a page taller than the view, its
// top a little below the top edge. Used when a page opens: the pasteboard round the page
// (styles/layout.css) is half a view wide, so without this the view would start in its corner.
const TOP_GAP = 40; // px above a page too tall to centre
export function centerArtboard(board) {
  const pane = board && board.closest(".preview-pane");
  if (!pane) return;
  const w = board.offsetWidth, h = board.offsetHeight;
  pane.scrollLeft = board.offsetLeft + w / 2 - pane.clientWidth / 2;
  pane.scrollTop = h + 2 * TOP_GAP <= pane.clientHeight
    ? board.offsetTop + h / 2 - pane.clientHeight / 2
    : board.offsetTop - TOP_GAP;
}

export function useZoom() {
  const [zoomPercent, setZoomPercent] = useState(ZOOM_PERCENT.initial);
  const previewPaneRef = useRef(null);
  // { x, y } page point (in 100%-zoom px) to put back at screen offset { fx, fy } in the pane
  // once the page has been laid out at its new size.
  const zoomAnchorRef = useRef(null);
  const zoomRef = useRef(zoomPercent);
  zoomRef.current = zoomPercent;
  const floatRef = useRef(zoomPercent); // the wheel's unrounded zoom, so a touchpad pinch's tiny steps add up
  if (Math.round(floatRef.current) !== zoomPercent) floatRef.current = zoomPercent; // changed some other way
  const requestedRef = useRef(null); // a zoom asked for by the wheel and not drawn yet
  // Bumped when a document is created or opened: tells ComposeCanvas to centre the page again, after the zoom is back at 100%.
  const [viewKey, setViewKey] = useState(0);

  function artboardElement() {
    return previewPaneRef.current && previewPaneRef.current.querySelector(".ze-artboard-zoom");
  }

  // The page point (100%-zoom px) at offset (fx, fy) from the pane's top-left corner.
  function pagePointAt(fx, fy) {
    const pane = previewPaneRef.current, board = artboardElement();
    return { x: (pane.scrollLeft + fx - board.offsetLeft) / zoomRef.current, y: (pane.scrollTop + fy - board.offsetTop) / zoomRef.current };
  }
  function scrollPointTo(point, fx, fy, percent) {
    const pane = previewPaneRef.current, board = artboardElement();
    pane.scrollLeft = point.x * percent + board.offsetLeft - fx;
    pane.scrollTop = point.y * percent + board.offsetTop - fy;
  }

  // The zoom controls: the point in the middle of the view stays put.
  function handleZoomChange(percent) {
    const pane = previewPaneRef.current;
    if (artboardElement()) {
      const fx = pane.clientWidth / 2, fy = pane.clientHeight / 2;
      zoomAnchorRef.current = { ...pagePointAt(fx, fy), fx, fy };
    }
    setZoomPercent(percent);
  }

  // Zooming by wheel or key while the toolbar's zoom box is being typed in: finish with the box (it would keep showing
  // the typed number), so it shows the new zoom.
  function leaveZoomBox() {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest(".ze-zoom-control")) active.blur();
  }

  // Zooms to `raw` percent (within the limits), keeping the page point at (fx, fy) in the pane where it is.
  function zoomAt(raw, fx, fy) {
    const clamped = Math.min(ZOOM_PERCENT.max, Math.max(ZOOM_PERCENT.min, raw));
    floatRef.current = clamped;
    const percent = Math.round(clamped);
    if (percent === (requestedRef.current != null ? requestedRef.current : zoomRef.current)) return;
    leaveZoomBox();
    // Wheel events can come faster than the page is redrawn: until it is, keep the page point first asked for.
    const waiting = zoomAnchorRef.current;
    zoomAnchorRef.current = { ...(waiting ? { x: waiting.x, y: waiting.y } : pagePointAt(fx, fy)), fx, fy };
    requestedRef.current = percent;
    setZoomPercent(percent);
  }

  // Ctrl+ and Ctrl- (the browser's own zoom keys, which ZEditor takes over for the page): the next step in or out.
  function zoomStep(direction) {
    leaveZoomBox();
    const current = zoomRef.current;
    const next = direction > 0 ? ZOOM_STEPS.find((s) => s > current) : [...ZOOM_STEPS].reverse().find((s) => s < current);
    handleZoomChange(next != null ? next : direction > 0 ? ZOOM_PERCENT.max : ZOOM_PERCENT.min);
  }

  useLayoutEffect(() => {
    requestedRef.current = null;
    const anchor = zoomAnchorRef.current;
    if (!anchor || !artboardElement()) return;
    zoomAnchorRef.current = null;
    scrollPointTo(anchor, anchor.fx, anchor.fy, zoomPercent);
  }, [zoomPercent]);

  // Pinch to zoom (and scroll), from two fingers on the canvas.
  useEffect(() => {
    let pinch = null; // { point, startPercent, gate } for the pinch under way
    function onPinch(e) {
      const pane = previewPaneRef.current;
      const { phase, scale, x, y } = e.detail || {};
      if (!pane || !artboardElement()) return;
      const r = pane.getBoundingClientRect();
      const fx = x - r.left, fy = y - r.top;
      if (phase === "start") {
        pinch = { point: pagePointAt(fx, fy), startPercent: zoomRef.current, gate: createPinchGate() };
        return;
      }
      if (!pinch) return;
      if (phase === "end") { pinch = null; return; }
      const percent = Math.round(Math.min(ZOOM_PERCENT.max, Math.max(ZOOM_PERCENT.min, pinch.startPercent * pinch.gate(scale))));
      if (percent === zoomRef.current) {
        scrollPointTo(pinch.point, fx, fy, percent); // same zoom: just follow the fingers
      } else {
        zoomAnchorRef.current = { ...pinch.point, fx, fy };
        setZoomPercent(percent);
      }
    }
    window.addEventListener(PINCH_EVENT, onPinch);
    return () => window.removeEventListener(PINCH_EVENT, onPinch);
  }, []);

  // Ctrl (or Cmd) + wheel over the page area zooms the page at the pointer, instead of the browser zooming the
  // whole window (panels, rulers and all). A touchpad pinch on a PC arrives the same way. Only while a page is
  // open; elsewhere (the panels, the welcome screen) the browser's own zoom is left alone.
  useEffect(() => {
    function onWheel(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const pane = previewPaneRef.current;
      if (!pane || !(e.target instanceof Element) || !e.target.closest(".ze-ruler-frame") || !artboardElement()) return;
      e.preventDefault();
      const r = pane.getBoundingClientRect();
      const fx = Math.min(r.width, Math.max(0, e.clientX - r.left)), fy = Math.min(r.height, Math.max(0, e.clientY - r.top));
      const pixels = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY; // lines or pages -> pixels
      // A mouse wheel notch (100) counts as 25: about 22% per notch; a pinch's small steps add up smoothly.
      zoomAt(floatRef.current * Math.exp(-Math.max(-25, Math.min(25, pixels)) * 0.008), fx, fy);
    }
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  // A document was created or opened: 100%, no anchor to keep, and the page centred (ComposeCanvas, on the new viewKey).
  useEffect(() => {
    function onDocumentOpened() {
      leaveZoomBox();
      zoomAnchorRef.current = null;
      requestedRef.current = null;
      floatRef.current = ZOOM_PERCENT.initial;
      setZoomPercent(ZOOM_PERCENT.initial);
      setViewKey((k) => k + 1);
    }
    window.addEventListener(DOCUMENT_OPENED_EVENT, onDocumentOpened);
    return () => window.removeEventListener(DOCUMENT_OPENED_EVENT, onDocumentOpened);
  }, []);

  // Ctrl 0: back to 100%.
  function zoomReset() {
    leaveZoomBox();
    handleZoomChange(ZOOM_PERCENT.initial);
  }

  return { zoomPercent, viewKey, previewPaneRef, handleZoomChange, zoomStep, zoomReset };
}
