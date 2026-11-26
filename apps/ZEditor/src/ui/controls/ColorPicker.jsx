// ZEditor's own colour picker, the same on every browser and device (the built-in one looks different on each).
//
// A square for saturation (left to right) and brightness (bottom to top), a bar for the hue, a hex box and R G B boxes to type
// in, swatches (recent colours and a zine palette), and an eyedropper where the browser has one. `ColorPickerButton` is the
// round colour button that opens it; its children (if any) are drawn inside the button.

import { buildPalette } from "../../model/colorPalette.js";
import { hexToHsv, hexToRgb, hsvToHex, parseColorText, rgbToHex } from "../../model/colorSpaces.js";

const { useState, useEffect, useRef, useLayoutEffect, useContext, createContext } = React;

// App.jsx provides a function that returns the colours the document already uses (model/documentColors.js); it is asked once, when a picker opens.
export const DocumentColorsContext = createContext(null);

const ZINE_PALETTE = ["#000000", "#1a1a1a", "#8a8a8a", "#ffffff", "#f2e8d5", "#e63946", "#ff6b00", "#ffd400", "#2fbf71", "#2a6df4", "#7b2cbf", "#ff4fa3"];
const RECENT_KEY = "zinenow.recentColors";
const RECENT_MAX = 12;

function loadRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, RECENT_MAX) : [];
  } catch (err) { return []; }
}
function rememberColor(hex) {
  try {
    const list = [hex, ...loadRecent().filter((c) => c !== hex)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch (err) { /* private window or blocked storage: recents just are not kept */ }
}

// Follows a pointer inside `ref`'s box while it is held, giving (x, y) as 0..1 fractions. Works with mouse, pen and finger.
function usePointerDrag(ref, onMove) {
  const onDown = (e) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const r = el.getBoundingClientRect();
      onMove(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
    };
    move(e);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  return { onPointerDown: onDown };
}

function PickerPanel({ value, onChange, popRef, style }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexDraft, setHexDraft] = useState(null);
  const [recent] = useState(loadRecent);
  const getDocumentColors = useContext(DocumentColorsContext);
  const [inDocument] = useState(() => (getDocumentColors ? getDocumentColors() : []));
  const svRef = useRef(null), hueRef = useRef(null);
  const [tab, setTab] = useState("picker"); // "picker" | "palette"
  const [palette] = useState(buildPalette);
  const [hovered, setHovered] = useState(null); // the palette cell under the pointer
  const named = palette.flat().find((c) => c.hex === value);

  // Something else changed the colour (a swatch, undo): follow it. Our own drags give the same hex, so they are left alone (this keeps the hue
  // when the colour is grey or black).
  useEffect(() => { if (hsvToHex(hsv.h, hsv.s, hsv.v) !== value) setHsv(hexToHsv(value)); }, [value]);

  const apply = (next) => { setHsv(next); onChange(hsvToHex(next.h, next.s, next.v)); };
  const applyHex = (hex) => { setHsv(hexToHsv(hex)); onChange(hex); };
  const svDrag = usePointerDrag(svRef, (x, y) => apply({ ...hsv, s: x, v: 1 - y }));
  const hueDrag = usePointerDrag(hueRef, (x, y) => apply({ ...hsv, h: 360 * (1 - y) }));
  const rgb = hexToRgb(value);
  const hueColor = hsvToHex(hsv.h, 1, 1);

  const setChannel = (key, text) => {
    const n = Number(text);
    if (text.trim() === "" || !Number.isFinite(n)) return;
    const next = { ...rgb, [key]: Math.min(255, Math.max(0, Math.round(n))) };
    applyHex(rgbToHex(next.r, next.g, next.b));
  };
  const swatch = (hex) => (
    <button key={hex} type="button" className={"ze-cp-swatch" + (hex === value ? " active" : "")} style={{ background: hex }} title={hex} aria-label={hex} onClick={() => applyHex(hex)} />
  );

  return (
    <div className="ze-cp" ref={popRef} style={style} role="dialog" aria-label="Colour picker">
      <div className="ze-cp-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "picker"} className={tab === "picker" ? "active" : ""} onClick={() => setTab("picker")}>Picker</button>
        <button type="button" role="tab" aria-selected={tab === "palette"} className={tab === "palette" ? "active" : ""} onClick={() => setTab("palette")}>Palette</button>
      </div>
      {tab === "palette" && (
        <div className="ze-cp-palette-wrap">
          <div className="ze-cp-palette" onMouseLeave={() => setHovered(null)}>
            {palette.flat().map((c) => (
              <button key={c.name} type="button" className={"ze-cp-cell" + (c.hex === value ? " active" : "")} style={{ background: c.hex }}
                title={c.name + " · " + c.hex} aria-label={c.name} onMouseEnter={() => setHovered(c)} onFocus={() => setHovered(c)} onClick={() => applyHex(c.hex)} />
            ))}
          </div>
          <div className="ze-cp-name">{hovered ? hovered.name + " · " + hovered.hex : named ? named.name + " · " + named.hex : value}</div>
        </div>
      )}
      <div className="ze-cp-main" hidden={tab !== "picker"}>
        <div className="ze-cp-sv" ref={svRef} {...svDrag} style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}>
          <span className="ze-cp-handle" style={{ left: hsv.s * 100 + "%", top: (1 - hsv.v) * 100 + "%" }} />
        </div>
        <div className="ze-cp-hue" ref={hueRef} {...hueDrag}>
          <span className="ze-cp-hue-handle" style={{ top: (1 - hsv.h / 360) * 100 + "%" }} />
        </div>
      </div>
      <div className="ze-cp-fields">
        <span className="ze-cp-preview" style={{ background: value }} aria-hidden="true" />
        <label className="ze-cp-field ze-cp-hex">
          <span>Hex</span>
          <input
            type="text" spellCheck="false" autoComplete="off" value={hexDraft != null ? hexDraft : value}
            onChange={(e) => { setHexDraft(e.target.value); const hex = parseColorText(e.target.value); if (hex) applyHex(hex); }}
            onBlur={() => setHexDraft(null)} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          />
        </label>
        {["r", "g", "b"].map((k) => (
          <label key={k} className="ze-cp-field ze-cp-chan">
            <span>{k.toUpperCase()}</span>
            <input type="number" min="0" max="255" inputMode="numeric" value={rgb[k]} onChange={(e) => setChannel(k, e.target.value)} />
          </label>
        ))}
      </div>
      {inDocument.length > 0 && (<div className="ze-cp-group"><span className="ze-cp-label">In this document</span><div className="ze-cp-swatches">{inDocument.map(swatch)}</div></div>)}
      {recent.length > 0 && (<div className="ze-cp-group"><span className="ze-cp-label">Recent</span><div className="ze-cp-swatches">{recent.map(swatch)}</div></div>)}
      <div className="ze-cp-group">
        <span className="ze-cp-label">Zine colours</span>
        <div className="ze-cp-swatches">{ZINE_PALETTE.map(swatch)}</div>
      </div>
      {typeof window !== "undefined" && window.EyeDropper && (
        <button type="button" className="ze-cp-eye" onClick={() => { new window.EyeDropper().open().then((r) => applyHex(r.sRGBHex.toLowerCase())).catch(() => {}); }}>
          Pick a colour from the screen
        </button>
      )}
    </div>
  );
}

