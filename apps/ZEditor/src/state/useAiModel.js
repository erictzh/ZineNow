// The AI model's state for the Marquee panel: is it on this device, downloading it (with Cancel), deleting it.
// The downloading itself is shared/js/ai/manager.js; nothing downloads until the user confirms in the dialog (ui/dialogs/AiModelDialog.jsx).

import { aiSaved, deleteAi, downloadAi, downloadPlan } from "../../../../shared/js/ai/manager.js";

const { useState, useEffect, useRef, useCallback } = React;

// { phase: "checking" | "none" | "ready" | "downloading", plan: { gpu, modelMb, runtimeMb, totalMb } | null, doneMb, totalMb, error }
export function useAiModel() {
  const [state, setState] = useState({ phase: "checking", plan: null, doneMb: 0, totalMb: 0, error: null });
  const abortRef = useRef(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const set = (patch) => { if (alive.current) setState((s) => ({ ...s, ...patch })); };

  const refresh = useCallback(async () => {
    try {
      const [saved, plan] = await Promise.all([aiSaved(), downloadPlan()]);
      set({ phase: saved.model && saved.runtime ? "ready" : "none", plan });
    } catch (e) { set({ phase: "none", error: e && e.message ? e.message : String(e) }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function download() {
    const ctl = new AbortController(); abortRef.current = ctl;
    set({ phase: "downloading", doneMb: 0, totalMb: state.plan ? state.plan.totalMb : 0, error: null });
    try {
      await downloadAi({ signal: ctl.signal, onProgress: (done, total) => set({ doneMb: done, totalMb: total }) });
      await refresh();
    } catch (e) {
      await refresh();
      if (!(e && e.name === "AbortError")) set({ error: "The download didn't finish: " + (e && e.message ? e.message : e) });
    } finally { abortRef.current = null; }
  }
  const cancel = () => { if (abortRef.current) abortRef.current.abort(); };
  async function remove() { await deleteAi(); await refresh(); }
  return { ...state, download, cancel, remove };
}
