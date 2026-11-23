// Format panel for a selected image: basics, crop, photo adjustments, filter style, effects, Vectorize, flatten.

import { ANGLE_CONTROL, angleOf } from "../../../model/controls.js";
import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT, FILTER_CONTROLS, IMAGE_FILTER_OPTIONS } from "../../../model/pageFilters.js";
import { PHOTO_ADJUST_CONTROLS, PHOTO_ADJUST_SECTIONS, isAdjusted } from "../../../model/photoAdjust.js";
import { DEFAULT_TRACE_PRESET, TRACE_PRESETS } from "../../../model/trace/traceSettings.js";
import { cropResetPatch } from "../../../render/bake.js";
import { ControlList } from "../../controls/ControlList.jsx";
import { SelectInput } from "../../controls/inputs.jsx";
import { PanelSection, resetPatch } from "../../controls/PanelSection.jsx";
import { EffectControls } from "../EffectControls.jsx";
import { TextWrapSection } from "../TextWrapSection.jsx";
import { FormatPanelShell, SizeReadout } from "./FormatPanelShell.jsx";
import { RemoveBackgroundSection } from "./RemoveBackgroundSection.jsx";
const { useState } = React;

// Hidden for now (Ai Tools (Local) is still experimental). Set to true to show the section again.
const SHOW_AI_TOOLS_SECTION = false;
// Hidden until the background-removal model has been tested on the real device (labs/ai-bg-benchmark). Set to true to show it again.
const SHOW_REMOVE_BACKGROUND_SECTION = false;

export function ImageFormat({ ann, onUpdate, croppingAnnId, onToggleCrop, onFlattenImage, onRemoveBackground, onOpenInAiTools, imageTrace }) {
  const patch = (p) => onUpdate(ann.id, p);
  const isCroppingThis = croppingAnnId === ann.id;
  const hasCrop = ann.cropW != null && (ann.cropX || ann.cropY || ann.cropW !== ann.naturalWidth || ann.cropH !== ann.naturalHeight);
  const cropReset = cropResetPatch(ann);
  const filterType = (ann.filter && ann.filter.type) || "match";
  const filterOption = IMAGE_FILTER_OPTIONS.find((o) => o.key === filterType);
  const adjustedCount = PHOTO_ADJUST_CONTROLS.filter((c) => isAdjusted(ann, c)).length;
  const filtersSummary = [adjustedCount > 0 && adjustedCount + " adjusted", filterType !== "match" && filterOption && filterOption.label].filter(Boolean).join(" · ") || undefined;
  return (
    <FormatPanelShell title="Format — Image">
      <PanelSection
        id="image.crop"
        title="Crop"
        checked={isCroppingThis || Boolean(hasCrop)}
        disabled={Boolean(angleOf(ann)) && !isCroppingThis && !hasCrop}
        hint="While cropping: drag inside the window to reposition the photo, drag a handle to resize the crop (hold Shift to keep its proportions). Set the rotation to 0° to crop."
        onToggle={(on) => {
          if (on) { if (!isCroppingThis) onToggleCrop(ann.id); return; }
          if (isCroppingThis) onToggleCrop(ann.id);
          patch(cropReset);
        }}
        onReset={hasCrop ? () => patch(cropReset) : undefined}
      >
        <button type="button" className={"ze-format-toggle ze-format-toggle-wide" + (isCroppingThis ? " active" : "")} onClick={() => onToggleCrop(ann.id)}>
          {isCroppingThis ? "Done Cropping" : "Edit Crop"}
        </button>
      </PanelSection>
      <PanelSection id="image.basic" title="Basic" defaultOpen hint="Drag the image to move it. Drag a handle to resize; hold Shift to stretch it freely. Opacity and blend are in the Layers panel." onReset={() => patch(resetPatch([ANGLE_CONTROL]))}>
        <SizeReadout ann={ann} />
        <ControlList controls={[ANGLE_CONTROL]} source={ann} onPatch={patch} />
      </PanelSection>
      <TextWrapSection ann={ann} patch={patch} />
      <PanelSection
        id="image.filters"
        title="Photo Adjustments"
        group
        summary={filtersSummary}
        hint="Adjust the photo's light, color and levels. Adjustments are applied before the Style filter, so a filter works on the adjusted photo."
      >
        {PHOTO_ADJUST_SECTIONS.map((group) => {
          const changed = group.controls.filter((c) => isAdjusted(ann, c)).length;
          return (
            <PanelSection
              key={group.id}
              id={"image.adjust." + group.id}
              title={group.title}
              summary={changed > 0 ? changed + " changed" : undefined}
              onReset={() => patch(resetPatch(group.controls))}
            >
              <ControlList controls={group.controls} source={ann} onPatch={patch} />
            </PanelSection>
          );
        })}
      </PanelSection>
      <ImageStyleSection ann={ann} filterType={filterType} filterOption={filterOption} patch={patch} />
      <EffectControls ann={ann} onPatch={patch} />
      <ImageTraceSection ann={ann} imageTrace={imageTrace} disabled={isCroppingThis} />
      {SHOW_REMOVE_BACKGROUND_SECTION && <RemoveBackgroundSection ann={ann} onRemoveBackground={onRemoveBackground} disabled={isCroppingThis} />}
      {SHOW_AI_TOOLS_SECTION && (
      <PanelSection
        id="image.aitools"
        title="Ai Tools (Local)"
        hint="Opens this picture (with its crop, adjustments and effects) in Ai Tools (Local), the AI object remover that runs on your device. When you press Send back to ZEditor there, the result arrives here as a new layer. Nothing is uploaded."
      >
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={isCroppingThis} onClick={() => onOpenInAiTools(ann)}>
          Open in Ai Tools (remove objects)
        </button>
      </PanelSection>
      )}
      <PanelSection
        id="image.flatten"
        title="Flatten"
        summary={Math.round(ann.src.length * 0.75 / 1024) + " KB"}
        hint="Bakes the crop, filter and effects into one image, so you can stack new effects on top. Undo brings them back."
      >
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={isCroppingThis} onClick={() => onFlattenImage(ann)}>
          Flatten Image
        </button>
      </PanelSection>
    </FormatPanelShell>
  );
}

