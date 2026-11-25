// Ruler guides with a colour, a scope and their own lock and hide switches. Pure.
//
// A guide is { id, axis: "x" | "y", pos (pt from the page's top-left), color, hidden?, locked?, source? }.
// Page guides live on their page (`page.guides`) so they move, delete and undo with it; global guides (shown on every page)
// live in the project's view settings (`view.rulerGuides`). Which store a guide is in is its scope.

export const GUIDE_COLORS = [
  { key: "white", label: "White", css: "#ffffff" },
  { key: "yellow", label: "Yellow", css: "#ffd93d" },
  { key: "lightblue", label: "Light blue", css: "#5ccdf2" },
  { key: "lightgreen", label: "Light green", css: "#86efac" },
  { key: "lightred", label: "Light red", css: "#fca5a5" },
  { key: "pink", label: "Pink", css: "#f9a8d4" },
  { key: "lightgrey", label: "Light grey", css: "#c9ced6" },
  { key: "orange", label: "Orange", css: "#fb923c" },
];
export const DEFAULT_GUIDE_COLOR = "lightblue"; // what guides drawn before colours existed look like
export const LAYOUT_GUIDE_COLOR = "lightgreen";  // the guides a layout adds
export const guideColor = (key) => GUIDE_COLORS.find((c) => c.key === key) || GUIDE_COLORS.find((c) => c.key === DEFAULT_GUIDE_COLOR);

// A saved or hand-edited list made safe: every guide gets a valid axis, position and colour.
export function normalizeGuides(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((g) => g && (g.axis === "x" || g.axis === "y") && Number.isFinite(g.pos))
    .map((g) => ({
      id: String(g.id ?? Math.random().toString(36).slice(2, 8)), axis: g.axis, pos: g.pos,
      color: GUIDE_COLORS.some((c) => c.key === g.color) ? g.color : DEFAULT_GUIDE_COLOR,
      ...(g.hidden ? { hidden: true } : {}), ...(g.locked ? { locked: true } : {}), ...(g.source ? { source: String(g.source) } : {}),
    }));
}

// The guides to show on a page: the page's own and the global ones, each tagged with its scope.
export function guidesOnPage(globalGuides, pageGuides) {
  return [...(pageGuides || []).map((g) => ({ ...g, scope: "page" })), ...(globalGuides || []).map((g) => ({ ...g, scope: "global" }))];
}

// The groups of the Layers panel: "Page Guides (Yellow)", "Global Guides (Yellow)"…, page groups first, colours in the palette's
// order, and only groups that have guides. [{ key, scope, color, label, guides }]
export function guideGroups(visible) {
  const groups = [];
  for (const scope of ["page", "global"]) {
    for (const c of GUIDE_COLORS) {
      const guides = visible.filter((g) => g.scope === scope && g.color === c.key);
      if (guides.length) groups.push({ key: scope + ":" + c.key, scope, color: c.key, label: `${scope === "page" ? "Page" : "Global"} Guides (${c.label})`, guides });
    }
  }
  return groups;
}

// Where a dragged guide lands: the nearest target within `threshold` (all in pt), else `raw` unchanged.
export function snapGuidePos(raw, targets, threshold) {
  let best = raw, dist = threshold;
  for (const t of targets) { const d = Math.abs(t - raw); if (d <= dist) { dist = d; best = t; } }
  return best;
}

// Where a guide dragged on `axis` can snap: the page's edges and middle, the trim edges (when there is a bleed), the margin
// lines (when the Page Guide is on) and the other guides. `page` { width, height } in pt, `bleedPt`, `marginPt` (0: none).
export function guideSnapTargets(axis, page, bleedPt, marginPt, otherGuides) {
  const len = axis === "x" ? page.width : page.height;
  const t = [0, len / 2, len];
  if (bleedPt > 0) t.push(bleedPt, len - bleedPt);
  if (marginPt > 0) t.push(bleedPt + marginPt, len - bleedPt - marginPt);
  for (const g of otherGuides || []) if (g.axis === axis) t.push(g.pos);
  return t;
}

// The guides a layout adds, from its placed boxes (editor px): the edges of every box, in the layout colour. Duplicates removed;
// lines on the page's own edge (`pageW`, `pageH` in px, when given) are left out.
export function layoutGuideLines(boxes, pxPerPt, pageW, pageH) {
  const seen = new Set(), out = [];
  const add = (axis, px) => {
    if (pageW && (axis === "x" ? px < 0.5 || px > pageW - 0.5 : px < 0.5 || px > pageH - 0.5)) return;
    const pos = Math.round((px / pxPerPt) * 100) / 100, k = axis + pos;
    if (!seen.has(k)) { seen.add(k); out.push({ axis, pos }); }
  };
  for (const b of boxes) { add("x", b.x); add("x", b.x + b.w); add("y", b.y); add("y", b.y + b.h); }
  return out;
}
