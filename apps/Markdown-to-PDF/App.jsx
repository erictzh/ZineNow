"use strict";
/* ==========================================================================
   Md to PDF Converter — App.jsx
   ==========================================================================
   Desktop-first React SPA: Markdown editor + typography controls on the
   left, a live scaled preview of the generated eBook page on the right.

   IMPORTANT — this file is plain JavaScript, not literal JSX syntax.
   It is the output of compiling JSX (React.createElement(...) calls
   instead of <tags>) so the browser can run it directly with a normal
   <script src="App.jsx"> tag in index.html — no Babel, no fetch of this
   file at runtime, and therefore no build step and no local web server
   required: index.html works by double-clicking it and opening it
   straight from disk (file://), exactly the same as when it's hosted
   on a real web server. All structure, naming, and comments from the
   original JSX are preserved, so it reads and edits the same way as
   ordinary React code — every React.createElement("div", {...},
   children) call corresponds 1:1 to a <div {...}>{children}</div>.

   Depends on the globals `React`, `ReactDOM` (loaded via CDN in
   index.html) and `window.MD2eBook` (see pdfGenerator.js).
   ========================================================================== */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
/* ==========================================================================
   Static data
   ========================================================================== */
// The sample Markdown shown in the editor on first load / via "Load
// Sample Markdown" now lives in its own file (sample.md), loaded via a
// <script src="sample.md"> tag in index.html (before this file) — see
// the comment at the top of that file for why it's not a plain fetch().
// The fallback here only matters if that file is ever missing/renamed.
const SAMPLE_MARKDOWN = window.MD2eBookSampleMarkdown || '# Start writing here…';
const DEFAULT_FONT_OPTIONS = [
    'Inter',
    'Merriweather',
    'Georgia',
    'Garamond',
    'JetBrains Mono',
    'Arial',
    'Times New Roman',
];
const PAPER_SIZE_OPTIONS = Object.values(window.MD2eBook.PAPER_SIZES);
const DEFAULTS = window.MD2eBook.DEFAULTS;
const BOLD_WEIGHT_OPTIONS = window.MD2eBook.ALLOWED_BOLD_WEIGHTS;
const INITIAL_CONFIG = {
    fontFamily: 'Inter',
    paperSize: 'a4',
    fontSize: '',
    lineHeight: '',
    paragraphSpacing: '',
    h1Size: '',
    h1Weight: String(DEFAULTS.h1Weight),
    h2Size: '',
    h2Weight: String(DEFAULTS.h2Weight),
    h3Size: '',
    h3Weight: String(DEFAULTS.h3Weight),
    baseWeight: String(DEFAULTS.baseWeight),
    boldWeight: String(DEFAULTS.boldWeight),
    marginVertical: '',
    marginHorizontal: '',
    pageNumbersEnabled: Boolean(DEFAULTS.pageNumbersEnabled),
    pageStartFrom: '',
};
/* ==========================================================================
   Small presentational helpers
   ========================================================================== */
function SectionLabel({ children }) {
    return (React.createElement("h3", { className: "text-[11px] font-semibold uppercase tracking-wider text-fg-muted mt-6 mb-2 first:mt-0" }, children));
}
function ControlField({ label, hint, children }) {
    return (React.createElement("label", { className: "block mb-4" },
        React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, label),
        children,
        hint ? React.createElement("span", { className: "block text-[11px] text-fg-muted opacity-70 mt-1" }, hint) : null));
}
// Colors/border/radius/padding/focus outline all come from component-kit.css's
// input[type="text"], input[type="number"] rule — only layout (w-full) and
// what the kit leaves unset (font-size, placeholder color) are added here.
function TextInput({ value, onChange, placeholder, type = 'text', inputMode }) {
    return (React.createElement("input", { type: type, inputMode: inputMode, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: "w-full text-sm placeholder-fg-muted" }));
}
// <select> isn't one of component-kit.css's covered elements — styled here
// (in styles.css, see the "select" rule) to match its input look using the
// same --ui-* tokens, rather than inventing a different visual language.
function SelectInput({ value, onChange, children }) {
    return (React.createElement("select", { value: value, onChange: (e) => onChange(e.target.value), className: "w-full text-sm" }, children));
}
/* ==========================================================================
   Font combobox — searchable, supports typing to filter, plus a button
   that loads the user's local system fonts via window.queryLocalFonts()
   ========================================================================== */
