// Which kind of pointer was used last: <html data-input="touch"> after a finger or pen press,
// "mouse" after a mouse press or a mouse move with no button down. An app's stylesheet uses it to
// give controls bigger targets only while a finger is being used, so nothing changes for a mouse.
// (ZEditor does the same with its own data-ze-input, in apps/ZEditor/src/ui/touchInput.js.)

export function installInputMode() {
  if (typeof window === "undefined" || !window.PointerEvent) return;
  const root = document.documentElement;
  const mark = (kind) => {
    if (root.dataset.input !== kind) root.dataset.input = kind;
  };
  window.addEventListener("pointerdown", (e) => mark(e.pointerType === "mouse" ? "mouse" : "touch"), true);
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && e.buttons === 0 && root.dataset.input === "touch") mark("mouse");
  }, true);
}
