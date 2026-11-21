// The name a layer shows in the Layers panel (and where else a layer is named).

import { isEllipse } from "./outlines.js";

export function layerName(ann) {
  if (ann.name) return ann.name;
  if (ann.type === "text") return ann.text.trim().split("\n")[0] || "Text";
  if (ann.type === "stroke") return ann.tool === "highlighter" ? "Highlight" : "Drawing";
  if (ann.type === "trace") return "Image Trace";
  if (ann.type === "rect") return isEllipse(ann) ? "Ellipse" : "Rectangle";
  return "Image";
}
