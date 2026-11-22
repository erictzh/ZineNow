// Ai Tools (Local): remove an object from a picture with an AI model that runs on this device. Nothing is uploaded.
// Mark the object with a brush or box, press Remove object: the app cuts a window round it, gives the model that window, and
// pastes the answer back over only the marked area (src/fill.js is the picture maths, src/runtime.js runs the model,
// src/modelStore.js downloads and keeps the model file).

import { downloadBlob } from "../../../shared/js/download.js";
import { installNumberFields, wrapNumberInputs } from "../../../shared/js/numberFields.js";
import { MODEL_SIZE, blendWeights, cropWindow, dilate, holeBounds, paste, windowMask } from "./fill.js";
import { DEFAULT_MODEL_URL, forgetModel, getModelBytes, isModelSaved } from "./modelStore.js";
import { createSession, gpuUsable, runModel } from "./runtime.js";

const $ = (id) => document.getElementById(id);
const MAX_SIDE = 4096; // a bigger picture is shrunk to this when opened (memory)
const FEATHER = 3; // px of soft join round the filled area
const MAX_UNDO = 8;

installNumberFields();
wrapNumberInputs();

// ---- settings kept between visits --------------------------------------------------------------
const settings = { brush: 40, grow: 6, url: DEFAULT_MODEL_URL };
try { Object.assign(settings, JSON.parse(localStorage.getItem("zinenow.aitools.settings") || "{}")); } catch (e) { /* defaults */ }
const saveSettings = () => { try { localStorage.setItem("zinenow.aitools.settings", JSON.stringify(settings)); } catch (e) { /* not kept */ } };
$("brush").value = settings.brush; $("grow").value = settings.grow; $("model-url").value = settings.url;

// ---- the picture, the marks, the view ----------------------------------------------------------
const stage = $("stage"), world = $("world");
const imgC = $("img"), origC = $("orig"), maskC = $("mask"), draftC = $("draft");
const imgX = imgC.getContext("2d", { willReadFrequently: true }), maskX = maskC.getContext("2d", { willReadFrequently: true }), draftX = draftC.getContext("2d");
let fileName = "picture";
let view = { s: 1, x: 0, y: 0 };
let tool = "brush";
let busy = false;
let undoStack = [], redoStack = [];
let session = null, modelBytes = null;

function status(text, kind) { const s = $("status"); s.textContent = text; s.className = kind || ""; }
let loaded = false;
function hasPicture() { return loaded; }
function applyView() { world.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.s + ")"; }
function fitView() {
  const r = stage.getBoundingClientRect();
  const s = Math.min(r.width / imgC.width, r.height / imgC.height, 1) * 0.96;
  view = { s, x: (r.width - imgC.width * s) / 2, y: (r.height - imgC.height * s) / 2 };
  applyView();
}
function updateButtons() {
  const has = hasPicture();
  for (const id of ["save", "clear", "fill", "compare"]) $(id).disabled = !has || busy;
  $("undo").disabled = !undoStack.length || busy; $("redo").disabled = !redoStack.length || busy;
}

async function openFile(file) {
  if (!file || !/^image\//.test(file.type || "image/")) { status("That isn't a picture file.", "bad"); return; }
  try {
    let bmp = await createImageBitmap(file);
    let note = "";
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    if (k < 1) note = " It was shrunk to " + w + " × " + h + " so it fits in memory.";
    for (const c of [imgC, origC, maskC, draftC]) { c.width = w; c.height = h; }
    imgX.clearRect(0, 0, w, h); imgX.drawImage(bmp, 0, 0, w, h);
    origC.getContext("2d").drawImage(bmp, 0, 0, w, h);
    bmp.close && bmp.close();
    fileName = (file.name || "picture").replace(/\.[^.]+$/, "");
    undoStack = []; redoStack = [];
    loaded = true;
    $("empty").hidden = true; world.hidden = false;
    fitView(); updateButtons();
    status("Picture opened (" + w + " × " + h + ")." + note + " Paint over the object you want gone, then press Remove object.");
  } catch (e) { status("Couldn't open that picture: " + e.message, "bad"); }
}

// ---- marking: brush, erase-mark, box, move; two fingers always pan and zoom --------------------------
const pointers = new Map();
let stroke = null, pinch = null;
const toImage = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s }; };

function paintLine(a, b) {
  maskX.save();
  maskX.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
  maskX.strokeStyle = maskX.fillStyle = "#e8622a"; maskX.lineCap = maskX.lineJoin = "round";
  maskX.lineWidth = settings.brush;
  maskX.beginPath(); maskX.moveTo(a.x, a.y); maskX.lineTo(b.x + 0.01, b.y); maskX.stroke();
  maskX.restore();
}