// The picker panel itself, opened beside `anchorEl` (a DOM element). It closes on a press outside it (not on the anchor), on Esc, or when
// the owner stops rendering it; a colour changed meanwhile goes into the recent list at that point.
export function ColorPickerPopover({ anchorEl, value, onChange, onClose }) {
  const [pos, setPos] = useState(null);
  const popRef = useRef(null);
  const openedWith = useRef(value), latest = useRef(value);
  latest.current = value;

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const b = anchorEl.getBoundingClientRect(), w = 252, h = popRef.current ? popRef.current.offsetHeight : 380;
    const left = Math.max(8, Math.min(b.left, window.innerWidth - w - 8));
    const top = b.bottom + 6 + h > window.innerHeight ? Math.max(8, b.top - 6 - h) : b.bottom + 6;
    setPos({ left, top });
  }, [anchorEl]);

  useEffect(() => {
    const close = (e) => {
      if ((popRef.current && popRef.current.contains(e.target)) || (anchorEl && anchorEl.contains(e.target))) return;
      onClose();
    };
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", esc);
      if (latest.current !== openedWith.current) rememberColor(latest.current);
    };
  }, [anchorEl]);

  return ReactDOM.createPortal(
    <PickerPanel value={value} onChange={onChange} popRef={popRef} style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }} />,
    document.body,
  );
}

// The round colour button. `value` is "#rrggbb"; `onChange(hex)` is called as the colour changes. `className` styles the button (the
// existing "ze-format-color-input" circle by default); children are drawn inside it.
export function ColorPickerButton({ value, onChange, className = "ze-format-color-input", disabled, ariaLabel = "Colour", title, children }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  return (
    <React.Fragment>
      <button type="button" ref={btnRef} className={className} style={{ backgroundColor: value }} disabled={disabled} aria-label={ariaLabel} title={title || ariaLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => { if (!disabled) setOpen((o) => !o); }}>
        {children}
      </button>
      {open && <ColorPickerPopover anchorEl={btnRef.current} value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </React.Fragment>
  );
}
