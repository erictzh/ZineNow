// Saved settings files (.json): reading one, naming one, and where to suggest keeping them.

// Reads a settings file. Resolves to the settings object; rejects with a
// readable message if the file can't be read or isn't a settings object.
export function readConfigFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("That file is not a config object.");
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error("Could not read that file: " + (err && err.message ? err.message : String(err))));
      }
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsText(file);
  });
}

// The file name to save under: what was typed, with ".json" added if missing.
export function configFileName(typed) {
  const base = (typed || "config").trim() || "config";
  return /\.json$/i.test(base) ? base : base + ".json";
}

// Best-effort readable path to a "config" folder next to index.html,
// shown only as a hint (no web page can open a dialog there by itself).
// Null when not opened from disk.
export function appConfigFolderHint() {
  try {
    if (window.location.protocol !== "file:") return null;
    const path = decodeURIComponent(window.location.pathname);
    const slash = path.lastIndexOf("/");
    let dir = slash > -1 ? path.slice(0, slash) : path;
    // Windows paths arrive as /C:/Users/... — drop the leading slash
    // so it reads as a normal Windows path, not a Unix-looking one.
    if (/^\/[A-Za-z]:/.test(dir)) dir = dir.slice(1);
    return dir ? dir + "/config" : null;
  } catch (e) {
    return null;
  }
}
