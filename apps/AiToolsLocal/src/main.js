// Ai Tools (Local): a hub of on-device AI tools for pictures. Nothing is uploaded. The shell (this file) owns the tools list on the left, the
// picture in the middle (src/picture.js: open, pan and zoom, undo, save) and the options panel on the right; each tool is a module in
// src/tools/ registered below. The Models page (src/modelsPage.js) lists every model with its licence, size and source, with Download / Delete.

import { downloadBlob } from "../../../shared/js/download.js";
import { AITOOLS_READY_MESSAGE, hasOpener, listenForHandoffImage, sendImageToOpener, sendImageToZEditor } from "../../../shared/js/imageHandoff.js";
import { installNumberFields, wrapNumberInputs } from "../../../shared/js/numberFields.js";
import { createModelsPage } from "./modelsPage.js";
import { createPicture } from "./picture.js";
import { allTools, registerTool } from "./registry.js";
import { removeBackgroundTool } from "./tools/removeBackground.js";
import { removeObjectTool } from "./tools/removeObject.js";

const $ = (id) => document.getElementById(id);
installNumberFields();
wrapNumberInputs();

// ---- status line ---------------------------------------------------------------------------------
function status(text, kind) { const s = $("status"); s.textContent = text; s.className = kind || ""; }

// ---- the picture and the top bar -------------------------------------------------------------------
let cameFromZEditor = false; // the picture was sent here by ZEditor, which is still open
let handoffMeta; // what ZEditor sent along (the layer's place), handed back with the result
let active = null; // { id, tool } the mounted tool, or { id: "models" }

const picture = createPicture({
  stage: $("stage"), world: $("world"), imgC: $("img"), origC: $("orig"), emptyEl: $("empty"),
  onChange() {
    const has = picture.loaded, busy = picture.busy;
    for (const id of ["save", "send"]) $(id).disabled = !has || busy;
    $("compare").disabled = !has || busy || !picture.comparable; // a cropped picture no longer lines up with the original
    $("undo").disabled = !picture.canUndo || busy; $("redo").disabled = !picture.canRedo || busy;
    if (active && active.tool && active.tool.onPictureChange) active.tool.onPictureChange();
  },
});

async function openFile(file) {
  const r = await picture.open(file);
  if (!r.ok) { status(r.message, "bad"); return; }
  status("Picture opened (" + r.width + " × " + r.height + ")." + (r.shrunk ? " It was shrunk so it fits in memory." : "") + " Pick a tool on the left.");
}

// ---- tools ----------------------------------------------------------------------------------------
const ctx = { picture, status, openModels: () => select("models") };
registerTool(removeObjectTool);
registerTool(removeBackgroundTool);
const instances = new Map();
const modelsPage = createModelsPage($("models"));
const MODELS_TOOL = { id: "models", name: "Models", summary: "Downloads, licences and storage." };

function buildList() {
  const list = $("tools-list");
  for (const t of [...allTools(), MODELS_TOOL]) {
    const b = document.createElement("button"); b.type = "button"; b.className = "tool-btn"; b.dataset.id = t.id;
    const n = document.createElement("span"); n.className = "tool-name"; n.textContent = t.name;
    const s = document.createElement("span"); s.className = "tool-sum"; s.textContent = t.summary;
    b.append(n, s);
    b.addEventListener("click", () => select(t.id));
    list.append(b);
  }
}

function select(id) {
  if (active && active.id === id) return;
  if (active) {
    if (active.tool) active.tool.unmount(); else modelsPage.hide();
  }
  const panel = $("tool-panel"); panel.textContent = "";
  for (const b of document.querySelectorAll(".tool-btn")) b.classList.toggle("active", b.dataset.id === id);
  if (id === "models") {
    active = { id };
    modelsPage.show();
    panel.append(Object.assign(document.createElement("p"), { className: "hint", textContent: "Download or delete models on the page to the left. Your picture stays open: pick a tool again to carry on." }));
    return;
  }
  const def = allTools().find((t) => t.id === id);
  if (!instances.has(id)) instances.set(id, def.create(ctx));
  const tool = instances.get(id);
  active = { id, tool };
  tool.mount(panel);
  if (tool.onPictureChange) tool.onPictureChange();
}
buildList();

// ---- top bar buttons -------------------------------------------------------------------------------
$("undo").addEventListener("click", () => picture.undo());
$("redo").addEventListener("click", () => picture.redo());
const compare = $("compare");
compare.addEventListener("pointerdown", () => picture.showOriginal(true));
for (const ev of ["pointerup", "pointerleave", "pointercancel"]) compare.addEventListener(ev, () => picture.showOriginal(false));
$("save").addEventListener("click", async () => {
  try { downloadBlob(await picture.toBlob(), picture.name + "-edited.png"); } catch (e) { status("Couldn't save the picture.", "bad"); }
});
$("send").addEventListener("click", async () => {
  if (!picture.loaded) return;
  try {
    // a picture that came from ZEditor goes back to that same tab (as a new layer in its document); otherwise ZEditor opens in a new tab
    if (cameFromZEditor && hasOpener()) { await sendImageToOpener(picture.toBlob, picture.name + "-edited.png", handoffMeta); status("Sent back to ZEditor: a new layer in the document it came from.", "ok"); return; }
    status("Opening ZEditor…");
    await sendImageToZEditor(picture.toBlob, picture.name + "-edited.png"); status("Sent to ZEditor (it opened in a new tab).", "ok");
  } catch (e) { status("Couldn't send it: " + (e && e.message ? e.message : e), "bad"); }
});

// a picture sent from ZEditor ("Open in Ai Tools") opens straight away
listenForHandoffImage(AITOOLS_READY_MESSAGE, async (file, fromOpener, meta) => { await openFile(file); cameFromZEditor = fromOpener; handoffMeta = meta; if (fromOpener) $("send").textContent = "Send back to ZEditor"; });

// ---- opening pictures: button, drop, paste, keys -------------------------------------------------------
$("open").addEventListener("click", () => $("file").click());
$("empty-open").addEventListener("click", () => $("file").click());
$("file").addEventListener("change", (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) openFile(f); });
$("stage").addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) openFile(f); });
document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith("image/"));
  if (item) openFile(item.getAsFile());
});
document.addEventListener("keydown", (e) => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); (e.shiftKey ? $("redo") : $("undo")).click(); return; }
  const tool = active && active.tool;
  if (!tool) return;
  if (tool.onKey && tool.onKey(e)) return;
  if (e.key === "Enter" && picture.loaded && tool.primary) tool.primary();
});

select("remove-object");
