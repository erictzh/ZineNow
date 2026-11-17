// Saved text styles section: apply, save, delete.

import { BUILT_IN_TEXT_STYLES, textStylePatch } from "../../model/text/textStyles.js";
const { useState } = React;

// The text panel's saved-styles section: click a style to give this text
// its look, or name the current look and save it.
export function TextStyles({ ann, patch, textStyles, onSaveStyle, onDeleteStyle }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState(null);
  function save() {
    const clean = name.trim();
    if (!clean) { setMessage("Type a name for the style first."); return; }
    if (BUILT_IN_TEXT_STYLES.some((s) => s.name.toLowerCase() === clean.toLowerCase())) { setMessage("That name is used by a built-in style."); return; }
    onSaveStyle(clean, ann);
    setName("");
    setMessage(`Saved "${clean}".`);
  }
  return (
    <div className="ze-format-field">
      <div className="ze-style-chips">
        {BUILT_IN_TEXT_STYLES.map((style) => (
          <button key={style.name} type="button" className="ze-format-toggle" title={`Give this text the ${style.name} look`} onClick={() => { setMessage(null); patch(textStylePatch(style)); }}>{style.name}</button>
        ))}
        {textStyles.map((style) => (
          <span key={style.name} className="ze-style-chip">
            <button type="button" className="ze-format-toggle" title={`Give this text the "${style.name}" look`} onClick={() => { setMessage(null); patch(textStylePatch(style)); }}>{style.name}</button>
            <button type="button" className="ze-style-chip-delete" title={`Delete "${style.name}"`} aria-label={`Delete style ${style.name}`} onClick={() => onDeleteStyle(style.name)}>×</button>
          </span>
        ))}
      </div>
      <div className="ze-format-row ze-style-row">
        <input type="text" className="ze-format-number ze-style-name" placeholder="Name this look…" maxLength="30" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        <button type="button" className="ze-format-toggle ze-style-save" onClick={save}>Save</button>
      </div>
      <span className="ze-format-hint">{message || "Saves the font, size, color, spacing, case and effects (not the words). Your styles are remembered in this browser and saved inside the project."}</span>
    </div>
  );
}
