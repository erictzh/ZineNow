// Project > Embed Fonts…: which fonts the project's text uses, which are already inside the file (uploaded fonts, or system fonts embedded earlier),
// and a switch for embedding the system fonts when saving (kept in the project file), with a checkbox per font and the total size.
// Reading a system font's file needs the browser's Local Font Access (Chrome and Edge); the first time the switch is turned on, a reminder
// that a font file inside a project is a font being shared (many fonts' licences do not allow that).

import { canReadSystemFonts, describeFaces, formatBytes, setFontLicenceSeen } from "../../io/fontEmbed.js";
const { useState, useEffect } = React;

const STATUS = {
  uploaded: "Uploaded font: always inside the project",
  embedded: "Embedded in this project",
  generic: "Only a name (there is no font file)",
};

export function EmbedFontsDialog({ open, startConfirm, onClose, pages, view }) {
  const [rows, setRows] = useState(null); // null while loading
  const [asking, setAsking] = useState(false); // the licence reminder
  const [granted, setGranted] = useState(true);
  const supported = canReadSystemFonts();

  async function load() {
    setRows(null);
    if (supported && navigator.permissions && navigator.permissions.query) {
      try { setGranted((await navigator.permissions.query({ name: "local-fonts" })).state === "granted"); } catch (e) { setGranted(true); }
    }
    setRows(await describeFaces(pages));
  }
  useEffect(() => { if (open) { setAsking(Boolean(startConfirm)); load(); } }, [open]);
  if (!open) return null;

  async function allowFonts() {
    try { await window.queryLocalFonts(); } catch (e) { /* refused */ }
    load();
  }
  const skip = view.embedFontsSkip;
  const toggleFace = (key, on) => view.setEmbedFontsSkip(on ? skip.filter((k) => k !== key) : [...skip, key]);
  const system = (rows || []).filter((r) => r.kind === "system");
  const total = system.filter((r) => !skip.includes(r.key) && r.bytes != null).reduce((a, r) => a + r.bytes, 0);
  const unreadable = system.filter((r) => !skip.includes(r.key) && r.bytes == null).length;
  const close = () => onClose();

  if (asking) {
    return (
      <div className="ze-modal-backdrop" onMouseDown={() => (startConfirm ? close() : setAsking(false))}>
        <div className="ze-modal" role="dialog" aria-label="Embed system fonts?" onMouseDown={(e) => e.stopPropagation()}>
          <div className="ze-modal-head">Embed system fonts?</div>
          <div className="ze-modal-body">
            <ul className="ze-ai-points">
              <li>The fonts this project uses will be saved <b>inside the project file</b>, so it looks the same on a computer that doesn't have them.</li>
              <li><b>Only embed fonts you are allowed to share.</b> A font file inside a project is a copy of the font, and anyone with the project can take it out. Many fonts' licences (including most that come with Windows or macOS) do not allow this; open fonts (SIL Open Font License, Apache, MIT) do.</li>
              <li>It needs a browser that can read this computer's fonts (Chrome or Edge), and each font adds about 100 KB to several MB to the file.</li>
            </ul>
          </div>
          <div className="ze-modal-actions">
            <button type="button" onClick={() => (startConfirm ? close() : setAsking(false))}>Cancel</button>
            <button type="button" className="btn-solid" onClick={() => { setFontLicenceSeen(); view.setEmbedFonts(true); if (startConfirm) close(); else setAsking(false); }}>Enable</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ze-modal-backdrop" onMouseDown={close}>
      <div className="ze-modal ze-embed-modal" role="dialog" aria-label="Embed fonts" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-head">Embed Fonts</div>
        <div className="ze-modal-body">
          <label className="ze-format-check ze-embed-master">
            <input type="checkbox" checked={view.embedFonts && supported} disabled={!supported}
              onChange={(e) => { if (!e.target.checked) view.setEmbedFonts(false); else { try { if (localStorage.getItem("zeditor.fontEmbedLicenceSeen") === "1") { view.setEmbedFonts(true); return; } } catch (err) { /* ask */ } setAsking(true); } }} />
            <span>Embed system fonts when saving this project</span>
            <span className="ze-format-hint">On by default. The choice is saved in the project file: a project saved before this existed embeds on its next Save, unless you untick this.</span>
          </label>
          {!supported && <p className="ze-format-hint is-error">This browser can't read this computer's fonts. Use Chrome or Edge to embed system fonts. Fonts you upload are always inside the project.</p>}
          {supported && !granted && (
            <div className="ze-embed-allow">
              <span className="ze-format-hint">ZEditor needs your permission to read the fonts on this computer.</span>
              <button type="button" className="ze-format-toggle ze-format-toggle-wide active" onClick={allowFonts}>Allow reading this computer's fonts</button>
            </div>
          )}
          <div className="ze-embed-list" role="list">
            {rows === null && <p className="ze-format-hint">Looking at the fonts the text uses…</p>}
            {rows && rows.length === 0 && <p className="ze-format-hint">No text in this project uses a font yet.</p>}
            {rows && rows.map((r) => (
              <label key={r.key} role="listitem" className={"ze-embed-row" + (r.kind === "system" ? "" : " is-fixed")}>
                {r.kind === "system"
                  ? <input type="checkbox" checked={!skip.includes(r.key)} disabled={!supported} onChange={(e) => toggleFace(r.key, e.target.checked)} />
                  : <input type="checkbox" checked disabled />}
                <span className="ze-embed-name">{r.label}</span>
                <span className={"ze-embed-status" + (r.kind === "system" && r.bytes == null ? " is-bad" : "")}>
                  {r.kind === "system" ? (r.bytes != null ? formatBytes(r.bytes) : "Can't read it here (allow font access, or it isn't installed on this computer)") : STATUS[r.kind]}
                </span>
              </label>
            ))}
          </div>
          {rows && system.length > 0 && (
            <p className="ze-format-hint ze-embed-total">
              {view.embedFonts && supported ? "Will be embedded when you save: " + formatBytes(total) + " in " + (system.filter((r) => !skip.includes(r.key) && r.bytes != null).length) + " font file(s)." : "Switched off: nothing will be embedded."}
              {view.embedFonts && supported && unreadable > 0 ? " " + unreadable + " could not be read." : ""}
            </p>
          )}
          <p className="ze-format-hint">Only embed fonts you are allowed to share. Styles of a font that the text does not use (for example Italic) are not embedded.</p>
        </div>
        <div className="ze-modal-actions">
          <button type="button" className="btn-solid" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  );
}
