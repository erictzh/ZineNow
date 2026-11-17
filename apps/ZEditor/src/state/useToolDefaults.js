// Settings for the next item each tool makes (pen, highlighter, eraser, text, shapes), the font list and saved text styles.

import { controlValues } from "../model/controls.js";
import { RECT_CONTROLS } from "../model/rect.js";
import { MAGIC_ERASER_DEFAULTS } from "../model/magicEraser.js";
import { SOFT_ERASER_DEFAULTS } from "../model/softEraser.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS } from "../model/strokes.js";
import { DEFAULT_FONT_OPTIONS } from "../model/text/textControls.js";
import { TEXT_STYLES_STORAGE_KEY, captureTextStyle, readStoredTextStyles } from "../model/text/textStyles.js";

const { useState, useEffect } = React;

export function useToolDefaults() {
  const [fontOptions, setFontOptions] = useState(DEFAULT_FONT_OPTIONS);
  // The user's saved text styles: kept in this browser between visits and
  // inside each saved project, so they follow the project to another PC.
  const [textStyles, setTextStyles] = useState(readStoredTextStyles);
  useEffect(() => {
    try { localStorage.setItem(TEXT_STYLES_STORAGE_KEY, JSON.stringify(textStyles)); } catch (err) { /* storage blocked: styles last for this visit */ }
  }, [textStyles]);
  function handleSaveTextStyle(name, ann) {
    setTextStyles((prev) => [...prev.filter((s) => s.name !== name), { name, props: captureTextStyle(ann) }]);
  }
  function handleDeleteTextStyle(name) {
    setTextStyles((prev) => prev.filter((s) => s.name !== name));
  }
  // Styles from an opened project join the ones already here (same name: the project's wins).
  function mergeTextStyles(incoming) {
    if (!incoming.length) return;
    setTextStyles((prev) => [...prev.filter((s) => !incoming.some((i) => i.name === s.name)), ...incoming]);
  }
  // Adds font families (e.g. a project's uploaded fonts) to the font list.
  function addFontFamilies(families) {
    if (!families.length) return;
    setFontOptions((prev) => Array.from(new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
  }

  const [penColor, setPenColor] = useState(PEN_DEFAULTS.color);
  const [penWidth, setPenWidth] = useState(PEN_DEFAULTS.width);
  const [penTaper, setPenTaper] = useState(0);
  // Eraser: "soft" fades image pixels (the default); "stroke" removes whole
  // pen strokes; "magic" erases the clicked colour (within a tolerance).
  const [eraserMode, setEraserMode] = useState("soft");
  const [softEraser, setSoftEraser] = useState(SOFT_ERASER_DEFAULTS);
  const [magicEraser, setMagicEraser] = useState(MAGIC_ERASER_DEFAULTS);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_DEFAULTS.color);
  const [highlighterWidth, setHighlighterWidth] = useState(HIGHLIGHTER_DEFAULTS.width);
  const [highlighterTaper, setHighlighterTaper] = useState(0);
  // Text tool defaults — applied to each NEW text box; editing an
  // existing one only changes that one annotation, same relationship
  // pen/highlighter defaults already have to their own strokes.
  const [textFontFamily, setTextFontFamily] = useState(DEFAULT_FONT_OPTIONS[0]);
  const [textFontSize, setTextFontSize] = useState(16);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textColor, setTextColor] = useState("#1a1a1a");
  const [textAlign, setTextAlign] = useState("left");
  const [rectDefaults, setRectDefaults] = useState(() => controlValues({}, RECT_CONTROLS));

  return {
    fontOptions, setFontOptions, addFontFamilies,
    textStyles, handleSaveTextStyle, handleDeleteTextStyle, mergeTextStyles,
    penColor, setPenColor, penWidth, setPenWidth, penTaper, setPenTaper,
    eraserMode, setEraserMode, softEraser, setSoftEraser, magicEraser, setMagicEraser,
    highlighterColor, setHighlighterColor, highlighterWidth, setHighlighterWidth, highlighterTaper, setHighlighterTaper,
    textFontFamily, setTextFontFamily, textFontSize, setTextFontSize, textBold, setTextBold,
    textItalic, setTextItalic, textUnderline, setTextUnderline, textColor, setTextColor, textAlign, setTextAlign,
    rectDefaults, setRectDefaults,
  };
}
