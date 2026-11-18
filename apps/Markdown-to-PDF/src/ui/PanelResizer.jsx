// The draggable line between the left panel (Editor / Typography) and the preview: drag it to make the
// panel wider or narrower, double-click it (or press Home) to go back to the default width. The width is
// remembered for next time. The panel's width is the CSS variable --md2ebook-sidebar-width (styles.css,
// component-kit.css); the preview refits itself when its own width changes (PreviewCanvas).

const { useLayoutEffect, useRef } = React;

const STORAGE_KEY = "md2pdf.sidebarWidth";
const MIN_PANEL = 300; // px: wide enough to type in and to read the typography settings
const MIN_PREVIEW = 320; // px: the preview always keeps at least this much room
const KEY_STEP = 16;

// `bodyRef` is the element holding the panel and the preview side by side.
export function PanelResizer({ bodyRef }) {
  const handleRef = useRef(null);
  const widthRef = useRef(null); // px, or null while it's the default (40vw)

  // The panel's width kept between its minimum and what leaves the preview its room.
  const clamp = (px) => {
    const body = bodyRef.current;
    const most = Math.max(MIN_PANEL, (body ? body.getBoundingClientRect().width : window.innerWidth) - MIN_PREVIEW);
    return Math.round(Math.min(most, Math.max(MIN_PANEL, px)));
  };
  const apply = (px, save) => {
    const root = document.documentElement;
    if (px == null) {
      widthRef.current = null;
      root.style.removeProperty("--md2ebook-sidebar-width");
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* storage blocked: the width just isn't remembered */ }
    } else {
      widthRef.current = clamp(px);
      root.style.setProperty("--md2ebook-sidebar-width", widthRef.current + "px");
      if (save) { try { localStorage.setItem(STORAGE_KEY, String(widthRef.current)); } catch (e) { /* as above */ } }
    }
  };
  const panelWidth = () => {
    const aside = handleRef.current && handleRef.current.parentElement;
    return aside ? aside.getBoundingClientRect().width : MIN_PANEL;
  };

  // A saved width is used again before the first paint, and a smaller window pulls the panel in so the preview keeps its room.
  useLayoutEffect(() => {
    let saved = null;
    try { saved = parseInt(localStorage.getItem(STORAGE_KEY), 10); } catch (e) { /* no saved width */ }
    if (saved > 0) apply(saved, false);
    const onResize = () => {
      if (widthRef.current != null && clamp(widthRef.current) !== widthRef.current) apply(widthRef.current, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Dragging: the panel sits at the left, so its width is the distance from the body's left edge to the pointer.
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add("is-dragging");
    document.body.style.userSelect = "none";
  };
  const onPointerMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    apply(e.clientX - bodyRef.current.getBoundingClientRect().left, false);
  };
  const endDrag = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    e.currentTarget.classList.remove("is-dragging");
    document.body.style.userSelect = "";
    if (widthRef.current != null) { try { localStorage.setItem(STORAGE_KEY, String(widthRef.current)); } catch (err) { /* not remembered */ } }
  };
  // From the keyboard: the arrows nudge it, Home resets it.
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); apply(panelWidth() + KEY_STEP, true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); apply(panelWidth() - KEY_STEP, true); }
    else if (e.key === "Home") { e.preventDefault(); apply(null); }
  };

  return (
    <div
      ref={handleRef}
      className="md2ebook-resizer md2ebook-no-print"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the editor panel"
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
