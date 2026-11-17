// Floating layers list: select, lock, hide, group and reorder items.

import { groupColor } from "../../model/annotations.js";
import { isEllipse } from "../../model/outlines.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS } from "../../model/strokes.js";
import { rectFillCss } from "../../render/gradients.js";
import { trackPointerDrag } from "../pointer.js";
const { useState, useRef, useEffect } = React;

// ---- Layers panel — the page's items, top layer first. ----------------
function layerName(ann) {
  if (ann.name) return ann.name;
  if (ann.type === "text") return ann.text.trim().split("\n")[0] || "Text";
  if (ann.type === "stroke") return ann.tool === "highlighter" ? "Highlight" : "Drawing";
  if (ann.type === "rect") return isEllipse(ann) ? "Ellipse" : "Rectangle";
  return "Image";
}

function LayerThumb({ ann }) {
  if (ann.type === "image") return <span className="ze-layer-thumb"><img src={ann.src} alt="" draggable="false" /></span>;
  if (ann.type === "rect") return <span className="ze-layer-thumb"><span className="ze-layer-thumb-fill" style={{ background: rectFillCss(ann), borderRadius: isEllipse(ann) ? "50%" : undefined }} /></span>;
  if (ann.type === "text") return <span className="ze-layer-thumb ze-layer-thumb-text">T</span>;
  const isHi = ann.tool === "highlighter";
  return (
    <span className="ze-layer-thumb">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color)} strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M3 16c4-9 6-9 8-4s4 5 10-5" />
      </svg>
    </span>
  );
}

