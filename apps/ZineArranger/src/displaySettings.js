// The gear at the bottom left (shared/js/displaySettings.js) with ZineArranger's settings:
//   - Interface size: --zn-ui-zoom, a CSS zoom on the top bar, the settings panel's tabs and
//     contents and the preview footer (style.css, "Display settings"). Not the sheet preview: it
//     has its own zoom in the footer.
//   - Show: za-hide-topbar / za-hide-panel on <html>. The preview always stays.
// No text size (there is no text box) and no dark paper (left out by choice).

import { desktopDefault, installDisplaySettings } from "../../../shared/js/displaySettings.js";
import { ABOUT } from "../../../shared/js/about.js";

export function installArrangerDisplaySettings() {
    return installDisplaySettings({
        storageKey: "zinearranger.displayPrefs",
        about: ABOUT, // where the source code is (a small line in the gear pop-up)
        sliders: [
            { key: "uiScale", label: "Interface size", min: 75, max: 175, step: 5, initial: desktopDefault(75, 100), unit: "%", cssVar: "--zn-ui-zoom", cssValue: function (v) { return String(v / 100); } },
        ],
        groups: [
            { title: "Show", checks: [
                { key: "hideTopbar", label: "Top bar", showMeans: true, htmlClass: "za-hide-topbar", hint: "The title, PDF picker and Print button" },
                { key: "hidePanel", label: "Settings panel (right)", showMeans: true, htmlClass: "za-hide-panel", hint: "The Basic and Advanced settings" },
            ] },
        ],
    });
}
