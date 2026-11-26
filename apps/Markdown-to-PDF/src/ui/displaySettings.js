// The gear at the bottom left (shared/js/displaySettings.js) with this app's settings:
//   - Editor text size: --md2ebook-editor-font-size on the Markdown textarea (styles.css).
//   - Interface size: --zn-ui-zoom, a CSS zoom on the top bar, side panel contents and status bar.
//   - Dark paper: md2ebook-dark-paper on <html>; PreviewCanvas.jsx passes it on to the sandboxed
//     preview frame. Preview only, the PDF stays white.
//   - Show: md2ebook-hide-header on <html>, and a Panels dropdown (both, Preview only, Editor
//     panel only) that sets md2ebook-hide-preview / -sidebar (styles.css).
// The storage key and setting names are the ones the app used before the gear became shared, so
// settings saved then still apply.

import { desktopDefault, installDisplaySettings } from "../../../../shared/js/displaySettings.js";
import { ABOUT } from "../../../../shared/js/about.js";

export function installMd2pdfDisplaySettings() {
  return installDisplaySettings({
    storageKey: "md2ebook-ui-prefs",
    about: ABOUT, // where the source code is (a small line in the gear pop-up)
    sliders: [
      { key: "editorFontSize", label: "Editor text size", min: 10, max: 28, step: 0.5, initial: 13.5, unit: "px", cssVar: "--md2ebook-editor-font-size", cssValue: (v) => v + "px" },
      { key: "uiScale", label: "Interface size", min: 75, max: 175, step: 5, initial: desktopDefault(100, 100), unit: "%", cssVar: "--zn-ui-zoom", cssValue: (v) => String(v / 100) },
    ],
    groups: [
      { title: "Preview", checks: [
        { key: "darkPaper", label: "Dark paper", htmlClass: "md2ebook-dark-paper", hint: "Shows the pages dark while you work. Only the preview: the PDF stays white." },
      ] },
      { title: "Show", checks: [
        { key: "hideHeader", label: "Top bar", showMeans: true, htmlClass: "md2ebook-hide-header", hint: "The title, File menu and export buttons" },
      ], choices: [
        { label: "Panels", hint: "Preview: the pages and their status bar. Editor panel: the Editor and Typography tabs.",
          initial: 2,
          flags: [{ key: "hidePreview", htmlClass: "md2ebook-hide-preview" }, { key: "hideSidebar", htmlClass: "md2ebook-hide-sidebar" }],
          options: [
            { label: "Preview (left) only", values: { hideSidebar: true } },
            { label: "Editor panel (right) only", values: { hidePreview: true } },
            { label: "Show both", values: {} },
          ] },
      ] },
    ],
  });
}
