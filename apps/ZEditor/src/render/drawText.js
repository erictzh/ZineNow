// Draws a text box: fill, stroke, shadow, gradient, photo fill, ransom, curve, decorations, distress.

import { rgbaCss } from "../model/color.js";
import { strokeIsGradient, strokeStops } from "../model/effectStacks.js";
import { noiseStream, seededNoise } from "../model/noise.js";
import { colorAtIndex, colorSegments } from "../model/text/colorRuns.js";
import { RANSOM_PAPER_COLORS } from "../model/text/textControls.js";
import { photoPlacement, textGradientView } from "../model/text/textLook.js";
import { rotateAboutCenter } from "./boxEffects.js";
import { loadImageElement } from "./drawImage.js";
import { makeLinearGradient, rectGradientStops } from "./gradients.js";
import { columnRules, layoutPlainRuns } from "./textRuns.js";
import { layoutText } from "./textLayout.js";

// An underline or strike-through line at height `y`. "double" and "wavy"
// follow CSS's text-decoration-style closely enough to read the same.
function drawTextDecorationLine(ctx, style, x0, x1, y, fontSize, color) {
  const thickness = Math.max(1, fontSize * 0.06);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  if (style === "double") {
    // The second line sits below the position a single line would take.
    ctx.moveTo(x0, y); ctx.lineTo(x1, y);
    ctx.moveTo(x0, y + thickness * 1.8); ctx.lineTo(x1, y + thickness * 1.8);
  } else if (style === "wavy") {
    const amplitude = Math.max(1, fontSize * 0.07), wavelength = Math.max(4, fontSize * 0.4);
    const centre = y + fontSize * 0.09; // browsers draw the wave a little below a straight line
    for (let x = x0; x <= x1; x += 1) {
      const wave = centre + amplitude * Math.sin((x - x0) / wavelength * Math.PI * 2);
      if (x === x0) ctx.moveTo(x, wave); else ctx.lineTo(x, wave);
    }
  } else {
    ctx.moveTo(x0, y); ctx.lineTo(x1, y);
  }
  ctx.stroke();
  ctx.restore();
}

