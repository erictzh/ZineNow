// Export selected layers as an SVG file: vectorized images, shapes and pen strokes as real vectors, plain text as
// live text, everything else (photos, text with effects, shadows) as an embedded picture of how it looks.

import { MAIN_SCALE } from "../constants.js";
import { hexToRgb } from "../model/color.js";
import { isClipped } from "../model/clipping.js";
import { angleOf, blendOf, controlValues, effectSettings, opacityOf } from "../model/controls.js";
import { STROKE_EFFECT, imageEdgeOutline, imageShadowOffset } from "../model/imageEffects.js";
import { rectOutline } from "../model/outlines.js";
import { RECT_CONTROLS } from "../model/rect.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS, smoothPathD, taperedPathD } from "../model/strokes.js";
import { textLook } from "../model/text/textLook.js";
import { traceContentBounds, traceDrawList } from "../model/trace/traceLayer.js";
import { flattenedImagePatch, rasterizedRectPatch, rasterizedTextPatch } from "../render/bake.js";
import { rectGradientStops } from "../render/gradients.js";
import { annotationBounds } from "../render/itemGeometry.js";
import { layerName } from "../model/layerNames.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { getPageDisplaySize, renderPageToCanvas } from "../render/pageRender.js";
import { resolvePageText } from "../render/pageText.js";
import { layoutText } from "../render/textLayout.js";
import { columnRules, layoutPlainRuns } from "../render/textRuns.js";
import { textPathData } from "../model/glyphPath.js";
import { createTextOutliner } from "./textOutline.js";

const num = (v) => String(Math.round(v * 100) / 100);
export const escapeXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "rgba(r,g,b,a)" or "#rrggbb" → SVG colour and opacity (some editors ignore rgba() in SVG).
export function svgColor(css) {
  const m = /^rgba?\(([^)]+)\)$/.exec(css || "");
  if (!m) return { color: css || "#000000", opacity: 1 };
  const [r, g, b, a = 1] = m[1].split(",").map(Number);
  return { color: `rgb(${r},${g},${b})`, opacity: a };
}

// Opacity, blend mode and rotation (about the box's middle) around one item's drawing.
function wrapItem(ann, inner, box) {
  const attrs = [];
  const angle = angleOf(ann);
  if (angle && box) attrs.push(`transform="rotate(${num(angle)} ${num(box.x + box.width / 2)} ${num(box.y + box.height / 2)})"`);
  if (opacityOf(ann) < 1) attrs.push(`opacity="${num(opacityOf(ann))}"`);
  if (blendOf(ann) !== "normal") attrs.push(`style="mix-blend-mode:${blendOf(ann)}"`);
  return attrs.length ? `<g ${attrs.join(" ")}>${inner}</g>` : inner;
}

// ---- Vector items ----------------------------------------------------------------------------

function traceSvg(ann) {
  if (!ann.traceW || !ann.traceH) return "";
  const paths = traceDrawList(ann).map((p) => {
    const fill = p.fill ? `fill="${p.fill}"` : `fill="none"`;
    const stroke = p.stroke ? ` stroke="${p.stroke}" stroke-width="${num(p.strokeWidth)}" stroke-linejoin="round" stroke-linecap="round"` : "";
    return `<path d="${p.d}" ${fill}${stroke}/>`;
  }).join("");
  const sx = ann.width / ann.traceW, sy = ann.height / ann.traceH;
  return `<g transform="translate(${num(ann.x)} ${num(ann.y)}) scale(${+sx.toFixed(6)} ${+sy.toFixed(6)})">${paths}</g>`;
}

