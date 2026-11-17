// Halftone screens: dots/lines/dither, monochrome or CMYK.

import { controlValues } from "../../model/controls.js";
import { HALFTONE_FILTER_CONTROLS } from "../../model/pageFilters.js";
import { lumaOverWhite } from "./luma.js";

const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Screen-print halftone: samples average luminance per grid cell from
// the source pixels, then redraws that cell as a single mark on a white
// background — replaces the continuous-tone image entirely, same as a
// real plate. The grid can be rotated, and the mark is either a shape
// morphing from a dot into a stretch of line (its size tracks darkness)
// or, for dither, a solid square chosen by an ordered Bayer pattern.
//
// "Full color (CMYK)" runs the same screen four times — cyan, magenta,
// yellow and black plates at the classic offset angles (15°/75°/0°/45°
// on top of the chosen angle) — multiplied together like overprinted
// ink, so the colour comes back out of the separations.
const CMYK_PLATES = [
  { ink: "#00ffff", angleOffset: 15, channel: 0 },
  { ink: "#ff00ff", angleOffset: 75, channel: 1 },
  { ink: "#ffff00", angleOffset: 0, channel: 2 },
  { ink: "#000000", angleOffset: 45, channel: 3 },
];

// Ink coverage (0-1) of one CMYK channel for an RGB colour (0-1 each).
function cmykCoverage(r, g, b, channel) {
  const k = 1 - Math.max(r, g, b);
  if (channel === 3) return k;
  if (k >= 1) return 0;
  return (1 - [r, g, b][channel] - k) / (1 - k);
}

export function drawHalftoneScreen(ctx, sourceImageData, width, height, cellSize, filter) {
  const { colorMode, angle, color } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  if (colorMode !== "cmyk") {
    drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, angle, color, -1);
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (const plate of CMYK_PLATES) {
    drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, (angle + plate.angleOffset) % 180, plate.ink, plate.channel);
  }
  ctx.restore();
}

// One screen of marks in a single ink. `channel` -1 sizes marks by
// darkness (monochrome); 0-3 by that CMYK channel's coverage.
function drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, angle, color, channel) {
  const data = sourceImageData.data;
  const { screen, lineBlend } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
  const isDither = screen === "dither";
  const toLine = lineBlend / 100;
  const maxRadius = cellSize * 0.62;
  const rotated = angle !== 0;
  const radians = angle * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);

  // The grid lives in rotated (u, v) space; find what covers the canvas.
  const corners = [[0, 0], [width, 0], [0, height], [width, height]];
  const us = corners.map(([x, y]) => x * cos + y * sin);
  const vs = corners.map(([x, y]) => y * cos - x * sin);
  const maxU = Math.max(...us), maxV = Math.max(...vs);

  ctx.save();
  ctx.fillStyle = color;
  ctx.rotate(radians);
  ctx.beginPath();
  // Lines and dither squares are filled together so neighbours join
  // without seams, in batches so a very fine screen doesn't build one
  // enormous path. Pure dots are filled one by one: where they overlap,
  // that's what gives a dot screen its tone (batching lightens it).
  const isPureDots = !isDither && toLine === 0;
  const batchSize = isPureDots ? 1 : 4096;
  let batched = 0;
  const markAdded = () => {
    if (++batched < batchSize) return;
    ctx.fill();
    ctx.beginPath();
    batched = 0;
  };

  for (let gridV = Math.floor(Math.min(...vs) / cellSize); gridV * cellSize < maxV; gridV++) {
    for (let gridU = Math.floor(Math.min(...us) / cellSize); gridU * cellSize < maxU; gridU++) {
      const centerU = (gridU + 0.5) * cellSize;
      const centerV = (gridV + 0.5) * cellSize;
      const cx = centerU * cos - centerV * sin - cellSize / 2;
      const cy = centerU * sin + centerV * cos - cellSize / 2;
      // cellSize is fractional at export scale (editor px × scaleFactor),
      // so the grid steps in fractional units but pixel sampling has to
      // use whole-pixel bounds — a fractional index into `data` is
      // undefined, which would turn the average into NaN.
      const x0 = Math.max(0, Math.floor(cx));
      const y0 = Math.max(0, Math.floor(cy));
      const x1 = Math.min(width, Math.max(x0 + 1, Math.floor(cx + cellSize)));
      const y1 = Math.min(height, Math.max(y0 + 1, Math.floor(cy + cellSize)));
      let sum = 0, sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let y = y0; y < y1; y++) {
        const rowStart = y * width * 4;
        for (let x = x0; x < x1; x++) {
          const idx = rowStart + x * 4;
          if (channel < 0) {
            sum += lumaOverWhite(data, idx);
          } else {
            // Colour over white paper, same reasoning as lumaOverWhite.
            const alpha = data[idx + 3] / 255;
            const paper = 255 * (1 - alpha);
            sumR += data[idx] * alpha + paper;
            sumG += data[idx + 1] * alpha + paper;
            sumB += data[idx + 2] * alpha + paper;
          }
          count++;
        }
      }
      if (!count) continue;
      // avgLum is "lightness" for this plate: 1 - ink coverage.
      const avgLum = channel < 0
        ? sum / count / 255
        : 1 - cmykCoverage(sumR / count / 255, sumG / count / 255, sumB / count / 255, channel);

      if (isDither) {
        if (avgLum < (BAYER_8X8[gridV & 7][gridU & 7] + 0.5) / 64) {
          ctx.rect(centerU - cellSize / 2, centerV - cellSize / 2, cellSize, cellSize);
          markAdded();
        }
        continue;
      }

      const radius = (1 - avgLum) * maxRadius;
      const halfLength = radius + (cellSize / 2 + 0.25 - radius) * toLine;
      const halfHeight = radius + ((1 - avgLum) * cellSize / 2 - radius) * toLine;
      if (halfHeight > 0.4) {
        // Cells cut off by the canvas edge center on their visible part.
        const u = rotated ? centerU : cx + Math.min(cellSize, width - cx) / 2;
        const v = rotated ? centerV : cy + Math.min(cellSize, height - cy) / 2;
        if (isPureDots) ctx.arc(u, v, radius, 0, Math.PI * 2);
        else ctx.roundRect(u - halfLength, v - halfHeight, halfLength * 2, halfHeight * 2, Math.min(halfLength, halfHeight) * (1 - toLine));
        markAdded();
      }
    }
  }
  ctx.fill();
  ctx.restore();
}