// Vectorize: makes a new layer of filled shapes from this image (it is hidden, not deleted). The
// trace layer's own panel then has every setting, and changes there re-trace live.
function ImageTraceSection({ ann, imageTrace, disabled }) {
  const [preset, setPreset] = useState(DEFAULT_TRACE_PRESET);
  const busy = imageTrace.busyId === ann.id;
  return (
    <PanelSection
      id="image.trace"
      title="Vectorize"
      hint="Turns the image into vector shapes, like Illustrator's Image Trace: a new Vectorized layer goes above it and the image is hidden (show it again in the Layers panel). That layer's panel has all the settings, and changes there update it live. It follows the crop, adjustments and filter. Save it on its own with Save as SVG."
    >
      <div className="ze-format-field">
        <span className="ze-format-label">Preset</span>
        <SelectInput options={TRACE_PRESETS.map((p) => ({ key: p.key, label: p.label }))} value={preset} onChange={setPreset} />
      </div>
      <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={disabled || busy} onClick={() => imageTrace.trace(ann, preset)}>
        {busy ? "Vectorizing…" : "Vectorize"}
      </button>
      {imageTrace.error && <span className="ze-format-hint ze-trace-error">{imageTrace.error}</span>}
    </PanelSection>
  );
}

// The image's own filter ("Style"), which can override the page filter.
function ImageStyleSection({ ann, filterType, filterOption, patch }) {
  return (
    <PanelSection
      id="image.filter"
      title="Style"
      summary={filterOption ? filterOption.label : undefined}
      hint={'Overrides the page filter for just this image. "Match Page" follows whatever the page filter is set to.'}
    >
      <div className="ze-format-field">
        <SelectInput options={IMAGE_FILTER_OPTIONS} value={filterType} onChange={(type) => patch({ filter: { ...ann.filter, type } })} />
      </div>
      {ann.filter && ann.filter.type === "duotone" && (
        <React.Fragment>
          <div className="ze-format-field">
            <span className="ze-format-label">Dark tone</span>
            <input
              type="color" className="ze-format-color-input"
              value={ann.filter.darkColor || DEFAULT_DUOTONE_DARK}
              onChange={(e) => patch({ filter: { ...ann.filter, darkColor: e.target.value } })}
            />
          </div>
          <div className="ze-format-field">
            <span className="ze-format-label">Light tone</span>
            <input
              type="color" className="ze-format-color-input"
              value={ann.filter.lightColor || DEFAULT_DUOTONE_LIGHT}
              onChange={(e) => patch({ filter: { ...ann.filter, lightColor: e.target.value } })}
            />
          </div>
        </React.Fragment>
      )}
      {ann.filter && FILTER_CONTROLS[ann.filter.type] && (
        <ControlList
          controls={FILTER_CONTROLS[ann.filter.type]}
          source={ann.filter}
          onPatch={(p) => patch({ filter: { ...ann.filter, ...p } })}
        />
      )}
    </PanelSection>
  );
}
