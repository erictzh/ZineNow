// "Leave this page?" warning shared by the apps: refreshing, closing the tab or navigating away
// asks first while the app holds work that would be lost. The browser shows its own wording;
// pages can't set the text.

let hasWork = () => false;
let bypassOnce = false;
let installed = false;

// `check()` is asked at the moment the page is about to unload: true means warn.
export function warnBeforeLeaving(check) {
  hasWork = check;
  if (installed) return;
  installed = true;
  window.addEventListener("beforeunload", (e) => {
    if (bypassOnce || !hasWork()) return;
    e.preventDefault();
    e.returnValue = ""; // older browsers need this set to show the dialog
  });
}

// Skips the warning for a reload the app does itself after keeping the work safe.
export function allowNextUnload() {
  bypassOnce = true;
}
