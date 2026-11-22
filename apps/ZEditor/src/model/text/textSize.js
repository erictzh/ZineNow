// Making a whole text box bigger or smaller by a step (the T- / T+ buttons in the text panel).

import { ptToPx, pxToPt } from "./textLook.js";

export const MIN_PT = 4; // the same limits as the font size box
export const MAX_PT = 200;

const clampPt = (pt) => Math.min(MAX_PT, Math.max(MIN_PT, pt));
const round1 = (n) => Math.round(n * 10) / 10;
const pxFor = (pt) => Math.round(ptToPx(pt) * 1000) / 1000; // as the font size box stores it

// The patch for a text box (`ann`) that moves every size in it by `deltaPt` points: its own font size, and any
// size set on a stretch of letters (colorRuns[].fontSize, in editor px), so the box keeps its proportions.
// Sizes stop at MIN_PT and MAX_PT; one that is already there stays, the rest carry on. Resolves to null when
// nothing would change.
export function sizeStepPatch(ann, deltaPt) {
  const patch = {};
  const own = pxToPt(ann.fontSize || 16);
  const ownNext = clampPt(round1(own + deltaPt));
  if (ownNext !== round1(own)) patch.fontSize = pxFor(ownNext);

  const runs = ann.colorRuns;
  if (runs && runs.some((r) => r.fontSize != null)) {
    let changed = false;
    const next = runs.map((r) => {
      if (r.fontSize == null) return r;
      const pt = pxToPt(r.fontSize);
      const to = clampPt(round1(pt + deltaPt));
      if (to === round1(pt)) return r;
      changed = true;
      return { ...r, fontSize: pxFor(to) };
    });
    if (changed) patch.colorRuns = next;
  }
  return Object.keys(patch).length ? patch : null;
}
