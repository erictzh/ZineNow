// Page > Layout: add a ready-made layout to the current page (beneath what is there) or as a new page after it.
// The geometry is model/pageLayouts.js, the items (grey picture slots, lorem ipsum that fits) are render/layoutItems.js.
// Also the "T+" button of a page whose story overflows: a new page after it, with the same layout, holding the rest of the text.

import { DEFAULT_PAGE_SIZE, MAIN_SCALE, POINTS_PER_INCH } from "../constants.js";
import { layoutByKey } from "../model/pageLayouts.js";
import { buildLayoutItems } from "../render/layoutItems.js";
import { getPageDisplaySize, makeBlankThumb } from "../render/pageRender.js";
import { resolvePageText } from "../render/pageText.js";
import { measureTextBox } from "../render/textLayout.js";

const FRAME_KEYS = ["x", "y", "width", "frameHeight", "columns", "columnGap", "verticalAlign", "columnRule", "columnRuleColor", "columnRuleWidth", "angle"];
const frameLook = (a) => Object.fromEntries(FRAME_KEYS.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]));

export function useLayouts({ doc, history, edits, view, toolDefaults, status }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, nextAnnIdRef, pageSizeRef } = doc;
  const { recordUndoCheckpoint } = history;

  // The Page Guide's margin, when the guide is on (so a layout stays inside it).
  const guide = () => ({ on: view.guidesOn, format: view.guideFormat, marginIn: view.guideMarginIn, pxPerInch: POINTS_PER_INCH * MAIN_SCALE });
  const items = (layout, size) => buildLayoutItems({ layout, page: size, settings: view.layoutSettings, defaults: toolDefaults, guide: guide(), nextId: () => nextAnnIdRef.current++ });

  // A new blank page after page `at - 1`, the same size as `like` (a blank page) or the default.
  function insertPage(at, like, annotations) {
    const pts = like && like.isBlank ? { width: like.width, height: like.height } : (pageSizeRef.current || DEFAULT_PAGE_SIZE);
    const page = { key: nextKeyRef.current++, isBlank: true, rotation: 0, width: pts.width, height: pts.height, dataUrl: makeBlankThumb(pts.width, pts.height, 0), annotations };
    recordUndoCheckpoint();
    setPages((prev) => { const next = prev.slice(); next.splice(at, 0, page); return next; });
    setSelectedIdx(at);
    setSelectedPageIndices([]);
  }
  const sizeOf = (like) => {
    const pts = like && like.isBlank ? { width: like.width, height: like.height } : (pageSizeRef.current || DEFAULT_PAGE_SIZE);
    return { width: pts.width * MAIN_SCALE, height: pts.height * MAIN_SCALE };
  };

  // Adds the layout to the selected page, under the items already there (so they stay on top). One undo step.
  // A page that holds a linked text frame keeps it: the story moves into the layout's body slot (the frame is moved and
  // resized to it) and the pieces an earlier layout made (picture slots, title, caption) are replaced.
  async function addLayoutToPage(key) {
    const layout = layoutByKey(key);
    if (!layout || selectedIdx === null || !pages[selectedIdx]) return;
    const size = await getPageDisplaySize(pages[selectedIdx], pdfDocsRef, MAIN_SCALE);
    const existing = pages[selectedIdx].annotations || [];
    const linked = existing.find((a) => a.type === "text" && !a.hidden && (a.threadFrom != null || existing.some((b) => b.threadFrom === a.id) || pages.some((p) => (p.annotations || []).some((b) => b.threadFrom === a.id))));
    if (linked && !layout.split && !layout.slots.some((s) => s.role === "body")) {
      status.setNotice(`The "${layout.label}" layout has no text area, and this page holds part of a linked story. The story stays here: pick a layout with text.`);
      return;
    }
    const made = items(layout, size);
    // A layout applied again replaces the one before it (never stacks): the pieces an earlier layout made are removed, and
    // its text area (or a linked story's frame) is moved and resized into the new layout's text area, keeping its words.
    const oldBody = linked || existing.find((a) => a.layoutKey && a.layoutRole === "body");
    const body = made.find((a) => a.layoutRole === "body");
    const generated = (a) => a.layoutKey && a.layoutRole != null;
    if (!oldBody || !body) {
      edits.updateAnnotationsFor(selectedIdx, (anns) => [...made, ...anns.filter((a) => !generated(a))]);
      status.setNotice(`Applied the "${layout.label}" layout${existing.some(generated) ? ", replacing the earlier one" : " under the items on this page"}. Undo takes it off.`);
      return;
    }
    edits.updateAnnotationsFor(selectedIdx, (anns) => {
      const kept = anns.filter((a) => !generated(a) || a.id === oldBody.id);
      return [...made.filter((a) => a !== body), ...kept.map((a) => (a.id === oldBody.id ? { ...a, ...frameLook(body), layoutKey: layout.key, layoutRole: "body" } : a))];
    });
    status.setNotice(`Applied the "${layout.label}" layout; the text moved into its text area. Undo takes it back.`);
  }

  // A new blank page after the selected one (or at the end), holding the layout.
  function addPageWithLayout(key) {
    const layout = layoutByKey(key);
    if (!layout) return;
    const current = selectedIdx !== null ? pages[selectedIdx] : null;
    insertPage(selectedIdx !== null ? selectedIdx + 1 : pages.length, current, items(layout, sizeOf(current)));
    status.setNotice(`Added a new page with the "${layout.label}" layout.`);
  }

  // "T+": the story of page `pageIdx` overflows. A new page after it takes the rest: a frame linked to the last frame, with
  // the same layout when the page was made from one (otherwise the same frame position, size and columns).
  function continueStory(pageIdx) {
    const page = pages[pageIdx];
    if (!page) return;
    const views = resolvePageText(page.annotations || [], pages);
    const last = [...views].reverse().find((v) => v.type === "text" && !v.hidden && v.storyNextId == null && v.text && measureTextBox(v).overflow);
    if (!last) return;
    const id = nextAnnIdRef.current++;
    const follower = { id, type: "text", text: "", threadFrom: last.id, ...frameLook(last) };
    const layout = layoutByKey(((page.annotations || []).find((a) => a.layoutKey && a.layoutRole === "body") || {}).layoutKey);
    let made = [follower];
    if (layout) {
      const all = items(layout, sizeOf(page));
      const body = all.find((a) => a.layoutRole === "body");
      made = body ? all.map((a) => (a === body ? { ...follower, ...frameLook(body), layoutKey: layout.key, layoutRole: "body" } : a)) : [follower];
    }
    insertPage(pageIdx + 1, page, made);
    status.setNotice("Added a new page after this one with the rest of the text. Undo takes it away.");
  }

  return { addLayoutToPage, addPageWithLayout, continueStory };
}
