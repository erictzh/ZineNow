// Md to PDF Converter entry point: mounts the app. The code lives in the folders
// next to this file — see docs/ARCHITECTURE.md for what goes where.

import { installInputMode } from "../../../shared/js/inputMode.js";
import { App } from "./ui/App.jsx";

// <html data-input="touch|mouse">: bigger targets while a finger is used (styles.css).
installInputMode();

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
