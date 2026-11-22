// Md to PDF Converter entry point: mounts the app. The code lives in the folders
// next to this file — see docs/ARCHITECTURE.md for what goes where.

import { installInputMode } from "../../../shared/js/inputMode.js";
import { installNumberFields } from "../../../shared/js/numberFields.js";
import { App } from "./ui/App.jsx";
import { installMd2pdfDisplaySettings } from "./ui/displaySettings.js";

// <html data-input="touch|mouse">: bigger targets while a finger is used (styles.css).
installInputMode();

// Number boxes that can be cleared and typed in, with up/down buttons for a finger (shared/js/numberFields.js).
installNumberFields();

// The gear at the bottom left: text size, interface size, dark paper, show/hide (ui/displaySettings.js).
// Before the first render, so the app never draws at the default size first.
installMd2pdfDisplaySettings();

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
