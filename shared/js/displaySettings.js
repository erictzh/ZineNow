// The gear button and its "Display" pop-up, shared by the ZineNow apps: sliders (text size,
// interface size, ...) and checkboxes (show/hide parts of the window, dark paper, ...). Each app
// says which settings it has; this file builds the gear, remembers the choices in localStorage
// (per browser, not per document) and applies them to <html>:
//   - a slider sets a CSS variable (its `cssVar`, the value from `cssValue`);
//   - a checkbox toggles a class (its `htmlClass`) while its setting is on.
// The app's own CSS decides what those variables and classes do. Styles: shared/styles/displaySettings.css.
// After every change (and once at install) the window gets a "zn-display-prefs" event whose
// detail is the settings object, for code that has to react in script (e.g. a sandboxed frame).
//
// Plain DOM, no framework, so the React apps and ZineArranger can all use it.

const EVENT = "zn-display-prefs";

const clampTo = (v, s) => (Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : s.initial);
const snap = (v, s) => clampTo(Math.round(v / s.step) * s.step, s);
// Rounds away float noise from steps like 0.5 (13.5 + 0.5 * 3).
const tidy = (v) => Math.round(v * 1000) / 1000;

/**
 * @param {object} options
 * @param {string} options.storageKey  localStorage key for this app's settings.
 * @param {Element|false} [options.mount] Where the gear goes. Default: document.body, floating
 *                                     (class zn-display-floating; the app's CSS places it).
 *                                     false: not placed; the app puts `element` (returned) where
 *                                     it wants once that spot exists (ZEditor, after React renders).
 *                                     Either way the settings apply at once.
 * @param {Array} [options.sliders]    { key, label, min, max, step, initial, unit, cssVar, cssValue(v) }
 * @param {Array} [options.groups]     { title, checks: [{ key, label, hint, htmlClass, showMeans }] }
 *                                     A check with `showMeans: true` is a "Show" box: ticked while
 *                                     its setting (a "hide" flag) is off.
 * @param {Array} [options.notBoth]    Pairs of check keys that can't both be on (e.g. hiding both
 *                                     columns); while one is on the other's box is disabled.
 * @param {string} [options.notBothHint] Hover text on a box disabled by `notBoth`.
 * @param {string} [options.title]     Pop-up heading, default "Display".
 */
