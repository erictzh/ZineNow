// Number boxes (<input type="number">) that behave on a tablet, for every ZineNow app. One script, no
// changes to the boxes themselves. Call installNumberFields() once at start-up.
//
// 1. You can clear a box and type a new number. Many boxes turn what is typed into a number on every
//    keystroke and put the old value straight back when the box is emptied, so the old digits could
//    never be deleted first. Now, while a box is being typed in, an empty box (or "-", "1." and the like,
//    which the browser reads as empty) is not passed on to the app. The box stays empty until a real number
//    is typed; if you leave it empty, the last good value comes back. A box that really means "empty" says
//    so with data-allow-empty (e.g. "Stop after page (empty = last)").
//
// 2. Up and down buttons. Chrome on Android draws none, so while a finger is being used, a strip at the
//    right edge of every number box acts as a pair of buttons (drawn in shared/styles/numberFields.css):
//    the upper half steps up, the lower half steps down, holding repeats. Pressing it doesn't focus the box,
//    so the keyboard doesn't open. It steps the way the browser's own spinner does (min, max, step), and tells
//    the app the way the spinner does: an `input` event without an inputType, then `change`. With a mouse the
//    browser's own spinner is left alone.

const STRIP_PX = 24; // width of the button strip, as in the stylesheet (--zn-step-w)
const HOLD_MS = 450; // before holding a button repeats
const REPEAT_MS = 80;

const isNumberBox = (el) => el instanceof HTMLInputElement && el.type === "number";
const allowsEmpty = (el) => el.hasAttribute("data-allow-empty");
const touching = () => {
  const d = document.documentElement.dataset;
  return d.input === "touch" || d.zeInput === "touch"; // shared/js/inputMode.js, ZEditor's touchInput.js
};

// Writes a value to the box without telling the app (the app already holds that value).
const writeValue = (el, text) => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, text);

export function installNumberFields() {
  const lastGood = new WeakMap(); // box -> the last non-empty value it had

  // ---- 1. Clearing a box -----------------------------------------------------------------------
  document.addEventListener("focusin", (e) => {
    if (isNumberBox(e.target) && e.target.value !== "") lastGood.set(e.target, e.target.value);
  }, true);

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!isNumberBox(el)) return;
    if (el.value !== "") { lastGood.set(el, el.value); return; }
    if (allowsEmpty(el) || document.activeElement !== el) return;
    e.stopImmediatePropagation(); // being typed in: no number yet, so the app hears nothing
  }, true);

  // Leaving an empty box (the `change` comes first, then the focus leaves): the last good value returns,
  // and no app code ever saw the empty box.
  const restoreIfEmpty = (el) => {
    if (el.value !== "" || allowsEmpty(el) || !lastGood.has(el)) return false;
    writeValue(el, lastGood.get(el));
    return true;
  };
  document.addEventListener("change", (e) => {
    if (isNumberBox(e.target) && restoreIfEmpty(e.target)) e.stopImmediatePropagation();
  }, true);
  document.addEventListener("focusout", (e) => {
    if (isNumberBox(e.target)) restoreIfEmpty(e.target);
  }, true);

  // ---- 2. Up and down buttons ------------------------------------------------------------------
  // Which button (+1 up, -1 down) a press at (x, y) on `el` lands on, or 0 outside the strip.
  function buttonAt(el, x, y) {
    const r = el.getBoundingClientRect();
    if (!r.width || !el.offsetWidth) return 0;
    const scale = r.width / el.offsetWidth; // the Interface size setting zooms the controls
    if (x < r.right - STRIP_PX * scale || x > r.right || y < r.top || y > r.bottom) return 0;
    return y < r.top + r.height / 2 ? 1 : -1;
  }

  // One step the way the browser's spinner makes it; false at a limit (or if the box can't step).
  function stepBy(el, dir) {
    const before = el.value;
    try { if (dir > 0) el.stepUp(); else el.stepDown(); } catch (err) { return false; }
    if (el.value === before) return false;
    el.dispatchEvent(new Event("input", { bubbles: true })); // no inputType: how the browser's spinner reports it
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  const madeReadOnly = new WeakMap(); // box -> timer that undoes the read-only this script set
  const unlock = (el) => {
    if (!madeReadOnly.has(el)) return;
    clearTimeout(madeReadOnly.get(el));
    madeReadOnly.delete(el);
    el.readOnly = false;
  };
  let holdTimer = 0;
  let repeatTimer = 0;
  let quietUntil = 0; // the mouse events and click that follow a touch must not focus the box
  const stop = () => { clearTimeout(holdTimer); clearInterval(repeatTimer); holdTimer = repeatTimer = 0; };

  document.addEventListener("pointerdown", (e) => {
    const el = e.target;
    // A press on the box itself (outside the strip) means typing is wanted: lift the guard at once.
    if (isNumberBox(el) && madeReadOnly.has(el) && !buttonAt(el, e.clientX, e.clientY)) unlock(el);
    if (e.pointerType === "mouse" || !isNumberBox(el) || el.disabled || (el.readOnly && !madeReadOnly.has(el)) || !touching()) return;
    const dir = buttonAt(el, e.clientX, e.clientY);
    if (!dir) return;
    e.preventDefault();
    quietUntil = performance.now() + 700;
    // Read-only for a moment: even if the browser still focuses it, no keyboard opens.
    el.readOnly = true;
    clearTimeout(madeReadOnly.get(el));
    madeReadOnly.set(el, setTimeout(() => unlock(el), 700));
    if (document.activeElement === el) el.blur();
    stop();
    stepBy(el, dir);
    holdTimer = setTimeout(() => { repeatTimer = setInterval(() => { if (!stepBy(el, dir)) stop(); }, REPEAT_MS); }, HOLD_MS);
    const release = () => {
      stop();
      clearTimeout(madeReadOnly.get(el));
      madeReadOnly.set(el, setTimeout(() => unlock(el), 250)); // after the click that follows the lift
      // A box that applies what is typed when it loses focus (a draft + Enter or blur) gets that moment too.
      if (document.activeElement !== el) el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    };
    window.addEventListener("pointerup", release, { once: true });
    window.addEventListener("pointercancel", release, { once: true });
  }, true);

  for (const type of ["mousedown", "mouseup", "click"]) {
    document.addEventListener(type, (e) => {
      if (performance.now() < quietUntil && isNumberBox(e.target) && buttonAt(e.target, e.clientX, e.clientY)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }
}
