// The log window: a log of what the app and the tools did (with numbers about the picture, the model's answer and the saved file) that
// can be copied as plain text (Copy, top right of the window) and sent along with a screenshot. It sits at the bottom of the right-hand sidebar. Nothing leaves the device:
// the text only goes where the person pastes it.

const lines = [];
const MAX_LINES = 600;
const stamp = () => new Date().toISOString().slice(11, 23);
const num = (v) => (typeof v === "number" ? (Number.isInteger(v) ? String(v) : Math.abs(v) < 0.001 && v !== 0 ? v.toExponential(2) : String(Math.round(v * 1e6) / 1e6)) : String(v));

function fmt(obj, indent = "  ") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) { out.push(indent + k + ":"); out.push(fmt(v, indent + "  ")); }
    else if (Array.isArray(v)) out.push(indent + k + ": " + v.map((x) => (x && typeof x === "object" ? Object.entries(x).map(([a, b]) => a + " " + num(b)).join(" ") : num(x))).join(" | "));
    else out.push(indent + k + ": " + num(v));
  }
  return out.join("\n");
}

export const debug = {
  log(text) { lines.push(stamp() + "  " + text); if (lines.length > MAX_LINES) lines.shift(); if (refresh) refresh(); },
  section(title, obj) { this.log(title + "\n" + fmt(obj)); },
  // like section(), but at the very top (the device information comes first)
  head(title, obj) { lines.unshift(stamp() + "  " + title + "\n" + fmt(obj)); if (refresh) refresh(); },
  clear() { lines.length = 0; if (refresh) refresh(); },
  get body() { return lines.join("\n"); },
};
let refresh = null;

// How much of a canvas is see-through: share of pixels with alpha 0, partly (1..254) and fully opaque (255).
export function alphaStats(canvas) {
  const w = canvas.width, h = canvas.height;
  const d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let clear = 0, part = 0, solid = 0;
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a === 0) clear++; else if (a === 255) solid++; else part++; }
  const n = w * h;
  return { size: w + "x" + h, transparentPct: Math.round(1000 * clear / n) / 10, partlyPct: Math.round(1000 * part / n) / 10, opaquePct: Math.round(1000 * solid / n) / 10 };
}

// What a saved PNG really is: its size, its colour type (6 = has an alpha channel, 2 = none), and, decoded again, how see-through it is.
export async function describePng(blob) {
  const head = new Uint8Array(await blob.slice(0, 33).arrayBuffer());
  const colorType = head.length > 25 ? head[25] : -1;
  const names = { 0: "grey", 2: "RGB (no transparency)", 3: "palette", 4: "grey + alpha", 6: "RGBA (has transparency)" };
  const out = { bytes: blob.size, type: blob.type, pngColourType: colorType + " = " + (names[colorType] || "unknown") };
  try {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    c.getContext("2d").drawImage(bmp, 0, 0);
    out.decoded = alphaStats(c);
  } catch (e) { out.decoded = "could not decode: " + e.message; }
  return out;
}

// Builds the log window inside `host` (the bottom of the right-hand sidebar): a header with the title and, top right, Snapshot, Clear and Copy
// (Copy puts the whole log on the clipboard), above the log text. `getState()` returns an object describing the app now (picture, tool, models);
// called for each Snapshot. `getCanvas()` returns the picture's canvas. Ctrl+Shift+D folds / unfolds the window.
export function installDebug({ host, getState, getCanvas }) {
  host.classList.add("logwin");
  const bar = document.createElement("div"); bar.className = "log-bar";
  const title = document.createElement("b"); title.textContent = "Log";
  const mk = (label, fn, cls) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; if (cls) b.className = cls; b.addEventListener("click", fn); return b; };
  const ta = document.createElement("textarea"); ta.readOnly = true; ta.spellcheck = false; ta.setAttribute("aria-label", "Log");
  const fold = mk("▾", () => setFolded(!host.classList.contains("folded")), "log-fold"); fold.title = "Fold or unfold the log (Ctrl+Shift+D)";
  const copy = mk("Copy", async () => {
    let msg;
    try { await navigator.clipboard.writeText(ta.value); msg = "Copied ✓"; }
    catch (e) { ta.focus(); ta.select(); msg = document.execCommand && document.execCommand("copy") ? "Copied ✓" : "Select it"; }
    copy.textContent = msg; setTimeout(() => { copy.textContent = "Copy"; }, 2500);
  }, "btn-solid log-copy"); // copies the whole log; the label says "Copied" for a moment
  const right = document.createElement("span"); right.className = "log-actions";
  right.append(mk("Snapshot", () => snapshot()), mk("Clear", () => { debug.clear(); header(); }), copy);
  bar.append(fold, title, right);
  host.append(bar, ta);

  refresh = () => { ta.value = debug.body; ta.scrollTop = ta.scrollHeight; };
  async function header() {
    const info = {
      app: "Ai Tools (Local) build " + (typeof __BUILD__ !== "undefined" ? __BUILD__ : "?"),
      time: new Date().toISOString(),
      browser: navigator.userAgent,
      screen: screen.width + "x" + screen.height + " @" + (window.devicePixelRatio || 1) + ", window " + innerWidth + "x" + innerHeight,
      cpuThreads: navigator.hardwareConcurrency || "?", memoryGB: navigator.deviceMemory || "?",
      crossOriginIsolated: Boolean(self.crossOriginIsolated), webgpu: Boolean(navigator.gpu), online: navigator.onLine,
      serviceWorker: navigator.serviceWorker && navigator.serviceWorker.controller ? "controlling this page" : "none",
    };
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); info.storage = Math.round((e.usage || 0) / 1048576) + " MB used of " + Math.round((e.quota || 0) / 1048576) + " MB"; } } catch (e) { /* not available */ }
    debug.head("== Ai Tools (Local) log ==", info);
  }
  async function snapshot() {
    debug.section("Snapshot", { ...(getState ? getState() : {}), picture: getCanvas && getCanvas() && getCanvas().width ? alphaStats(getCanvas()) : "no picture" });
  }
  function setFolded(f) { host.classList.toggle("folded", f); fold.textContent = f ? "▸" : "▾"; }
  document.addEventListener("keydown", (e) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); setFolded(!host.classList.contains("folded")); } });
  window.addEventListener("error", (e) => debug.log("ERROR: " + e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : "")));
  window.addEventListener("unhandledrejection", (e) => debug.log("ERROR (promise): " + (e.reason && e.reason.message ? e.reason.message : e.reason)));
  header().then(refresh);
}
