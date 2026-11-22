// Number boxes (<input type="number">) that behave on a tablet, for every ZineNow app. Call installNumberFields()
// once at start-up.
//
// 1. You can clear a box and type a new number. Many boxes turn what is typed into a number on every
//    keystroke and put the old value straight back when the box is emptied, so the old digits could
//    never be deleted first. Now, while a box is being typed in, an empty box (or "-", "1." and the like,
//    which the browser reads as empty) is not passed on to the app. The box stays empty until a real number
//    is typed; if you leave it empty, the last good value comes back. A box that really means "empty" says
//    so with data-allow-empty (e.g. "Stop after page (empty = last)"). The app still holds the old number
//    meanwhile, and whenever it redraws (any change on screen will do that) it writes that number back into
//    the box, which looks like a last digit that can't be deleted. So while a box is held empty it also
//    refuses those write-backs; only the person typing changes it.
//
// 2. ( number )( − )( + ): every number box has a − button and a + button beside it, like T- / T+ in ZEditor's
//    text panel. The markup is  <span class="zn-num"> <input type="number"> <button class="zn-num-btn"
//    data-zn-step="-1"> <button class="zn-num-btn" data-zn-step="1"> </span>  (React apps: the NumberBox component
//    in shared/js/NumberBox.jsx; plain pages: wrapNumberInput below; styles: shared/styles/numberFields.css).
//    A press steps the box the way the browser's own spinner does (min, max, step) and tells the app the way the
//    spinner does: an `input` event without an inputType, then `change`; holding repeats. Pressing a button
//    doesn't take the focus, so a box that is being typed in keeps its keyboard and no other keyboard opens.

const HOLD_MS = 450; // before holding a button repeats
const REPEAT_MS = 80;

const isNumberBox = (el) => el instanceof HTMLInputElement && el.type === "number";
const allowsEmpty = (el) => el.hasAttribute("data-allow-empty");

// Writes a value to the box without telling the app (the app already holds that value).
const writeValue = (el, text) => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, text);

// Boxes held empty on purpose (see 1. above): box -> the box's own `value` property as it was before
// (React puts one on every box it makes, to notice changes), or null if it had none.
const held = new WeakMap();

// Makes the box ignore the app writing a value into it, until releaseEmpty(). Reading it is unchanged.
function holdEmpty(el) {
  if (held.has(el)) return;
  const own = Object.getOwnPropertyDescriptor(el, "value"); // the app's framework wraps it; absent on a plain box
  held.set(el, own || null);
  if (!own || !own.get || !own.configurable) return;
  Object.defineProperty(el, "value", {
    configurable: true,
    enumerable: own.enumerable,
    get() { return own.get.call(this); },
    set() { /* the app redrew and wrote its old number back: not while the person is typing */ },
  });
}

// Gives the box back to the app. Always called before an edit reaches the app, so the app's own
// bookkeeping (and its writes) work as usual for what is typed next.
function releaseEmpty(el) {
  if (!held.has(el)) return;
  const own = held.get(el);
  held.delete(el);
  if (own) Object.defineProperty(el, "value", own);
  else delete el.value; // nothing to put back: the inherited one applies
}

// ---- Plain pages: put the − and + buttons beside number boxes that no framework draws -------------------------

function makeButton(dir) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "zn-num-btn";
  b.tabIndex = -1;
  b.dataset.znStep = String(dir);
  b.textContent = dir < 0 ? "−" : "+";
  b.setAttribute("aria-label", dir < 0 ? "Decrease" : "Increase");
  b.title = dir < 0 ? "Decrease" : "Increase";
  return b;
}

// Wraps one number box with its buttons (a no-op if it already has them, or says data-no-steppers). Only for
// pages whose markup no framework owns: moving a box that React made would break React.
export function wrapNumberInput(input) {
  if (!input || !input.parentNode || input.closest(".zn-num") || input.hasAttribute("data-no-steppers")) return input;
  const wrap = document.createElement("span");
  wrap.className = "zn-num";
  input.parentNode.insertBefore(wrap, input);
  wrap.append(input, makeButton(-1), makeButton(1));
  return wrap;
}

