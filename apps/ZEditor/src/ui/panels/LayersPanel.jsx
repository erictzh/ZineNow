// Floating layers list: select, lock, hide, group (collapsible, renamable) and reorder items.

import { groupColor } from "../../model/annotations.js";
import { canClipAt, clipTargets } from "../../model/clipping.js";
import { BLEND_CONTROL, OPACITY_CONTROL, blendOf, controlValues } from "../../model/controls.js";
import { layerName } from "../../model/layerNames.js";
import { isEllipse } from "../../model/outlines.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS } from "../../model/strokes.js";
import { rectFillCss } from "../../render/gradients.js";
import { resolvePageText } from "../../render/pageText.js";
import { SelectInput, SliderNumberInput } from "../controls/inputs.jsx";
import { trackPointerDrag } from "../pointer.js";
import { TraceSvg } from "../canvas/TraceSvg.jsx";
import { MenuItem } from "../topbar/TopMenu.jsx";
import { withTouchModifier } from "../touchInput.js";
const { useState, useRef, useEffect } = React;

// ---- Layers panel — the page's items, top layer first. ----------------
function LayerThumb({ ann }) {
  if (ann.type === "image") return <span className="ze-layer-thumb"><img src={ann.src} alt="" draggable="false" /></span>;
  if (ann.type === "rect") return <span className="ze-layer-thumb"><span className="ze-layer-thumb-fill" style={{ background: rectFillCss(ann), borderRadius: isEllipse(ann) ? "50%" : undefined }} /></span>;
  if (ann.type === "text") return <span className="ze-layer-thumb ze-layer-thumb-text">T</span>;
  if (ann.type === "trace") return <span className="ze-layer-thumb ze-layer-thumb-trace"><TraceSvg ann={ann} view="result" /></span>;
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

// The smallest the panel can be dragged to: room for the Opacity row and a few layers.
const MIN_WIDTH = 200, MIN_HEIGHT = 170;
// The panel's resize edges: which sides each one moves.
const RESIZE_EDGES = [
  { key: "w", left: true }, { key: "e", right: true }, { key: "s", bottom: true },
  { key: "sw", left: true, bottom: true }, { key: "se", right: true, bottom: true },
];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

// Opacity and blend of the selected layers. With several selected, opacity shows the first one's
// and blend shows "Mixed" when they differ; changing either sets it on all of them.
const MoreIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.9" />
    <circle cx="12" cy="12" r="1.9" />
    <circle cx="12" cy="19" r="1.9" />
  </svg>
);

// Group: two layers inside a dashed frame. Ungroup: the same two layers with the frame gone, pulled apart.
const GroupIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="2" strokeDasharray="3 3" />
    <rect x="6.5" y="6.5" width="7" height="7" rx="1" />
    <rect x="10.5" y="10.5" width="7" height="7" rx="1" />
  </svg>
);
const UngroupIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="2.5" width="8" height="8" rx="1" />
    <rect x="13.5" y="13.5" width="8" height="8" rx="1" />
    <path d="M14 4h6v6M4 14v6h6" strokeDasharray="2 2.5" />
  </svg>
);

function LayerLook({ annotations, selectedIds, onSetLook, onGroup, onUngroup, canUngroup }) {
  const views = resolvePageText(annotations); // a threaded text frame shows its story's look
  const selected = views.filter((a) => selectedIds.includes(a.id));
  const first = selected.find((a) => a.id === selectedIds[0]) || selected[0];
  const opacity = first ? controlValues(first, [OPACITY_CONTROL]).opacity : OPACITY_CONTROL.fallback;
  const blends = new Set(selected.map(blendOf));
  const blend = blends.size > 1 ? "" : first ? blendOf(first) : BLEND_CONTROL.fallback;
  const blendOptions = blend === "" ? [{ key: "", label: "Mixed" }, ...BLEND_CONTROL.options] : BLEND_CONTROL.options;
  return (
    <fieldset className="ze-layers-look" disabled={selected.length === 0} title={selected.length === 0 ? "Select a layer to change its opacity and blend" : undefined}>
      <div className="ze-layers-look-row">
        <button type="button" className="ze-layer-icon-btn ze-layers-group-btn" title="Group (Ctrl+G): select two or more layers" aria-label="Group the selected layers" disabled={selectedIds.length < 2} onClick={onGroup}>
          <GroupIcon />
        </button>
        <button type="button" className="ze-layer-icon-btn ze-layers-group-btn" title="Ungroup (Ctrl+Shift+G)" aria-label="Ungroup the selected layers" disabled={!canUngroup} onClick={onUngroup}>
          <UngroupIcon />
        </button>
        <span className="ze-layers-look-sep" aria-hidden="true" />
        <span className="ze-format-label">Blend</span>
        <SelectInput options={blendOptions} value={blend} onChange={(v) => { if (v) onSetLook({ blend: v }); }} />
      </div>
      <div className="ze-layers-look-row">
        <span className="ze-format-label">Opacity</span>
        <SliderNumberInput min={OPACITY_CONTROL.min} max={OPACITY_CONTROL.max} value={opacity} onChange={(v) => onSetLook({ opacity: v })} />
      </div>
    </fieldset>
  );
}

