// Tool: Upscale. Real-ESRGAN (on this device) enlarges the picture 2 or 4 times and adds believable detail, piece by piece (tiles) so big pictures do not
// run out of memory. The picture becomes the enlarged one (one undo step). It is the heaviest tool: a small picture takes seconds, a big one minutes.

import { resultSize } from "../../../../shared/js/ai/upscale.js";
import { upscaleCanvas } from "../../../../shared/js/ai/upscaleSession.js";
import { modelBox, modelControl } from "../models.js";

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const MAX_SIDE = 8192, MAX_PIXELS = 40e6; // the biggest result: longest side, and total pixels (memory)
const TILES = [["64", "64 px (gentle on memory, slower)"], ["96", "96 px"], ["128", "128 px (default)"], ["192", "192 px (faster, more memory)"]];

export const upscaleTool = {
  id: "upscale",
  name: "Upscale",
  summary: "Enlarge a picture 2 or 4 times with AI detail.",
  create(ctx) {
    const { picture } = ctx;
    const ctl = modelControl("upscale");
    let mounted = false, ui = {};
    let want = 2, tile = "128", gpu = false, running = false, cancelled = false;

    function sizeLine() {
      if (!picture.loaded) return { text: "Open a picture first.", bad: false };
      const r = resultSize(picture.width, picture.height, want, MAX_SIDE);
      const big = r.tooBig || r.w * r.h > MAX_PIXELS;
      return { text: picture.width + " × " + picture.height + " px  →  " + r.w + " × " + r.h + " px" + (big ? " (too big: use 2×, or crop the picture first)" : ""), bad: big };
    }

    async function run() {
      if (running || picture.busy || !picture.loaded || ctl.state.phase !== "ready") return;
      const line = sizeLine();
      if (line.bad) { ctx.status("That would be too big: " + line.text, "bad"); return; }
      running = true; cancelled = false; picture.setBusy(true); refresh();
      try {
        const before = await picture.snapshot();
        const t0 = performance.now();
        ctx.status("Starting the upscaler…");
        const res = await upscaleCanvas(picture.canvas, {
          tile: Number(tile), pad: 12, gpu,
          onStatus: (t) => ctx.status(t),
          shouldCancel: () => cancelled,
          onProgress: (done, total, avg) => { ui.prog.max = total; ui.prog.value = done; ctx.status("Tile " + done + " of " + total + " · " + Math.round(avg) + " ms each · about " + Math.round(avg * (total - done) / 1000) + " s left"); },
        });
        if (res.cancelled) { before.close(); ctx.debug.section("Upscale cancelled", { ...res.info }); ctx.status("Cancelled after " + res.info.doneTiles + " of " + res.info.tiles + " tiles. The picture is unchanged.", "bad"); return; }
        // the result is the model's own size (4x); 2x = shrunk to half
        let final = res.canvas;
        const w = picture.width * want, h = picture.height * want;
        if (final.width !== w || final.height !== h) { const f = document.createElement("canvas"); f.width = w; f.height = h; const fx = f.getContext("2d"); fx.imageSmoothingQuality = "high"; fx.drawImage(final, 0, 0, w, h); final = f; }
        // a picture with see-through parts keeps them: the model works on colours only, so the alpha comes from the enlarged original
        const probe = picture.ctx.getImageData(0, 0, picture.width, picture.height).data;
        let hasAlpha = false; for (let i = 3; i < probe.length; i += 4) if (probe[i] < 255) { hasAlpha = true; break; }
        if (hasAlpha) {
          const a = document.createElement("canvas"); a.width = w; a.height = h; const ax = a.getContext("2d"); ax.imageSmoothingQuality = "high"; ax.drawImage(picture.canvas, 0, 0, w, h);
          const ad = ax.getImageData(0, 0, w, h).data, fx = final.getContext("2d"), fd = fx.getImageData(0, 0, w, h);
          for (let i = 3; i < fd.data.length; i += 4) fd.data[i] = ad[i];
          fx.putImageData(fd, 0, 0);
        }
        picture.replaceWith(final);
        picture.commit(before);
        const sec = (performance.now() - t0) / 1000;
        ctx.debug.section("Upscale", { picture: probe.length / 4 + " px -> " + w + "x" + h, wanted: want + "x", totalSeconds: Math.round(sec * 10) / 10, hasTransparency: hasAlpha, ...res.info });
        ctx.status("Done in " + sec.toFixed(1) + " s: the picture is now " + w + " × " + h + " px. Undo brings the original back.", "ok");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { running = false; ui.prog.value = 0; picture.setBusy(false); refresh(); }
    }

    function refresh() {
      if (!mounted) return;
      const ready = ctl.state.phase === "ready", has = picture.loaded;
      ui.need.hidden = ready || ctl.state.phase === "checking";
      const line = sizeLine();
      ui.size.textContent = line.text; ui.size.classList.toggle("bad", line.bad);
      ui.run.disabled = !has || running || picture.busy || !ready || line.bad;
      ui.run.textContent = running ? "Enlarging…" : "Enlarge";
      ui.cancel.hidden = !running; ui.prog.hidden = !running;
      for (const c of [ui.want, ui.tile, ui.ep]) c.disabled = running;
    }
    picture.onOpen(refresh);
    ctl.subscribe(refresh);

    return {
      mount(panel) {
        mounted = true;
        const secA = el("section"); secA.append(el("h2", "", "Enlarge"));
        const wf = el("label", "field"); wf.append(el("span", "", "Enlarge by"));
        ui.want = el("select"); for (const [v, t] of [["2", "2× (about 4 times faster)"], ["4", "4× (the model's own size)"]]) { const o = el("option", "", t); o.value = v; ui.want.append(o); } ui.want.value = String(want);
        ui.want.addEventListener("change", () => { want = Number(ui.want.value); refresh(); }); wf.append(ui.want);
        ui.size = el("p", "hint");
        const tf = el("label", "field"); tf.append(el("span", "", "Piece size (tiles)"));
        ui.tile = el("select"); for (const [v, t] of TILES) { const o = el("option", "", t); o.value = v; ui.tile.append(o); } ui.tile.value = tile;
        ui.tile.addEventListener("change", () => { tile = ui.tile.value; }); tf.append(ui.tile);
        const ef = el("label", "field"); ef.append(el("span", "", "Run on"));
        ui.ep = el("select"); const o1 = el("option", "", "The processor (CPU)"); o1.value = "cpu"; ui.ep.append(o1);
        if (navigator.gpu) { const o2 = el("option", "", "The graphics chip (if it works)"); o2.value = "gpu"; ui.ep.append(o2); }
        ui.ep.value = gpu ? "gpu" : "cpu"; ui.ep.addEventListener("change", () => { gpu = ui.ep.value === "gpu"; }); ef.append(ui.ep);
        ui.need = el("p", "hint required", "Download required: get the model below first.");
        ui.run = el("button", "btn-solid big", "Enlarge"); ui.run.type = "button"; ui.run.addEventListener("click", run);
        ui.prog = document.createElement("progress"); ui.prog.hidden = true; ui.prog.max = 1; ui.prog.value = 0;
        ui.cancel = el("button", "big", "Cancel"); ui.cancel.type = "button"; ui.cancel.hidden = true; ui.cancel.addEventListener("click", () => { cancelled = true; ctx.status("Cancelling…"); });
        const note = el("p", "hint", "This is the heaviest tool: a small picture (about 500 px wide) takes seconds to a minute on a tablet, a big one much longer. Try a small picture or 2× first. The result is the new picture (Undo brings the original back).");
        secA.append(wf, ui.size, tf, ef, ui.need, ui.run, ui.prog, ui.cancel, note);
        const secB = el("section"); secB.append(el("h2", "", "Model"));
        secB.append(modelBox("upscale", { compact: true, deletable: false }));
        panel.append(secA, secB);
        refresh();
      },
      unmount() { mounted = false; },
      onPictureChange() { refresh(); },
      primary() { run(); },
    };
  },
};
