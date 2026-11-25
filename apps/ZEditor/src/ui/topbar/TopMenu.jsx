// Topbar dropdown menu shell and its menu items.

const { useState, useRef, useEffect, useLayoutEffect } = React;

// ---- Topbar menus — the topbar is a compact menu bar (Page / Project /
// Export). TopMenu is the shared dropdown shell: a trigger button plus a
// panel that closes on click-outside or Escape, same pattern as
// FontCombobox. Its contents only mount while open, so any view state
// inside (like the Page menu's "Customize…" sub-view) resets each time.
export function TopMenu({ label, solid, children }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // The panel hangs right-aligned under its trigger; on a narrow window
  // that can push it off the left edge, so nudge it back on screen.
  // Re-checked whenever its size changes (e.g. into a Customize view).
  const menuRef = useRef(null);
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    const fit = () => {
      menu.style.transform = "";
      const { left, width } = menu.getBoundingClientRect();
      // Screen pixels vs the menu's own: they differ when Interface size zooms the top bar.
      const zoom = menu.offsetWidth ? width / menu.offsetWidth : 1;
      if (left < 8) menu.style.transform = `translateX(${(8 - left) / zoom}px)`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(menu);
    window.addEventListener("resize", fit);
    return () => { observer.disconnect(); window.removeEventListener("resize", fit); };
  }, [open]);

  return (
    <div className="ze-topbar-control" ref={containerRef}>
      <button
        type="button"
        className={"ze-menu-trigger" + (solid ? " btn-solid" : "") + (open ? " open" : "")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
        </svg>
      </button>
      {open && (
        <div className="ze-menu" role="menu" ref={menuRef}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

// A tick box row in a TopMenu. Does not close the menu.
export function MenuCheck({ label, hint, checked, disabled, onChange }) {
  return (
    <label className={"ze-menu-item ze-menu-check" + (disabled ? " disabled" : "")} title={hint}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="ze-menu-item-text"><span>{label}</span></span>
    </label>
  );
}

// A plain action row in a TopMenu. Runs the action, then closes the menu.
// `detail` is a muted second line (e.g. the file Save writes to);
// `shortcut` sits on the right.
export function MenuItem({ label, detail, shortcut, hint, disabled, onClick, close }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="ze-menu-item"
      disabled={disabled}
      title={hint}
      onClick={() => { close(); onClick(); }}
    >
      <span className="ze-menu-item-text">
        <span>{label}</span>
        {detail && <span className="ze-menu-item-detail">{detail}</span>}
      </span>
      {shortcut && <span className="ze-menu-item-shortcut">{shortcut}</span>}
    </button>
  );
}
