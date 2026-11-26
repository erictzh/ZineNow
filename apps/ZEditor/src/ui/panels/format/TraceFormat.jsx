// Format panel for a vectorized layer, laid out like Illustrator's Image Trace panel: presets, view, mode, Advanced, Create, colours.

import { ColorPickerButton } from "../../controls/ColorPicker.jsx";
import { ANGLE_CONTROL } from "../../../model/controls.js";
import { isLiveTrace, traceColorOf } from "../../../model/trace/traceLayer.js";
import { TRACE_ADVANCED_CONTROLS, TRACE_ADVANCED_PROPS, TRACE_MAIN_CONTROLS, TRACE_PRESETS, TRACE_VIEW_OPTIONS, matchesPreset, normalizeTraceSettings, presetSettings } from "../../../model/trace/traceSettings.js";
import { ControlList } from "../../controls/ControlList.jsx";
import { SelectInput, SliderNumberInput } from "../../controls/inputs.jsx";
import { PanelSection, resetPatch } from "../../controls/PanelSection.jsx";
import { FormatPanelShell, SizeReadout } from "./FormatPanelShell.jsx";

// The quick preset buttons along the top, as in Illustrator: a small picture of what each makes.
const PRESET_ICONS = {
  bw: <g><rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="currentColor" /><path d="M3 21 21 3v16a2 2 0 0 1-2 2Z" fill="currentColor" /></g>,
  lineart: <path d="M4 18c3-8 6-12 9-6s4 4 7-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
  silhouette: <path d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 18c0-5 3-8 7-8s7 3 7 8Z" fill="currentColor" />,
  outline: <path d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 18c0-5 3-8 7-8s7 3 7 8Z" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  gray: <g><rect x="3" y="4" width="6" height="16" fill="#222" /><rect x="9" y="4" width="6" height="16" fill="#777" /><rect x="15" y="4" width="6" height="16" fill="#ccc" /></g>,
  color3: <g><rect x="3" y="4" width="6" height="16" fill="#d33" /><rect x="9" y="4" width="6" height="16" fill="#3a4" /><rect x="15" y="4" width="6" height="16" fill="#36d" /></g>,
  color6: <g>{["#d33", "#e93", "#ed3", "#3a4", "#36d", "#93c"].map((c, i) => <rect key={c} x={3 + (i % 3) * 6} y={i < 3 ? 4 : 12} width="6" height="8" fill={c} />)}</g>,
  color16: <g>{Array.from({ length: 16 }, (_, i) => <rect key={i} x={3 + (i % 4) * 4.5} y={3 + Math.floor(i / 4) * 4.5} width="4.5" height="4.5" fill={`hsl(${i * 22} 70% ${40 + (i % 3) * 12}%)`} />)}</g>,
};

const METHODS = [
  { key: "abut", label: "Abutting", hint: "Each shape is exactly its own colour's area. Thin gaps can show where colours meet.", icon: <g><path d="M4 4h8v16H4Z" fill="currentColor" /><path d="M12 4h8v16h-8Z" fill="none" stroke="currentColor" strokeWidth="1.6" /></g> },
  { key: "overlap", label: "Overlapping", hint: "Each shape also runs under the colours above it, so no gaps show between colours.", icon: <g><path d="M4 4h12v16H4Z" fill="currentColor" opacity="0.55" /><path d="M10 4h10v16H10Z" fill="none" stroke="currentColor" strokeWidth="1.6" /></g> },
];

