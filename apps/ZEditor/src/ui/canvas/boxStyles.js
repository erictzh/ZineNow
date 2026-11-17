// CSS for a box item's rotation, opacity, blend and shadow in the live editor.

import { angleOf, blendOf, opacityOf } from "../../model/controls.js";
import { rotatePoint } from "../../model/geometry.js";
import { imageShadowOffset } from "../../model/imageEffects.js";

// CSS for a rotated item's outer box, or nothing when it isn't rotated.
export const rotationCss = (ann) => (angleOf(ann) ? `rotate(${angleOf(ann)}deg)` : undefined);

// Shadow and opacity for a box's whole artwork. Kept off the box itself
// so they don't apply to its handles or trap them under other layers.
export function boxGroupStyle(ann) {
  const shadow = imageShadowOffset(ann);
  const opacity = opacityOf(ann);
  const blend = blendOf(ann);
  // The shadow is drawn inside the rotated box, so its offset is turned
  // back the other way: the light stays fixed on the page, as in Export.
  const [shadowX, shadowY] = shadow ? rotatePoint(shadow.x, shadow.y, -angleOf(ann)) : [0, 0];
  return {
    filter: shadow ? `drop-shadow(${shadowX}px ${shadowY}px ${shadow.blur}px ${shadow.color})` : undefined,
    opacity: opacity < 1 ? opacity : undefined,
    // A rotated box is its own stacking context, which would trap this
    // blend inside it; see boxOuterStyle, which carries it instead.
    mixBlendMode: blend !== "normal" && !angleOf(ann) ? blend : undefined,
  };
}

// Position, size and rotation of an image or rectangle's outer box.
export function boxOuterStyle(ann) {
  const blend = blendOf(ann);
  return {
    left: ann.x, top: ann.y, width: ann.width, height: ann.height,
    transform: rotationCss(ann),
    mixBlendMode: angleOf(ann) && blend !== "normal" ? blend : undefined,
  };
}
