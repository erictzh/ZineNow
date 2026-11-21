// Image Trace: making a trace layer from an image, re-tracing it live as its panel settings change, recolouring and Expand.

import { expandedTracePatch, newTraceLayer, patchedTraceSettings } from "../model/trace/traceLayer.js";
import { TRACE_DRAW_PROPS, presetSettings } from "../model/trace/traceSettings.js";
import { rasterizedTracePatch } from "../render/bake.js";
import { runTrace, traceSourceFromImage } from "../render/traceSource.js";

const { useState, useRef } = React;

// Slider drags re-trace at most this often.
const RETRACE_DELAY_MS = 120;

// - trace(image, preset): a new trace layer goes right above the image, which is hidden (not
//   deleted: show it again in the Layers panel). One undo step.
// - change(ann, patch): the panel's settings. Saved at once (coalesced with the layer's other edits,
//   so a slider drag is one undo step); anything that changes the tracing re-traces in the background.
// - recolor(ann, color, value), expand(ann), rasterize(ann).
export function useImageTrace({ doc, selection, edits }) {
  const [busyId, setBusyId] = useState(null); // the layer being traced right now (the panel says "Tracing…")
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const tokenRef = useRef(0);

  async function trace(image, preset) {
    const pageIdx = doc.selectedIdx;
    if (pageIdx === null || !image) return;
    const id = doc.nextAnnIdRef.current++;
    setBusyId(image.id);
    setError(null);
    try {
      const settings = presetSettings(preset);
      const source = await traceSourceFromImage(image, doc.pageFilter);
      const result = await runTrace(source, settings);
      const layer = newTraceLayer(id, image, source, settings, result);
      edits.updateAnnotationsFor(pageIdx, (anns) => anns.flatMap((a) => (a.id === image.id ? [{ ...a, hidden: true }, { ...layer, groupId: a.groupId }] : [a])));
      selection.setSelectedAnnIds([]);
      selection.setSelectedAnnId(id);
    } catch (err) {
      setError("Couldn't trace this image: " + (err && err.message ? err.message : err));
    } finally {
      setBusyId(null);
    }
  }

  function change(ann, patch) {
    const settings = patchedTraceSettings(ann.trace, patch, presetSettings);
    edits.handleUpdateAnnotation(ann.id, { trace: settings });
    const needsTrace = ann.traceSource && Object.keys(patch).some((k) => !TRACE_DRAW_PROPS.includes(k));
    if (!needsTrace) return;
    const token = ++tokenRef.current;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setBusyId(ann.id);
      try {
        const result = await runTrace(ann.traceSource, settings);
        if (token === tokenRef.current) edits.handleUpdateAnnotation(ann.id, result);
      } catch (err) {
        setError("Couldn't trace this image: " + (err && err.message ? err.message : err));
      } finally {
        if (token === tokenRef.current) setBusyId(null);
      }
    }, RETRACE_DELAY_MS);
  }

  // `value` is a colour, "none" (hide that colour) or null (back to the traced colour).
  // With no `color`, every colour goes back.
  function recolor(ann, color, value) {
    if (color == null) { edits.handleUpdateAnnotation(ann.id, { recolor: undefined }); return; }
    const next = { ...(ann.recolor || {}) };
    if (value == null) delete next[color]; else next[color] = value;
    edits.handleUpdateAnnotation(ann.id, { recolor: Object.keys(next).length ? next : undefined });
  }

  function expand(ann) {
    const pageIdx = doc.selectedIdx;
    if (pageIdx === null) return;
    tokenRef.current++; // a re-trace still on its way is dropped
    clearTimeout(timerRef.current);
    edits.updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => (a.id === ann.id ? { ...a, ...expandedTracePatch(a) } : a)));
  }

  // Its own undo step, like Rasterize on a shape.
  async function rasterize(ann) {
    const pageIdx = doc.selectedIdx;
    tokenRef.current++;
    clearTimeout(timerRef.current);
    const patch = await rasterizedTracePatch(ann);
    if (patch && pageIdx !== null) edits.updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => (a.id === ann.id ? { ...a, ...patch } : a)));
  }

  return { busyId, error, trace, change, recolor, expand, rasterize };
}
