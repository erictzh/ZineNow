// The Editor tab's formatting toolbar: block style, inline styles, lists/quote/divider, and the
// \toc / \pagebreak / \space{N} markers. It only reports which button was pressed; EditorTab.jsx makes
// the edit (see editor/format.js for what each one does to the text).

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl+";
const ALT = IS_MAC ? "⌥" : "Alt+";
const SHIFT = IS_MAC ? "⇧" : "Shift+";

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
  divider: (
    <Svg>
      <path d="M2 8h12" />
      <path d="M4 4.5h8M4 11.5h8" strokeOpacity="0.4" />
    </Svg>
  ),
  toc: (
    <Svg>
      <path d="M2.5 3.5h11M2.5 8h7M2.5 12.5h9" />
      <path d="M12 8h1.5" strokeDasharray="0.1 1.6" />
    </Svg>
  ),
  pagebreak: (
    <Svg>
      <path d="M3.5 6V2.5h9V6M3.5 10v3.5h9V10" />
      <path d="M1.5 8h13" strokeDasharray="1.6 1.6" />
    </Svg>
  ),
  space: (
    <Svg>
      <rect x="2.5" y="3" width="11" height="10" rx="1" strokeDasharray="2 1.6" />
    </Svg>
  ),
};

function ToolButton({ icon, title, onPress, active }) {
  return (
    <button
      type="button"
      className={"md2ebook-fmt-btn" + (active ? " active" : "")}
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
export function FormatToolbar({ blockKind, onAction, spaceLines, setSpaceLines }) {
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
      <ToolButton icon="divider" title="Divider line (---)" onPress={() => onAction("line", "---")} />
      <Divider />
      <ToolButton icon="toc" title={"Table of contents at the cursor (\\toc) — its settings are in the Typography tab"} onPress={() => onAction("line", "\\toc")} />
      <ToolButton icon="pagebreak" title={"Page break at the cursor (\\pagebreak)"} onPress={() => onAction("line", "\\pagebreak")} />
      <span className="md2ebook-fmt-space">
        <ToolButton icon="space" title={"Blank space at the cursor, this many body lines tall (\\space{N}) — room to paste an image into the PDF later"} onPress={() => onAction("space")} />
        <input
          type="number"
          min="1"
          max="200"
          value={spaceLines}
          onChange={(e) => setSpaceLines(e.target.value)}
          aria-label="Blank space height in lines"
          title="Blank space height, in lines"
        />
      </span>
    </div>
  );
}