export function installDisplaySettings(options) {
  const { storageKey, sliders = [], groups = [], notBoth = [], notBothHint = "", title = "Display" } = options;
  const checks = groups.flatMap((g) => g.checks);
  const defaults = {};
  for (const s of sliders) defaults[s.key] = s.initial;
  for (const c of checks) defaults[c.key] = false;

  // ---- settings: load, apply, save ------------------------------------------------------------

  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (e) { /* none saved, or storage blocked */ }
    const prefs = {};
    for (const s of sliders) prefs[s.key] = clampTo(Number(saved[s.key]), s);
    for (const c of checks) prefs[c.key] = saved[c.key] === true;
    for (const [a, b] of notBoth) if (prefs[a] && prefs[b]) prefs[b] = false;
    return prefs;
  }

  function apply() {
    const root = document.documentElement;
    for (const s of sliders) root.style.setProperty(s.cssVar, s.cssValue ? s.cssValue(prefs[s.key]) : String(prefs[s.key]));
    for (const c of checks) if (c.htmlClass) root.classList.toggle(c.htmlClass, prefs[c.key]);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { ...prefs } }));
  }

  function set(changes) {
    prefs = { ...prefs, ...changes };
    try { localStorage.setItem(storageKey, JSON.stringify(prefs)); } catch (e) { /* not remembered */ }
    apply();
    refresh();
  }

  let prefs = load();
  apply(); // straight away, so the app never draws at the default size first

  // ---- the gear and pop-up ---------------------------------------------------------------------

  const el = (tag, cls, attrs = {}) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };

  const floating = options.mount === undefined || options.mount === null;
  const wrap = el("div", "zn-display" + (floating ? " zn-display-floating" : ""));
  const panel = el("div", "zn-display-panel", { role: "dialog", "aria-label": title + " settings" });
  panel.hidden = true;
  const head = el("div", "zn-display-title");
  head.textContent = title;
  panel.appendChild(head);

  const sliderViews = sliders.map((s) => {
    const row = el("div", "zn-display-row");
    const label = el("div", "zn-display-label");
    const name = el("span");
    name.textContent = s.label;
    const value = el("span", "zn-display-value");
    label.append(name, value);
    const control = el("div", "zn-display-control");
    const minus = el("button", "zn-display-step", { type: "button", "aria-label": "Smaller " + s.label.toLowerCase() });
    minus.textContent = "−";
    const range = el("input", "", { type: "range", min: s.min, max: s.max, step: s.step, "aria-label": s.label });
    const plus = el("button", "zn-display-step", { type: "button", "aria-label": "Larger " + s.label.toLowerCase() });
    plus.textContent = "+";
    control.append(minus, range, plus);
    row.append(label, control);
    panel.appendChild(row);
    minus.addEventListener("click", () => set({ [s.key]: tidy(snap(prefs[s.key] - s.step, s)) }));
    plus.addEventListener("click", () => set({ [s.key]: tidy(snap(prefs[s.key] + s.step, s)) }));
    range.addEventListener("input", () => set({ [s.key]: tidy(snap(Number(range.value), s)) }));
    return { s, value, minus, range, plus };
  });

  const checkViews = [];
  for (const g of groups) {
    if (g.title) {
      const sub = el("div", "zn-display-subtitle");
      sub.textContent = g.title;
      panel.appendChild(sub);
    }
    const list = el("div", "zn-display-checks");
    for (const c of g.checks) {
      const label = el("label", "zn-display-check");
      const box = el("input", "", { type: "checkbox" });
      const text = el("span");
      text.textContent = c.label;
      label.append(box, text);
      list.appendChild(label);
      box.addEventListener("change", () => set({ [c.key]: c.showMeans ? !box.checked : box.checked }));
      checkViews.push({ c, label, box });
    }
    panel.appendChild(list);
  }

  const foot = el("div", "zn-display-foot");
  const note = el("span", "zn-display-note");
  note.textContent = "Saved in this browser";
  const reset = el("button", "zn-display-reset", { type: "button" });
  reset.textContent = "Reset";
  reset.addEventListener("click", () => set(defaults));
  foot.append(note, reset);
  panel.appendChild(foot);

  const gear = el("button", "zn-display-gear", {
    type: "button",
    title: title + " settings",
    "aria-label": title + " settings",
    "aria-expanded": "false",
  });
  gear.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
    "</svg>";

  wrap.append(panel, gear);
  if (floating) document.body.appendChild(wrap);
  else if (options.mount) options.mount.appendChild(wrap);

  // Puts the current settings into the controls.
  function refresh() {
    for (const v of sliderViews) {
      const n = prefs[v.s.key];
      v.value.textContent = n + (v.s.unit || "");
      v.range.value = String(n);
      v.minus.disabled = n <= v.s.min;
      v.plus.disabled = n >= v.s.max;
    }
    for (const v of checkViews) {
      const on = prefs[v.c.key];
      v.box.checked = v.c.showMeans ? !on : on;
      const pair = notBoth.find((p) => p.includes(v.c.key));
      const blocked = !on && pair && prefs[pair[0] === v.c.key ? pair[1] : pair[0]];
      v.box.disabled = !!blocked;
      v.label.classList.toggle("disabled", !!blocked);
      v.label.title = blocked && notBothHint ? notBothHint : v.c.hint || "";
    }
    reset.disabled = Object.keys(defaults).every((k) => prefs[k] === defaults[k]);
  }
  refresh();

  // ---- open / close ------------------------------------------------------------------------

  function setOpen(open) {
    panel.hidden = !open;
    gear.classList.toggle("open", open);
    gear.setAttribute("aria-expanded", String(open));
  }
  gear.addEventListener("click", () => setOpen(panel.hidden));
  // A press outside the gear and pop-up, or Escape, closes it.
  document.addEventListener("pointerdown", (e) => { if (!panel.hidden && !wrap.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
  // Presses on the gear must not reach the canvas or panels underneath (ZEditor's touch bridge).
  wrap.addEventListener("pointerdown", (e) => e.stopPropagation());
  wrap.addEventListener("mousedown", (e) => e.stopPropagation());

  return { get prefs() { return { ...prefs }; }, set, element: wrap };
}
