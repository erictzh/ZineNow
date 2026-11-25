// The page list: selecting, drag-to-reorder with edge auto-scroll, adding pages.

import { TopMenu } from "../topbar/TopMenu.jsx";
import { LayoutSettings } from "../settings/LayoutSettings.jsx";
import { useLiveThumbs } from "../../state/useLiveThumbs.js";
import { PageGap } from "./PageGap.jsx";
import { Thumbnail } from "./Thumbnail.jsx";
const { useState, useRef, useEffect } = React;

const icon = { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const InsertPdfIcon = () => (<svg {...icon}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 11v6M9 14h6" /></svg>);
const LayoutIcon = () => (<svg {...icon}><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M3.5 10h17M10 10v10.5" /></svg>);
const SelectAllIcon = () => (<svg {...icon}><rect x="3.5" y="3.5" width="17" height="17" rx="2" strokeDasharray="3 2.5" /><path d="M8 12.5l3 3 5-6" /></svg>);

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
        <span className="ze-sidebar-title">Pages{pages.length > 0 ? " (" + pages.length + ")" : ""}</span>
        {pages.length === 0 ? (
          <div className="ze-sidebar-head-actions">
            <button type="button" onClick={onLoadClick} disabled={loading}>{loading ? "Loading…" : "Load PDF"}</button>
            <button type="button" onClick={onNewDocClick} disabled={loading} title="Start a blank document with a paper size you choose">New Document</button>
          </div>
        ) : (
          // Three tiles in one row: an icon over a short name. Big enough for a finger.
          <div className="ze-sidebar-tiles" role="toolbar" aria-label="Page actions">
            <button type="button" className="ze-tile" onClick={onInsertPdfClick} disabled={loading} title="Insert another PDF's pages into this document">
              <InsertPdfIcon />
              <span>Insert PDF</span>
            </button>
            {layouts && (
              <TopMenu label="Layout" tile icon={<LayoutIcon />}>
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
            <button type="button" className="ze-tile" onClick={onSelectAll} disabled={loading} title="Select every page">
              <SelectAllIcon />
              <span>Select all</span>
            </button>
          </div>
        )}
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