// A rectangle or ellipse: its outline (edge shape included), its fill (solid or gradient) and its Stroke effect.
function rectSvg(ann, defs, nextId) {
  const v = controlValues(ann, RECT_CONTROLS);
  const w = ann.width, h = ann.height;
  let fill;
  if (v.fillType === "solid") {
    const { r, g, b } = hexToRgb(v.fillColor);
    fill = `fill="rgb(${r},${g},${b})"${v.fillAlpha < 100 ? ` fill-opacity="${num(v.fillAlpha / 100)}"` : ""}`;
  } else {
    const id = nextId("grad");
    const stops = rectGradientStops(ann).map((s) => {
      const c = svgColor(s.color);
      return `<stop offset="${num(s.percent)}%" stop-color="${c.color}"${c.opacity < 1 ? ` stop-opacity="${num(c.opacity)}"` : ""}/>`;
    }).join("");
    if (v.fillType === "linear") {
      // Like CSS linear-gradient(<angle>deg): through the middle, ends where the corners land.
      const rad = v.gradientAngle * Math.PI / 180, dx = Math.sin(rad), dy = -Math.cos(rad);
      const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
      defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(w / 2 - dx * half)}" y1="${num(h / 2 - dy * half)}" x2="${num(w / 2 + dx * half)}" y2="${num(h / 2 + dy * half)}">${stops}</linearGradient>`);
    } else {
      // CSS "ellipse farthest-corner": a circle stretched to the box, reaching its corners.
      defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${num(w / 2)} ${num(h / 2)}) scale(${num(w / 2 * Math.SQRT2)} ${num(h / 2 * Math.SQRT2)})">${stops}</radialGradient>`);
    }
    fill = `fill="url(#${id})"`;
  }
  const outline = imageEdgeOutline(ann);
  const shape = outline ? `<path d="${outline}" ${fill}/>` : `<rect width="${num(w)}" height="${num(h)}" ${fill}/>`;
  let stroke = "";
  if (ann.stroke) {
    const s = effectSettings(ann, STROKE_EFFECT);
    stroke = `<path d="${outline || rectOutline(ann)}" fill="none" stroke="${s.strokeColor}" stroke-width="${num(s.strokeThickness)}" stroke-miterlimit="4"/>`;
  }
  return `<g transform="translate(${num(ann.x)} ${num(ann.y)})">${shape}${stroke}</g>`;
}

function strokeSvg(ann) {
  const isHi = ann.tool === "highlighter";
  const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
  const width = ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width);
  const alpha = isHi ? ` opacity="0.45"` : "";
  if (ann.taper > 0) return `<path d="${taperedPathD(ann.points, width, ann.taper)}" fill="${color}"${alpha}/>`;
  return `<path d="${smoothPathD(ann.points)}" fill="none" stroke="${color}" stroke-width="${num(width)}" stroke-linecap="round" stroke-linejoin="round"${alpha}/>`;
}

// Text with a look SVG text can't carry is embedded as a picture instead (see textAsPicture).
export function plainTextLook(ann) {
  const look = textLook(ann);
  return !(look.stroke || look.shadow || look.gradient || look.photo || look.ransom || look.curve || look.distress || look.stacked);
}

// Live text: each run of the editor's own layout placed where the editor draws it. The font isn't
// embedded, so it looks right where that font is installed (`fonts` collects the families used).
async function textSvg(ann, fonts, outliner) {
  const ctx = document.createElement("canvas").getContext("2d");
  const layout = layoutText(ctx, ann, 1);
  const { runs, lineExtents } = layoutPlainRuns(layout, ann);
  const { look, fontSize, x, y, boxWidth, boxHeight } = layout;
  const family = ann.fontFamily || "sans-serif";
  let out = "";
  // Outlines (when asked for and the font file is reachable): every run becomes paths and no font is needed to open the file.
  let outlined = null;
  if (outliner && !runs.some((r) => r.font)) {
    const font = await outliner.face(ann);
    if (font) {
      const paths = runs.filter((r) => r.text.trim()).map((r) => ({ r, d: textPathData(font, r.text, r.x, r.baselineY, fontSize, look.letterSpacingPx || 0) }));
      if (paths.every((p) => p.d !== null)) outlined = paths;
    }
  }
  if (!outlined) fonts.add(family);
  if (look.label) {
    const c = hexToRgb(look.label.labelColor);
    out += `<rect x="${num(x)}" y="${num(y)}" width="${num(boxWidth)}" height="${num(boxHeight)}" rx="${num(look.label.labelRadius || 0)}" fill="rgb(${c.r},${c.g},${c.b})"${look.label.labelAlpha < 100 ? ` fill-opacity="${num(look.label.labelAlpha / 100)}"` : ""}/>`;
  }
  for (const rule of columnRules(layout, ann)) {
    out += `<line x1="${num(rule.x)}" y1="${num(rule.y0)}" x2="${num(rule.x)}" y2="${num(rule.y1)}" stroke="${rule.color}" stroke-width="${num(rule.width)}"/>`;
  }
  const base = `font-family="${escapeXml(family)}, sans-serif" font-size="${num(fontSize)}"${ann.bold ? ` font-weight="bold"` : ""}${ann.italic ? ` font-style="italic"` : ""}`
    + (look.letterSpacingPx ? ` letter-spacing="${num(look.letterSpacingPx)}"` : "")
    + (look.fillAlpha < 100 ? ` fill-opacity="${num(look.fillAlpha / 100)}"` : "");
  const tspans = runs.filter((r) => r.text.trim()).map((r) => {
    const font = r.font ? ` style="font:${escapeXml(r.font)}"` : "";
    return `<tspan x="${num(r.x)}" y="${num(r.baselineY)}" fill="${r.color || look.color}"${font}>${escapeXml(r.text)}</tspan>`;
  }).join("");
  if (outlined) {
    const fillOpacity = look.fillAlpha < 100 ? ` fill-opacity="${num(look.fillAlpha / 100)}"` : "";
    out += outlined.map((p) => `<path d="${p.d}" fill="${p.r.color || look.color}"${fillOpacity}/>`).join("");
  } else out += `<text ${base} xml:space="preserve">${tspans}</text>`;
  // Underline and strike-through as lines under / through each coloured stretch.
  for (const ext of lineExtents) {
    for (const seg of ext.segments) {
      const lines = [];
      // As the canvas draws them: a custom span may turn either on or off for its own letters.
      const underlined = seg.underline != null ? seg.underline : ann.underline;
      const struck = seg.strike != null ? seg.strike : look.strike !== "none";
      if (underlined) lines.push(ext.baselineY + fontSize * 0.12);
      if (struck) lines.push(ext.baselineY - fontSize * 0.3);
      for (const ly of lines) out += `<line x1="${num(seg.x0)}" y1="${num(ly)}" x2="${num(seg.x1)}" y2="${num(ly)}" stroke="${seg.color || look.color}" stroke-width="${num(Math.max(1, fontSize / 15))}"/>`;
    }
  }
  return { svg: out, box: { x, y, width: boxWidth, height: boxHeight }, outlined: Boolean(outlined) };
}

