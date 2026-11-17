// Live stroke/texture overlays drawn on top of a box item.

import { effectSettings } from "../../model/controls.js";
import { STROKE_EFFECT, STROKE_MITER_LIMIT, TEXTURE_EFFECT } from "../../model/imageEffects.js";
import { rectOutline } from "../../model/outlines.js";
import { drawTextureMarks } from "../../render/boxEffects.js";
const { useRef, useEffect } = React;

// The texture and stroke drawn over a box's content.
export function BoxEffectOverlays({ ann, edgeOutline }) {
  const textureCanvasRef = useRef(null);
  const textureKey = ann.texture ? JSON.stringify(effectSettings(ann, TEXTURE_EFFECT)) : null;
  const stroke = ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null;

  useEffect(() => {
    const canvas = textureCanvasRef.current;
    if (!textureKey || !canvas) return;
    canvas.width = Math.max(1, Math.ceil(ann.width));
    canvas.height = Math.max(1, Math.ceil(ann.height));
    drawTextureMarks(canvas.getContext("2d"), ann);
  }, [textureKey, ann.width, ann.height]);

  return (
    <React.Fragment>
      {ann.texture && (
        <canvas ref={textureCanvasRef} className="ze-ann-image-texture" style={{ clipPath: edgeOutline ? `path("${edgeOutline}")` : undefined }} />
      )}
      {stroke && (
        <svg className="ze-ann-image-stroke" width={ann.width} height={ann.height} aria-hidden="true">
          <path
            d={edgeOutline || rectOutline(ann)}
            fill="none"
            stroke={stroke.strokeColor}
            strokeWidth={stroke.strokeThickness}
            strokeLinejoin="miter"
            strokeMiterlimit={STROKE_MITER_LIMIT}
          />
        </svg>
      )}
    </React.Fragment>
  );
}
