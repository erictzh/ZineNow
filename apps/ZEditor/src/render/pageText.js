// A page's text boxes as they're laid out together: threaded stories split across their frames, and text wrap.
//
// Renderers draw one box at a time (layoutText only sees that box), so this turns the page's
// items into ones that can each be drawn alone:
//   - a text frame overlapped by an image or shape with Text wrap gets `wrapObstacles`
//     (model/text/textWrap.js), which the composer flows the lines around;
//   - a story's head keeps the whole text but gets `storyLength` (how much of it fits in the
//     head); each follower becomes the head's look on its own frame, with the rest of the
//     text (`storyOffset` on) and its own `storyLength` (model/text/threads.js);
//   - every frame of a story gets `storyHeadId`, `storyIndex`, and `storyPrevId`/`storyNextId`.
// Followers lose `threadFrom`, so resolving an already resolved list changes nothing.
// The editor, Export (picture and vector) and Rasterize all draw from this, so they agree.

import { wrapObstaclesFor } from "../model/text/textWrap.js";
import { followerView, storyChains } from "../model/text/threads.js";
import { layoutTextBox } from "./textLayout.js";
import { wrapRowsFor, wrapShapesVersion } from "./wrapShapes.js";

const cache = new WeakMap(); // annotations array -> { version, result }

// Ransom, curve and stacked text have their own layout, with no frames to flow through.
const canThread = (head) => !(head.ransom || head.curve || head.vertical === "stacked");

function withWrap(ann, annotations) {
  if (ann.type !== "text") return ann;
  const obstacles = wrapObstaclesFor(ann, annotations, wrapRowsFor);
  if (!obstacles && !ann.wrapObstacles) return ann;
  return { ...ann, wrapObstacles: obstacles || undefined };
}

// Where the text that fits in a laid-out frame ends (an index into its own text).
function fittedLength(view) {
  const layout = layoutTextBox(view);
  const firstHidden = (layout.typesetLines || []).find((l) => l.hidden);
  return firstHidden ? firstHidden.start : (view.text || "").length;
}

export function resolvePageText(annotations) {
  if (!annotations || !annotations.length) return annotations || [];
  const version = wrapShapesVersion();
  const hit = cache.get(annotations);
  if (hit && hit.version === version) return hit.result;

  const replaced = new Map();
  for (const chain of storyChains(annotations)) {
    const head = chain[0];
    if (!canThread(head)) continue;
    const story = head.text || "";
    let offset = 0;
    const views = [];
    chain.forEach((frame, i) => {
      const base = i === 0 ? { ...head, storyLength: undefined } : followerView(head, frame, Math.min(offset, story.length));
      let view = withWrap({ ...base, storyHeadId: head.id, storyIndex: i, storyPrevId: i > 0 ? chain[i - 1].id : undefined, storyNextId: chain[i + 1] ? chain[i + 1].id : undefined }, annotations);
      if (i < chain.length - 1) {
        const fits = fittedLength(view);
        if (fits < (view.text || "").length) view = { ...view, storyLength: fits };
        offset = (view.storyOffset || 0) + fits;
      }
      views.push(view);
    });
    views.forEach((v) => replaced.set(v.id, v));
  }
  let changed = replaced.size > 0;
  const result = annotations.map((a) => {
    if (replaced.has(a.id)) return replaced.get(a.id);
    const w = withWrap(a, annotations);
    if (w !== a) changed = true;
    return w;
  });
  const out = changed ? result : annotations;
  cache.set(annotations, { version, result: out });
  return out;
}
