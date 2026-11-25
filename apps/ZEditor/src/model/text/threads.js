// Threaded text frames: a story that flows from one text box into the next.
//
// The first box (the head) holds the story: its text, look and style. Every later box
// (a follower) has `threadFrom: <id of the box before it>` and no text of its own; it only
// keeps its frame settings (FRAME_PROPS: position, size, columns...). render/pageText.js lays
// the story out and gives each follower the rest of the text that didn't fit before it.
// This file is pure: chains, which settings belong to the frame, and how edits made through
// a follower land on the story.

import { normalizeRuns } from "./colorRuns.js";

// Settings that belong to each frame; everything else is the story's (kept on the head).
export const FRAME_PROPS = [
  "id", "type", "x", "y", "width", "angle", "frameHeight", "columns", "columnGap",
  "verticalAlign", "columnRule", "columnRuleColor", "columnRuleWidth",
  "hidden", "locked", "name", "groupId", "groupName", "threadFrom",
];
const FRAME_SET = new Set(FRAME_PROPS);

// The page's stories, each as its frames in reading order: [[head, follower, ...], ...].
// Only chains of two or more frames are returned. A follower whose previous box is
// missing, isn't text, already has another follower, or is part of a loop is left out
// (it behaves as an ordinary empty box).
export function storyChains(annotations) {
  const texts = new Map(annotations.filter((a) => a.type === "text").map((a) => [a.id, a]));
  const nextOf = new Map();
  for (const a of texts.values()) {
    if (a.threadFrom == null || !texts.has(a.threadFrom) || nextOf.has(a.threadFrom)) continue;
    nextOf.set(a.threadFrom, a);
  }
  const chains = [];
  for (const head of texts.values()) {
    if (!nextOf.has(head.id)) continue;
    if (head.threadFrom != null && texts.has(head.threadFrom) && nextOf.get(head.threadFrom) === head) continue; // not a head
    const chain = [head];
    const seen = new Set([head.id]);
    for (let f = nextOf.get(head.id); f && !seen.has(f.id); f = nextOf.get(f.id)) { chain.push(f); seen.add(f.id); }
    chains.push(chain);
  }
  return chains;
}

// The story's look on a follower's frame: the head's settings, the follower's frame settings,
// and the text from `offset` on (colour runs moved to match).
export function followerView(head, frame, offset) {
  const view = { ...head };
  for (const key of FRAME_PROPS) view[key] = frame[key];
  view.threadFrom = undefined;
  view.fitHeight = undefined; // shrink-to-fit is per box; it isn't used in a thread
  view.text = (head.text || "").slice(offset);
  if (head.colorRuns && head.colorRuns.length) {
    view.colorRuns = head.colorRuns
      .filter((r) => r.end > offset)
      .map((r) => ({ ...r, start: Math.max(0, r.start - offset), end: r.end - offset }));
  }
  view.storyOffset = offset;
  view.storyContinues = offset > 0 && (head.text || "")[offset - 1] !== "\n";
  return view;
}

// Splits a patch made on a follower (as shown, with the story's text from `offset` on) into
// what changes on the frame itself and what changes on the story's head.
export function routeFramePatch(head, offset, patch) {
  const framePatch = {}, headPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (FRAME_SET.has(key)) framePatch[key] = value;
    else if (key !== "text" && key !== "colorRuns") headPatch[key] = value;
  }
  const story = head.text || "";
  if ("text" in patch) headPatch.text = story.slice(0, offset) + patch.text;
  if ("colorRuns" in patch) {
    const before = (head.colorRuns || []).filter((r) => r.start < offset).map((r) => ({ ...r, end: Math.min(r.end, offset) }));
    const after = (patch.colorRuns || []).map((r) => ({ ...r, start: r.start + offset, end: r.end + offset }));
    headPatch.colorRuns = normalizeRuns([...before, ...after]);
  }
  return { framePatch, headPatch };
}

// Everything that is the story's (not the frame's) on a box: what a frame that takes over
// as head needs to carry on the story.
export function storyProps(ann) {
  const out = {};
  for (const [key, value] of Object.entries(ann)) if (!FRAME_SET.has(key)) out[key] = value;
  return out;
}

