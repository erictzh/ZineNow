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
export function useMarquee({ doc, selection, edits, toolDefaults, status }) {
  const [region, setRegion] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const latest = useRef(null);
  latest.current = { doc, selection, edits, status, region, settings: toolDefaults.marquee };

  // A marquee belongs to the page it was drawn on, and to the shape it was drawn with.
  useEffect(() => { setRegion(null); }, [doc.selectedIdx, toolDefaults.marquee.shape]);

  // A polygon is open while it is still being drawn.
  const polygonOpen = selection.tool === "marquee" && Boolean(region) && region.kind === "polygon" && !region.closed;

  async function makeLayer(mode) {
    const { doc: d, selection: sel, edits: ed, status: st, region: m, settings } = latest.current;
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
      if (!result.layer) return;
      // The page changed while the picture was being drawn: drop it rather than add it to another page.
      const now = latest.current.doc.selectedPage;
      if (!now || now.key !== page.key) return;
      const newId = d.nextAnnIdRef.current++;
      const coverId = result.cover ? d.nextAnnIdRef.current++ : null;
      ed.updateAnnotationsFor(pageIdx, (anns) => applyMarqueeResult(anns, result, newId, coverId));
      // Show the new layer's own settings (the Format panel for an image) rather than the Marquee's. The
      // marquee stays on the page for when the tool is picked again (M).
      sel.selectTool("select");
      sel.setSelectedAnnId(newId);
      sel.setSelectedAnnIds([]);
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
      const { selection: sel, region: m } = latest.current;
      if (sel.tool !== "marquee" || !m) return;
      const t = e.target || {};
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.isContentEditable) return;
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

  return { region, setRegion, makeLayer, busy, polygonOpen };
}
