// The live preview: the paginated document in a sandboxed frame, scaled to fit.

import { renderHtmlDocument } from "../document/previewDocument.js";
import { PAPER_SIZES } from "../settings/defaults.js";
const { useState, useEffect, useRef, useMemo } = React;

const ZOOM_MIN = 15; // percent
const ZOOM_MAX = 200;
const clampZoom = (n) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n)));

// The zoom controls in the status bar: a slider, a number box (typed values apply on Enter or when
// leaving the box) and a Fit button that goes back to fitting the page to the pane's width.
// `onZoom(null)` means fit; `onZoom(n)` holds the zoom at n percent.
function ZoomControl({ percent, isFit, onZoom }) {
  const [draft, setDraft] = useState(null); // the number box's text while it's being typed in
  const commit = () => {
    if (draft == null) return;
    const n = parseFloat(draft);
    if (Number.isFinite(n)) onZoom(clampZoom(n));
    setDraft(null);
  };
  return (
    <span className="md2ebook-zoom">
      <input
        type="range"
        className="md2ebook-zoom-slider"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={1}
        value={percent}
        onChange={(e) => onZoom(clampZoom(Number(e.target.value)))}
        aria-label="Preview zoom"
      />
      <span className="md2ebook-zoom-number">
        <input
          type="number"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={5}
          value={draft != null ? draft : percent}
          onChange={(e) => {
            // The spinner arrows apply at once; typed digits wait for Enter or blur.
            if (e.nativeEvent && e.nativeEvent.inputType) setDraft(e.target.value);
            else onZoom(clampZoom(Number(e.target.value)));
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") setDraft(null);
          }}
          aria-label="Preview zoom percent"
        />
        %
      </span>
      <button
        type="button"
        className={"md2ebook-zoom-fit" + (isFit ? " active" : "")}
        onClick={() => { setDraft(null); onZoom(null); }}
        aria-pressed={isFit}
        title="Fit the page to the preview's width"
      >
        Fit
      </button>
    </span>
  );
}

/* ==========================================================================
   Preview canvas — scaled live preview of the generated document,
   rendered via an isolated <iframe srcDoc="..."> so its styling never
   leaks into (or is contaminated by) the app's own Tailwind styles.

   The iframe's height is measured from its actual rendered content
   (not hard-locked to one page's worth of pixels), so a document that
   runs longer than one physical page still fully scrolls via the
   surrounding preview pane's own scrollbar, with no separate/nested
   scrollbar trapped inside the iframe.
   ========================================================================== */
