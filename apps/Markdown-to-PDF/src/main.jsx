// Md to PDF Converter entry point: mounts the app. The code lives in the folders
// next to this file — see docs/ARCHITECTURE.md for what goes where.

import { App } from "./ui/App.jsx";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
