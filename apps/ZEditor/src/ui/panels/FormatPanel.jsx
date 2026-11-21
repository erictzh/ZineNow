// The right-hand Format panel: picks the panel for the selected item, or for the current tool when nothing is selected.

import { ImageFormat } from "./format/ImageFormat.jsx";
import { FormatPanelShell } from "./format/FormatPanelShell.jsx";
import { ShapeFormat } from "./format/ShapeFormat.jsx";
import { StrokeFormat } from "./format/StrokeFormat.jsx";
import { TextFormat } from "./format/TextFormat.jsx";
import { TraceFormat } from "./format/TraceFormat.jsx";
import { EraserToolPanel, MarqueeToolPanel, ShapeToolPanel, StrokeToolPanel, TextToolPanel } from "./format/ToolPanels.jsx";

// `toolDefaults` is the useToolDefaults hook object (fonts, text styles and
// each tool's settings for the next item); `magicErase` is the magic eraser's preview session (state/useMagicErase.js);
// `imageTrace` is Vectorize (state/useImageTrace.js); `marquee` is the Marquee tool's state (state/useMarquee.js) and `targetLayer` the selected layer it can work on.
export function FormatPanel({
  tool, selectedAnn, onUpdate, croppingAnnId, onToggleCrop,
  onFlattenImage, onRasterizeRect, onRasterizeText, toolDefaults, magicErase, marquee, targetLayer, styleActions, imageTrace, onExportSvg,
}) {
  const ann = selectedAnn;
  // The Marquee tool keeps its own panel even with a layer selected (that layer is what it works on).
  if (tool === "marquee") return <MarqueeToolPanel toolDefaults={toolDefaults} marquee={marquee} targetLayer={targetLayer} />;
  if (ann && ann.type === "text") return <TextFormat key={ann.id} ann={ann} onUpdate={onUpdate} onRasterizeText={onRasterizeText} toolDefaults={toolDefaults} styleActions={styleActions} />;
  if (ann && ann.type === "stroke") return <StrokeFormat key={ann.id} ann={ann} onUpdate={onUpdate} />;
  if (ann && ann.type === "image") return <ImageFormat key={ann.id} ann={ann} onUpdate={onUpdate} croppingAnnId={croppingAnnId} onToggleCrop={onToggleCrop} onFlattenImage={onFlattenImage} imageTrace={imageTrace} />;
  if (ann && ann.type === "trace") return <TraceFormat key={ann.id} ann={ann} imageTrace={imageTrace} onUpdate={onUpdate} onRasterize={imageTrace.rasterize} onExportSvg={onExportSvg} />;
  if (ann && ann.type === "rect") return <ShapeFormat key={ann.id} ann={ann} onUpdate={onUpdate} onRasterizeRect={onRasterizeRect} />;

  if (tool === "rect" || tool === "ellipse") return <ShapeToolPanel tool={tool} toolDefaults={toolDefaults} />;
  if (tool === "text") return <TextToolPanel toolDefaults={toolDefaults} />;
  if (tool === "pen" || tool === "highlighter") return <StrokeToolPanel tool={tool} toolDefaults={toolDefaults} />;
  if (tool === "eraser") return <EraserToolPanel toolDefaults={toolDefaults} magicErase={magicErase} />;

  if (tool === "measure") {
    return (
      <FormatPanelShell title="Measure" sections={false}>
        <div className="ze-format-empty">
          Click one point, then another, to see the distance between them in the ruler's unit. A third click clears it. Dragging from one point to the other works too.
          Once the line is shown, drag either end to adjust. Hold Shift for 45° steps; ends land on ruler guides unless you hold Alt.
        </div>
      </FormatPanelShell>
    );
  }

  return (
    <FormatPanelShell title="Format" sections={false}>
      <div className="ze-format-empty">
        Select a text box, image, rectangle, vectorized image or stroke to edit it, or pick a tool to set defaults for the next one you add.
      </div>
    </FormatPanelShell>
  );
}
