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
import { layoutTextBox, measureTextBox } from "./textLayout.js";
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

// ---- Whole-document resolving ------------------------------------------------------------------------
// A story can run on from a frame on one page into a frame on a later one (`threadFrom` names a frame on any
// page: ids are unique in the document). So a page is resolved with the pages around it. The document is
// registered once per render (setTextDocument) and `resolvePageText(page.annotations)` finds its page by that
// array; callers that hold their own list of pages pass it as the second argument.
let currentDocument = null;
export function setTextDocument(pages) { currentDocument = pages; }

const docCache = new WeakMap(); // pages array -> { version, resolver }

// Every story of the document as its frames in reading order (frames can be on different pages):
// [[{ ann, pageIdx }, ...], ...]. Same rules as model/text/threads.js storyChains.
function documentChains(pages) {
  const texts = new Map();
  pages.forEach((p, pageIdx) => (p.annotations || []).forEach((a) => { if (a.type === "text") texts.set(a.id, { ann: a, pageIdx }); }));
  const nextOf = new Map();
  for (const e of texts.values()) {
    const from = e.ann.threadFrom;
    if (from == null || !texts.has(from) || nextOf.has(from)) continue;
    nextOf.set(from, e);
  }
  const chains = [];
  for (const head of texts.values()) {
    if (!nextOf.has(head.ann.id)) continue;
    const from = head.ann.threadFrom;
    if (from != null && texts.has(from) && nextOf.get(from) === head) continue; // not a head
    const chain = [head];
    const seen = new Set([head.ann.id]);
    for (let f = nextOf.get(head.ann.id); f && !seen.has(f.ann.id); f = nextOf.get(f.ann.id)) { chain.push(f); seen.add(f.ann.id); }
    chains.push(chain);
  }
  return chains;
}

function makeResolver(pages) {
  const version = wrapShapesVersion();
  const chainOfFrame = new Map(); // frame id -> its chain
  const chainViews = new Map();   // chain -> Map(frame id -> resolved frame)
  for (const chain of documentChains(pages)) {
    if (!canThread(chain[0].ann)) continue;
    for (const e of chain) chainOfFrame.set(e.ann.id, chain);
  }
  const resolveChain = (chain) => {
    if (chainViews.has(chain)) return chainViews.get(chain);
    const head = chain[0].ann;
    const story = head.text || "";
    let offset = 0;
    const views = new Map();
    chain.forEach((e, i) => {
      const base = i === 0 ? { ...head, storyLength: undefined } : followerView(head, e.ann, Math.min(offset, story.length));
      const next = chain[i + 1], prev = chain[i - 1];
      const where = { storyHeadId: head.id, storyIndex: i, storyPrevId: prev ? prev.ann.id : undefined, storyNextId: next ? next.ann.id : undefined,
        storyPrevPage: prev && prev.pageIdx !== e.pageIdx ? prev.pageIdx : undefined, storyNextPage: next && next.pageIdx !== e.pageIdx ? next.pageIdx : undefined };
      let view = withWrap({ ...base, ...where }, pages[e.pageIdx].annotations || []);
      if (next) {
        const fits = fittedLength(view);
        if (fits < (view.text || "").length) view = { ...view, storyLength: fits };
        offset = (view.storyOffset || 0) + fits;
      }
      views.set(e.ann.id, view);
    });
    chainViews.set(chain, views);
    return views;
  };
  const pageResults = new Map(); // page index -> resolved annotations
  return {
    version,
    page(pageIdx) {
      if (pageResults.has(pageIdx)) return pageResults.get(pageIdx);
      const annotations = pages[pageIdx].annotations || [];
      let changed = false;
      const result = annotations.map((a) => {
        const chain = chainOfFrame.get(a.id);
        const r = chain ? resolveChain(chain).get(a.id) : withWrap(a, annotations);
        if (r !== a) changed = true;
        return r;
      });
      const out = changed ? result : annotations;
      pageResults.set(pageIdx, out);
      return out;
    },
  };
}

function resolverFor(pages) {
  const version = wrapShapesVersion();
  const hit = docCache.get(pages);
  if (hit && hit.version === version) return hit.resolver;
  const resolver = makeResolver(pages);
  docCache.set(pages, { version, resolver });
  return resolver;
}

// `pages` (optional): the document this page belongs to; by default the one registered with setTextDocument. A list that
// is not one of the document's pages' own lists (a preview copy) is resolved on its own.
export function resolvePageText(annotations, pages) {
  if (!annotations || !annotations.length) return annotations || [];
  const doc = pages || currentDocument;
  if (doc) {
    const idx = doc.findIndex((p) => p.annotations === annotations);
    if (idx >= 0) return resolverFor(doc).page(idx);
  }
  const alone = cache.get(annotations);
  const version = wrapShapesVersion();
  if (alone && alone.version === version) return alone.result;
  const result = resolverFor([{ annotations }]).page(0);
  cache.set(annotations, { version, result });
  return result;
}

// For the page icons and the editor's labels: where each page's story stands. [{ continues: page index of the next
// frame (or null), overflows: the last frame's text doesn't fit }] per page.
export function storyStateOfPages(pages) {
  return pages.map((p, i) => {
    const views = resolvePageText(p.annotations || [], pages);
    let continues = null, overflows = false;
    for (const v of views) {
      if (v.type !== "text" || v.hidden) continue;
      if (v.storyNextPage != null) continues = v.storyNextPage;
      if (v.storyNextId == null && v.text && measureTextBox(v).overflow) overflows = true;
    }
    return { continues, overflows };
  });
}
