// Ready-made page layouts (picture slots and text areas), as data plus the geometry that places them. Pure.
//
// Every layout reads its sizes from ONE set of settings (DEFAULT_LAYOUT_SETTINGS), so tuning the defaults is a change in one
// place. The user can change them for the current file (they are saved in the project, see state/useViewSettings.js).
//
// A layout is a list of slots. Each slot says what it is (`role`: picture, title, body or caption) and where it goes in
// the page's inner box (the page minus its margin). `place()` turns the slots into boxes in editor px.

import { GUIDE_FORMAT_PRESETS } from "./guides.js";

export const DEFAULT_LAYOUT_SETTINGS = {
  marginPct: 8,        // page margin, % of the page width (used when the Page Guide is off)
  gapPct: 4,           // space between two pieces, % of the page width
  splitPct: 50,        // the first piece of a half-and-half layout, % of the room
  titleScale: 2.5,     // a title's size, times the body text size
  captionScale: 0.85,  // a caption's size, times the body text size
  columnGapPt: 12,     // gap between the columns of the two-column layouts
  slotGrey: "#d9d9d9", // the picture slots
};

// The editable settings, for the Layout settings panel: key, label, unit, range.
export const LAYOUT_SETTING_FIELDS = [
  { key: "marginPct", label: "Margin", unit: "% of page width", min: 0, max: 30, step: 1 },
  { key: "gapPct", label: "Gap between pieces", unit: "% of page width", min: 0, max: 20, step: 0.5 },
  { key: "splitPct", label: "Split of half-and-half layouts", unit: "% (first piece)", min: 20, max: 80, step: 5 },
  { key: "titleScale", label: "Title size", unit: "× body text", min: 1, max: 6, step: 0.25 },
  { key: "captionScale", label: "Caption size", unit: "× body text", min: 0.5, max: 1.5, step: 0.05 },
  { key: "columnGapPt", label: "Column gap", unit: "pt", min: 0, max: 72, step: 1 },
];