// ---- Pictures ---------------------------------------------------------------------------------

function imageTag(patch) {
  return `<image href="${patch.src}" x="${num(patch.x)}" y="${num(patch.y)}" width="${num(patch.width)}" height="${num(patch.height)}" preserveAspectRatio="none"/>`;
}

// ---- The file ---------------------------------------------------------------------------------

// A layer's name as an SVG group id (design programs show it as the layer's name): no spaces or odd characters.
const groupId = (name, taken) => {
  const base = String(name).trim().slice(0, 40).replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "") || "Layer";
  let id = /^[\p{L}_]/u.test(base) ? base : "_" + base, k = 1;
  while (taken.has(id)) id = `${base}_${++k}`;
  taken.add(id);
  return id;
};

// The drawing of each layer, bottom first, every one in its own group named after the layer. `ctx` collects what is shared and
// what the export has to report: { defs, nextId, fonts, counts: { pictures, clipped, outlined }, outliner, ids }.
async function layerParts(items, pageFilter, ctx) {
  const parts = [];
  const named = (ann, svg) => `<g id="${escapeXml(groupId(layerName(ann), ctx.ids))}" data-name="${escapeXml(layerName(ann))}">${svg}</g>`;
  for (const ann of items) {
    if (isClipped(ann)) ctx.counts.clipped++;
    const box = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
    // A shadow or texture has no plain SVG equivalent: such a layer goes in as a picture of itself.
    const hasLookOnly = Boolean(imageShadowOffset(ann) || ann.texture);
    if (ann.type === "trace" && !hasLookOnly) parts.push(named(ann, wrapItem(ann, traceSvg(ann), box)));
    else if (ann.type === "rect" && !hasLookOnly) parts.push(named(ann, wrapItem(ann, rectSvg(ann, ctx.defs, ctx.nextId), box)));
    else if (ann.type === "stroke") parts.push(named(ann, wrapItem(ann, strokeSvg(ann), null)));
    else if (ann.type === "text" && plainTextLook(ann)) {
      if (!ann.text || !ann.text.trim()) continue;
      const t = await textSvg(ann, ctx.fonts, ctx.outliner);
      if (t.outlined) ctx.counts.outlined++;
      parts.push(named(ann, wrapItem(ann, t.svg, t.box)));
    } else {
      // Photos, text with effects, shapes with a shadow or texture: baked as they look (rotation included).
      const patch = ann.type === "image" ? await flattenedImagePatch(ann, pageFilter)
        : ann.type === "text" ? await rasterizedTextPatch(ann)
          : ann.type === "rect" ? await rasterizedRectPatch(ann)
            : null;
      if (!patch) continue;
      ctx.counts.pictures++;
      parts.push(named(ann, wrapItem({ ...ann, angle: undefined }, imageTag(patch), null)));
    }
  }
  return parts;
}
const newContext = (options) => ({
  defs: [], ids: new Set(), fonts: new Set(), counts: { pictures: 0, clipped: 0, outlined: 0 },
  nextId: (() => { let n = 0; return (prefix) => `${prefix}${++n}`; })(),
  outliner: options && options.outlineText ? createTextOutliner() : null,
});
const result = (svg, ctx) => ({ svg, pictures: ctx.counts.pictures, clipped: ctx.counts.clipped, outlined: ctx.counts.outlined, fonts: [...ctx.fonts] });

