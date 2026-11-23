// The Marquee tool's state: the region drawn on the page, and "make layer" (Layer via Copy / Layer via Cut).

import { MIN_POLYGON_POINTS, applyMarqueeResult, isUsableMarquee } from "../model/marquee.js";
import { buildMarqueeLayer } from "../render/marqueeLayer.js";

const { useState, useRef, useEffect } = React;

// What ends up where:
//  - Dragging on the page (Marquee tool) sets `region`; its handles and the rotate knob change it
//    (ui/canvas/MarqueeOverlay.jsx). It stays on the page while you pick a layer or another tool, and goes
//    when the page changes or Esc is pressed.
//  - makeLayer("copy" | "cut") (the panel's button, Ctrl+J / Ctrl+Shift+J) builds the new image layer
//    (render/marqueeLayer.js) and adds it, with any cut, as one undo step. The new layer becomes the
//    selected layer and the tool goes back to Move, so the Format panel shows its image settings.
//    With no argument it uses the panel's Copy / Cut choice.
export function useMarquee({ doc, selection, edits, toolDefaults, status, history }) {
  const [region, setRegion] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const latest = useRef(null);
  latest.current = { doc, selection, edits, status, region, settings: toolDefaults.marquee, setSettings: toolDefaults.setMarquee, history };
  // The last "Remove & fill": how deep the undo list was just after it, so "Try another" only undoes that very step.
  const lastFill = useRef(null);
  const undoDepth = history ? history.undoStack.length : 0;
  useEffect(() => { if (lastFill.current && lastFill.current.depth === null) lastFill.current.depth = undoDepth; }, [undoDepth]);

  // A marquee belongs to the page it was drawn on, and to the shape it was drawn with.
  useEffect(() => { setRegion(null); }, [doc.selectedIdx, toolDefaults.marquee.shape]);

  // A polygon is open while it is still being drawn.
  const polygonOpen = selection.tool === "marquee" && Boolean(region) && region.kind === "polygon" && !region.closed;

  async function makeLayer(mode, settingsOverride) {
    const { doc: d, selection: sel, edits: ed, status: st, region: m } = latest.current;
    const settings = settingsOverride ? { ...latest.current.settings, ...settingsOverride } : latest.current.settings;
    if (busyRef.current || !d.selectedPage) return;
    if (!isUsableMarquee(m)) { st.setNotice("Draw a marquee on the page first (Marquee tool, M)."); return; }
    const page = d.selectedPage, pageIdx = d.selectedIdx;
    busyRef.current = true;
    setBusy(true);
    st.setNotice(null); // an earlier message is out of date now
    try {
      const result = await buildMarqueeLayer({
        page, pdfDocsRef: d.pdfDocsRef, pageFilter: d.pageFilter, marquee: m, settings,
        mode: mode || settings.action, targetId: sel.selectedAnnId,
      });
      if (result.notice) st.setNotice(result.notice);
      if (!result.layer && !result.fillOnly) return;
      // The page changed while the picture was being drawn: drop it rather than add it to another page.
      const now = latest.current.doc.selectedPage;
      if (!now || now.key !== page.key) return;
      if (result.fillOnly && !result.cover && !result.sourcePatch) return;
      const newId = result.layer ? d.nextAnnIdRef.current++ : null;
      const coverId = result.cover ? d.nextAnnIdRef.current++ : null;
      ed.updateAnnotationsFor(pageIdx, (anns) => applyMarqueeResult(anns, result, newId, coverId));
      lastFill.current = mode === "fill" ? { depth: null, pageKey: page.key } : null; // depth is filled in by the effect above once the step is in
      // A new layer is shown with its own settings (the Format panel for an image) rather than the Marquee's; the
      // marquee stays on the page for when the tool is picked again (M). "Remove & fill" makes no layer: it stays in
      // the Marquee tool with everything selected as it was, so the panel keeps its fill settings for the next try
      // (Try another, a new number) and the selected layer is still the one to work on.
      if (result.layer) {
        sel.selectTool("select");
        sel.setSelectedAnnId(newId);
        sel.setSelectedAnnIds([]);
      }
    } catch (err) {
      st.setErrorMsg("Couldn't make the layer: " + (err && err.message ? err.message : err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // Esc drops the marquee while the tool is in use. While a polygon is open, Enter closes it and
  // Backspace takes its last point back.
  useEffect(() => {
    function handleKeyDown(e) {
      const { selection: sel, region: m, settings: st, setSettings } = latest.current;
      if (sel.tool !== "marquee") return;
      const t = e.target || {};
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      // [ ] and Esc still work with a toolbar button focused (after tapping the Marquee button, say); other keys leave a button alone
      const fromButton = t.tagName === "BUTTON";
      if (fromButton && e.key !== "[" && e.key !== "]" && e.key !== "Escape") return;
      // Brush shape: [ and ] make the brush smaller / bigger
      if (st.shape === "brush" && (e.key === "[" || e.key === "]") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const cur = st.brushSize || 24;
        setSettings((s) => ({ ...s, brushSize: Math.min(300, Math.max(2, Math.round(cur * (e.key === "]" ? 1.2 : 1 / 1.2) + (e.key === "]" ? 1 : -1)))) }));
        return;
      }
      if (!m) return;
      if (e.key === "Escape") { setRegion(null); return; }
      if (m.kind !== "polygon" || m.closed) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (m.points.length >= MIN_POLYGON_POINTS) setRegion({ ...m, closed: true });
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setRegion(m.points.length > 1 ? { ...m, points: m.points.slice(0, -1) } : null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Undoes the fill just made (if nothing was done since) and fills again with another variation: other patches get copied.
  function tryAnotherFill() {
    const { history: hist, settings } = latest.current;
    const seed = (settings.fillSeed || 0) + 1;
    const last = lastFill.current;
    const canUndo = hist && last && last.depth !== null && last.depth === hist.undoStack.length && last.pageKey === (latest.current.doc.selectedPage || {}).key;
    toolDefaultsSetSeed(seed);
    if (canUndo) hist.handleUndo();
    // let the undo land before the new fill reads the page
    setTimeout(() => makeLayer("fill", { fillSeed: seed }), canUndo ? 120 : 0);
  }
  const toolDefaultsSetSeed = (seed) => toolDefaults.setMarquee((cur) => ({ ...cur, fillSeed: seed }));

  return { region, setRegion, makeLayer, makeFill: () => makeLayer("fill"), tryAnotherFill, busy, polygonOpen };
}
