// Keyboard shortcuts and pasting images from the clipboard (the list shown to users is ui/dialogs/shortcuts.js).

import { translatedAnnotation } from "../model/annotations.js";
import { angleOf } from "../model/controls.js";
import { standaloneCopy } from "../model/text/threads.js";
import { resolvePageText } from "../render/pageText.js";

const { useRef, useEffect } = React;

// `app` is the editor's current state and handlers. It's read through a
// ref, so the listeners are attached once yet always act on this render's
// values — no stale state (e.g. Ctrl+S saving old settings).
export function useKeyboardShortcuts(app) {
  const appRef = useRef(app);
  appRef.current = app;
  const clipboardRef = useRef(null); // last copied annotation (Ctrl+C/Ctrl+V) — a plain ref, not state, since copying shouldn't trigger a re-render

  useEffect(() => {
    function handleKeyDown(e) {
      const { doc, history, selection, edits, pageOps, project, marquee, modalOpen, zoom } = appRef.current;
      const { pages, selectedIdx, selectedPageIndices, setSelectedIdx, setSelectedPageIndices, nextAnnIdRef } = doc;
      const { selectedAnnId, selectedAnnIds, setSelectedAnnId, selectTool } = selection;
      // Save works even mid-typing in a field; the browser's own "Save
      // page" dialog is always suppressed.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!modalOpen) project.handleSaveProject({ saveAs: e.shiftKey });
        return;
      }
      // The browser's zoom keys zoom the page instead of the whole window (which would scale the panels and rulers
      // too): Ctrl + / Ctrl - step in and out, Ctrl 0 goes to 100%. Works while typing in a field as well; only
      // while a page is open and no pop-up is showing, otherwise the browser's own zoom is left alone.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !modalOpen && selectedIdx !== null) {
        const dir = e.key === "+" || e.key === "=" || e.code === "NumpadAdd" ? 1 : e.key === "-" || e.key === "_" || e.code === "NumpadSubtract" ? -1 : e.key === "0" || e.code === "Numpad0" ? 0 : null;
        if (dir !== null) {
          e.preventDefault();
          if (dir === 0) zoom.zoomReset(); else zoom.zoomStep(dir);
          return;
        }
      }
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return; // let native undo/typing run inside text fields
      if (modalOpen) return; // a modal is up — its own buttons handle input
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        if (key === "z" && !e.shiftKey) { e.preventDefault(); history.handleUndo(); return; }
        if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); history.handleRedo(); return; }
        if (key === "r") { e.preventDefault(); if (selectedIdx !== null) pageOps.handleRotate(selectedIdx); return; }
        if (key === "j") { e.preventDefault(); marquee.makeLayer(e.shiftKey ? "cut" : "copy"); return; } // Layer via Copy / Layer via Cut, from the Marquee
        if (key === "g" && e.altKey) { // Ctrl+Alt+G: clipping mask on/off for the selected layers (as in Photoshop)
          e.preventDefault();
          if (selectedAnnId !== null) edits.handleClipSelection();
          return;
        }
        if (key === "g") { e.preventDefault(); if (e.shiftKey) edits.handleUngroupSelection(); else edits.handleGroupSelection(); return; }
        if (key === "c") {
          if (selectedIdx !== null && selectedAnnId !== null) {
            // A frame of a threaded story copies as a box of its own: its look and the words it shows.
            const view = resolvePageText(pages[selectedIdx].annotations || []).find((a) => a.id === selectedAnnId);
            const ann = view && view.type === "text" ? standaloneCopy(view) : view;
            if (ann) { e.preventDefault(); clipboardRef.current = JSON.parse(JSON.stringify(ann)); }
          }
          return;
        }
        if (key === "v") {
          if (clipboardRef.current && selectedIdx !== null) {
            e.preventDefault();
            const clip = clipboardRef.current;
            const id = nextAnnIdRef.current++;
            // Offset the paste from the original so it's visibly a
            // second copy, not sitting invisibly on top of the first —
            // a stroke's whole point list has to shift together, not
            // just some single x/y the way text/image annotations work.
            const newAnn = { ...translatedAnnotation(clip, 20, 20), id, groupId: undefined }; // a copy isn't part of the original's group
            edits.updateAnnotationsFor(selectedIdx, (anns) => [...anns, newAnn]);
            setSelectedAnnId(id);
          }
          return;
        }
        return; // any other Ctrl/Cmd combo — leave the browser's own default alone
      }

      if (key === "delete") {
        e.preventDefault();
        if (selection.tool === "marquee") return; // the selected layer is only the marquee's target: Delete must not remove it
        if (selectedAnnId !== null) edits.handleDeleteAnnotation();
        else if (selectedIdx !== null) {
          if (selectedPageIndices.length > 0) pageOps.handleDeleteSelectedPages();
          else pageOps.handleDelete(selectedIdx);
        }
        return;
      }
      const nudge = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
      if (nudge && selectedAnnId !== null) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const ids = [selectedAnnId, ...selectedAnnIds];
        edits.handleMoveAnnotations((pages[selectedIdx].annotations || []).filter((a) => ids.includes(a.id)), nudge[0] * step, nudge[1] * step);
        return;
      }
      if (key === "v") { selectTool("select"); return; }
      if (key === "t") { selectTool("text"); return; }
      if (key === "i") { edits.handleImageToolClick(); return; }
      if (key === "r") { selectTool("rect"); return; }
      if (key === "e") { selectTool("ellipse"); return; }
      if (key === "h") { selectTool("highlighter"); return; }
      if (key === "m") { selectTool("marquee"); return; }
      if (key === "u") { selectTool("measure"); return; } // "ukur"
      if (key === "c") {
        // Crop on/off for the selected image: the same as the Format panel's Crop switch, which is
        // unavailable on a rotated image (unless it is already cropping).
        const img = selectedIdx === null || selectedAnnIds.length > 0 ? null : (pages[selectedIdx].annotations || []).find((a) => a.id === selectedAnnId && a.type === "image");
        if (img && (selection.croppingAnnId === img.id || !angleOf(img))) selection.handleToggleCrop(img.id);
        return;
      }
      if (key === "d") { selectTool("pen"); return; } // "Draw" in the UI — see the tool bar
      if (key === "arrowup") { e.preventDefault(); setSelectedPageIndices([]); setSelectedIdx((cur) => (cur === null ? cur : Math.max(0, cur - 1))); return; }
      if (key === "arrowdown") { e.preventDefault(); setSelectedPageIndices([]); setSelectedIdx((cur) => (cur === null ? cur : Math.min(pages.length - 1, cur + 1))); return; }
    }

    // Ctrl+V with an image on the system clipboard (a screenshot, or an
    // image copied from another app/page) drops it onto the current page
    // as a new image annotation — separate from the keydown handler's
    // Ctrl+V, which only replays an annotation this app itself copied.
    // Native `paste` is the only event that actually exposes clipboard
    // file contents, hence its own listener.
    function handlePaste(e) {
      const { doc, edits, modalOpen } = appRef.current;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
      if (modalOpen || doc.selectedIdx === null) return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.type && item.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      edits.addImageAnnotationFromFile(imageItem.getAsFile(), doc.selectedIdx);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, []);
}
