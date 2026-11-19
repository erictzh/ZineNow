// The live preview: the paginated document in a sandboxed frame, scaled to fit.

import { renderHtmlDocument } from "../document/previewDocument.js";
import { PAPER_SIZES } from "../settings/defaults.js";
import { PAPER_SIZE_OPTIONS } from "../settings/initialConfig.js";
const { useState, useEffect, useLayoutEffect, useRef, useMemo } = React;

// Preview geometry, in unscaled px: the seam (border-bottom) and gap (margin-bottom) under every page
// — the .pagedjs_page rule in document/styleBlock.js — and the canvas wrapper's top padding
// (.md2ebook-canvas-wrapper in styles.css). Keep them in step with those.
const PAGE_SEAM_PX = 3;
const PAGE_GAP_PX = 24;
const CANVAS_TOP_PAD_PX = 40;

// "Page [n] of N" in the status bar: the box shows the page in view; type a number and press Enter
// (or leave the box) to jump there. The spinner arrows jump straight away.
function PageJump({ current, total, onGo }) {
  const [draft, setDraft] = useState(null); // the box's text while it's being typed in
  const commit = () => {
    if (draft == null) return;
    const n = parseInt(draft, 10);
    if (Number.isFinite(n)) onGo(n);
    setDraft(null);
  };
  return (
    <span className="md2ebook-page-jump">
      Page
      <input
        type="number"
        min={1}
        max={total}
        step={1}
        value={draft != null ? draft : current}
        disabled={total <= 1}
        onChange={(e) => {
          if (e.nativeEvent && e.nativeEvent.inputType) setDraft(e.target.value);
          else onGo(Number(e.target.value));
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") setDraft(null);
        }}
        aria-label={`Go to page (1 to ${total})`}
        title={`Go to page — type 1 to ${total} and press Enter`}
      />
      of {total}
    </span>
  );
}

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
export function PreviewCanvas({ markdown, config, onTocPages, onPaperSizeChange }) {
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
  // Dark paper (gear pop-up, UiSettings.jsx) is a class on this page's <html>; the preview frame
  // is sandboxed, so it's passed on by postMessage: when the frame reports in, and when the
  // setting changes.
  function sendDarkPaper() {
    const win = iframeRef.current && iframeRef.current.contentWindow;
    if (!win) return;
    const on = document.documentElement.classList.contains("md2ebook-dark-paper");
    try { win.postMessage({ source: "md2ebook-app", type: "darkPaper", on }, "*"); } catch (e) { /* frame gone */ }
  }
  useEffect(() => {
    window.addEventListener("md2ebook-uiprefs", sendDarkPaper);
    return () => window.removeEventListener("md2ebook-uiprefs", sendDarkPaper);
  }, []);
  useEffect(() => {
    function handleMessage(event) {
      const data = event.data;
      if (!data || data.source !== "md2ebook-pagedjs") return;
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      // The frame is up (and maybe freshly re-rendered): tell it whether the paper is dark.
      sendDarkPaper();
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
  // Every Paged.js page box is exactly one physical page (paper.heightIn) tall, followed by its seam
  // and the gap before the next page (the .pagedjs_page rule in document/styleBlock.js), all scaled
  // by the preview's scale — so page n starts at a fixed distance down the pane.
  const pageStridePx = (minPageHeightPx + PAGE_SEAM_PX + PAGE_GAP_PX) * scale;
  // Tracks which page is in view for the status bar, purely from scroll position: the page at the
  // top of the view (the one a page jump scrolls to), or the last page once scrolled to the bottom.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return undefined;
    let ticking = false;
    function computeCurrentPage() {
      ticking = false;
      if (!pageCount || pageCount <= 1) {
        setCurrentPage(1);
        return;
      }
      if (!(pageStridePx > 0)) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setCurrentPage(pageCount);
        return;
      }
      // A page counts as "at the top" once less than a third of it has scrolled out of view.
      const estimated = Math.floor((el.scrollTop - CANVAS_TOP_PAD_PX + pageStridePx / 3) / pageStridePx) + 1;
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
  }, [pageCount, pageStridePx]);
  // Scrolls the preview so page n's top sits at the top of the view (the status bar's page box).
  const goToPage = (n) => {
    const el = outerRef.current;
    if (!el || !pageCount) return;
    const page = Math.min(pageCount, Math.max(1, Math.round(n)));
    el.scrollTop = CANVAS_TOP_PAD_PX + (page - 1) * pageStridePx - 8;
    setCurrentPage(page);
  };
  // Over the paper: one pointer (mouse or finger) drags to scroll ("hand" scrolling); two fingers
  // pinch to zoom, keeping the spot between them under them.
  const boxRef = useRef(null); // the scale box (the paper as drawn)
  const pointersRef = useRef(new Map()); // pointerId -> { x, y } for each pointer down on the paper
  const panRef = useRef(null); // { x, y, left, top } at the start of a one-pointer drag
  const pinchRef = useRef(null); // { spread0, pct0, fx, fy, mid } during a two-finger pinch
  const twoPoints = () => [...pointersRef.current.values()].slice(0, 2);
  const startPanFrom = (p) => {
    panRef.current = { x: p.x, y: p.y, left: outerRef.current.scrollLeft, top: outerRef.current.scrollTop };
  };
  // Scrolls so the paper spot pinchRef.fx/fy (as fractions of the paper's width/height) sits under
  // the fingers' midpoint — after each zoom step, or on its own when the zoom didn't change.
  const keepPinchSpot = () => {
    const pinch = pinchRef.current, pane = outerRef.current, box = boxRef.current;
    if (!pinch || !pane || !box) return;
    const r = box.getBoundingClientRect();
    pane.scrollLeft += r.left + pinch.fx * r.width - pinch.mid.x;
    pane.scrollTop += r.top + pinch.fy * r.height - pinch.mid.y;
  };
  useLayoutEffect(keepPinchSpot, [scale]);
  const startPan = (e) => {
    if (e.button !== 0 || !outerRef.current) return;
    e.preventDefault();
    // Keeps the moves coming if the pointer leaves the paper. Can throw for a pointer the browser
    // no longer tracks; the drag still works without it.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    e.currentTarget.classList.add("is-panning");
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      startPanFrom({ x: e.clientX, y: e.clientY });
    } else if (pointersRef.current.size === 2 && boxRef.current) {
      // A second finger: from here on it's a pinch.
      const [a, b] = twoPoints();
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = boxRef.current.getBoundingClientRect();
      panRef.current = null;
      pinchRef.current = {
        spread0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        pct0: scale * 100,
        fx: (mid.x - r.left) / r.width,
        fy: (mid.y - r.top) / r.height,
        mid,
      };
    }
  };
  const movePan = (e) => {
    if (!pointersRef.current.has(e.pointerId) || !outerRef.current) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [a, b] = twoPoints();
      pinch.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const pct = clampZoom(pinch.pct0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.spread0);
      if (pct !== Math.round(scale * 100)) setZoomPct(pct); // the layout effect above keeps the spot
      else keepPinchSpot();
      return;
    }
    const start = panRef.current;
    if (!start) return;
    outerRef.current.scrollLeft = start.left - (e.clientX - start.x);
    outerRef.current.scrollTop = start.top - (e.clientY - start.y);
  };
  const endPan = (e) => {
    if (!pointersRef.current.delete(e.pointerId)) return;
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    if (pointersRef.current.size === 1) {
      // One finger lifted from a pinch: carry on scrolling with the other, from where it is now.
      pinchRef.current = null;
      startPanFrom(twoPoints()[0]);
      return;
    }
    if (pointersRef.current.size > 0) return;
    pinchRef.current = null;
    panRef.current = null;
    e.currentTarget.classList.remove("is-panning");
  };
  return (
    <div ref={outerRef} className="md2ebook-preview-pane">
      <div className="md2ebook-canvas-wrapper">
        <div
          ref={boxRef}
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
        {/* Paper size, changeable right here: the same setting as Typography → Page → Paper Size. */}
        <select
          className="md2ebook-statusbar-select"
          value={config.paperSize}
          onChange={(e) => onPaperSizeChange(e.target.value)}
          aria-label="Paper size"
          title="Paper size (also in Typography → Page)"
        >
          {PAPER_SIZE_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="md2ebook-statusbar-divider" aria-hidden="true">|</span>
        {paginating ? (
          <span>Paginating…</span>
        ) : (
          <PageJump current={currentPage} total={pageCount || 1} onGo={goToPage} />
        )}
        <span className="md2ebook-statusbar-divider" aria-hidden="true">|</span>
        <ZoomControl percent={Math.round(scale * 100)} isFit={zoomPct == null} onZoom={setZoomPct} />
      </div>
    </div>
  );
}
