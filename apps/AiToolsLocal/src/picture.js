// The one picture every tool works on: opening it, the view (pan and zoom: wheel, or two fingers), the history (undo / redo) and saving it.
// Tools never own the picture: they change its pixels, then call commit() with a copy taken before, so Undo works the same for every tool.
// A tool that wants single-pointer gestures on the picture sets a handler with setPointerHandler(); two fingers always pan and zoom.

const MAX_SIDE = 4096; // a bigger picture is shrunk to this when opened (memory)
const MAX_UNDO = 8;

export function createPicture({ stage, world, imgC, origC, emptyEl, onChange }) {
  const imgX = imgC.getContext("2d", { willReadFrequently: true });
  const overlays = []; // canvases tools drew on top of the picture: resized with it
  let fileName = "picture";
  let loaded = false, busy = false;
  let view = { s: 1, x: 0, y: 0 };
  let undoStack = [], redoStack = [];
  let handler = null; // { down(pt, e), move(pt, e), up(pt, e), cancel() } set by the active tool
  const openListeners = [], viewListeners = [];
  const changed = () => onChange && onChange();

  const toImage = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s }; };
  function applyView() { world.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.s + ")"; for (const f of viewListeners) f(); }
  function fit() {
    const r = stage.getBoundingClientRect();
    const s = Math.min(r.width / imgC.width, r.height / imgC.height, 1) * 0.96;
    view = { s, x: (r.width - imgC.width * s) / 2, y: (r.height - imgC.height * s) / 2 };
    applyView();
  }

  // ---- opening ------------------------------------------------------------------------------------
  async function open(file) {
    if (!file || !/^image\//.test(file.type || "image/")) return { ok: false, message: "That isn't a picture file." };
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
      for (const c of [imgC, origC, ...overlays]) { c.width = w; c.height = h; }
      imgX.clearRect(0, 0, w, h); imgX.drawImage(bmp, 0, 0, w, h);
      origC.getContext("2d").drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      fileName = (file.name || "picture").replace(/\.[^.]+$/, "");
      for (const b of [...undoStack, ...redoStack]) b.close && b.close();
      undoStack = []; redoStack = [];
      loaded = true;
      emptyEl.hidden = true; world.hidden = false;
      fit(); changed();
      for (const f of openListeners) f();
      return { ok: true, width: w, height: h, shrunk: k < 1 };
    } catch (e) { return { ok: false, message: "Couldn't open that picture: " + e.message }; }
  }

  // Sets the picture's size (and its overlays'): clears them.
  function setSize(w, h) { for (const c of [imgC, ...overlays]) { c.width = w; c.height = h; } }

  // ---- history ------------------------------------------------------------------------------------
  const snapshot = () => createImageBitmap(imgC);
  // `before`: an ImageBitmap of the picture as it was before the tool changed it. Becomes one undo step.
  function commit(before) {
    undoStack.push(before);
    if (undoStack.length > MAX_UNDO) undoStack.shift().close();
    for (const b of redoStack) b.close && b.close();
    redoStack = [];
    changed();
  }
  async function swap(from, to) {
    if (!from.length || busy) return false;
    to.push(await createImageBitmap(imgC));
    const bmp = from.pop();
    const resized = bmp.width !== imgC.width || bmp.height !== imgC.height;
    if (resized) setSize(bmp.width, bmp.height); // a tool (crop) changed the picture's size: go back to the old size
    imgX.clearRect(0, 0, imgC.width, imgC.height); imgX.drawImage(bmp, 0, 0); bmp.close();
    if (resized) fit();
    changed();
    return true;
  }
  const undo = () => swap(undoStack, redoStack);
  const redo = () => swap(redoStack, undoStack);
  const toBlob = () => new Promise((resolve, reject) => imgC.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the picture."))), "image/png"));

  // ---- pointer gestures: two fingers / wheel move the view; one pointer goes to the tool's handler -----------------------
  const pointers = new Map();
  let pinch = null, gesture = false;
  stage.addEventListener("pointerdown", (e) => {
    if (!loaded || busy) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      if (gesture && handler && handler.cancel) handler.cancel();
      gesture = false;
      const [p, q] = [...pointers.values()];
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2 };
      return;
    }
    if (pointers.size > 2) return;
    if (handler && handler.down) { gesture = true; handler.down(toImage(e), e); }
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
    if (gesture && handler && handler.move) handler.move(toImage(e), e);
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0 && gesture) { gesture = false; if (handler && handler.up) handler.up(toImage(e), e); }
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("wheel", (e) => {
    if (!loaded) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const s2 = Math.min(40, Math.max(0.05, view.s * Math.exp(-e.deltaY * 0.0015)));
    const ix = (e.clientX - r.left - view.x) / view.s, iy = (e.clientY - r.top - view.y) / view.s;
    view = { s: s2, x: e.clientX - r.left - ix * s2, y: e.clientY - r.top - iy * s2 };
    applyView();
  }, { passive: false });
  stage.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("resize", () => { if (loaded) fit(); });

  return {
    stage, world, canvas: imgC, ctx: imgX, original: origC,
    get loaded() { return loaded; },
    get width() { return imgC.width; }, get height() { return imgC.height; },
    get name() { return fileName; },
    get busy() { return busy; }, setBusy(b) { busy = Boolean(b); changed(); },
    get canUndo() { return undoStack.length > 0; }, get canRedo() { return redoStack.length > 0; },
    get depth() { return undoStack.length; },
    get view() { return { ...view }; }, setView(v) { view = { ...v }; applyView(); },
    // Replaces the picture with `canvas` (any size, e.g. a crop); the caller takes a snapshot first and commits it, so it is one undo step.
    replaceWith(canvas) {
      const resized = canvas.width !== imgC.width || canvas.height !== imgC.height;
      if (resized) setSize(canvas.width, canvas.height);
      imgX.clearRect(0, 0, imgC.width, imgC.height); imgX.drawImage(canvas, 0, 0);
      if (resized) fit();
    },
    // Is the picture still the same size as the one that was opened (only then can "Hold to compare" show the original)?
    get comparable() { return imgC.width === origC.width && imgC.height === origC.height; },
    onView(fn) { viewListeners.push(fn); },
    toImage, fit, open, snapshot, commit, undo, redo, toBlob,
    setPointerHandler(h) { handler = h; },
    // A canvas a tool draws on top of the picture (same size, follows it). Returns the canvas.
    addOverlay(canvas) { canvas.classList.add("overlay"); canvas.width = imgC.width; canvas.height = imgC.height; overlays.push(canvas); world.append(canvas); return canvas; },
    removeOverlay(canvas) { const i = overlays.indexOf(canvas); if (i >= 0) overlays.splice(i, 1); canvas.remove(); },
    onOpen(fn) { openListeners.push(fn); },
    showOriginal(on) { origC.hidden = !on; imgC.style.visibility = on ? "hidden" : "visible"; },
  };
}
