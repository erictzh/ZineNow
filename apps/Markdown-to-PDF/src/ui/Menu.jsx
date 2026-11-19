// A small dropdown menu (the top bar's File menu, the editor toolbar's Insert menu), styled like
// ZEditor's top-bar menus: a trigger button and a panel that closes on a click outside or Escape.

const { useState, useRef, useEffect, useLayoutEffect } = React;

// `trigger` is the button's content; `align` which edge of the trigger the panel lines up with;
// `keepEditorFocus` stops the trigger and items from taking the focus (and the caret) out of the
// editor when clicked. `children` is a function given { close }.
export function DropMenu({ trigger, title, align = "left", triggerClassName, keepEditorFocus, children }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A panel near the window's edge (the Insert menu when the toolbar sits at the right) would run
  // off screen, so nudge it back in, keeping 8px clear of the edge.
  const menuRef = useRef(null);
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    menu.style.transform = "";
    const { left, right, width } = menu.getBoundingClientRect();
    const limit = document.documentElement.clientWidth - 8;
    // The rect is in screen pixels, the transform in the menu's own: they differ when the
    // Interface size setting zooms the menu (UiSettings.jsx).
    const zoom = menu.offsetWidth ? width / menu.offsetWidth : 1;
    if (right > limit) menu.style.transform = `translateX(${Math.max(8 - left, limit - right) / zoom}px)`;
    else if (left < 8) menu.style.transform = `translateX(${(8 - left) / zoom}px)`;
  }, [open]);

  return (
    <div className="md2ebook-menu-wrap" ref={containerRef}>
      <button
        type="button"
        className={"md2ebook-menu-trigger" + (open ? " open" : "") + (triggerClassName ? " " + triggerClassName : "")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        onMouseDown={keepEditorFocus ? (e) => e.preventDefault() : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
        <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
        </svg>
      </button>
      {open ? (
        <div className={"md2ebook-menu md2ebook-menu-" + align} role="menu" ref={menuRef}>
          {children({ close: () => setOpen(false), keepEditorFocus })}
        </div>
      ) : null}
    </div>
  );
}

// One action row: runs `onClick` and closes the menu. `detail` is a muted second line, `shortcut`
// sits on the right, `hint` is the hover text.
export function MenuItem({ label, detail, shortcut, hint, onClick, close, keepEditorFocus, children }) {
  return (
    <div className="md2ebook-menu-row">
      <button
        type="button"
        role="menuitem"
        className="md2ebook-menu-item"
        title={hint}
        onMouseDown={keepEditorFocus ? (e) => e.preventDefault() : undefined}
        onClick={() => {
          close();
          onClick();
        }}
      >
        <span className="md2ebook-menu-item-text">
          <span>{label}</span>
          {detail ? <span className="md2ebook-menu-item-detail">{detail}</span> : null}
        </span>
        {shortcut ? <span className="md2ebook-menu-item-shortcut">{shortcut}</span> : null}
      </button>
      {children}
    </div>
  );
}

export const MenuSeparator = () => <div className="md2ebook-menu-sep" role="separator" />;
