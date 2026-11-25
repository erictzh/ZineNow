// The outline of text as SVG path data, from a fontkit font. Pure (the font is passed in).

const n2 = (v) => String(Math.round(v * 100) / 100);

// The SVG path data of `text` set in `font` at `fontSize` px, its baseline starting at (x, baselineY); `spacing` is the extra
// space after each letter in px. Null when the font lacks a letter of the text.
export function textPathData(font, text, x, baselineY, fontSize, spacing = 0) {
  for (const ch of Array.from(text)) if (ch.trim() && !font.hasGlyphForCodePoint(ch.codePointAt(0))) return null;
  const scale = fontSize / font.unitsPerEm;
  const run = font.layout(text);
  let pen = x, d = "";
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const ox = pen + (pos.xOffset || 0) * scale, oy = baselineY - (pos.yOffset || 0) * scale;
    for (const c of glyph.path.commands) {
      const a = c.args;
      if (c.command === "moveTo") d += `M${n2(ox + a[0] * scale)} ${n2(oy - a[1] * scale)}`;
      else if (c.command === "lineTo") d += `L${n2(ox + a[0] * scale)} ${n2(oy - a[1] * scale)}`;
      else if (c.command === "quadraticCurveTo") d += `Q${n2(ox + a[0] * scale)} ${n2(oy - a[1] * scale)} ${n2(ox + a[2] * scale)} ${n2(oy - a[3] * scale)}`;
      else if (c.command === "bezierCurveTo") d += `C${n2(ox + a[0] * scale)} ${n2(oy - a[1] * scale)} ${n2(ox + a[2] * scale)} ${n2(oy - a[3] * scale)} ${n2(ox + a[4] * scale)} ${n2(oy - a[5] * scale)}`;
      else if (c.command === "closePath") d += "Z";
    }
    pen += (pos.xAdvance || 0) * scale + spacing;
  });
  return d;
}
