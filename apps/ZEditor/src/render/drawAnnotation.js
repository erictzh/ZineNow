// Draws any item by picking the right drawer for its type (image, shape, vectorized image, text or stroke).

import { blendOf, opacityOf } from "../model/controls.js";
import { drawWithOpacity } from "./boxEffects.js";
import { drawImageOnCanvas } from "./drawImage.js";
import { drawRectOnCanvas, drawStrokeOnCanvas } from "./drawShapes.js";
import { drawTextOnCanvas } from "./drawText.js";
import { drawTraceOnCanvas } from "./drawTrace.js";

export async function drawAnnotationOnCanvas(ctx, ann, scaleFactor, pageFilter) {
  if (ann.type === "stroke") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawStrokeOnCanvas(target, ann, scaleFactor), blendOf(ann));
  else if (ann.type === "text") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawTextOnCanvas(target, ann, scaleFactor), blendOf(ann));
  else if (ann.type === "rect") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawRectOnCanvas(target, ann, scaleFactor), blendOf(ann));
  else if (ann.type === "trace") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawTraceOnCanvas(target, ann, scaleFactor), blendOf(ann));
  else await drawWithOpacity(ctx, opacityOf(ann), (target) => drawImageOnCanvas(target, ann, scaleFactor, pageFilter), blendOf(ann));
}
