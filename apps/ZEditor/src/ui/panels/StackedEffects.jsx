// The Stroke and Shadow sections of a picture or shape: any number of layers, each with its own settings (model/effectStacks.js).
// The first layer in the list is the one on top.

import { DEFAULT_SHADOW, DEFAULT_STROKE, MAX_LAYERS, STROKE_POSITIONS, shadowLayers, shadowsPatch, strokeLayers, strokesPatch } from "../../model/effectStacks.js";
import { ColorPickerButton } from "../controls/ColorPicker.jsx";
import { SelectInput, SliderNumberInput } from "../controls/inputs.jsx";

function Row({ label, children }) {
  return (
    <div className="ze-format-field">
      <span className="ze-format-label">{label}</span>
      {children}
    </div>
  );
}

// One layer of a stack: a header (its number, move up / down, delete) and its settings.
function LayerCard({ index, count, title, onMove, onDelete, children }) {
  return (
    <div className="ze-stack-card">
      <div className="ze-stack-head">
        <span className="ze-stack-title">{title} {index + 1}</span>
        <span className="ze-stack-actions">
          <button type="button" className="ze-stack-btn" title="Move up (drawn on top of the one below)" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="ze-stack-btn" title="Move down" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>↓</button>
          <button type="button" className="ze-stack-btn ze-stack-del" title="Delete this layer" aria-label="Delete this layer" onClick={onDelete}>×</button>
        </span>
      </div>
      {children}
    </div>
  );
}

// A list editor: `layers` (a clean array), `make(patchFn)` stores a new list. Shared by strokes and shadows.
function useStack(layers, store) {
  const update = (i, change) => store(layers.map((l, k) => (k === i ? { ...l, ...change } : l)));
  const remove = (i) => store(layers.filter((_, k) => k !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= layers.length) return;
    const next = layers.slice();
    [next[i], next[j]] = [next[j], next[i]];
    store(next);
  };
  return { update, remove, move };
}

export function StrokeStack({ ann, onPatch }) {
  const layers = strokeLayers(ann);
  const { update, remove, move } = useStack(layers, (list) => onPatch(strokesPatch(list)));
  return (
    <React.Fragment>
      {layers.map((s, i) => (
        <LayerCard key={i} index={i} count={layers.length} title="Stroke" onMove={(d) => move(i, d)} onDelete={() => remove(i)}>
          <Row label="Color"><ColorPickerButton value={s.color} ariaLabel="Stroke colour" onChange={(color) => update(i, { color })} /></Row>
          <Row label="Thickness (px)"><SliderNumberInput min={1} max={40} value={s.thickness} onChange={(thickness) => update(i, { thickness })} /></Row>
          <Row label="Position"><SelectInput options={STROKE_POSITIONS} value={s.position} onChange={(position) => update(i, { position })} /></Row>
        </LayerCard>
      ))}
      <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={layers.length >= MAX_LAYERS} onClick={() => onPatch(strokesPatch([...layers, { ...DEFAULT_STROKE, ...(layers.length ? { color: layers[0].color } : {}) }]))}>+ Add stroke</button>
    </React.Fragment>
  );
}

export function ShadowStack({ ann, onPatch }) {
  const layers = shadowLayers(ann);
  const { update, remove, move } = useStack(layers, (list) => onPatch(shadowsPatch(list)));
  return (
    <React.Fragment>
      {layers.map((s, i) => (
        <LayerCard key={i} index={i} count={layers.length} title="Shadow" onMove={(d) => move(i, d)} onDelete={() => remove(i)}>
          <Row label="Color"><ColorPickerButton value={s.color} ariaLabel="Shadow colour" onChange={(color) => update(i, { color })} /></Row>
          <Row label="Distance (px)"><SliderNumberInput min={0} max={60} value={s.thickness} onChange={(thickness) => update(i, { thickness })} /></Row>
          <Row label="Direction (°)"><SliderNumberInput min={0} max={360} value={s.direction} onChange={(direction) => update(i, { direction })} /></Row>
          <Row label="Blur (px)"><SliderNumberInput min={0} max={40} value={s.blur} onChange={(blur) => update(i, { blur })} /></Row>
        </LayerCard>
      ))}
      <span className="ze-format-hint">Direction: 0° is up, 90° right, 180° down, 270° left.</span>
      <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={layers.length >= MAX_LAYERS} onClick={() => onPatch(shadowsPatch([...layers, { ...DEFAULT_SHADOW, ...(layers.length ? { color: layers[0].color } : {}) }]))}>+ Add shadow</button>
    </React.Fragment>
  );
}
