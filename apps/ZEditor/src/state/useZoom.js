// Zoom level of the page view, keeping a point of the page in place while it changes: the middle
// of the view for the zoom controls, the spot between two fingers for a pinch.

import { ZOOM_PERCENT } from "../constants.js";

const { useState, useRef, useLayoutEffect, useEffect } = React;

// Fired on window by ui/touchInput.js while two fingers are on the canvas:
//   detail: { phase: "start" | "move" | "end", scale, x, y }
// where scale is the fingers' spread relative to when they landed and (x, y) their midpoint on
// screen. The page point that was between them at the start stays under their midpoint, so
// spreading zooms and moving both scrolls, together.
export const PINCH_EVENT = "ze-pinch";

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

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    if (!anchor || !artboardElement()) return;
    zoomAnchorRef.current = null;
    scrollPointTo(anchor, anchor.fx, anchor.fy, zoomPercent);
  }, [zoomPercent]);

  // Pinch to zoom (and scroll), from two fingers on the canvas.
  useEffect(() => {
    let pinch = null; // { point, startPercent } for the pinch under way
    function onPinch(e) {
      const pane = previewPaneRef.current;
      const { phase, scale, x, y } = e.detail || {};
      if (!pane || !artboardElement()) return;
      const r = pane.getBoundingClientRect();
      const fx = x - r.left, fy = y - r.top;
      if (phase === "start") {
        pinch = { point: pagePointAt(fx, fy), startPercent: zoomRef.current };
        return;
      }
      if (!pinch) return;
      if (phase === "end") { pinch = null; return; }
      const percent = Math.round(Math.min(ZOOM_PERCENT.max, Math.max(ZOOM_PERCENT.min, pinch.startPercent * scale)));
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

  return { zoomPercent, previewPaneRef, handleZoomChange };
}
