// Image Trace: a picture's pixels → filled shapes (one SVG path per colour), like Illustrator's Image Trace.
//
// 1. quantize.js reduces the picture to a few colours (black & white, greys or colours).
// 2. contours.js follows the pixel edges of each colour's area into closed loops.
// 3. curves.js smooths each loop and writes it as SVG path data.
// Pure: no canvas, so it runs in the tests (and could move to a worker).

import { traceMaskLoops, loopArea } from "./contours.js";
import { edgeMidpoints, simplifyClosed, smoothPathD } from "./curves.js";
import { quantizePixels } from "./quantize.js";
import { normalizeTraceSettings, tracerParams } from "./traceSettings.js";

const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

// `pixels` is { width, height, data } (RGBA, like ImageData). Returns
//   { width, height, paths: [{ color: "#rrggbb", d }] }
// with paths in drawing order (bottom first), in the picture's own pixel coordinates.
export function traceImage(pixels, settings) {
  const s = normalizeTraceSettings(settings);
  const { width, height } = pixels;
  const { tolerance, cornerAngle, minArea } = tracerParams(s, Math.max(width, height));
  const { labels, palette } = quantizePixels(pixels, s);
  const mask = new Uint8Array(width * height);
  const paths = [];
  // The most used colour goes at the bottom. "overlap": each colour's shape also covers the area
  // of every colour drawn above it, so no seams show where smoothed edges meet.
  for (let rank = 0; rank < palette.length; rank++) {
    for (let i = 0; i < mask.length; i++) mask[i] = s.method === "abut" ? labels[i] === rank : labels[i] >= rank;
    let d = "";
    for (const loop of traceMaskLoops(mask, width, height)) {
      if (Math.abs(loopArea(loop)) < Math.max(1, minArea)) continue;
      d += smoothPathD(simplifyClosed(edgeMidpoints(loop), tolerance), cornerAngle, tolerance);
    }
    if (d) paths.push({ color: hex(palette[rank]), d });
  }
  return { width, height, paths };
}
