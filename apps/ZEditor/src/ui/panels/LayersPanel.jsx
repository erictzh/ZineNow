// Floating layers list: select, lock, hide, group (collapsible, renamable) and reorder items.

import { groupColor } from "../../model/annotations.js";
import { canClipAt } from "../../model/clipping.js";
import { layerName } from "../../model/layerNames.js";
import { isEllipse } from "../../model/outlines.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS } from "../../model/strokes.js";
import { rectFillCss } from "../../render/gradients.js";
import { trackPointerDrag } from "../pointer.js";
import { MenuItem } from "../topbar/TopMenu.jsx";
import { withTouchModifier } from "../touchInput.js";
const { useState, useRef, useEffect } = React;

// ---- Layers panel — the page's items, top layer first. ----------------
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

// Clipped to the layer below: an arrow turning down into it.
const ClipIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4v8a3 3 0 0 0 3 3h11" />
    <path d="M15 11l4 4-4 4" />
  </svg>
);
const LockIcon = ({ locked }) => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} />
  </svg>
);
const EyeIcon = ({ hidden }) => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    {hidden ? <path d="M4 4l16 16" /> : <circle cx="12" cy="12" r="3" />}
  </svg>
);

// The list as it's shown: a run of layers sharing a group becomes one block under a group row.
// [{ groupId, items: [{ ann, row }] }] (groupId null for a layer on its own); `row` is the layer's
// place in the top-first list, which reordering works in.
function layerBlocks(topFirst) {
  const blocks = [];
  topFirst.forEach((ann, row) => {
    const last = blocks[blocks.length - 1];
    if (ann.groupId && last && last.groupId === ann.groupId) last.items.push({ ann, row });
    else blocks.push({ groupId: ann.groupId || null, items: [{ ann, row }] });
  });
  return blocks;
}

// Which groups are folded away; kept while the editor is open (not saved with the project).
const collapsedGroups = new Set();

// The name box used to rename a layer or a group: Enter keeps it, Escape puts the old name back.
function RenameInput({ current, onDone }) {
  return (
    <input
      className="ze-layer-name-input"
      defaultValue={current}
      autoFocus
      spellCheck="false"
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onDone(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.target.value = current;
        if (e.key === "Enter" || e.key === "Escape") e.target.blur();
      }}
    />
  );
}

