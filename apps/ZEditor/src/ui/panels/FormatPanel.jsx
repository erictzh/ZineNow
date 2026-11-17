// The right-hand Format panel: picks the panel for the selected item, or for the current tool when nothing is selected.

import { ImageFormat } from "./format/ImageFormat.jsx";
import { FormatPanelShell } from "./format/FormatPanelShell.jsx";
import { ShapeFormat } from "./format/ShapeFormat.jsx";
import { StrokeFormat } from "./format/StrokeFormat.jsx";
import { TextFormat } from "./format/TextFormat.jsx";
import { EraserToolPanel, ShapeToolPanel, StrokeToolPanel, TextToolPanel } from "./format/ToolPanels.jsx";

// `toolDefaults` is the useToolDefaults hook object (fonts, text styles and
// each tool's settings for the next item); `magicErase` is the magic eraser's preview session (state/useMagicErase.js).
export function FormatPanel({
  tool, selectedAnn, onUpdate, croppingAnnId, onToggleCrop,
  onFlattenImage, onRasterizeRect, onRasterizeText, toolDefaults, magicErase,
}) {
  const ann = selectedAnn;
  if (ann && ann.type === "text") return <TextFormat key={ann.id} ann={ann} onUpdate={onUpdate} onRasterizeText={onRasterizeText} toolDefaults={toolDefaults} />;
  if (ann && ann.type === "stroke") return <StrokeFormat key={ann.id} ann={ann} onUpdate={onUpdate} />;
  if (ann && ann.type === "image") return <ImageFormat key={ann.id} ann={ann} onUpdate={onUpdate} croppingAnnId={croppingAnnId} onToggleCrop={onToggleCrop} onFlattenImage={onFlattenImage} />;
  if (ann && ann.type === "rect") return <ShapeFormat key={ann.id} ann={ann} onUpdate={onUpdate} onRasterizeRect={onRasterizeRect} />;

  if (tool === "rect" || tool === "ellipse") return <ShapeToolPanel tool={tool} toolDefaults={toolDefaults} />;
  if (tool === "text") return <TextToolPanel toolDefaults={toolDefaults} />;
  if (tool === "pen" || tool === "highlighter") return <StrokeToolPanel tool={tool} toolDefaults={toolDefaults} />;
  if (tool === "eraser") return <EraserToolPanel toolDefaults={toolDefaults} magicErase={magicErase} />;

  return (
    <FormatPanelShell title="Format" sections={false}>
      <div className="ze-format-empty">
        Select a text box, image, rectangle, or stroke to edit it, or pick a tool to set defaults for the next one you add.
      </div>
    </FormatPanelShell>
  );
}
