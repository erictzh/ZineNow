// The editor: creates the state hooks (state/) and lays out the screen. No logic of its own.

import { pageNumberSpec } from "../model/pageNumbers.js";
import { useAnnotationEdits } from "../state/useAnnotationEdits.js";
import { useDialogs } from "../state/useDialogs.js";
import { useDocumentFiles } from "../state/useDocumentFiles.js";
import { useDocumentState } from "../state/useDocumentState.js";
import { useExport } from "../state/useExport.js";
import { useHistory } from "../state/useHistory.js";
import { useKeyboardShortcuts } from "../state/useKeyboardShortcuts.js";
import { useMagicErase } from "../state/useMagicErase.js";
import { useOnionGhost } from "../state/useOnionGhost.js";
import { usePageOps } from "../state/usePageOps.js";
import { useProject } from "../state/useProject.js";
import { useSelection } from "../state/useSelection.js";
import { useStatus } from "../state/useStatus.js";
import { useToolDefaults } from "../state/useToolDefaults.js";
import { useViewSettings } from "../state/useViewSettings.js";
import { useZoom } from "../state/useZoom.js";
import { ComposeCanvas } from "./canvas/ComposeCanvas.jsx";
import { LiveFilterDefs } from "./canvas/LiveFilterDefs.jsx";
import { ConfirmDialog } from "./dialogs/ConfirmDialog.jsx";
import { InsertPdfDialog } from "./dialogs/InsertPdfDialog.jsx";
import { NewDocumentDialog } from "./dialogs/NewDocumentDialog.jsx";
import { ShortcutsDialog } from "./dialogs/ShortcutsDialog.jsx";
import { FormatPanel } from "./panels/FormatPanel.jsx";
import { LayersPanel } from "./panels/LayersPanel.jsx";
import { Sidebar } from "./sidebar/Sidebar.jsx";
import { ToolBar } from "./toolbar/ToolBar.jsx";
import { Topbar } from "./topbar/Topbar.jsx";

export function App() {
  // Order matters only in that each hook gets the ones it builds on.
  const status = useStatus();
  const doc = useDocumentState();
  const history = useHistory(doc);
  const view = useViewSettings();
  const toolDefaults = useToolDefaults();
  const selection = useSelection(doc);
  const edits = useAnnotationEdits({ doc, history, selection, toolDefaults });
  const magic = useMagicErase({ doc, selection, edits, toolDefaults });
  // Undo/Redo with a magic-eraser preview open throw the preview away instead (it isn't in the history yet).
  const uiHistory = { ...history, handleUndo: () => { if (!magic.cancel()) history.handleUndo(); }, handleRedo: () => { if (!magic.cancel()) history.handleRedo(); } };
  const pageOps = usePageOps({ doc, history, selection });
  const project = useProject({ doc, history, status, view, toolDefaults });
  const dialogs = useDialogs({ pages: doc.pages, openProjectPicker: project.openProjectPicker });
  const files = useDocumentFiles({ doc, history, status, project, selection, dialogs });
  const exporter = useExport({ doc, status, view, project });
  const zoom = useZoom();
  const onionGhostSrc = useOnionGhost({ onionSkinOn: view.onionSkinOn, pages: doc.pages, selectedIdx: doc.selectedIdx, pdfDocsRef: doc.pdfDocsRef });
  const modalOpen = Boolean(files.pendingInsertFile || dialogs.confirmAction || dialogs.shortcutsOpen || dialogs.newDocOpen);
  useKeyboardShortcuts({ doc, history: uiHistory, selection, edits, pageOps, project, modalOpen });

  const { pages, selectedIdx, selectedPageIndices, selectedPage, pageFilter } = doc;
  const { tool, selectedAnnId, selectedAnnIds, editingAnnId, croppingAnnId } = selection;
  const t = toolDefaults;

  return (
    <div className="ze-shell">
      <Topbar doc={doc} history={uiHistory} view={view} edits={edits} project={project} dialogs={dialogs} exporter={exporter} status={status} />

      {status.errorMsg && <div className="ze-error-bar">{status.errorMsg}</div>}

      <div className="ze-body">
        <Sidebar
          pages={pages}
          selectedIdx={selectedIdx}
          selectedPageIndices={selectedPageIndices}
          onSelect={selection.handleSelectPage}
          onSelectAll={selection.handleSelectAllPages}
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
          <div className="preview-pane" ref={zoom.previewPaneRef}>
            <div className="preview-canvas-wrapper">
              <ComposeCanvas
                zoom={zoom.zoomPercent / 100}
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
                onSelectAnnotations={selection.handleSelectAnnotations}
                onMoveAnnotations={edits.handleMoveAnnotations}
                onRotateAnnotations={edits.handleRotateAnnotations}
                croppingAnnId={croppingAnnId}
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
              />
            </div>
          </div>
        </div>
        {selectedPage && (
          <FormatPanel
            key={selectedAnnId} // so a half-typed field never carries over to the next item
            tool={tool}
            selectedAnn={(selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null}
            onUpdate={edits.handleUpdateAnnotation}
            croppingAnnId={croppingAnnId}
            onToggleCrop={selection.handleToggleCrop}
            onFlattenImage={edits.handleFlattenImage}
            onRasterizeRect={edits.handleRasterizeRect}
            onRasterizeText={edits.handleRasterizeText}
            toolDefaults={toolDefaults}
            magicErase={magic}
          />
        )}
      </div>

      {selectedPage && view.layersOpen && (
        <LayersPanel
          position={view.layersPosition}
          onMove={view.setLayersPosition}
          onMinimize={() => view.setLayersOpen(false)}
          annotations={selectedPage.annotations || []}
          selectedIds={selection.selectedAnnotationIds()}
          onSelect={selection.handleSelectLayer}
          onGroup={edits.handleGroupSelection}
          onUngroup={edits.handleUngroupSelection}
          onToggleFlag={edits.handleToggleLayerFlag}
          onRename={(id, name) => edits.handleUpdateAnnotation(id, { name })}
          onReorder={edits.handleReorderLayers}
        />
      )}

      {/* Hidden file pickers, opened by their buttons. */}
      <input ref={files.fileInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={files.handleFileInputChange} />
      <input ref={edits.imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={edits.handleImageFileChosen} />
      <input ref={files.insertPdfInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={files.handleInsertPdfInputChange} />
      <input ref={project.projectInputRef} type="file" accept=".znow" style={{ display: "none" }} onChange={project.handleProjectInputChange} />

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
      <ShortcutsDialog open={dialogs.shortcutsOpen} onClose={() => dialogs.setShortcutsOpen(false)} />
      <ConfirmDialog
        step={dialogs.confirmAction ? dialogs.confirmStep : 0}
        onProceed={dialogs.handleConfirmProceed}
        onYes={dialogs.handleConfirmYes}
        onCancel={dialogs.handleConfirmCancel}
      />

      <LiveFilterDefs pageFilter={pageFilter} />
    </div>
  );
}
