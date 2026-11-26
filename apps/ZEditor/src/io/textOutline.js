// Text as outlines: the letters of a text box as vector paths, so a design program (Illustrator) needs no fonts to open it.
//
// The glyph shapes come from the font file (fontkit, the same reader the PDF export uses), placed run by run where the
// editor's own text layout puts them (render/textRuns.js). A font whose file we cannot reach (a web font, or a system font
// the user has not allowed access to) cannot be outlined: the caller keeps live text for it and says so.

import { TEXT_EFFECTS, TEXT_PHOTO_PROPS } from "../model/text/textControls.js";
import { normalizeTraceSettings } from "../model/trace/traceSettings.js";
import { effectPropNames } from "../model/imageEffects.js";
import { layoutText } from "../render/textLayout.js";
import { layoutPlainRuns } from "../render/textRuns.js";
import { textPathData } from "../model/glyphPath.js";
import { createFontResolver } from "./fontFiles.js";

const n2 = (v) => String(Math.round(v * 100) / 100);

export function createTextOutliner() {
  const fk = typeof window !== "undefined" ? window.fontkit : null;
  const resolver = createFontResolver();
  const faces = new Map(); // font key -> fontkit font | null

  // The fontkit font behind a text box's family, bold and italic, or null.
  async function face(ann) {
    if (!fk) return null;
    const file = await resolver.find(ann.fontFamily, ann.bold, ann.italic);
    if (!file) return null;
    if (!faces.has(file.key)) {
      let font = null;
      try {
        const f = fk.create(new Uint8Array(file.bytes));
        font = f && !f.fonts ? f : null; // a collection (.ttc) is not supported
      } catch (err) { font = null; }
      faces.set(file.key, font);
    }
    return faces.get(file.key);
  }
  return { face };
}

// "Outline Text to Shape": the changes that turn a plain text box into a vectorized shape layer of its letters (one path per
// colour), in the same place. { patch } or { error } (a sentence for the user). The words can no longer be edited; Undo brings
// the text back. Text with effects, a label, or custom fonts inside it is refused: those have no plain outline.
export async function outlinedTextPatch(ann, plainLook, outliner = createTextOutliner()) {
  if (!ann.text || !ann.text.trim()) return { error: "There is no text to outline." };
  if (!plainLook(ann)) return { error: "This text has an effect (stroke, shadow, gradient, photo fill, ransom, curve, distress or stacked letters). Turn the effect off first, or use Rasterize to Image." };
  const layout = layoutText(document.createElement("canvas").getContext("2d"), ann, 1);
  const { runs, lineExtents } = layoutPlainRuns(layout, ann);
  const { look, fontSize, x, y, boxWidth, boxHeight } = layout;
  if (look.label) return { error: "A text label can't be outlined. Turn the label off first." };
  if (runs.some((r) => r.font)) return { error: "This text mixes fonts or sizes in one box, which can't be outlined yet. Make it one font and size first." };
  const font = await outliner.face(ann);
  if (!font) return { error: `The font file for ${ann.fontFamily || "this font"} isn't available. Upload it in the font menu (Upload Font File) or allow “Load Local System Fonts”, then try again.` };
  const byColor = new Map(); // colour -> path data, relative to the box's top-left
  const add = (color, d) => byColor.set(color, (byColor.get(color) || "") + d);
  for (const r of runs) {
    if (!r.text.trim()) continue;
    const d = textPathData(font, r.text, r.x - x, r.baselineY - y, fontSize, look.letterSpacingPx || 0);
    if (d === null) return { error: "The font doesn't have every character of this text, so it can't be outlined." };
    add(r.color || look.color, d);
  }
  // Underline and strike-through become thin shapes in the letters' colour.
  const thick = Math.max(1, fontSize / 15);
  for (const ext of lineExtents) {
    for (const seg of ext.segments) {
      const underlined = seg.underline != null ? seg.underline : ann.underline;
      const struck = seg.strike != null ? seg.strike : look.strike !== "none";
      for (const ly of [underlined ? ext.baselineY + fontSize * 0.12 : null, struck ? ext.baselineY - fontSize * 0.3 : null]) {
        if (ly === null) continue;
        const a = seg.x0 - x, b = seg.x1 - x, t = ly - y - thick / 2;
        add(seg.color || look.color, `M${n2(a)} ${n2(t)}H${n2(b)}V${n2(t + thick)}H${n2(a)}Z`);
      }
    }
  }
  if (!byColor.size) return { error: "Nothing visible to outline." };
  const textProps = ["text", "fontFamily", "fontSize", "bold", "italic", "underline", "color", "align", "lineSpacing", "letterSpacing", "strike", "textCase", "vertical", "fitHeight", "fillAlpha", "colorRuns", "columns", "columnGap", "frameHeight", "verticalAlign", "columnRule", "columnRuleColor", "columnRuleWidth", ...TEXT_PHOTO_PROPS];
  const effectProps = TEXT_EFFECTS.flatMap(effectPropNames);
  const cleared = Object.fromEntries([...textProps, ...effectProps].map((prop) => [prop, undefined]));
  return {
    patch: {
      ...cleared, type: "trace", x, y, width: boxWidth, height: boxHeight, traceW: boxWidth, traceH: boxHeight,
      paths: [...byColor].map(([color, d]) => ({ color, d })),
      trace: normalizeTraceSettings({ fills: "on", strokes: "off", view: "result" }),
    },
  };
}
