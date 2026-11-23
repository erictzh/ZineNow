// Tool: Face blur. An on-device face detector (YuNet) finds where faces are; they are hidden with Blur, Pixelate or a Black box. Tap a box on the
// picture to leave that face alone, draw a box by hand to add one the detector missed. It finds faces only: it does not recognise anyone.

import { detectFaces } from "../../../../shared/js/ai/faceSession.js";
import { paddedBox } from "../../../../shared/js/ai/faces.js";
import { wrapNumberInput } from "../../../../shared/js/numberFields.js";
import { modelBox, modelControl } from "../models.js";

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const MIN_BOX = 8; // px: a hand-drawn box smaller than this is a tap, not a box

// Hides one box of `ctx` (the picture) using `src` (a copy of the picture as it was): mode "blur" | "pixel" | "black"; strength 1..100.
export function hideBox(ctx, src, b, mode, strength) {
  if (b.w < 1 || b.h < 1) return;
  if (mode === "black") { ctx.fillStyle = "#000"; ctx.fillRect(b.x, b.y, b.w, b.h); return; }
  if (mode === "pixel") {
    const cells = Math.max(3, Math.round(24 - (strength / 100) * 20)); // across the longer side
    const block = Math.max(2, Math.round(Math.max(b.w, b.h) / cells));
    const t = document.createElement("canvas"); t.width = Math.max(1, Math.round(b.w / block)); t.height = Math.max(1, Math.round(b.h / block));
    t.getContext("2d").drawImage(src, b.x, b.y, b.w, b.h, 0, 0, t.width, t.height);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(t, 0, 0, t.width, t.height, b.x, b.y, b.w, b.h); ctx.restore();
    return;
  }
  const radius = Math.max(1, (strength / 100) * 0.3 * Math.max(b.w, b.h));
  ctx.save();
  ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  if (typeof ctx.filter === "string") { ctx.filter = "blur(" + radius + "px)"; ctx.drawImage(src, 0, 0); }
  else { // no canvas filter here: shrink the box a lot and enlarge it again
    const f = Math.max(2, Math.round(radius / 2));
    const t = document.createElement("canvas"); t.width = Math.max(1, Math.round(b.w / f)); t.height = Math.max(1, Math.round(b.h / f));
    const tx = t.getContext("2d"); tx.imageSmoothingQuality = "high"; tx.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, t.width, t.height);
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(t, 0, 0, t.width, t.height, b.x, b.y, b.w, b.h);
  }
  ctx.restore();
}

