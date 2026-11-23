// Settings for the next item each tool makes (pen, highlighter, eraser, marquee, text, shapes), the font list and saved text styles.

import { controlValues } from "../model/controls.js";
import { RECT_CONTROLS } from "../model/rect.js";
import { MAGIC_ERASER_DEFAULTS } from "../model/magicEraser.js";
import { MARQUEE_DEFAULTS } from "../model/marquee.js";
import { SOFT_ERASER_DEFAULTS } from "../model/softEraser.js";
import { HIGHLIGHTER_DEFAULTS, PEN_DEFAULTS } from "../model/strokes.js";
import { DEFAULT_FONT_OPTIONS } from "../model/text/textControls.js";
import { TEXT_STYLES_STORAGE_KEY, captureTextStyle, readStoredTextStyles, resolvedStyleProps, styleDiff } from "../model/text/textStyles.js";

const { useState, useEffect } = React;

export function useToolDefaults() {
  const [fontOptions, setFontOptions] = useState(DEFAULT_FONT_OPTIONS);
  // The user's saved text styles: kept in this browser between visits and
  // inside each saved project, so they follow the project to another PC.
  const [textStyles, setTextStyles] = useState(readStoredTextStyles);
  useEffect(() => {
    try { localStorage.setItem(TEXT_STYLES_STORAGE_KEY, JSON.stringify(textStyles)); } catch (err) { /* storage blocked: styles last for this visit */ }
  }, [textStyles]);
  // A style "based on" another stores only what differs from it, so changes to the base flow through.
  function handleSaveTextStyle(name, ann, basedOn) {
    setTextStyles((prev) => {
      const captured = captureTextStyle(ann);
      const base = basedOn && basedOn !== name && prev.some((s) => s.name === basedOn) ? basedOn : null;
      const style = base ? { name, basedOn: base, props: styleDiff(resolvedStyleProps(prev, base), captured) } : { name, props: captured };
      return [...prev.filter((s) => s.name !== name), style];
    });
  }
  // Styles based on a deleted one keep their look: it's written into them.
  function handleDeleteTextStyle(name) {
    setTextStyles((prev) => prev.filter((s) => s.name !== name).map((s) => (s.basedOn === name ? { name: s.name, props: resolvedStyleProps(prev, s.name) } : s)));
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
  // Marquee: how "make layer" works (Copy or Cut, what it samples, what a cut leaves). See model/marquee.js.
  // The fill style starts empty every time (the user picks one; it is not remembered after a reload).
  const [marquee, setMarquee] = useState(MARQUEE_DEFAULTS);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_DEFAULTS.color);
  const [highlighterWidth, setHighlighterWidth] = useState(HIGHLIGHTER_DEFAULTS.width);
  const [highlighterTaper, setHighlighterTaper] = useState(0);
  // Text tool defaults — applied to each NEW text box; editing an
  // existing one only changes that one annotation, same relationship
  // pen/highlighter defaults already have to their own strokes.
  const [textFontFamily, setTextFontFamily] = useState(DEFAULT_FONT_OPTIONS[0]);
  const [textFontSize, setTextFontSize] = useState(13.2); // 12 pt: the page is shown at 1.1 px per pt
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textColor, setTextColor] = useState("#1a1a1a");
  const [textAlign, setTextAlign] = useState("left");
  const [rectDefaults, setRectDefaults] = useState(() => controlValues({}, RECT_CONTROLS));

  return {
    fontOptions, setFontOptions, addFontFamilies,
    textStyles, setTextStyles, handleSaveTextStyle, handleDeleteTextStyle, mergeTextStyles,
    penColor, setPenColor, penWidth, setPenWidth, penTaper, setPenTaper,
    eraserMode, setEraserMode, softEraser, setSoftEraser, magicEraser, setMagicEraser, marquee, setMarquee,
    highlighterColor, setHighlighterColor, highlighterWidth, setHighlighterWidth, highlighterTaper, setHighlighterTaper,
    textFontFamily, setTextFontFamily, textFontSize, setTextFontSize, textBold, setTextBold,
    textItalic, setTextItalic, textUnderline, setTextUnderline, textColor, setTextColor, textAlign, setTextAlign,
    rectDefaults, setRectDefaults,
  };
}