stage.addEventListener("pointerdown", (e) => {
  if (!hasPicture() || busy) return;
  stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { stroke = null; const [p, q] = [...pointers.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2 }; return; }
  if (pointers.size > 2) return;
  const pt = toImage(e);
  if (tool === "pan") stroke = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
  else if (tool === "box") stroke = { kind: "box", a: pt, b: pt };
  else { stroke = { kind: "paint", last: pt }; paintLine(pt, pt); }
});
stage.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [p, q] = [...pointers.values()];
    const d = Math.hypot(p.x - q.x, p.y - q.y), cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2;
    const r = stage.getBoundingClientRect();
    const s2 = Math.min(40, Math.max(0.05, view.s * d / pinch.d));
    // keep the picture point that was under the fingers' middle under the new middle
    const ix = (pinch.cx - r.left - view.x) / view.s, iy = (pinch.cy - r.top - view.y) / view.s;
    view = { s: s2, x: cx - r.left - ix * s2, y: cy - r.top - iy * s2 };
    pinch = { d, cx, cy }; applyView(); return;
  }
  if (!stroke) return;
  const pt = toImage(e);
  if (stroke.kind === "pan") { view.x = stroke.vx + e.clientX - stroke.sx; view.y = stroke.vy + e.clientY - stroke.sy; applyView(); }
  else if (stroke.kind === "paint") { paintLine(stroke.last, pt); stroke.last = pt; }
  else if (stroke.kind === "box") {
    stroke.b = pt; draftX.clearRect(0, 0, draftC.width, draftC.height);
    draftX.strokeStyle = "#ffffff"; draftX.setLineDash([8 / view.s, 6 / view.s]); draftX.lineWidth = 2 / view.s;
    draftX.strokeRect(stroke.a.x, stroke.a.y, pt.x - stroke.a.x, pt.y - stroke.a.y);
  }
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (stroke && stroke.kind === "box" && pointers.size === 0) {
    draftX.clearRect(0, 0, draftC.width, draftC.height);
    maskX.fillStyle = "#e8622a"; maskX.fillRect(Math.min(stroke.a.x, stroke.b.x), Math.min(stroke.a.y, stroke.b.y), Math.abs(stroke.b.x - stroke.a.x), Math.abs(stroke.b.y - stroke.a.y));
  }
  if (pointers.size === 0) stroke = null;
}
stage.addEventListener("pointerup", endPointer);
stage.addEventListener("pointercancel", endPointer);
stage.addEventListener("wheel", (e) => {
  if (!hasPicture()) return;
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  const s2 = Math.min(40, Math.max(0.05, view.s * Math.exp(-e.deltaY * 0.0015)));
  const ix = (e.clientX - r.left - view.x) / view.s, iy = (e.clientY - r.top - view.y) / view.s;
  view = { s: s2, x: e.clientX - r.left - ix * s2, y: e.clientY - r.top - iy * s2 };
  applyView();
}, { passive: false });

for (const b of document.querySelectorAll("[data-tool]")) {
  b.addEventListener("click", () => {
    tool = b.dataset.tool;
    for (const o of document.querySelectorAll("[data-tool]")) o.classList.toggle("active", o === b);
  });
}
$("brush").addEventListener("input", () => { const v = Number($("brush").value); if (v >= 1) { settings.brush = v; saveSettings(); } });
$("grow").addEventListener("input", () => { const v = Number($("grow").value); if (v >= 0) { settings.grow = v; saveSettings(); } });
$("clear").addEventListener("click", () => maskX.clearRect(0, 0, maskC.width, maskC.height));

// ---- the fill -----------------------------------------------------------------------------------------
function markedPixels() {
  const d = maskX.getImageData(0, 0, maskC.width, maskC.height).data;
  const m = new Uint8Array(maskC.width * maskC.height);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 64 ? 1 : 0;
  return m;
}

async function ensureSession() {
  if (session) return session;
  const url = $("model-url").value.trim() || DEFAULT_MODEL_URL;
  settings.url = url; saveSettings();
  if (!modelBytes) {
    status("Getting the model…"); $("prog").hidden = false;
    const r = await getModelBytes(url, (got, total) => {
      $("prog").max = total || got * 2; $("prog").value = got;
      status("Downloading the model (first time only)… " + (got / 1048576).toFixed(1) + (total ? " of " + (total / 1048576).toFixed(1) : "") + " MB");
    });
    $("prog").hidden = true; modelBytes = r.bytes;
  }
  status("Starting the model…");
  session = await createSession(modelBytes, true);
  refreshModelInfo();
  return session;
}

