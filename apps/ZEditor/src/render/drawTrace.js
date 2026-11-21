// Draws an Image Trace layer (its traced shapes) on a canvas, for Export, thumbnails and baking.

import { traceDrawList } from "../model/trace/traceLayer.js";
import { drawBoxWithEffects } from "./boxEffects.js";

// Always the tracing result: the editor's View setting (outlines, source) is for the screen only.
export function drawTraceOnCanvas(ctx, ann, scaleFactor) {
  drawBoxWithEffects(ctx, ann, scaleFactor, (target) => {
    if (!ann.traceW || !ann.traceH) return;
    target.save();
    target.scale(ann.width / ann.traceW, ann.height / ann.traceH);
    target.lineJoin = "round";
    target.lineCap = "round";
    for (const item of traceDrawList(ann)) {
      const path = new Path2D(item.d);
      if (item.fill) { target.fillStyle = item.fill; target.fill(path); }
      if (item.stroke) { target.strokeStyle = item.stroke; target.lineWidth = item.strokeWidth; target.stroke(path); }
    }
    target.restore();
  });
}
