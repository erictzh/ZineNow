// The editor: creates the state hooks (state/) and lays out the screen. No logic of its own.

import { fetchImageFile, installImageDrop } from "../../../../shared/js/dropImages.js";
import { pageNumberSpec } from "../model/pageNumbers.js";
import { resolvePageText, setTextDocument, storyStateOfPages } from "../render/pageText.js";
import { useAnnotationEdits } from "../state/useAnnotationEdits.js";
import { useDialogs } from "../state/useDialogs.js";
import { useDocumentFiles } from "../state/useDocumentFiles.js";
import { useDocumentState } from "../state/useDocumentState.js";
import { useExport } from "../state/useExport.js";
import { useHistory } from "../state/useHistory.js";
import { useKeyboardShortcuts } from "../state/useKeyboardShortcuts.js";
import { useImageTrace } from "../state/useImageTrace.js";
import { useMagicErase } from "../state/useMagicErase.js";
import { useMarquee } from "../state/useMarquee.js";
import { useOnionGhost } from "../state/useOnionGhost.js";
import { usePageOps } from "../state/usePageOps.js";
import { useProject } from "../state/useProject.js";
import { useSelection } from "../state/useSelection.js";
import { useStatus } from "../state/useStatus.js";
import { useToolDefaults } from "../state/useToolDefaults.js";
import { useViewSettings } from "../state/useViewSettings.js";
import { useZoom } from "../state/useZoom.js";
import { useCanvasGrow } from "../state/useCanvasGrow.js";
import { useGroupFiles } from "../state/useGroupFiles.js";
import { useLayouts } from "../state/useLayouts.js";
import { collectDocumentColors } from "../model/documentColors.js";
import { DocumentColorsContext } from "./controls/ColorPicker.jsx";
import { useGuides } from "../state/useGuides.js";
import { bleedPt } from "../model/bleed.js";
import { guideSnapTargets } from "../model/guideSet.js";
import { usePageBleed } from "../state/usePageBleed.js";
import { useImageHandoff } from "../state/useImageHandoff.js";
import { ComposeCanvas } from "./canvas/ComposeCanvas.jsx";
import { Rulers } from "./canvas/Rulers.jsx";
import { LiveFilterDefs } from "./canvas/LiveFilterDefs.jsx";
import { ConfirmDialog } from "./dialogs/ConfirmDialog.jsx";
import { InsertPdfDialog } from "./dialogs/InsertPdfDialog.jsx";
import { NewDocumentDialog } from "./dialogs/NewDocumentDialog.jsx";
import { EmbedFontsDialog } from "./dialogs/EmbedFontsDialog.jsx";
import { ShortcutsDialog } from "./dialogs/ShortcutsDialog.jsx";
import { WelcomeDialog } from "./dialogs/WelcomeDialog.jsx";
import { FormatPanel } from "./panels/FormatPanel.jsx";
import { LayersPanel } from "./panels/LayersPanel.jsx";
import { PanelResizer } from "./PanelResizer.jsx";
import { Sidebar } from "./sidebar/Sidebar.jsx";
import { ToolBar } from "./toolbar/ToolBar.jsx";
import { TouchBar } from "./TouchBar.jsx";
import { Topbar } from "./topbar/Topbar.jsx";
import { attachDisplayGear } from "./displaySettings.js";

