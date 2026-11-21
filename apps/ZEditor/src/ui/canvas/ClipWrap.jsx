// Holds a clipped image in the live editor: what's inside shows only where the layer below (the base) has pixels.

import { clipMaskCanvas } from "../../render/clipMask.js";

const { useState, useEffect, useRef } = React;

const MASK_MAX_SCALE = 2;          // mask px per page px at most (a page is 1.1 px per pt: this is ~2x sharper than the screen at 100%)
const MASK_MAX_PIXELS = 16000000;  // keeps a huge page's mask from growing without limit

// A change that alters the base's shape. The pictures (a photo, a text photo-fill) are summed up by their
// length and ending rather than compared whole.
function shapeSignature(base, pageSize) {
  const summary = { ...base };
  for (const key of ["src", "fillSrc"]) {
    if (typeof summary[key] === "string") summary[key] = summary[key].length + ":" + summary[key].slice(-48);
  }
  return JSON.stringify(summary) + "@" + pageSize.width + "x" + pageSize.height;
}

// `base` is the layer being clipped to (as drawn: text laid out), `pageSize` the page in editor px,
// `blend` the clipped image's own blend mode (a mask isolates what's inside it, so the mix with the page
// has to be done out here). The mask is a picture of the base's shape covering the whole page, so moving
// or resizing the clipped image never redraws it; only a change to the base does, and the old mask stays
// until the new one is ready.
export function ClipWrap({ base, pageSize, pageFilter, blend, children }) {
  const [maskUrl, setMaskUrl] = useState(null);
  const urlRef = useRef(null); // the mask picture now in use, so it can be let go of
  const signature = shapeSignature(base, pageSize);

  useEffect(() => {
    let cancelled = false;
    // Annotation coordinates are in MAIN_SCALE page px; the mask is drawn at up to MASK_MAX_SCALE of them.
    const scale = Math.min(MASK_MAX_SCALE, Math.sqrt(MASK_MAX_PIXELS / Math.max(1, pageSize.width * pageSize.height)));
    clipMaskCanvas(base, pageSize.width * scale, pageSize.height * scale, scale, pageFilter).then((canvas) => {
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
        width: pageSize.width, height: pageSize.height,
        WebkitMaskImage: mask, maskImage: mask,
        mixBlendMode: blend && blend !== "normal" ? blend : undefined,
        visibility: maskUrl ? undefined : "hidden", // until the mask is ready, so the image never flashes unclipped
      }}
    >
      {children}
    </div>
  );
}