export function TraceFormat({ ann, imageTrace, onUpdate, onRasterize, onExportSvg }) {
  const s = normalizeTraceSettings(ann.trace);
  const live = isLiveTrace(ann);
  const change = (patch) => imageTrace.change(ann, patch);
  const busy = imageTrace.busyId === ann.id;
  const custom = !matchesPreset(s);
  const presetLabel = (TRACE_PRESETS.find((p) => p.key === s.preset) || TRACE_PRESETS[0]).label;
  // Picking the preset that's already chosen puts its settings back (the "Custom" entry stands for the changed values).
  const presetOptions = [...(custom ? [{ key: "custom", label: "Custom (from " + presetLabel + ")" }] : []), ...TRACE_PRESETS.map((p) => ({ key: p.key, label: p.label }))];
  const pickPreset = (key) => { if (key !== "custom") change(key === s.preset ? Object.fromEntries(Object.entries(presetSettings(key)).filter(([k]) => k !== "view")) : { preset: key }); };
  const advancedOf = (src) => Object.fromEntries(TRACE_ADVANCED_PROPS.map((k) => [k, src[k]]));
  const advancedChanged = TRACE_ADVANCED_PROPS.some((k) => s[k] !== presetSettings(s.preset)[k]);
  const pathCount = (ann.paths || []).length;
  return (
    <FormatPanelShell title="Format — Vectorize">
      <div className="ze-trace-head">
        {live ? (
          <React.Fragment>
            <div className="ze-trace-presets" role="group" aria-label="Presets">
              {TRACE_PRESETS.map((p) => (
                <button key={p.key} type="button" className={"ze-trace-preset" + (s.preset === p.key && !custom ? " active" : "")} title={p.label} aria-label={p.label} onClick={() => pickPreset(p.key)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{PRESET_ICONS[p.key]}</svg>
                </button>
              ))}
            </div>
            <div className="ze-format-field">
              <span className="ze-format-label">Preset</span>
              <SelectInput options={presetOptions} value={custom ? "custom" : s.preset} onChange={pickPreset} />
            </div>
          </React.Fragment>
        ) : (
          <span className="ze-format-hint">Expanded: these shapes no longer follow the trace settings. Undo brings them back.</span>
        )}
        <div className="ze-format-field">
          <span className="ze-format-label">View</span>
          <SelectInput options={live ? TRACE_VIEW_OPTIONS : TRACE_VIEW_OPTIONS.filter((o) => !o.key.toLowerCase().includes("source"))} value={s.view} onChange={(view) => change({ view })} />
        </div>
        {live && <ControlList controls={TRACE_MAIN_CONTROLS} source={s} onPatch={change} />}
        <span className="ze-trace-status" aria-live="polite">
          {busy ? "Vectorizing…" : `${pathCount} ${pathCount === 1 ? "colour" : "colours"} · ${Math.max(1, Math.round((ann.paths || []).reduce((n, p) => n + p.d.length, 0) / 1024))} KB of paths`}
        </span>
        {imageTrace.error && <span className="ze-format-hint ze-trace-error">{imageTrace.error}</span>}
      </div>

      {live && (
        <PanelSection
          id="trace.advanced" title="Advanced"
          hint="Paths: how closely outlines follow the pixels (higher = more detail, less smoothing). Corners: how readily a bend becomes a sharp corner. Noise: specks smaller than this are left out."
          summary={advancedChanged ? "changed" : undefined}
          onReset={advancedChanged ? () => change(advancedOf(presetSettings(s.preset))) : undefined}
        >
          <ControlList controls={TRACE_ADVANCED_CONTROLS} source={s} onPatch={change} />
          <div className="ze-format-field">
            <span className="ze-format-label">Method</span>
            <div className="ze-trace-methods" role="radiogroup" aria-label="Method">
              {METHODS.map((m) => (
                <button key={m.key} type="button" role="radio" aria-checked={s.method === m.key} className={"ze-trace-preset" + (s.method === m.key ? " active" : "")} title={m.label + ": " + m.hint} onClick={() => change({ method: m.key })}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{m.icon}</svg>
                </button>
              ))}
              <span className="ze-format-hint">{METHODS.find((m) => m.key === s.method).label}</span>
            </div>
          </div>
        </PanelSection>
      )}

      <PanelSection id="trace.create" title="Create" defaultOpen summary={[s.fills === "on" && "Fills", s.strokes === "on" && "Strokes"].filter(Boolean).join(" + ") || "Nothing"}>
        <label className="ze-format-check">
          <input type="checkbox" checked={s.fills === "on"} onChange={(e) => change({ fills: e.target.checked ? "on" : "off" })} />
          <span>Fills</span>
        </label>
        <label className="ze-format-check">
          <input type="checkbox" checked={s.strokes === "on"} onChange={(e) => change({ strokes: e.target.checked ? "on" : "off" })} />
          <span>Strokes</span>
        </label>
        {s.strokes === "on" && (
          <div className="ze-format-field">
            <span className="ze-format-label">Stroke width (px)</span>
            <SliderNumberInput min={1} max={20} value={s.strokeWidth} onChange={(strokeWidth) => change({ strokeWidth })} />
          </div>
        )}
      </PanelSection>

      <TraceColors ann={ann} imageTrace={imageTrace} />

      <PanelSection
        id="trace.svg" title="Save as SVG" defaultOpen
        hint="Saves just this layer as an SVG file: editable vector shapes in the colours above, cropped to the shapes, on a see-through background. Nothing else on the page goes in. Opens in Illustrator, Inkscape, Affinity, Figma, Canva, Cricut and laser-cutter software. To save several layers together, select them and use Export → Export selection as SVG."
      >
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={busy} onClick={() => onExportSvg([ann.id])}>Save as SVG…</button>
      </PanelSection>

      <PanelSection id="trace.transform" title="Transform" hint="Drag a corner to resize (it keeps its proportions; hold Shift to stretch). Opacity and blend are in the Layers panel." onReset={() => onUpdate(ann.id, resetPatch([ANGLE_CONTROL]))}>
        <SizeReadout ann={ann} />
        <ControlList controls={[ANGLE_CONTROL]} source={ann} onPatch={(p) => onUpdate(ann.id, p)} />
      </PanelSection>

      {live && (
        <PanelSection id="trace.expand" title="Expand" hint="Fixes the shapes as they are now and drops the copy of the source picture the layer keeps for re-tracing, so the project file gets smaller. The settings above go away; Undo brings them back.">
          <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={busy} onClick={() => imageTrace.expand(ann)}>Expand</button>
        </PanelSection>
      )}
      <PanelSection id="trace.rasterize" title="Rasterize" hint="Turns the traced shapes into an ordinary image, so image filters and effects can be used on it. Undo brings the trace back.">
        <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={busy} onClick={() => onRasterize(ann)}>Rasterize to Image</button>
      </PanelSection>
    </FormatPanelShell>
  );
}

// One row per traced colour: change it, hide it, or put it back.
function TraceColors({ ann, imageTrace }) {
  const paths = (ann.paths || []).slice().reverse(); // top colour first, like the Layers panel
  const changed = Object.keys(ann.recolor || {}).length;
  return (
    <PanelSection
      id="trace.colors" title="Colours" defaultOpen
      summary={changed ? changed + " changed" : undefined}
      hint="The traced colours, top first. Pick a new colour, or hide one. Changes are kept when you change the trace settings, as long as the trace finds that colour again."
      onReset={changed ? () => imageTrace.recolor(ann, null, null) : undefined}
    >
      <div className="ze-trace-colors">
        {paths.map((p) => {
          const now = traceColorOf(ann, p.color);
          const hidden = now === "none";
          return (
            <div key={p.color} className={"ze-trace-color" + (hidden ? " is-hidden" : "")}>
              <ColorPickerButton value={hidden ? p.color : now} disabled={hidden} ariaLabel={"Colour " + p.color} onChange={(hex) => imageTrace.recolor(ann, p.color, hex)} />
              <span className="ze-trace-hex">{hidden ? "hidden" : now}</span>
              <button type="button" className="ze-trace-mini" title={hidden ? "Show this colour" : "Hide this colour"} onClick={() => imageTrace.recolor(ann, p.color, hidden ? null : "none")}>{hidden ? "Show" : "Hide"}</button>
              {!hidden && now !== p.color && <button type="button" className="ze-trace-mini" title={"Back to the traced colour " + p.color} onClick={() => imageTrace.recolor(ann, p.color, null)}>Reset</button>}
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}
