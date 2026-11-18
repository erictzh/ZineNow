// The project as a file: its title, Save / Save As, opening a .znow, and remembering which file it lives in.

import { stripExtension, titleToFileName } from "../model/documentTitle.js";
import { saveFile, writeFileHandle } from "../io/fileSave.js";
import { readProjectFile, serializeProject } from "../io/projectFile.js";
import { saveReloadSnapshot, takeReloadSnapshot } from "../io/reloadSnapshot.js";
import { allowNextUnload, warnBeforeLeaving } from "../../../../shared/js/leaveWarning.js";

const { useEffect, useState, useRef } = React;

export function useProject({ doc, history, status, view, toolDefaults }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, nextAnnIdRef, nextDocIdRef, pageSizeRef } = doc;
  const { setLoading, setErrorMsg } = status;
  const projectInputRef = useRef(null);
  const [savingProject, setSavingProject] = useState(false);
  // The .znow file this project was last saved to or opened from, so
  // Save can write straight back to it (Save As picks a new one). Only
  // browsers with the File System Access API give us a handle; elsewhere
  // this stays null and Save always downloads a copy.
  const [projectFile, setProjectFile] = useState(null); // { handle, name } | null
  // The topbar title box (see titleStamp). Set whenever a document is
  // started fresh or a project is opened; edited freely after that.
  const [docTitle, setDocTitle] = useState("");
  // Briefly true after a save lands, so the Project menu button can say
  // "Saved" — a quick Save (or Ctrl+S) opens no dialog to show it worked.
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef(null);
  function flashSaved() {
    setJustSaved(true);
    clearTimeout(justSavedTimerRef.current);
    justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 1800);
  }

  // A new document (opened PDF or blank): Save must not overwrite the
  // previous project's file, and it gets a fresh default title.
  function startNewDocument(title) {
    setProjectFile(null);
    setDocTitle(title);
  }

  // `saveAs` always asks where to save; otherwise it overwrites the
  // file from the last save/open, asking only the first time.
  async function handleSaveProject({ saveAs = false } = {}) {
    if (pages.length === 0 || savingProject) return;
    setErrorMsg(null);
    setSavingProject(true);
    try {
      const json = serializeProject({
        title: docTitle,
        pdfDocs: pdfDocsRef.current,
        pages,
        textStyles: toolDefaults.textStyles,
        settings: view.settingsForSave(),
      });
      if (!saveAs && projectFile) {
        try {
          await writeFileHandle(projectFile.handle, json);
          flashSaved();
          return;
        } catch (err) {
          // The file was moved/deleted or editing it was refused — fall
          // back to asking where to save, rather than losing the save.
        }
      }
      // The dialog suggests the title box's name (a quick Save above keeps
      // writing to whatever file was picked, even if the title changed since).
      const handle = await saveFile(json, titleToFileName(docTitle, ".znow"), "application/json", "ZEditor project file", [".znow"]);
      if (handle !== "cancelled") flashSaved();
      if (handle && handle !== "cancelled") setProjectFile({ handle, name: handle.name });
    } catch (err) {
      setErrorMsg("Couldn't save the project — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setSavingProject(false);
    }
  }

  // Prefers the File System Access picker so the opened file's handle can
  // be kept, letting Save write back to it. Falls back to the hidden file
  // input (no handle) where that API isn't available.
  async function openProjectPicker() {
    if (typeof window.showOpenFilePicker === "function") {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "ZEditor project file", accept: { "application/json": [".znow"] } }],
        });
        handleLoadProjectFile(await handle.getFile(), handle);
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // dialog closed
      }
    }
    projectInputRef.current && projectInputRef.current.click();
  }

  function handleProjectInputChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) handleLoadProjectFile(file);
  }

  // Reload the app (to pick up changed code) and bring this project back as it was: it's parked in
  // the browser (io/reloadSnapshot.js) and reopened on start. Undo history isn't kept.
  const [reloading, setReloading] = useState(false);
  // True once start-up knows whether a reload brought work back (so the welcome pop-up doesn't flash first).
  const [startupChecked, setStartupChecked] = useState(false);
  async function reloadKeepingWork() {
    if (reloading) return;
    setReloading(true);
    try {
      if (pages.length > 0) {
        const json = serializeProject({
          title: docTitle,
          pdfDocs: pdfDocsRef.current,
          pages,
          textStyles: toolDefaults.textStyles,
          settings: view.settingsForSave(),
        });
        await saveReloadSnapshot({ json, selectedIdx, title: docTitle, fileHandle: projectFile ? projectFile.handle : null });
      }
      allowNextUnload(); // the work is parked, so the "leave page?" warning isn't needed
      window.location.reload();
    } catch (err) {
      setReloading(false);
      setErrorMsg("Couldn't keep the work for the reload, so the page wasn't reloaded — " + (err && err.message ? err.message : "unknown error"));
    }
  }
  // Refreshing or closing the tab asks first while there are pages (shared/js/leaveWarning.js).
  const hasPagesRef = useRef(false);
  hasPagesRef.current = pages.length > 0;
  useEffect(() => { warnBeforeLeaving(() => hasPagesRef.current); }, []);

  useEffect(() => {
    let cancelled = false;
    takeReloadSnapshot().then(async (snapshot) => {
      if (cancelled) return;
      if (snapshot) {
        const file = { name: (snapshot.title || "Untitled") + ".znow", text: async () => snapshot.json };
        await handleLoadProjectFile(file, snapshot.fileHandle || null, snapshot.selectedIdx);
      }
      setStartupChecked(true);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleLoadProjectFile(file, handle = null, pageIdx = 0) {
    setErrorMsg(null);
    setLoading(true);
    try {
      const loaded = await readProjectFile(file, () => nextKeyRef.current++);
      pdfDocsRef.current = loaded.docs;
      toolDefaults.mergeTextStyles(loaded.textStyles);
      toolDefaults.addFontFamilies(loaded.loadedFamilies);
      nextDocIdRef.current = loaded.maxDocNum + 1;
      nextAnnIdRef.current = loaded.maxAnnId + 1;
      if (!pageSizeRef.current && loaded.pageSize) pageSizeRef.current = loaded.pageSize;

      setPages(loaded.pages);
      setSelectedIdx(loaded.pages.length > 0 ? Math.min(Math.max(0, pageIdx || 0), loaded.pages.length - 1) : null);
      setSelectedPageIndices([]);
      history.clearHistory();
      setProjectFile(handle ? { handle, name: handle.name } : null);
      setDocTitle(loaded.title || stripExtension(file.name));
      view.applySavedSettings(loaded.settings);
    } catch (err) {
      setErrorMsg("Couldn't load that project — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return {
    docTitle, setDocTitle, projectFile, justSaved, savingProject, projectInputRef,
    reloading, reloadKeepingWork, startupChecked,
    startNewDocument, handleSaveProject, openProjectPicker, handleProjectInputChange, handleLoadProjectFile,
  };
}
