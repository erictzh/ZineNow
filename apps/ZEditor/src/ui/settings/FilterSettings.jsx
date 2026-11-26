// Page filter settings.

import { ColorPickerButton } from "../controls/ColorPicker.jsx";
import { FILTER_CONTROLS, PAGE_FILTER_OPTIONS } from "../../model/pageFilters.js";
import { ControlList } from "../controls/ControlList.jsx";

// ---- Filter settings — a page-background treatment (grayscale/duotone/
// halftone…). Baked into Export PDF too via applyPageFilter, so preview
// and output always match.
export function FilterSettings({
  filterType, onFilterTypeChange,
  duotoneDark, duotoneLight, onDuotoneDarkChange, onDuotoneLightChange,
  filter, onFilterPatch,
}) {
  return (
    <React.Fragment>
      <div className="ze-format-field">
        <span className="ze-format-label">Filter</span>
        <select className="ze-format-select" value={filterType} onChange={(e) => onFilterTypeChange(e.target.value)}>
          {PAGE_FILTER_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>
      {filterType === "duotone" && (
        <React.Fragment>
          <div className="ze-format-field">
            <span className="ze-format-label">Dark tone</span>
            <ColorPickerButton ariaLabel="Dark tone" value={duotoneDark} onChange={onDuotoneDarkChange} />
          </div>
          <div className="ze-format-field">
            <span className="ze-format-label">Light tone</span>
            <ColorPickerButton ariaLabel="Light tone" value={duotoneLight} onChange={onDuotoneLightChange} />
          </div>
        </React.Fragment>
      )}
      {FILTER_CONTROLS[filterType] && (
        <ControlList controls={FILTER_CONTROLS[filterType]} source={filter} onPatch={onFilterPatch} />
      )}
      <span className="ze-format-hint">
        Applies to the selected pages' backgrounds and any placed images (other pages keep their own setting). Pen and text stay crisp on top. Baked into Export PDF too.
      </span>
    </React.Fragment>
  );
}
