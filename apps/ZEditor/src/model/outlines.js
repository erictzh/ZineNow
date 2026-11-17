// Basic outlines as SVG path strings (polygon, rectangle, ellipse), used by live clip and export alike.

export function pointsToOutline(points) {
  return "M" + points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z";
}

export function rectOutline({ width, height }) {
  return `M0 0H${width}V${height}H0Z`;
}

// An ellipse is a rectangle annotation with `shape: "ellipse"`: it takes
// everything a rectangle does, and its outline is simply the ellipse, so
// the clip, stroke, shadow and texture all follow it with no special
// cases. The rectangle-only edge shapes (Rounded, Torn Edge, Scissor
// Cut) don't apply to it.
export const isEllipse = (ann) => ann.shape === "ellipse";
export function ellipseOutline({ width, height }) {
  const rx = width / 2, ry = height / 2;
  return `M0 ${ry}A${rx} ${ry} 0 1 1 ${width} ${ry}A${rx} ${ry} 0 1 1 0 ${ry}Z`;
}
