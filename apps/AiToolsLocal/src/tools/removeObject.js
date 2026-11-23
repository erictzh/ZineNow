// Tool: Remove object. Mark what to remove (brush, box), press Remove object: MI-GAN (on this device) fills the marked area with what
// would plausibly be behind it. "Try another" shows the model a slightly different view of the same marks (shared/js/ai/variations.js).

import { dilate, holeBounds } from "../../../../shared/js/ai/fill.js";
import { aiFillMask } from "../../../../shared/js/ai/fillMask.js";
import { wrapNumberInput } from "../../../../shared/js/numberFields.js";
import { modelBox, modelControl } from "../models.js";

const SETTINGS_KEY = "zinenow.aitools.settings";
const settings = { brush: 40, grow: 6 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")); } catch (e) { /* defaults */ }
const save = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* not kept */ } };

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export const removeObjectTool = {
  id: "remove-object",
  name: "Remove object",
  summary: "Mark something, it is filled with what would be behind it.",
  create(ctx) {
    const { picture } = ctx;
    const maskC = picture.addOverlay(document.createElement("canvas")); maskC.id = "mask";
    const draftC = picture.addOverlay(document.createElement("canvas")); draftC.id = "draft";
    const maskX = maskC.getContext("2d", { willReadFrequently: true }), draftX = draftC.getContext("2d");
    const ring = el("div", "ring"); ring.hidden = true; picture.stage.append(ring);
    const ctl = modelControl("fill");
    let mounted = false, tool = "brush", stroke = null;
    let last = null; // { marked, variation, depth }: the last fill, so "Try another" can redo it
    let ui = {};

    const markedPixels = () => {
      const d = maskX.getImageData(0, 0, maskC.width, maskC.height).data;
      const m = new Uint8Array(maskC.width * maskC.height);
      for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 64 ? 1 : 0;
      return m;
    };
    const clearMarks = () => maskX.clearRect(0, 0, maskC.width, maskC.height);

    function paintLine(a, b) {
      maskX.save();
      maskX.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
      maskX.strokeStyle = maskX.fillStyle = "#e8622a"; maskX.lineCap = maskX.lineJoin = "round";
      maskX.lineWidth = settings.brush;
      maskX.beginPath(); maskX.moveTo(a.x, a.y); maskX.lineTo(b.x + 0.01, b.y); maskX.stroke();
      maskX.restore();
    }
    const handler = {
      down(pt, e) {
        if (tool === "pan") stroke = { kind: "pan", sx: e.clientX, sy: e.clientY, v: picture.view };
        else if (tool === "box") stroke = { kind: "box", a: pt, b: pt };
        else { stroke = { kind: "paint", last: pt }; paintLine(pt, pt); }
      },
      move(pt, e) {
        if (!stroke) return;
        if (stroke.kind === "pan") picture.setView({ ...stroke.v, x: stroke.v.x + e.clientX - stroke.sx, y: stroke.v.y + e.clientY - stroke.sy });
        else if (stroke.kind === "paint") { paintLine(stroke.last, pt); stroke.last = pt; }
        else if (stroke.kind === "box") {
          stroke.b = pt; draftX.clearRect(0, 0, draftC.width, draftC.height);
          const s = picture.view.s;
          draftX.strokeStyle = "#ffffff"; draftX.setLineDash([8 / s, 6 / s]); draftX.lineWidth = 2 / s;
          draftX.strokeRect(stroke.a.x, stroke.a.y, pt.x - stroke.a.x, pt.y - stroke.a.y);
        }
      },
      up() {
        if (stroke && stroke.kind === "box") {
          draftX.clearRect(0, 0, draftC.width, draftC.height);
          maskX.fillStyle = "#e8622a"; maskX.fillRect(Math.min(stroke.a.x, stroke.b.x), Math.min(stroke.a.y, stroke.b.y), Math.abs(stroke.b.x - stroke.a.x), Math.abs(stroke.b.y - stroke.a.y));
        }
        stroke = null;
      },
      cancel() { draftX.clearRect(0, 0, draftC.width, draftC.height); stroke = null; },
    };
    // a ring the size of the brush follows the pointer (not while moving or boxing)
    function showRing(e) {
      if (!mounted || !picture.loaded || (tool !== "brush" && tool !== "erase")) { ring.hidden = true; return; }
      const r = picture.stage.getBoundingClientRect(), d = Math.max(4, settings.brush * picture.view.s);
      ring.style.width = ring.style.height = d + "px";
      ring.style.left = e.clientX - r.left - d / 2 + "px"; ring.style.top = e.clientY - r.top - d / 2 + "px";
      ring.hidden = false;
    }
    const hideRing = () => { ring.hidden = true; };
    const touchHide = (e) => { if (e.pointerType !== "mouse") ring.hidden = true; };

    // ---- the fill ----
    async function runFill(marked, variation) {
      const w = picture.width, h = picture.height;
      const grow = Math.max(0, Math.round(settings.grow));
      picture.setBusy(true);
      const t0 = performance.now();
      let before = null;
      try {
        before = await picture.snapshot();
        ctx.status("Removing it…");
        await new Promise((r) => setTimeout(r, 30)); // let the message show
        const ok = await aiFillMask(picture.ctx, (extra) => dilate(marked, w, h, grow + extra), variation, (t) => ctx.status(t));
        if (!ok) { before.close(); ctx.status("Paint over the object first (Brush or Box), then press Remove object.", "bad"); return; }
        picture.commit(before); before = null;
        clearMarks();
        last = { marked, variation, depth: picture.depth };
        ctx.status("Done in " + ((performance.now() - t0) / 1000).toFixed(1) + " s" + (variation ? " (variation " + variation + ")" : "") + ". Not right? Try another, Undo, or mark a bit differently.", "ok");
      } catch (e) {
        if (before) { picture.ctx.clearRect(0, 0, w, h); picture.ctx.drawImage(before, 0, 0); before.close(); } // put the picture back as it was
        ctx.status("Something went wrong: " + (e && e.message ? e.message : e) + " The picture was left as it was.", "bad");
      } finally { picture.setBusy(false); }
    }
    function removeObject() {
      if (picture.busy || !picture.loaded) return;
      if (ctl.state.phase !== "ready") { ctx.status("Download the model first (below).", "bad"); return; }
      const marked = markedPixels();
      if (!holeBounds(marked, picture.width, picture.height)) { ctx.status("Paint over the object first (Brush or Box), then press Remove object.", "bad"); return; }
      runFill(marked, 0);
    }
    async function tryAnother() {
      if (picture.busy || !last || picture.depth !== last.depth || ctl.state.phase !== "ready") return;
      const { marked, variation } = last;
      await picture.undo(); // back to before the last fill, then fill again with the next variation
      runFill(marked, variation + 1);
    }

    function refreshButtons() {
      if (!mounted) return;
      const ready = ctl.state.phase === "ready", has = picture.loaded, idle = !picture.busy;
      ui.clear.disabled = !has || !idle;
      ui.fill.disabled = !has || !idle || !ready;
      ui.another.disabled = !has || !idle || !ready || !last || picture.depth !== last.depth;
      ui.need.hidden = ready || ctl.state.phase === "checking";
    }
    ctl.subscribe(refreshButtons);

    return {
      mount(panel) {
        mounted = true;
        for (const c of [maskC, draftC]) c.style.display = "";
        picture.setPointerHandler(handler);
        picture.stage.addEventListener("pointermove", showRing); picture.stage.addEventListener("pointerdown", showRing);
        picture.stage.addEventListener("pointerleave", hideRing); picture.stage.addEventListener("pointerup", touchHide);

        const sec1 = el("section"); sec1.append(el("h2", "", "Mark what to remove"));
        const seg = el("div", "seg"); seg.setAttribute("role", "group");
        for (const [key, label] of [["brush", "Brush"], ["erase", "Erase mark"], ["box", "Box"], ["pan", "Move"]]) {
          const b = el("button", key === tool ? "active" : "", label); b.type = "button";
          b.addEventListener("click", () => { tool = key; for (const o of seg.children) o.classList.toggle("active", o === b); });
          seg.append(b);
        }
        const brushField = el("label", "field"); brushField.append(el("span", "", "Brush size (px)"));
        const brush = document.createElement("input"); brush.type = "number"; brush.min = 1; brush.max = 400; brush.step = 5; brush.value = settings.brush;
        brush.addEventListener("input", () => { const v = Number(brush.value); if (v >= 1) { settings.brush = v; save(); } });
        brushField.append(brush); wrapNumberInput(brush);
        ui.brush = brush;
        const hint = el("p", "hint", "Two fingers always move and zoom the picture.");
        ui.clear = el("button", "", "Clear marks"); ui.clear.type = "button"; ui.clear.addEventListener("click", clearMarks);
        sec1.append(seg, brushField, hint, ui.clear);

        const sec2 = el("section"); sec2.append(el("h2", "", "Remove it"));
        const growField = el("label", "field"); growField.append(el("span", "", "Grow the marked area by (px)"));
        const grow = document.createElement("input"); grow.type = "number"; grow.min = 0; grow.max = 60; grow.step = 1; grow.value = settings.grow;
        grow.addEventListener("input", () => { const v = Number(grow.value); if (v >= 0) { settings.grow = v; save(); } });
        growField.append(grow); wrapNumberInput(grow);
        const growHint = el("p", "hint", "A few pixels more than you painted covers shadows and fringes.");
        ui.need = el("p", "hint required", "Download required: get the model below first."); 
        ui.fill = el("button", "btn-solid big", "Remove object"); ui.fill.type = "button"; ui.fill.addEventListener("click", removeObject);
        ui.another = el("button", "big", "Try another"); ui.another.type = "button"; ui.another.title = "Undoes the last fill and fills again, showing the model the area from a slightly different view"; ui.another.addEventListener("click", tryAnother);
        sec2.append(growField, growHint, ui.need, ui.fill, ui.another);

        const sec3 = el("section"); sec3.append(el("h2", "", "Model"));
        sec3.append(modelBox("fill", { compact: true, deletable: false }));
        panel.append(sec1, sec2, sec3);
        refreshButtons();
      },
      unmount() {
        mounted = false; stroke = null; ring.hidden = true;
        for (const c of [maskC, draftC]) c.style.display = "none";
        picture.setPointerHandler(null);
        picture.stage.removeEventListener("pointermove", showRing); picture.stage.removeEventListener("pointerdown", showRing);
        picture.stage.removeEventListener("pointerleave", hideRing); picture.stage.removeEventListener("pointerup", touchHide);
      },
      // marks made elsewhere (Click-to-select): shown as the marks to fill
      importMask(mask) {
        clearMarks();
        const w = maskC.width, h = maskC.height, id = maskX.createImageData(w, h);
        for (let i = 0; i < w * h && i < mask.length; i++) if (mask[i]) { id.data[i * 4] = 232; id.data[i * 4 + 1] = 98; id.data[i * 4 + 2] = 42; id.data[i * 4 + 3] = 255; }
        maskX.putImageData(id, 0, 0);
      },
      onPictureChange: refreshButtons,
      primary: removeObject,
      onKey(e) {
        if (e.key !== "[" && e.key !== "]") return false;
        const v = Math.min(400, Math.max(1, Math.round(settings.brush * (e.key === "]" ? 1.2 : 1 / 1.2) + (e.key === "]" ? 1 : -1))));
        settings.brush = v; if (ui.brush) ui.brush.value = v; save();
        return true;
      },
    };
  },
};
