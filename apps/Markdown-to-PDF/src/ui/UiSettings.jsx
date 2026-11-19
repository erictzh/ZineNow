// The gear button at the bottom left and its pop-up: the editor's text size and the size of the
// app's own controls ("Interface size"). These are preferences of this browser, not of the
// document, so they live in localStorage rather than in the settings JSON.
//
// How they apply: two CSS variables on <html>. --md2ebook-editor-font-size sets the Markdown
// textarea's font size; --md2ebook-ui-zoom is a CSS `zoom` on the top bar, the side panel's
// contents and the preview's status bar (styles.css, "Interface size"). The paper preview is left
// out on purpose: it has its own zoom in the status bar.

const { useState, useEffect, useRef } = React;

const STORAGE_KEY = "md2ebook-ui-prefs";
export const EDITOR_FONT = { min: 10, max: 28, step: 0.5, initial: 13.5 };
export const UI_SCALE = { min: 75, max: 175, step: 5, initial: 100 }; // percent

const clamp = (v, { min, max, initial }) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : initial);

function loadPrefs() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { /* none saved, or storage blocked */ }
  return { editorFontSize: clamp(Number(saved.editorFontSize), EDITOR_FONT), uiScale: clamp(Number(saved.uiScale), UI_SCALE) };
}

function applyPrefs({ editorFontSize, uiScale }) {
  const root = document.documentElement.style;
  root.setProperty("--md2ebook-editor-font-size", editorFontSize + "px");
  root.setProperty("--md2ebook-ui-zoom", String(uiScale / 100));
}

// Applied once as soon as the bundle runs, so the app doesn't first draw at the default size.
applyPrefs(loadPrefs());

// One labelled slider with − / + buttons and a readout.
function PrefSlider({ label, value, range, unit, onChange }) {
  const set = (v) => onChange(clamp(Math.round(v / range.step) * range.step, range));
  return (
    <div className="md2ebook-uiprefs-row">
      <div className="md2ebook-uiprefs-label">
        <span>{label}</span>
        <span className="md2ebook-uiprefs-value">{value}{unit}</span>
      </div>
      <div className="md2ebook-uiprefs-control">
        <button type="button" className="md2ebook-uiprefs-step" aria-label={"Smaller " + label.toLowerCase()} onClick={() => set(value - range.step)} disabled={value <= range.min}>−</button>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          aria-label={label}
          onChange={(e) => set(Number(e.target.value))}
        />
        <button type="button" className="md2ebook-uiprefs-step" aria-label={"Larger " + label.toLowerCase()} onClick={() => set(value + range.step)} disabled={value >= range.max}>+</button>
      </div>
    </div>
  );
}

export function UiSettings() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    applyPrefs(prefs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) { /* not remembered */ }
  }, [prefs]);

  // Closes on a press outside the gear and its pop-up, or on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const update = (key) => (value) => setPrefs((p) => ({ ...p, [key]: value }));
  const isDefault = prefs.editorFontSize === EDITOR_FONT.initial && prefs.uiScale === UI_SCALE.initial;

  return (
    <div className="md2ebook-uiprefs md2ebook-no-print" ref={wrapRef}>
      {open ? (
        <div className="md2ebook-uiprefs-panel" role="dialog" aria-label="Display settings">
          <div className="md2ebook-uiprefs-title">Display</div>
          <PrefSlider label="Editor text size" value={prefs.editorFontSize} range={EDITOR_FONT} unit="px" onChange={update("editorFontSize")} />
          <PrefSlider label="Interface size" value={prefs.uiScale} range={UI_SCALE} unit="%" onChange={update("uiScale")} />
          <div className="md2ebook-uiprefs-foot">
            <span className="md2ebook-uiprefs-note">Saved in this browser</span>
            <button type="button" className="md2ebook-uiprefs-reset" disabled={isDefault} onClick={() => setPrefs({ editorFontSize: EDITOR_FONT.initial, uiScale: UI_SCALE.initial })}>
              Reset
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className={"md2ebook-uiprefs-gear" + (open ? " open" : "")}
        title="Display settings: editor text size and interface size"
        aria-label="Display settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
