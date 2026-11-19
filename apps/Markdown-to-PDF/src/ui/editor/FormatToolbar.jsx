// The Editor tab's formatting toolbar: block style, inline styles, lists/quote, an Insert menu (the
// \toc / \pagebreak / \space{N} markers and a divider), and Copy all / Clear on the right. It only
// reports which button was pressed; EditorTab.jsx acts on it (see editor/format.js for what each
// formatting action does to the text).

import { DropMenu, MenuItem } from "../Menu.jsx";
import { ALT, MOD, SHIFT } from "../shortcutKeys.js";

// The block-style dropdown's choices, and what it shows when the caret's line is something else.
const BLOCK_OPTIONS = [
  { value: "p", label: "Paragraph", keys: MOD + ALT + "0" },
  { value: "h1", label: "Heading 1", keys: MOD + ALT + "1" },
  { value: "h2", label: "Heading 2", keys: MOD + ALT + "2" },
  { value: "h3", label: "Heading 3", keys: MOD + ALT + "3" },
];
const OTHER_BLOCK_LABELS = { h4: "Heading 4", h5: "Heading 5", h6: "Heading 6", quote: "Quote", ul: "Bulleted list", ol: "Numbered list" };

/* Icons: 16 px, drawn in currentColor so they follow the button's state colour. */
const Svg = ({ children, fill }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill={fill || "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const ICONS = {
  bold: <span className="md2ebook-fmt-glyph" style={{ fontWeight: 800 }}>B</span>,
  italic: <span className="md2ebook-fmt-glyph" style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }}>I</span>,
  strike: <span className="md2ebook-fmt-glyph" style={{ textDecoration: "line-through" }}>S</span>,
  code: (
    <Svg>
      <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />
    </Svg>
  ),
  link: (
    <Svg>
      <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9" />
      <path d="M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" />
    </Svg>
  ),
  ul: (
    <Svg>
      <path d="M6 4h8M6 8h8M6 12h8" />
      <circle cx="2.6" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  ),
  ol: (
    <Svg>
      <path d="M6.5 4h7.5M6.5 8h7.5M6.5 12h7.5" />
      <text x="0.6" y="5.6" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">1</text>
      <text x="0.6" y="9.6" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">2</text>
      <text x="0.6" y="13.6" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">3</text>
    </Svg>
  ),
  quote: (
    <Svg fill="currentColor">
      <path d="M2.5 9.2C2.5 6.6 3.8 4.7 6.3 4l.5 1c-1.3.5-2 1.3-2.1 2.4H6.6V12H2.5V9.2Zm7 0c0-2.6 1.3-4.5 3.8-5.2l.5 1c-1.3.5-2 1.3-2.1 2.4h1.9V12H9.5V9.2Z" />
    </Svg>
  ),
  save: (
    <Svg>
      <path d="M3 2.5h8l2.5 2.5v8a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
      <path d="M5.5 2.5v3h4.5v-3M5 13.5V9.5h6v4" />
    </Svg>
  ),
  // A floppy disk with a pencil over its corner: save under a new name.
  saveAs: (
    <Svg>
      <path d="M8.5 13.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5h8l2.5 2.5v2" />
      <path d="M5.5 2.5v3h4.5v-3M5 13.5V9.5h3" />
      <path d="M13.6 8.9l1 1-4 4H9.6v-1Z" />
    </Svg>
  ),
  copy: (
    <Svg>
      <rect x="5.5" y="5.5" width="8" height="8.5" rx="1.5" />
      <path d="M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H4A1.5 1.5 0 0 0 2.5 3.5V10A1.5 1.5 0 0 0 4 11.5h1.5" />
    </Svg>
  ),
  clear: (
    <Svg>
      <path d="M2.5 4.5h11M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.6a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.6" />
      <path d="M6.8 7v4.5M9.2 7v4.5" />
    </Svg>
  ),
};

function ToolButton({ icon, title, onPress, active, marked, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={"md2ebook-fmt-btn" + (active ? " active" : "") + (marked ? " marked" : "")}
      title={title}
      aria-label={title}
      aria-pressed={active == null ? undefined : active}
      // Keep the focus (and the selection) in the editor while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
    >
      {ICONS[icon]}
    </button>
  );
}

const Divider = () => <span className="md2ebook-fmt-divider" aria-hidden="true" />;

