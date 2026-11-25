// Ruler guides: the ones on the current page (page guides, stored on the page) and the global ones (stored in the view
// settings, shown on every page), with the actions the rulers, the Format panel and the Layers panel share.
// Page guides change through the page list, so they undo with it; global ones do not.

import { DEFAULT_GUIDE_COLOR, LAYOUT_GUIDE_COLOR, guidesOnPage } from "../model/guideSet.js";

const { useMemo, useState } = React;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function useGuides({ doc, view, history }) {
  const { pages, setPages, selectedIdx } = doc;
  const page = selectedIdx !== null ? pages[selectedIdx] : null;
  const pageKey = page ? page.key : null;
  const pageGuides = page ? page.guides : undefined;
  const visible = useMemo(() => guidesOnPage(view.rulerGuides, pageGuides), [view.rulerGuides, pageGuides]);
  const [pickedId, setPickedId] = useState(null);
  const selected = visible.find((g) => g.id === pickedId) || null;
  const color = view.guideColor || DEFAULT_GUIDE_COLOR;

  const editPage = (key, fn) => setPages((prev) => prev.map((p) => (p.key === key ? { ...p, guides: fn(p.guides || []) } : p)));
  const scopeOf = (id) => (visible.find((g) => g.id === id) || {}).scope;

  function add({ axis, pos }) {
    if (pageKey === null) return null;
    const guide = { id: newId(), axis, pos, color };
    history.recordUndoCheckpoint();
    editPage(pageKey, (gs) => [...gs, guide]);
    return guide.id;
  }
  // Changes one or more guides (`ids`), wherever they live. A colour that is chosen becomes the colour of the next new guide.
  function update(ids, patch) {
    const list = Array.isArray(ids) ? ids : [ids];
    if (patch.color) view.setGuideColor(patch.color);
    const global = list.filter((id) => scopeOf(id) === "global"), onPage = list.filter((id) => scopeOf(id) === "page");
    if (global.length) view.setRulerGuides((gs) => gs.map((g) => (global.includes(g.id) ? { ...g, ...patch } : g)));
    if (onPage.length && pageKey !== null) { history.recordUndoCheckpoint(); editPage(pageKey, (gs) => gs.map((g) => (onPage.includes(g.id) ? { ...g, ...patch } : g))); }
  }
  function remove(ids) {
    const list = Array.isArray(ids) ? ids : [ids];
    const global = list.filter((id) => scopeOf(id) === "global"), onPage = list.filter((id) => scopeOf(id) === "page");
    if (global.length) view.setRulerGuides((gs) => gs.filter((g) => !global.includes(g.id)));
    if (onPage.length && pageKey !== null) { history.recordUndoCheckpoint(); editPage(pageKey, (gs) => gs.filter((g) => !onPage.includes(g.id))); }
    if (list.includes(pickedId)) setPickedId(null);
  }
  // Moves guides between "this page" and "all pages" (the ⋮ toggles). Their ids and everything else about them stay.
  function setScope(ids, scope) {
    const moving = visible.filter((g) => ids.includes(g.id) && g.scope !== scope);
    if (!moving.length || pageKey === null) return;
    const bare = moving.map(({ scope: _s, ...g }) => g);
    history.recordUndoCheckpoint();
    if (scope === "global") {
      editPage(pageKey, (gs) => gs.filter((g) => !ids.includes(g.id)));
      view.setRulerGuides((gs) => [...gs, ...bare]);
    } else {
      view.setRulerGuides((gs) => gs.filter((g) => !ids.includes(g.id)));
      editPage(pageKey, (gs) => [...gs, ...bare]);
    }
  }
  // The guides a layout adds to the current page, in their own colour; a layout added before is replaced.
  function setLayoutGuides(lines) {
    if (pageKey === null) return;
    editPage(pageKey, (gs) => [...gs.filter((g) => g.source !== "layout"), ...lines.map((l) => ({ id: newId(), axis: l.axis, pos: l.pos, color: LAYOUT_GUIDE_COLOR, source: "layout" }))]);
  }
  function clearAll() {
    history.recordUndoCheckpoint();
    view.setRulerGuides([]);
    setPages((prev) => prev.map((p) => (p.guides && p.guides.length ? { ...p, guides: [] } : p)));
    setPickedId(null);
  }
  return { visible, selected, select: setPickedId, color, add, update, remove, setScope, setLayoutGuides, clearAll, pageGuideCount: (pageGuides || []).length };
}
