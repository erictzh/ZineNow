// The top bar: the File menu (open, save, sample), Send to ZineArranger, Download PDF.

import { DropMenu, MenuItem, MenuSeparator } from "./Menu.jsx";
import { MOD, SHIFT } from "./shortcutKeys.js";

const OPEN_FILE_TYPES = `Opens Markdown (.md, .markdown), plain text (.txt), Word (.docx), EPUB (.epub) and Muse (.muse) files. Replaces the editor's text (${MOD}Z brings it back).`;

/* ==========================================================================
   Header
   ========================================================================== */
// `savedFileName` is the .md file one-click Save writes to, once Save as Markdown… has picked one.
export function Header({ onOpenFile, onSaveMarkdown, onQuickSave, savedFileName, onLoadSample, onExport, isExporting, onSendToZineArranger, isSendingToArranger }) {
  // .topbar and its children come straight from component-kit.css — see
  // component-kit-demo.html's "Top menu bar" section, which this markup
  // matches structurally so the kit's CSS applies with no overrides
  // needed. md2ebook-header/md2ebook-no-print are this app's own
  // functional classes (flex sizing in the app's column layout, and
  // print-media hiding) layered on top, not competing visual styling.
  return (
    <header className="md2ebook-header md2ebook-no-print topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">Md</div>
        <div className="topbar-brand-text">
          <div className="topbar-title">Md to PDF Converter</div>
          {/* The build number (tools/build.mjs) shows which version is running, e.g. on a tablet after a deploy. */}
          <div className="topbar-subtitle" title="Build number: changes whenever the app is updated">Markdown → Publication-ready PDF · build {__BUILD__}</div>
        </div>
      </div>
      <div className="topbar-actions">
        <DropMenu trigger="File" align="right" triggerClassName="md2ebook-topbar-btn md2ebook-file-menu">
          {({ close }) => (
            <>
              <MenuItem label="Open file…" detail="md · txt · docx · epub · muse" shortcut={MOD + "O"} hint={OPEN_FILE_TYPES} onClick={onOpenFile} close={close} />
              {savedFileName ? (
                <MenuItem label="Save" detail={savedFileName} shortcut={MOD + "S"} hint={`Save back to "${savedFileName}", no dialog`} onClick={onQuickSave} close={close} />
              ) : null}
              <MenuItem
                label="Save as Markdown…"
                shortcut={savedFileName ? MOD + SHIFT + "S" : MOD + "S"}
                hint="Save the editor's text as a .md file. After that, Save (and the toolbar's save button) writes back to it in one click."
                onClick={onSaveMarkdown}
                close={close}
              />
              <MenuSeparator />
              <MenuItem label="Load sample Markdown" hint={`Replaces the editor's text with a sample document (${MOD}Z brings yours back)`} onClick={onLoadSample} close={close} />
            </>
          )}
        </DropMenu>
        <button
          type="button"
          className="md2ebook-topbar-btn"
          onClick={onSendToZineArranger}
          disabled={isSendingToArranger}
          title="Exports the current document and opens it directly in ZineArranger — no manual save/reopen step"
        >
          {isSendingToArranger ? "Sending\u2026" : "Send to ZineArranger"}
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          title={'Opens your browser\'s print dialog \u2014 choose "Save as PDF" as the destination'}
          className="btn-solid inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <svg className="md2ebook-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.3" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0118 8.653v4.097A2.25 2.25 0 0115.75 15h-.241l.305 2.14A.75.75 0 0115.023 18H4.977a.75.75 0 01-.79-.86L4.492 15H4.25A2.25 2.25 0 012 12.75V8.653c0-1.082.784-2.005 1.874-2.198.374-.056.75-.107 1.126-.153V2.75zM6.5 6.11c1.649-.176 3.319-.266 5-.266s3.351.09 5 .266V2.75a.25.25 0 00-.25-.25h-6.5a.25.25 0 00-.25-.25v3.61zm5.5 6.14v-1.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.5a.75.75 0 00.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {isExporting ? "Opening Print Dialog…" : "Download PDF eBook"}
        </button>
      </div>
    </header>
  );
}