export async function drawTextOnCanvas(ctx, ann, scaleFactor) {
  const photoImg = ann.fillSrc ? await loadImageElement(ann.fillSrc) : null;
  ctx.save();
  const layout = layoutText(ctx, ann, scaleFactor);
  const { look, fontSize, lineHeight, baselineOffset, x, y, padX, padY, boxWidth, innerWidth, lines, lineStarts, textHeight, boxHeight, measure, ascent, descent, curve } = layout;

  rotateAboutCenter(ctx, ann, x + boxWidth / 2, y + boxHeight / 2);

  if (look.label) {
    ctx.fillStyle = rgbaCss(look.label.labelColor, look.label.labelAlpha);
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, look.label.labelRadius * scaleFactor);
    ctx.fill();
  }
  // Column rules: a line down the middle of each gap between columns.
  for (const rule of columnRules(layout, ann)) {
    ctx.fillStyle = rule.color;
    ctx.fillRect(rule.x - rule.width / 2, rule.y0, rule.width, rule.y1 - rule.y0);
  }

  const fill = look.gradient
    ? makeLinearGradient(ctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight)
    : rgbaCss(look.color, look.fillAlpha);
  const decoStyle = look.strike === "double" || look.strike === "wavy" ? look.strike : "solid";

  const setFont = (c) => {
    c.font = ctx.font;
    c.textBaseline = "alphabetic";
    if ("letterSpacing" in c) c.letterSpacing = ctx.letterSpacing;
    if ("fontKerning" in c) c.fontKerning = ctx.fontKerning;
  };

  // Everything to draw as text, as "runs": a whole line normally, or a
  // single letter for ransom lettering (with its own tilt/shift/size and
  // maybe a paper tile). Positions are worked out once and shared by
  // every pass below (tiles, stroke, fill, the fill layer).
  let runs = [];
  let lineExtents = [];
  let letterIndex = 0;
  if (!look.ransom && !curve) {
    ({ runs, lineExtents } = layoutPlainRuns(layout, ann));
  } else {
    // Ransom and curve place every letter on its own.
    lines.forEach((line, i) => {
      const lineWidth = measure(line);
      let lineX = x + padX;
      if (ann.align === "center" || look.stacked) lineX = x + (boxWidth - lineWidth) / 2;
      else if (ann.align === "right") lineX = x + boxWidth - padX - lineWidth;
      // A smile's ends rise, so its lines start lower to keep the arc inside the box.
      const lineTop = y + padY + (curve && curve.sign < 0 ? curve.sag : 0) + i * lineHeight;
      const baselineY = lineTop + baselineOffset;
      const lineStart = lineStarts[i];
      lineExtents.push({ line, lineX, lineWidth, baselineY, segments: [{ x0: lineX, x1: lineX + lineWidth, color: null }] });
      let cursor = lineX;
      let charIndex = 0;
      for (const ch of Array.from(line)) {
        const advance = ctx.measureText(ch).width;
        const k = letterIndex++;
        const run = { text: ch, x: cursor, baselineY, color: colorAtIndex(ann.colorRuns, lineStart + charIndex) };
        charIndex += ch.length;
        if (ch !== " ") {
          run.cx = cursor + advance / 2;
          run.cy = lineTop + lineHeight / 2;
          run.advance = advance;
          run.tilt = 0; run.dx = 0; run.dy = 0; run.scale = 1;
          if (look.ransom) {
            const seed = look.ransom.ransomVariation;
            run.tilt = (seededNoise(k * 4, seed) - 0.5) * 2 * look.ransom.ransomTilt * Math.PI / 180;
            run.dy = (seededNoise(k * 4 + 1, seed) - 0.5) * 2 * fontSize * look.ransom.ransomShift / 100;
            run.scale = 1 + (seededNoise(k * 4 + 2, seed) - 0.5) * 2 * look.ransom.ransomSize / 100;
            if (look.ransom.ransomTiles === "paper") {
              run.tile = RANSOM_PAPER_COLORS[Math.floor(seededNoise(k * 4 + 3, seed) * RANSOM_PAPER_COLORS.length)];
            }
          }
          if (curve) {
            // The letter's middle sits on the arc, turned to follow it.
            const phi = (run.cx - (lineX + lineWidth / 2)) / curve.radius;
            run.tilt += curve.sign * phi;
            run.dx += curve.radius * Math.sin(phi) - phi * curve.radius;
            run.dy += curve.sign * curve.radius * (1 - Math.cos(phi));
          }
        }
        runs.push(run);
        cursor += advance;
      }
    });
  }
  // Draws one run under its own turn about its centre, like a CSS
  // `translateY() rotate() scale()` on an inline-block letter.
  const withRun = (c, run, draw) => {
    c.save();
    if (run.font) c.font = run.font; // a custom span's own font, bold or italic
    if (run.tilt !== undefined) {
      c.translate(run.cx + run.dx, run.cy + run.dy);
      c.rotate(run.tilt);
      c.scale(run.scale, run.scale);
      c.translate(-run.cx, -run.cy);
    }
    draw(run);
    c.restore();
  };

  // A photo, or a gradient on jittered letters (whose own turns would
  // turn a gradient with them), fills through a scratch layer: the
  // letters drawn solid, then the fill painted into them only.
  const fillsThroughLayer = Boolean(photoImg || (look.gradient && (look.ransom || curve)));
  const tilePad = fontSize * 0.06;

  // One stroke layer round every run: an outside or inside stroke is drawn twice as wide (the other half is hidden by the fill or cut away).
  const strokeRuns = (c, layer) => runs.forEach((run) => withRun(c, run, () => {
    // A gradient stroke runs over the text area, like a gradient fill does.
    c.strokeStyle = strokeIsGradient(layer) ? makeLinearGradient(c, layer.angle, strokeStops(layer), x + padX, y + padY, innerWidth, textHeight) : layer.color;
    c.lineWidth = (layer.position === "center" ? layer.thickness : layer.thickness * 2) * scaleFactor;
    c.lineJoin = "round"; // stacked strokes round the corners, so thick outlines do not grow sharp spikes
    c.strokeText(run.text, run.x, run.baselineY);
  }));

  const paintText = (c) => {
    setFont(c);
    runs.forEach((run) => {
      if (!run.tile) return;
      withRun(c, run, () => {
        c.fillStyle = run.tile;
        c.fillRect(run.x - tilePad, run.baselineY - ascent - tilePad, run.advance + tilePad * 2, ascent + descent + tilePad * 2);
      });
    });
    // Stacked strokes (look.stack): the outside ones go under the fill, the last of the list first so the first ends up on top.
    if (look.stack) look.strokes.slice().reverse().forEach((layer) => { if (layer.position === "outside") strokeRuns(c, layer); });
    // Stroke goes under the fill, like the live box's paint-order, so only
    // the outer half of the line shows.
    if (look.stroke && !look.stack) {
      runs.forEach((run) => withRun(c, run, () => {
        c.strokeStyle = look.stroke.strokeColor;
        c.lineWidth = look.stroke.strokeThickness * scaleFactor;
        c.lineJoin = "miter"; // browsers join text strokes with sharp corners
        c.miterLimit = 4;
        c.strokeText(run.text, run.x, run.baselineY);
      }));
    }
    // Letters given their own colour are painted solid in it, over any
    // gradient or photo the rest of the text has.
    const paintOwnColors = () => runs.forEach((run) => {
      if (!run.color) return;
      withRun(c, run, () => {
        c.fillStyle = rgbaCss(run.color, look.fillAlpha);
        c.fillText(run.text, run.x, run.baselineY);
      });
    });
    if (!fillsThroughLayer) {
      runs.forEach((run) => withRun(c, run, () => {
        c.fillStyle = run.color ? rgbaCss(run.color, look.fillAlpha) : fill;
        c.fillText(run.text, run.x, run.baselineY);
      }));
    } else {
      const letters = document.createElement("canvas");
      letters.width = c.canvas.width;
      letters.height = c.canvas.height;
      const lctx = letters.getContext("2d");
      lctx.setTransform(c.getTransform());
      setFont(lctx);
      lctx.fillStyle = "#000";
      runs.forEach((run) => { if (!run.color) withRun(lctx, run, () => lctx.fillText(run.text, run.x, run.baselineY)); });
      lctx.globalCompositeOperation = "source-in";
      if (photoImg) {
        const place = photoPlacement(look.photo, innerWidth / scaleFactor, textHeight / scaleFactor);
        lctx.globalAlpha = look.photo.fillPhotoAlpha / 100;
        lctx.drawImage(photoImg, x + padX + place.left * scaleFactor, y + padY + place.top * scaleFactor, place.width * scaleFactor, place.height * scaleFactor);
        // A faded photo shows the text colour underneath it, not the page.
        if (look.photo.fillPhotoAlpha < 100) {
          lctx.globalAlpha = 1;
          lctx.globalCompositeOperation = "destination-over";
          lctx.fillStyle = look.gradient
            ? makeLinearGradient(lctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight)
            : rgbaCss(look.color, look.fillAlpha);
          runs.forEach((run) => { if (!run.color) withRun(lctx, run, () => lctx.fillText(run.text, run.x, run.baselineY)); });
        }
      } else {
        // Painted well past the box so letters that jitter outside it still fill.
        lctx.fillStyle = makeLinearGradient(lctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight);
        lctx.fillRect(x - fontSize * 2, y - fontSize * 2, boxWidth + fontSize * 4, boxHeight + fontSize * 4);
      }
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(letters, 0, 0);
      c.restore();
      paintOwnColors();
    }
    // Stacked strokes over the letters: a centred one straddles the edge, an inside one is drawn twice as wide and cut to the letters.
    if (look.stack) {
      look.strokes.slice().reverse().forEach((layer) => {
        if (layer.position === "center") strokeRuns(c, layer);
        else if (layer.position === "inside") {
          const scratch = document.createElement("canvas");
          scratch.width = c.canvas.width;
          scratch.height = c.canvas.height;
          const sctx = scratch.getContext("2d");
          sctx.setTransform(c.getTransform());
          setFont(sctx);
          strokeRuns(sctx, layer);
          sctx.globalCompositeOperation = "destination-in";
          sctx.fillStyle = "#000";
          runs.forEach((run) => withRun(sctx, run, () => sctx.fillText(run.text, run.x, run.baselineY)));
          c.save();
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.drawImage(scratch, 0, 0);
          c.restore();
        }
      });
    }
    // Underline and strike-through take the colour of the letters they cross.
    lineExtents.forEach(({ line, baselineY, segments }) => {
      if (!line || curve) return; // straight lines would cut across an arc
      segments.forEach(({ x0, x1, color, underline, strike }) => {
        const decoColor = color || look.color;
        // A custom span may turn underline / strike-through on or off for its own letters.
        const underlined = underline != null ? underline : ann.underline;
        const struck = strike != null ? strike : look.strike !== "none";
        if (underlined) drawTextDecorationLine(c, decoStyle, x0, x1, baselineY + fontSize * 0.12, fontSize, decoColor);
        if (struck) drawTextDecorationLine(c, decoStyle, x0, x1, baselineY - fontSize * 0.3, fontSize, decoColor);
      });
    });
  };

  if (look.shadow || look.distress) {
    // The shadow is cast by the finished text (stroke and fill together),
    // and distress marks are erased from it, so the text is drawn on its
    // own layer first. The layer is drawn back at the page's own
    // orientation: canvas shadow offsets aren't rotated with the text, so
    // the light stays fixed on the page.
    const layer = document.createElement("canvas");
    layer.width = ctx.canvas.width;
    layer.height = ctx.canvas.height;
    const layerCtx = layer.getContext("2d");
    layerCtx.setTransform(ctx.getTransform());
    paintText(layerCtx);
    if (look.distress) {
      layerCtx.save();
      layerCtx.globalCompositeOperation = "destination-out";
      drawDistressMarks(layerCtx, x, y, boxWidth, boxHeight, fontSize, look.distress);
      layerCtx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Several shadows: each is cast alone (the finished text is drawn far off the page with the shadow offset cancelling the distance), the
    // bottom one first, then the text over them all.
    const manyShadows = look.stack && look.shadows.length > 1;
    if (manyShadows) {
      const far = ctx.canvas.width + ctx.canvas.height + 4000;
      for (let i = look.shadows.length - 1; i >= 0; i--) {
        const sh = look.shadows[i];
        ctx.save();
        ctx.shadowColor = sh.color;
        ctx.shadowOffsetX = sh.x * scaleFactor + far;
        ctx.shadowOffsetY = sh.y * scaleFactor;
        ctx.shadowBlur = sh.blur * scaleFactor;
        ctx.drawImage(layer, -far, 0);
        ctx.restore();
      }
    } else if (look.shadow) {
      ctx.shadowColor = look.shadow.color; // the layer's own opacity already fades it, as in the live box
      ctx.shadowOffsetX = look.shadow.x * scaleFactor;
      ctx.shadowOffsetY = look.shadow.y * scaleFactor;
      ctx.shadowBlur = look.shadow.blur * scaleFactor;
    }
    ctx.drawImage(layer, 0, 0);
  } else {
    paintText(ctx);
  }
  ctx.restore();
}