export function App() {
  // Order matters only in that each hook gets the ones it builds on.
  const status = useStatus();
  const [welcomeDismissed, setWelcomeDismissed] = React.useState(false);
  const bodyRef = React.useRef(null); // the Pages panel, canvas and Format panel in a row (for the draggable lines between them)
  const doc = useDocumentState();
  setTextDocument(doc.pages); // text that runs on across pages is laid out with the pages around it (render/pageText.js)
  const history = useHistory(doc);
  const view = useViewSettings();
  const toolDefaults = useToolDefaults();
  const selection = useSelection(doc);
  const edits = useAnnotationEdits({ doc, history, selection, toolDefaults });
  const magic = useMagicErase({ doc, selection, edits, toolDefaults });
  const imageTrace = useImageTrace({ doc, selection, edits });
  const marquee = useMarquee({ doc, selection, edits, toolDefaults, status, history });
  // Undo/Redo with a magic-eraser preview open throw the preview away instead (it isn't in the history yet).
  const uiHistory = { ...history, handleUndo: () => { if (!magic.cancel()) history.handleUndo(); }, handleRedo: () => { if (!magic.cancel()) history.handleRedo(); } };
  const pageOps = usePageOps({ doc, history, selection });
  const pageBleed = usePageBleed({ doc, history, status });
  const guides = useGuides({ doc, view, history });
  const layouts = useLayouts({ doc, history, edits, view, toolDefaults, status, guides });
  // Picking a guide leaves the item selection (the Format panel shows one thing); picking an item puts the guide down.
  const pickGuide = (id) => { guides.select(id); if (id) { selection.setSelectedAnnId(null); selection.setSelectedAnnIds([]); } };
  const project = useProject({ doc, history, status, view, toolDefaults });
  const dialogs = useDialogs({ pages: doc.pages, openProjectPicker: project.openProjectPicker });
  const files = useDocumentFiles({ doc, history, status, project, selection, dialogs });
  const exporter = useExport({ doc, status, view, project, selection });
  const groupFiles = useGroupFiles({ doc, edits, selection, status, view });
  useImageHandoff({ doc, files, edits, selection }); // a picture sent from Ai Tools (Local) opens as a new canvas document
  const zoom = useZoom();
  const storyStates = React.useMemo(() => storyStateOfPages(doc.pages), [doc.pages]); // page icons: T+ / link
  useCanvasGrow({ doc, zoom: zoom.zoomPercent / 100 }); // no-paper pages grow to hold their items
  const onionGhostSrc = useOnionGhost({ onionSkinOn: view.onionSkinOn, pages: doc.pages, selectedIdx: doc.selectedIdx, pdfDocsRef: doc.pdfDocsRef });
  // Pictures dragged in from the file manager or another website (shared/js/dropImages.js) go on the
  // selected page: where they were dropped if that was on the page, else in its middle.
  const dropCtx = React.useRef(null);
  dropCtx.current = { selectedIdx: doc.selectedIdx, addImage: edits.addImageAnnotationFromFile, status };
  React.useEffect(() => installImageDrop({
    label: "Drop a picture to add it to the page",
    onDrop: async ({ files, url, x, y }) => {
      const { selectedIdx, addImage, status: st } = dropCtx.current;
      if (selectedIdx === null) { st.setErrorMsg("Open a PDF or start a new document first, then drop the picture on a page."); return; }
      st.setErrorMsg(null);
      let list = files;
      if (!list.length) {
        const file = await fetchImageFile(url);
        if (!file) {
          st.setErrorMsg("That website doesn't let other pages copy its pictures. Save the picture to your computer (right-click › Save image as…), then drop the file here.");
          return;
        }
        list = [file];
      }
      // Where on the page (page pixels), from the page's on-screen box: it may be zoomed.
      const pageEl = document.querySelector(".ze-page");
      const box = pageEl && pageEl.getBoundingClientRect();
      const onPage = box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom && pageEl.offsetWidth > 0;
      const scale = onPage ? box.width / pageEl.offsetWidth : 1;
      list.slice(0, 12).forEach((file, i) => addImage(file, selectedIdx, onPage ? { center: { x: (x - box.left) / scale + i * 20, y: (y - box.top) / scale + i * 20 } } : undefined));
    },
    onOther: () => dropCtx.current.status.setErrorMsg("That isn't a picture. Drop a .png, .jpg, .gif, .webp or .svg file."),
  }), []);
  const modalOpen = Boolean(files.pendingInsertFile || dialogs.confirmAction || dialogs.shortcutsOpen || dialogs.newDocOpen || dialogs.embedFontsOpen);
  useKeyboardShortcuts({ doc, history: uiHistory, selection, edits, pageOps, project, marquee, modalOpen, zoom });

  const { pages, selectedIdx, selectedPageIndices, selectedPage, pageFilter } = doc;
  const { tool, selectedAnnId, selectedAnnIds, editingAnnId, croppingAnnId } = selection;
  const t = toolDefaults;
  React.useEffect(() => { if (selectedAnnId !== null || selectedAnnIds.length) guides.select(null); }, [selectedAnnId, selectedAnnIds.length]);

  // The colour picker offers the colours this document already uses; it asks for them when it opens, from the latest pages.
  const pagesRef = React.useRef(doc.pages);
  pagesRef.current = doc.pages;
  const documentColors = React.useCallback(() => collectDocumentColors(pagesRef.current), []);

  return (
    <DocumentColorsContext.Provider value={documentColors}>
    <div className="ze-shell">
      <Topbar doc={doc} history={uiHistory} view={view} edits={edits} layouts={layouts} pageBleed={pageBleed} guideSet={guides} project={project} dialogs={dialogs} exporter={exporter} status={status} />

      {status.errorMsg && <div className="ze-error-bar">{status.errorMsg}</div>}
      {status.notice && (
        <div className="ze-notice-bar">
          <span>{status.notice}</span>
          <button type="button" className="ze-notice-close" aria-label="Dismiss" onClick={() => status.setNotice(null)}>×</button>
        </div>
      )}

      <div className="ze-body" ref={bodyRef}>
        <PanelResizer
          bodyRef={bodyRef} side="left" cssVar="--ze-sidebar-width" otherVar="--ze-format-panel-width"
          storageKey="zeditor.sidebarWidth" min={170} max={480} label="Resize the Pages panel"
        />
        {selectedPage && (
          <PanelResizer
            bodyRef={bodyRef} side="right" cssVar="--ze-format-panel-width" otherVar="--ze-sidebar-width"
            storageKey="zeditor.formatPanelWidth" min={220} max={520} label="Resize the Format panel"
          />
        )}
        <Sidebar
          pages={pages}
          selectedIdx={selectedIdx}
          selectedPageIndices={selectedPageIndices}
          onSelect={selection.handleSelectPage}
          onSelectAll={selection.handleSelectAllPages}
          storyStates={storyStates}
          onContinueStory={layouts.continueStory}
          layouts={layouts}
          layoutSettings={view.layoutSettings}
          onLayoutSettings={view.setLayoutSettings}
          onRotate={pageOps.handleRotate}
          onDelete={pageOps.handleDeleteThumbnail}
          onReorder={pageOps.handleReorder}
          onLoadClick={files.handleLoadClick}
          onNewDocClick={() => dialogs.openNewDocDialog(false)}
          onInsertPdfClick={files.handleInsertPdfClick}
          onInsertBlank={pageOps.handleInsertBlank}
          loading={status.loading}
        />
        <div className="ze-compose-area">
          {selectedPage && <ToolBar selection={selection} edits={edits} view={view} zoom={zoom} dialogs={dialogs} />}
          <div className={"ze-ruler-frame" + (selectedPage && view.rulersOn ? " has-rulers" : "")}>
          {selectedPage && view.rulersOn && (
            <Rulers
              paneRef={zoom.previewPaneRef} zoom={zoom.zoomPercent / 100} unit={view.rulerUnit}
              guides={guides.visible} onAdd={guides.add} onUpdate={guides.update} onRemove={guides.remove}
              selectedId={guides.selected ? guides.selected.id : null} onSelect={pickGuide} newColor={guides.color}
              snapTargets={view.snapToGuidesOn ? (axis, id, w, h) => guideSnapTargets(axis, { width: w, height: h }, bleedPt(selectedPage), view.guidesOn && view.guideMarginIn > 0 ? view.guideMarginIn * 72 : 0, guides.visible.filter((g) => g.id !== id && !g.hidden)) : null}
              locked={view.guidesLocked} pageKey={selectedPage.key}
            />
          )}
          <div className="preview-pane" ref={zoom.previewPaneRef}>
            <div className="preview-canvas-wrapper">
              <ComposeCanvas
                zoom={zoom.zoomPercent / 100}
                viewKey={zoom.viewKey}
                rulerUnit={view.rulerUnit}
                pdfDocsRef={doc.pdfDocsRef}
                page={selectedPage}
                guidesOn={view.guidesOn}
                centerGuideOn={view.centerGuideOn}
                guideFormat={view.guideFormat}
                guideMarginIn={view.guideMarginIn}
                guideBleedIn={view.guideBleedIn}
                pageFilter={pageFilter}
                onionGhostSrc={view.onionSkinOn ? onionGhostSrc : null}
                onionSkinOpacity={view.onionSkinOpacity}
                pageNumberSpec={pageNumberSpec(view.pageNumbers, selectedIdx, pages.length)}
                tool={tool}
                penColor={t.penColor}
                penWidth={t.penWidth}
                penTaper={t.penTaper}
                highlighterColor={t.highlighterColor}
                highlighterWidth={t.highlighterWidth}
                highlighterTaper={t.highlighterTaper}
                annotations={selectedPage ? (selectedPage.annotations || []) : []}
                selectedAnnId={selectedAnnId}
                selectedAnnIds={selectedAnnIds}
                editingAnnId={editingAnnId}
                onStartTextEdit={selection.setEditingAnnId}
                onFinishTextEdit={edits.finishTextEdit}
                onLinkNextFrame={edits.frameActions.linkNextFrame}
                onUnlinkNextFrame={edits.frameActions.unlinkNextFrame}
                onSelectAnnotations={selection.handleSelectAnnotations}
                onMoveAnnotations={edits.handleMoveAnnotations}
                onRotateAnnotations={edits.handleRotateAnnotations}
                croppingAnnId={croppingAnnId}
                priorityAnnId={selection.panelPickId !== null && selection.panelPickId === selectedAnnId ? selectedAnnId : null}
                onSelectAnnotation={selection.handleSelectAnnotation}
                onAddText={edits.handleAddText}
                onAddRect={edits.handleAddRect}
                onAddStroke={edits.handleAddStroke}
                onUpdateAnnotation={edits.handleUpdateAnnotation}
                onEraseStroke={edits.handleEraseStroke}
                onToggleCrop={selection.handleToggleCrop}
                eraserMode={t.eraserMode}
                softEraser={t.softEraser}
                onEraseImagePixels={edits.handleEraseImagePixels}
                magicPreview={magic.preview}
                onMagicClick={magic.start}
                marquee={marquee.region}
                marqueeShape={t.marquee.shape}
                marqueeHidden={t.marquee.areaVisible === false}
                marqueeBrush={{ size: t.marquee.brushSize, erase: t.marquee.brushErase }}
                onMarqueeChange={marquee.setRegion}
                snapGuides={view.rulersOn && view.snapToGuidesOn ? guides.visible.filter((g) => !g.hidden) : null}
                snapItems={view.snapToGuidesOn}
              />
            </div>
          </div>
          {/* Bottom left of the canvas: the Display gear (ui/displaySettings.js), then the touch bar,
              shown only while a finger is being used (styles/touch.css). */}
          <div className="ze-bottom-left">
            <div className="ze-display-slot" ref={attachDisplayGear} />
            {selectedPage && (
              <TouchBar
                selectedAnn={tool === "marquee" ? null : (selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null}
                marqueePolygonOpen={marquee.polygonOpen}
                isEditing={editingAnnId !== null}
                isCropping={croppingAnnId !== null && croppingAnnId === selectedAnnId}
                onEditText={selection.setEditingAnnId}
              />
            )}
          </div>
          </div>
        </div>
        {selectedPage && (
          <FormatPanel
            guide={guides.selected} guides={guides} rulerUnit={view.rulerUnit}
            key={selectedAnnId} // so a half-typed field never carries over to the next item
            tool={tool}
            selectedAnn={resolvePageText(selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null}
            onUpdate={edits.handleUpdateAnnotation}
            croppingAnnId={croppingAnnId}
            onToggleCrop={selection.handleToggleCrop}
            onFlattenImage={edits.handleFlattenImage}
            onRemoveBackground={edits.handleRemoveBackground}
            onOpenInAiTools={edits.handleOpenInAiTools}
            onRasterizeRect={edits.handleRasterizeRect}
            onRasterizeText={edits.handleRasterizeText}
            onOutlineText={async (ann) => { const message = await edits.handleOutlineText(ann); if (message) status.setNotice(message); }}
            toolDefaults={toolDefaults}
            styleActions={edits.styleActions}
            imageTrace={imageTrace}
            onExportSvg={exporter.handleExportSvg}
            magicErase={magic}
            marquee={marquee}
            targetLayer={(selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null}
          />
        )}
      </div>

      {selectedPage && view.layersOpen && (
        <LayersPanel
          position={view.layersPosition}
          onMove={view.setLayersPosition}
          size={view.layersSize}
          onResize={view.setLayersSize}
          onSetLook={(patch) => edits.handleSetLayerLook(selection.selectedAnnotationIds(), patch)}
          onMinimize={() => view.setLayersOpen(false)}
          annotations={selectedPage.annotations || []}
          selectedIds={selection.selectedAnnotationIds()}
          onSelect={selection.handleSelectLayer}
          onSelectRange={selection.handleSelectLayerRange}
          onGroup={edits.handleGroupSelection}
          onUngroup={edits.handleUngroupSelection}
          onDelete={edits.handleDeleteAnnotation}
          onRenameGroup={edits.handleRenameGroup}
          onSetGroupFlag={edits.handleSetGroupFlag}
          onToggleFlag={edits.handleToggleLayerFlag}
          onToggleClip={edits.handleToggleClip}
          onClip={() => edits.handleSetClip(selection.selectedAnnotationIds(), true)}
          onRelease={() => edits.handleSetClip(selection.selectedAnnotationIds(), false)}
          onRename={(id, name) => edits.handleUpdateAnnotation(id, { name })}
          onReorder={edits.handleReorderLayers}
          onExportGroup={groupFiles.handleExportGroup}
          onImportGroup={groupFiles.openImportPicker}
          guides={guides}
          rulerUnit={view.rulerUnit}
        />
      )}

      {/* Hidden file pickers, opened by their buttons. */}
      <input ref={files.fileInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={files.handleFileInputChange} />
      {/* Insert Image: pictures (on Android this opens the photo picker, which doesn't list SVGs). */}
      <input ref={edits.imageInputRef} type="file" accept="image/*,.svg,image/svg+xml" style={{ display: "none" }} onChange={edits.handleImageFileChosen} />

      <input ref={files.insertPdfInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={files.handleInsertPdfInputChange} />
      {/* .json too: projects saved on Android before 2026-11-22 came out as "Name.znow.json". On Android a
          .znow file has no known type, hence application/octet-stream, so it isn't greyed out. */}
      {/* Import group: a .znow file (a saved group, or any project) whose items come in as one group. */}
      {/* No accept filter on the two project inputs below: Android's file picker does not know ".znow", so any filter greyed those files out (only .json showed). The file is checked when it is read. */}
      <input ref={groupFiles.inputRef} type="file" style={{ display: "none" }} onChange={groupFiles.handleImportInput} />
      <input ref={project.projectInputRef} type="file" style={{ display: "none" }} onChange={project.handleProjectInputChange} />

      <InsertPdfDialog
        file={files.pendingInsertFile}
        pageCount={pages.length}
        afterPage={files.insertAfterPage}
        onChangeAfterPage={files.setInsertAfterPage}
        onConfirm={files.handleConfirmInsertPdf}
        onCancel={() => files.setPendingInsertFile(null)}
      />
      <NewDocumentDialog
        open={dialogs.newDocOpen}
        onCreate={files.handleCreateBlankDocument}
        onOpenPdf={dialogs.newDocFromProject ? files.handleNewDocumentOpenPdf : undefined}
        onCancel={() => dialogs.setNewDocOpen(false)}
      />
      {/* Shown on landing while nothing is open; it steps aside for the New Document dialog and
          comes back if that's cancelled. Closing it leaves the empty editor with its own buttons. */}
      <WelcomeDialog
        open={project.startupChecked && pages.length === 0 && !welcomeDismissed && !dialogs.newDocOpen && !status.loading}
        onNewDocument={() => dialogs.openNewDocDialog(false)}
        onOpenProject={dialogs.handleLoadProjectClick}
        onOpenPdf={files.handleLoadClick}
        onClose={() => setWelcomeDismissed(true)}
      />
      <ShortcutsDialog open={dialogs.shortcutsOpen} onClose={() => dialogs.setShortcutsOpen(false)} />
      <EmbedFontsDialog open={dialogs.embedFontsOpen} startConfirm={dialogs.embedFontsAskFirst} onClose={() => dialogs.closeEmbedFonts()} pages={doc.pages} view={view} />
      <ConfirmDialog
        step={dialogs.confirmAction ? dialogs.confirmStep : 0}
        onProceed={dialogs.handleConfirmProceed}
        onYes={dialogs.handleConfirmYes}
        onCancel={dialogs.handleConfirmCancel}
      />

      <LiveFilterDefs pageFilter={pageFilter} />
    </div>
    </DocumentColorsContext.Provider>
  );
}
