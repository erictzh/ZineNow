// Tool: Click-to-select. MobileSAM (on this device) reads the picture once (about 10 seconds), then every click outlines the thing under it.
// Add to the selection, take away from it, then cut it out, make it see-through, or send it to Remove object as the marks to fill.

import { outline, prepareSam } from "../../../../shared/js/ai/samSession.js";
import { modelBox, modelControl } from "../models.js";

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const MAX_WORK = 1280; // px: the picture is read at this size at most (memory, speed); the selection is scaled back up

export const selectObjectTool = {
  id: "select-object",
  name: "Click-to-select",
  summary: "Click a thing to select it; cut it out or remove it.",
  create(ctx) {
    const { picture } = ctx;
    const selC = picture.addOverlay(document.createElement("canvas")); selC.id = "selection"; selC.style.display = "none";
    const selX = selC.getContext("2d");
    const ctl = modelControl("sam");
    let mounted = false, ui = {};
    let prep = null;      // { embeddings, k, w, h, backend, ms, depth, scale }: the picture as read
    let points = [];      // clicks in the picture's pixels: { x, y, label } (scaled to the read size when decoded)
    let sel = null;       // { mask, w, h } the current selection at the read size
    let addMode = true;
    let deciding = false, again = false;

    function drawSelection() {
      selX.clearRect(0, 0, selC.width, selC.height);
      if (!sel && !points.length) { selC.style.display = "none"; return; }
      selC.style.display = "";
      if (sel) {
        const mc = document.createElement("canvas"); mc.width = sel.w; mc.height = sel.h;
        const mx = mc.getContext("2d"), id = mx.createImageData(sel.w, sel.h);
        for (let i = 0; i < sel.mask.length; i++) if (sel.mask[i]) { id.data[i * 4] = 232; id.data[i * 4 + 1] = 98; id.data[i * 4 + 2] = 42; id.data[i * 4 + 3] = 150; }
        mx.putImageData(id, 0, 0);
        selX.imageSmoothingEnabled = true; selX.drawImage(mc, 0, 0, selC.width, selC.height);
      }
      const r = Math.max(4, 7 / picture.view.s);
      for (const p of points) {
        selX.beginPath(); selX.arc(p.x, p.y, r, 0, 7); selX.fillStyle = p.label ? "#3fd26f" : "#ff5a5a"; selX.fill();
        selX.lineWidth = 2 / picture.view.s; selX.strokeStyle = "#fff"; selX.stroke();
      }
    }

    // ---- reading the picture ----
    async function prepare() {
      if (picture.busy || !picture.loaded || ctl.state.phase !== "ready") return;
      picture.setBusy(true);
      try {
        const scale = Math.min(1, MAX_WORK / Math.max(picture.width, picture.height));
        const work = document.createElement("canvas"); work.width = Math.max(1, Math.round(picture.width * scale)); work.height = Math.max(1, Math.round(picture.height * scale));
        const wx = work.getContext("2d"); wx.imageSmoothingQuality = "high"; wx.drawImage(picture.canvas, 0, 0, work.width, work.height);
        const t0 = performance.now();
        const p = await prepareSam(work, (t) => ctx.status(t));
        prep = { ...p, depth: picture.depth, scale };
        points = []; sel = null;
        ctx.debug.section("Read the picture (click-to-select)", { picture: picture.width + "x" + picture.height, readAt: work.width + "x" + work.height, backend: p.backend, readMs: p.ms, totalMs: Math.round(performance.now() - t0), embeddings: p.embeddings.dims.join("x") });
        picture.setPointerHandler(handler);
        ctx.status("Picture read in " + (p.ms / 1000).toFixed(1) + " s (" + (p.backend === "gpu" ? "graphics chip" : "processor") + "). Click or tap things to select them.", "ok");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); drawSelection(); refresh(); }
    }

    // ---- clicks: one decode at a time, the latest set of clicks wins ----
    async function decode() {
      if (deciding) { again = true; return; }
      deciding = true;
      try {
        do {
          again = false;
          if (!points.length) { sel = null; break; }
          const r = await outline(prep, points.map((p) => ({ x: p.x * prep.scale, y: p.y * prep.scale, label: p.label }))); // the read size's pixels
          sel = { mask: r.mask, w: r.w, h: r.h };
          ctx.debug.log("Click " + points.length + ": decoder " + r.ms + " ms, selected " + (100 * r.coverage).toFixed(1) + " % of the picture, quality " + r.iou.map((v) => v.toFixed(2)).join(","));
          ctx.status("Selected " + (100 * r.coverage).toFixed(1) + " % of the picture (" + r.ms + " ms). Click more to add" + (addMode ? "" : " (taking away)") + ", or use the selection below.", "ok");
          drawSelection();
        } while (again);
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { deciding = false; drawSelection(); refresh(); }
    }
    const handler = {
      down(pt) {
        if (!prep) return;
        points.push({ x: pt.x, y: pt.y, label: addMode ? 1 : 0 });
        drawSelection(); refresh(); decode();
      },
    };

    // ---- using the selection ----
    // The selection scaled to the picture's size: { alpha: Uint8ClampedArray (0..255, soft edge from the scaling), canvas }.
    function selectionAtPictureSize() {
      const mc = document.createElement("canvas"); mc.width = sel.w; mc.height = sel.h;
      const mx = mc.getContext("2d"), id = mx.createImageData(sel.w, sel.h);
      for (let i = 0; i < sel.mask.length; i++) if (sel.mask[i]) { id.data[i * 4 + 3] = 255; }
      mx.putImageData(id, 0, 0);
      const c = document.createElement("canvas"); c.width = picture.width; c.height = picture.height;
      const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(mc, 0, 0, c.width, c.height);
      return { canvas: c, data: x.getImageData(0, 0, c.width, c.height).data };
    }
    async function apply(keep) { // keep: the selection stays and the rest becomes see-through; else the selection becomes see-through
      if (!sel || picture.busy) return;
      picture.setBusy(true);
      try {
        const before = await picture.snapshot();
        const { data } = selectionAtPictureSize();
        const img = picture.ctx.getImageData(0, 0, picture.width, picture.height);
        for (let i = 0; i < data.length; i += 4) { const a = data[i + 3] / 255; img.data[i + 3] = Math.round(img.data[i + 3] * (keep ? a : 1 - a)); }
        picture.ctx.putImageData(img, 0, 0);
        picture.commit(before);
        ctx.debug.log("Click-to-select: " + (keep ? "cut out the selection" : "made the selection see-through"));
        reset(true);
        ctx.status(keep ? "Cut out: only the selection is left (everything else is see-through). Undo brings it back." : "Done: the selection is see-through. Undo brings it back.", "ok");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); }
    }
    function useAsMarks() {
      if (!sel) return;
      const { data } = selectionAtPictureSize();
      const marks = new Uint8Array(picture.width * picture.height);
      for (let i = 0; i < marks.length; i++) marks[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
      ctx.useAsMarks(marks);
    }

    function reset(keepNothing) { prep = keepNothing ? null : prep; points = []; sel = null; deciding = false; again = false; selX.clearRect(0, 0, selC.width, selC.height); selC.style.display = "none"; if (keepNothing) picture.setPointerHandler(null); refresh(); }

    function refresh() {
      if (!mounted) return;
      const ready = ctl.state.phase === "ready", has = picture.loaded, idle = !picture.busy;
      ui.need.hidden = ready || ctl.state.phase === "checking";
      ui.prepare.disabled = !has || !idle || !ready;
      ui.prepare.textContent = prep ? "Read the picture again" : "Read the picture";
      ui.step2.hidden = !prep;
      ui.mode.children[0].classList.toggle("active", addMode); ui.mode.children[1].classList.toggle("active", !addMode);
      const has_sel = Boolean(sel) && idle;
      ui.undoClick.disabled = !points.length || !idle; ui.clear.disabled = !points.length || !idle;
      for (const b of [ui.keep, ui.hole, ui.marks]) b.disabled = !has_sel;
    }
    picture.onView(() => { if (mounted) drawSelection(); });
    picture.onOpen(() => { prep = null; reset(true); });
    ctl.subscribe(refresh);

    return {
      mount(panel) {
        mounted = true;
        const secA = el("section"); secA.append(el("h2", "", "Read the picture"));
        ui.need = el("p", "hint required", "Download required: get the model below first.");
        ui.prepare = el("button", "btn-solid big", "Read the picture"); ui.prepare.type = "button"; ui.prepare.addEventListener("click", prepare);
        const note = el("p", "hint", "The model reads the picture once (about 10 seconds on a tablet), then every click is quick. Read it again after you change the picture.");
        secA.append(ui.need, ui.prepare, note);

        ui.step2 = el("div"); ui.step2.hidden = true;
        const secB = el("section"); secB.append(el("h2", "", "Click to select"));
        ui.mode = el("div", "seg");
        for (const [label, add] of [["Add to selection", true], ["Take away", false]]) { const b = el("button", "", label); b.type = "button"; b.addEventListener("click", () => { addMode = add; refresh(); }); ui.mode.append(b); }
        ui.undoClick = el("button", "wide", "Remove the last click"); ui.undoClick.type = "button";
        ui.undoClick.addEventListener("click", () => { points.pop(); if (!points.length) sel = null; drawSelection(); refresh(); if (points.length) decode(); });
        ui.clear = el("button", "wide", "Clear the selection"); ui.clear.type = "button"; ui.clear.addEventListener("click", () => { points = []; sel = null; drawSelection(); refresh(); });
        const tip = el("p", "hint", "Click once on a thing. If it picked too little or too much, click again to add (green) or switch to Take away and click the part that should not be included (red).");
        secB.append(ui.mode, ui.undoClick, ui.clear, tip);
        const secC = el("section"); secC.append(el("h2", "", "Use the selection"));
        ui.keep = el("button", "btn-solid big", "Cut it out"); ui.keep.type = "button"; ui.keep.addEventListener("click", () => apply(true));
        ui.hole = el("button", "big", "Make it see-through"); ui.hole.type = "button"; ui.hole.addEventListener("click", () => apply(false));
        ui.marks = el("button", "big", "Send to Remove object"); ui.marks.type = "button"; ui.marks.addEventListener("click", useAsMarks);
        const use = el("p", "hint", "Cut it out keeps only the selection and makes everything else see-through. Make it see-through does the opposite. Send to Remove object marks it, so the AI fills it with what is behind it. Undo brings the picture back.");
        secC.append(ui.keep, ui.hole, ui.marks, use);
        ui.step2.append(secB, secC);

        const secD = el("section"); secD.append(el("h2", "", "Model"));
        secD.append(modelBox("sam", { compact: true, deletable: false }));
        panel.append(secA, ui.step2, secD);
        if (prep) picture.setPointerHandler(handler);
        drawSelection(); refresh();
      },
      unmount() { mounted = false; selC.style.display = "none"; picture.setPointerHandler(null); },
      onPictureChange() { if (prep && picture.depth !== prep.depth) { prep = null; reset(true); } refresh(); },
      primary() { if (!prep) prepare(); },
    };
  },
};