// `blockKind` is the caret line's kind (editor/format.js lineKind); `onAction(name, arg)` runs an edit.
export function FormatToolbar({ blockKind, fileSave, onAction, spaceLines, setSpaceLines }) {
  const isOther = !BLOCK_OPTIONS.some((o) => o.value === blockKind);
  return (
    <div className="md2ebook-fmt-bar" role="toolbar" aria-label="Formatting">
      <select
        className="md2ebook-fmt-select"
        value={isOther ? "other" : blockKind}
        onChange={(e) => onAction("block", e.target.value)}
        aria-label="Text style"
        title={"Text style — " + BLOCK_OPTIONS.map((o) => o.label + " " + o.keys).join(", ")}
      >
        {BLOCK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {isOther ? <option value="other" disabled hidden>{OTHER_BLOCK_LABELS[blockKind] || "Paragraph"}</option> : null}
      </select>
      <Divider />
      <ToolButton icon="bold" title={`Bold (${MOD}B)`} onPress={() => onAction("inline", "bold")} />
      <ToolButton icon="italic" title={`Italic (${MOD}I)`} onPress={() => onAction("inline", "italic")} />
      <ToolButton icon="strike" title={`Strikethrough (${MOD}${SHIFT}X)`} onPress={() => onAction("inline", "strike")} />
      <ToolButton icon="code" title={`Inline code (${MOD}E)`} onPress={() => onAction("inline", "code")} />
      <ToolButton icon="link" title={`Link (${MOD}K)`} onPress={() => onAction("link")} />
      <Divider />
      <ToolButton icon="ul" title={`Bulleted list (${MOD}${SHIFT}8)`} active={blockKind === "ul"} onPress={() => onAction("block", "ul")} />
      <ToolButton icon="ol" title={`Numbered list (${MOD}${SHIFT}7)`} active={blockKind === "ol"} onPress={() => onAction("block", "ol")} />
      <ToolButton icon="quote" title={`Quote (${MOD}${SHIFT}9)`} active={blockKind === "quote"} onPress={() => onAction("block", "quote")} />
      <Divider />
      {/* Things put on their own line at the cursor: the \toc, \pagebreak and \space{N} markers
          (see document/markers.js) and a divider line. */}
      <DropMenu trigger="Insert" title="Insert at the cursor" triggerClassName="md2ebook-fmt-menu-trigger" keepEditorFocus>
        {({ close, keepEditorFocus }) => (
          <>
            <MenuItem label="Table of contents" hint={"Inserts \\toc — its look is set in the Typography tab"} onClick={() => onAction("line", "\\toc")} close={close} keepEditorFocus={keepEditorFocus} />
            <MenuItem label="Page break" hint={"Inserts \\pagebreak — what follows starts on a new page"} onClick={() => onAction("line", "\\pagebreak")} close={close} keepEditorFocus={keepEditorFocus} />
            <MenuItem label="Divider line" hint="Inserts --- (a horizontal rule)" onClick={() => onAction("line", "---")} close={close} keepEditorFocus={keepEditorFocus} />
            <MenuItem
              label="Blank space"
              hint={"Inserts \\space{N}: empty space N body lines tall — room to paste an image into the PDF later"}
              onClick={() => onAction("space")}
              close={close}
              keepEditorFocus={keepEditorFocus}
            >
              <span className="md2ebook-menu-space">
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={spaceLines}
                  onChange={(e) => setSpaceLines(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); close(); onAction("space"); }
                  }}
                  aria-label="Blank space height in lines"
                />
                lines
              </span>
            </MenuItem>
          </>
        )}
      </DropMenu>
      <span className="md2ebook-fmt-spacer" />
      {/* Save writes back to the .md file Save As picked, in one click (greyed out until then);
          its dot shows there are changes not saved to that file yet. */}
      <ToolButton
        icon="save"
        disabled={!fileSave.name}
        marked={fileSave.unsaved}
        title={
          fileSave.name
            ? `Save to "${fileSave.name}" (${MOD}S)` + (fileSave.unsaved ? " — has unsaved changes" : " — no unsaved changes")
            : "Save — use Save As first to pick a .md file, then this saves back to it in one click"
        }
        onPress={() => onAction("save")}
      />
      <ToolButton
        icon="saveAs"
        title={`Save As… — save as a new .md file (${fileSave.name ? MOD + SHIFT + "S" : MOD + "S"})`}
        onPress={() => onAction("saveAs")}
      />
      <ToolButton icon="copy" title="Copy all the Markdown to the clipboard" onPress={() => onAction("copy")} />
      <ToolButton icon="clear" title={`Clear the editor (${MOD}Z brings the text back)`} onPress={() => onAction("clear")} />
    </div>
  );
}
