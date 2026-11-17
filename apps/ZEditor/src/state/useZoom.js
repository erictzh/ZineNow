// Zoom level of the page view, keeping the point in the middle of the view in place.

import { ZOOM_PERCENT } from "../constants.js";

const { useState, useRef, useLayoutEffect } = React;

export function useZoom() {
  const [zoomPercent, setZoomPercent] = useState(ZOOM_PERCENT.initial);
  const previewPaneRef = useRef(null);
  const zoomAnchorRef = useRef(null);

  // Zooming holds the point at the middle of the view in place: note
  // where it is on the page now, then scroll back to it after the
  // page has been laid out at its new size.
  function artboardElement() {
    return previewPaneRef.current && previewPaneRef.current.querySelector(".ze-artboard-zoom");
  }

  function handleZoomChange(percent) {
    const pane = previewPaneRef.current, board = artboardElement();
    if (board) {
      zoomAnchorRef.current = {
        x: (pane.scrollLeft + pane.clientWidth / 2 - board.offsetLeft) / zoomPercent,
        y: (pane.scrollTop + pane.clientHeight / 2 - board.offsetTop) / zoomPercent,
      };
    }
    setZoomPercent(percent);
  }

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current, pane = previewPaneRef.current, board = artboardElement();
    if (!anchor || !board) return;
    zoomAnchorRef.current = null;
    pane.scrollLeft = anchor.x * zoomPercent + board.offsetLeft - pane.clientWidth / 2;
    pane.scrollTop = anchor.y * zoomPercent + board.offsetTop - pane.clientHeight / 2;
  }, [zoomPercent]);

  return { zoomPercent, previewPaneRef, handleZoomChange };
}