// Floats over the workspace. `position` is null until first dragged,
// which leaves it at its default spot from the stylesheet.
export function LayersPanel({ position, onMove, onMinimize, annotations, selectedIds, onSelect, onGroup, onUngroup, onToggleFlag, onRename, onReorder }) {
  const [renamingId, setRenamingId] = useState(null);
  const [dropInfo, setDropInfo] = useState(null); // { row, before }
  const dragIdRef = useRef(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);
  const headRef = useRef(null);
  const topFirst = annotations.slice().reverse();
  const canUngroup = annotations.some((a) => a.groupId && selectedIds.includes(a.id));

  // Keeps the title bar on screen, so the panel can always be grabbed.
  function inView(x, y) {
    return {
      x: Math.max(0, Math.min(x, window.innerWidth - panelRef.current.offsetWidth)),
      y: Math.max(0, Math.min(y, window.innerHeight - headRef.current.offsetHeight)),
    };
  }

  useEffect(() => {
    if (!position) return;
    const keepInView = () => {
      const next = inView(position.x, position.y);
      if (next.x !== position.x || next.y !== position.y) onMove(next);
    };
    keepInView(); // the window may have shrunk while the panel was minimized
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, [position]);

  function startPanelDrag(e) {
    e.preventDefault();
    const start = panelRef.current.getBoundingClientRect();
    const { clientX, clientY } = e;
    trackPointerDrag((ev) => onMove(inView(start.left + ev.clientX - clientX, start.top + ev.clientY - clientY)));
  }

  useEffect(() => {
    const row = listRef.current && listRef.current.querySelector(".ze-layer-row.is-selected");
    if (row) row.scrollIntoView({ block: "nearest" });
  }, [selectedIds[0]]);

  function finishRename(ann, text) {
    setRenamingId(null);
    const name = text.trim();
    if (name && name !== layerName(ann)) onRename(ann.id, name);
  }

  function dragHandlersFor(ann, row) {
    return {
      onDragStart: (e) => { dragIdRef.current = ann.id; e.dataTransfer.setData("text/plain", ""); },
      onDragOver: (e) => {
        e.preventDefault();
        const box = e.currentTarget.getBoundingClientRect();
        setDropInfo({ row, before: e.clientY < box.top + box.height / 2 });
      },
      onDragEnd: () => { dragIdRef.current = null; setDropInfo(null); },
      onDrop: (e) => {
        e.preventDefault();
        const from = dragIdRef.current;
        const info = dropInfo;
        dragIdRef.current = null;
        setDropInfo(null);
        if (from === null || !info) return;
        onReorder(selectedIds.includes(from) ? selectedIds : [from], info.row + (info.before ? 0 : 1));
      },
    };
  }

  return (
    <section
      className="ze-layers-panel"
      ref={panelRef}
      style={position ? { left: position.x, top: position.y, right: "auto" } : undefined}
    >
      <div className="ze-format-panel-head ze-layers-head" ref={headRef} onMouseDown={startPanelDrag}>
        <span>Layers{annotations.length > 0 ? " (" + annotations.length + ")" : ""}</span>
        <span className="ze-layers-head-actions" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className="ze-guides-settings-btn" title="Group the selected layers (Ctrl+G)" aria-label="Group selected layers" disabled={selectedIds.length < 2} onClick={onGroup}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="11" height="11" rx="2" />
              <rect x="10" y="10" width="11" height="11" rx="2" />
            </svg>
          </button>
          <button type="button" className="ze-guides-settings-btn" title="Ungroup (Ctrl+Shift+G)" aria-label="Ungroup selected layers" disabled={!canUngroup} onClick={onUngroup}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="8" height="8" rx="2" />
              <rect x="13" y="13" width="8" height="8" rx="2" />
              <path d="M14 7h4M7 14v4" strokeDasharray="1 3" />
            </svg>
          </button>
          <button type="button" className="ze-guides-settings-btn" title="Minimize layers" aria-label="Minimize layers" onClick={onMinimize}>
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M5 10h10" />
            </svg>
          </button>
        </span>
      </div>
      <div className="ze-layers-list" ref={listRef}>
          {topFirst.map((ann, row) => {
            const isRenaming = renamingId === ann.id;
            return (
              <React.Fragment key={ann.id}>
                {dropInfo && dropInfo.row === row && dropInfo.before && <div className="ze-drop-line" />}
                <div
                  className={"ze-layer-row" + (selectedIds.includes(ann.id) ? " is-selected" : "") + (ann.hidden ? " is-hidden" : "") + (ann.groupId ? " is-grouped" : "")}
                  style={ann.groupId ? { "--ze-group-color": groupColor(ann.groupId) } : undefined}
                  title={ann.groupId ? "In a group — Alt + click selects just this layer" : undefined}
                  data-layer-id={ann.id}
                  draggable={!isRenaming}
                  onClick={(e) => { if (!ann.hidden && !ann.locked) onSelect(ann.id, e.shiftKey, e.altKey); }}
                  onDoubleClick={() => setRenamingId(ann.id)}
                  {...dragHandlersFor(ann, row)}
                >
                  <LayerThumb ann={ann} />
                  {isRenaming ? (
                    <input
                      className="ze-layer-name-input"
                      defaultValue={layerName(ann)}
                      autoFocus
                      spellCheck="false"
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => finishRename(ann, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") e.target.value = layerName(ann);
                        if (e.key === "Enter" || e.key === "Escape") e.target.blur();
                      }}
                    />
                  ) : (
                    <span className="ze-layer-name" title="Double-click to rename">{layerName(ann)}</span>
                  )}
                  <button
                    type="button"
                    className={"ze-layer-icon-btn" + (ann.locked ? " active" : "")}
                    title={ann.locked ? "Unlock layer" : "Lock layer"}
                    aria-pressed={Boolean(ann.locked)}
                    onClick={(e) => { e.stopPropagation(); onToggleFlag(ann, "locked"); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d={ann.locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={"ze-layer-icon-btn" + (ann.hidden ? " active" : "")}
                    title={ann.hidden ? "Show layer" : "Hide layer"}
                    aria-pressed={Boolean(ann.hidden)}
                    onClick={(e) => { e.stopPropagation(); onToggleFlag(ann, "hidden"); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                      {ann.hidden ? <path d="M4 4l16 16" /> : <circle cx="12" cy="12" r="3" />}
                    </svg>
                  </button>
                </div>
                {dropInfo && dropInfo.row === row && !dropInfo.before && <div className="ze-drop-line" />}
              </React.Fragment>
            );
          })}
          <div className="ze-layer-row ze-layer-row--page">
            <span className="ze-layer-thumb"><span className="ze-layer-thumb-fill" style={{ backgroundColor: "#ffffff" }} /></span>
            <span className="ze-layer-name">Page</span>
          </div>
      </div>
    </section>
  );
}