// `items`: the layers to export, bottom first, as the page resolves them (resolvePageText), hidden
// ones already left out. `options.outlineText`: letters become paths where the font file is reachable.
// Returns { svg, pictures, fonts, clipped, outlined }: how many layers went in as pictures, the font families live text
// uses, how many clipping masks were left off (a clipped layer goes in whole) and how many text boxes became outlines.
// Null when there is nothing to export.
export async function layersToSvg(items, pageFilter, options) {
  if (!items.length) return null;
  const ctx = newContext(options);
  const parts = await layerParts(items, pageFilter, ctx);
  if (!parts.length) return null;

  // Cropped to what shows: a vectorized layer to its visible shapes (hidden colours leave no margin).
  const boundsOf = (ann) => (ann.type === "trace" && traceContentBounds(ann)) || annotationBounds(ann);
  const bounds = items.map(boundsOf).reduce((u, b) => ({
    x0: Math.min(u.x0, b.x), y0: Math.min(u.y0, b.y), x1: Math.max(u.x1, b.x + b.width), y1: Math.max(u.y1, b.y + b.height),
  }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  const pad = 1;
  const vb = { x: bounds.x0 - pad, y: bounds.y0 - pad, w: bounds.x1 - bounds.x0 + pad * 2, h: bounds.y1 - bounds.y0 + pad * 2 };
  // Editor px are MAIN_SCALE per point, so the file keeps the size the layers have on the page.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(vb.w / MAIN_SCALE)}pt" height="${num(vb.h / MAIN_SCALE)}pt" viewBox="${num(vb.x)} ${num(vb.y)} ${num(vb.w)} ${num(vb.h)}">\n`
    + (ctx.defs.length ? `<defs>${ctx.defs.join("")}</defs>\n` : "")
    + parts.join("\n") + "\n</svg>\n";
  return result(svg, ctx);
}

// Whole pages as one SVG, side by side (one page: just that page). Each page is a group named "Page 1"…, holding its background
// and its layers, each in its own group, so a design program shows them as layers. The page's whole area, bleed included, is the
// artboard size. Imported PDF pages go in as a picture of the page; page numbers and guides are not included.
// `indices`: the pages to export. Returns the same as layersToSvg.
export async function pagesToSvg(pages, indices, pdfDocsRef, options) {
  const ctx = newContext(options);
  const GAP = 40; // px between pages
  let offset = 0, maxH = 0;
  const groups = [];
  for (const idx of indices) {
    const page = pages[idx];
    const size = await getPageDisplaySize(page, pdfDocsRef, MAIN_SCALE);
    const filter = page.filter || DEFAULT_PAGE_FILTER;
    const items = resolvePageText(page.annotations || [], pages).filter((a) => !a.hidden);
    let background = "";
    if (!page.isBlank) {
      const canvas = await renderPageToCanvas({ ...page, annotations: [] }, pdfDocsRef, 2, filter, null);
      background = `<g id="Page_background" data-name="Page background"><image href="${canvas.toDataURL("image/png")}" x="0" y="0" width="${num(size.width)}" height="${num(size.height)}" preserveAspectRatio="none"/></g>`;
      ctx.counts.pictures++;
    } else if (!page.isCanvas) {
      background = `<g id="Page_background" data-name="Page background"><rect width="${num(size.width)}" height="${num(size.height)}" fill="#ffffff"/></g>`;
    }
    const parts = await layerParts(items, filter, ctx);
    const name = `Page ${groups.length + 1}`;
    groups.push(`<g id="${name.replace(" ", "_")}" data-name="${name}" transform="translate(${num(offset)} 0)">${background}\n${parts.join("\n")}</g>`);
    offset += size.width + GAP;
    maxH = Math.max(maxH, size.height);
  }
  const totalW = offset - GAP;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(totalW / MAIN_SCALE)}pt" height="${num(maxH / MAIN_SCALE)}pt" viewBox="0 0 ${num(totalW)} ${num(maxH)}">\n`
    + (ctx.defs.length ? `<defs>${ctx.defs.join("")}</defs>\n` : "")
    + groups.join("\n") + "\n</svg>\n";
  return result(svg, ctx);
}
