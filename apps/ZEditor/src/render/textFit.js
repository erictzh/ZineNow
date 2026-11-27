// How much of a text fits in a text box with a fixed height: the length of the part that is shown (the rest is cut at the start of the first
// line that does not fit). A box with no fixed height grows with its text, so all of it fits. Used by the data merge to start a new page.

import { layoutTextBox } from "./textLayout.js";

export function fitLength(ann, text) {
  if (!(ann.frameHeight > 0)) return text.length;
  const layout = layoutTextBox({ ...ann, text, fitHeight: undefined, colorRuns: undefined });
  const hidden = (layout.typesetLines || []).find((l) => l.hidden);
  return hidden ? hidden.start : text.length;
}
