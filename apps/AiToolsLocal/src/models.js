// The models, as the app sees them: one controller per model (is it on this device, download with progress and Cancel, delete), and the
// box that shows one model's facts with its Download / Delete buttons (used on the Models page and inside each tool).
// The downloading itself is shared/js/ai/manager.js; nothing downloads until the person confirms in the pop-up (dialog.js).

import { aiSaved, bgPlan, bgSaved, deleteAi, deleteBg, downloadAi, downloadPlan } from "../../../shared/js/ai/manager.js";
import { MODEL_ROWS } from "../../../shared/js/ai/modelList.js";
import { confirmDialog, rich } from "./dialog.js";

const controls = new Map();
const globalListeners = new Set();
export const onModelsChanged = (fn) => { globalListeners.add(fn); return () => globalListeners.delete(fn); };
const tellAll = () => { for (const f of globalListeners) f(); };

export const rowFor = (id) => MODEL_ROWS.find((r) => r.id === id);

// { phase: "checking" | "none" | "ready" | "downloading", plan, doneMb, totalMb, error }
export function modelControl(id) {
  if (controls.has(id)) return controls.get(id);
  const row = rowFor(id);
  const isFill = id === "fill";
  const listeners = new Set();
  const state = { phase: "checking", plan: null, doneMb: 0, totalMb: 0, error: null };
  let abort = null;
  const emit = () => { for (const f of listeners) f(state); tellAll(); };
  const set = (patch) => { Object.assign(state, patch); emit(); };

  async function refresh() {
    try {
      const [saved, plan] = await Promise.all(isFill ? [aiSaved(), downloadPlan()] : [bgSaved(row.model.key), bgPlan(row.model.key)]);
      set({ phase: saved.model && saved.runtime ? "ready" : "none", plan });
    } catch (e) { set({ phase: "none", error: e && e.message ? e.message : String(e) }); }
  }
  async function download() {
    const ctl = new AbortController(); abort = ctl;
    set({ phase: "downloading", doneMb: 0, totalMb: state.plan ? state.plan.totalMb : 0, error: null });
    try {
      await downloadAi({ which: isFill ? "fill" : "background", model: isFill ? undefined : row.model.key, signal: ctl.signal, onProgress: (done, total) => set({ doneMb: done, totalMb: total }) });
      await refresh();
    } catch (e) {
      await refresh();
      if (!(e && e.name === "AbortError")) set({ error: "The download didn't finish: " + (e && e.message ? e.message : e) });
    } finally { abort = null; }
  }
  const cancel = () => { if (abort) abort.abort(); };
  async function remove() { await (isFill ? deleteAi() : deleteBg(row.model.key)); await refresh(); }
  const ctl = { id, row, state, refresh, download, cancel, remove, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  controls.set(id, ctl);
  refresh();
  return ctl;
}

// Pop-ups: what is downloaded and from where (the wording the user chose), and what deleting does.
export async function askDownload(ctl) {
  const m = ctl.row.model, plan = ctl.state.plan;
  if (!plan) return false;
  return confirmDialog({
    title: "Download AI model?",
    points: [
      rich([["You are downloading "], [m.kind === "Remove object" ? "an AI object-remover model" : "an AI background-remover model"], [" ("], [m.label, true], [", about " + Math.round(m.mb * 10) / 10 + " MB, " + m.licence + " licence) from "], [m.host, true], [" (" + m.repo + "), plus its runtime (about " + Math.round(plan.runtimeMb) + " MB, skipped if you already have it) from "], ["cdn.jsdelivr.net", true], [". About " + plan.totalMb + " MB in total."]]),
      "The AI model will not connect to the internet. It runs on your device and no file or picture leaves your device.",
      rich([["Warning:", true], [" it may freeze or cause lag on certain lower-end devices. You can delete it later (Delete button)."]]),
    ],
    ok: "Confirm Download", cancel: "Cancel",
  });
}
export function askDelete(ctl) {
  const m = ctl.row.model;
  return confirmDialog({
    title: "Delete AI model?",
    points: [
      "This removes " + m.label + " from this device. The runtime is only removed when no AI model needs it.",
      "ZEditor uses the same files, so it may need to download them again.",
      "You can download it again any time.",
    ],
    ok: "Delete", cancel: "Cancel",
  });
}

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

// The box for one model: its facts, then the Download / progress / Delete part. `compact`: no "about" line (the tool shows its own).
// `deletable: false`: no Delete button (inside a tool; the Models page is where models are deleted).
export function modelBox(id, { compact = false, deletable = true } = {}) {
  const ctl = modelControl(id), m = ctl.row.model;
  const box = el("div", "model-box");
  const title = el("b", "", m.name + " (" + m.kind + ")");
  const facts = el("span", "hint", (compact ? "" : m.about + " ") + m.licence + " licence (free and open source). About " + Math.round(m.mb * 10) / 10 + " MB, downloaded from " + m.repo + ". Runs on your device; nothing is uploaded.");
  const live = el("div", "model-live");
  box.append(title, facts, live);
  function draw(s) {
    live.textContent = "";
    if (s.phase === "checking") live.append(el("span", "hint", "Checking…"));
    else if (s.phase === "none") {
      const b = el("button", "btn-solid wide", "Download " + m.name + (s.plan ? " (about " + s.plan.totalMb + " MB)" : "")); b.type = "button";
      b.addEventListener("click", async () => { if (await askDownload(ctl)) ctl.download(); });
      live.append(b);
    } else if (s.phase === "downloading") {
      const p = document.createElement("progress"); p.max = s.totalMb || 1; p.value = s.doneMb;
      const t = el("span", "hint", "Downloading… " + s.doneMb.toFixed(1) + " of " + s.totalMb.toFixed(1) + " MB");
      const c = el("button", "wide", "Cancel download"); c.type = "button"; c.addEventListener("click", ctl.cancel);
      live.append(p, t, c);
    } else if (s.phase === "ready") {
      live.append(el("span", "hint ok", "Downloaded: works offline." + (deletable ? "" : " (Delete it on the Models page.)")));
      if (deletable) {
        const d = el("button", "wide", "Delete " + m.name); d.type = "button";
        d.addEventListener("click", async () => { if (await askDelete(ctl)) ctl.remove(); });
        live.append(d);
      }
    }
    if (s.error) live.append(el("span", "hint bad", s.error));
  }
  draw(ctl.state);
  const off = ctl.subscribe(draw);
  box.dispose = off;
  return box;
}
