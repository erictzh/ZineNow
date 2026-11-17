// Colour swatches plus width/taper sliders for pen and highlighter.

import { CustomColorInput } from "./inputs.jsx";

// ---- Shared color-swatches + thickness-slider fields, used for both
// a tool's drawing defaults and an existing selected stroke's own
// properties — same controls, different get/set targets.
export function StrokeFormatFields({ swatches, color, width, minWidth, maxWidth, taper, onColor, onWidth, onTaper }) {
  return (
    <React.Fragment>
      <div className="ze-format-field">
        <span className="ze-format-label">Thickness ({Math.round(width)}px)</span>
        <input
          type="range"
          className="ze-format-slider"
          min={minWidth}
          max={maxWidth}
          step="0.5"
          value={width}
          onChange={(e) => onWidth(Number(e.target.value))}
        />
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Taper ({Math.round((taper || 0) * 100 / 0.45)}%)</span>
        <input
          type="range"
          className="ze-format-slider"
          min="0"
          max="0.45"
          step="0.01"
          value={taper || 0}
          onChange={(e) => onTaper(Number(e.target.value))}
        />
        <span className="ze-format-hint">Thins each end toward a point. 0% keeps a constant, rounded-off width.</span>
      </div>
      <div className="ze-format-field">
        <span className="ze-format-label">Color</span>
        <div className="ze-format-row ze-format-swatches">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              className={"ze-format-swatch" + (color === c ? " active" : "")}
              style={{ backgroundColor: c }}
              title={c}
              onClick={() => onColor(c)}
            />
          ))}
          <CustomColorInput value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000"} onChange={onColor} />
        </div>
      </div>
    </React.Fragment>
  );
}
