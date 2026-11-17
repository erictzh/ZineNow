// The magic eraser's live preview. A click doesn't change the image: it opens a preview that
// follows the Eraser panel's settings, until it's applied (one undo step) or cancelled.

import { loadImageElement } from "../render/drawImage.js";
import { magicFinish, magicMatch, magicMatchKey } from "../render/magicErase.js";

const { useState, useRef, useEffect } = React;

// Slider drags are redone at most this often, so the preview keeps up
// without queueing a recompute per tick.
const RECOMPUTE_DELAY_MS = 60;

// Feather, edge shift, specks and defringe belong to "Refine edge" only. An "Erase a colour" click
// ignores them (it keeps its own Edge softness and Opacity), so erase first, apply, then refine.
const NO_EDGE_REFINING = { feather: 0, edgeShift: 0, specks: 0, defringe: 0 };

// What ends up where:
//  - Click on an image  → start(): opens a session (or, if one is already open, applies it
//    and starts the next one on top of its result, so several clicks in a row work).
//  - Any change to the magic settings → the session is recomputed from the pixels it started with.
//  - Apply (button / Enter / clicking anywhere outside the eraser panel and the page) → the
//    previewed pixels replace the image's own: one undo step.
//  - Cancel (button / Esc / Undo) → the preview is thrown away, the image was never touched.
//  - Switching tool, eraser mode or page applies it too (same as moving on in Photoshop).
export function useMagicErase({ doc, selection, edits, toolDefaults }) {
  const [active, setActive] = useState(false);   // a session is open (drives the panel's Apply/Cancel bar)
  const [preview, setPreview] = useState(null);  // { annId, src }: what to draw in place of that image
  const [notice, setNotice] = useState(null);    // a short message for the panel (e.g. "nothing to refine")
  const noticeTimerRef = useRef(null);
  const sessionRef = useRef(null);
  const loadTokenRef = useRef(0);                // drops a click's late image load if another click came since
  const settings = toolDefaults.magicEraser;
  const latest = useRef(null);
  latest.current = { settings, edits, doc };

  // ── Computing ────────────────────────────────────────────────────────────
  // Redoes the preview pixels for the current settings. The slow colour match is
  // cached and only redone when a setting it depends on changes; the edge steps
  // (specks, shift, feather, defringe, opacity) are cheap and always rerun.
  function compute(s) {
    const st = { ...latest.current.settings, clickMode: s.mode };
    if (s.mode === "match") Object.assign(st, NO_EDGE_REFINING); // erasing a colour is a plain erase; refining is its own step
    const key = magicMatchKey(st);
    const base = { data: s.base, width: s.width, height: s.height };
    if (!s.cache || s.cache.key !== key) {
      s.cache = { key, cov: magicMatch(base, s.seed ? s.seed.x : null, s.seed ? s.seed.y : null, st) };
    }
    const work = { data: new Uint8ClampedArray(s.base), width: s.width, height: s.height };
    s.changed = s.cache.cov ? magicFinish(work, s.cache.cov.slice(), s.seed ? s.seed.x : null, s.seed ? s.seed.y : null, st) : 0;
    s.result = work;
    s.computedFor = latest.current.settings;
    s.ctx.putImageData(new ImageData(work.data, s.width, s.height), 0, 0);
  }

  // Shows the computed pixels on the page (encoded off the main thread; a newer
  // one superseding this one before it's ready just wins).
  function paint(s) {
    const version = ++s.version;
    s.canvas.toBlob((blob) => {
      if (!blob || sessionRef.current !== s || version !== s.version) return;
      const url = URL.createObjectURL(blob);
      if (s.url) URL.revokeObjectURL(s.url);
      s.url = url;
      setPreview({ annId: s.annId, src: url });
    }, "image/png");
  }

  function schedule(s) {
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.timer = null;
      if (sessionRef.current !== s) return;
      compute(s);
      paint(s);
    }, RECOMPUTE_DELAY_MS);
  }

  function endSession(s) {
    if (s.timer) clearTimeout(s.timer);
    if (s.url) URL.revokeObjectURL(s.url);
    if (sessionRef.current === s) sessionRef.current = null;
    setPreview(null);
    setActive(false);
  }

  // ── Apply / cancel ───────────────────────────────────────────────────────
  // Brings the session's pixels up to date with the latest settings (a recompute may
  // still be waiting on its timer), without ending it.
  function settle(s) {
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    if (s.computedFor !== latest.current.settings) compute(s);
  }

  function commit() {
    const s = sessionRef.current;
    if (!s) return false;
    settle(s);
    if (s.changed > 0) latest.current.edits.handleEraseImagePixels(s.annId, s.canvas.toDataURL("image/png"), s.pageIdx);
    endSession(s);
    return true;
  }

  function cancel() {
    const s = sessionRef.current;
    if (!s) return false;
    endSession(s);
    return true;
  }

  // ── Starting ─────────────────────────────────────────────────────────────
  // `ann` is the image clicked and `hit` the clicked pixel in its natural pixels
  // (render/softErase.js imagePixelAt).
  // Returns whether a preview was opened. `quiet` suppresses the "nothing to refine" notice
  // (startRefine tries several images and says it once itself).
  async function start(ann, hit, quiet) {
    const token = ++loadTokenRef.current;
    const mode = latest.current.settings.clickMode;
    const pageIdx = latest.current.doc.selectedIdx;
    const prev = sessionRef.current;

    // A second click on the same image builds on the first preview's pixels.
    let base = null, width = 0, height = 0;
    if (prev && prev.annId === ann.id) {
      settle(prev);
      base = new Uint8ClampedArray(prev.result.data);
      width = prev.width; height = prev.height;
    }
    if (prev) commit();

    if (!base) {
      const source = await loadImageElement(ann.src);
      if (token !== loadTokenRef.current) return false; // a newer click took over while this image loaded
      const canvas = document.createElement("canvas");
      canvas.width = width = ann.naturalWidth;
      canvas.height = height = ann.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, width, height);
      base = ctx.getImageData(0, 0, width, height).data;
    }

    let seed = null;
    if (mode === "match") {
      seed = { x: Math.min(width - 1, Math.max(0, hit.x)), y: Math.min(height - 1, Math.max(0, hit.y)) };
      if (base[(Math.floor(seed.y) * width + Math.floor(seed.x)) * 4 + 3] === 0) return false; // clicked on an already transparent pixel
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const s = {
      annId: ann.id, pageIdx, mode, seed, base, width, height,
      canvas, ctx: canvas.getContext("2d"),
      cache: null, result: null, computedFor: null, changed: 0, timer: null, url: null, version: 0,
    };
    sessionRef.current = s;
    setActive(true);
    compute(s);
    if (mode === "refine" && !s.cache.cov) { // nothing to refine: the image has no transparent pixels
      endSession(s);
      if (!quiet) showNotice("That image has no transparent areas to refine. Erase a background first.");
      return false;
    }
    setNotice(null);
    paint(s);
    return true;
  }

  // The "Refine edges" button: opens the refine preview on the topmost image on the page that
  // has transparent areas, so there's nothing to aim at.
  async function startRefine() {
    if (latest.current.settings.clickMode !== "refine") return;
    const page = latest.current.doc.selectedPage;
    const images = ((page && page.annotations) || []).filter((a) => a.type === "image" && !a.hidden && !a.locked).reverse();
    if (images.length === 0) { showNotice("There's no image on this page to refine."); return; }
    for (const ann of images) {
      if (await start(ann, null, true)) return;
    }
    showNotice("No image on this page has transparent areas to refine. Erase a background first.");
  }

  function showNotice(text) {
    setNotice(text);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 6000);
  }

  // ── Following the UI ─────────────────────────────────────────────────────
  // Any settings change recomputes the preview; leaving the eraser, its magic mode, the page,
  // or switching the click mode applies it instead.
  useEffect(() => {
    const s = sessionRef.current;
    if (!s) return;
    if (selection.tool !== "eraser" || toolDefaults.eraserMode !== "magic" || doc.selectedIdx !== s.pageIdx || settings.clickMode !== s.mode) {
      commit();
      return;
    }
    schedule(s);
  }, [selection.tool, toolDefaults.eraserMode, doc.selectedIdx, settings]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!sessionRef.current) return;
      const target = e.target || {};
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
      else if (e.key === "Enter" && target.tagName !== "BUTTON" && target.type !== "number") { e.preventDefault(); commit(); }
    }
    // Pressing anywhere outside the eraser panel and the page (a menu, the layers list,
    // the sidebar…) applies the preview first, so nothing else ever runs against a document
    // that's missing it. Done on pointerdown, ahead of that control's own click.
    function handlePointerDown(e) {
      if (!sessionRef.current) return;
      const t = e.target;
      if (t && t.closest && t.closest(".ze-format-panel, .preview-pane")) return;
      commit();
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  return { active, preview, notice, start, startRefine, commit, cancel };
}
