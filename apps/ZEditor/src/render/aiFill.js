// Remove & fill, style "AI (on-device)": the model fills the marked area. The picture maths and the model run are shared with
// Ai Tools (Local): shared/js/ai/fillMask.js (and fill.js, session.js, variations.js); the model itself is an opt-in download
// (shared/js/ai/manager.js, the AI model box in the Marquee panel).

import { aiFillMask } from "../../../../shared/js/ai/fillMask.js";
import { paintArea } from "./regionArea.js";

export { AI_VARIATIONS, variationFor, varyCrop } from "../../../../shared/js/ai/variations.js";

// Fills `area` (render/regionArea.js, canvas px, grown by `grow` px) on `ctx`'s canvas. `variation`: 0 = normal, N = the Nth "Try another".
// Returns false when nothing was marked.
export function aiFillCanvas(ctx, area, grow, onStatus, variation = 0) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const buildMask = (extraGrow) => {
    const m = document.createElement("canvas"); m.width = w; m.height = h;
    const mx = m.getContext("2d", { willReadFrequently: true });
    paintArea(mx, area, { grow: grow + extraGrow });
    const alpha = mx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = alpha[i * 4 + 3] > 0 ? 1 : 0;
    return mask;
  };
  return aiFillMask(ctx, buildMask, variation, onStatus);
}
