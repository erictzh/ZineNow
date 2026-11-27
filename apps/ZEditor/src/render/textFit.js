// How much of a text fits in a text box with a fixed height: the length of the part that is shown (the rest is cut at the start of the first
// line that does not fit). A box with no fixed height grows with its text, so all of it fits. Used by the data merge to start a new page.

import { bboxOf } from "../model/annotations.js";
import { layoutTextBox, measureTextBox } from "./textLayout.js";

export function fitLength(ann, text) {
  if (!(ann.frameHeight > 0)) return text.length;
  const layout = layoutTextBox({ ...ann, text, fitHeight: undefined, colorRuns: undefined });
  const hidden = (layout.typesetLines || []).find((l) => l.hidden);
  return hidden ? hidden.start : text.length;
}

// An item of a list entry as the list layout needs it: where it is and how tall (a text box as it measures; one without a fixed height `grows`).
export function itemBox(a) {
  if (a.type === "text") { const m = measureTextBox(a); return { id: a.id, x: a.x, y: a.y, width: m.width, height: m.height, grows: !(a.frameHeight > 0) }; }
  if (a.type === "stroke") { const b = bboxOf(a); return { id: a.id, x: b.x, y: b.y, width: b.width, height: b.height, grows: false }; }
  return { id: a.id, x: a.x, y: a.y, width: a.width || 0, height: a.height || 0, grows: false };
}

// How tall a text box is with the given (filled) text.
export const textHeightFor = (a, text) => measureTextBox({ ...a, text, colorRuns: undefined }).height;
