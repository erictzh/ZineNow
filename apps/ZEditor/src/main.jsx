// ZEditor entry point: mounts the app. The code lives in the folders next to
// this file — see docs/ARCHITECTURE.md for what goes where.

import { App } from "./ui/App.jsx";
import { installNumberFields } from "../../../shared/js/numberFields.js";
import { installTouchInput } from "./ui/touchInput.js";
import { installZeditorDisplaySettings } from "./ui/displaySettings.js";

// Finger and pen drags on the canvas go through the same code as mouse drags (ui/touchInput.js).
installTouchInput();

// Number boxes that can be cleared and typed in, with up/down buttons for a finger (shared/js/numberFields.js).
installNumberFields();

// The Display gear's settings (interface size, thumbnail size, show/hide), applied before the first render.
installZeditorDisplaySettings();

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
