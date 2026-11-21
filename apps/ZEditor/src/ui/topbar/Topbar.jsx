// The top bar: brand, undo/redo, the zine title, and the Page / Project / Export menus.

import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT, PAGE_FILTER_OPTIONS } from "../../model/pageFilters.js";
import { FilterSettings } from "../settings/FilterSettings.jsx";
import { GuidesSettings } from "../settings/GuidesSettings.jsx";
import { OnionSkinSettings } from "../settings/OnionSkinSettings.jsx";
import { PageNumbersSettings } from "../settings/PageNumbersSettings.jsx";
import { RulersSettings } from "../settings/RulersSettings.jsx";
import { PageMenuBody } from "./PageMenu.jsx";
import { MenuItem, TopMenu } from "./TopMenu.jsx";

export function Topbar({ doc, history, view, edits, project, dialogs, exporter, status }) {
  const { pages, selectedPage, pageFilter } = doc;
  const { updatePageFilter } = edits;
  const { docTitle, setDocTitle, projectFile, savingProject, justSaved } = project;
  const { exporting, sendingToArranger } = exporter;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">ZE</div>
        <div className="topbar-brand-text">
          <div className="topbar-title">ZEditor</div>
          {/* The build number (tools/build.mjs) shows which version is running, e.g. on a tablet after a deploy. */}
          <div className="topbar-subtitle" title="Build number: changes whenever the app is updated">Compose zine pages · build {__BUILD__}</div>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="ze-tool-bar-group">
          <button type="button" className="ze-tool-icon-btn" title="Undo (Ctrl+Z)" disabled={history.undoStack.length === 0} onClick={history.handleUndo}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 7L4 12l5 5" />
              <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
            </svg>
          </button>
          <button type="button" className="ze-tool-icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={history.redoStack.length === 0} onClick={history.handleRedo}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 7l5 5-5 5" />
              <path d="M20 12H9a5 5 0 0 0 0 10h1" />
            </svg>
          </button>
          <button
            type="button" className="ze-tool-icon-btn" disabled={project.reloading}
            title="Reload the app (picks up code changes) and keep your work: pages, items, title and the file it saves to come back. Undo history starts fresh."
            onClick={project.reloadKeepingWork}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 4v7h-7" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          className="ze-title-input"
          aria-label="Zine title"
          placeholder="Untitled zine"
          title="Zine title — names the saved project and exported PDF"
          disabled={pages.length === 0}
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); }}
          onBlur={() => setDocTitle((t) => t.trim())}
        />
        <TopMenu label="Page">
          {() => (
            <PageMenuBody
              rows={[
                {
                  key: "filter",
                  label: "Filter",
                  // Per page, so it needs a page to act on. Turning it off
                  // remembers the filter it was on, and turning it back on
                  // restores that (its settings stay on the page throughout).
                  disabled: !selectedPage,
                  detail: pageFilter.type !== "none"
                    ? (PAGE_FILTER_OPTIONS.find((o) => o.key === pageFilter.type) || PAGE_FILTER_OPTIONS[0]).label
                    : null,
                  checked: pageFilter.type !== "none",
                  onToggle: (on) => updatePageFilter(on
                    ? { type: pageFilter.lastType && pageFilter.lastType !== "none" ? pageFilter.lastType : "grayscale" }
                    : { type: "none", lastType: pageFilter.type }),
                  settings: (
                    <FilterSettings
                      filterType={pageFilter.type}
                      onFilterTypeChange={(type) => updatePageFilter({ type })}
                      duotoneDark={pageFilter.darkColor || DEFAULT_DUOTONE_DARK}
                      duotoneLight={pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT}
                      onDuotoneDarkChange={(darkColor) => updatePageFilter({ darkColor })}
                      onDuotoneLightChange={(lightColor) => updatePageFilter({ lightColor })}
                      filter={pageFilter}
                      onFilterPatch={updatePageFilter}
                    />
                  ),
                },
                {
                  key: "onion",
                  label: "Onion Skin",
                  checked: view.onionSkinOn,
                  onToggle: view.setOnionSkinOn,
                  settings: <OnionSkinSettings opacity={view.onionSkinOpacity} onOpacityChange={view.setOnionSkinOpacity} />,
                },
                {
                  key: "pageNumbers",
                  label: "Page Numbers",
                  checked: view.pageNumbers.on,
                  onToggle: (on) => view.setPageNumbers((current) => ({ ...current, on })),
                  settings: (
                    <PageNumbersSettings
                      settings={view.pageNumbers}
                      pageCount={pages.length}
                      onChange={(patch) => view.setPageNumbers((current) => ({ ...current, ...patch }))}
                    />
                  ),
                },
                {
                  key: "rulers",
                  label: "Rulers & Guides",
                  detail: view.rulerGuides.length ? String(view.rulerGuides.length) : null,
                  checked: view.rulersOn,
                  onToggle: view.setRulersOn,
                  settings: (
                    <RulersSettings
                      unit={view.rulerUnit}
                      onUnitChange={view.setRulerUnit}
                      guides={view.rulerGuides}
                      onClearGuides={() => view.setRulerGuides([])}
                      snap={view.snapToGuidesOn}
                      onSnapChange={view.setSnapToGuidesOn}
                    />
                  ),
                },
                {
                  key: "guides",
                  label: "Guides",
                  checked: view.guidesOn,
                  onToggle: view.setGuidesOn,
                  settings: (
                    <GuidesSettings
                      format={view.guideFormat}
                      onFormatChange={view.setGuideFormat}
                      marginIn={view.guideMarginIn}
                      onMarginChange={view.setGuideMarginIn}
                      bleedIn={view.guideBleedIn}
                      onBleedChange={view.setGuideBleedIn}
                    />
                  ),
                },
              ]}
            />
          )}
        </TopMenu>
        <TopMenu label={savingProject ? "Saving…" : justSaved ? "Saved ✓" : "Project"}>
          {({ close }) => (
            <React.Fragment>
              <MenuItem
                close={close}
                label="New Project"
                // Only meaningful once something is loaded — it starts over.
                disabled={pages.length === 0}
                onClick={dialogs.handleNewProjectClick}
                hint="Start over by loading a different PDF — erases the current unsaved project"
              />
              <MenuItem
                close={close}
                label="Save"
                shortcut="Ctrl+S"
                detail={projectFile ? projectFile.name : null}
                disabled={pages.length === 0 || savingProject}
                onClick={() => project.handleSaveProject()}
                hint={projectFile
                  ? "Saves over " + projectFile.name
                  : "Saves an editable project file — pages, text, images, and settings — to reopen and keep editing later"}
              />
              <MenuItem
                close={close}
                label="Save As…"
                shortcut="Ctrl+Shift+S"
                disabled={pages.length === 0 || savingProject}
                onClick={() => project.handleSaveProject({ saveAs: true })}
                hint="Saves this project to a new file, and keeps saving there"
              />
              <MenuItem
                close={close}
                label="Load Project"
                disabled={status.loading}
                onClick={dialogs.handleLoadProjectClick}
                hint="Reopen a saved ZEditor project file"
              />
            </React.Fragment>
          )}
        </TopMenu>
        <TopMenu label={exporting ? "Exporting…" : sendingToArranger ? "Sending…" : "Export"} solid>
          {({ close }) => (
            <React.Fragment>
              <MenuItem
                close={close}
                label="Export PDF"
                disabled={pages.length === 0 || exporting}
                onClick={exporter.handleExportPdf}
              />
              <MenuItem
                close={close}
                label="Export page as PNG (transparent)"
                disabled={doc.selectedIdx === null || exporting}
                onClick={() => exporter.handleExportImage("png")}
                hint="The page you're on, as a picture with a see-through background"
              />
              <MenuItem
                close={close}
                label="Export page as JPG"
                disabled={doc.selectedIdx === null || exporting}
                onClick={() => exporter.handleExportImage("jpg")}
                hint="The page you're on, as a picture on white"
              />
              <MenuItem
                close={close}
                label="Export selection as SVG"
                disabled={exporting || !exporter.canExportSvg()}
                onClick={() => exporter.handleExportSvg()}
                hint="Only the selected layers, cropped to them, on a see-through background. Vectorized images, shapes and pen strokes stay editable vectors"
              />
              <MenuItem
                close={close}
                label="Send to ZineArranger"
                disabled={pages.length === 0 || exporting || sendingToArranger}
                onClick={exporter.handleSendToZineArranger}
                hint="Exports the current zine and opens it directly in ZineArranger — no manual save/reopen step"
              />
            </React.Fragment>
          )}
        </TopMenu>
      </div>
    </header>
  );
}
