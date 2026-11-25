// The page list: selecting, drag-to-reorder with edge auto-scroll, adding pages.

import { TopMenu } from "../topbar/TopMenu.jsx";
import { LayoutSettings } from "../settings/LayoutSettings.jsx";
import { useLiveThumbs } from "../../state/useLiveThumbs.js";
import { PageGap } from "./PageGap.jsx";
import { Thumbnail } from "./Thumbnail.jsx";
const { useState, useRef, useEffect } = React;

// ---- Sidebar — page thumbnail strip (Organize) ---------------------
const EDGE_SCROLL_ZONE = 44; // px from top/bottom edge that triggers scrolling
const EDGE_SCROLL_SPEED = 4; // px per frame — deliberately slow, not a fast jump

export function Sidebar({ pages, selectedIdx, selectedPageIndices, onSelect, onSelectAll, onRotate, onDelete, onReorder, onLoadClick, onNewDocClick, onInsertPdfClick, onInsertBlank, loading, storyStates, onContinueStory, layouts, layoutSettings, onLayoutSettings }) {
  const liveThumbs = useLiveThumbs(pages, pages[selectedIdx] ? pages[selectedIdx].key : null); // page key -> thumbnail with its items on it
  const dragIndexRef = useRef(null);
  const bodyRef = useRef(null);
  const scrollDirRef = useRef(0); // -1 up, 0 idle, 1 down
  const rafRef = useRef(null);
  // { idx, before } — which slot is currently being dragged over, and
  // whether the drop line should sit above (before) or below it.
  const [dragOverInfo, setDragOverInfo] = useState(null);

  function startAutoScroll() {
    if (rafRef.current) return;
    const step = () => {
      const el = bodyRef.current;
      if (el && scrollDirRef.current !== 0) {
        el.scrollTop += scrollDirRef.current * EDGE_SCROLL_SPEED;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function stopAutoScroll() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    scrollDirRef.current = 0;
  }

  useEffect(() => stopAutoScroll, []); // safety: cancel any pending loop if the sidebar unmounts mid-drag

  // Attached to the scrollable container itself (not per-thumbnail) so
  // it keeps working no matter which child — a thumbnail or a gap — the
  // cursor happens to be over.
  function handleContainerDragOver(e) {
    const el = bodyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const distFromTop = e.clientY - rect.top;
    const distFromBottom = rect.bottom - e.clientY;
    if (distFromTop < EDGE_SCROLL_ZONE) {
      scrollDirRef.current = -1;
    } else if (distFromBottom < EDGE_SCROLL_ZONE) {
      scrollDirRef.current = 1;
    } else {
      scrollDirRef.current = 0;
    }
  }

  function dragHandlersFor(idx) {
    return {
      onDragStart: () => { dragIndexRef.current = idx; startAutoScroll(); },
      onDragOver: (e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        setDragOverInfo({ idx, before });
      },
      onDragLeave: () => setDragOverInfo((cur) => (cur && cur.idx === idx ? null : cur)),
      onDragEnd: () => { dragIndexRef.current = null; setDragOverInfo(null); stopAutoScroll(); },
      onDrop: (e) => {
        e.preventDefault();
        const from = dragIndexRef.current;
        const info = dragOverInfo;
        setDragOverInfo(null);
        dragIndexRef.current = null;
        stopAutoScroll();
        if (from === null || !info || from === idx) return;
        const selection = selectedIdx !== null ? [selectedIdx, ...selectedPageIndices] : selectedPageIndices;
        onReorder(selection.includes(from) ? selection : [from], idx + (info.before ? 0 : 1));
      },
    };
  }

  return (
    <aside className="ze-sidebar">
      <div className="ze-sidebar-head">
        <span>Pages{pages.length > 0 ? " (" + pages.length + ")" : ""}</span>
        <div className="ze-sidebar-head-actions">
          {pages.length === 0 && (
            <button type="button" onClick={onLoadClick} disabled={loading}>
              {loading ? "Loading…" : "Load PDF"}
            </button>
          )}
          {pages.length === 0 && (
            <button type="button" onClick={onNewDocClick} disabled={loading} title="Start a blank document with a paper size you choose">
              New Document
            </button>
          )}
          <button type="button" className="log-btn" onClick={onInsertPdfClick} disabled={loading || pages.length === 0} title="Insert another PDF's pages into this document">
            Insert PDF
          </button>
          {layouts && (
            <TopMenu label="Layout">
              {() => (
                <LayoutSettings
                  settings={layoutSettings}
                  onChange={onLayoutSettings}
                  hasPage={selectedIdx !== null && Boolean(pages[selectedIdx])}
                  onApply={(key, where) => (where === "page" ? layouts.addLayoutToPage(key) : layouts.addPageWithLayout(key))}
                />
              )}
            </TopMenu>
          )}
          <button type="button" className="log-btn" onClick={onSelectAll} disabled={loading || pages.length === 0} title="Select every page">
            Select All
          </button>
        </div>
      </div>
      <div className="ze-sidebar-body" ref={bodyRef} onDragOver={handleContainerDragOver}>
        {pages.length === 0 && !loading ? (
          <div className="ze-sidebar-empty">
            No pages yet. Click "Load PDF" to bring in a file, or "New Document" to start a blank layout.
          </div>
        ) : (
          <div className="ze-thumb-list">
            <PageGap onInsert={() => onInsertBlank(0)} />
            {pages.map((p, idx) => (
              <React.Fragment key={p.key}>
                {dragOverInfo && dragOverInfo.idx === idx && dragOverInfo.before && (
                  <div className="ze-drop-line" />
                )}
                <div className="ze-thumb-slot">
                  <Thumbnail
                    p={p}
                    src={liveThumbs[p.key] || p.dataUrl}
                    idx={idx}
                    isSelected={idx === selectedIdx || selectedPageIndices.includes(idx)}
                    onSelect={onSelect}
                    story={storyStates ? storyStates[idx] : null}
                    onContinueStory={onContinueStory}
                    onRotate={onRotate}
                    onDelete={onDelete}
                    dragHandlers={dragHandlersFor(idx)}
                  />
                </div>
                {dragOverInfo && dragOverInfo.idx === idx && !dragOverInfo.before && (
                  <div className="ze-drop-line" />
                )}
                <PageGap onInsert={() => onInsertBlank(idx + 1)} />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
