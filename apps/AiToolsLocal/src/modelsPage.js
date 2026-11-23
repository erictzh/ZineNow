// The Models page: every model the tools can use, with its facts (name, kind, licence, size, where it comes from), whether it is on
// this device, Download / Delete, and the total stored. It also lists the AI engine (runtime) the models share.

import { aiSaved, downloadPlan } from "../../../shared/js/ai/manager.js";
import { ORT_VERSION } from "../../../shared/js/ai/runtime.js";
import { MODEL_ROWS } from "../../../shared/js/ai/modelList.js";
import { OCR_ENGINE } from "../../../shared/js/ai/ocrLangs.js";
import { licenceUrl } from "../../../shared/js/ai/licences.js";
import { ABOUT, POLICY_URL } from "../../../shared/js/about.js";
import { ocrEngineSaved } from "../../../shared/js/ai/ocr.js";
import { modelBox, modelControl, onModelsChanged } from "./models.js";

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export function createModelsPage(host) {
  host.hidden = true;
  host.className = "models-page";
  let off = null, boxes = [];

  async function build() {
    host.textContent = "";
    for (const b of boxes) b.dispose && b.dispose();
    boxes = [];
    host.append(el("h2", "", "Models"));
    host.append(el("p", "hint", "Every AI model the tools use. They run on this device and nothing is uploaded. Each is downloaded once, only when you choose to, then works offline. Delete any you don't need."));
    const total = el("p", "total");
    host.append(total);
    const toolFor = new Map();
    for (const r of MODEL_ROWS) {
      const card = el("div", "model-card");
      card.append(el("div", "model-tool", "Used by: " + r.tool));
      const box = modelBox(r.id, { showSize: true }); boxes.push(box); card.append(box);
      host.append(card);
      toolFor.set(r.id, r);
    }
    const engine = el("div", "model-card");
    engine.append(el("div", "model-tool", "Shared by all tools"));
    const eTitle = el("b", "", "AI engine (ONNX Runtime Web " + ORT_VERSION + ")");
    const eFacts = el("span", "hint", "MIT licence. Downloaded from cdn.jsdelivr.net the first time you download any model (about 16 to 30 MB, depending on your device), then kept. It is removed automatically when the last AI model is deleted.");
    const eState = el("span", "hint");
    engine.append(eTitle, eFacts, eState);
    host.append(engine);
    const tess = el("div", "model-card");
    tess.append(el("div", "model-tool", "Used by: Text from image"));
    const tHead = el("div", "model-title"); tHead.append(el("b", "", OCR_ENGINE.name), el("span", "model-size", "about " + OCR_ENGINE.mb + " MB"));
    const tFacts = el("span", "hint", OCR_ENGINE.licence + " licence. Downloaded from " + OCR_ENGINE.repo + " the first time you download a language, then kept. It is removed automatically when the last language is deleted.");
    const tState = el("span", "hint");
    const tLic = el("span", "hint model-licence"); tLic.append("Made by " + OCR_ENGINE.author + " · Licence ");
    const tA = el("a", "", OCR_ENGINE.licence); tA.href = licenceUrl(OCR_ENGINE.licence); tA.target = "_blank"; tA.rel = "noopener"; tLic.append(tA, " · ");
    const tH = el("a", "", "Project page"); tH.href = OCR_ENGINE.homepage; tH.target = "_blank"; tH.rel = "noopener"; tLic.append(tH);
    const tBox = el("div", "model-box"); tBox.append(tHead, tFacts, tLic, tState); tess.append(tBox);
    host.append(tess);

    // the source code and the notes about what this is built on (small, at the bottom)
    const foot = el("p", "hint model-about");
    foot.append(ABOUT.text + " ");
    for (const l of [...ABOUT.links, { label: "AI model policy", href: POLICY_URL }]) { const a = el("a", "", l.label); a.href = l.href; a.target = "_blank"; a.rel = "noopener"; foot.append(a, " · "); }
    foot.lastChild.remove();
    host.append(foot);

    async function updateTotals() {
      const saved = await aiSaved();
      const plan = await downloadPlan();
      let mb = saved.runtime ? plan.runtimeMb : 0;
      let n = 0;
      for (const r of MODEL_ROWS) if (modelControl(r.id).state.phase === "ready") { mb += r.model.mb; n++; }
      tState.textContent = ocrEngineSaved() ? "On this device." : "Not downloaded."; tState.className = "hint" + (ocrEngineSaved() ? " ok" : "");
      if (ocrEngineSaved()) mb += OCR_ENGINE.mb;
      eState.textContent = saved.runtime ? "On this device (about " + Math.round(plan.runtimeMb) + " MB)." : "Not downloaded.";
      eState.className = "hint" + (saved.runtime ? " ok" : "");
      total.textContent = n || saved.runtime || ocrEngineSaved() ? "Saved on this device: " + n + " model" + (n === 1 ? "" : "s") + (saved.runtime ? ", the AI engine" : "") + (ocrEngineSaved() ? ", the text reader" : "") + ", about " + Math.round(mb) + " MB in total." : "Nothing is downloaded yet.";
    }
    off = onModelsChanged(updateTotals);
    updateTotals();
  }
  return {
    show() { host.hidden = false; build(); },
    hide() { host.hidden = true; if (off) off(); off = null; for (const b of boxes) b.dispose && b.dispose(); boxes = []; host.textContent = ""; },
  };
}
