// The project as a file: its title, Save / Save As, opening a .znow, and remembering which file it lives in.

import { templateFileName, templateNeeds, templatePages, templateSettings, stripTemplatePrefix } from "../model/dataMerge/template.js";
import { stripExtension, titleToFileName } from "../model/documentTitle.js";
import { saveFile, writeFileHandle } from "../io/fileSave.js";
import { buildEmbeddedFonts, canReadSystemFonts, ensureFontAccess } from "../io/fontEmbed.js";
import { readProjectFile, serializeProject } from "../io/projectFile.js";
import { saveReloadSnapshot, takeReloadSnapshot } from "../io/reloadSnapshot.js";
import { allowNextUnload, warnBeforeLeaving } from "../../../../shared/js/leaveWarning.js";
import { announceDocumentOpened } from "./useZoom.js";

const { useEffect, useState, useRef } = React;

export function useProject({ doc, history, status, view, toolDefaults }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, nextAnnIdRef, nextDocIdRef, pageSizeRef } = doc;
  const { setLoading, setErrorMsg } = status; // status.setNotice: an information line (e.g. which fonts were embedded)
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
  // Data templates (model/dataMerge/template.js). `editingTemplate`: the open file is a data template being edited, so Save keeps it one (no data,
  // no photos, only the designed pages). `templatePrompt`: a template was just opened and the person is choosing "Use this template" or "Edit it".
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState(null); // { file, handle, pageIdx, columns, name } | null
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
    setEditingTemplate(false);
    setDocTitle(title);
    view.setEmbedFonts(true); view.setEmbedFontsSkip([]); // a new document starts with the default: embed the system fonts it uses
  }

  // The project as the text of a file; as a data template (no data or photos, designed pages only, marked) when `asTemplate`.
  function projectText(embeddedFonts, asTemplate) {
    const settings = view.settingsForSave();
    if (!asTemplate) return serializeProject({ title: docTitle, pdfDocs: pdfDocsRef.current, pages, textStyles: toolDefaults.textStyles, settings, embeddedFonts });
    const designed = templatePages(pages);
    return serializeProject({
      title: stripTemplatePrefix(docTitle), pdfDocs: pdfDocsRef.current, pages: designed, textStyles: toolDefaults.textStyles,
      settings: templateSettings(settings), embeddedFonts, dataTemplate: { version: 1, columns: templateNeeds(designed, view.dataGroupBy) },
    });
  }

  // Project > Save as data template…: a shareable copy named "ZDATA = <title>.znow" with the designs and settings but not the data or photos.
  // The project being edited stays as it is (and where it is saved).
  async function handleSaveDataTemplate() {
    if (pages.length === 0 || savingProject) return;
    setErrorMsg(null);
    setSavingProject(true);
    try {
      const json = projectText([], true);
      const handle = await saveFile(json, templateFileName(docTitle), "application/json", "ZEditor data template", [".znow"], "application/octet-stream");
      if (handle !== "cancelled") status.setNotice("Data template saved. It has your designs and settings, not the spreadsheet or photos. System fonts are not inside it, so the other person needs them (or sees a stand-in).");
    } catch (err) {
      setErrorMsg("Couldn't save the data template — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setSavingProject(false);
    }
  }

  // `saveAs` always asks where to save; otherwise it overwrites the
  // file from the last save/open, asking only the first time.
  async function handleSaveProject({ saveAs = false } = {}) {
    if (pages.length === 0 || savingProject) return;
    setErrorMsg(null);
    setSavingProject(true);
    try {
      // Project > Embed Fonts…: the system fonts the text uses go inside the file (needs the browser's font access; the ones it can't read are named)
      let embeddedFonts = [];
      if (view.embedFonts && canReadSystemFonts()) {
        await ensureFontAccess(pages); // asks the browser for font access the first time (this click is the user action it needs)
        const r = await buildEmbeddedFonts(pages, view.embedFontsSkip);
        embeddedFonts = r.fonts;
        status.setNotice(r.missing.length
          ? "Saved, but these fonts could not be embedded (open Project > Embed Fonts… and allow font access, or they are not on this computer): " + r.missing.join(", ")
          : r.fonts.length ? "Embedded " + r.fonts.length + " system font" + (r.fonts.length === 1 ? "" : "s") + " in the project file. Only share it if those fonts' licences allow it (Project > Embed Fonts… to change)." : null);
      }
      const json = projectText(embeddedFonts, editingTemplate);
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
      // The download fallback (Android, Firefox, Safari: no Save dialog) labels the file as plain
      // bytes, not JSON: Android's download manager adds ".json" to a JSON file whose name doesn't
      // end in .json, which made "Zine.znow.json".
      const handle = await saveFile(json, editingTemplate ? templateFileName(docTitle) : titleToFileName(docTitle, ".znow"), "application/json", editingTemplate ? "ZEditor data template" : "ZEditor project file", [".znow"], "application/octet-stream");
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
        // No file-type filter: on Android the picker turns a type filter into MIME types, and it does not know ".znow", so only .json files could be
        // picked. Every file can be picked; the content is checked when it is read.
        const [handle] = await window.showOpenFilePicker({ id: "zeditor-project" });
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

  // `mode`: undefined (a template asks first), "use" (open a data template as a new untitled project to fill with your own data), or "edit".
  async function handleLoadProjectFile(file, handle = null, pageIdx = 0, mode) {
    setErrorMsg(null);
    setLoading(true);
    try {
      const loaded = await readProjectFile(file, () => nextKeyRef.current++);
      if (loaded.dataTemplate && !mode) { setTemplatePrompt({ file, handle, pageIdx, columns: loaded.dataTemplate.columns, name: stripTemplatePrefix(loaded.title || stripExtension(file.name)) }); return; }
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
      const useTemplate = mode === "use";
      setProjectFile(handle && !useTemplate ? { handle, name: handle.name } : null); // using a template never saves over it
      setEditingTemplate(Boolean(loaded.dataTemplate) && mode === "edit");
      setDocTitle(useTemplate ? stripTemplatePrefix(loaded.title || stripExtension(file.name)) : loaded.title || stripExtension(file.name));
      view.applySavedSettings(loaded.settings);
      if (useTemplate) { view.setDataTemplateColumns(loaded.dataTemplate.columns); view.setDataPanelOpen(true); view.setDataMinimized(false); }
      announceDocumentOpened(); // the page in the middle of the view at 100%
    } catch (err) {
      setErrorMsg("Couldn't load that project — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return {
    docTitle, setDocTitle, projectFile, justSaved, savingProject, projectInputRef,
    reloading, reloadKeepingWork, startupChecked,
    editingTemplate, templatePrompt, handleSaveDataTemplate,
    chooseTemplate: (mode) => { const p = templatePrompt; setTemplatePrompt(null); if (p && mode) handleLoadProjectFile(p.file, p.handle, p.pageIdx, mode); },
    startNewDocument, handleSaveProject, openProjectPicker, handleProjectInputChange, handleLoadProjectFile,
  };
}
