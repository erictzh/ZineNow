// Holds a clipped image in the live editor: what's inside shows only where the layer below (the base) has pixels.

import { translatedAnnotation } from "../../model/annotations.js";
import { annotationBounds } from "../../render/itemGeometry.js";
import { clipMaskCanvas } from "../../render/clipMask.js";

const { useState, useEffect, useRef } = React;

const MASK_MAX_SCALE = 2;          // mask px per page px at most (a page is 1.1 px per pt: this is ~2x sharper than the screen at 100%)
const MASK_MAX_PIXELS = 16000000;  // keeps a huge base's mask from growing without limit
const EDGE_PAD = 3;                // page px of room round the base's bounds, for its anti-aliased edge

// The area of the page's coordinate space the mask covers: the base's own bounds. They can reach past the page
// onto the outer canvas, and a clipped layer out there has to be clipped too. Outside these bounds the base has no
// pixels, so nothing of the clipped layer would show there anyway.
function maskRegion(base) {
  const b = annotationBounds(base);
  const x = Math.floor(b.x - EDGE_PAD), y = Math.floor(b.y - EDGE_PAD);
  return { x, y, width: Math.max(1, Math.ceil(b.x + b.width + EDGE_PAD) - x), height: Math.max(1, Math.ceil(b.y + b.height + EDGE_PAD) - y) };
}

// A change that alters the base's shape. The pictures (a photo, a text photo-fill) are summed up by their
// length and ending rather than compared whole.
function shapeSignature(base) {
  const summary = { ...base };
  for (const key of ["src", "fillSrc"]) {
    if (typeof summary[key] === "string") summary[key] = summary[key].length + ":" + summary[key].slice(-48);
  }
  return JSON.stringify(summary);
}

// `base` is the layer being clipped to (as drawn: text laid out), `pageSize` the page in editor px,
// `blend` the clipped image's own blend mode (a mask isolates what's inside it, so the mix with the page
// has to be done out here). The mask is a picture of the base's shape covering the base's own area (which may
// reach past the page), so moving or resizing the clipped image never redraws it; only a change to the base
// does, and the old mask stays until the new one is ready.
export function ClipWrap({ base, pageSize, pageFilter, blend, children }) {
  const [maskUrl, setMaskUrl] = useState(null);
  const urlRef = useRef(null); // the mask picture now in use, so it can be let go of
  const signature = shapeSignature(base);
  const region = maskRegion(base);
  const regionRef = useRef(region);
  regionRef.current = region;

  useEffect(() => {
    let cancelled = false;
    // Annotation coordinates are in MAIN_SCALE page px; the mask is drawn at up to MASK_MAX_SCALE of them, with the
    // base moved so its area's corner is the picture's corner.
    const area = regionRef.current;
    const scale = Math.min(MASK_MAX_SCALE, Math.sqrt(MASK_MAX_PIXELS / Math.max(1, area.width * area.height)));
    clipMaskCanvas(translatedAnnotation(base, -area.x, -area.y), area.width * scale, area.height * scale, scale, pageFilter).then((canvas) => {
      if (cancelled) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        if (cancelled) { URL.revokeObjectURL(url); return; }
        const old = urlRef.current;
        urlRef.current = url;
        setMaskUrl(url);
        if (old) setTimeout(() => URL.revokeObjectURL(old), 1000); // after the new one has been painted
      }, "image/png");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [signature]);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const mask = maskUrl ? `url(${maskUrl})` : undefined;
  return (
    <div
      className="ze-clip-wrap"
      style={{
        left: region.x, top: region.y, width: region.width, height: region.height,
        WebkitMaskImage: mask, maskImage: mask,
        mixBlendMode: blend && blend !== "normal" ? blend : undefined,
        visibility: maskUrl ? undefined : "hidden", // until the mask is ready, so the image never flashes unclipped
      }}
    >
      {/* The page's own coordinate space: the clipped layer keeps its place whatever the mask's area. */}
      <div style={{ position: "absolute", left: -region.x, top: -region.y, width: pageSize.width, height: pageSize.height }}>
        {children}
      </div>
    </div>
  );
}