export const faceBlurTool = {
  id: "face-blur",
  name: "Face blur",
  summary: "Find faces and hide them: blur, pixelate or a black box.",
  create(ctx) {
    const { picture } = ctx;
    const facesC = picture.addOverlay(document.createElement("canvas")); facesC.id = "faces"; facesC.style.display = "none";
    const fx = facesC.getContext("2d");
    const ctl = modelControl("face");
    let mounted = false, ui = {};
    let found = null; // { faces: [{x,y,w,h,score,on}], depth }
    let manual = [];  // boxes drawn by hand: { x, y, w, h, score: 1, manual: true, on: true }
    let minScore = 60, mode = "blur", strength = 50, pad = 15, drawMode = false;
    let drag = null;

    const visible = () => [...(found ? found.faces.filter((f) => f.score * 100 >= minScore) : []), ...manual];
    const boxOf = (f) => (f.manual ? { x: Math.round(f.x), y: Math.round(f.y), w: Math.round(f.w), h: Math.round(f.h) } : paddedBox(f, pad, picture.width, picture.height));

    function drawBoxes() {
      fx.clearRect(0, 0, facesC.width, facesC.height);
      if (!found && !manual.length && !drag) { facesC.style.display = "none"; return; }
      facesC.style.display = "";
      const s = picture.view.s;
      visible().forEach((f, i) => {
        const b = boxOf(f);
        fx.lineWidth = 3 / s;
        if (f.on) { fx.setLineDash([]); fx.strokeStyle = "#e8622a"; } else { fx.setLineDash([8 / s, 6 / s]); fx.strokeStyle = "#9a9a9a"; }
        fx.strokeRect(b.x, b.y, b.w, b.h);
        fx.setLineDash([]);
        const label = (i + 1) + (f.manual ? "" : " · " + Math.round(f.score * 100) + "%"), fs = 13 / s;
        fx.font = "bold " + fs + "px sans-serif";
        const tw = fx.measureText(label).width + 8 / s;
        fx.fillStyle = f.on ? "#e8622a" : "#6b6b6b"; fx.fillRect(b.x, Math.max(0, b.y - fs - 6 / s), tw, fs + 6 / s);
        fx.fillStyle = "#fff"; fx.fillText(label, b.x + 4 / s, Math.max(fs, b.y - 5 / s));
      });
      if (drag) { fx.setLineDash([8 / s, 6 / s]); fx.lineWidth = 2 / s; fx.strokeStyle = "#fff"; fx.strokeRect(Math.min(drag.a.x, drag.b.x), Math.min(drag.a.y, drag.b.y), Math.abs(drag.b.x - drag.a.x), Math.abs(drag.b.y - drag.a.y)); fx.setLineDash([]); }
      refresh();
    }

    const handler = {
      down(pt) {
        if (drawMode) { drag = { a: pt, b: pt }; return; }
        // tapping a box turns that face off or on (the smallest box under the finger wins)
        const hits = visible().filter((f) => { const b = boxOf(f); return pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h; }).sort((p, q) => p.w * p.h - q.w * q.h);
        if (hits.length) { hits[0].on = !hits[0].on; drawBoxes(); }
      },
      move(pt) { if (drag) { drag.b = pt; drawBoxes(); } },
      up() {
        if (!drag) return;
        const w = Math.abs(drag.b.x - drag.a.x), h = Math.abs(drag.b.y - drag.a.y);
        if (w >= MIN_BOX && h >= MIN_BOX) manual.push({ x: Math.min(drag.a.x, drag.b.x), y: Math.min(drag.a.y, drag.b.y), w, h, score: 1, manual: true, on: true });
        drag = null; drawBoxes();
      },
      cancel() { drag = null; drawBoxes(); },
    };

    function reset() { found = null; manual = []; drag = null; fx.clearRect(0, 0, facesC.width, facesC.height); facesC.style.display = "none"; refresh(); }

    async function find() {
      if (picture.busy || !picture.loaded || ctl.state.phase !== "ready") return;
      picture.setBusy(true);
      try {
        ctx.status("Starting the face detector…");
        const t0 = performance.now();
        const { faces, info } = await detectFaces(picture.canvas, (t) => ctx.status(t));
        found = { faces: faces.map((f) => ({ ...f, on: true })), depth: picture.depth };
        ctx.debug.section("Find faces", { picture: picture.width + "x" + picture.height, ...info, facesAt60pct: faces.filter((f) => f.score >= 0.6).length, bestScores: faces.slice(0, 8).map((f) => Math.round(f.score * 100) + "%").join(" ") });
        const n = visible().length;
        ctx.status("Found " + faces.length + " possible face" + (faces.length === 1 ? "" : "s") + " in " + ((performance.now() - t0) / 1000).toFixed(1) + " s; " + n + " shown at a minimum score of " + minScore + " %. Tap a box to leave that face alone, or draw a box by hand for one that was missed.", "ok");
        picture.setPointerHandler(handler);
        drawBoxes();
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); }
    }

    async function apply() {
      const todo = visible().filter((f) => f.on);
      if (!todo.length || picture.busy) { ctx.status("There is no face to hide: find faces first, or draw a box by hand.", "bad"); return; }
      picture.setBusy(true);
      try {
        const before = await picture.snapshot();
        const src = document.createElement("canvas"); src.width = picture.width; src.height = picture.height; src.getContext("2d").drawImage(picture.canvas, 0, 0);
        for (const f of todo) hideBox(picture.ctx, src, boxOf(f), mode, strength);
        picture.commit(before);
        ctx.debug.log("Face blur applied: " + todo.length + " box(es), " + mode + ", strength " + strength + ", grow " + pad + " %");
        reset();
        ctx.status("Hid " + todo.length + " face" + (todo.length === 1 ? "" : "s") + " (" + (mode === "blur" ? "blur" : mode === "pixel" ? "pixelate" : "black box") + "). Undo brings them back.", "ok");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); }
    }

    function refresh() {
      if (!mounted) return;
      const ready = ctl.state.phase === "ready", has = picture.loaded, idle = !picture.busy;
      ui.need.hidden = ready || ctl.state.phase === "checking";
      ui.find.disabled = !has || !idle || !ready;
      const n = visible().filter((f) => f.on).length;
      ui.apply.disabled = !has || !idle || n === 0;
      ui.apply.textContent = n ? "Hide " + n + " face" + (n === 1 ? "" : "s") : "Hide faces";
      ui.draw.classList.toggle("active", drawMode); ui.draw.textContent = drawMode ? "Drawing a box: drag on the picture (tap to stop)" : "Draw a box by hand";
      ui.draw.disabled = !has || !idle;
      ui.clearManual.hidden = !manual.length;
      ui.minScore.closest(".field").classList.toggle("off", !found);
      ui.strength.disabled = mode === "black";
    }
    picture.onView(() => { if (mounted) drawBoxes(); });
    picture.onOpen(reset);
    ctl.subscribe(refresh);

    return {
      mount(panel) {
        mounted = true;
        const secA = el("section"); secA.append(el("h2", "", "Find faces"));
        ui.need = el("p", "hint required", "Download required: get the face model below first.");
        ui.find = el("button", "btn-solid big", "Find faces"); ui.find.type = "button"; ui.find.addEventListener("click", find);
        const msF = el("label", "field"); msF.append(el("span", "", "Minimum score (%)"));
        const ms = document.createElement("input"); ms.type = "number"; ms.min = 10; ms.max = 100; ms.step = 5; ms.value = minScore;
        ms.addEventListener("input", () => { const v = Number(ms.value); if (ms.value.trim() !== "" && Number.isFinite(v)) { minScore = Math.min(100, Math.max(10, v)); drawBoxes(); } });
        msF.append(ms); wrapNumberInput(ms); ui.minScore = ms;
        const msH = el("p", "hint", "Lower shows more possible faces (and more false ones). Tap a box on the picture to leave that face alone; tap again to include it.");
        ui.draw = el("button", "wide", "Draw a box by hand"); ui.draw.type = "button";
        ui.draw.addEventListener("click", () => { drawMode = !drawMode; if (picture.loaded) picture.setPointerHandler(handler); refresh(); });
        ui.clearManual = el("button", "wide", "Remove my hand-drawn boxes"); ui.clearManual.type = "button"; ui.clearManual.hidden = true;
        ui.clearManual.addEventListener("click", () => { manual = []; drawBoxes(); if (!found) { facesC.style.display = "none"; } });
        secA.append(ui.need, ui.find, msF, msH, ui.draw, ui.clearManual);

        const secB = el("section"); secB.append(el("h2", "", "Hide them with"));
        const seg = el("div", "seg"); seg.style.gridTemplateColumns = "repeat(3, 1fr)";
        for (const [key, label] of [["blur", "Blur"], ["pixel", "Pixelate"], ["black", "Black box"]]) {
          const b = el("button", key === mode ? "active" : "", label); b.type = "button";
          b.addEventListener("click", () => { mode = key; for (const o of seg.children) o.classList.toggle("active", o === b); refresh(); });
          seg.append(b);
        }
        const stF = el("label", "field"); stF.append(el("span", "", "Strength (%)"));
        const st = document.createElement("input"); st.type = "number"; st.min = 1; st.max = 100; st.step = 5; st.value = strength;
        st.addEventListener("input", () => { const v = Number(st.value); if (st.value.trim() !== "" && Number.isFinite(v)) strength = Math.min(100, Math.max(1, v)); });
        stF.append(st); wrapNumberInput(st); ui.strength = st;
        const pdF = el("label", "field"); pdF.append(el("span", "", "Grow each box by (%)"));
        const pd = document.createElement("input"); pd.type = "number"; pd.min = 0; pd.max = 100; pd.step = 5; pd.value = pad;
        pd.addEventListener("input", () => { const v = Number(pd.value); if (pd.value.trim() !== "" && Number.isFinite(v)) { pad = Math.min(100, Math.max(0, v)); drawBoxes(); } });
        pdF.append(pd); wrapNumberInput(pd);
        const pdH = el("p", "hint", "The detector's box is tight; a little extra covers the forehead, ears and chin. Hand-drawn boxes are used as drawn.");
        ui.apply = el("button", "btn-solid big", "Hide faces"); ui.apply.type = "button"; ui.apply.addEventListener("click", apply);
        const note = el("p", "hint", "Hiding is applied to the picture (Undo brings it back). The detector only finds where faces are; it does not recognise or identify anyone.");
        secB.append(seg, stF, pdF, pdH, ui.apply, note);

        const secC = el("section"); secC.append(el("h2", "", "Model"));
        secC.append(modelBox("face", { compact: true, deletable: false }));
        panel.append(secA, secB, secC);
        if (found || manual.length || drawMode) picture.setPointerHandler(handler);
        drawBoxes(); refresh();
      },
      unmount() {
        mounted = false; drag = null;
        facesC.style.display = "none"; picture.setPointerHandler(null);
      },
      onPictureChange() {
        if (found && picture.depth !== found.depth) reset();
        refresh();
      },
      primary() { if (found || manual.length) apply(); else find(); },
    };
  },
};
