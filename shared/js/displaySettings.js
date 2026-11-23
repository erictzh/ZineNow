// The gear button and its "Display" pop-up, shared by the ZineNow apps: sliders (text size,
// interface size, ...) and checkboxes (show/hide parts of the window, dark paper, ...). Each app
// says which settings it has; this file builds the gear, remembers the choices in localStorage
// (per browser, not per document) and applies them to <html>:
//   - a slider sets a CSS variable (its `cssVar`, the value from `cssValue`);
//   - a checkbox toggles a class (its `htmlClass`) while its setting is on;
//   - a dropdown picks one of a few combinations of on/off settings (its `flags`, each with
//     its own `htmlClass`), e.g. "Pages only / Format only / Show both" for two side panels.
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
 * @param {Array} [options.groups]     { title, checks: [{ key, label, hint, htmlClass, showMeans }],
 *                                       choices: [{ label, hint, initial, flags: [{ key, htmlClass }],
 *                                                   options: [{ label, values: { key: bool } }] }] }
 *                                     A check with `confirm: { title, text, ok, cancel }` asks first when it is being ticked on
 *                                     (a pop-up; Cancel leaves it off). A check with `showMeans: true` is a "Show" box: ticked while
 *                                     its setting (a "hide" flag) is off.
 *                                     A choice is a dropdown; picking an option sets every one of its
 *                                     flags (a flag missing from `values` is off). `initial` is the
 *                                     default option's index (0 if left out); a saved mix that matches
 *                                     no option falls back to it. Choices come after the group's checks.
 * @param {string} [options.title]     Pop-up heading, default "Display".
 */
export function installDisplaySettings(options) {
  const { storageKey, sliders = [], groups = [], title = "Display" } = options;
  const checks = groups.flatMap((g) => g.checks || []);
  const choices = groups.flatMap((g) => g.choices || []);
  // An option's full set of flag values, unlisted flags off.
  const optionValues = (ch, o) => Object.fromEntries(ch.flags.map((f) => [f.key, o.values[f.key] === true]));
  const optionIndex = (ch, p) => ch.options.findIndex((o) => ch.flags.every((f) => p[f.key] === (o.values[f.key] === true)));
  const initialOption = (ch) => ch.options[ch.initial || 0];
  const defaults = {};
  for (const s of sliders) defaults[s.key] = s.initial;
  for (const c of checks) defaults[c.key] = false;
  for (const ch of choices) Object.assign(defaults, optionValues(ch, initialOption(ch)));

  // ---- settings: load, apply, save ------------------------------------------------------------

  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (e) { /* none saved, or storage blocked */ }
    const prefs = {};
    for (const s of sliders) prefs[s.key] = clampTo(Number(saved[s.key]), s);
    for (const c of checks) prefs[c.key] = saved[c.key] === true;
    for (const ch of choices) {
      for (const f of ch.flags) prefs[f.key] = saved[f.key] === true;
      if (optionIndex(ch, prefs) < 0) Object.assign(prefs, optionValues(ch, initialOption(ch)));
    }
    return prefs;
  }

  function apply() {
    const root = document.documentElement;
    for (const s of sliders) root.style.setProperty(s.cssVar, s.cssValue ? s.cssValue(prefs[s.key]) : String(prefs[s.key]));
    for (const c of checks) if (c.htmlClass) root.classList.toggle(c.htmlClass, prefs[c.key]);
    for (const ch of choices) for (const f of ch.flags) if (f.htmlClass) root.classList.toggle(f.htmlClass, prefs[f.key]);
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
  const choiceViews = [];
  for (const g of groups) {
    if (g.title) {
      const sub = el("div", "zn-display-subtitle");
      sub.textContent = g.title;
      panel.appendChild(sub);
    }
    const list = el("div", "zn-display-checks");
    for (const c of g.checks || []) {
      const label = el("label", "zn-display-check");
      const box = el("input", "", { type: "checkbox" });
      const text = el("span");
      text.textContent = c.label;
      label.append(box, text);
      list.appendChild(label);
      box.addEventListener("change", () => {
        const next = c.showMeans ? !box.checked : box.checked;
        if (next && c.confirm) { refresh(); askConfirm(c.confirm).then((ok) => { if (ok) set({ [c.key]: true }); }); return; }
        set({ [c.key]: next });
      });
      checkViews.push({ c, label, box });
    }
    for (const ch of g.choices || []) {
      const label = el("label", "zn-display-choice");
      if (ch.hint) label.title = ch.hint;
      const text = el("span");
      text.textContent = ch.label;
      const select = el("select", "", { "aria-label": ch.label });
      ch.options.forEach((o, i) => {
        const opt = el("option", "", { value: String(i) });
        opt.textContent = o.label;
        select.appendChild(opt);
      });
      label.append(text, select);
      list.appendChild(label);
      select.addEventListener("change", () => set(optionValues(ch, ch.options[Number(select.value)])));
      choiceViews.push({ ch, select });
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

  // A small pop-up with a Cancel and an OK button; resolves true on OK. Escape or a press outside it cancels.
  function askConfirm(c) {
    return new Promise((resolve) => {
      const backdrop = el("div", "zn-confirm-backdrop");
      const box = el("div", "zn-confirm", { role: "dialog", "aria-modal": "true", "aria-label": c.title });
      const h = el("div", "zn-confirm-title"); h.textContent = c.title;
      const t = el("div", "zn-confirm-text"); t.textContent = c.text;
      const row = el("div", "zn-confirm-actions");
      const cancel = el("button", "", { type: "button" }); cancel.textContent = c.cancel || "Cancel";
      const ok = el("button", "zn-confirm-ok", { type: "button" }); ok.textContent = c.ok || "OK";
      row.append(cancel, ok); box.append(h, t, row); backdrop.appendChild(box); document.body.appendChild(backdrop);
      const done = (v) => { document.removeEventListener("keydown", onKey, true); backdrop.remove(); resolve(v); };
      const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
      document.addEventListener("keydown", onKey, true);
      cancel.addEventListener("click", () => done(false));
      ok.addEventListener("click", () => done(true));
      backdrop.addEventListener("pointerdown", (e) => { e.stopPropagation(); if (e.target === backdrop) done(false); });
      backdrop.addEventListener("mousedown", (e) => e.stopPropagation());
      ok.focus();
    });
  }

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
      v.label.title = v.c.hint || "";
    }
    for (const v of choiceViews) v.select.value = String(Math.max(0, optionIndex(v.ch, prefs)));
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
