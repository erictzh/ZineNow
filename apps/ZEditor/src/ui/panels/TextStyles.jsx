// Text styles section: apply a style (the box stays linked to it), update it from a box, save a new one.

import { BUILT_IN_TEXT_STYLES } from "../../model/text/textStyles.js";
const { useState } = React;

// Styles are linked, as in a page-layout program: a box you apply a saved style to follows it. Change
// the look of the box and "Update style" makes that the style's new definition, restyling every box
// that uses it (a box's own changes since it was styled are kept). A style can be "based on" another,
// storing only what differs from it.
export function TextStyles({ ann, patch, textStyles, onSaveStyle, onDeleteStyle, styleActions }) {
  const [name, setName] = useState("");
  const [basedOn, setBasedOn] = useState("");
  const [message, setMessage] = useState(null);
  const linkedName = ann.styleName || null;
  const linkedStyle = linkedName ? textStyles.find((s) => s.name === linkedName) : null;
  const overrideCount = (ann.styleOverrides || []).length;

  function save() {
    const clean = name.trim();
    if (!clean) { setMessage("Type a name for the style first."); return; }
    if (BUILT_IN_TEXT_STYLES.some((s) => s.name.toLowerCase() === clean.toLowerCase())) { setMessage("That name is used by a built-in style."); return; }
    onSaveStyle(clean, ann, basedOn || undefined);
    patch({ styleName: clean, styleOverrides: undefined }); // this box now uses the style it just defined
    setName("");
    setMessage(`Saved "${clean}" and linked this text to it.`);
  }
  const apply = (style) => { setMessage(null); styleActions.apply(ann, style); };

  return (
    <div className="ze-format-field">
      <div className="ze-style-chips">
        {BUILT_IN_TEXT_STYLES.map((style) => (
          <button key={style.name} type="button" className="ze-format-toggle" title={`Give this text the ${style.name} look (a plain copy, not linked)`} onClick={() => apply(style)}>{style.name}</button>
        ))}
        {textStyles.map((style) => (
          <span key={style.name} className="ze-style-chip">
            <button type="button" className={"ze-format-toggle" + (style.name === linkedName ? " active" : "")} title={`Give this text the "${style.name}" look and link it to the style${style.basedOn ? ` (based on "${style.basedOn}")` : ""}`} onClick={() => apply(style)}>{style.name}</button>
            <button type="button" className="ze-style-chip-delete" title={`Delete "${style.name}"`} aria-label={`Delete style ${style.name}`} onClick={() => onDeleteStyle(style.name)}>×</button>
          </span>
        ))}
      </div>

      {linkedName && (
        <div className="ze-style-linked">
          <span className="ze-format-hint" style={{ margin: "8px 0 6px" }}>
            {linkedStyle
              ? <>Linked to “{linkedName}”{overrideCount ? ` · ${overrideCount} local change${overrideCount === 1 ? "" : "s"}` : " · matches the style"}</>
              : <>Linked to “{linkedName}”, which no longer exists.</>}
          </span>
          <div className="ze-format-row">
            {linkedStyle && (
              <button type="button" className="ze-format-toggle ze-format-toggle-wide" title={`Make this text's look the new definition of "${linkedName}", restyling every text box that uses it`} onClick={() => { styleActions.redefine(linkedName, ann); setMessage(`Updated "${linkedName}" and every text using it.`); }}>Update style</button>
            )}
            {linkedStyle && (
              <button type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={!overrideCount} title="Undo this text's own changes so it matches the style again" onClick={() => { styleActions.resetOverrides(ann); setMessage(null); }}>Reset</button>
            )}
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" title="Keep the look but stop following the style" onClick={() => { styleActions.unlink(ann); setMessage(null); }}>Unlink</button>
          </div>
        </div>
      )}

      <div className="ze-format-row ze-style-row" style={{ marginTop: 10 }}>
        <input type="text" className="ze-format-number ze-style-name" placeholder="Name this look…" maxLength="30" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        <button type="button" className="ze-format-toggle ze-style-save" onClick={save}>Save</button>
      </div>
      {textStyles.length > 0 && (
        <div className="ze-format-row" style={{ marginTop: 6 }}>
          <select className="ze-format-select" aria-label="Based on" value={basedOn} onChange={(e) => setBasedOn(e.target.value)}>
            <option value="">Not based on another style</option>
            {textStyles.map((s) => <option key={s.name} value={s.name}>Based on: {s.name}</option>)}
          </select>
        </div>
      )}
      <span className="ze-format-hint">{message || "Saves the font, size, colour, spacing, paragraph settings, case and effects (not the words) with the project. Texts using a style follow it when you Update it."}</span>
    </div>
  );
}