export function PreviewCanvas({ markdown, config, onTocPages }) {
  const onTocPagesRef = useRef(onTocPages);
  onTocPagesRef.current = onTocPages;
  const outerRef = useRef(null);
  const iframeRef = useRef(null);
  // fitScale: what fits the page to the pane's width. zoomPct: the zoom the
  // user picked in the status bar, or null to keep following fitScale.
  const [fitScale, setFitScale] = useState(1);
  const [zoomPct, setZoomPct] = useState(null);
  const scale = zoomPct == null ? fitScale : zoomPct / 100;
  const [contentHeightPx, setContentHeightPx] = useState(0);
  const [pageCount, setPageCount] = useState(null);
  const [paginating, setPaginating] = useState(true);
  const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
  const DPI = 96;
  const pageWidthPx = Math.round(paper.widthIn * DPI);
  const minPageHeightPx = Math.round(paper.heightIn * DPI);
  const renderedHeightPx = Math.max(minPageHeightPx, contentHeightPx);
  const srcDoc = useMemo(() => {
    return renderHtmlDocument(markdown, config);
  }, [markdown, config]);
  // The previous document's pagination result goes stale the instant a
  // new srcDoc is generated — re-arm the "paginating…" indicator so the
  // caption doesn't show a stale page count while the new one reflows.
  useEffect(() => {
    setPaginating(true);
    setPageCount(null);
    // Contents page numbers belong to the old layout too.
    if (onTocPagesRef.current) onTocPagesRef.current(null);
  }, [srcDoc]);
  // Recompute the horizontal scale factor (page width -> available pane width).
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return undefined;
    function recompute() {
      const availableWidth = el.clientWidth - 48; // matches wrapper horizontal padding
      const next = Math.min(1, Math.max(ZOOM_MIN / 100, availableWidth / pageWidthPx));
      setFitScale(next);
    }
    recompute();
    let observer;
    if ("ResizeObserver" in window) {
      observer = new ResizeObserver(recompute);
      observer.observe(el);
    } else {
      window.addEventListener("resize", recompute);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener("resize", recompute);
    };
  }, [pageWidthPx]);
  // The preview iframe paginates *itself* on screen via Paged.js (see
  // the long comment on renderHtmlDocument in document/previewDocument.js) — once it
  // finishes chunking the content into page boxes, its own <script>
  // posts the final rendered height and page count back here via
  // window.postMessage. We can't just reach into frame.contentDocument
  // the way the old single-page-flow preview did, because that would
  // require the allow-same-origin sandbox flag alongside allow-scripts,
  // and that specific combination would let a script smuggled in via
  // pasted raw HTML (marked.js passes raw HTML through by default)
  // escape the iframe and manipulate this app directly. postMessage
  // keeps the iframe's contents fully confined to their own opaque
  // origin regardless of what's inside them.
  useEffect(() => {
    function handleMessage(event) {
      const data = event.data;
      if (!data || data.source !== "md2ebook-pagedjs") return;
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      const measuredHeight = Number(data.height);
      if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
        setContentHeightPx(measuredHeight);
      }
      if (data.tocPages && typeof data.tocPages === "object" && onTocPagesRef.current) {
        onTocPagesRef.current(data.tocPages);
      }
      const measuredPages = Number(data.pageCount);
      if (Number.isFinite(measuredPages) && measuredPages > 0) {
        setPageCount(measuredPages);
        setPaginating(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  // Tracks which page is currently in view for the status bar, purely
  // from scroll position — every Paged.js page box is sized to exactly
  // one physical page (paper.heightIn) plus the fixed gap between pages
  // (see the .pagedjs_page rule in document/previewDocument.js), both scaled down by
  // the same factor the preview itself is scaled by, so dividing the
  // scroll position by one page-with-gap's scaled height gives which
  // page is centered in the visible viewport.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return undefined;
    const PAGE_GAP_PX = 24; // must match .pagedjs_page's margin-bottom in document/previewDocument.js
    let ticking = false;
    function computeCurrentPage() {
      ticking = false;
      if (!pageCount || pageCount <= 1) {
        setCurrentPage(1);
        return;
      }
      const pageStridePx = (minPageHeightPx + PAGE_GAP_PX) * scale;
      if (!(pageStridePx > 0)) return;
      const viewportCenter = el.scrollTop + el.clientHeight / 2;
      const estimated = Math.floor(viewportCenter / pageStridePx) + 1;
      setCurrentPage(Math.min(pageCount, Math.max(1, estimated)));
    }
    function handleScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(computeCurrentPage);
    }
    computeCurrentPage();
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [pageCount, scale, minPageHeightPx]);
  // Drag-to-scroll ("hand" scrolling) over the paper: the pane follows the pointer in both directions.
  const panRef = useRef(null); // { x, y, left, top } at the start of a drag
  const startPan = (e) => {
    if (e.button !== 0 || !outerRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add("is-panning");
    panRef.current = { x: e.clientX, y: e.clientY, left: outerRef.current.scrollLeft, top: outerRef.current.scrollTop };
  };
  const movePan = (e) => {
    const start = panRef.current;
    if (!start || !outerRef.current) return;
    outerRef.current.scrollLeft = start.left - (e.clientX - start.x);
    outerRef.current.scrollTop = start.top - (e.clientY - start.y);
  };
  const endPan = (e) => {
    if (!panRef.current) return;
    panRef.current = null;
    e.currentTarget.classList.remove("is-panning");
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  return (
    <div ref={outerRef} className="md2ebook-preview-pane">
      <div className="md2ebook-canvas-wrapper">
        <div
          className="md2ebook-canvas-scale-box"
          style={{
            width: pageWidthPx * scale,
            height: renderedHeightPx * scale,
          }}
        >
          <div
            className="md2ebook-page-shadow"
            style={{
              width: pageWidthPx,
              height: renderedHeightPx,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              ref={iframeRef}
              title="Md to PDF Converter live preview"
              className="md2ebook-page-iframe"
              srcDoc={srcDoc}
              width={pageWidthPx}
              height={renderedHeightPx}
              sandbox="allow-scripts"
            />
          </div>
          {/* Hand scrolling: a see-through layer over the paper that turns a mouse drag into scrolling
              the pane (the iframe would otherwise swallow the drag). The wheel scrolls through it too. */}
          <div
            className="md2ebook-pan-surface"
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
          />
        </div>
      </div>
      <div className="md2ebook-no-print md2ebook-preview-statusbar">
        <span>{paper.label}</span>
        <span className="md2ebook-statusbar-divider" aria-hidden="true">|</span>
        <span>{paginating ? "Paginating…" : pageCount ? `Page ${currentPage} of ${pageCount}` : "Page 1 of 1"}</span>
        <span className="md2ebook-statusbar-divider" aria-hidden="true">|</span>
        <ZoomControl percent={Math.round(scale * 100)} isFit={zoomPct == null} onZoom={setZoomPct} />
      </div>
    </div>
  );
}
