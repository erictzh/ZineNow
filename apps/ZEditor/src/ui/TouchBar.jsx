// The touch bar: a small floating bar over the bottom-left of the canvas, shown only while a finger
// is being used (styles/touch.css shows it under <html data-ze-input="touch">). It stands in for
// what a keyboard gives: Shift, Alt and Ctrl (sticky toggles, see ui/touchInput.js) and the Delete,
// Ctrl+C/Ctrl+V, C (crop) keys — those are sent as the very same key presses the keyboard would
// make (state/useKeyboardShortcuts.js), so each button does exactly what its key does.

import { setTouchModifier } from "./touchInput.js";

const { useState, useEffect } = React;

function pressKey(key, mods) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods }));
}

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

// `selectedAnn` is the selected item (the main one, if several are), or null; `onEditText` starts
// typing in a text box. The item buttons only show with an item selected (the Delete key deletes
// the page otherwise) and not while typing (they'd act on the box being typed in).
export function TouchBar({ selectedAnn, isEditing, isCropping, onEditText, marqueePolygonOpen }) {
  const [shift, setShift] = useState(false);
  const [alt, setAlt] = useState(false);
  const [ctrl, setCtrl] = useState(false);
  useEffect(() => { setTouchModifier("shift", shift); }, [shift]);
  useEffect(() => { setTouchModifier("alt", alt); }, [alt]);
  useEffect(() => { setTouchModifier("ctrl", ctrl); }, [ctrl]);
  useEffect(() => () => { setTouchModifier("shift", false); setTouchModifier("alt", false); setTouchModifier("ctrl", false); }, []);

  const hasSelection = Boolean(selectedAnn) && !isEditing;
  const keep = (e) => e.preventDefault(); // don't take the focus (or a text box's caret) away
  return (
    <div className="ze-touch-bar" role="toolbar" aria-label="Touch controls">
      <button
        type="button" className={"ze-touch-btn ze-touch-key" + (shift ? " is-on" : "")} aria-pressed={shift} onMouseDown={keep}
        title="Shift, held until tapped again: add to the selection, keep proportions, snap turns to 15°, draw at 45°"
        onClick={() => setShift((v) => !v)}
      >
        Shift
      </button>
      <button
        type="button" className={"ze-touch-btn ze-touch-key" + (alt ? " is-on" : "")} aria-pressed={alt} onMouseDown={keep}
        title="Alt, held until tapped again: move without snapping to guides, pick one item out of a group"
        onClick={() => setAlt((v) => !v)}
      >
        Alt
      </button>
      <button
        type="button" className={"ze-touch-btn ze-touch-key" + (ctrl ? " is-on" : "")} aria-pressed={ctrl} onMouseDown={keep}
        title="Ctrl, held until tapped again: add or take out one page or layer in the lists, pick the top layer on the page"
        onClick={() => setCtrl((v) => !v)}
      >
        Ctrl
      </button>
      {marqueePolygonOpen && <span className="ze-touch-sep" aria-hidden="true" />}
      {marqueePolygonOpen && (
        <button type="button" className="ze-touch-btn ze-touch-key" title="Close the polygon (Enter)" aria-label="Close the polygon" onMouseDown={keep} onClick={() => pressKey("Enter")}>Close</button>
      )}
      {marqueePolygonOpen && (
        <button type="button" className="ze-touch-btn ze-touch-key" title="Take the last point back (Backspace)" aria-label="Undo the last point" onMouseDown={keep} onClick={() => pressKey("Backspace")}>Undo point</button>
      )}
      {hasSelection && <span className="ze-touch-sep" aria-hidden="true" />}
      {hasSelection && selectedAnn && selectedAnn.type === "text" && (
        <button type="button" className="ze-touch-btn" title="Edit text" aria-label="Edit text" onMouseDown={keep} onClick={() => onEditText(selectedAnn.id)}>
          <Icon><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M13.5 6.5l4 4" /></Icon>
        </button>
      )}
      {hasSelection && selectedAnn && selectedAnn.type === "image" && (
        <button
          type="button" className={"ze-touch-btn" + (isCropping ? " is-on" : "")} aria-pressed={isCropping} onMouseDown={keep}
          title={isCropping ? "Done cropping" : "Crop (the image's rotation must be 0°)"} aria-label="Crop"
          onClick={() => pressKey("c")}
        >
          <Icon><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M2 6h14a2 2 0 0 1 2 2v14" /></Icon>
        </button>
      )}
      {hasSelection && selectedAnn && (
        <button
          type="button" className={"ze-touch-btn" + (selectedAnn.clipToBelow ? " is-on" : "")} aria-pressed={Boolean(selectedAnn.clipToBelow)} onMouseDown={keep}
          title="Clipping mask: show this layer only inside the layer below it" aria-label="Clipping mask"
          onClick={() => pressKey("g", { ctrlKey: true, altKey: true })}
        >
          <Icon><path d="M5 4v8a3 3 0 0 0 3 3h11" /><path d="M15 11l4 4-4 4" /></Icon>
        </button>
      )}
      {hasSelection && selectedAnn && (
        <button
          type="button" className="ze-touch-btn" title="Duplicate" aria-label="Duplicate" onMouseDown={keep}
          onClick={() => { pressKey("c", { ctrlKey: true }); pressKey("v", { ctrlKey: true }); }}
        >
          <Icon><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Icon>
        </button>
      )}
      {hasSelection && (
        <button type="button" className="ze-touch-btn ze-touch-danger" title="Delete" aria-label="Delete" onMouseDown={keep} onClick={() => pressKey("Delete")}>
          <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Icon>
        </button>
      )}
    </div>
  );
}
