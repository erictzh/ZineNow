// Editing a box that is part of a story: a follower frame only keeps its frame settings, so its text, look and style
// changes land on the story's head, which can be on an earlier page. Pure (but it asks render/pageText.js which frame
// is which, so it needs the text layout).

import { routeFramePatch, withoutResolvedProps } from "../model/text/threads.js";
import { resolvePageText } from "./pageText.js";

// Applies `patch` to box `id` on page `pageIdx`. A follower frame of a threaded story only keeps its frame
// settings; its text, look and style changes land on the story's head (model/text/threads.js), which can be
// on an earlier page. `merge(box, patch)` makes the patched box. Returns the new list of pages.
export function patchedPages(pages, pageIdx, id, patch, merge) {
  const clean = withoutResolvedProps(patch);
  const anns = pages[pageIdx].annotations || [];
  const only = () => pages.map((p, i) => (i === pageIdx ? { ...p, annotations: anns.map((a) => (a.id === id ? merge(a, clean) : a)) } : p));
  const view = resolvePageText(anns, pages).find((a) => a.id === id);
  if (!view || view.storyHeadId == null || view.storyIndex === 0) return only();
  const headPage = pages.findIndex((p) => (p.annotations || []).some((a) => a.id === view.storyHeadId));
  if (headPage < 0) return only();
  const head = pages[headPage].annotations.find((a) => a.id === view.storyHeadId);
  const { framePatch, headPatch } = routeFramePatch(head, view.storyOffset || 0, clean);
  return pages.map((p, i) => {
    if (i !== pageIdx && i !== headPage) return p;
    return {
      ...p,
      annotations: (p.annotations || []).map((a) => {
        if (i === pageIdx && a.id === id && Object.keys(framePatch).length) return { ...a, ...framePatch };
        if (i === headPage && a.id === head.id && Object.keys(headPatch).length) return merge(a, headPatch);
        return a;
      }),
    };
  });
}
