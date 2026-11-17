// Seeded, repeatable randomness for torn edges, texture, ransom and distress.

// ---- Edge outlines — each edge shape is one SVG path string in the
// image's own 0..width/0..height space, used as-is by the live CSS
// clip-path, the live stroke, and the export canvas's Path2D. Jagged
// shapes use a deterministic sine-based hash instead of Math.random(),
// so no seed needs storing on the annotation. Variation shifts where
// the hash starts reading, giving a different shape at the same settings.
export function seededNoise(i, variation, j = 0) {
  const v = Math.sin((i + variation * 97) * 12.9898 + j * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// A repeatable sequence of noise values; each `stream` is independent.
export function noiseStream(variation, stream = 0) {
  let n = 0;
  return () => seededNoise(stream * 100000 + n++, variation);
}
