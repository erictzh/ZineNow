// Touch and pen support for the canvas, without touching any mouse code.
//
// Every drag in the editor (moving, resizing and turning items, drawing, erasing, cropping,
// measuring, ruler guides, the Layers panel's header) is written against mouse events:
// onMouseDown, then window mousemove/mouseup (pointer.js trackPointerDrag). A browser only turns
// a finger *tap* into mouse events — a finger *drag* scrolls the page instead — so on a tablet
// none of those drags worked.
//
// Rather than rewrite each of them (and risk changing how they behave with a mouse), this bridge
// feeds finger and pen presses into those same handlers: a press on a drag surface (DRAG_SURFACES)
// is sent on as mousedown, the moves as mousemove and the release as mouseup, carrying the same
// position and Shift/Alt/Ctrl flags. Mouse input never goes through here.
//
// It also:
//  - turns a double tap into a double-click (editing text starts on double-click),
//  - stops a long press from opening the browser's own menu over the page,
//  - marks <html data-ze-input="touch|mouse"> after every press, which the stylesheet uses to
//    give handles bigger targets only while a finger is being used (styles/touch.css).
//
// Text fields (and the typeset text surface, which handles pointer events itself) are left to
// the browser: a real tap is what focuses them and brings up the on-screen keyboard.

// Where a finger or pen press is treated as a mouse press. Keep in step with the touch-action
// rule in styles/touch.css, which stops these from scrolling the page.
const DRAG_SURFACES = ".ze-page, .ze-ruler, .ze-ruler-guide, .ze-layers-head";
// Left to the browser even inside a drag surface.
const NATIVE_TARGETS = "input, textarea, select, [contenteditable], .ze-typeset-surface";

const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 24;
const TAP_SLOP_PX = 10; // more movement than this and it was a drag, not a tap

function mouseEventFrom(type, e, extra) {
  return new MouseEvent(type, {
    bubbles: type !== "mouseleave",
    cancelable: true,
    view: window,
    clientX: e.clientX,
    clientY: e.clientY,
    screenX: e.screenX,
    screenY: e.screenY,
    button: 0,
    buttons: type === "mouseup" || type === "dblclick" ? 0 : 1,
    detail: type === "dblclick" ? 2 : 1,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    ...extra,
  });
}

// Sends a made-up mouse event to `el`, or to the document if `el` has since left the page
// (a re-render can replace the element that was pressed).
function send(el, type, e, extra) {
  const target = el && el.isConnected ? el : document;
  target.dispatchEvent(mouseEventFrom(type, e, extra));
}

export function installTouchInput() {
  if (typeof window === "undefined" || !window.PointerEvent) return () => {};
  const root = document.documentElement;
  let active = null; // { id, target, x, y, moved } for the finger/pen being forwarded
  let lastTap = null; // { time, x, y, target } for spotting a double tap
  let lastTouchTime = 0;

  const markInput = (e) => {
    const kind = e.pointerType === "mouse" ? "mouse" : "touch";
    if (root.dataset.zeInput !== kind) root.dataset.zeInput = kind;
  };

  function onPointerDown(e) {
    markInput(e);
    if (e.pointerType === "mouse") return;
    lastTouchTime = Date.now();
    if (active) return; // a second finger: ignored (room for pinch-to-zoom later)
    const target = e.target instanceof Element ? e.target : null;
    if (!target || !target.closest(DRAG_SURFACES) || target.closest(NATIVE_TARGETS)) return;
    // None of the browser's own (tap-only) mouse events, which would arrive a second time after
    // this one; the tap's click still comes through. (Scrolling is stopped by touch-action: none
    // on these surfaces, in styles/touch.css: by the time this runs, that has been decided.)
    e.preventDefault();
    active = { id: e.pointerId, target, x: e.clientX, y: e.clientY, moved: false };
    send(target, "mousedown", e);
  }

  function onPointerMove(e) {
    if (e.pointerType === "mouse") {
      if (root.dataset.zeInput === "touch" && e.buttons === 0) markInput(e); // back on the mouse
      return;
    }
    if (!active || e.pointerId !== active.id) return;
    if (Math.hypot(e.clientX - active.x, e.clientY - active.y) > TAP_SLOP_PX) active.moved = true;
    send(active.target, "mousemove", e);
  }

  function onPointerEnd(e) {
    if (!active || e.pointerId !== active.id) return;
    const { target, moved } = active;
    active = null;
    send(target, "mouseup", e);
    // A finger has no hover: tell hover-driven bits (the eraser's brush outline, ruler
    // readouts) that it has left, as a mouse would on leaving.
    send(target, "mouseout", e, { relatedTarget: null });
    const pane = target.isConnected && target.closest(".preview-pane");
    if (pane) pane.dispatchEvent(mouseEventFrom("mouseleave", e));
    if (e.type === "pointercancel" || moved) {
      lastTap = null;
      return;
    }
    const now = Date.now();
    if (lastTap && now - lastTap.time < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
      lastTap = null;
      // After the click this tap is about to produce, as with a real double-click.
      setTimeout(() => send(target, "dblclick", e), 0);
    } else {
      lastTap = { time: now, x: e.clientX, y: e.clientY };
    }
  }

  // The double-click the browser may make from a double tap: dropped, ours stands in for it.
  function onDblClick(e) {
    if (e.isTrusted && Date.now() - lastTouchTime < 1000) e.stopPropagation();
  }

  // A long press opens the browser's menu (Save image…) over the page: not wanted there.
  function onContextMenu(e) {
    if (Date.now() - lastTouchTime < 1000 && e.target instanceof Element && e.target.closest(DRAG_SURFACES)) e.preventDefault();
  }

  // Capture phase on window: these run before anything on the page, and the pointerdown one has
  // to be non-passive to be allowed to stop scrolling.
  window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: false });
  window.addEventListener("pointermove", onPointerMove, true);
  window.addEventListener("pointerup", onPointerEnd, true);
  window.addEventListener("pointercancel", onPointerEnd, true);
  window.addEventListener("dblclick", onDblClick, true);
  window.addEventListener("contextmenu", onContextMenu, true);
  return () => {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerEnd, true);
    window.removeEventListener("pointercancel", onPointerEnd, true);
    window.removeEventListener("dblclick", onDblClick, true);
    window.removeEventListener("contextmenu", onContextMenu, true);
  };
}
