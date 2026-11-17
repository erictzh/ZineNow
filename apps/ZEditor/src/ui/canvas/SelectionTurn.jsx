// The rotate knob (and dashed outline) for a multi-item or stroke selection, which turns everything about the selection's middle.

import { annotationBounds } from "../../render/itemGeometry.js";
import { trackPointerDrag } from "../pointer.js";

// Strokes and groups have no rotate knob of their own (a box does), so a
// selection of several items, or of one stroke, gets one here, turning
// everything about the middle of the whole selection. Returns null when
// no knob is needed.
export function selectionTurnFor({ tool, annotations, selectedAnnId, selectedAnnIds, editingAnnId }) {
  const selectedItems = tool === "select"
    ? annotations.filter((a) => (a.id === selectedAnnId || selectedAnnIds.includes(a.id)) && !a.hidden && !a.locked)
    : [];
  const needsSelectionKnob = selectedItems.length > 1 || (selectedItems.length === 1 && selectedItems[0].type === "stroke");
  if (!needsSelectionKnob || editingAnnId) return null;
  const bounds = selectedItems.map(annotationBounds);
  const x0 = Math.min(...bounds.map((b) => b.x)), y0 = Math.min(...bounds.map((b) => b.y));
  const x1 = Math.max(...bounds.map((b) => b.x + b.width)), y1 = Math.max(...bounds.map((b) => b.y + b.height));
  return { items: selectedItems, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// `toPagePoint(event)` turns a mouse event into page coordinates.
export function SelectionTurnKnob({ turn, zoom, toPagePoint, onRotateAnnotations }) {
  function startSelectionTurn(e) {
    e.preventDefault();
    e.stopPropagation();
    const { items, cx, cy } = turn;
    const pointerAngle = (ev) => { const p = toPagePoint(ev); return Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI; };
    const startAngle = pointerAngle(e);
    trackPointerDrag((ev) => {
      let delta = pointerAngle(ev) - startAngle;
      delta = ev.shiftKey ? Math.round(delta / 15) * 15 : delta;
      onRotateAnnotations(items, delta, cx, cy);
    });
  }
  return (
    <React.Fragment>
      {turn.items.length > 1 && (
        <div className="ze-group-outline" style={{ left: turn.box.x, top: turn.box.y, width: turn.box.width, height: turn.box.height }} />
      )}
      <div
        className="ze-rotate-handle"
        title="Rotate the selection (hold Shift to snap to 15°)"
        style={{ left: turn.cx, top: turn.box.y - 22 / zoom }}
        onMouseDown={startSelectionTurn}
      />
    </React.Fragment>
  );
}