// Deleting frames keeps the chain together: the frame after a deleted one links to the frame
// before it, and if the head is deleted, the next frame becomes the head and takes the story.
// Returns the new annotation list without the deleted items.
export function removeWithThreads(annotations, ids) {
  const gone = new Set(ids);
  const replaced = new Map();
  for (const chain of storyChains(annotations)) {
    if (!chain.some((a) => gone.has(a.id))) continue;
    const survivors = chain.filter((a) => !gone.has(a.id));
    survivors.forEach((frame, i) => {
      if (i === 0) {
        // The new head: takes the story if the old head is gone.
        replaced.set(frame.id, frame === chain[0] ? frame : { ...frame, ...storyProps(chain[0]), threadFrom: undefined });
      } else if (frame.threadFrom !== survivors[i - 1].id) {
        replaced.set(frame.id, { ...frame, threadFrom: survivors[i - 1].id });
      }
    });
  }
  return annotations.filter((a) => !gone.has(a.id)).map((a) => replaced.get(a.id) || a);
}

// The same across a whole document: removes the items with these ids from whichever pages hold them, keeping every story
// together even when it runs over several pages (a frame after a deleted one links to the frame before it; if the head
// is deleted the next frame takes the story). Returns the new pages; pages it didn't touch are returned as they were.
export function removeFromPages(pages, ids) {
  const all = pages.flatMap((p) => p.annotations || []);
  const kept = new Map(removeWithThreads(all, ids).map((a) => [a.id, a]));
  return pages.map((p) => {
    const anns = p.annotations || [];
    if (!anns.some((a) => kept.get(a.id) !== a)) return p;
    return { ...p, annotations: anns.filter((a) => kept.has(a.id)).map((a) => kept.get(a.id)) };
  });
}

// Deleting pages: their items go the same way, so a story that ran through a deleted page carries on across the gap.
export function removePagesKeepingStories(pages, indices) {
  const gone = new Set(indices);
  const ids = pages.flatMap((p, i) => (gone.has(i) ? (p.annotations || []).map((a) => a.id) : []));
  return removeFromPages(pages, ids).filter((_, i) => !gone.has(i));
}

// Props render/pageText.js adds to the boxes it lays out. They describe one layout and are
// never stored on the page.
export const RESOLVED_TEXT_PROPS = ["storyOffset", "storyContinues", "storyLength", "storyHeadId", "storyIndex", "storyPrevId", "storyNextId", "storyPrevPage", "storyNextPage", "wrapObstacles"];
export function withoutResolvedProps(obj) {
  if (!RESOLVED_TEXT_PROPS.some((k) => k in obj)) return obj;
  const out = { ...obj };
  for (const k of RESOLVED_TEXT_PROPS) delete out[k];
  return out;
}

// A laid-out frame as a box of its own (for copy/paste): its look and just the words it shows.
export function standaloneCopy(view) {
  const copy = withoutResolvedProps({ ...view, threadFrom: undefined });
  if (view.storyLength != null) {
    copy.text = (view.text || "").slice(0, view.storyLength);
    if (copy.colorRuns) copy.colorRuns = copy.colorRuns.filter((r) => r.start < view.storyLength).map((r) => ({ ...r, end: Math.min(r.end, view.storyLength) }));
  }
  return copy;
}

// True when a box is part of a thread (has a frame before or after it).
export function isThreaded(annotations, id) {
  const ann = annotations.find((a) => a.id === id);
  if (!ann) return false;
  return ann.threadFrom != null || annotations.some((a) => a.type === "text" && a.threadFrom === id);
}

// The editor's dotted thread lines: for each laid-out frame that flows on (render/pageText.js sets
// `storyNextId`), a line from its out-port (bottom-right corner) to the next frame's in-port
// (top-left corner). Corners follow each frame's rotation, which turns about the box's centre as CSS
// does. `sizeOf(view)` gives a frame's { width, height } in editor px. Returns [{ id, x1, y1, x2, y2 }].
export function threadLinks(views, sizeOf) {
  const byId = new Map(views.map((v) => [v.id, v]));
  const corner = (v, fx, fy) => {
    const { width, height } = sizeOf(v);
    const rad = ((Number(v.angle) || 0) * Math.PI) / 180;
    const dx = (fx - 0.5) * width, dy = (fy - 0.5) * height;
    return [v.x + width / 2 + dx * Math.cos(rad) - dy * Math.sin(rad), v.y + height / 2 + dx * Math.sin(rad) + dy * Math.cos(rad)];
  };
  const links = [];
  for (const v of views) {
    if (v.type !== "text" || v.storyNextId == null) continue;
    const next = byId.get(v.storyNextId);
    if (!next || v.hidden || next.hidden) continue;
    const [x1, y1] = corner(v, 1, 1);
    const [x2, y2] = corner(next, 0, 0);
    links.push({ id: v.id, nextId: next.id, headId: v.storyHeadId, x1, y1, x2, y2 });
  }
  return links;
}
