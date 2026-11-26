// The top bar: brand, undo/redo, the zine title, and the Page / Project / Export menus.

import { canReadSystemFonts, fontLicenceSeen } from "../../io/fontEmbed.js";
import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT, PAGE_FILTER_OPTIONS } from "../../model/pageFilters.js";
import { BleedSettings } from "../settings/BleedSettings.jsx";
import { FilterSettings } from "../settings/FilterSettings.jsx";
import { GuidesSettings } from "../settings/GuidesSettings.jsx";
import { OnionSkinSettings } from "../settings/OnionSkinSettings.jsx";
import { PageNumbersSettings } from "../settings/PageNumbersSettings.jsx";
import { RulersSettings } from "../settings/RulersSettings.jsx";
import { PageMenuBody } from "./PageMenu.jsx";
import { MenuCheck, MenuItem, TopMenu } from "./TopMenu.jsx";

export function Topbar({ doc, history, view, edits, layouts, pageBleed, guideSet, project, dialogs, exporter, status }) {
  const { pages, selectedPage, pageFilter } = doc;
  const { updatePageFilter } = edits;
  const { docTitle, setDocTitle, projectFile, savingProject, justSaved } = project;
  const { exporting, sendingToArranger } = exporter;
  const canReadFonts = canReadSystemFonts();

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
        <button
          type="button" className={"ze-menu-trigger" + (view.dataPanelOpen ? " open" : "")} aria-pressed={view.dataPanelOpen}
          title="Data: fill pages from a spreadsheet (mail merge)" onClick={() => { if (view.dataPanelOpen && view.dataMinimized) view.setDataMinimized(false); else view.setDataPanelOpen(!view.dataPanelOpen); }}
        >Data</button>
        <TopMenu label="Page">
          {({ close }) => (
            <PageMenuBody
              close={close}
              rows={[
                {
                  key: "layout",
                  label: "Layout",
                  detail: "ready-made pages",
                  noToggle: true,
                  openLabel: "Choose…",
                  disabled: doc.pages.length === 0,
                  onOpen: () => dialogs.setLayoutOpen(true),
                },
                {
                  key: "bleed",
                  label: "Bleed",
                  detail: selectedPage && selectedPage.isBlank && !selectedPage.isCanvas ? (selectedPage.bleedMm > 0 ? selectedPage.bleedMm + " mm on this page" : "none on this page") : "blank pages only",
                  noToggle: true,
                  openLabel: "Set…",
                  disabled: !selectedPage || !selectedPage.isBlank || selectedPage.isCanvas,
                  settings: <BleedSettings key={selectedPage ? selectedPage.key + ":" + selectedPage.bleedMm : "none"} currentMm={selectedPage ? selectedPage.bleedMm : 0} onApply={pageBleed.setPageBleed} />,
                },
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
                  label: "Ruler Guide",
                  detail: guideSet.visible.length ? String(guideSet.visible.length) : null,
                  checked: view.rulersOn,
                  onToggle: view.setRulersOn,
                  settings: (
                    <RulersSettings
                      unit={view.rulerUnit}
                      onUnitChange={view.setRulerUnit}
                      guides={guideSet.visible}
                      onClearGuides={guideSet.clearAll}
                      snap={view.snapToGuidesOn}
                      onSnapChange={view.setSnapToGuidesOn}
                      locked={view.guidesLocked}
                      onLockedChange={view.setGuidesLocked}
                    />
                  ),
                },
                {
                  key: "guides",
                  label: "Page Guide",
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
              {/* Embed system fonts: a switch for this project (kept in the project file) and the dialog that lists the fonts */}
              <div className={"ze-menu-toggle-row" + (pages.length === 0 || !canReadFonts ? " disabled" : "")} title={canReadFonts ? "Saves the fonts this project uses inside the file, so it looks the same on a computer without them" : "Needs a browser that can read this computer's fonts (Chrome or Edge)"}>
                <div className="ze-menu-toggle-text">
                  <span className="ze-menu-toggle-label">Embed system fonts</span>
                  <span className="ze-menu-toggle-detail">in the saved project</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox" checked={view.embedFonts && canReadFonts} disabled={pages.length === 0 || !canReadFonts}
                    onChange={(e) => { if (!e.target.checked) view.setEmbedFonts(false); else if (fontLicenceSeen()) view.setEmbedFonts(true); else { close(); dialogs.openEmbedFonts(true); } }}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <MenuItem
                close={close}
                label="Embed Fonts…"
                disabled={pages.length === 0}
                onClick={() => dialogs.openEmbedFonts(false)}
                hint="See which fonts this project uses, which are inside the file, and choose which system fonts to embed"
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
              {pages.some((p) => p.isBlank && p.bleedMm > 0) && (
                <React.Fragment>
                  <MenuCheck label="Include bleed" checked={view.exportBleed} onChange={view.setExportBleed}
                    hint="On: pages with bleed are exported whole, with the trim and bleed boxes set. Off: they are trimmed to the cut size" />
                  <MenuCheck label="Crop marks" checked={view.exportBleed && view.exportCropMarks} disabled={!view.exportBleed} onChange={view.setExportCropMarks}
                    hint="Cut lines in the corners outside the bleed. Only with bleed" />
                </React.Fragment>
              )}
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
                label="Export page as SVG (Illustrator)"
                disabled={doc.selectedIdx === null || exporting}
                onClick={() => exporter.handleExportPagesSvg(false)}
                hint="The whole page as an SVG: its layers are named groups, shapes and drawings stay vectors, text can become outlines"
              />
              <MenuItem
                close={close}
                label="Export all pages as one SVG"
                disabled={pages.length === 0 || exporting}
                onClick={() => exporter.handleExportPagesSvg(true)}
                hint="Every page side by side in one SVG, each page a group (Page 1, Page 2…)"
              />
              <MenuCheck label="SVG: text as outlines" checked={view.svgOutlineText} onChange={view.setSvgOutlineText}
                hint="On: letters become shapes, so the file opens without the fonts (needs the font file: upload it or allow Load Local System Fonts). Off: live text" />
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
