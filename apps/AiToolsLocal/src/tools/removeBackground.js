// Tool: Remove background. An on-device model (U²-Netp General or MODNet Portrait) finds the main subject; the picture is shown with
// everything else see-through (on a checkerboard) while Edge cut-off and Soft edge are adjusted, and Apply makes it the picture.

import { BG_MODELS, bgModel } from "../../../../shared/js/ai/bgModel.js";
import { cutOutCanvas, segmentCanvas } from "../../../../shared/js/ai/bgSession.js";
import { wrapNumberInput } from "../../../../shared/js/numberFields.js";
import { modelBox, modelControl } from "../models.js";

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const DEFAULT_CUTOFF = 0.1; // % (the useful cut-offs are very small: the models answer close to 0 on the background)

export const removeBackgroundTool = {
  id: "remove-background",
  name: "Remove background",
  summary: "Keep the main subject, make the rest see-through.",
  create(ctx) {
    const { picture } = ctx;
    const previewC = picture.addOverlay(document.createElement("canvas")); previewC.id = "preview"; previewC.style.display = "none";
    const previewX = previewC.getContext("2d");
    let mounted = false, ui = {}, boxEl = null;
    let modelKey = BG_MODELS[0].key;
    let cutoff = DEFAULT_CUTOFF, soft = 10;
    let found = null; // { mask, side, depth }: the subject mask for the picture as it is now
    let raf = 0;
    const ctl = () => modelControl("bg:" + modelKey);

    const discard = () => {
      found = null; previewC.style.display = "none"; previewX.clearRect(0, 0, previewC.width, previewC.height);
      picture.canvas.style.visibility = "visible";
      refresh();
    };
    function drawPreview() {
      raf = 0;
      if (!found) return;
      previewX.clearRect(0, 0, previewC.width, previewC.height);
      previewX.drawImage(cutOutCanvas(picture.canvas, found.mask, found.side, cutoff / 100, Math.max(0.1, soft) / 100), 0, 0);
    }
    const queuePreview = () => { if (!raf) raf = requestAnimationFrame(drawPreview); };

    async function find() {
      if (picture.busy || !picture.loaded || ctl().state.phase !== "ready") return;
      picture.setBusy(true);
      try {
        ctx.status("Starting " + bgModel(modelKey).name + "…");
        const t0 = performance.now();
        const { mask, side } = await segmentCanvas(picture.canvas, modelKey, (t) => ctx.status(t));
        found = { mask, side, depth: picture.depth };
        previewC.style.display = ""; picture.canvas.style.visibility = "hidden";
        drawPreview();
        ctx.status("Found the subject in " + ((performance.now() - t0) / 1000).toFixed(1) + " s. Adjust the Edge cut-off if needed, then press Apply.", "ok");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); }
    }
    async function apply() {
      if (!found || picture.busy) return;
      const before = await picture.snapshot();
      const out = cutOutCanvas(picture.canvas, found.mask, found.side, cutoff / 100, Math.max(0.1, soft) / 100);
      picture.ctx.clearRect(0, 0, picture.width, picture.height); picture.ctx.drawImage(out, 0, 0);
      picture.commit(before);
      discard();
      ctx.status("Applied. Not right? Undo, then change the Edge cut-off or the model and find the subject again.", "ok");
    }

    function refresh() {
      if (!mounted) return;
      const ready = ctl().state.phase === "ready", has = picture.loaded, idle = !picture.busy;
      for (const k of ["cutoff", "soft"]) { ui[k].disabled = !ready; ui[k].closest(".field").classList.toggle("off", !ready); }
      for (const n of ui.need) n.hidden = ready || ctl().state.phase === "checking";
      ui.find.disabled = !has || !idle || !ready;
      ui.apply.hidden = ui.discard.hidden = !found; ui.apply.disabled = ui.discard.disabled = !idle;
      ui.find.hidden = Boolean(found);
    }
    const unsub = [];
    function drawModelBox() {
      if (boxEl) { boxEl.dispose && boxEl.dispose(); boxEl.remove(); }
      boxEl = modelBox("bg:" + modelKey);
      ui.boxHost.append(boxEl);
    }

    return {
      mount(panel) {
        mounted = true;
        picture.onOpen(discard);
        const sec1 = el("section"); sec1.append(el("h2", "", "1. Model"));
        const radios = el("div", "radios");
        for (const m of BG_MODELS) {
          const lab = el("label", "radio"); const r = document.createElement("input"); r.type = "radio"; r.name = "bg-model"; r.checked = m.key === modelKey;
          r.addEventListener("change", () => { modelKey = m.key; discard(); drawModelBox(); refresh(); });
          lab.append(r, el("span", "", " " + m.label + " · " + m.mb + " MB")); radios.append(lab);
        }
        ui.boxHost = el("div");
        sec1.append(radios, ui.boxHost);

        const sec2 = el("section"); sec2.append(el("h2", "", "2. Cut out"));
        const num = (label, key, min, max, step, value, onInput) => {
          const f = el("label", "field"); f.append(el("span", "", label));
          const i = document.createElement("input"); i.type = "number"; i.min = min; i.max = max; i.step = step; i.value = value;
          i.addEventListener("input", () => { const v = Number(i.value); if (i.value.trim() !== "" && Number.isFinite(v)) { onInput(Math.min(max, Math.max(min, v))); queuePreview(); } });
          f.append(i); wrapNumberInput(i); ui[key] = i; return f;
        };
        const need = () => { const p = el("p", "hint required", "Download required"); return p; };
        ui.need = [need(), need()];
        const f1 = num("Edge cut-off (%)", "cutoff", 0, 100, 0.125, cutoff, (v) => { cutoff = v; });
        const h1 = el("p", "hint", "Higher keeps less of the edge (a tighter cut). You can type finer values like 0.05.");
        const f2 = num("Soft edge (%)", "soft", 0.1, 50, 0.5, soft, (v) => { soft = v; });
        ui.find = el("button", "btn-solid big", "Find subject"); ui.find.type = "button"; ui.find.addEventListener("click", find);
        ui.apply = el("button", "btn-solid big", "Apply"); ui.apply.type = "button"; ui.apply.addEventListener("click", apply);
        ui.discard = el("button", "big", "Discard"); ui.discard.type = "button"; ui.discard.addEventListener("click", () => { discard(); ctx.status("Discarded."); });
        const note = el("p", "hint", "Works on the picture as it is now. Apply makes it the picture (Undo brings it back).");
        sec2.append(f1, ui.need[0], h1, f2, ui.need[1], ui.find, ui.apply, ui.discard, note);
        panel.append(sec1, sec2);
        drawModelBox();
        for (const id of BG_MODELS.map((m) => "bg:" + m.key)) unsub.push(modelControl(id).subscribe(refresh));
        refresh();
      },
      unmount() {
        mounted = false; discard();
        while (unsub.length) unsub.pop()();
        if (boxEl) { boxEl.dispose && boxEl.dispose(); boxEl = null; }
      },
      onPictureChange() { if (found && picture.depth !== found.depth) discard(); else refresh(); },
      primary() { if (found) apply(); else find(); },
    };
  },
};