// Floats over the workspace. `position` is null until first dragged,
// which leaves it at its default spot from the stylesheet.
export function LayersPanel({ position, onMove, onMinimize, annotations, selectedIds, onSelect, onGroup, onUngroup, onDelete, onToggleFlag, onRename, onReorder, onRenameGroup, onSetGroupFlag, onToggleClip, onClip, onRelease }) {
  const [renamingId, setRenamingId] = useState(null); // a layer's id, or "g:" + a group's id
  const [menuOpen, setMenuOpen] = useState(false); // the ... menu: group, ungroup, clipping mask
  const menuRef = useRef(null);
  const [dropInfo, setDropInfo] = useState(null); // { key, row, before }: the line shown above/below row `key`
  const [, setCollapseTick] = useState(0);
  const dragIdRef = useRef(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);
  const headRef = useRef(null);
  const topFirst = annotations.slice().reverse();
  const canUngroup = annotations.some((a) => a.groupId && selectedIds.includes(a.id));
  // Clipping mask: the selected layers that can be clipped (they need a layer below and no clip yet), and those that are.
  const canClip = annotations.some((a, i) => selectedIds.includes(a.id) && !a.clipToBelow && canClipAt(annotations, i));
  const canRelease = annotations.some((a) => selectedIds.includes(a.id) && a.clipToBelow);

  // The menu closes on a press outside it or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const escape = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  function toggleCollapsed(groupId) {
    if (collapsedGroups.has(groupId)) collapsedGroups.delete(groupId); else collapsedGroups.add(groupId);
    setCollapseTick((n) => n + 1);
  }

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

  // Drag-and-drop for one row. `dragId` is the layer that moves (a group moves whole); a drop on
  // the row's top half lands at `rowBefore`, on its bottom half at `rowAfter` (slots in the top-first list).
  function dragHandlersFor(key, dragId, rowBefore, rowAfter) {
    return {
      onDragStart: (e) => { dragIdRef.current = dragId; e.dataTransfer.setData("text/plain", ""); },
      onDragOver: (e) => {
        e.preventDefault();
        const box = e.currentTarget.getBoundingClientRect();
        const before = e.clientY < box.top + box.height / 2;
        setDropInfo({ key, before, row: before ? rowBefore : rowAfter });
      },
      onDragEnd: () => { dragIdRef.current = null; setDropInfo(null); },
      onDrop: (e) => {
        e.preventDefault();
        const from = dragIdRef.current;
        const info = dropInfo;
        dragIdRef.current = null;
        setDropInfo(null);
        if (from === null || !info) return;
        onReorder(selectedIds.includes(from) ? selectedIds : [from], info.row);
      },
    };
  }
  const dropLine = (key, before) => (dropInfo && dropInfo.key === key && dropInfo.before === before ? <div className="ze-drop-line" /> : null);

  function layerRow(ann, row, inGroup) {
    const isRenaming = renamingId === ann.id;
    return (
      <React.Fragment key={ann.id}>
        {dropLine(ann.id, true)}
        <div
          className={"ze-layer-row" + (selectedIds.includes(ann.id) ? " is-selected" : "") + (ann.hidden ? " is-hidden" : "") + (ann.clipToBelow ? " is-clipped" : "") + (inGroup ? " is-grouped is-in-group" : "")}
          style={inGroup ? { "--ze-group-color": groupColor(ann.groupId) } : undefined}
          title={inGroup ? "In a group — Alt + click selects just this layer" : undefined}
          data-layer-id={ann.id}
          draggable={!isRenaming}
          onClick={(e) => { if (!ann.hidden && !ann.locked) onSelect(ann.id, withTouchModifier("shift", e), withTouchModifier("alt", e)); }}
          onDoubleClick={() => setRenamingId(ann.id)}
          {...dragHandlersFor(ann.id, ann.id, row, row + 1)}
        >
          <LayerThumb ann={ann} />
          {isRenaming
            ? <RenameInput current={layerName(ann)} onDone={(text) => finishRename(ann, text)} />
            : <span className="ze-layer-name" title="Double-click to rename">{layerName(ann)}</span>}
          {ann.clipToBelow && (
            <button
              type="button" className="ze-layer-icon-btn active" title="Clipped to the layer below. Click to release it." aria-label="Release the clipping mask"
              onClick={(e) => { e.stopPropagation(); onToggleClip(ann.id); }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <ClipIcon />
            </button>
          )}
          <button
            type="button" className={"ze-layer-icon-btn" + (ann.locked ? " active" : "")}
            title={ann.locked ? "Unlock layer" : "Lock layer"} aria-pressed={Boolean(ann.locked)}
            onClick={(e) => { e.stopPropagation(); onToggleFlag(ann, "locked"); }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <LockIcon locked={ann.locked} />
          </button>
          <button
            type="button" className={"ze-layer-icon-btn" + (ann.hidden ? " active" : "")}
            title={ann.hidden ? "Show layer" : "Hide layer"} aria-pressed={Boolean(ann.hidden)}
            onClick={(e) => { e.stopPropagation(); onToggleFlag(ann, "hidden"); }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <EyeIcon hidden={ann.hidden} />
          </button>
        </div>
        {dropLine(ann.id, false)}
      </React.Fragment>
    );
  }

  // A group's own row: fold/unfold, select the whole group, rename it, lock or hide all of it.
  // Its layers are listed under it, indented.
  function groupBlock(block, number) {
    const { groupId, items } = block;
    const first = items[0].ann;
    const name = first.groupName || "Group " + number;
    const collapsed = collapsedGroups.has(groupId);
    const allLocked = items.every((i) => i.ann.locked), allHidden = items.every((i) => i.ann.hidden);
    const allSelected = items.every((i) => selectedIds.includes(i.ann.id));
    const key = "g:" + groupId + ":" + first.id;
    const firstRow = items[0].row, lastRow = items[items.length - 1].row;
    const isRenaming = renamingId === "g:" + groupId;
    return (
      <React.Fragment key={key}>
        {dropLine(key, true)}
        <div
          className={"ze-layer-row ze-layer-group-row is-grouped" + (allSelected ? " is-selected" : "") + (allHidden ? " is-hidden" : "")}
          style={{ "--ze-group-color": groupColor(groupId) }}
          title="Group: click to select it, double-click to rename"
          draggable={!isRenaming}
          onClick={(e) => { const pick = items.find((i) => !i.ann.hidden && !i.ann.locked); if (pick) onSelect(pick.ann.id, withTouchModifier("shift", e), false); }}
          onDoubleClick={() => setRenamingId("g:" + groupId)}
          // Below an open group's row is its first layer, so a drop there goes above the group's layers.
          {...dragHandlersFor(key, first.id, firstRow, collapsed ? lastRow + 1 : firstRow)}
        >
          <button
            type="button" className="ze-layer-caret" aria-expanded={!collapsed}
            title={collapsed ? "Show the group's layers" : "Fold the group away"}
            onClick={(e) => { e.stopPropagation(); toggleCollapsed(groupId); }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: collapsed ? "rotate(-90deg)" : undefined }}>
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
            </svg>
          </button>
          <span className="ze-layer-thumb ze-layer-thumb-group" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          </span>
          {isRenaming
            ? <RenameInput current={name} onDone={(text) => { setRenamingId(null); const n = text.trim(); if (n && n !== name) onRenameGroup(groupId, n); }} />
            : <span className="ze-layer-name" title="Double-click to rename">{name} <span className="ze-layer-count">{items.length}</span></span>}
          <button
            type="button" className={"ze-layer-icon-btn" + (allLocked ? " active" : "")}
            title={allLocked ? "Unlock the group" : "Lock the group"} aria-pressed={allLocked}
            onClick={(e) => { e.stopPropagation(); onSetGroupFlag(groupId, "locked", !allLocked); }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <LockIcon locked={allLocked} />
          </button>
          <button
            type="button" className={"ze-layer-icon-btn" + (allHidden ? " active" : "")}
            title={allHidden ? "Show the group" : "Hide the group"} aria-pressed={allHidden}
            onClick={(e) => { e.stopPropagation(); onSetGroupFlag(groupId, "hidden", !allHidden); }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <EyeIcon hidden={allHidden} />
          </button>
        </div>
        {collapsed ? dropLine(key, false) : items.map((i) => layerRow(i.ann, i.row, true))}
      </React.Fragment>
    );
  }

  const groupNumbers = new Map(); // "Group 1", "Group 2"... for groups not given a name, top first
  return (
    <section
      className="ze-layers-panel"
      ref={panelRef}
      style={position ? { left: position.x, top: position.y, right: "auto" } : undefined}
    >
      <div className="ze-format-panel-head ze-layers-head" ref={headRef} onMouseDown={startPanelDrag}>
        <span>Layers{annotations.length > 0 ? " (" + annotations.length + ")" : ""}</span>
        <span className="ze-layers-head-actions" onMouseDown={(e) => e.stopPropagation()}>
          <span className="ze-layers-menu-wrap" ref={menuRef}>
            <button
              type="button" className={"ze-guides-settings-btn" + (menuOpen ? " is-open" : "")} title="Group, ungroup and clipping mask" aria-label="More layer actions"
              aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.9" />
                <circle cx="12" cy="12" r="1.9" />
                <circle cx="19" cy="12" r="1.9" />
              </svg>
            </button>
            {menuOpen && (
              <div className="ze-menu ze-layers-menu" role="menu">
                <MenuItem label="Group" shortcut="Ctrl+G" hint="Group the selected layers (select two or more)" disabled={selectedIds.length < 2} onClick={onGroup} close={() => setMenuOpen(false)} />
                <MenuItem label="Ungroup" shortcut="Ctrl+Shift+G" disabled={!canUngroup} onClick={onUngroup} close={() => setMenuOpen(false)} />
                <MenuItem label="Clip to layer below" shortcut="Ctrl+Alt+G" hint="Shows the selected layer only where the layer directly below it has pixels" disabled={!canClip} onClick={onClip} close={() => setMenuOpen(false)} />
                <MenuItem label="Release clipping mask" disabled={!canRelease} onClick={onRelease} close={() => setMenuOpen(false)} />
              </div>
            )}
          </span>
          <button type="button" className="ze-guides-settings-btn" title="Delete the selected layers (Delete)" aria-label="Delete selected layers" disabled={selectedIds.length === 0} onClick={onDelete}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M9 7V4h6v3" />
              <path d="M6 7l1 13h10l1-13" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
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
          {layerBlocks(topFirst).map((block) => {
            if (!block.groupId) return layerRow(block.items[0].ann, block.items[0].row, false);
            if (!groupNumbers.has(block.groupId)) groupNumbers.set(block.groupId, groupNumbers.size + 1);
            return groupBlock(block, groupNumbers.get(block.groupId));
          })}
          <div className="ze-layer-row ze-layer-row--page">
            <span className="ze-layer-thumb"><span className="ze-layer-thumb-fill" style={{ backgroundColor: "#ffffff" }} /></span>
            <span className="ze-layer-name">Page</span>
          </div>
      </div>
    </section>
  );
}
