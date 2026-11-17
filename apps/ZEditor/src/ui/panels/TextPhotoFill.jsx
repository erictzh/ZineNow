// Photo-through-letters section of the text panel.

import { TEXT_PHOTO_CONTROLS, TEXT_PHOTO_PROPS } from "../../model/text/textControls.js";
import { readPhotoFile } from "../../io/images.js";
import { ControlList } from "../controls/ControlList.jsx";
import { PanelSection, resetPatch } from "../controls/PanelSection.jsx";
const { useState, useRef } = React;

// The text panel's "photo through the letters" section: ticking it asks
// for a photo, unticking removes it.
export function TextPhotoFill({ ann, patch }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const hasPhoto = Boolean(ann.fillSrc);
  async function handleChosen(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      setError(null);
      const { src, width, height } = await readPhotoFile(file);
      patch({ fillSrc: src, fillNatW: width, fillNatH: height });
    } catch (err) {
      setError(err.message);
    }
  }
  const choose = () => inputRef.current && inputRef.current.click();
  return (
    <React.Fragment>
      <PanelSection
        id="text.photo"
        title="Photo fill"
        checked={hasPhoto}
        hint="Shows a photo through the letters. Lower its opacity to let the text color or gradient show through."
        onToggle={(on) => (on ? choose() : patch(Object.fromEntries(TEXT_PHOTO_PROPS.map((prop) => [prop, undefined]))))}
        onReset={() => patch(resetPatch(TEXT_PHOTO_CONTROLS))}
      >
        <div className="ze-format-field">
          <div className="ze-format-row">
            <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={choose}>Change photo…</button>
          </div>
        </div>
        <ControlList controls={TEXT_PHOTO_CONTROLS} source={ann} onPatch={patch} />
      </PanelSection>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleChosen} />
      {error && <span className="ze-format-hint is-error" style={{ padding: "8px 16px", margin: 0 }}>{error}</span>}
    </React.Fragment>
  );
}