// Nicks, specks and scratches to knock out of a text box (drawn with
// destination-out). Sizes follow the font size and counts follow the box
// area, so the wear looks the same on any size of text, and each stream is
// seeded so the editor and export wear identically.
function drawDistressMarks(ctx, x, y, w, h, fontSize, settings) {
  const { distressGrit, distressDust, distressScratches, distressVariation } = settings;
  const area = (w * h) / (fontSize * fontSize);
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineCap = "round";
  const marks = (stream, count, alpha, paint, addMark) => {
    const noise = noiseStream(distressVariation, stream);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < Math.round(count); i++) addMark(noise);
    paint();
  };
  marks(11, distressGrit * 0.9 * area, 0.95, () => ctx.fill(), (noise) => {
    const size = fontSize * (0.015 + noise() * 0.05);
    ctx.rect(x + noise() * w, y + noise() * h, size, size * (0.5 + noise()));
  });
  marks(12, distressDust * 0.35 * area, 0.8, () => ctx.fill(), (noise) => {
    const radius = fontSize * (0.01 + noise() ** 2 * 0.06);
    const cx = x + noise() * w, cy = y + noise() * h;
    ctx.moveTo(cx + radius, cy);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  });
  ctx.lineWidth = Math.max(0.5, fontSize * 0.022);
  marks(13, distressScratches * 0.12 * area, 0.9, () => ctx.stroke(), (noise) => {
    const startX = x + noise() * w, startY = y + noise() * h;
    const heading = (noise() - 0.5) * Math.PI;
    const length = fontSize * (0.3 + noise() * 0.9);
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(heading) * length, startY + Math.sin(heading) * length);
  });
  ctx.restore();
}
