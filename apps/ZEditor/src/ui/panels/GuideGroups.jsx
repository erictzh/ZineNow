// The ruler guides in the Layers panel: groups per scope and colour ("Page Guides (Yellow)", "Global Guides (Yellow)"), each with
// lock, hide and a ⋮ menu that moves the whole group (or one guide) between "this page" and "all pages".

import { guideColor, guideGroups } from "../../model/guideSet.js";
import { formatInUnit } from "../../model/rulers.js";
import { MenuItem } from "../topbar/TopMenu.jsx";
const { useState, useEffect, useRef } = React;

const iconProps = { viewBox: "0 0 24 24", width: 13, height: 13, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const Lock = ({ on }) => (<svg {...iconProps}><rect x="5" y="11" width="14" height="10" rx="2" /><path d={on ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} /></svg>);
const Eye = ({ off }) => (<svg {...iconProps}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />{off ? <path d="M4 4l16 16" /> : <circle cx="12" cy="12" r="3" />}</svg>);
const More = () => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="12" cy="19" r="1.9" /></svg>);

export function GuideGroups({ guides, unit }) {
  const [menu, setMenu] = useState(null); // { ids, scope, single, x, y }
  const [folded, setFolded] = useState({});
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!menuRef.current || !menuRef.current.contains(e.target)) setMenu(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  const groups = guideGroups(guides.visible);
  if (!groups.length) return null;

  const openMenu = (e, ids, scope, single) => {
    e.stopPropagation();
    if (menu && menu.ids.join() === ids.join()) { setMenu(null); return; }
    const box = e.currentTarget.getBoundingClientRect();
    const W = 220, H = 80;
    setMenu({ ids, scope, single, x: Math.max(4, Math.min(box.right - W, window.innerWidth - W - 4)), y: box.bottom + 4 + H > window.innerHeight ? box.top - 4 - H : box.bottom + 4 });
  };
  const other = (scope) => (scope === "page" ? "global" : "page");

  return (
    <React.Fragment>
      {groups.map((group) => {
        const ids = group.guides.map((g) => g.id);
        const allLocked = group.guides.every((g) => g.locked), allHidden = group.guides.every((g) => g.hidden);
        const isFolded = Boolean(folded[group.key]);
        return (
          <React.Fragment key={group.key}>
            <div className="ze-layer-row ze-layer-group-row ze-guide-group-row" style={{ "--ze-group-color": guideColor(group.color).css }} title={group.label}>
              <button type="button" className="ze-layer-caret" aria-expanded={!isFolded} title={isFolded ? "Show the guides" : "Fold the guides away"}
                onClick={() => setFolded((f) => ({ ...f, [group.key]: !f[group.key] }))}>
                <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: isFolded ? "rotate(-90deg)" : undefined }}><path d="M5.5 7.5l4.5 4.5 4.5-4.5" /></svg>
              </button>
              <span className="ze-guide-dot" style={{ background: guideColor(group.color).css }} aria-hidden="true" />
              <span className="ze-layer-name">{group.label} <span className="ze-layer-count">{ids.length}</span></span>
              <button type="button" className={"ze-layer-icon-btn" + (allLocked ? " active" : "")} aria-pressed={allLocked} title={allLocked ? "Unlock the group" : "Lock the group"}
                onClick={() => guides.update(ids, { locked: allLocked ? undefined : true })}><Lock on={allLocked} /></button>
              <button type="button" className={"ze-layer-icon-btn" + (allHidden ? " active" : "")} aria-pressed={allHidden} title={allHidden ? "Show the group" : "Hide the group"}
                onClick={() => guides.update(ids, { hidden: allHidden ? undefined : true })}><Eye off={allHidden} /></button>
              <button type="button" className="ze-layer-icon-btn ze-layer-more-btn" aria-haspopup="menu" aria-label={"Actions for " + group.label} onClick={(e) => openMenu(e, ids, group.scope, false)}><More /></button>
            </div>
            {!isFolded && group.guides.map((g) => (
              <div key={g.id} className={"ze-layer-row ze-guide-row" + (guides.selected && guides.selected.id === g.id ? " is-selected" : "") + (g.hidden ? " is-hidden" : "")}
                onClick={() => guides.select(g.id)} title="Click to select; its settings show on the right">
                <span className="ze-guide-dot" style={{ background: guideColor(g.color).css }} aria-hidden="true" />
                <span className="ze-layer-name">{g.axis === "x" ? "Vertical" : "Horizontal"} · {formatInUnit(g.pos, unit)}</span>
                <button type="button" className={"ze-layer-icon-btn" + (g.locked ? " active" : "")} aria-pressed={Boolean(g.locked)} title={g.locked ? "Unlock this guide" : "Lock this guide"}
                  onClick={(e) => { e.stopPropagation(); guides.update(g.id, { locked: g.locked ? undefined : true }); }}><Lock on={g.locked} /></button>
                <button type="button" className={"ze-layer-icon-btn" + (g.hidden ? " active" : "")} aria-pressed={Boolean(g.hidden)} title={g.hidden ? "Show this guide" : "Hide this guide"}
                  onClick={(e) => { e.stopPropagation(); guides.update(g.id, { hidden: g.hidden ? undefined : true }); }}><Eye off={g.hidden} /></button>
                <button type="button" className="ze-layer-icon-btn ze-layer-more-btn" aria-haspopup="menu" aria-label="Guide actions" onClick={(e) => openMenu(e, [g.id], g.scope, true)}><More /></button>
              </div>
            ))}
          </React.Fragment>
        );
      })}
      {menu && (
        <div className="ze-menu ze-layer-row-menu" role="menu" ref={menuRef} style={{ left: menu.x, top: menu.y }}>
          <MenuItem
            label={menu.scope === "page" ? (menu.single ? "Show on all pages" : "Make these Global Guides") : (menu.single ? "Show on this page only" : "Make these Page Guides")}
            hint={menu.scope === "page" ? "Moves them to the Global Guides of the same colour: shown on every page" : "Moves them to the Page Guides of the same colour: shown on this page only"}
            onClick={() => guides.setScope(menu.ids, other(menu.scope))} close={() => setMenu(null)}
          />
          <MenuItem label={menu.single ? "Delete guide" : "Delete these guides"} onClick={() => guides.remove(menu.ids)} close={() => setMenu(null)} />
        </div>
      )}
    </React.Fragment>
  );
}
