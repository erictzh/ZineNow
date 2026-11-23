// Tool: Remove background. An on-device model (U²-Netp General or MODNet Portrait) finds the main subject; the picture is shown with
// everything else see-through (on a checkerboard) while Edge cut-off and Soft edge are adjusted, and Apply makes it the picture.
// Optional Crop first: draw a box, and only what is inside it is used; the picture becomes that area when you Apply (Undo brings it back).

import { BG_MODELS, bgModel } from "../../../../shared/js/ai/bgModel.js";
import { cutOutCanvas, segmentCanvas } from "../../../../shared/js/ai/bgSession.js";
import { maskStats } from "../../../../shared/js/ai/segment.js";
import { alphaStats } from "../debug.js";
import { wrapNumberInput } from "../../../../shared/js/numberFields.js";
import { modelBox, modelControl } from "../models.js";

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const DEFAULT_CUTOFF = 0.1; // % (the useful cut-offs are very small: the models answer close to 0 on the background)
const MIN_CROP = 16; // px

// Which part of the crop box is under `pt` (image px): a corner "nw" "ne" "sw" "se", an edge "n" "s" "w" "e", "move" (inside), or null.
function hitCrop(c, pt, tol) {
  const nearL = Math.abs(pt.x - c.x) <= tol, nearR = Math.abs(pt.x - (c.x + c.w)) <= tol;
  const nearT = Math.abs(pt.y - c.y) <= tol, nearB = Math.abs(pt.y - (c.y + c.h)) <= tol;
  const inX = pt.x > c.x - tol && pt.x < c.x + c.w + tol, inY = pt.y > c.y - tol && pt.y < c.y + c.h + tol;
  if (nearT && nearL) return "nw"; if (nearT && nearR) return "ne"; if (nearB && nearL) return "sw"; if (nearB && nearR) return "se";
  if (nearT && inX) return "n"; if (nearB && inX) return "s"; if (nearL && inY) return "w"; if (nearR && inY) return "e";
  if (pt.x > c.x && pt.x < c.x + c.w && pt.y > c.y && pt.y < c.y + c.h) return "move";
  return null;
}

