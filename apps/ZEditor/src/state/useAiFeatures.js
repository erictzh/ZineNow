// Is "Experimental AI features" (the gear at the bottom left) switched on? Off by default. Re-renders when it changes.

import { aiFeaturesOn } from "../ui/displaySettings.js";
const { useState, useEffect } = React;

export function useAiFeatures() {
  const [on, setOn] = useState(aiFeaturesOn());
  useEffect(() => {
    const h = (e) => setOn(Boolean(e.detail && e.detail.aiFeatures));
    window.addEventListener("zn-display-prefs", h);
    setOn(aiFeaturesOn());
    return () => window.removeEventListener("zn-display-prefs", h);
  }, []);
  return on;
}
