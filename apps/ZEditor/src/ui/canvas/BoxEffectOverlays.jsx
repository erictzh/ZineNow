// Live stroke/texture overlays drawn on top of a box item.

import { effectSettings } from "../../model/controls.js";
import { BEVEL_EFFECT, STROKE_MITER_LIMIT, TEXTURE_EFFECT } from "../../model/imageEffects.js";
import { bevelCanvas } from "../../render/bevel.js";
import { gradientLine, shadowLayers, shadowOffsetOf, strokeIsGradient, strokeLayers, strokeReach } from "../../model/effectStacks.js";
import { rotatePoint } from "../../model/geometry.js";
import { angleOf } from "../../model/controls.js";
import { shadowFilterId } from "./boxStyles.js";
import { rectOutline } from "../../model/outlines.js";
import { drawTextureMarks } from "../../render/boxEffects.js";
const { useRef, useEffect } = React;

// The texture and stroke drawn over a box's content.
export function BoxEffectOverlays({ ann, edgeOutline }) {
  const textureCanvasRef = useRef(null);
  const textureKey = ann.texture ? JSON.stringify(effectSettings(ann, TEXTURE_EFFECT)) : null;
  const strokes = strokeLayers(ann); // top first

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
      <ShadowFilter ann={ann} />
      {ann.bevel && <BevelOverlay ann={ann} outline={edgeOutline || rectOutline(ann)} />}
      {strokes.length > 0 && <StrokeStack ann={ann} strokes={strokes} outline={edgeOutline || rectOutline(ann)} />}
    </React.Fragment>
  );
}

// Every stroke of the item, the first of the list on top. A stroke is drawn centred on the outline; an inside stroke is drawn twice as wide
// and cut to the shape, an outside one twice as wide and cut away from it, so each ends up `thickness` wide on its side only.
function StrokeStack({ ann, strokes, outline }) {
  const reach = Math.ceil(strokeReach(strokes)) + 4;
  const id = "ze-stroke-" + ann.id;
  return (
    <svg className="ze-ann-image-stroke" width={ann.width} height={ann.height} aria-hidden="true">
      <defs>
        <clipPath id={id + "-in"}><path d={outline} /></clipPath>
        <mask id={id + "-out"} maskUnits="userSpaceOnUse" x={-reach} y={-reach} width={ann.width + 2 * reach} height={ann.height + 2 * reach}>
          <rect x={-reach} y={-reach} width={ann.width + 2 * reach} height={ann.height + 2 * reach} fill="#fff" />
          <path d={outline} fill="#000" />
        </mask>
        {strokes.map((s, i) => {
          if (!strokeIsGradient(s)) return null;
          const g = gradientLine(s.angle, 0, 0, ann.width, ann.height);
          return (
            <linearGradient key={i} id={id + "-g" + i} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
              <stop offset="0" stopColor={s.color} /><stop offset="1" stopColor={s.color2} />
            </linearGradient>
          );
        })}
      </defs>
      {strokes.map((s, i) => (
        <path
          key={i} d={outline} fill="none" stroke={strokeIsGradient(s) ? `url(#${id}-g${i})` : s.color} strokeLinejoin="miter" strokeMiterlimit={STROKE_MITER_LIMIT}
          strokeWidth={s.position === "center" ? s.thickness : s.thickness * 2}
          clipPath={s.position === "inside" ? `url(#${id}-in)` : undefined} mask={s.position === "outside" ? `url(#${id}-out)` : undefined}
        />
      )).reverse()}
    </svg>
  );
}

// The filter that draws several shadows (a single one uses the plain CSS drop-shadow). Each shadow is the shape's see-through outline,
// blurred, moved and coloured; they are laid bottom to top with the picture itself over them all. As in the live and export drawing of
// one shadow, the offset turns back with the item so the light stays fixed on the page.
function ShadowFilter({ ann }) {
  const layers = shadowLayers(ann).filter((s) => s.thickness > 0 || s.blur > 0);
  if (layers.length < 2) return null;
  const reach = Math.ceil(layers.reduce((m, s) => Math.max(m, s.thickness + s.blur * 2), 0)) + 4;
  const nodes = layers.map((s, i) => {
    const o = shadowOffsetOf(s), [dx, dy] = rotatePoint(o.x, o.y, -angleOf(ann));
    return (
      <React.Fragment key={i}>
        <feGaussianBlur in="SourceAlpha" stdDeviation={s.blur / 2} result={"b" + i} />
        <feOffset in={"b" + i} dx={dx} dy={dy} result={"o" + i} />
        <feFlood floodColor={s.color} result={"f" + i} />
        <feComposite in={"f" + i} in2={"o" + i} operator="in" result={"s" + i} />
      </React.Fragment>
    );
  });
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id={shadowFilterId(ann)} filterUnits="userSpaceOnUse" x={-reach} y={-reach} width={ann.width + 2 * reach} height={ann.height + 2 * reach} colorInterpolationFilters="sRGB">
        {nodes}
        <feMerge>
          {layers.map((_, k) => <feMergeNode key={k} in={"s" + (layers.length - 1 - k)} />)}
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </svg>
  );
}

// The lit edge of Bevel & Emboss, drawn on a canvas over the picture (the same render/bevel.js the export uses), at twice the page's pixels so it
// stays sharp. It has a margin round the box so an emboss can spill past the edge.
function BevelOverlay({ ann, outline }) {
  const ref = useRef(null);
  const [pad, setPad] = React.useState(0);
  const settings = effectSettings(ann, BEVEL_EFFECT);
  const key = JSON.stringify([settings, outline, Math.round(ann.width), Math.round(ann.height)]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const S = 2;
    const made = bevelCanvas(outline, ann.width, ann.height, S, settings);
    canvas.width = made.canvas.width;
    canvas.height = made.canvas.height;
    canvas.getContext("2d").drawImage(made.canvas, 0, 0);
    setPad(made.pad / S);
  }, [key]);
  return <canvas ref={ref} className="ze-ann-image-bevel" style={{ left: -pad, top: -pad, width: ann.width + 2 * pad, height: ann.height + 2 * pad }} />;
}