async function removeObject() {
  if (busy || !hasPicture()) return;
  const w = imgC.width, h = imgC.height;
  const marked = markedPixels();
  if (!holeBounds(marked, w, h)) { status("Paint over the object first (Brush or Box), then press Remove object.", "bad"); return; }
  const mask = dilate(marked, w, h, Math.max(0, Math.round(settings.grow)));
  const crop = cropWindow(holeBounds(mask, w, h), w, h);
  if (!crop) { status("That area is too big for the AI: mark a smaller part, or do it in two or three steps.", "bad"); return; }
  busy = true; updateButtons();
  const t0 = performance.now();
  try {
    const sess = await ensureSession();
    status("Removing it… (" + (sess.backend === "gpu" ? "graphics chip" : "processor, slower") + ")");
    await new Promise((r) => setTimeout(r, 30)); // let the message show
    // the window, shrunk or enlarged to the model's size
    const win = document.createElement("canvas"); win.width = win.height = MODEL_SIZE;
    const wx = win.getContext("2d", { willReadFrequently: true });
    wx.imageSmoothingQuality = "high";
    wx.drawImage(imgC, crop.x, crop.y, crop.side, crop.side, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const rgba = wx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
    const hole = windowMask(mask, w, crop);
    let answer;
    try { answer = await runModel(sess.session, rgba, hole); }
    catch (e) {
      if (sess.backend !== "gpu") throw e;
      status("The graphics chip failed; trying the processor…");
      session = await createSession(modelBytes, false);
      answer = await runModel(session.session, rgba, hole);
      refreshModelInfo();
    }
    // the answer back to the window's size, pasted over the marked area only
    const ac = document.createElement("canvas"); ac.width = ac.height = MODEL_SIZE;
    ac.getContext("2d").putImageData(new ImageData(answer, MODEL_SIZE, MODEL_SIZE), 0, 0);
    const sc = document.createElement("canvas"); sc.width = sc.height = crop.side;
    const sx = sc.getContext("2d", { willReadFrequently: true }); sx.imageSmoothingQuality = "high"; sx.drawImage(ac, 0, 0, crop.side, crop.side);
    const scaled = sx.getImageData(0, 0, crop.side, crop.side).data;
    const region = imgX.getImageData(crop.x, crop.y, crop.side, crop.side);
    const before = await createImageBitmap(imgC);
    paste(region.data, crop.side, { x: 0, y: 0, side: crop.side }, scaled, blendWeights(mask, w, crop, FEATHER));
    imgX.putImageData(region, crop.x, crop.y);
    undoStack.push(before); if (undoStack.length > MAX_UNDO) undoStack.shift().close();
    redoStack = [];
    maskX.clearRect(0, 0, maskC.width, maskC.height);
    status("Done in " + ((performance.now() - t0) / 1000).toFixed(1) + " s. Not right? Undo, mark a bit differently, or press Remove object again.", "ok");
  } catch (e) {
    $("prog").hidden = true;
    status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
  } finally { busy = false; updateButtons(); }
}
$("fill").addEventListener("click", removeObject);

// ---- undo, compare, save ------------------------------------------------------------------------------
async function restore(from, to) {
  if (!from.length || busy) return;
  to.push(await createImageBitmap(imgC));
  const bmp = from.pop();
  imgX.clearRect(0, 0, imgC.width, imgC.height); imgX.drawImage(bmp, 0, 0); bmp.close();
  updateButtons();
}
$("undo").addEventListener("click", () => restore(undoStack, redoStack));
$("redo").addEventListener("click", () => restore(redoStack, undoStack));
const showOriginal = (on) => { origC.hidden = !on; imgC.style.visibility = on ? "hidden" : "visible"; };
const compare = $("compare");
for (const ev of ["pointerdown"]) compare.addEventListener(ev, () => showOriginal(true));
for (const ev of ["pointerup", "pointerleave", "pointercancel"]) compare.addEventListener(ev, () => showOriginal(false));
$("save").addEventListener("click", () => {
  imgC.toBlob((blob) => { if (blob) downloadBlob(blob, fileName + "-filled.png"); else status("Couldn't save the picture.", "bad"); }, "image/png");
});

// ---- opening pictures: button, drop, paste, keys -----------------------------------------------------
$("open").addEventListener("click", () => $("file").click());
$("empty-open").addEventListener("click", () => $("file").click());
$("file").addEventListener("change", (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) openFile(f); });
stage.addEventListener("dragover", (e) => e.preventDefault());
stage.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) openFile(f); });
document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith("image/"));
  if (item) openFile(item.getAsFile());
});
document.addEventListener("keydown", (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); (e.shiftKey ? $("redo") : $("undo")).click(); }
  else if (e.key === "Enter" && hasPicture()) removeObject();
});
window.addEventListener("resize", () => { if (hasPicture()) fitView(); });

// ---- the model's status ------------------------------------------------------------------------------
async function refreshModelInfo() {
  const saved = await isModelSaved($("model-url").value.trim() || DEFAULT_MODEL_URL);
  const gpu = await gpuUsable();
  $("model-info").textContent =
    "Model: " + (saved ? "saved on this device (works offline)." : "not downloaded yet (about 28 MB, downloaded the first time you press Remove object).") +
    "  Chip: " + (session ? (session.backend === "gpu" ? "graphics chip (fast)." : "processor (slower).") : (gpu ? "graphics chip available." : "no graphics chip mode here: the processor will be used."));
}
$("forget").addEventListener("click", async () => { await forgetModel(); session = null; modelBytes = null; refreshModelInfo(); status("The saved model was removed from this device."); });
refreshModelInfo();
updateButtons();
