// Searchable font picker, with the option to load the computer's own fonts.

const { useState, useEffect, useRef, useMemo } = React;

/* ==========================================================================
   Font combobox — searchable, supports typing to filter, plus a button
   that loads the user's local system fonts via window.queryLocalFonts()
   ========================================================================== */
export function FontCombobox({ fontOptions, setFontOptions, value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', message }
  const [loadingFonts, setLoadingFonts] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    setQuery(value || "");
  }, [value]);
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(value || "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fontOptions;
    return fontOptions.filter((f) => f.toLowerCase().includes(q));
  }, [fontOptions, query]);
  function selectFont(font) {
    onChange(font);
    setQuery(font);
    setOpen(false);
  }
  async function handleLoadLocalFonts() {
    setStatus(null);
    if (!("queryLocalFonts" in window)) {
      setStatus({
        type: "error",
        message:
          "Local Font Access is not supported in this browser. Try Chrome or Edge 103+ (over HTTPS or localhost).",
      });
      return;
    }
    setLoadingFonts(true);
    try {
      const availableFonts = await window.queryLocalFonts();
      const families = Array.from(new Set(availableFonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b));
      setFontOptions((prev) => Array.from(new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
      setStatus({
        type: "success",
        message: `Loaded ${families.length} local system fonts.`,
      });
    } catch (err) {
      const denied = err && (err.name === "NotAllowedError" || /permission/i.test(err.message || ""));
      setStatus({
        type: "error",
        message: denied
          ? "Permission to read local fonts was denied."
          : "Could not load local fonts: " + (err && err.message ? err.message : String(err)),
      });
    } finally {
      setLoadingFonts(false);
    }
  }
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search fonts…"
          className="w-full text-sm pr-8 placeholder-fg-muted"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg bg-transparent border-0 p-0"
          aria-label="Toggle font list"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-line bg-ink-card shadow-lg">
          <ul className="md2ebook-combobox-list py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-fg-muted">No fonts match "{query}"</li>
            ) : (
              filtered.map((font) => (
                <li key={font}>
                  <button
                    type="button"
                    onClick={() => selectFont(font)}
                    style={{
                      fontFamily: `'${font}', sans-serif`,
                    }}
                    className={
                      "w-full text-left px-3 py-1.5 text-sm border-0 hover:bg-ink-alt " +
                      (font === value ? "bg-ink-alt text-accent font-medium" : "bg-transparent text-fg font-normal")
                    }
                  >
                    {font}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleLoadLocalFonts}
          disabled={loadingFonts}
          className="inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {loadingFonts ? (
            <svg className="md2ebook-spinner" width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
          )}
          Load Local System Fonts
        </button>
      </div>
      {status ? (
        <p className={"mt-1.5 text-[11px] " + (status.type === "error" ? "text-red-400" : "text-success")}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
