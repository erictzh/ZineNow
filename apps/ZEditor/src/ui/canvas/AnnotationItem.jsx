// One item on the page: picks the component for its type (image, shape, vectorized image, text or stroke).

import { blendOf, opacityOf } from "../../model/controls.js";
import { AnnotationImage } from "./AnnotationImage.jsx";
import { AnnotationRect } from "./AnnotationRect.jsx";
import { AnnotationText } from "./AnnotationText.jsx";
import { AnnotationTrace } from "./AnnotationTrace.jsx";
import { StrokeShape } from "./StrokeShape.jsx";

export function AnnotationItem({
  ann: a, tool, zoom, pageSize, pageFilter,
  isSelected, showHandles, isEditing, isCropping, isEraseTarget,
  onPress, onUpdate, onToggleCrop, onStartTextEdit, onFinishTextEdit, onLinkNextFrame,
}) {
  if (a.type === "image") {
    return (
      <AnnotationImage
        ann={a}
        tool={tool}
        isSelected={isSelected}
        showHandles={showHandles}
        isCropping={isCropping}
        isEraseTarget={isEraseTarget}
        onPress={onPress}
        onUpdate={onUpdate}
        onToggleCrop={onToggleCrop}
        pageFilter={pageFilter}
        zoom={zoom}
      />
    );
  }
  if (a.type === "rect") {
    return (
      <AnnotationRect
        ann={a}
        tool={tool}
        isSelected={isSelected}
        showHandles={showHandles}
        onPress={onPress}
        onUpdate={onUpdate}
        zoom={zoom}
      />
    );
  }
  if (a.type === "trace") {
    return <AnnotationTrace ann={a} tool={tool} isSelected={isSelected} showHandles={showHandles} onPress={onPress} onUpdate={onUpdate} zoom={zoom} />;
  }
  if (a.type === "text") {
    return (
      <AnnotationText
        ann={a}
        tool={tool}
        isSelected={isSelected}
        isEditing={isEditing}
        showHandles={showHandles}
        onPress={onPress}
        onStartEdit={onStartTextEdit}
        onFinishEdit={onFinishTextEdit}
        onUpdate={onUpdate}
        onLinkNext={onLinkNextFrame}
        zoom={zoom}
      />
    );
  }
  // A stroke: its own page-sized SVG, so its blend mode mixes with what's below and its
  // opacity fades the whole stroke as one piece (overlapping parts don't darken).
  const strokeStyle = {
    mixBlendMode: blendOf(a) !== "normal" ? blendOf(a) : undefined,
    opacity: opacityOf(a) < 1 ? opacityOf(a) : undefined,
  };
  return (
    <svg className="ze-stroke-svg" width={pageSize.width} height={pageSize.height} style={strokeStyle}>
      <StrokeShape ann={a} tool={tool} isSelected={isSelected} onPress={onPress} />
    </svg>
  );
}