// Floats over the workspace. `position` is null until first dragged,
// which leaves it at its default spot from the stylesheet; `size` is null
// until an edge is dragged, which leaves the stylesheet's size.
export function LayersPanel({ position, onMove, size, onResize, onSetLook, onMinimize, annotations, selectedIds, onSelect, onGroup, onUngroup, onDelete, onToggleFlag, onRename, onReorder, onRenameGroup, onSetGroupFlag, onToggleClip, onClip, onRelease }) {
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
  // Clipping mask for the selection: whether "Clip to below (multiple)" would clip anything, and whether any selected layer is clipped.
  const canClip = clipTargets(annotations, selectedIds).length > 0;
  const canRelease = annotations.some((a) => selectedIds.includes(a.id) && a.clipToBelow);
  // One layer's own ⋮ menu: { id, x, y } (where it opens on screen), or null. It acts on that layer only,
  // whatever is selected.
  const [rowMenu, setRowMenu] = useState(null);
  const rowMenuRef = useRef(null);

  // The menus close on a press outside them or Escape (the layer menu also when the list scrolls).
  useEffect(() => {
    if (!menuOpen && !rowMenu) return;
    const close = () => { setMenuOpen(false); setRowMenu(null); };
    const outside = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (rowMenu && rowMenuRef.current && !rowMenuRef.current.contains(e.target) && !e.target.closest(".ze-layer-more-btn")) setRowMenu(null);
    };
    const escape = (e) => { if (e.key === "Escape") close(); };
    const list = listRef.current;
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    if (rowMenu && list) list.addEventListener("scroll", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
      if (list) list.removeEventListener("scroll", close);
    };
  }, [menuOpen, rowMenu]);

  // Opens (or closes, on a second click) a layer's ⋮ menu just under its button, kept on screen.
  function toggleRowMenu(e, id) {
    e.stopPropagation();
    if (rowMenu && rowMenu.id === id) { setRowMenu(null); return; }
    const box = e.currentTarget.getBoundingClientRect();
    const MENU_W = 200, MENU_H = 84;
    const x = Math.max(4, Math.min(box.right - MENU_W, window.innerWidth - MENU_W - 4));
    const y = box.bottom + 4 + MENU_H > window.innerHeight ? box.top - 4 - MENU_H : box.bottom + 4;
    setMenuOpen(false);
    setRowMenu({ id, x, y });
  }
  const rowMenuAnn = rowMenu ? annotations.find((a) => a.id === rowMenu.id) : null;
  const rowMenuIndex = rowMenuAnn ? annotations.indexOf(rowMenuAnn) : -1;

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

  // Dragging an edge or bottom corner resizes the panel (pointer events, so a finger works too).
  // The left edge keeps the right side still; the top stays put, as the title bar moves the panel.
  function startResize(e, edge) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const start = panelRef.current.getBoundingClientRect();
    const { clientX, clientY, pointerId } = e;
    const handle = e.currentTarget;
    handle.setPointerCapture(pointerId);
    const move = (ev) => {
      const dx = ev.clientX - clientX, dy = ev.clientY - clientY;
      let left = start.left, width = start.width, height = start.height;
      if (edge.right) width = clamp(start.width + dx, MIN_WIDTH, window.innerWidth - start.left);
      if (edge.left) { width = clamp(start.width - dx, MIN_WIDTH, start.right); left = start.right - width; }
      if (edge.bottom) height = clamp(start.height + dy, MIN_HEIGHT, window.innerHeight - start.top);
      onResize({ width: Math.round(width), height: Math.round(height) });
      onMove({ x: Math.round(left), y: Math.round(start.top) }); // pins it in place (it starts anchored to the right)
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
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
          <button
            type="button" className={"ze-layer-icon-btn ze-layer-more-btn" + (rowMenu && rowMenu.id === ann.id ? " is-open" : "")}
            title="Layer actions" aria-label={"Actions for " + layerName(ann)} aria-haspopup="menu" aria-expanded={Boolean(rowMenu && rowMenu.id === ann.id)}
            onClick={(e) => toggleRowMenu(e, ann.id)}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <MoreIcon />
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
      className={"ze-layers-panel" + (size ? " is-sized" : "")}
      ref={panelRef}
      style={{
        ...(position ? { left: position.x, top: position.y, right: "auto" } : null),
        ...(size ? { width: size.width, height: Math.min(size.height, window.innerHeight - (position ? position.y : 0)) } : null),
      }}
    >
      <div className="ze-format-panel-head ze-layers-head" ref={headRef} onMouseDown={startPanelDrag}>
        <span>Layers{annotations.length > 0 ? " (" + annotations.length + ")" : ""}</span>
        <span className="ze-layers-head-actions" onMouseDown={(e) => e.stopPropagation()}>
          <span className="ze-layers-menu-wrap" ref={menuRef}>
            <button
              type="button" className={"ze-guides-settings-btn" + (menuOpen ? " is-open" : "")} title="Group, ungroup and clipping mask" aria-label="More layer actions"
              aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setRowMenu(null); setMenuOpen((open) => !open); }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.9" />
                <circle cx="12" cy="12" r="1.9" />
                <circle cx="12" cy="19" r="1.9" />
              </svg>
            </button>
            {menuOpen && (
              <div className="ze-menu ze-layers-menu" role="menu">
                <MenuItem label="Group" shortcut="Ctrl+G" hint="Group the selected layers (select two or more)" disabled={selectedIds.length < 2} onClick={onGroup} close={() => setMenuOpen(false)} />
                <MenuItem label="Ungroup" shortcut="Ctrl+Shift+G" disabled={!canUngroup} onClick={onUngroup} close={() => setMenuOpen(false)} />
                <MenuItem label="Clip to below (multiple)" shortcut="Ctrl+Alt+G" hint="Clips the selected layers in one go: the bottom-most selected layer stays as the base and the others show only where it has pixels. With one layer selected, clips it to the layer below." disabled={!canClip} onClick={onClip} close={() => setMenuOpen(false)} />
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
      <LayerLook annotations={annotations} selectedIds={selectedIds} onSetLook={onSetLook} onGroup={onGroup} onUngroup={onUngroup} canUngroup={canUngroup} />
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
      {rowMenuAnn && (
        // Fixed to the screen, so the panel's edge and the list's scrolling can't cut it off.
        <div className="ze-menu ze-layer-row-menu" role="menu" ref={rowMenuRef} style={{ left: rowMenu.x, top: rowMenu.y }}>
          <MenuItem
            label="Clip to layer below" hint="Shows this layer only where the layer below it has pixels"
            disabled={rowMenuAnn.clipToBelow || !canClipAt(annotations, rowMenuIndex)}
            onClick={() => onToggleClip(rowMenuAnn.id)} close={() => setRowMenu(null)}
          />
          <MenuItem
            label="Release clipping mask" disabled={!rowMenuAnn.clipToBelow}
            onClick={() => onToggleClip(rowMenuAnn.id)} close={() => setRowMenu(null)}
          />
        </div>
      )}
      {RESIZE_EDGES.map((edge) => (
        <div key={edge.key} className={"ze-layers-resize ze-layers-resize--" + edge.key} aria-hidden="true" onPointerDown={(e) => startResize(e, edge)} />
      ))}
    </section>
  );
}