export function wrapNumberInputs(root = document) {
  root.querySelectorAll('input[type="number"]').forEach(wrapNumberInput);
}

// ---- Behaviour -------------------------------------------------------------------------------------------------

export function installNumberFields() {
  const lastGood = new WeakMap(); // box -> the last non-empty value it had

  // ---- 1. Clearing a box -----------------------------------------------------------------------
  document.addEventListener("focusin", (e) => {
    if (isNumberBox(e.target) && e.target.value !== "") lastGood.set(e.target, e.target.value);
  }, true);

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!isNumberBox(el)) return;
    if (el.value !== "") { releaseEmpty(el); lastGood.set(el, el.value); return; }
    if (allowsEmpty(el) || document.activeElement !== el) return;
    holdEmpty(el);
    e.stopImmediatePropagation(); // being typed in: no number yet, so the app hears nothing
  }, true);

  // Leaving an empty box (the `change` comes first, then the focus leaves): the last good value returns,
  // and no app code ever saw the empty box.
  const restoreIfEmpty = (el) => {
    if (el.value !== "" || allowsEmpty(el) || !lastGood.has(el)) { releaseEmpty(el); return false; }
    releaseEmpty(el);
    writeValue(el, lastGood.get(el));
    return true;
  };
  document.addEventListener("change", (e) => {
    if (isNumberBox(e.target) && restoreIfEmpty(e.target)) e.stopImmediatePropagation();
  }, true);
  document.addEventListener("focusout", (e) => {
    if (isNumberBox(e.target)) restoreIfEmpty(e.target);
  }, true);

  // ---- 2. The − and + buttons ------------------------------------------------------------------
  // One step the way the browser's spinner makes it; false at a limit (or if the box can't step).
  function stepBy(el, dir) {
    const before = el.value;
    // An empty box that shows a default as its placeholder steps from that default, not from zero.
    if (before === "" && el.placeholder !== "" && isFinite(Number(el.placeholder))) writeValue(el, el.placeholder);
    const start = el.value;
    try { if (dir > 0) el.stepUp(); else el.stepDown(); } catch (err) { return false; }
    // 0.1 + 0.1 style float noise: round to the step's decimals
    const dec = (String(el.step).split(".")[1] || "").length;
    if (dec && el.value !== "" && isFinite(Number(el.value))) writeValue(el, String(Number(Number(el.value).toFixed(dec))));
    if (el.value === start && before !== "") return false;
    el.dispatchEvent(new Event("input", { bubbles: true })); // no inputType: how the browser's spinner reports it
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  let holdTimer = 0;
  let repeatTimer = 0;
  const stop = () => { clearTimeout(holdTimer); clearInterval(repeatTimer); holdTimer = repeatTimer = 0; };
  const buttonOf = (e) => (e.target instanceof Element ? e.target.closest(".zn-num-btn") : null);
  const boxOf = (button) => (button.parentElement ? button.parentElement.querySelector('input[type="number"]') : null);

  document.addEventListener("pointerdown", (e) => {
    const button = buttonOf(e);
    if (!button || button.disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    const el = boxOf(button);
    if (!el || el.disabled || el.readOnly) return;
    e.preventDefault(); // the focus stays where it is: a box being typed in keeps its keyboard, no other one opens
    const dir = Number(button.dataset.znStep) || 0;
    stop();
    stepBy(el, dir);
    holdTimer = setTimeout(() => { repeatTimer = setInterval(() => { if (!stepBy(el, dir)) stop(); }, REPEAT_MS); }, HOLD_MS);
    const release = () => {
      stop();
      // A box that applies what is typed when it loses focus (a draft + Enter or blur) gets that moment too.
      if (document.activeElement !== el) el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    };
    window.addEventListener("pointerup", release, { once: true });
    window.addEventListener("pointercancel", release, { once: true });
  }, true);

  // The click that follows a press must not reach the app: a button inside a menu row would otherwise close the menu.
  for (const type of ["mousedown", "mouseup", "click"]) {
    document.addEventListener(type, (e) => {
      if (buttonOf(e)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
}
