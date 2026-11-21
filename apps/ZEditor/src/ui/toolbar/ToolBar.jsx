// The tool bar above the page: tools, Layers and center-guide toggles, zoom, delete, and the shortcuts button.

import { ZOOM_PERCENT } from "../../constants.js";
import { SliderNumberInput } from "../controls/inputs.jsx";

export function ToolBar({ selection, edits, view, zoom, dialogs }) {
  const { tool, selectTool, selectedAnnId } = selection;
  const { layersOpen, setLayersOpen, centerGuideOn, setCenterGuideOn } = view;

  return (
    <div className="ze-tool-bar">
      <div className="ze-tool-bar-group">
        <button type="button" className={"ze-tool-icon-btn" + (tool === "select" ? " active" : "")} title="Move (V)" onClick={() => selectTool("select")}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 3l6.5 16 2-6.5L19 10.5z" fill="currentColor" /></svg>
        </button>
        <button type="button" className={"ze-tool-icon-btn" + (tool === "text" ? " active" : "")} title="Text (T)" onClick={() => selectTool("text")}>
          <span className="ze-tool-icon-text">T</span>
        </button>
        <button type="button" className="ze-tool-icon-btn" title="Insert Image (I)" onClick={edits.handleImageToolClick}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
            <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L5 19" />
          </svg>
        </button>
        <button type="button" className="ze-tool-icon-btn" title="Insert SVG file: opens your files (on Android, Files instead of the photo gallery)" aria-label="Insert SVG file" onClick={edits.handleSvgToolClick}>
          <span className="ze-tool-icon-text ze-tool-icon-svg">SVG</span>
        </button>
        <button type="button" className={"ze-tool-icon-btn" + (tool === "rect" ? " active" : "")} title="Rectangle (R)" onClick={() => selectTool("rect")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="6" width="17" height="12" />
          </svg>
        </button>
        <button type="button" className={"ze-tool-icon-btn" + (tool === "ellipse" ? " active" : "")} title="Ellipse (E)" onClick={() => selectTool("ellipse")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <ellipse cx="12" cy="12" rx="8.5" ry="6" />
          </svg>
        </button>
        <button type="button" className={"ze-tool-icon-btn" + (tool === "pen" ? " active" : "")} title="Draw (D)" onClick={() => selectTool("pen")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20l1-4L16 5l3 3L8 19z" />
            <path d="M14 7l3 3" />
          </svg>
        </button>
        <button type="button" className={"ze-tool-icon-btn" + (tool === "highlighter" ? " active" : "")} title="Highlight (H)" onClick={() => selectTool("highlighter")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 20l1-3.5 8-8 3.5 3.5-8 8z" />
            <path d="M14 9l3.5 3.5" />
            <path d="M3 21h5" />
          </svg>
        </button>
        <button type="button" className={"ze-tool-icon-btn" + (tool === "eraser" ? " active" : "")} title="Eraser" onClick={() => selectTool("eraser")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3l4 4-9.5 9.5H7L3 12z" />
            <path d="M7 21h13" />
            <path d="M9.5 5.5l6 6" />
          </svg>
        </button>
        <button type="button" className={"ze-tool-icon-btn" + (tool === "marquee" ? " active" : "")} title="Marquee (M): draw a box, then Make layer (Ctrl+J copy, Ctrl+Shift+J cut)" onClick={() => selectTool("marquee")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="5.5" width="16" height="13" strokeDasharray="2.6 2.6" />
          </svg>
        </button>
        <span className="ze-tool-bar-divider" role="separator" aria-orientation="vertical" />
        <button type="button" className={"ze-tool-icon-btn" + (tool === "measure" ? " active" : "")} title="Measure (U): click two points; a third click clears" onClick={() => selectTool("measure")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2.5" y="8" width="19" height="8" rx="1" transform="rotate(-30 12 12)" />
            <path d="M8.2 11.4l1.3 2.2M11.2 9.7l1.3 2.2M14.2 8l1.3 2.2" />
          </svg>
        </button>
        <button
          type="button"
          className={"ze-tool-icon-btn" + (layersOpen ? " active" : "")}
          aria-pressed={layersOpen}
          aria-label="Layers panel"
          title={layersOpen ? "Minimize the Layers panel" : "Show the Layers panel"}
          onClick={() => setLayersOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l9 5-9 5-9-5z" />
            <path d="M3 12.5l9 5 9-5" />
            <path d="M3 17l9 5 9-5" />
          </svg>
        </button>
        <button
          type="button"
          className={"ze-tool-icon-btn" + (centerGuideOn ? " active" : "")}
          aria-pressed={centerGuideOn}
          aria-label="Center guide"
          title={centerGuideOn ? "Hide the center guide" : "Show a guide down the middle of the page (for covers and two-page spreads)"}
          onClick={() => setCenterGuideOn((on) => !on)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="1" />
            <path d="M12 3v18" strokeDasharray="2.5 2.5" />
          </svg>
        </button>
      </div>
      <div className="ze-zoom-control">
        <span className="ze-format-label">Zoom (%)</span>
        <SliderNumberInput min={ZOOM_PERCENT.min} max={ZOOM_PERCENT.max} value={zoom.zoomPercent} onChange={zoom.handleZoomChange} />
      </div>
      <div className="ze-tool-bar-group">
        <button
          type="button"
          className="ze-tool-icon-btn"
          title="Delete selected (Delete)"
          disabled={selectedAnnId === null}
          onClick={edits.handleDeleteAnnotation}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M9 7V4h6v3" />
            <path d="M6 7l1 13h10l1-13" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
        <button
          type="button"
          className="ze-tool-icon-btn ze-tool-icon-btn--round"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
          onClick={() => dialogs.setShortcutsOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 11v7" />
            <path d="M12 6.5v.01" />
          </svg>
        </button>
      </div>
    </div>
  );
}
