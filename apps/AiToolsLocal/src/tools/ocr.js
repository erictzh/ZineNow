// Tool: Text from image (OCR). Tesseract.js reads the text in the picture (or in an area you draw) on this device; the text can be copied or
// saved as .txt, and the words it found are boxed on the picture, coloured by how sure it is. Works best on clean printed text.

import { OCR_LANGS, ocrLang } from "../../../../shared/js/ai/ocrLangs.js";
import { recognizeText } from "../../../../shared/js/ai/ocr.js";
import { downloadBlob } from "../../../../shared/js/download.js";
import { modelBox, modelControl } from "../models.js";

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const MIN_BOX = 12;
const PSMS = [["3", "Automatic (a normal page with paragraphs)"], ["11", "Scattered text (signs, posters, zine pages)"], ["6", "One block of text"], ["7", "One line"]];
export const confColor = (c) => (c >= 80 ? "#3fd26f" : c >= 55 ? "#f2c94c" : "#ff5a5a");

export const ocrTool = {
  id: "ocr",
  name: "Text from image",
  summary: "Read the text in a picture and copy it.",
  create(ctx) {
    const { picture } = ctx;
    const boxesC = picture.addOverlay(document.createElement("canvas")); boxesC.id = "ocrboxes"; boxesC.style.display = "none";
    const bx = boxesC.getContext("2d");
    let mounted = false, ui = {}, boxEl = null;
    let lang = "eng", psm = "3", showBoxes = true, drawMode = false;
    let area = null;   // { x, y, w, h } the part to read, or null for the whole picture
    let result = null; // { words, region, depth }
    let drag = null;
    const unsub = [];
    const ctl = () => modelControl("ocr:" + lang);

    function drawOverlay() {
      bx.clearRect(0, 0, boxesC.width, boxesC.height);
      if (!area && !(result && showBoxes) && !drag) { boxesC.style.display = "none"; return; }
      boxesC.style.display = "";
      const s = picture.view.s;
      if (area) { bx.lineWidth = 2.5 / s; bx.setLineDash([8 / s, 6 / s]); bx.strokeStyle = "#fff"; bx.strokeRect(area.x, area.y, area.w, area.h); bx.setLineDash([]); }
      if (result && showBoxes) {
        bx.lineWidth = Math.max(1.5, 2 / s);
        for (const w of result.words) { bx.strokeStyle = confColor(w.confidence); bx.strokeRect(result.region.x + w.bbox.x0, result.region.y + w.bbox.y0, w.bbox.x1 - w.bbox.x0, w.bbox.y1 - w.bbox.y0); }
      }
      if (drag) { bx.lineWidth = 2 / s; bx.setLineDash([8 / s, 6 / s]); bx.strokeStyle = "#e8622a"; bx.strokeRect(Math.min(drag.a.x, drag.b.x), Math.min(drag.a.y, drag.b.y), Math.abs(drag.b.x - drag.a.x), Math.abs(drag.b.y - drag.a.y)); bx.setLineDash([]); }
    }
    const handler = {
      down(pt) { if (drawMode) drag = { a: pt, b: pt }; },
      move(pt) { if (drag) { drag.b = pt; drawOverlay(); } },
      up() {
        if (!drag) return;
        const x0 = Math.max(0, Math.min(drag.a.x, drag.b.x)), y0 = Math.max(0, Math.min(drag.a.y, drag.b.y));
        const x1 = Math.min(picture.width, Math.max(drag.a.x, drag.b.x)), y1 = Math.min(picture.height, Math.max(drag.a.y, drag.b.y));
        if (x1 - x0 >= MIN_BOX && y1 - y0 >= MIN_BOX) { area = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; result = null; ui.text.value = ""; ui.conf.textContent = ""; drawMode = false; }
        drag = null; drawOverlay(); refresh();
      },
      cancel() { drag = null; drawOverlay(); },
    };
    function reset() { area = null; result = null; drag = null; drawMode = false; if (ui.text) { ui.text.value = ""; ui.conf.textContent = ""; } drawOverlay(); refresh(); }

    async function read() {
      if (picture.busy || !picture.loaded || ctl().state.phase !== "ready") return;
      picture.setBusy(true);
      try {
        ctx.status("Starting the text reader…");
        const region = area ? { x: Math.round(area.x), y: Math.round(area.y), w: Math.round(area.w), h: Math.round(area.h) } : { x: 0, y: 0, w: picture.width, h: picture.height };
        const src = document.createElement("canvas"); src.width = region.w; src.height = region.h;
        src.getContext("2d").drawImage(picture.canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
        const t0 = performance.now();
        const r = await recognizeText(src, { lang, psm }, (t) => ctx.status(t));
        result = { words: r.words, region, depth: picture.depth };
        ui.text.value = r.text; ui.conf.textContent = r.text ? "Average confidence " + Math.round(r.confidence) + " % · " + r.words.length + " words" : "";
        ctx.debug.section("Read text", { language: lang, layoutMode: psm, region: region.w + "x" + region.h + " at " + region.x + "," + region.y, runMs: r.runMs, totalMs: Math.round(performance.now() - t0), confidence: r.confidence, words: r.words.length, characters: r.text.length });
        drawOverlay();
        ctx.status(r.text ? "Read " + r.words.length + " words in " + (r.runMs / 1000).toFixed(1) + " s. Check them against the picture (green = sure, yellow = unsure, red = very unsure), then copy the text." : "No text was found. Try another page layout (Scattered text suits posters), or draw a box round the text.", r.text ? "ok" : "bad");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); }
    }

    function refresh() {
      if (!mounted) return;
      const ready = ctl().state.phase === "ready", has = picture.loaded, idle = !picture.busy;
      ui.need.hidden = ready || ctl().state.phase === "checking";
      ui.read.disabled = !has || !idle || !ready;
      ui.draw.classList.toggle("active", drawMode); ui.draw.textContent = drawMode ? "Drag on the picture to draw the box…" : area ? "Draw the box again" : "Read only an area (draw a box)";
      ui.draw.disabled = !has || !idle;
      ui.clearArea.hidden = !area;
      const has_text = Boolean(ui.text.value.trim());
      ui.copy.disabled = !has_text; ui.save.disabled = !has_text;
    }
    picture.onView(() => { if (mounted) drawOverlay(); });
    picture.onOpen(reset);
    function drawModelBox() {
      if (boxEl) { boxEl.dispose && boxEl.dispose(); boxEl.remove(); }
      boxEl = modelBox("ocr:" + lang, { compact: true, deletable: false });
      ui.boxHost.append(boxEl);
    }

    return {
      mount(panel) {
        mounted = true;
        const secA = el("section"); secA.append(el("h2", "", "Read the text"));
        const lf = el("label", "field"); lf.append(el("span", "", "Language"));
        ui.lang = el("select"); for (const l of OCR_LANGS) { const o = el("option", "", l.name); o.value = l.code; ui.lang.append(o); } ui.lang.value = lang;
        ui.lang.addEventListener("change", () => { lang = ui.lang.value; result = null; ui.text.value = ""; ui.conf.textContent = ""; drawOverlay(); drawModelBox(); refresh(); });
        lf.append(ui.lang);
        const pf = el("label", "field"); pf.append(el("span", "", "How the page is laid out"));
        ui.psm = el("select"); for (const [v, t] of PSMS) { const o = el("option", "", t); o.value = v; ui.psm.append(o); } ui.psm.value = psm;
        ui.psm.addEventListener("change", () => { psm = ui.psm.value; });
        pf.append(ui.psm);
        ui.need = el("p", "hint required", "Download required: get the language below first.");
        ui.draw = el("button", "wide", "Read only an area (draw a box)"); ui.draw.type = "button";
        ui.draw.addEventListener("click", () => { drawMode = !drawMode; if (drawMode) picture.setPointerHandler(handler); refresh(); });
        ui.clearArea = el("button", "wide", "Read the whole picture again"); ui.clearArea.type = "button"; ui.clearArea.hidden = true;
        ui.clearArea.addEventListener("click", () => { area = null; result = null; ui.text.value = ""; ui.conf.textContent = ""; drawOverlay(); refresh(); });
        ui.read = el("button", "btn-solid big", "Read text"); ui.read.type = "button"; ui.read.addEventListener("click", read);
        secA.append(lf, pf, ui.need, ui.draw, ui.clearArea, ui.read);

        const secB = el("section"); secB.append(el("h2", "", "Text"));
        ui.conf = el("p", "hint");
        ui.text = document.createElement("textarea"); ui.text.className = "ocr-text"; ui.text.rows = 9; ui.text.placeholder = "The text will appear here. You can fix mistakes before copying.";
        ui.text.addEventListener("input", refresh);
        const row = el("div", "row");
        ui.copy = el("button", "", "Copy text"); ui.copy.type = "button";
        ui.copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(ui.text.value); ctx.status("Text copied.", "ok"); } catch (e) { ui.text.select(); ctx.status("Select the text and copy it by hand.", "bad"); } });
        ui.save = el("button", "", "Save as .txt"); ui.save.type = "button";
        ui.save.addEventListener("click", () => downloadBlob(new Blob([ui.text.value], { type: "text/plain;charset=utf-8" }), picture.name + ".txt"));
        row.append(ui.copy, ui.save);
        const lab = el("label", "radio"); const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = showBoxes;
        cb.addEventListener("change", () => { showBoxes = cb.checked; drawOverlay(); }); lab.append(cb, el("span", "", " Show the words found on the picture"));
        const hint = el("p", "hint", "Works best on clean printed text. Handwriting and decorative fonts read poorly. Green boxes are sure, yellow unsure, red very unsure.");
        secB.append(ui.conf, ui.text, row, lab, hint);

        const secC = el("section"); secC.append(el("h2", "", "Language file"));
        ui.boxHost = el("div"); secC.append(ui.boxHost);
        panel.append(secA, secB, secC);
        drawModelBox();
        for (const l of OCR_LANGS) unsub.push(modelControl("ocr:" + l.code).subscribe(refresh));
        if (area || drawMode) picture.setPointerHandler(handler);
        drawOverlay(); refresh();
      },
      unmount() {
        mounted = false; drag = null;
        boxesC.style.display = "none"; picture.setPointerHandler(null);
        while (unsub.length) unsub.pop()();
        if (boxEl) { boxEl.dispose && boxEl.dispose(); boxEl = null; }
      },
      onPictureChange() { if (result && picture.depth !== result.depth) { result = null; drawOverlay(); } refresh(); },
      primary() { read(); },
    };
  },
};
