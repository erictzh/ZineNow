// Keeps a two-finger pan from zooming by accident. While two fingers scroll, the gap between them
// drifts a little, and treated as a pinch that drift made the zoom wobble ("shaky" panning). So a
// pinch only starts zooming once the gap has grown or shrunk by PINCH_THRESHOLD; until then it's a
// plain two-finger scroll. Once it zooms it keeps zooming until the fingers lift, measured from
// the gap at that moment, so the zoom picks up smoothly rather than jumping by the threshold.
// Used by all three apps' pinch handling.

export const PINCH_THRESHOLD = 0.15; // 15% change in the gap between the fingers

/**
 * Make one per pinch (when the second finger lands).
 * @returns {(rawScale: number) => number} Takes the fingers' gap now divided by the gap when the
 *   pinch began; returns the scale to zoom by (relative to the zoom when the pinch began). That is
 *   exactly 1 until the threshold is passed, so callers can check `=== 1` to just scroll.
 */
export function createPinchGate(threshold = PINCH_THRESHOLD) {
  let base = null; // the raw scale when zooming started
  return function gate(rawScale) {
    if (base === null) {
      if (!(rawScale > 0) || Math.abs(Math.log(rawScale)) < Math.log(1 + threshold)) return 1;
      base = rawScale;
    }
    return rawScale / base;
  };
}