export const removeBackgroundTool = {
  id: "remove-background",
  name: "Remove background",
  summary: "Keep the main subject, make the rest see-through.",
  create(ctx) {
    const { picture } = ctx;
    const cropC = picture.addOverlay(document.createElement("canvas")); cropC.id = "crop"; cropC.style.display = "none";
    const cropX = cropC.getContext("2d");
    const previewC = picture.addOverlay(document.createElement("canvas")); previewC.id = "preview"; previewC.style.display = "none";
    const previewX = previewC.getContext("2d");
    let mounted = false, ui = {}, boxEl = null;
    let modelKey = BG_MODELS[0].key;
    let cutoff = DEFAULT_CUTOFF, soft = 10;
    let found = null; // { mask, side, depth, region: {x,y,w,h}, src }: the subject mask for the (cropped) picture as it is now
    let crop = null;  // { x, y, w, h } in picture px while "Crop first" is on, else null
    let raf = 0;
    const ctl = () => modelControl("bg:" + modelKey);

    // ---- the crop box ----
    function drawCrop() {
      cropX.clearRect(0, 0, cropC.width, cropC.height);
      if (!crop || found) { cropC.style.display = "none"; return; }
      cropC.style.display = "";
      const s = picture.view.s, c = crop;
      cropX.fillStyle = "rgba(0,0,0,.55)"; cropX.fillRect(0, 0, cropC.width, cropC.height);
      cropX.clearRect(c.x, c.y, c.w, c.h);
      cropX.lineWidth = 2 / s; cropX.strokeStyle = "#fff"; cropX.strokeRect(c.x, c.y, c.w, c.h);
      cropX.strokeStyle = "rgba(255,255,255,.45)"; cropX.lineWidth = 1 / s;
      for (const f of [1 / 3, 2 / 3]) { cropX.beginPath(); cropX.moveTo(c.x + c.w * f, c.y); cropX.lineTo(c.x + c.w * f, c.y + c.h); cropX.moveTo(c.x, c.y + c.h * f); cropX.lineTo(c.x + c.w, c.y + c.h * f); cropX.stroke(); }
      const hs = 9 / s; cropX.fillStyle = "#e8622a"; cropX.strokeStyle = "#fff"; cropX.lineWidth = 1.5 / s;
      for (const [hx, hy] of [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h], [c.x + c.w / 2, c.y], [c.x + c.w / 2, c.y + c.h], [c.x, c.y + c.h / 2], [c.x + c.w, c.y + c.h / 2]]) { cropX.fillRect(hx - hs, hy - hs, hs * 2, hs * 2); cropX.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2); }
      if (ui.cropInfo) ui.cropInfo.textContent = "Crop: " + Math.round(c.w) + " × " + Math.round(c.h) + " px (of " + picture.width + " × " + picture.height + ")";
    }
    let drag = null; // { part, start, orig }
    const cropHandler = {
      down(pt) {
        if (!crop) return;
        const part = hitCrop(crop, pt, 18 / picture.view.s);
        if (part) drag = { part, start: pt, orig: { ...crop } };
      },
      move(pt) {
        if (!drag || !crop) return;
        const o = drag.orig, dx = pt.x - drag.start.x, dy = pt.y - drag.start.y, W = picture.width, H = picture.height;
        let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
        if (drag.part === "move") {
          const nx = Math.min(Math.max(0, o.x + dx), W - o.w), ny = Math.min(Math.max(0, o.y + dy), H - o.h);
          crop = { x: nx, y: ny, w: o.w, h: o.h };
        } else {
          if (drag.part.includes("w")) x0 = Math.min(Math.max(0, o.x + dx), x1 - MIN_CROP);
          if (drag.part.includes("e")) x1 = Math.max(Math.min(W, o.x + o.w + dx), x0 + MIN_CROP);
          if (drag.part.includes("n")) y0 = Math.min(Math.max(0, o.y + dy), y1 - MIN_CROP);
          if (drag.part.includes("s")) y1 = Math.max(Math.min(H, o.y + o.h + dy), y0 + MIN_CROP);
          crop = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        }
        drawCrop();
      },
      up() { drag = null; },
      cancel() { drag = null; },
    };
    function setCrop(on) {
      if (on && picture.loaded) {
        const mx = picture.width * 0.1, my = picture.height * 0.1;
        crop = crop || { x: mx, y: my, w: picture.width - 2 * mx, h: picture.height - 2 * my };
        discard();
        picture.setPointerHandler(cropHandler);
      } else {
        crop = null; drag = null;
        picture.setPointerHandler(null);
      }
      drawCrop(); refresh();
    }

    // ---- finding the subject and the preview ----
    const discard = () => {
      found = null; previewC.style.display = "none"; previewX.clearRect(0, 0, previewC.width, previewC.height);
      picture.canvas.style.visibility = "visible";
      if (crop && mounted) picture.setPointerHandler(cropHandler);
      drawCrop(); refresh();
    };
    function drawPreview() {
      raf = 0;
      if (!found) return;
      previewX.clearRect(0, 0, previewC.width, previewC.height);
      previewX.drawImage(cutOutCanvas(found.src, found.mask, found.side, cutoff / 100, Math.max(0.1, soft) / 100), found.region.x, found.region.y);
    }
    const queuePreview = () => { if (!raf) raf = requestAnimationFrame(drawPreview); };
    // the picture, or just the crop box, as a canvas of its own
    function regionCanvas() {
      const r = crop ? { x: Math.round(crop.x), y: Math.round(crop.y), w: Math.round(crop.w), h: Math.round(crop.h) } : { x: 0, y: 0, w: picture.width, h: picture.height };
      const c = document.createElement("canvas"); c.width = r.w; c.height = r.h;
      c.getContext("2d").drawImage(picture.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      return { canvas: c, region: r };
    }

    async function find() {
      if (picture.busy || !picture.loaded || ctl().state.phase !== "ready") return;
      picture.setBusy(true);
      try {
        ctx.status("Starting " + bgModel(modelKey).name + "…");
        const t0 = performance.now();
        const { canvas: src, region } = regionCanvas();
        const { mask, side, info } = await segmentCanvas(src, modelKey, (t) => ctx.status(t));
        found = { mask, side, depth: picture.depth, region, src };
        ctx.debug.section("Find subject", { model: bgModel(modelKey).label, picture: picture.width + "x" + picture.height, region: region.w + "x" + region.h + " at " + region.x + "," + region.y, maskSide: side, ...info, edgeCutoffPct: cutoff, softEdgePct: soft, maskStats: maskStats(mask) });
        picture.setPointerHandler(null);
        previewC.style.display = ""; picture.canvas.style.visibility = "hidden";
        drawPreview(); drawCrop();
        ctx.debug.section("Preview at the current cut-off", alphaStats(previewC));
        ctx.status("Found the subject in " + ((performance.now() - t0) / 1000).toFixed(1) + " s. Adjust the Edge cut-off if needed, then press Apply." + (crop ? " The picture will become the cropped area." : ""), "ok");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); }
    }
    async function apply() {
      if (!found || picture.busy) return;
      const before = await picture.snapshot();
      const out = cutOutCanvas(found.src, found.mask, found.side, cutoff / 100, Math.max(0.1, soft) / 100);
      const cropped = found.region.w !== picture.width || found.region.h !== picture.height;
      picture.replaceWith(out); // the whole picture, or just the cropped area (the picture then has that size)
      picture.commit(before);
      ctx.debug.section("Apply", { edgeCutoffPct: cutoff, softEdgePct: soft, cropped: cropped, pictureNow: alphaStats(picture.canvas) });
      crop = null; drag = null; picture.setPointerHandler(null);
      discard();
      ctx.status(cropped ? "Applied: the picture is now the cropped area. Undo brings the whole picture back." : "Applied. Not right? Undo, then change the Edge cut-off or the model and find the subject again.", "ok");
    }

    function refresh() {
      if (!mounted) return;
      const ready = ctl().state.phase === "ready", has = picture.loaded, idle = !picture.busy;
      for (const k of ["cutoff", "soft"]) { ui[k].disabled = !ready; ui[k].closest(".field").classList.toggle("off", !ready); }
      for (const n of ui.need) n.hidden = ready || ctl().state.phase === "checking";
      ui.find.disabled = !has || !idle || !ready;
      ui.apply.hidden = ui.discard.hidden = !found; ui.apply.disabled = ui.discard.disabled = !idle;
      ui.find.hidden = Boolean(found);
      ui.cropToggle.disabled = !has || !idle || Boolean(found);
      ui.cropToggle.textContent = crop ? "Remove the crop box" : "Crop first…";
      ui.cropBox.hidden = !crop;
      if (!crop) ui.cropInfo.textContent = "";
    }
    const unsub = [];
    function drawModelBox() {
      if (boxEl) { boxEl.dispose && boxEl.dispose(); boxEl.remove(); }
      boxEl = modelBox("bg:" + modelKey);
      ui.boxHost.append(boxEl);
    }
    picture.onView(() => { if (mounted) drawCrop(); });
    picture.onOpen(() => { crop = null; drag = null; found = null; previewC.style.display = "none"; cropC.style.display = "none"; picture.canvas.style.visibility = "visible"; });

    return {
      mount(panel) {
        mounted = true;
        const sec1 = el("section"); sec1.append(el("h2", "", "1. Model"));
        const radios = el("div", "radios");
        for (const m of BG_MODELS) {
          const lab = el("label", "radio"); const r = document.createElement("input"); r.type = "radio"; r.name = "bg-model"; r.checked = m.key === modelKey;
          r.addEventListener("change", () => { modelKey = m.key; discard(); drawModelBox(); refresh(); });
          lab.append(r, el("span", "", " " + m.label + " · " + m.mb + " MB")); radios.append(lab);
        }
        ui.boxHost = el("div");
        sec1.append(radios, ui.boxHost);

        const secC = el("section"); secC.append(el("h2", "", "2. Crop first (optional)"));
        ui.cropToggle = el("button", "wide", "Crop first…"); ui.cropToggle.type = "button"; ui.cropToggle.addEventListener("click", () => setCrop(!crop));
        ui.cropBox = el("div"); ui.cropBox.hidden = true;
        ui.cropInfo = el("p", "hint");
        const cropHint = el("p", "hint", "Drag the box or its edges and corners. Only what is inside is used, which also helps the model on a busy picture. When you Apply, the picture becomes the cropped area (Undo brings the whole picture back).");
        const reset = el("button", "wide", "Reset the box"); reset.type = "button"; reset.addEventListener("click", () => { crop = null; setCrop(true); });
        ui.cropBox.append(ui.cropInfo, cropHint, reset);
        secC.append(ui.cropToggle, ui.cropBox);

        const sec2 = el("section"); sec2.append(el("h2", "", "3. Cut out"));
        const num = (label, key, min, max, step, value, onInput) => {
          const f = el("label", "field"); f.append(el("span", "", label));
          const i = document.createElement("input"); i.type = "number"; i.min = min; i.max = max; i.step = step; i.value = value;
          i.addEventListener("input", () => { const v = Number(i.value); if (i.value.trim() !== "" && Number.isFinite(v)) { onInput(Math.min(max, Math.max(min, v))); queuePreview(); } });
          f.append(i); wrapNumberInput(i); ui[key] = i; return f;
        };
        const need = () => { const p = el("p", "hint required", "Download required"); return p; };
        ui.need = [need(), need()];
        const f1 = num("Edge cut-off (%)", "cutoff", 0, 100, 0.125, cutoff, (v) => { cutoff = v; });
        const h1 = el("p", "hint", "Higher keeps less of the edge (a tighter cut). 0 keeps everything. You can type finer values like 0.05.");
        const f2 = num("Soft edge (%)", "soft", 0.1, 50, 0.5, soft, (v) => { soft = v; });
        ui.find = el("button", "btn-solid big", "Find subject"); ui.find.type = "button"; ui.find.addEventListener("click", find);
        ui.apply = el("button", "btn-solid big", "Apply"); ui.apply.type = "button"; ui.apply.addEventListener("click", apply);
        ui.discard = el("button", "big", "Discard"); ui.discard.type = "button"; ui.discard.addEventListener("click", () => { discard(); ctx.status("Discarded."); });
        const note = el("p", "hint", "Works on the picture as it is now. Apply makes it the picture (Undo brings it back).");
        sec2.append(f1, ui.need[0], h1, f2, ui.need[1], ui.find, ui.apply, ui.discard, note);
        panel.append(sec1, secC, sec2);
        drawModelBox();
        for (const id of BG_MODELS.map((m) => "bg:" + m.key)) unsub.push(modelControl(id).subscribe(refresh));
        if (crop) picture.setPointerHandler(cropHandler);
        drawCrop(); refresh();
      },
      unmount() {
        mounted = false; drag = null;
        const keep = crop; discard(); crop = keep; // the preview goes; the crop box is remembered but hidden
        cropC.style.display = "none"; picture.setPointerHandler(null);
        while (unsub.length) unsub.pop()();
        if (boxEl) { boxEl.dispose && boxEl.dispose(); boxEl = null; }
      },
      onPictureChange() {
        if (found && picture.depth !== found.depth) discard();
        if (crop && (crop.x + crop.w > picture.width + 1 || crop.y + crop.h > picture.height + 1)) { crop = null; picture.setPointerHandler(null); drawCrop(); }
        refresh();
      },
      primary() { if (found) apply(); else find(); },
    };
  },
};
