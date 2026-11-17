// The document title: default name with date stamp, and turning a title into a safe file name.

// ---- Document title — the topbar title box. Defaults to the first
// imported PDF's name (or "New Zine") plus a YYMMDDHHmm stamp, and names
// the saved .znow, the exported PDF and the ZineArranger hand-off.
export function titleStamp(date = new Date()) {
  const two = (n) => String(n).padStart(2, "0");
  return two(date.getFullYear() % 100) + two(date.getMonth() + 1) + two(date.getDate()) + two(date.getHours()) + two(date.getMinutes());
}
export function stripExtension(name) {
  return String(name || "").replace(/\.[^./\\]+$/, "");
}
// A title made safe as a file name: characters Windows/macOS forbid are
// dropped ("Issue #1: Summer?" → "Issue #1 Summer"), and an empty result
// falls back to "zine".
export function titleToFileName(title, extension) {
  const safe = String(title || "").replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
  return (safe || "zine") + extension;
}
