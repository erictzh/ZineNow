// Small form pieces for the settings sidebar: labels, fields, toggles, inputs, alignment and heading-line controls.

import { DEFAULTS, TEXT_ALIGN_OPTIONS } from "../settings/defaults.js";
import { NumberBox } from "../../../../shared/js/NumberBox.jsx";

/* ==========================================================================
   Small presentational helpers
   ========================================================================== */
// A section title in the Typography tab. Same type as ZEditor's Format-panel section titles
// (apps/ZEditor/src/ui/controls/PanelSection.jsx): 12px semi-bold, title case.
export function SectionLabel({ children }) {
  return <h3 className="md2pdf-section-label">{children}</h3>;
}
// A section whose title folds its controls away, styled like ZEditor's PanelSection: a full-width
// row with a divider, a real button (aria-expanded) and a chevron that flips when open.
// Open/closed state lives only in memory: a reload (or leaving the Typography tab) resets it.
export function CollapsibleSection({ label, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const bodyId = React.useId();
  return (
    <section className={"md2pdf-sec" + (open ? " is-open" : "")}>
      <h3 className="md2pdf-sec-head">
        <button type="button" className="md2pdf-sec-title" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
          <span className="md2pdf-sec-name">{label}</span>
          <svg className="md2pdf-sec-caret" viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
          </svg>
        </button>
      </h3>
      <div id={bodyId} className="md2pdf-sec-body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
export function ControlField({ label, hint, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-medium text-fg-muted mb-1.5">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-fg-muted opacity-70 mt-1">{hint}</span> : null}
    </label>
  );
}
// Same toggle-switch look as the Page Numbers toggle.
export function ToggleRow({ checked, onChange, label }) {
  return (
    <div className="toggle-row mb-3">
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
      <div className="toggle-row-text">
        <p
          style={{
            margin: 0,
            color: "var(--ui-fg)",
            fontSize: "13px",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
// Colors/border/radius/padding/focus outline all come from component-kit.css's
// input[type="text"], input[type="number"] rule — only layout (w-full) and
// what the kit leaves unset (font-size, placeholder color) are added here.
export function TextInput({ value, onChange, placeholder, type = "text", inputMode, step, min }) {
  const props = {
    inputMode,
    step,
    min,
    value,
    onChange: (e) => onChange(e.target.value),
    placeholder,
    className: "w-full text-sm placeholder-fg-muted",
  };
  // A number box comes with its - and + buttons beside it (shared/js/NumberBox.jsx).
  if (type === "number") return <NumberBox {...props} />;
  return <input type={type} {...props} />;
}
// <select> isn't one of component-kit.css's covered elements — styled here
// (in styles.css, see the "select" rule) to match its input look using the
// same --ui-* tokens, rather than inventing a different visual language.
export function SelectInput({ value, onChange, children }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm">
      {children}
    </select>
  );
}
/* ==========================================================================
   Alignment icon group — four toggle buttons (left/center/right/justify).
   With allowInherit, a fifth "link" button comes first: when it's on
   (blank value) the heading follows the body text alignment, and the
   body's icon is shown dimmed. Picking any alignment icon unlinks it.
   ========================================================================== */
const ALIGN_ICON_LINES = {
  //            [x, width] for each of the 4 lines in a 16x16 box
  left: [
    [2, 12],
    [2, 8],
    [2, 12],
    [2, 6],
  ],
  center: [
    [2, 12],
    [4, 8],
    [2, 12],
    [5, 6],
  ],
  right: [
    [2, 12],
    [6, 8],
    [2, 12],
    [8, 6],
  ],
  justify: [
    [2, 12],
    [2, 12],
    [2, 12],
    [2, 7],
  ],
};
function AlignIcon({ align }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      {ALIGN_ICON_LINES[align].map(([x, w], i) => (
        <rect key={i} x={x} y={2.5 + i * 3.25} width={w} height={1.5} rx={0.75} />
      ))}
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9" />
      <path d="M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" />
    </svg>
  );
}
export function AlignField({ label, value, onChange, inheritedValue, allowInherit, hint, linkLabel = "body text" }) {
  const following = allowInherit && !value;
  const shown = following ? inheritedValue : value;
  const linkButton = allowInherit ? (
    <button
      key="link"
      type="button"
      role="radio"
      aria-checked={following}
      title={following ? `Linked to ${linkLabel} alignment` : `Link to ${linkLabel} alignment`}
      onClick={() => onChange("")}
      className={
        "border-0 border-r border-line rounded-none px-2.5 py-1.5 flex items-center " +
        (following ? "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg")
      }
    >
      <LinkIcon />
    </button>
  ) : null;
  return (
    <div className="mb-4">
      <span className="block text-xs font-medium text-fg-muted mb-1.5">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line overflow-hidden">
        {linkButton}
        {TEXT_ALIGN_OPTIONS.map((o) => {
          const active = shown === o.key;
          const cls = active
            ? following
              ? "bg-ink-alt text-fg-muted"
              : "bg-ink-alt text-accent"
            : "bg-transparent text-fg-muted hover:text-fg";
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={active && !following}
              title={o.label + (following && active ? " (following body text)" : "")}
              onClick={() => onChange(o.key)}
              className={"border-0 rounded-none px-2.5 py-1.5 flex items-center " + cls}
            >
              <AlignIcon align={o.key} />
            </button>
          );
        })}
      </div>
      {hint ? <span className="block text-[11px] text-fg-muted opacity-70 mt-1">{hint}</span> : null}
    </div>
  );
}
/* ==========================================================================
   ToC entry style row — Bold / Italic / Underline toggles plus font size
   and line spacing boxes for one heading level's entries in the ToC.
   ========================================================================== */
// Per-heading line height plus the on/off rule drawn beneath it.
export function HeadingLineControls({ level, config, updateConfig }) {
  const lh = `h${level}LineHeight`;
  const ul = `h${level}Underline`;
  return (
    <div>
      <ControlField label={`H${level} Line Height`} hint={`Default: ${DEFAULTS[lh]}`}>
        <TextInput
          type="number" step="0.1" min="0.5"
          value={config[lh]}
          onChange={(v) => updateConfig(lh, v)}
          placeholder={String(DEFAULTS[lh])}
          inputMode="decimal"
        />
      </ControlField>
      <ToggleRow checked={config[ul]} onChange={(v) => updateConfig(ul, v)} label={`Line beneath H${level}`} />
    </div>
  );
}
export function TocLevelStyle({ level, config, updateConfig }) {
  const k = "tocL" + level;
  const toggles = [
    {
      key: "Bold",
      label: "B",
      title: "Bold",
      style: {
        fontWeight: 700,
      },
    },
    {
      key: "Italic",
      label: "I",
      title: "Italic",
      style: {
        fontStyle: "italic",
        fontFamily: "Georgia, serif",
      },
    },
    {
      key: "Underline",
      label: "U",
      title: "Underline",
      style: {
        textDecoration: "underline",
      },
    },
  ];
  return (
    <div className="mb-4">
      <span className="block text-xs font-medium text-fg-muted mb-1.5">{`H${level} Entries`}</span>
      <div
        role="group"
        aria-label={`H${level} entry style`}
        className="inline-flex rounded-md border border-line overflow-hidden mb-2"
      >
        {toggles.map((t, i) => {
          const on = Boolean(config[k + t.key]);
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              title={t.title}
              onClick={() => updateConfig(k + t.key, !on)}
              className={
                "border-0 rounded-none w-8 py-1.5 text-sm leading-none " +
                (i > 0 ? "border-l border-line " : "") +
                (on ? "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg")
              }
              style={t.style}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[11px] text-fg-muted mb-1">Font Size (px)</span>
          <TextInput
            type="number"
            inputMode="decimal"
            value={config[k + "Size"]}
            onChange={(v) => updateConfig(k + "Size", v)}
            placeholder={String(config.fontSize || DEFAULTS.fontSize)}
            step="1"
            min="1"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] text-fg-muted mb-1">Line Spacing</span>
          <TextInput
            type="number"
            inputMode="decimal"
            value={config[k + "LineHeight"]}
            onChange={(v) => updateConfig(k + "LineHeight", v)}
            placeholder={String(config.lineHeight || DEFAULTS.lineHeight)}
            step="0.1"
            min="0.5"
          />
        </label>
      </div>
    </div>
  );
}

// A one-line success/error message under a toolbar (null shows nothing).
export function StatusLine({ status, className }) {
  if (!status) return null;
  return <p className={className + " text-[11px] " + (status.type === "error" ? "text-red-400" : "text-success")}>{status.message}</p>;
}
