// A group as a .znow file: "Save group as .znow" and "Import .znow as a group" (the ⋮ menus in the Layers panel).

import { MAIN_SCALE } from "../constants.js";
import { translatedAnnotation } from "../model/annotations.js";
import { titleToFileName } from "../model/documentTitle.js";
import { getPageDisplaySize } from "../render/pageRender.js";
import { buildEmbeddedFonts, canReadSystemFonts, ensureFontAccess } from "../io/fontEmbed.js";
import { itemsBounds, readGroupFile, serializeGroup } from "../io/groupFile.js";
import { saveFile } from "../io/fileSave.js";

const { useRef } = React;

export function useGroupFiles({ doc, edits, selection, status, view }) {
  const { pages, selectedIdx, pdfDocsRef, nextAnnIdRef, ids } = doc;
  const inputRef = useRef(null);

  async function handleExportGroup(groupId) {
    const page = selectedIdx !== null ? pages[selectedIdx] : null;
    if (!page) return;
    const items = (page.annotations || []).filter((a) => a.groupId === groupId);
    if (!items.length) return;
    status.setErrorMsg(null);
    try {
      const name = items.find((a) => a.groupName) ? items.find((a) => a.groupName).groupName : "Group";
      // the project's "Embed system fonts" setting also applies to a group file
      if (view && view.embedFonts && canReadSystemFonts()) await ensureFontAccess([{ annotations: items }]);
      const embedded = view && view.embedFonts && canReadSystemFonts() ? await buildEmbeddedFonts([{ annotations: items }], view.embedFontsSkip) : { fonts: [] };
      const json = serializeGroup(name, items, embedded.fonts);
      const handle = await saveFile(json, titleToFileName(name, ".znow"), "application/json", "ZEditor project file", [".znow"], "application/octet-stream");
      if (handle !== "cancelled") status.setNotice("Saved the group as " + (handle && handle.name ? handle.name : titleToFileName(name, ".znow")) + ". Open it on its own, or bring it into any document with Import group.");
    } catch (err) {
      status.setErrorMsg("Couldn't save the group — " + (err && err.message ? err.message : "unknown error"));
    }
  }

  function openImportPicker() {
    if (selectedIdx === null) { status.setErrorMsg("Open or create a document first, then import a group into it."); return; }
    inputRef.current && inputRef.current.click();
  }

  function handleImportInput(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) importGroup(file);
  }

  // The file's items become one new group on top of the current page, in the middle of it. New ids all round, so nothing
  // collides with the page's own (text threads follow along).
  async function importGroup(file) {
    const idx = selectedIdx;
    const page = idx !== null ? pages[idx] : null;
    if (!page) return;
    status.setErrorMsg(null);
    try {
      const { items, name } = await readGroupFile(file, ids.pageKey);
      const size = await getPageDisplaySize(page, pdfDocsRef, MAIN_SCALE);
      const b = itemsBounds(items);
      const dx = b ? Math.round(size.width / 2 - (b.x + b.width / 2)) : 0;
      const dy = b ? Math.round(size.height / 2 - (b.y + b.height / 2)) : 0;
      const used = new Set(pages.flatMap((p) => (p.annotations || []).map((a) => a.groupId).filter(Boolean)));
      let groupId = "g" + nextAnnIdRef.current++;
      while (used.has(groupId)) groupId = "g" + nextAnnIdRef.current++;
      const newId = new Map(items.map((a) => [a.id, ids.annId()]));
      const added = items.map((a) => {
        const m = translatedAnnotation(a, dx, dy);
        return {
          ...m, id: newId.get(a.id),
          groupId: items.length > 1 ? groupId : undefined, groupName: items.length > 1 ? name : undefined,
          threadFrom: a.threadFrom != null && newId.has(a.threadFrom) ? newId.get(a.threadFrom) : undefined,
        };
      });
      edits.updateAnnotationsFor(idx, (anns) => [...anns, ...added]);
      selection.handleSelectAnnotations(added.map((a) => a.id), false);
      status.setNotice(items.length > 1 ? `Imported "${name}" as a group of ${items.length} layers.` : "Imported 1 layer.");
    } catch (err) {
      status.setErrorMsg("Couldn't import that file — " + (err && err.message ? err.message : "unknown error"));
    }
  }

  return { inputRef, handleExportGroup, openImportPicker, handleImportInput };
}
