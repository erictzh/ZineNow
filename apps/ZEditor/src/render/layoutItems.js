// A page layout turned into real page items: grey picture rectangles and text boxes filled with lorem ipsum that fits.
// The geometry is model/pageLayouts.js; this adds the text (and measures it with the real text layout, so what is
// written fits its box and the page does not start with "overset" warnings).

import { controlValues } from "../model/controls.js";
import { RECT_CONTROLS } from "../model/rect.js";
import { place } from "../model/pageLayouts.js";
import { placeholderText } from "../model/text/placeholderText.js";
import { ptToPx, pxToPt } from "../model/text/textLook.js";
import { layoutTextBox, measureTextBox } from "./textLayout.js";

const TITLE_TEXT = "Lorem ipsum dolor sit";
const CAPTION_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.";

// `ann` is a text frame with `text` set to far more than it holds. Returns the text cut where the frame ends (at a line
// start, so at a word), and shorter still while the cut text would overflow.
export function fitTextToFrame(ann) {
  const lines = layoutTextBox(ann).typesetLines || [];
  const firstHidden = lines.find((l) => l.hidden);
  let text = firstHidden ? ann.text.slice(0, firstHidden.start) : ann.text;
  text = text.replace(/\s+$/, "");
  // The shorter text can break its last paragraph differently: drop a word at a time until nothing overflows.
  for (let guard = 0; guard < 40 && text && measureTextBox({ ...ann, text }).overflow; guard++) {
    text = text.slice(0, Math.max(0, text.lastIndexOf(" "))).replace(/\s+$/, "");
  }
  return text;
}

// layout: from LAYOUTS. page: { width, height } in editor px. defaults: the text tool's settings (state/useToolDefaults.js).
// guide: { on, format, marginIn, pxPerInch } for the Page Guide margin. nextId(): a new item id each call.
// Returns the items in drawing order (bottom first).
export function buildLayoutItems({ layout, page, settings, defaults, guide, nextId }) {
  const bodyPt = Number(defaults.textFontSize) || 12;
  const boxes = place(layout, page.width, page.height, settings, ptToPx(bodyPt), guide);
  const rect = controlValues({}, RECT_CONTROLS);
  const font = { fontFamily: defaults.textFontFamily, bold: defaults.textBold, italic: defaults.textItalic, underline: defaults.textUnderline, color: defaults.textColor, align: defaults.textAlign };
  return boxes.map((b) => {
    const id = nextId();
    if (b.role === "picture") {
      return { id, type: "rect", layoutRole: "picture", x: b.x, y: b.y, width: b.w, height: b.h, ...rect, fillType: "solid", fillColor: settings.slotGrey, fillAlpha: 100 };
    }
    const base = { id, type: "text", layoutRole: b.role, x: b.x, y: b.y, width: Math.round(b.w), ...font, fontSize: bodyPt };
    if (b.role === "title") return { ...base, fontSize: Math.round(bodyPt * settings.titleScale * 10) / 10, bold: true, text: TITLE_TEXT };
    const framed = { ...base, frameHeight: Math.max(12, Math.round(pxToPt(b.h))) };
    if (b.role === "caption") {
      const sized = { ...framed, fontSize: Math.round(bodyPt * settings.captionScale * 10) / 10 };
      return { ...sized, text: fitTextToFrame({ ...sized, text: CAPTION_TEXT }) };
    }
    const cols = b.columns > 1 ? { columns: b.columns, columnGap: settings.columnGapPt } : {};
    const body = { ...framed, ...cols };
    return { ...body, text: fitTextToFrame({ ...body, text: placeholderText("latin", 40) }) };
  });
}
