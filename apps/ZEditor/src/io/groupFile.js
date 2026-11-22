// A group (or any set of items) as a .znow file, and back. The file is an ordinary one-page project holding just those
// items on a "no paper" page sized to fit them, so it also opens on its own with Open project. Fonts the items use are stored
// with it (serializeProject), pictures are inside the items. Reading one gives back the items for Import.

import { MAIN_SCALE } from "../constants.js";
import { translatedAnnotation } from "../model/annotations.js";
import { annotationBounds } from "../render/itemGeometry.js";
import { readProjectFile, serializeProject } from "./projectFile.js";

const PAD = 40; // editor px of room round the items in the file

// The box (editor px) all of the items cover, or null if there are none.
export function itemsBounds(items) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of items) {
    const b = annotationBounds(a);
    if (![b.x, b.y, b.width, b.height].every(Number.isFinite)) continue;
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : null;
}

// The .znow text for `items` (bottom layer first, as on the page), called `name`.
export function serializeGroup(name, items) {
  const b = itemsBounds(items);
  if (!b) throw new Error("There is nothing in that group to save.");
  const dx = PAD - b.x, dy = PAD - b.y;
  // The lowest item can't stay clipped to a layer that is not in the file.
  const moved = items.map((a, i) => {
    const m = translatedAnnotation(a, dx, dy);
    return i === 0 && m.clipToBelow ? { ...m, clipToBelow: undefined } : m;
  });
  const page = {
    key: 1, isBlank: true, isCanvas: true, rotation: 0,
    width: Math.ceil(b.width + 2 * PAD) / MAIN_SCALE, height: Math.ceil(b.height + 2 * PAD) / MAIN_SCALE,
    annotations: moved,
  };
  return serializeProject({ title: name, pdfDocs: {}, pages: [page], textStyles: [], settings: {} });
}

// The items (all pages, bottom layer first) and the name of a .znow file. Registers its fonts on the way.
export async function readGroupFile(file, nextPageKey) {
  const project = await readProjectFile(file, nextPageKey);
  const items = project.pages.flatMap((p) => p.annotations || []);
  if (!items.length) throw new Error("That file has no items in it.");
  const named = items.find((a) => a.groupName);
  return { items, name: (named && named.groupName) || project.title || "Imported group" };
}
