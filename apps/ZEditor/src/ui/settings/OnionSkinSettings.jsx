// Onion-skin opacity setting.

// ---- Onion-skin settings — ghosts the previous page on top of the
// current one at reduced opacity, to help align content across a
// spread. Deliberately scoped to previous-page-only (no next-page or
// spread-aware left/right detection) and doesn't live-update while
// that previous page is still being edited — see the effect in App
// that builds onionGhostSrc for why.
export function OnionSkinSettings({ opacity, onOpacityChange }) {
  return (
    <React.Fragment>
      <div className="ze-format-field">
        <span className="ze-format-label">Opacity ({Math.round(opacity * 100)}%)</span>
        <input
          type="range" className="ze-format-slider" min="0.05" max="0.8" step="0.05"
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
        />
      </div>
      <span className="ze-format-hint">
        Shows the previous page faintly on top, for aligning content across a spread. Switch pages and back to refresh it after editing that page.
      </span>
    </React.Fragment>
  );
}