function FontCombobox({ fontOptions, setFontOptions, value, onChange }) {
    const [query, setQuery] = useState(value || '');
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', message }
    const [loadingFonts, setLoadingFonts] = useState(false);
    const containerRef = useRef(null);
    useEffect(() => {
        setQuery(value || '');
    }, [value]);
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery(value || '');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q)
            return fontOptions;
        return fontOptions.filter((f) => f.toLowerCase().includes(q));
    }, [fontOptions, query]);
    function selectFont(font) {
        onChange(font);
        setQuery(font);
        setOpen(false);
    }
    async function handleLoadLocalFonts() {
        setStatus(null);
        if (!('queryLocalFonts' in window)) {
            setStatus({
                type: 'error',
                message: 'Local Font Access is not supported in this browser. Try Chrome or Edge 103+ (over HTTPS or localhost).',
            });
            return;
        }
        setLoadingFonts(true);
        try {
            const availableFonts = await window.queryLocalFonts();
            const families = Array.from(new Set(availableFonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b));
            setFontOptions((prev) => Array.from(new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
            setStatus({ type: 'success', message: `Loaded ${families.length} local system fonts.` });
        }
        catch (err) {
            const denied = err && (err.name === 'NotAllowedError' || /permission/i.test(err.message || ''));
            setStatus({
                type: 'error',
                message: denied
                    ? 'Permission to read local fonts was denied.'
                    : 'Could not load local fonts: ' + (err && err.message ? err.message : String(err)),
            });
        }
        finally {
            setLoadingFonts(false);
        }
    }
    return (React.createElement("div", { ref: containerRef, className: "relative" },
        React.createElement("div", { className: "relative" },
            React.createElement("input", { type: "text", value: query, onChange: (e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }, onFocus: () => setOpen(true), placeholder: "Search fonts\u2026", className: "w-full text-sm pr-8 placeholder-fg-muted" }),
            React.createElement("button", { type: "button", onClick: () => setOpen((o) => !o), 
                // bg-transparent/border-0/p-0 neutralize component-kit.css's
                // plain `button` rule (bordered/padded by default) — this is a
                // bare icon toggle overlapping the input, not a kit-style button.
                className: "absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg bg-transparent border-0 p-0", "aria-label": "Toggle font list" },
                React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 20 20", fill: "currentColor" },
                    React.createElement("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z", clipRule: "evenodd" })))),
        open ? (React.createElement("div", { className: "absolute z-20 mt-1 w-full rounded-md border border-line bg-ink-card shadow-lg" },
            React.createElement("ul", { className: "md2ebook-combobox-list py-1" }, filtered.length === 0 ? (React.createElement("li", { className: "px-3 py-2 text-sm text-fg-muted" },
                "No fonts match \"",
                query,
                "\"")) : (filtered.map((font) => (React.createElement("li", { key: font },
                React.createElement("button", { type: "button", onClick: () => selectFont(font), style: { fontFamily: `'${font}', sans-serif` }, 
                    // border-0 neutralizes component-kit.css's plain
                    // `button` rule — these are listbox rows, not
                    // kit-style buttons; bg-transparent/hover:bg-ink-alt
                    // below still give the usual row-hover feedback.
                    className: 'w-full text-left px-3 py-1.5 text-sm border-0 hover:bg-ink-alt ' +
                        (font === value ? 'bg-ink-alt text-accent font-medium' : 'bg-transparent text-fg font-normal') }, font)))))))) : null,
        React.createElement("div", { className: "mt-2 flex items-center gap-2" },
            React.createElement("button", { type: "button", onClick: handleLoadLocalFonts, disabled: loadingFonts, className: "inline-flex items-center gap-1.5 disabled:opacity-50" },
                loadingFonts ? (React.createElement("svg", { className: "md2ebook-spinner", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none" },
                    React.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", opacity: "0.25" }),
                    React.createElement("path", { d: "M22 12a10 10 0 0 0-10-10", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" }))) : (React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 20 20", fill: "currentColor" },
                    React.createElement("path", { d: "M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" }))),
                "Load Local System Fonts")),
        status ? (React.createElement("p", { className: 'mt-1.5 text-[11px] ' + (status.type === 'error' ? 'text-red-400' : 'text-success') }, status.message)) : null));
}
/* ==========================================================================
   Left sidebar — Editor tab + Typography Controls tab
   ========================================================================== */
function Sidebar({ activeTab, setActiveTab, markdown, setMarkdown, config, updateConfig, applyConfig, fontOptions, setFontOptions, }) {
    const configFileInputRef = useRef(null);
    const editorTextareaRef = useRef(null);
    const documentFileInputRef = useRef(null);
    const [configFilename, setConfigFilename] = useState('config.json');
    const [configStatus, setConfigStatus] = useState(null); // { type: 'success'|'error', message }
    const [docStatus, setDocStatus] = useState(null); // { type: 'success'|'error', message }
    // Separate from CONFIG_PICKER_ID below — Upload/Save remember their
    // own last-used folder (your documents), not the config picker's.
    const DOCUMENT_PICKER_ID = 'md2ebook-document';
    // Open and Save both pass this same `id` to the File System Access
    // API pickers below. Neither this app nor any web page can silently
    // point a native file dialog at an arbitrary folder on disk (like a
    // "config" folder next to index.html) — that's deliberately blocked
    // by the browser for security, and requires the user to navigate
    // there themselves at least once. What the browser *does* do is
    // remember, per `id`, whatever folder was last used with that id —
    // so as long as Open and Save share the same id, pointing either one
    // at a "config" folder next to the app (once) makes BOTH of them
    // default there automatically from then on, including in future
    // sessions. See appFolderHint below, which surfaces that path so the
    // user knows where to navigate the first time.
    const CONFIG_PICKER_ID = 'md2ebook-config';
    // Best-effort human-readable path to a "config" folder next to
    // index.html, shown as a hint only (see CONFIG_PICKER_ID above) —
    // never used programmatically, since nothing here can act on it.
    const appFolderHint = useMemo(() => {
        try {
            if (window.location.protocol !== 'file:')
                return null;
            const path = decodeURIComponent(window.location.pathname);
            const slash = path.lastIndexOf('/');
            let dir = slash > -1 ? path.slice(0, slash) : path;
            // Windows paths arrive as /C:/Users/... — drop the leading slash
            // so it reads as a normal Windows path, not a Unix-looking one.
            if (/^\/[A-Za-z]:/.test(dir))
                dir = dir.slice(1);
            return dir ? dir + '/config' : null;
        }
        catch (e) {
            return null;
        }
    }, []);
    function loadConfigFromFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    throw new Error('That file is not a config object.');
                }
                applyConfig(parsed);
                setConfigStatus({ type: 'success', message: `Loaded "${file.name}".` });
            }
            catch (err) {
                setConfigStatus({
                    type: 'error',
                    message: 'Could not read that file: ' + (err && err.message ? err.message : String(err)),
                });
            }
        };
        reader.onerror = () => {
            setConfigStatus({ type: 'error', message: 'Could not read that file.' });
        };
        reader.readAsText(file);
    }
    function handleConfigFileSelected(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = ''; // reset so re-selecting the same file still fires onChange
        if (!file)
            return;
        loadConfigFromFile(file);
    }
    // Opens a real OS "Open" dialog (via the same File System Access API
    // used by Save below), instead of the hidden <input type="file">, so
    // it can share Save's remembered folder — see CONFIG_PICKER_ID above.
    // Falls back to the old hidden-input click for browsers that don't
    // support this API (Firefox, Safari), or if the picker itself fails.
    async function handleOpenConfigClick() {
        setConfigStatus(null);
        if (typeof window.showOpenFilePicker !== 'function') {
            if (configFileInputRef.current)
                configFileInputRef.current.click();
            return;
        }
        try {
            const handles = await window.showOpenFilePicker({
                id: CONFIG_PICKER_ID,
                multiple: false,
                types: [
                    {
                        description: 'JSON config file',
                        accept: { 'application/json': ['.json'] },
                    },
                ],
            });
            const file = await handles[0].getFile();
            loadConfigFromFile(file);
        }
        catch (err) {
            if (err && err.name === 'AbortError')
                return;
            if (configFileInputRef.current)
                configFileInputRef.current.click();
        }
    }
    // Falls back to a forced browser download — the old behavior — only
    // for browsers that don't support the native Save As dialog below
    // (e.g. Firefox, Safari) or if that dialog itself fails unexpectedly.
    function downloadConfigFallback(json, filename) {
        try {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setConfigStatus({
                type: 'success',
                message: `Downloaded "${filename}" (this browser doesn't support a Save As dialog).`,
            });
        }
        catch (err) {
            setConfigStatus({ type: 'error', message: 'Could not save the config file.' });
        }
    }
    // Opens a real OS "Save As" dialog (via the File System Access API) so
    // the file can be written into — or overwrite one in — any existing
    // folder on disk, instead of always forcing a browser download into
    // the Downloads folder. Confirmed working from a page opened directly
    // as file:// (no local web server): Chrome treats file:// as a secure
    // context, and this API only additionally requires the call to happen
    // synchronously off a real user click, which it does here. Older/other
    // browsers (Firefox, Safari) don't implement this API at all, so this
    // still checks for it and falls back to the old download behavior.
    async function handleSaveConfig() {
        setConfigStatus(null);
        const json = JSON.stringify(config, null, 2);
        const base = (configFilename || 'config').trim() || 'config';
        const filename = /\.json$/i.test(base) ? base : base + '.json';
        if (typeof window.showSaveFilePicker !== 'function') {
            downloadConfigFallback(json, filename);
            return;
        }
        try {
            const handle = await window.showSaveFilePicker({
                id: CONFIG_PICKER_ID,
                suggestedName: filename,
                types: [
                    {
                        description: 'JSON config file',
                        accept: { 'application/json': ['.json'] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            setConfigStatus({ type: 'success', message: `Saved "${handle.name}".` });
        }
        catch (err) {
            if (err && err.name === 'AbortError') {
                // The user closed the Save As dialog without picking a file —
                // not an error, just leave the status area as-is.
                return;
            }
            downloadConfigFallback(json, filename);
        }
    }
    // Inserts a standalone `\pagebreak` line at the caret (or replaces the
    // current selection) in the Markdown editor — see PAGE_BREAK_MARKER /
    // applyPageBreakMarkers() in pdfGenerator.js for how that line turns
    // into a real forced page break in both the preview and the export.
    // The marker has to land on its own line, blank lines on both sides,
    // regardless of where the caret happens to be (start of doc, mid
    // paragraph, end of doc, already-blank surroundings) — the padding
    // logic below only adds what's actually missing on each side, so it
    // never piles up extra blank lines when some are already there.
    function handleInsertPageBreak() {
        const el = editorTextareaRef.current;
        const start = el ? el.selectionStart : markdown.length;
        const end = el ? el.selectionEnd : markdown.length;
        const before = markdown.slice(0, start);
        const after = markdown.slice(end);
        const prefix = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        const suffix = after.length === 0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
        const insertion = prefix + '\\pagebreak' + suffix;
        const caret = (before + insertion).length;
        // flushSync (not requestAnimationFrame) forces this state update to
        // commit to the real DOM before the restore call below runs. The
        // textarea's value is controlled by React state, and browsers reset
        // a textarea's cursor to the end whenever its value is reassigned —
        // requestAnimationFrame doesn't reliably run *after* React's commit,
        // so the restore could fire while the DOM still had the old
        // (shorter) text, get clamped short, and then get stomped a moment
        // later when React's real commit landed and reset the cursor to the
        // end of the document. flushSync removes the race entirely.
        ReactDOM.flushSync(() => {
            setMarkdown(before + insertion + after);
        });
        if (editorTextareaRef.current) {
            editorTextareaRef.current.focus();
            editorTextareaRef.current.setSelectionRange(caret, caret);
        }
    }
    // Reads a File (from either the native picker or the hidden <input>
    // fallback below) and, based on its extension, converts it to
    // Markdown and replaces the editor's contents outright — an import,
    // not an insert. .md/.markdown/.txt need no conversion; the other
    // formats are handled by pdfGenerator.js (window.MD2eBook), which
    // isolates the actual per-format parsing/conversion logic from this
    // UI layer the same way it already owns HTML generation/PDF export.
    async function handleImportFile(file) {
        setDocStatus(null);
        const name = (file && file.name) || 'document';
        const dot = name.lastIndexOf('.');
        const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
        try {
            let converted;
            if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
                converted = await file.text();
            }
            else if (ext === 'muse') {
                converted = window.MD2eBook.convertMuseToMarkdown(await file.text());
            }
            else if (ext === 'docx') {
                converted = await window.MD2eBook.convertDocxToMarkdown(await file.arrayBuffer());
            }
            else if (ext === 'epub') {
                converted = await window.MD2eBook.convertEpubToMarkdown(await file.arrayBuffer());
            }
            else {
                throw new Error(`Unsupported file type ".${ext || '?'}" — supported: .md, .txt, .muse, .docx, .epub.`);
            }
            // Same flushSync reasoning as handleInsertPageBreak above — forces
            // the new (much longer) document to actually be in the DOM before
            // this scrolls/positions the textarea against it.
            ReactDOM.flushSync(() => {
                setMarkdown(converted);
            });
            if (editorTextareaRef.current) {
                editorTextareaRef.current.focus();
                editorTextareaRef.current.setSelectionRange(0, 0);
                editorTextareaRef.current.scrollTop = 0;
            }
            setDocStatus({ type: 'success', message: `Imported "${name}", replacing the editor's contents.` });
        }
        catch (err) {
            setDocStatus({
                type: 'error',
                message: 'Could not import that file: ' + (err && err.message ? err.message : String(err)),
            });
        }
    }
    function handleDocumentFileSelected(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = ''; // reset so re-selecting the same file still fires onChange
        if (!file)
            return;
        handleImportFile(file);
    }
    // Same native "Open" dialog approach as handleOpenConfigClick above —
    // shares DOCUMENT_PICKER_ID with handleSaveMarkdown below so Upload
    // and Save remember the same last-used folder, separate from the
    // config file picker's own remembered folder.
    async function handleImportClick() {
        setDocStatus(null);
        if (typeof window.showOpenFilePicker !== 'function') {
            if (documentFileInputRef.current)
                documentFileInputRef.current.click();
            return;
        }
        try {
            const handles = await window.showOpenFilePicker({
                id: DOCUMENT_PICKER_ID,
                multiple: false,
                types: [
                    {
                        description: 'Markdown, Word, EPUB, or Muse document',
                        accept: {
                            'text/markdown': ['.md', '.markdown'],
                            'text/plain': ['.txt'],
                            'text/x-muse': ['.muse'],
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                            'application/epub+zip': ['.epub'],
                        },
                    },
                ],
            });
            const file = await handles[0].getFile();
            await handleImportFile(file);
        }
        catch (err) {
            if (err && err.name === 'AbortError')
                return;
            if (documentFileInputRef.current)
                documentFileInputRef.current.click();
        }
    }
    // Falls back to a forced browser download for browsers without the
    // native Save As dialog — same pattern as downloadConfigFallback.
    function downloadMarkdownFallback(text, filename) {
        try {
            const blob = new Blob([text], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setDocStatus({
                type: 'success',
                message: `Downloaded "${filename}" (this browser doesn't support a Save As dialog).`,
            });
        }
        catch (err) {
            setDocStatus({ type: 'error', message: 'Could not save the Markdown file.' });
        }
    }
    // Saves the editor's current Markdown as a .md file via the native
    // Save As dialog — a source-text round-trip, separate from PDF export
    // and separate from Save… in the Typography tab (which saves the
    // typography *config*, not the document content).
    async function handleSaveMarkdown() {
        setDocStatus(null);
        const text = markdown || '';
        const filename = 'document.md';
        if (typeof window.showSaveFilePicker !== 'function') {
            downloadMarkdownFallback(text, filename);
            return;
        }
        try {
            const handle = await window.showSaveFilePicker({
                id: DOCUMENT_PICKER_ID,
                suggestedName: filename,
                types: [
                    {
                        description: 'Markdown file',
                        accept: { 'text/markdown': ['.md'] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(text);
            await writable.close();
            setDocStatus({ type: 'success', message: `Saved "${handle.name}".` });
        }
        catch (err) {
            if (err && err.name === 'AbortError')
                return;
            downloadMarkdownFallback(text, filename);
        }
    }
    // Copies the raw Markdown source (not rendered HTML) to the
    // clipboard. navigator.clipboard needs a secure context, which
    // file:// already is here (same reason the File System Access API
    // works — see CONFIG_PICKER_ID above) — but an execCommand('copy')
    // fallback covers any browser/context where it's still unavailable.
    async function handleCopyAll() {
        setDocStatus(null);
        const text = markdown || '';
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            }
            else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (!ok)
                    throw new Error('The browser blocked the copy.');
            }
            setDocStatus({ type: 'success', message: 'Copied the Markdown source to the clipboard.' });
        }
        catch (err) {
            setDocStatus({
                type: 'error',
                message: 'Could not copy to the clipboard: ' + (err && err.message ? err.message : String(err)),
            });
        }
    }
    return (React.createElement("aside", { className: "md2ebook-sidebar" },
        React.createElement("div", { className: "tabbar" },
            React.createElement("button", { type: "button", onClick: () => setActiveTab('editor'), className: 'tab' + (activeTab === 'editor' ? ' active' : '') }, "Editor"),
            React.createElement("button", { type: "button", onClick: () => setActiveTab('typography'), className: 'tab' + (activeTab === 'typography' ? ' active' : '') }, "Typography")),
        React.createElement("div", { className: "md2ebook-sidebar-content" }, activeTab === 'editor' ? (React.createElement("div", { className: "h-full flex flex-col p-3" },
            React.createElement("div", { className: "flex flex-wrap items-center justify-end gap-2 mb-2" },
                React.createElement("button", { type: "button", onClick: handleImportClick, className: "log-btn", title: "Import a Markdown, Word (.docx), EPUB, or Muse (.muse) file \u2014 replaces the editor's contents" }, "Upload\u2026"),
                React.createElement("button", { type: "button", onClick: handleSaveMarkdown, className: "log-btn", title: "Save the editor's Markdown as a .md file" }, "Save\u2026"),
                React.createElement("button", { type: "button", onClick: handleCopyAll, className: "log-btn", title: "Copy the Markdown source to the clipboard" }, "Copy All"),
                React.createElement("button", { type: "button", onClick: handleInsertPageBreak, className: "log-btn", title: "Insert a manual page break at the cursor (\\pagebreak)" }, "+ Page Break"),
                React.createElement("input", { ref: documentFileInputRef, type: "file", accept: ".md,.markdown,.txt,.muse,.docx,.epub", onChange: handleDocumentFileSelected, className: "hidden" })),
            docStatus ? (React.createElement("p", { className: 'mb-2 text-[11px] ' + (docStatus.type === 'error' ? 'text-red-400' : 'text-success') }, docStatus.message)) : null,
            React.createElement("textarea", { ref: editorTextareaRef, className: "md2ebook-editor-textarea flex-1 w-full min-h-[60vh] rounded-md border border-line\n                         bg-ink p-3 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent", value: markdown, onChange: (e) => setMarkdown(e.target.value), spellCheck: false, placeholder: "# Start writing your Markdown here\u2026" }))) : (React.createElement("div", { className: "p-4" },
            React.createElement(SectionLabel, null, "Saved Config Files"),
            React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
                React.createElement("button", { type: "button", onClick: handleOpenConfigClick, className: "log-btn" }, "Open\u2026"),
                React.createElement("button", { type: "button", onClick: handleSaveConfig, className: "log-btn" }, "Save\u2026"),
                React.createElement("input", { type: "text", value: configFilename, onChange: (e) => setConfigFilename(e.target.value), placeholder: "config.json", className: "min-w-0 flex-1 text-[11px] placeholder-fg-muted" }),
                React.createElement("input", { ref: configFileInputRef, type: "file", accept: "application/json,.json", onChange: handleConfigFileSelected, className: "hidden" })),
            configStatus ? (React.createElement("p", { className: 'mb-3 text-[11px] ' + (configStatus.type === 'error' ? 'text-red-400' : 'text-success') }, configStatus.message)) : (React.createElement("p", { className: "mb-3 text-[11px] leading-relaxed text-fg-muted opacity-70" },
                "Open a previously saved settings file, or save the settings below as a new one.",
                appFolderHint ? (React.createElement(React.Fragment, null,
                    ' ',
                    "A browser can't be pointed at a folder automatically \u2014 navigate Open/Save to",
                    ' ',
                    React.createElement("code", { className: "text-[10px] not-italic" }, appFolderHint),
                    " once (creating it if it doesn't exist yet), and both will default there from then on.")) : null)),
            React.createElement(SectionLabel, null, "Typeface"),
            React.createElement(ControlField, { label: "Font Family" },
                React.createElement(FontCombobox, { fontOptions: fontOptions, setFontOptions: setFontOptions, value: config.fontFamily, onChange: (v) => updateConfig('fontFamily', v) })),
            React.createElement(SectionLabel, null, "Page"),
            React.createElement(ControlField, { label: "Paper Size" },
                React.createElement(SelectInput, { value: config.paperSize, onChange: (v) => updateConfig('paperSize', v) }, PAPER_SIZE_OPTIONS.map((p) => (React.createElement("option", { key: p.key, value: p.key }, p.label))))),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement(ControlField, { label: "Margin \u2014 Vertical (in)", hint: `Default: ${DEFAULTS.marginVerticalIn}in` },
                    React.createElement(TextInput, { value: config.marginVertical, onChange: (v) => updateConfig('marginVertical', v), placeholder: String(DEFAULTS.marginVerticalIn), inputMode: "decimal" })),
                React.createElement(ControlField, { label: "Margin \u2014 Horizontal (in)", hint: `Default: ${DEFAULTS.marginHorizontalIn}in` },
                    React.createElement(TextInput, { value: config.marginHorizontal, onChange: (v) => updateConfig('marginHorizontal', v), placeholder: String(DEFAULTS.marginHorizontalIn), inputMode: "decimal" }))),
            React.createElement(SectionLabel, null, "Body Text"),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement(ControlField, { label: "Body Font Size (px)", hint: `Default: ${DEFAULTS.fontSize}px` },
                    React.createElement(TextInput, { value: config.fontSize, onChange: (v) => updateConfig('fontSize', v), placeholder: String(DEFAULTS.fontSize), inputMode: "decimal" })),
                React.createElement(ControlField, { label: "Line Spacing", hint: `Default: ${DEFAULTS.lineHeight}` },
                    React.createElement(TextInput, { value: config.lineHeight, onChange: (v) => updateConfig('lineHeight', v), placeholder: String(DEFAULTS.lineHeight), inputMode: "decimal" }))),
            React.createElement(ControlField, { label: "Paragraph Spacing", hint: `Default: ${DEFAULTS.paragraphSpacing} (accepts px, rem, em…)` },
                React.createElement(TextInput, { value: config.paragraphSpacing, onChange: (v) => updateConfig('paragraphSpacing', v), placeholder: DEFAULTS.paragraphSpacing })),
            React.createElement(ControlField, { label: "Base Font Weight (Regular)", hint: `Default: ${DEFAULTS.baseWeight}` },
                React.createElement(SelectInput, { value: config.baseWeight, onChange: (v) => updateConfig('baseWeight', v) },
                    React.createElement("option", { value: "300" }, "300 \u2014 Light"),
                    React.createElement("option", { value: "400" }, "400 \u2014 Regular"),
                    React.createElement("option", { value: "500" }, "500 \u2014 Medium"))),
            React.createElement(ControlField, { label: "Bold Text Weight (Strong tags)", hint: `Default: ${DEFAULTS.boldWeight}` },
                React.createElement(SelectInput, { value: config.boldWeight, onChange: (v) => updateConfig('boldWeight', v) }, BOLD_WEIGHT_OPTIONS.map((w) => (React.createElement("option", { key: w, value: w }, w))))),
            React.createElement(SectionLabel, null, "Headings"),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement(ControlField, { label: "H1 Size (px)", hint: `Default: ${DEFAULTS.h1Size}px` },
                    React.createElement(TextInput, { value: config.h1Size, onChange: (v) => updateConfig('h1Size', v), placeholder: String(DEFAULTS.h1Size), inputMode: "decimal" })),
                React.createElement(ControlField, { label: "H1 Weight", hint: `Default: ${DEFAULTS.h1Weight}` },
                    React.createElement(SelectInput, { value: config.h1Weight, onChange: (v) => updateConfig('h1Weight', v) }, BOLD_WEIGHT_OPTIONS.map((w) => (React.createElement("option", { key: w, value: w }, w)))))),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement(ControlField, { label: "H2 Size (px)", hint: `Default: ${DEFAULTS.h2Size}px` },
                    React.createElement(TextInput, { value: config.h2Size, onChange: (v) => updateConfig('h2Size', v), placeholder: String(DEFAULTS.h2Size), inputMode: "decimal" })),
                React.createElement(ControlField, { label: "H2 Weight", hint: `Default: ${DEFAULTS.h2Weight}` },
                    React.createElement(SelectInput, { value: config.h2Weight, onChange: (v) => updateConfig('h2Weight', v) }, BOLD_WEIGHT_OPTIONS.map((w) => (React.createElement("option", { key: w, value: w }, w)))))),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement(ControlField, { label: "H3 Size (px)", hint: `Default: ${DEFAULTS.h3Size}px` },
                    React.createElement(TextInput, { value: config.h3Size, onChange: (v) => updateConfig('h3Size', v), placeholder: String(DEFAULTS.h3Size), inputMode: "decimal" })),
                React.createElement(ControlField, { label: "H3 Weight", hint: `Default: ${DEFAULTS.h3Weight}` },
                    React.createElement(SelectInput, { value: config.h3Weight, onChange: (v) => updateConfig('h3Weight', v) }, BOLD_WEIGHT_OPTIONS.map((w) => (React.createElement("option", { key: w, value: w }, w)))))),
            React.createElement(SectionLabel, null, "Page Numbers"),
            React.createElement("div", { className: "toggle-row mb-3" },
                React.createElement("label", { className: "toggle-switch" },
                    React.createElement("input", { type: "checkbox", checked: config.pageNumbersEnabled, onChange: (e) => updateConfig('pageNumbersEnabled', e.target.checked) }),
                    React.createElement("span", { className: "toggle-slider" })),
                React.createElement("div", { className: "toggle-row-text" },
                    React.createElement("p", { style: { margin: 0, color: 'var(--ui-fg)', fontSize: '13px' } }, "Show page number on every page"))),
            config.pageNumbersEnabled ? (React.createElement(ControlField, { label: "Page Start From", hint: `Default: ${DEFAULTS.pageStartFrom}` },
                React.createElement(TextInput, { value: config.pageStartFrom, onChange: (v) => updateConfig('pageStartFrom', v), placeholder: String(DEFAULTS.pageStartFrom), inputMode: "numeric" }))) : null)))));
}
/* ==========================================================================
   Preview canvas — scaled live preview of the generated document,
   rendered via an isolated <iframe srcDoc="..."> so its styling never
   leaks into (or is contaminated by) the app's own Tailwind styles.

   The iframe's height is measured from its actual rendered content
   (not hard-locked to one page's worth of pixels), so a document that
   runs longer than one physical page still fully scrolls via the
   surrounding preview pane's own scrollbar, with no separate/nested
   scrollbar trapped inside the iframe.
   ========================================================================== */
