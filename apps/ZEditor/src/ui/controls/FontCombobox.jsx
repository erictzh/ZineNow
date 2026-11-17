// Searchable font picker, with system fonts and font upload.

import { addCustomFontFile } from "../../io/customFonts.js";
const { useState, useRef, useEffect, useMemo } = React;

// ---- Searchable font picker, with an optional "load your system's
// fonts" button via the Local Font Access API (Chrome/Edge only, needs
// a permission grant) — same pattern Markdown-to-PDF uses.
export function FontCombobox({ fontOptions, setFontOptions, value, onChange }) {
  const [query, setQuery] = useState(value || "");
  // Only filter once the user has typed: the box starting out showing the
  // current font's name shouldn't hide every other font.
  const [typed, setTyped] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  // The font in use before arrow-key previewing began, so Escape or a
  // click away can put it back. Null when not previewing.
  const previewFromRef = useRef(null);
  const listRef = useRef(null);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [loadingFonts, setLoadingFonts] = useState(false);
  const containerRef = useRef(null);
  const uploadInputRef = useRef(null);

  // Follow outside changes to the font, but not our own previews, which
  // would overwrite what the user typed into the search box.
  useEffect(() => { if (previewFromRef.current === null) { setQuery(value || ""); setTyped(false); } }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        cancelPreview();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = useMemo(() => {
    const q = typed ? query.trim().toLowerCase() : "";
    if (!q) return fontOptions;
    return fontOptions.filter((f) => f.toLowerCase().includes(q));
  }, [fontOptions, query, typed]);

  // Keep the highlighted font scrolled into view.
  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return;
    const item = listRef.current.children[highlight];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  function openList() {
    if (!open) setHighlight(filtered.indexOf(value));
    setOpen(true);
  }

  function selectFont(font) {
    previewFromRef.current = null;
    onChange(font);
    setQuery(font);
    setTyped(false);
    setOpen(false);
  }

  // Escape / click away: undo any arrow-key preview and close.
  function cancelPreview() {
    const original = previewFromRef.current;
    previewFromRef.current = null;
    if (original !== null && original !== value) onChange(original);
    setQuery(original !== null ? original : (value || ""));
    setTyped(false);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!filtered.length) return;
      const start = open ? highlight : filtered.indexOf(value);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = start < 0 ? (step > 0 ? 0 : filtered.length - 1) : Math.min(filtered.length - 1, Math.max(0, start + step));
      setOpen(true);
      setHighlight(next);
      if (previewFromRef.current === null) previewFromRef.current = value || "";
      // Unless the user is searching, show the previewed font's name.
      if (!typed) setQuery(filtered[next]);
      onChange(filtered[next]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlight >= 0 && filtered[highlight]) selectFont(filtered[highlight]);
      else if (open && filtered.length === 1) selectFont(filtered[0]);
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); e.stopPropagation(); cancelPreview(); }
    }
  }

  async function handleUploadFont(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setStatus(null);
    try {
      const family = await addCustomFontFile(file, fontOptions);
      setFontOptions((prev) => Array.from(new Set([...prev, family])).sort((a, b) => a.localeCompare(b)));
      selectFont(family);
      setStatus({ type: "success", message: `Added "${family}". It will be saved inside the project.` });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  }

  async function handleLoadLocalFonts() {
    setStatus(null);
    if (!("queryLocalFonts" in window)) {
      setStatus({ type: "error", message: "Local Font Access isn't supported in this browser — try Chrome or Edge." });
      return;
    }
    setLoadingFonts(true);
    try {
      const availableFonts = await window.queryLocalFonts();
      const families = Array.from(new Set(availableFonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b));
      setFontOptions((prev) => Array.from(new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
      setStatus({ type: "success", message: `Loaded ${families.length} local fonts.` });
    } catch (err) {
      const denied = err && (err.name === "NotAllowedError" || /permission/i.test(err.message || ""));
      setStatus({ type: "error", message: denied ? "Permission to read local fonts was denied." : "Couldn't load local fonts." });
    } finally {
      setLoadingFonts(false);
    }
  }

  return (
    <div className="ze-fontbox" ref={containerRef}>
      <div className="ze-fontbox-input-wrap">
        <input
          type="text"
          className="ze-format-select ze-fontbox-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setTyped(true); setHighlight(-1); setOpen(true); }}
          onFocus={(e) => { e.target.select(); openList(); }}
          onKeyDown={handleKeyDown}
          placeholder="Search fonts…"
        />
        <button type="button" className="ze-fontbox-caret" onClick={() => (open ? cancelPreview() : openList())} aria-label="Toggle font list">
          <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 7.5l4.5 4.5 4.5-4.5" /></svg>
        </button>
      </div>
      {open && (
        <div className="ze-fontbox-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="ze-fontbox-empty">No fonts match "{query}"</div>
          ) : (
            filtered.map((font, i) => (
              <button
                key={font}
                type="button"
                className={"ze-fontbox-item" + (font === value ? " active" : "") + (i === highlight ? " is-highlighted" : "")}
                onMouseEnter={() => setHighlight(i)}
                style={{ fontFamily: `'${font}', sans-serif` }}
                onClick={() => selectFont(font)}
              >{font}</button>
            ))
          )}
        </div>
      )}
      <button type="button" className="ze-fontbox-load" onClick={handleLoadLocalFonts} disabled={loadingFonts}>
        {loadingFonts ? "Loading…" : "+ Load Local System Fonts"}
      </button>
      <button type="button" className="ze-fontbox-load" onClick={() => uploadInputRef.current && uploadInputRef.current.click()} title="Add a font file. It is saved inside the project, so it still works on another PC.">
        + Upload Font File…
      </button>
      <input ref={uploadInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{ display: "none" }} onChange={handleUploadFont} />
      {status && (
        <span className={"ze-format-hint" + (status.type === "error" ? " is-error" : "")}>{status.message}</span>
      )}
    </div>
  );
}
