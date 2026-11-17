// Item-level rules: groups, moving and rotating items, bounding boxes, layer order.

// ---- Groups. Items grouped together share a `groupId`. Selecting any one
// selects them all, so they move, turn and delete as one; Alt + click
// picks a single member, and Ungroup (Ctrl+Shift+G) lets them go.
// `ids` plus every other selectable (not hidden, not locked) member of
// their groups, with `ids` first.
export function withGroupMates(annotations, ids) {
  const groups = new Set(annotations.filter((a) => ids.includes(a.id) && a.groupId).map((a) => a.groupId));
  if (groups.size === 0) return ids;
  const mates = annotations.filter((a) => groups.has(a.groupId) && !a.hidden && !a.locked).map((a) => a.id);
  return [...new Set([...ids, ...mates])];
}
// A steady colour per group, for the marker beside its layers.
export function groupColor(groupId) {
  let hash = 0;
  for (const ch of String(groupId)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${(hash * 47) % 360} 70% 60%)`;
}

export function translatedAnnotation(ann, dx, dy) {
  return ann.type === "stroke"
    ? { ...ann, points: ann.points.map(([px, py]) => [px + dx, py + dy]) }
    : { ...ann, x: ann.x + dx, y: ann.y + dy };
}

// Before layers, items were drawn by type whatever order they were
// added in, so projects saved back then are sorted to look the same.
export function legacyLayerOrder(annotations) {
  const rank = { image: 0, stroke: 1, text: 2 };
  return annotations.slice().sort((a, b) => rank[a.type] - rank[b.type]);
}

// The old indices in their new order after moving a block of items in
// front of slot `insertBefore`, or null if nothing changes.
export function orderAfterMove(count, fromIndices, insertBefore) {
  const moving = new Set(fromIndices);
  const allIndices = Array.from({ length: count }, (_, i) => i);
  const block = allIndices.filter((i) => moving.has(i));
  const rest = allIndices.filter((i) => !moving.has(i));
  const insertAt = rest.filter((i) => i < insertBefore).length;
  const newOrder = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
  return newOrder.every((oldIdx, newIdx) => oldIdx === newIdx) ? null : newOrder;
}

export function bboxOf(ann) {
  if (ann.type === "text") {
    return { x: ann.x, y: ann.y, width: ann.width || 160, height: ann.height || 26 };
  }
  const xs = ann.points.map((p) => p[0]);
  const ys = ann.points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}
