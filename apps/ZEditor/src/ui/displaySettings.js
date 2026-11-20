// The gear at the bottom left of the canvas, just left of the touch bar (shared/js/displaySettings.js),
// with ZEditor's settings:
//   - Interface size: --zn-ui-zoom, a CSS zoom on the top bar, tool bar, Pages panel, Format panel
//     contents and the gear + touch bar group (styles/display.css). Not the canvas or rulers (they
//     have their own zoom and measure in screen pixels) and not the floating Layers panel.
//   - Thumbnail size: --ze-thumb-zoom on the page thumbnails, 30-100% of their usual size.
//   - Show: ze-hide-topbar on <html>, and a Side panels dropdown (both, Pages only, Format only)
//     that sets ze-hide-pages / -format (styles/display.css).
// No dark paper here on purpose: ZEditor is where colours are picked, and an inverted page would
// show them wrong.

import { installDisplaySettings } from "../../../../shared/js/displaySettings.js";

let display = null;

// Called from main.jsx before the first render, so the app never draws at the default size first.
export function installZeditorDisplaySettings() {
  display = installDisplaySettings({
    storageKey: "zeditor.displayPrefs",
    mount: false, // App.jsx places it next to the touch bar once that's rendered
    sliders: [
      { key: "uiScale", label: "Interface size", min: 75, max: 175, step: 5, initial: 100, unit: "%", cssVar: "--zn-ui-zoom", cssValue: (v) => String(v / 100) },
      { key: "thumbSize", label: "Thumbnail size", min: 30, max: 100, step: 5, initial: 100, unit: "%", cssVar: "--ze-thumb-zoom", cssValue: (v) => String(v / 100) },
    ],
    groups: [
      { title: "Show", checks: [
        { key: "hideTopbar", label: "Top bar", showMeans: true, htmlClass: "ze-hide-topbar", hint: "The title and the Page, Project and Export menus" },
      ], choices: [
        { label: "Side panels", hint: "Pages panel: the page thumbnails. Format panel: the selected item's or tool's settings.",
          initial: 2,
          flags: [{ key: "hidePages", htmlClass: "ze-hide-pages" }, { key: "hideFormat", htmlClass: "ze-hide-format" }],
          options: [
            { label: "Pages panel (left) only", values: { hideFormat: true } },
            { label: "Format panel (right) only", values: { hidePages: true } },
            { label: "Show both", values: {} },
          ] },
      ] },
    ],
  });
  return display;
}

// Puts the gear into `slot` (a ref callback in App.jsx).
export function attachDisplayGear(slot) {
  if (slot && display && display.element.parentNode !== slot) slot.appendChild(display.element);
}