function PreviewCanvas({ markdown, config }) {
    const outerRef = useRef(null);
    const iframeRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [contentHeightPx, setContentHeightPx] = useState(0);
    const [pageCount, setPageCount] = useState(null);
    const [paginating, setPaginating] = useState(true);
    const paper = window.MD2eBook.PAPER_SIZES[config.paperSize] || window.MD2eBook.PAPER_SIZES.a4;
    const DPI = 96;
    const pageWidthPx = Math.round(paper.widthIn * DPI);
    const minPageHeightPx = Math.round(paper.heightIn * DPI);
    const renderedHeightPx = Math.max(minPageHeightPx, contentHeightPx);
    const srcDoc = useMemo(() => {
        return window.MD2eBook.renderHtmlDocument(markdown, config);
    }, [markdown, config]);
    // The previous document's pagination result goes stale the instant a
    // new srcDoc is generated — re-arm the "paginating…" indicator so the
    // caption doesn't show a stale page count while the new one reflows.
    useEffect(() => {
        setPaginating(true);
        setPageCount(null);
    }, [srcDoc]);
    // Recompute the horizontal scale factor (page width -> available pane width).
    useEffect(() => {
        const el = outerRef.current;
        if (!el)
            return undefined;
        function recompute() {
            const availableWidth = el.clientWidth - 48; // matches wrapper horizontal padding
            const next = Math.min(1, Math.max(0.15, availableWidth / pageWidthPx));
            setScale(next);
        }
        recompute();
        let observer;
        if ('ResizeObserver' in window) {
            observer = new ResizeObserver(recompute);
            observer.observe(el);
        }
        else {
            window.addEventListener('resize', recompute);
        }
        return () => {
            if (observer)
                observer.disconnect();
            else
                window.removeEventListener('resize', recompute);
        };
    }, [pageWidthPx]);
    // The preview iframe paginates *itself* on screen via Paged.js (see
    // the long comment on renderHtmlDocument in pdfGenerator.js) — once it
    // finishes chunking the content into page boxes, its own <script>
    // posts the final rendered height and page count back here via
    // window.postMessage. We can't just reach into frame.contentDocument
    // the way the old single-page-flow preview did, because that would
    // require the allow-same-origin sandbox flag alongside allow-scripts,
    // and that specific combination would let a script smuggled in via
    // pasted raw HTML (marked.js passes raw HTML through by default)
    // escape the iframe and manipulate this app directly. postMessage
    // keeps the iframe's contents fully confined to their own opaque
    // origin regardless of what's inside them.
    useEffect(() => {
        function handleMessage(event) {
            const data = event.data;
            if (!data || data.source !== 'md2ebook-pagedjs')
                return;
            if (iframeRef.current && event.source !== iframeRef.current.contentWindow)
                return;
            const measuredHeight = Number(data.height);
            if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
                setContentHeightPx(measuredHeight);
            }
            const measuredPages = Number(data.pageCount);
            if (Number.isFinite(measuredPages) && measuredPages > 0) {
                setPageCount(measuredPages);
                setPaginating(false);
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    const [currentPage, setCurrentPage] = useState(1);
    // Tracks which page is currently in view for the status bar, purely
    // from scroll position — every Paged.js page box is sized to exactly
    // one physical page (paper.heightIn) plus the fixed gap between pages
    // (see the .pagedjs_page rule in pdfGenerator.js), both scaled down by
    // the same factor the preview itself is scaled by, so dividing the
    // scroll position by one page-with-gap's scaled height gives which
    // page is centered in the visible viewport.
    useEffect(() => {
        const el = outerRef.current;
        if (!el)
            return undefined;
        const PAGE_GAP_PX = 24; // must match .pagedjs_page's margin-bottom in pdfGenerator.js
        let ticking = false;
        function computeCurrentPage() {
            ticking = false;
            if (!pageCount || pageCount <= 1) {
                setCurrentPage(1);
                return;
            }
            const pageStridePx = (minPageHeightPx + PAGE_GAP_PX) * scale;
            if (!(pageStridePx > 0))
                return;
            const viewportCenter = el.scrollTop + el.clientHeight / 2;
            const estimated = Math.floor(viewportCenter / pageStridePx) + 1;
            setCurrentPage(Math.min(pageCount, Math.max(1, estimated)));
        }
        function handleScroll() {
            if (ticking)
                return;
            ticking = true;
            window.requestAnimationFrame(computeCurrentPage);
        }
        computeCurrentPage();
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [pageCount, scale, minPageHeightPx]);
    return (React.createElement("div", { ref: outerRef, className: "md2ebook-preview-pane" },
        React.createElement("div", { className: "md2ebook-canvas-wrapper" },
            React.createElement("div", { className: "md2ebook-canvas-scale-box", style: { width: pageWidthPx * scale, height: renderedHeightPx * scale } },
                React.createElement("div", { className: "md2ebook-page-shadow", style: {
                        width: pageWidthPx,
                        height: renderedHeightPx,
                        transform: `scale(${scale})`,
                    } },
                    React.createElement("iframe", { ref: iframeRef, title: "Md to PDF Converter live preview", className: "md2ebook-page-iframe", srcDoc: srcDoc, width: pageWidthPx, height: renderedHeightPx, 
                        // allow-scripts (not allow-same-origin) is deliberate: Paged.js
                        // needs to run for real on-screen pagination, but combining
                        // allow-scripts with allow-same-origin would give this
                        // document the app's own origin, letting a script smuggled in
                        // via pasted raw HTML reach back out and manipulate the app
                        // itself. Left as scripts-only, this iframe keeps its own
                        // opaque origin — anything running inside it can only talk
                        // back to us via postMessage (see the message listener above),
                        // never touch this page directly. The export/PDF path is a
                        // completely separate, still fully non-scripted iframe (see
                        // exportToPdf in pdfGenerator.js), so it's unaffected either way.
                        sandbox: "allow-scripts" })))),
        React.createElement("div", { className: "md2ebook-no-print md2ebook-preview-statusbar" },
            paper.label,
            " \u00B7 ",
            Math.round(scale * 100),
            "% preview scale",
            paginating
                ? ' · paginating…'
                : pageCount
                    ? ` · Page ${currentPage} of ${pageCount}`
                    : '')));
}
/* ==========================================================================
   Header
   ========================================================================== */
function Header({ onLoadSample, onClear, onExport, isExporting, onSendToZineArranger, isSendingToArranger }) {
    // .topbar and its children come straight from component-kit.css — see
    // component-kit-demo.html's "Top menu bar" section, which this markup
    // matches structurally so the kit's CSS applies with no overrides
    // needed. md2ebook-header/md2ebook-no-print are this app's own
    // functional classes (flex sizing in the app's column layout, and
    // print-media hiding) layered on top, not competing visual styling.
    return (React.createElement("header", { className: "md2ebook-header md2ebook-no-print topbar" },
        React.createElement("div", { className: "topbar-brand" },
            React.createElement("div", { className: "topbar-logo" }, "Md"),
            React.createElement("div", { className: "topbar-brand-text" },
                React.createElement("div", { className: "topbar-title" }, "Md to PDF Converter"),
                React.createElement("div", { className: "topbar-subtitle" }, "Markdown \u2192 Publication-ready PDF"))),
        React.createElement("div", { className: "topbar-actions" },
            React.createElement("button", { type: "button", className: "log-btn", onClick: onLoadSample }, "Load Sample Markdown"),
            React.createElement("button", { type: "button", className: "log-btn", onClick: onClear }, "Clear Editor"),
            React.createElement("button", { type: "button", className: "log-btn", onClick: onSendToZineArranger, disabled: isSendingToArranger, title: "Exports the current document and opens it directly in ZineArranger \u2014 no manual save/reopen step" }, isSendingToArranger ? 'Sending\u2026' : 'Send to ZineArranger'),
            React.createElement("button", { type: "button", onClick: onExport, disabled: isExporting, title: "Opens your browser's print dialog \u2014 choose \"Save as PDF\" as the destination", className: "btn-solid inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" },
                isExporting ? (React.createElement("svg", { className: "md2ebook-spinner", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none" },
                    React.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", opacity: "0.3" }),
                    React.createElement("path", { d: "M22 12a10 10 0 0 0-10-10", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" }))) : (React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 20 20", fill: "currentColor" },
                    React.createElement("path", { fillRule: "evenodd", d: "M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0118 8.653v4.097A2.25 2.25 0 0115.75 15h-.241l.305 2.14A.75.75 0 0115.023 18H4.977a.75.75 0 01-.79-.86L4.492 15H4.25A2.25 2.25 0 012 12.75V8.653c0-1.082.784-2.005 1.874-2.198.374-.056.75-.107 1.126-.153V2.75zM6.5 6.11c1.649-.176 3.319-.266 5-.266s3.351.09 5 .266V2.75a.25.25 0 00-.25-.25h-6.5a.25.25 0 00-.25-.25v3.61zm5.5 6.14v-1.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.5a.75.75 0 00.75-.75z", clipRule: "evenodd" }))),
                isExporting ? 'Opening Print Dialog…' : 'Download PDF eBook'))));
}
/* ==========================================================================
   Root App component
   ========================================================================== */
function App() {
    const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
    const [config, setConfig] = useState(INITIAL_CONFIG);
    const [activeTab, setActiveTab] = useState('editor');
    const [fontOptions, setFontOptions] = useState(DEFAULT_FONT_OPTIONS);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(null);
    const [isSendingToArranger, setIsSendingToArranger] = useState(false);
    const updateConfig = useCallback((key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    }, []);
    // Merges a config object loaded from a JSON file (via Sidebar's "Open…"
    // button) into the current settings. Only known fields are copied over
    // — anything extra/unrecognized in the file is ignored rather than
    // polluting state — and each value is coerced to the type its control
    // expects (every text/select field is a string; pageNumbersEnabled is
    // a real boolean for the checkbox), so a hand-edited file with, say, a
    // bare JSON number instead of a string still works correctly.
    const applyConfig = useCallback((loaded) => {
        setConfig((prev) => {
            const next = { ...prev };
            Object.keys(prev).forEach((key) => {
                if (!Object.prototype.hasOwnProperty.call(loaded, key))
                    return;
                const value = loaded[key];
                if (key === 'pageNumbersEnabled') {
                    next[key] = Boolean(value);
                }
                else {
                    next[key] = value === null || value === undefined ? '' : String(value);
                }
            });
            return next;
        });
    }, []);
    function handleLoadSample() {
        setMarkdown(SAMPLE_MARKDOWN);
    }
    function handleClear() {
        setMarkdown('');
    }
    function deriveFilename(md) {
        const match = /^#\s+(.+)$/m.exec(md || '');
        if (!match)
            return 'md-to-pdf-converter.pdf';
        const slug = match[1]
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 60);
        return (slug || 'md2ebook') + '.pdf';
    }
    async function handleExport() {
        setExportError(null);
        setIsExporting(true);
        try {
            await window.MD2eBook.exportToPdf(markdown, { ...config, filename: deriveFilename(markdown) });
        }
        catch (err) {
            setExportError((err && err.message) || 'Something went wrong while opening the print dialog.');
        }
        finally {
            setIsExporting(false);
        }
    }
    // Skips the manual export-then-reopen round trip, same idea as
    // ZEditor's own "Send to ZineArranger": opens ZineArranger in a new
    // tab, waits for its "ready" ping, and hands it a real PDF — built
    // here by rendering the document into a hidden, Paged.js-paginated
    // iframe (renderRasterizationDocument) and rasterizing each physical
    // page, since normal export (handleExport above) never produces PDF
    // bytes in JS to send (see the note on exportToPdf in
    // pdfGenerator.js). ZineArranger then feeds the bytes into its own
    // file input, exactly as if the user had picked the file themselves.
    async function handleSendToZineArranger() {
        if (isSendingToArranger)
            return;
        setExportError(null);
        setIsSendingToArranger(true);
        let win = null;
        let iframe = null;
        try {
            win = window.open('../ZineArranger/index.html', '_blank');
            if (!win)
                throw new Error('The browser blocked the new tab — allow popups for this page and try again.');
            // Attach the "ready" listener before anything else — see
            // ZEditor's own handleSendToZineArranger for why (ZineArranger
            // can finish loading and fire its ready ping while we're still
            // off rendering/rasterizing pages here).
            const readyPromise = new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    window.removeEventListener('message', onReady);
                    reject(new Error("ZineArranger didn't respond — it may still be loading, or didn't open as a new tab."));
                }, 15000);
                function onReady(event) {
                    if (event.source !== win || !event.data || event.data.type !== 'zinearranger-ready')
                        return;
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', onReady);
                    resolve();
                }
                window.addEventListener('message', onReady);
            });
            const paper = window.MD2eBook.PAPER_SIZES[config.paperSize] || window.MD2eBook.PAPER_SIZES.a4;
            const DPI = 96;
            const rasterResult = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    window.removeEventListener('message', onRasterMessage);
                    reject(new Error('Rendering the document for export timed out.'));
                }, 60000);
                function onRasterMessage(event) {
                    if (!iframe || event.source !== iframe.contentWindow)
                        return;
                    const data = event.data;
                    if (!data || data.source !== 'md2ebook-rasterize')
                        return;
                    if (data.error) {
                        clearTimeout(timeoutId);
                        window.removeEventListener('message', onRasterMessage);
                        reject(new Error(data.error));
                        return;
                    }
                    if (!Array.isArray(data.images))
                        return; // not the final message yet
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', onRasterMessage);
                    resolve(data);
                }
                window.addEventListener('message', onRasterMessage);
                // Unlike the live preview's iframe, this one needs
                // allow-same-origin alongside allow-scripts — confirmed
                // html2canvas hangs indefinitely without it. That's safe
                // here specifically because renderRasterizationDocument
                // sanitizes the rendered HTML with DOMPurify first (see
                // its comment in pdfGenerator.js), which is what actually
                // keeps a smuggled <script> in pasted raw HTML from
                // reaching out to this app, not the sandbox by itself.
                // Positioned off-page rather than sized to 0 (needs real
                // pixel dimensions for Paged.js to lay pages out against)
                // — harmless, since that positioning has no bearing on
                // the html2canvas capture happening inside the iframe's
                // own separate document.
                iframe = document.createElement('iframe');
                iframe.setAttribute('aria-hidden', 'true');
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                iframe.style.position = 'fixed';
                iframe.style.left = '-99999px';
                iframe.style.top = '0';
                iframe.style.border = '0';
                iframe.width = String(Math.round(paper.widthIn * DPI));
                iframe.height = String(Math.round(paper.heightIn * DPI));
                iframe.srcdoc = window.MD2eBook.renderRasterizationDocument(markdown, config);
                document.body.appendChild(iframe);
            });
            const { PDFDocument } = window.PDFLib;
            const outDoc = await PDFDocument.create();
            const pageWidthPts = rasterResult.widthIn * 72;
            const pageHeightPts = rasterResult.heightIn * 72;
            for (const img of rasterResult.images) {
                const pngImage = await outDoc.embedPng(img.buffer);
                const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
                outPage.drawImage(pngImage, { x: 0, y: 0, width: pageWidthPts, height: pageHeightPts });
            }
            const pdfBytes = await outDoc.save();
            const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
            await readyPromise;
            win.postMessage({ type: 'zeditor-handoff-pdf', buffer, filename: deriveFilename(markdown) }, '*', [buffer]);
        }
        catch (err) {
            setExportError('Couldn\'t send to ZineArranger — ' + (err && err.message ? err.message : 'unknown error'));
        }
        finally {
            if (iframe && iframe.parentNode)
                iframe.parentNode.removeChild(iframe);
            setIsSendingToArranger(false);
        }
    }
    return (React.createElement("div", { className: "md2ebook-app" },
        React.createElement(Header, { onLoadSample: handleLoadSample, onClear: handleClear, onExport: handleExport, isExporting: isExporting, onSendToZineArranger: handleSendToZineArranger, isSendingToArranger: isSendingToArranger }),
        exportError ? (React.createElement("div", { className: "md2ebook-no-print flex-none bg-red-950/40 border-b border-red-900 text-red-300 text-xs px-5 py-2 flex items-center justify-between" },
            React.createElement("span", null,
                "PDF export failed: ",
                exportError),
            React.createElement("button", { type: "button", onClick: () => setExportError(null), 
                // bg-transparent/border-0/p-0 neutralize component-kit.css's
                // plain `button` rule — this is a plain text dismiss link.
                className: "text-red-400 hover:text-red-300 font-medium ml-4 bg-transparent border-0 p-0" }, "Dismiss"))) : null,
        React.createElement("div", { className: "md2ebook-body" },
            React.createElement(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, markdown: markdown, setMarkdown: setMarkdown, config: config, updateConfig: updateConfig, applyConfig: applyConfig, fontOptions: fontOptions, setFontOptions: setFontOptions }),
            React.createElement(PreviewCanvas, { markdown: markdown, config: config }))));
}
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(React.createElement(App, null));