// A saved or hand-edited settings object made safe: unknown keys dropped, numbers kept inside their range.
export function normalizeLayoutSettings(raw) {
  const out = { ...DEFAULT_LAYOUT_SETTINGS };
  const src = raw && typeof raw === "object" ? raw : {};
  for (const f of LAYOUT_SETTING_FIELDS) {
    const v = Number(src[f.key]);
    if (src[f.key] != null && Number.isFinite(v)) out[f.key] = Math.min(f.max, Math.max(f.min, v));
  }
  if (typeof src.slotGrey === "string" && /^#[0-9a-f]{6}$/i.test(src.slotGrey)) out.slotGrey = src.slotGrey;
  return out;
}

// Slots, in drawing order (bottom first). Coordinates are fractions of the "room" a slot is placed in: see place().
// `room` names the area: "inner" (the page minus its margin), "page" (the whole page, no margin).
// kind "split": the room is cut in two along `axis` ("y" = top/bottom, "x" = left/right); `first` and `second` are
// the two slots, `reverse` swaps which side the first piece takes.
export const LAYOUTS = [
  { key: "full-text", label: "Full text", slots: [{ role: "body" }] },
  { key: "picture-top", label: "Picture top, text below", split: { axis: "y", first: { role: "picture" }, second: { role: "body" } } },
  { key: "text-top", label: "Text top, picture below", split: { axis: "y", first: { role: "body" }, second: { role: "picture" } } },
  { key: "picture-left", label: "Picture left, text right", split: { axis: "x", first: { role: "picture" }, second: { role: "body" } } },
  { key: "text-left", label: "Text left, picture right", split: { axis: "x", first: { role: "body" }, second: { role: "picture" } } },
  { key: "title-text", label: "Title and text", slots: [{ role: "title" }, { role: "body", below: "title" }] },
  { key: "full-picture", label: "Full picture", room: "page", slots: [{ role: "picture" }] },
  { key: "two-columns", label: "Two columns", slots: [{ role: "body", columns: 2 }] },
  { key: "cover", label: "Cover", slots: [{ role: "picture", room: "page" }, { role: "title", at: 0.62 }] },
  { key: "picture-caption", label: "Picture and caption", slots: [{ role: "picture", above: "caption" }, { role: "caption" }] },
  { key: "title-two-columns", label: "Title and two columns", slots: [{ role: "title" }, { role: "body", below: "title", columns: 2 }] },
];
export const layoutByKey = (key) => LAYOUTS.find((l) => l.key === key) || null;

// The room inside the margin, in editor px. With the Page Guide on, its margin rectangle is used (inside the trim box);
// otherwise `marginPct` of the page width on every side.
export function innerBox(pageW, pageH, settings, guide) {
  if (guide && guide.on && guide.marginIn > 0) {
    const preset = GUIDE_FORMAT_PRESETS.find((p) => p.key === guide.format) || GUIDE_FORMAT_PRESETS[0];
    const toPx = (inches) => inches * guide.pxPerInch;
    const trimW = preset.widthIn ? Math.min(pageW, toPx(preset.widthIn)) : pageW;
    const trimH = preset.heightIn ? Math.min(pageH, toPx(preset.heightIn)) : pageH;
    const m = toPx(guide.marginIn);
    if (trimW - 2 * m > 0 && trimH - 2 * m > 0) return { x: (pageW - trimW) / 2 + m, y: (pageH - trimH) / 2 + m, w: trimW - 2 * m, h: trimH - 2 * m };
  }
  const m = pageW * settings.marginPct / 100;
  return { x: m, y: m, w: Math.max(1, pageW - 2 * m), h: Math.max(1, pageH - 2 * m) };
}

// The boxes of a layout, in drawing order: [{ role, x, y, w, h, columns?, fixedHeight }] in editor px.
// `font` is the body text's size in px: titles, captions and the title's one-line height come from it.
export function place(layout, pageW, pageH, settings, font, guide) {
  const inner = innerBox(pageW, pageH, settings, guide);
  const gap = pageW * settings.gapPct / 100;
  const lineH = (scale) => Math.round(font * scale * 1.3);
  const page = { x: 0, y: 0, w: pageW, h: pageH };
  const out = [];

  if (layout.split) {
    const { axis, first, second } = layout.split;
    const total = axis === "y" ? inner.h : inner.w;
    const usable = Math.max(1, total - gap);
    const a = usable * settings.splitPct / 100, b = usable - a;
    const boxA = axis === "y" ? { x: inner.x, y: inner.y, w: inner.w, h: a } : { x: inner.x, y: inner.y, w: a, h: inner.h };
    const boxB = axis === "y" ? { x: inner.x, y: inner.y + a + gap, w: inner.w, h: b } : { x: inner.x + a + gap, y: inner.y, w: b, h: inner.h };
    out.push({ ...first, ...boxA, fixedHeight: true }, { ...second, ...boxB, fixedHeight: true });
    return out;
  }

  const byRole = {};
  let cursor = inner.y; // where the next stacked slot starts
  for (const slot of layout.slots) {
    const room = slot.room === "page" || layout.room === "page" ? page : inner;
    if (slot.role === "title") {
      const h = lineH(settings.titleScale);
      const y = slot.at != null ? room.y + room.h * slot.at : room.y;
      byRole.title = { ...slot, x: room.x, y, w: room.w, h, fixedHeight: false };
      cursor = y + h + gap;
      out.push(byRole.title);
    } else if (slot.role === "caption") {
      const h = lineH(settings.captionScale) * 2;
      byRole.caption = { ...slot, x: room.x, y: room.y + room.h - h, w: room.w, h, fixedHeight: true };
    } else if (slot.role === "body") {
      const top = slot.below === "title" ? cursor : room.y;
      out.push({ ...slot, x: room.x, y: top, w: room.w, h: Math.max(1, room.y + room.h - top), fixedHeight: true });
    } else if (slot.role === "picture") {
      let h = room.h;
      if (slot.above === "caption") h = room.h - lineH(settings.captionScale) * 2 - gap;
      out.push({ ...slot, x: room.x, y: room.y, w: room.w, h: Math.max(1, h), fixedHeight: true });
    }
  }
  if (byRole.caption) out.push(byRole.caption);
  return out;
}
