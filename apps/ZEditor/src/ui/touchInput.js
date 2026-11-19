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
// On the canvas area one finger edits and two fingers scroll (the browser's own scrolling is
// off there: styles/touch.css). So a finger press waits a moment (FINGER_HOLD_MS, or until it
// moves) before it acts: if a second finger lands in that time it's a scroll, and nothing is
// edited. A pen never waits.
//
// It also:
//  - counts a finger landing just below or beside a ruler as on the ruler (they're thin, and a
//    finger reports a point a little lower than where it seems to touch),
//  - turns a double tap into a double-click (editing text starts on double-click),
//  - stops a long press from opening the browser's own menu over the page,
//  - marks <html data-ze-input="touch|mouse"> after every press, which the stylesheet uses to
//    give handles bigger targets only while a finger is being used (styles/touch.css).
//
// Text fields (and the typeset text surface, which handles pointer events itself) are left to
// the browser: a real tap is what focuses them and brings up the on-screen keyboard.

// Where a finger or pen press is treated as a mouse press. Keep in step with the touch-action
// rule in styles/touch.css.
const DRAG_SURFACES = ".ze-page, .ze-ruler, .ze-ruler-guide, .ze-layers-head";
// Left to the browser even inside a drag surface.
const NATIVE_TARGETS = "input, textarea, select, button, [contenteditable], .ze-typeset-surface";
// Where two fingers scroll the canvas (the pane, the page in it, and the rulers around it).
const SCROLL_AREA = ".ze-ruler-frame";

const FINGER_HOLD_MS = 120; // how long a finger press waits for a possible second finger
const RULER_SLOP_PX = 12; // a finger this close below/beside a ruler counts as on it
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

// The ruler a finger at (x, y) is meant for: on it, or just below the top one / just right of
// the left one.
function rulerNear(x, y) {
  for (const ruler of document.querySelectorAll(".ze-ruler")) {
    const r = ruler.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const top = ruler.classList.contains("ze-ruler-top");
    const inside = top
      ? x >= r.left && x <= r.right && y >= r.top && y <= r.bottom + RULER_SLOP_PX
      : y >= r.top && y <= r.bottom && x >= r.left && x <= r.right + RULER_SLOP_PX;
    if (inside) return ruler;
  }
  return null;
}

export function installTouchInput() {
  if (typeof window === "undefined" || !window.PointerEvent) return () => {};
  const root = document.documentElement;
  const fingers = new Map(); // pointerId -> { x, y } for every finger down on the canvas area
  let pending = null; // a finger press waiting to see if a second finger follows
  let active = null; // { id, target, x, y, moved } for the press being forwarded as mouse events
  let pan = null; // { pane, mid } while two fingers scroll the canvas
  let lastTap = null; // { time, x, y } for spotting a double tap
  let lastTouchTime = 0;

  const markInput = (e) => {
    const kind = e.pointerType === "mouse" ? "mouse" : "touch";
    if (root.dataset.zeInput !== kind) root.dataset.zeInput = kind;
  };
  const midpoint = () => {
    const [a, b] = [...fingers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  // Starts forwarding a press as mouse events (and replays any moves it made while waiting).
  function begin(press) {
    active = { id: press.id, target: press.target, x: press.down.clientX, y: press.down.clientY, moved: false };
    send(press.target, "mousedown", press.down);
    for (const move of press.moves) forwardMove(move);
  }
  function flushPending() {
    if (!pending) return;
    const press = pending;
    clearTimeout(press.timer);
    pending = null;
    begin(press);
  }
  function forwardMove(e) {
    if (Math.hypot(e.clientX - active.x, e.clientY - active.y) > TAP_SLOP_PX) active.moved = true;
    send(active.target, "mousemove", e);
  }

  function onPointerDown(e) {
    markInput(e);
    if (e.pointerType === "mouse") return;
    lastTouchTime = Date.now();
    const isFinger = e.pointerType === "touch";
    let target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (isFinger) {
      const ruler = rulerNear(e.clientX, e.clientY);
      if (ruler) target = ruler;
    }
    const inScrollArea = Boolean(target.closest(SCROLL_AREA));
    const surface = target.closest(DRAG_SURFACES) && !target.closest(NATIVE_TARGETS);

    if (isFinger && inScrollArea) {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // A second finger that lands a little late, after the first press has started but before it
      // has moved anywhere: still a scroll. The first press ends where it began, as a tap.
      if (fingers.size === 2 && active && !active.moved && fingers.has(active.id)) {
        const first = active;
        active = null;
        send(first.target, "mouseup", { clientX: first.x, clientY: first.y, screenX: e.screenX, screenY: e.screenY, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
        lastTap = null;
      }
      if (fingers.size === 2 && !active) {
        // Second finger: it's a scroll. A press still waiting is dropped, unseen by the editor.
        if (pending) { clearTimeout(pending.timer); pending = null; }
        pan = { pane: target.closest(SCROLL_AREA).querySelector(".preview-pane"), mid: midpoint() };
        e.preventDefault();
        return;
      }
      if (fingers.size > 1 || pan) { e.preventDefault(); return; } // a third finger, or one left from a scroll
    }
    if (active || pending || !surface) return;
    // None of the browser's own (tap-only) mouse events, which would arrive a second time after
    // ours; the tap's click still comes through. (Scrolling is stopped by touch-action: none in
    // styles/touch.css: by the time this runs, that has been decided.)
    e.preventDefault();
    const press = { id: e.pointerId, target, down: e, moves: [] };
    if (isFinger && inScrollArea) {
      pending = press;
      press.timer = setTimeout(flushPending, FINGER_HOLD_MS);
    } else {
      begin(press);
    }
  }

  function onPointerMove(e) {
    if (e.pointerType === "mouse") {
      if (root.dataset.zeInput === "touch" && e.buttons === 0) markInput(e); // back on the mouse
      return;
    }
    if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pan) {
      if (fingers.size < 2) return;
      const mid = midpoint();
      if (pan.pane) {
        pan.pane.scrollLeft -= mid.x - pan.mid.x;
        pan.pane.scrollTop -= mid.y - pan.mid.y;
      }
      pan.mid = mid;
      return;
    }
    if (pending && e.pointerId === pending.id) {
      pending.moves.push(e);
      if (Math.hypot(e.clientX - pending.down.clientX, e.clientY - pending.down.clientY) > TAP_SLOP_PX) flushPending();
      return;
    }
    if (active && e.pointerId === active.id) forwardMove(e);
  }

  function onPointerEnd(e) {
    fingers.delete(e.pointerId);
    if (pan) {
      if (fingers.size < 2) pan = null; // the finger still down does nothing until it's lifted
      return;
    }
    if (pending && e.pointerId === pending.id) {
      if (e.type === "pointercancel") { clearTimeout(pending.timer); pending = null; return; }
      flushPending(); // a quick tap: its press goes out now, then its release below
    }
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
    if (Date.now() - lastTouchTime < 1000 && e.target instanceof Element && e.target.closest(SCROLL_AREA + ", " + DRAG_SURFACES)) e.preventDefault();
  }

  // Capture phase on window: these run before anything on the page, and the pointerdown one has
  // to be non-passive to be allowed to cancel the browser's mouse events.
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
