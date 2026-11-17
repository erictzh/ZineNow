// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.
(() => {
  // apps/ZEditor/src/model/pageNumbers.js
  var DEFAULT_PAGE_NUMBERS = { on: false, from: 1, to: 0, first: 1, position: "bottom-outside", format: "n", size: 10, color: "#1a1a1a", marginIn: 0.4 };
  var PAGE_NUMBER_POSITIONS = [
    { key: "bottom-outside", label: "Bottom, outer corner" },
    { key: "bottom-center", label: "Bottom, center" },
    { key: "bottom-left", label: "Bottom left" },
    { key: "bottom-right", label: "Bottom right" },
    { key: "top-outside", label: "Top, outer corner" },
    { key: "top-center", label: "Top, center" },
    { key: "top-left", label: "Top left" },
    { key: "top-right", label: "Top right" }
  ];
  var PAGE_NUMBER_FORMATS = [{ key: "n", label: "1" }, { key: "dash", label: "– 1 –" }, { key: "page", label: "Page 1" }];
  function pageNumberSpec(settings, pageIdx, pageCount) {
    if (!settings.on || pageIdx === null || pageIdx < 0) return null;
    const position = pageIdx + 1;
    const last = settings.to > 0 ? Math.min(settings.to, pageCount) : pageCount;
    if (position < settings.from || position > last) return null;
    const number = settings.first + (position - settings.from);
    const text = settings.format === "dash" ? `– ${number} –` : settings.format === "page" ? `Page ${number}` : String(number);
    let place = settings.position;
    if (place.endsWith("-outside")) place = place.replace("outside", position % 2 === 1 ? "right" : "left");
    const [vertical, horizontal] = place.split("-");
    return { text, vertical, horizontal, size: settings.size, color: settings.color, marginIn: settings.marginIn };
  }

  // apps/ZEditor/src/constants.js
  var THUMB_SCALE = 0.3;
  var MAIN_SCALE = 1.1;
  var DEFAULT_PAGE_SIZE = { width: 420, height: 594 };
  var NEW_DOCUMENT_PRESETS = [
    { key: "a3", label: "A3", width: 841.89, height: 1190.55 },
    { key: "a4", label: "A4", width: 595.28, height: 841.89 },
    { key: "a5", label: "A5", width: 419.53, height: 595.28 },
    { key: "a6", label: "A6", width: 297.64, height: 419.53 },
    { key: "letter", label: "US Letter", width: 612, height: 792 },
    { key: "half-letter", label: "Half Letter", width: 396, height: 612 },
    { key: "digest", label: "Digest", width: 396, height: 594 }
  ];
  var MAX_NEW_DOCUMENT_PAGES = 100;
  var ZOOM_PERCENT = { min: 25, max: 400, initial: 100 };
  var POINTS_PER_INCH = 72;
  var EXPORT_DPI = 200;
  var EXPORT_SCALE = EXPORT_DPI / 72;

  // apps/ZEditor/src/model/annotations.js
  function withGroupMates(annotations, ids) {
    const groups = new Set(annotations.filter((a) => ids.includes(a.id) && a.groupId).map((a) => a.groupId));
    if (groups.size === 0) return ids;
    const mates = annotations.filter((a) => groups.has(a.groupId) && !a.hidden && !a.locked).map((a) => a.id);
    return [.../* @__PURE__ */ new Set([...ids, ...mates])];
  }
  function groupColor(groupId) {
    let hash = 0;
    for (const ch of String(groupId)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${hash * 47 % 360} 70% 60%)`;
  }
  function translatedAnnotation(ann, dx, dy) {
    return ann.type === "stroke" ? { ...ann, points: ann.points.map(([px, py]) => [px + dx, py + dy]) } : { ...ann, x: ann.x + dx, y: ann.y + dy };
  }
  function legacyLayerOrder(annotations) {
    const rank = { image: 0, stroke: 1, text: 2 };
    return annotations.slice().sort((a, b) => rank[a.type] - rank[b.type]);
  }
  function orderAfterMove(count, fromIndices, insertBefore) {
    const moving = new Set(fromIndices);
    const allIndices = Array.from({ length: count }, (_, i) => i);
    const block = allIndices.filter((i) => moving.has(i));
    const rest = allIndices.filter((i) => !moving.has(i));
    const insertAt = rest.filter((i) => i < insertBefore).length;
    const newOrder = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
    return newOrder.every((oldIdx, newIdx) => oldIdx === newIdx) ? null : newOrder;
  }
  function bboxOf(ann) {
    if (ann.type === "text") {
      return { x: ann.x, y: ann.y, width: ann.width || 160, height: ann.height || 26 };
    }
    const xs = ann.points.map((p) => p[0]);
    const ys = ann.points.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  // apps/ZEditor/src/model/pageFilters.js
  var PAGE_FILTER_OPTIONS = [
    { key: "none", label: "None" },
    { key: "grayscale", label: "Grayscale" },
    { key: "duotone", label: "Duotone" },
    { key: "halftone", label: "Halftone" },
    { key: "threshold", label: "Threshold" }
  ];
  var IMAGE_FILTER_OPTIONS = [
    { key: "match", label: "Match Page" },
    ...PAGE_FILTER_OPTIONS,
    { key: "xerox", label: "Xerox" }
    // per-image only
  ];
  var INK_COLOR_CONTROL = { kind: "color", prop: "inkColor", label: "Ink color", fallback: "#000000" };
  var PAPER_COLOR_CONTROL = { kind: "color", prop: "paperColor", label: "Paper color", fallback: "#ffffff" };
  var THRESHOLD_FILTER_CONTROLS = [
    { kind: "slider", prop: "level", label: "Cutoff", min: 0, max: 255, fallback: 128 },
    INK_COLOR_CONTROL,
    PAPER_COLOR_CONTROL
  ];
  var XEROX_FILTER_CONTROLS = [
    { kind: "slider", prop: "contrast", label: "Contrast", min: 0, max: 100, fallback: 75 },
    { kind: "slider", prop: "exposure", label: "Exposure", min: 0, max: 100, fallback: 50 },
    { kind: "slider", prop: "speckle", label: "Toner speckle", min: 0, max: 100, fallback: 35 },
    { kind: "slider", prop: "streaks", label: "Streaks", min: 0, max: 100, fallback: 25 },
    { kind: "slider", prop: "edgeWear", label: "Edge wear", min: 0, max: 100, fallback: 30 },
    { kind: "slider", prop: "xeroxVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
    INK_COLOR_CONTROL,
    PAPER_COLOR_CONTROL
  ];
  var DEFAULT_DUOTONE_DARK = "#1a1a1a";
  var DEFAULT_DUOTONE_LIGHT = "#ffe066";
  var MIN_HALFTONE_CELL_SIZE = 1;
  var HALFTONE_FILTER_CONTROLS = [
    {
      kind: "select",
      prop: "colorMode",
      label: "Color",
      fallback: "mono",
      options: [{ key: "mono", label: "Monochrome" }, { key: "cmyk", label: "Full color (CMYK)" }]
    },
    {
      kind: "select",
      prop: "screen",
      label: "Screen",
      fallback: "dotsLines",
      options: [{ key: "dotsLines", label: "Dots / Lines" }, { key: "dither", label: "1-Bit Dither" }]
    },
    { kind: "slider", prop: "lineBlend", label: "Dots ↔ Lines (%)", min: 0, max: 100, fallback: 0, showIf: (v) => v.screen !== "dither" },
    { kind: "slider", prop: "cellSize", label: "Size (px)", min: MIN_HALFTONE_CELL_SIZE, max: 16, fallback: 6 },
    { kind: "slider", prop: "angle", label: "Angle (°)", min: 0, max: 180, fallback: 0 },
    { kind: "color", prop: "color", label: "Ink color", fallback: "#1a1a1a", showIf: (v) => v.colorMode !== "cmyk" }
  ];
  var FILTER_CONTROLS = {
    threshold: THRESHOLD_FILTER_CONTROLS,
    halftone: HALFTONE_FILTER_CONTROLS,
    xerox: XEROX_FILTER_CONTROLS
  };
  var DEFAULT_PAGE_FILTER = { type: "none" };
  function effectiveImageFilter(ann, pageFilter) {
    const f = ann.filter;
    if (!f || f.type === "match") return pageFilter || { type: "none" };
    if (f.type === "none") return { type: "none" };
    return f;
  }

  // apps/ZEditor/src/model/controls.js
  var OPACITY_CONTROL = { kind: "slider", prop: "opacity", label: "Opacity (%)", min: 0, max: 100, fallback: 100 };
  var BLEND_CONTROL = {
    kind: "select",
    prop: "blend",
    label: "Blend",
    fallback: "normal",
    options: [
      { key: "normal", label: "Normal" },
      { key: "multiply", label: "Multiply" },
      { key: "screen", label: "Screen" },
      { key: "overlay", label: "Overlay" },
      { key: "soft-light", label: "Soft Light" },
      { key: "darken", label: "Darken" },
      { key: "lighten", label: "Lighten" },
      { key: "difference", label: "Difference" }
    ]
  };
  var ANGLE_CONTROL = { kind: "slider", prop: "angle", label: "Rotation (°)", min: 0, max: 359, fallback: 0 };
  var angleOf = (ann) => ann.angle || 0;
  function controlValues(source, controls) {
    return Object.fromEntries(controls.map((c) => [c.prop, source[c.prop] != null ? source[c.prop] : c.fallback]));
  }
  function effectSettings(ann, effect) {
    return controlValues(ann, effect.controls);
  }
  function opacityOf(ann) {
    return controlValues(ann, [OPACITY_CONTROL]).opacity / 100;
  }
  function blendOf(ann) {
    return controlValues(ann, [BLEND_CONTROL]).blend;
  }

  // apps/ZEditor/src/model/rect.js
  var isGradientFill = (v) => v.fillType !== "solid";
  var RECT_CONTROLS = [
    {
      kind: "select",
      prop: "fillType",
      label: "Fill",
      fallback: "solid",
      options: [{ key: "solid", label: "Solid" }, { key: "linear", label: "Linear gradient" }, { key: "radial", label: "Radial gradient" }]
    },
    { kind: "color", prop: "fillColor", label: "Fill color", fallback: "#1a1a1a" },
    { kind: "slider", prop: "fillAlpha", label: "Fill opacity (%)", min: 0, max: 100, fallback: 100 },
    { kind: "color", prop: "gradientColor", label: "Gradient color", fallback: "#ffe066", showIf: isGradientFill },
    { kind: "slider", prop: "gradientAlpha", label: "Gradient opacity (%)", min: 0, max: 100, fallback: 100, showIf: isGradientFill },
    { kind: "slider", prop: "gradientAngle", label: "Angle (°)", min: 0, max: 360, fallback: 90, showIf: (v) => v.fillType === "linear" },
    { kind: "slider", prop: "gradientStart", label: "Start (%)", min: 0, max: 100, fallback: 0, showIf: isGradientFill },
    { kind: "slider", prop: "gradientEnd", label: "End (%)", min: 0, max: 100, fallback: 100, showIf: isGradientFill },
    OPACITY_CONTROL,
    BLEND_CONTROL
  ];
  var RECT_FILL_PROPS = RECT_CONTROLS.map((c) => c.prop).filter((p) => p !== OPACITY_CONTROL.prop && p !== BLEND_CONTROL.prop);
  var RECT_FILL_CONTROLS = RECT_CONTROLS.filter((c) => RECT_FILL_PROPS.includes(c.prop));
  var MIN_RECT_SIZE = 2;
  var DEFAULT_RECT_SIZE = { width: 160, height: 110 };

  // apps/ZEditor/src/model/noise.js
  function seededNoise(i, variation, j = 0) {
    const v = Math.sin((i + variation * 97) * 12.9898 + j * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }
  function noiseStream(variation, stream = 0) {
    let n = 0;
    return () => seededNoise(stream * 1e5 + n++, variation);
  }

  // apps/ZEditor/src/model/outlines.js
  function pointsToOutline(points) {
    return "M" + points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z";
  }
  function rectOutline({ width, height }) {
    return `M0 0H${width}V${height}H0Z`;
  }
  var isEllipse = (ann) => ann.shape === "ellipse";
  function ellipseOutline({ width, height }) {
    const rx = width / 2, ry = height / 2;
    return `M0 ${ry}A${rx} ${ry} 0 1 1 ${width} ${ry}A${rx} ${ry} 0 1 1 0 ${ry}Z`;
  }

  // apps/ZEditor/src/model/edgeShapes.js
  var ROUNDED_EFFECT = {
    key: "rounded",
    label: "Rounded",
    outline: roundedOutline,
    controls: [
      { kind: "slider", prop: "roundedRadius", label: "Radius (%)", min: 0, max: 50, fallback: 12 }
    ]
  };
  var ELLIPSE_EFFECT = {
    key: "ellipseEdge",
    label: "Ellipse",
    outline: ellipseOutline,
    controls: []
  };
  var TORN_EDGE_EFFECT = {
    key: "tornEdge",
    label: "Torn Edge",
    outline: tornEdgeOutline,
    controls: [
      { kind: "slider", prop: "tornSize", label: "Tooth size (%)", min: 2, max: 40, fallback: 10 },
      { kind: "slider", prop: "tornDepth", label: "Depth (%)", min: 0, max: 30, fallback: 6 },
      { kind: "slider", prop: "tornVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  var SCISSOR_CUT_EFFECT = {
    key: "scissorCut",
    label: "Scissor Cut",
    outline: scissorCutOutline,
    controls: [
      { kind: "slider", prop: "scissorCuts", label: "Cuts per side", min: 1, max: 12, fallback: 2 },
      { kind: "slider", prop: "scissorDepth", label: "Depth (%)", min: 0, max: 25, fallback: 8 },
      { kind: "slider", prop: "scissorVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  function roundedOutline(ann) {
    const { width: w, height: h } = ann;
    const r = Math.min(w, h) * effectSettings(ann, ROUNDED_EFFECT).roundedRadius / 100;
    const corner = (x, y) => `A${r} ${r} 0 0 1 ${x} ${y}`;
    return `M${r} 0H${w - r}${corner(w, r)}V${h - r}${corner(w - r, h)}H${r}${corner(0, h - r)}V${r}${corner(r, 0)}Z`;
  }
  function scissorCutOutline(ann) {
    const { width: w, height: h } = ann;
    const { scissorCuts, scissorDepth, scissorVariation } = effectSettings(ann, SCISSOR_CUT_EFFECT);
    const jitter = Math.min(w, h) * scissorDepth / 100;
    const noise = noiseStream(scissorVariation);
    const onSide = [
      (t, inset) => [w * t, inset],
      (t, inset) => [w - inset, h * t],
      (t, inset) => [w * (1 - t), h - inset],
      (t, inset) => [inset, h * (1 - t)]
    ];
    const points = [];
    onSide.forEach((place) => {
      for (let cut = 0; cut < scissorCuts; cut++) {
        const t = cut === 0 ? 0 : (cut + (noise() - 0.5) * 0.6) / scissorCuts;
        points.push(place(t, noise() * jitter));
      }
    });
    return pointsToOutline(points);
  }
  function tornEdgeOutline(ann) {
    const { width, height } = ann;
    const shortSide = Math.min(width, height);
    const { tornSize, tornDepth, tornVariation } = effectSettings(ann, TORN_EDGE_EFFECT);
    const step = Math.max(0.5, shortSide * tornSize / 100);
    const jitter = shortSide * tornDepth / 100;
    const tuned = ann.tornSize != null || ann.tornDepth != null;
    const stepX = tuned ? width / Math.max(1, Math.round(width / step)) : step;
    const stepY = tuned ? height / Math.max(1, Math.round(height / step)) : step;
    const eps = 1e-6;
    const noise = (i2) => seededNoise(i2, tornVariation);
    const points = [];
    let i = 0;
    for (let x = 0; x <= width + eps; x += stepX) points.push([x, noise(i++) * jitter]);
    for (let y = stepY; y <= height + eps; y += stepY) points.push([width - noise(i++) * jitter, y]);
    for (let x = width - stepX; x >= -eps; x -= stepX) points.push([x, height - noise(i++) * jitter]);
    for (let y = height - stepY; y >= stepY - eps; y -= stepY) points.push([noise(i++) * jitter, y]);
    return pointsToOutline(points);
  }

  // apps/ZEditor/src/model/imageEffects.js
  var STROKE_EFFECT = {
    key: "stroke",
    label: "Stroke",
    controls: [
      { kind: "color", prop: "strokeColor", label: "Color", fallback: "#000000" },
      { kind: "slider", prop: "strokeThickness", label: "Thickness (px)", min: 1, max: 40, fallback: 4 }
    ]
  };
  var STROKE_MITER_LIMIT = 4;
  var SHADOW_EFFECT = {
    key: "shadow",
    label: "Shadow",
    controls: [
      { kind: "color", prop: "shadowColor", label: "Color", fallback: "#000000" },
      { kind: "slider", prop: "shadowThickness", label: "Thickness (px)", min: 0, max: 60, fallback: 6 },
      { kind: "slider", prop: "shadowDirection", label: "Direction (°)", min: 0, max: 360, fallback: 135 },
      { kind: "slider", prop: "shadowBlur", label: "Blur (px)", min: 0, max: 40, fallback: 0 }
    ],
    hint: "Direction: 0° is up, 90° right, 180° down, 270° left."
  };
  var TEXTURE_EFFECT = {
    key: "texture",
    label: "Texture",
    controls: [
      { kind: "color", prop: "textureColor", label: "Color", fallback: "#1a1a1a" },
      { kind: "slider", prop: "textureGrit", label: "Grit", min: 0, max: 100, fallback: 40 },
      { kind: "slider", prop: "textureDust", label: "Dust", min: 0, max: 100, fallback: 20 },
      { kind: "slider", prop: "textureScratches", label: "Scratches", min: 0, max: 100, fallback: 15 },
      { kind: "slider", prop: "textureVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  var IMAGE_EFFECTS = [ROUNDED_EFFECT, ELLIPSE_EFFECT, TORN_EDGE_EFFECT, SCISSOR_CUT_EFFECT, STROKE_EFFECT, SHADOW_EFFECT, TEXTURE_EFFECT];
  function imageEdgeOutline(ann) {
    if (isEllipse(ann)) return ellipseOutline(ann);
    const edge = IMAGE_EFFECTS.find((effect) => effect.outline && ann[effect.key]);
    return edge ? edge.outline(ann) : null;
  }
  function imageShadowOffset(ann) {
    if (!ann.shadow) return null;
    const { shadowThickness, shadowDirection, shadowBlur, shadowColor } = effectSettings(ann, SHADOW_EFFECT);
    if (shadowThickness <= 0 && shadowBlur <= 0) return null;
    const radians = shadowDirection * Math.PI / 180;
    return {
      x: Math.sin(radians) * shadowThickness,
      y: -Math.cos(radians) * shadowThickness,
      blur: shadowBlur,
      color: shadowColor
    };
  }

  // apps/ZEditor/src/model/photoAdjust.js
  var adjustSlider = (prop, label, fallback = 0, min = -100, max = 100) => ({ kind: "slider", prop, label, min, max, fallback });
  var PHOTO_ADJUST_SECTIONS = [
    {
      id: "light",
      title: "Light",
      controls: [
        adjustSlider("adjExposure", "Exposure"),
        adjustSlider("adjBrightness", "Brightness"),
        adjustSlider("adjContrast", "Contrast"),
        adjustSlider("adjHighlights", "Highlights"),
        adjustSlider("adjShadows", "Shadows")
      ]
    },
    {
      id: "color",
      title: "Color",
      controls: [
        adjustSlider("adjSaturation", "Saturation"),
        adjustSlider("adjTemperature", "White balance: cool ↔ warm"),
        adjustSlider("adjTint", "Tint: green ↔ magenta")
      ]
    },
    {
      id: "levels",
      title: "Levels",
      controls: [
        adjustSlider("adjBlack", "Black point", 0, 0, 254),
        adjustSlider("adjWhite", "White point", 255, 1, 255),
        adjustSlider("adjGamma", "Midtones (%)", 100, 10, 300)
      ]
    }
  ];
  var PHOTO_ADJUST_CONTROLS = PHOTO_ADJUST_SECTIONS.flatMap((s) => s.controls);
  var isAdjusted = (ann, control) => ann[control.prop] != null && ann[control.prop] !== control.fallback;
  var hasPhotoAdjust = (ann) => PHOTO_ADJUST_CONTROLS.some((c) => isAdjusted(ann, c));

  // apps/ZEditor/src/model/text/textControls.js
  var AUTO_TEXT_MAX_WIDTH = 320;
  var TEXT_BORDER_PX = 1;
  var LINE_SPACING_CONTROL = { kind: "slider", prop: "lineSpacing", label: "Line spacing (%)", min: 80, max: 300, fallback: 130 };
  var LETTER_SPACING_CONTROL = { kind: "slider", prop: "letterSpacing", label: "Letter spacing (%)", min: -10, max: 100, fallback: 0 };
  var STRIKE_CONTROL = {
    kind: "select",
    prop: "strike",
    label: "Strike-through",
    fallback: "none",
    options: [{ key: "none", label: "None" }, { key: "line", label: "Line" }, { key: "double", label: "Double" }, { key: "wavy", label: "Wavy" }]
  };
  var CASE_CONTROL = {
    kind: "select",
    prop: "textCase",
    label: "Letter case",
    fallback: "none",
    options: [{ key: "none", label: "As typed" }, { key: "upper", label: "UPPERCASE" }, { key: "lower", label: "lowercase" }, { key: "title", label: "Title Case" }, { key: "small", label: "Small caps" }]
  };
  var VERTICAL_CONTROL = {
    kind: "select",
    prop: "vertical",
    label: "Direction",
    fallback: "none",
    options: [{ key: "none", label: "Horizontal" }, { key: "stacked", label: "Stacked (top to bottom)" }]
  };
  var FIT_HEIGHT_CONTROL = { kind: "slider", prop: "fitHeight", label: "Shrink to fit height (px, 0 = off)", min: 0, max: 1e3, fallback: 0 };
  var TEXT_FILL_ALPHA_CONTROL = { kind: "slider", prop: "fillAlpha", label: "Fill opacity (%)", min: 0, max: 100, fallback: 100 };
  var TEXT_GRADIENT_EFFECT = {
    key: "textGradient",
    label: "Gradient",
    controls: [
      { kind: "color", prop: "gradientColor", label: "To color", fallback: "#ffe066" },
      { kind: "slider", prop: "gradientAlpha", label: "To opacity (%)", min: 0, max: 100, fallback: 100 },
      { kind: "slider", prop: "gradientAngle", label: "Angle (°)", min: 0, max: 360, fallback: 90 },
      { kind: "slider", prop: "gradientStart", label: "Start (%)", min: 0, max: 100, fallback: 0 },
      { kind: "slider", prop: "gradientEnd", label: "End (%)", min: 0, max: 100, fallback: 100 }
    ],
    hint: "Fades from the text color to this one, across the whole text box."
  };
  var TEXT_LABEL_EFFECT = {
    key: "labelBox",
    label: "Label",
    controls: [
      { kind: "color", prop: "labelColor", label: "Color", fallback: "#000000" },
      { kind: "slider", prop: "labelAlpha", label: "Opacity (%)", min: 0, max: 100, fallback: 100 },
      { kind: "slider", prop: "labelPadding", label: "Padding (px)", min: 0, max: 40, fallback: 6 },
      { kind: "slider", prop: "labelRadius", label: "Corner radius (px)", min: 0, max: 40, fallback: 0 }
    ],
    hint: "A filled box behind the text — a black bar, a highlighter strip, a tape label."
  };
  var RANSOM_EFFECT = {
    key: "ransom",
    label: "Ransom",
    controls: [
      { kind: "slider", prop: "ransomTilt", label: "Tilt (°)", min: 0, max: 45, fallback: 8 },
      { kind: "slider", prop: "ransomShift", label: "Up/down (%)", min: 0, max: 50, fallback: 10 },
      { kind: "slider", prop: "ransomSize", label: "Size variation (%)", min: 0, max: 60, fallback: 12 },
      {
        kind: "select",
        prop: "ransomTiles",
        label: "Letter tiles",
        fallback: "none",
        options: [{ key: "none", label: "None" }, { key: "paper", label: "Cut-out paper" }]
      },
      { kind: "slider", prop: "ransomVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ],
    hint: "Each letter gets its own tilt, height and size, like letters cut from a magazine."
  };
  var DISTRESS_EFFECT = {
    key: "distress",
    label: "Distress",
    controls: [
      { kind: "slider", prop: "distressGrit", label: "Nicks", min: 0, max: 100, fallback: 40 },
      { kind: "slider", prop: "distressDust", label: "Specks", min: 0, max: 100, fallback: 25 },
      { kind: "slider", prop: "distressScratches", label: "Scratches", min: 0, max: 100, fallback: 20 },
      { kind: "slider", prop: "distressVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  var CURVE_EFFECT = {
    key: "curve",
    label: "Curve",
    controls: [
      { kind: "slider", prop: "curveBend", label: "Bend (%)", min: -100, max: 100, fallback: 50 }
    ],
    hint: "Bends each line along an arc. Shown straight while you type."
  };
  var TEXT_EFFECTS = [STROKE_EFFECT, SHADOW_EFFECT, TEXT_GRADIENT_EFFECT, TEXT_LABEL_EFFECT, RANSOM_EFFECT, CURVE_EFFECT, DISTRESS_EFFECT];
  var RANSOM_PAPER_COLORS = ["#f4efe1", "#ffe066", "#ff8fa3", "#8ecae6", "#b7e4c7", "#ffffff"];
  var TEXT_PHOTO_CONTROLS = [
    { kind: "slider", prop: "fillScale", label: "Photo scale (%)", min: 20, max: 400, fallback: 100 },
    { kind: "slider", prop: "fillX", label: "Photo X (%)", min: -100, max: 100, fallback: 0 },
    { kind: "slider", prop: "fillY", label: "Photo Y (%)", min: -100, max: 100, fallback: 0 },
    { kind: "slider", prop: "fillPhotoAlpha", label: "Photo opacity (%)", min: 0, max: 100, fallback: 100 }
  ];
  var TEXT_PHOTO_PROPS = ["fillSrc", "fillNatW", "fillNatH", ...TEXT_PHOTO_CONTROLS.map((c) => c.prop)];
  var DEFAULT_FONT_OPTIONS = ["Inter", "Georgia", "Courier New", "Comic Sans MS", "Impact"];
  var TEXT_COLOR_SWATCHES = ["#1a1a1a", "#ffffff", "#dd531a", "#2563eb", "#16a34a", "#dc2626", "#eab308"];

  // apps/ZEditor/src/render/boxEffects.js
  function drawTextureMarks(ctx, ann) {
    const { width: w, height: h } = ann;
    const shortSide = Math.min(w, h);
    const longSide = Math.max(w, h);
    const { textureColor, textureGrit, textureDust, textureScratches, textureVariation } = effectSettings(ann, TEXTURE_EFFECT);
    const atLeast = (minimum, size) => Math.max(minimum, size);
    const paintMarks = (stream, count, alpha, paint, addMark) => {
      const noise = noiseStream(textureVariation, stream);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < Math.round(count); i++) addMark(noise);
      paint();
    };
    const fill = () => ctx.fill();
    const stroke = () => ctx.stroke();
    ctx.save();
    ctx.fillStyle = textureColor;
    ctx.strokeStyle = textureColor;
    ctx.lineCap = "round";
    paintMarks(1, textureGrit * 60, 0.85, fill, (noise) => {
      const size = atLeast(0.5, shortSide * (2e-3 + noise() * 6e-3));
      ctx.rect(noise() * w, noise() * h, size, size);
    });
    paintMarks(2, textureDust * 1.5, 0.75, fill, (noise) => {
      const radius = atLeast(0.4, shortSide * (2e-3 + noise() ** 2 * 0.012));
      const x = noise() * w, y = noise() * h;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    });
    ctx.lineWidth = atLeast(0.4, shortSide * 2e-3);
    paintMarks(3, textureDust * 0.8, 0.75, stroke, (noise) => {
      const x = noise() * w, y = noise() * h;
      const heading = noise() * Math.PI * 2;
      const length = shortSide * (0.02 + noise() * 0.08);
      const bend = (noise() - 0.5) * 1.6;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(heading + bend) * length * 0.6,
        y + Math.sin(heading + bend) * length * 0.6,
        x + Math.cos(heading) * length,
        y + Math.sin(heading) * length
      );
    });
    ctx.lineWidth = atLeast(0.4, shortSide * 15e-4);
    paintMarks(4, textureScratches * 0.3, 0.6, stroke, (noise) => {
      const x = noise() * w, y = noise() * h;
      const heading = -Math.PI / 2 + (noise() - 0.5) * 0.7;
      const length = longSide * (0.15 + noise() * 0.6);
      const bend = (noise() - 0.5) * 0.08;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(heading + bend) * length * 0.5,
        y + Math.sin(heading + bend) * length * 0.5,
        x + Math.cos(heading) * length,
        y + Math.sin(heading) * length
      );
    });
    ctx.restore();
  }
  function rotateAboutCenter(ctx, ann, centerX, centerY) {
    const angle = angleOf(ann);
    if (!angle) return;
    ctx.translate(centerX, centerY);
    ctx.rotate(angle * Math.PI / 180);
    ctx.translate(-centerX, -centerY);
  }
  function drawBoxWithEffects(ctx, ann, scaleFactor, paintContent) {
    const x = ann.x * scaleFactor, y = ann.y * scaleFactor;
    const w = ann.width * scaleFactor, h = ann.height * scaleFactor;
    ctx.save();
    rotateAboutCenter(ctx, ann, x + w / 2, y + h / 2);
    const shadow = imageShadowOffset(ann);
    if (shadow) {
      ctx.shadowColor = shadow.color;
      ctx.shadowOffsetX = shadow.x * scaleFactor;
      ctx.shadowOffsetY = shadow.y * scaleFactor;
      ctx.shadowBlur = shadow.blur * scaleFactor;
    }
    const outline = imageEdgeOutline(ann);
    const stroke = ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null;
    if (outline || stroke || ann.texture) {
      const pad = stroke ? Math.ceil(stroke.strokeThickness * STROKE_MITER_LIMIT / 2 * scaleFactor) + 2 : 0;
      const cut = document.createElement("canvas");
      cut.width = Math.max(1, Math.ceil(w)) + pad * 2;
      cut.height = Math.max(1, Math.ceil(h)) + pad * 2;
      const cctx = cut.getContext("2d");
      cctx.translate(pad, pad);
      cctx.scale(scaleFactor, scaleFactor);
      cctx.save();
      if (outline) cctx.clip(new Path2D(outline));
      paintContent(cctx);
      if (ann.texture) drawTextureMarks(cctx, ann);
      cctx.restore();
      if (stroke) {
        cctx.strokeStyle = stroke.strokeColor;
        cctx.lineWidth = stroke.strokeThickness;
        cctx.lineJoin = "miter";
        cctx.miterLimit = STROKE_MITER_LIMIT;
        cctx.stroke(new Path2D(outline || rectOutline(ann)));
      }
      ctx.drawImage(cut, x - pad, y - pad);
    } else {
      ctx.translate(x, y);
      ctx.scale(scaleFactor, scaleFactor);
      paintContent(ctx);
    }
    ctx.restore();
  }
  async function drawWithOpacity(ctx, opacity, draw, blend) {
    const mixes = blend && blend !== "normal";
    if (opacity >= 1 && !mixes) {
      await draw(ctx);
      return;
    }
    const layer = document.createElement("canvas");
    layer.width = ctx.canvas.width;
    layer.height = ctx.canvas.height;
    await draw(layer.getContext("2d"));
    ctx.save();
    ctx.globalAlpha = opacity;
    if (mixes) ctx.globalCompositeOperation = blend;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  // apps/ZEditor/src/model/color.js
  function rgbaCss(hex, alphaPercent) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alphaPercent / 100})`;
  }
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
  }

  // apps/ZEditor/src/render/filters/luma.js
  function lumaOverWhite(data, index) {
    const alpha = data[index + 3] / 255;
    const luma = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    return luma * alpha + 255 * (1 - alpha);
  }
  var LUMINANCE_MATRIX_VALUES = "0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0";

  // apps/ZEditor/src/render/filters/colorRemap.js
  function applyColorRemap(ctx, canvas, filter) {
    const { width, height } = canvas;
    if (width === 0 || height === 0) return;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    if (filter.type === "grayscale") {
      for (let i = 0; i < data.length; i += 4) {
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = lum;
      }
    } else if (filter.type === "duotone") {
      const dark = hexToRgb(filter.darkColor || DEFAULT_DUOTONE_DARK);
      const light = hexToRgb(filter.lightColor || DEFAULT_DUOTONE_LIGHT);
      for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        data[i] = dark.r + (light.r - dark.r) * lum;
        data[i + 1] = dark.g + (light.g - dark.g) * lum;
        data[i + 2] = dark.b + (light.b - dark.b) * lum;
      }
    } else if (filter.type === "threshold") {
      const { level, inkColor, paperColor } = controlValues(filter, THRESHOLD_FILTER_CONTROLS);
      const ink = hexToRgb(inkColor);
      const paper = hexToRgb(paperColor);
      for (let i = 0; i < data.length; i += 4) {
        const lum = lumaOverWhite(data, i);
        const c = lum >= level ? paper : ink;
        data[i] = c.r;
        data[i + 1] = c.g;
        data[i + 2] = c.b;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // apps/ZEditor/src/render/filters/halftone.js
  var BAYER_8X8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];
  var CMYK_PLATES = [
    { ink: "#00ffff", angleOffset: 15, channel: 0 },
    { ink: "#ff00ff", angleOffset: 75, channel: 1 },
    { ink: "#ffff00", angleOffset: 0, channel: 2 },
    { ink: "#000000", angleOffset: 45, channel: 3 }
  ];
  function cmykCoverage(r, g, b, channel) {
    const k = 1 - Math.max(r, g, b);
    if (channel === 3) return k;
    if (k >= 1) return 0;
    return (1 - [r, g, b][channel] - k) / (1 - k);
  }
  function drawHalftoneScreen(ctx, sourceImageData, width, height, cellSize, filter) {
    const { colorMode, angle, color } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (colorMode !== "cmyk") {
      drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, angle, color, -1);
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (const plate of CMYK_PLATES) {
      drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, (angle + plate.angleOffset) % 180, plate.ink, plate.channel);
    }
    ctx.restore();
  }
  function drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, angle, color, channel) {
    const data = sourceImageData.data;
    const { screen, lineBlend } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
    const isDither = screen === "dither";
    const toLine = lineBlend / 100;
    const maxRadius = cellSize * 0.62;
    const rotated = angle !== 0;
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians), sin = Math.sin(radians);
    const corners = [[0, 0], [width, 0], [0, height], [width, height]];
    const us = corners.map(([x, y]) => x * cos + y * sin);
    const vs = corners.map(([x, y]) => y * cos - x * sin);
    const maxU = Math.max(...us), maxV = Math.max(...vs);
    ctx.save();
    ctx.fillStyle = color;
    ctx.rotate(radians);
    ctx.beginPath();
    const isPureDots = !isDither && toLine === 0;
    const batchSize = isPureDots ? 1 : 4096;
    let batched = 0;
    const markAdded = () => {
      if (++batched < batchSize) return;
      ctx.fill();
      ctx.beginPath();
      batched = 0;
    };
    for (let gridV = Math.floor(Math.min(...vs) / cellSize); gridV * cellSize < maxV; gridV++) {
      for (let gridU = Math.floor(Math.min(...us) / cellSize); gridU * cellSize < maxU; gridU++) {
        const centerU = (gridU + 0.5) * cellSize;
        const centerV = (gridV + 0.5) * cellSize;
        const cx = centerU * cos - centerV * sin - cellSize / 2;
        const cy = centerU * sin + centerV * cos - cellSize / 2;
        const x0 = Math.max(0, Math.floor(cx));
        const y0 = Math.max(0, Math.floor(cy));
        const x1 = Math.min(width, Math.max(x0 + 1, Math.floor(cx + cellSize)));
        const y1 = Math.min(height, Math.max(y0 + 1, Math.floor(cy + cellSize)));
        let sum = 0, sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (let y = y0; y < y1; y++) {
          const rowStart = y * width * 4;
          for (let x = x0; x < x1; x++) {
            const idx = rowStart + x * 4;
            if (channel < 0) {
              sum += lumaOverWhite(data, idx);
            } else {
              const alpha = data[idx + 3] / 255;
              const paper = 255 * (1 - alpha);
              sumR += data[idx] * alpha + paper;
              sumG += data[idx + 1] * alpha + paper;
              sumB += data[idx + 2] * alpha + paper;
            }
            count++;
          }
        }
        if (!count) continue;
        const avgLum = channel < 0 ? sum / count / 255 : 1 - cmykCoverage(sumR / count / 255, sumG / count / 255, sumB / count / 255, channel);
        if (isDither) {
          if (avgLum < (BAYER_8X8[gridV & 7][gridU & 7] + 0.5) / 64) {
            ctx.rect(centerU - cellSize / 2, centerV - cellSize / 2, cellSize, cellSize);
            markAdded();
          }
          continue;
        }
        const radius = (1 - avgLum) * maxRadius;
        const halfLength = radius + (cellSize / 2 + 0.25 - radius) * toLine;
        const halfHeight = radius + ((1 - avgLum) * cellSize / 2 - radius) * toLine;
        if (halfHeight > 0.4) {
          const u = rotated ? centerU : cx + Math.min(cellSize, width - cx) / 2;
          const v = rotated ? centerV : cy + Math.min(cellSize, height - cy) / 2;
          if (isPureDots) ctx.arc(u, v, radius, 0, Math.PI * 2);
          else ctx.roundRect(u - halfLength, v - halfHeight, halfLength * 2, halfHeight * 2, Math.min(halfLength, halfHeight) * (1 - toLine));
          markAdded();
        }
      }
    }
    ctx.fill();
    ctx.restore();
  }

  // apps/ZEditor/src/render/filters/xerox.js
  function applyXerox(ctx, canvas, filter, scaleFactor) {
    const { width, height } = canvas;
    const { contrast, exposure, speckle, streaks, edgeWear, xeroxVariation, inkColor, paperColor } = controlValues(filter, XEROX_FILTER_CONTROLS);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const ink = hexToRgb(inkColor);
    const paper = hexToRgb(paperColor);
    const gain = 1 + contrast / 100 * 15;
    const cutoff = 1 - exposure / 100;
    const speckleAmount = speckle / 100;
    const wearAmount = edgeWear / 100;
    const imageW = width / scaleFactor;
    const imageH = height / scaleFactor;
    const wearZone = Math.min(imageW, imageH) * 0.1;
    const darkShare = 0.2 * streaks / 100;
    const paleShare = darkShare / 2;
    const streakShift = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      const h = seededNoise(Math.floor(x / scaleFactor / 2.5), xeroxVariation);
      if (h > 1 - darkShare) streakShift[x] = -(0.5 + 0.5 * (h - (1 - darkShare)) / darkShare);
      else if (h < paleShare) streakShift[x] = 0.5 + 0.5 * (paleShare - h) / paleShare;
    }
    for (let y = 0; y < height; y++) {
      const imageY = y / scaleFactor;
      const cellY = Math.floor(imageY);
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const imageX = x / scaleFactor;
        const cellX = Math.floor(imageX);
        const lum = lumaOverWhite(data, i) / 255;
        let tone = Math.min(1, Math.max(0, (lum - cutoff) * gain + 0.5));
        tone += (seededNoise(cellX, xeroxVariation, cellY) - 0.5) * speckleAmount;
        tone += streakShift[x];
        if (seededNoise(cellX + 7919, xeroxVariation, cellY + 104729) < speckleAmount * 0.03) {
          tone = tone > 0.5 ? 0 : 1;
        }
        const edgeDistance = Math.min(imageX, imageY, imageW - imageX, imageH - imageY);
        if (edgeDistance < wearZone) {
          const worn = wearAmount * (1 - edgeDistance / wearZone) ** 2;
          if (seededNoise(cellX + 15485, xeroxVariation, cellY + 32452) < worn) tone = 1;
        }
        tone = Math.min(1, Math.max(0, tone));
        data[i] = ink.r + (paper.r - ink.r) * tone;
        data[i + 1] = ink.g + (paper.g - ink.g) * tone;
        data[i + 2] = ink.b + (paper.b - ink.b) * tone;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // apps/ZEditor/src/render/filters/applyFilter.js
  function applyPageFilter(ctx, canvas, filter, scaleFactor) {
    if (!filter || filter.type === "none" || canvas.width === 0 || canvas.height === 0) return;
    if (filter.type === "grayscale" || filter.type === "duotone" || filter.type === "threshold") {
      applyColorRemap(ctx, canvas, filter);
    } else if (filter.type === "halftone") {
      const { width, height } = canvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const { cellSize } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
      const sourceAlpha = new Uint8ClampedArray(width * height);
      let hasTransparency = false;
      for (let p = 0; p < sourceAlpha.length; p++) {
        sourceAlpha[p] = imageData.data[p * 4 + 3];
        if (sourceAlpha[p] < 255) hasTransparency = true;
      }
      drawHalftoneScreen(ctx, imageData, width, height, Math.max(MIN_HALFTONE_CELL_SIZE, cellSize * scaleFactor), filter);
      if (hasTransparency) {
        const result = ctx.getImageData(0, 0, width, height);
        for (let p = 0; p < sourceAlpha.length; p++) result.data[p * 4 + 3] = sourceAlpha[p];
        ctx.putImageData(result, 0, 0);
      }
    } else if (filter.type === "xerox") {
      applyXerox(ctx, canvas, filter, scaleFactor);
    }
  }

  // apps/ZEditor/src/render/photoAdjust.js
  function applyPhotoAdjust(ctx, canvas, ann) {
    const { width, height } = canvas;
    if (width === 0 || height === 0) return;
    const v = controlValues(ann, PHOTO_ADJUST_CONTROLS);
    const black = v.adjBlack;
    const white = Math.max(black + 1, v.adjWhite);
    const invGamma = 1 / (v.adjGamma / 100);
    const gain = Math.pow(2, v.adjExposure / 50);
    const offset = v.adjBrightness * 1.2;
    const c = v.adjContrast * 1.2;
    const contrast = 259 * (c + 255) / (255 * (259 - c));
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      const level = Math.pow(Math.min(1, Math.max(0, (i - black) / (white - black))), invGamma) * 255;
      lut[i] = (level * gain + offset - 128) * contrast + 128;
    }
    const shadows = v.adjShadows * 0.9, highlights = v.adjHighlights * 0.9;
    const toneMapped = shadows !== 0 || highlights !== 0;
    const warm = v.adjTemperature / 100, tint = v.adjTint / 100;
    const balanced = warm !== 0 || tint !== 0;
    const saturation = 1 + v.adjSaturation / 100;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      let r = lut[data[i]], g = lut[data[i + 1]], b = lut[data[i + 2]];
      if (toneMapped) {
        const l = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const shift = shadows * (1 - l) * (1 - l) + highlights * l * l;
        r += shift;
        g += shift;
        b += shift;
      }
      if (balanced) {
        r *= 1 + warm * 0.3 + tint * 0.1;
        g *= 1 - tint * 0.3;
        b *= 1 - warm * 0.3 + tint * 0.1;
      }
      if (saturation !== 1) {
        const l = r * 0.299 + g * 0.587 + b * 0.114;
        r = l + (r - l) * saturation;
        g = l + (g - l) * saturation;
        b = l + (b - l) * saturation;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // apps/ZEditor/src/render/drawImage.js
  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Couldn't load a placed image for export."));
      img.src = src;
    });
  }
  async function drawImageOnCanvas(ctx, ann, scaleFactor, pageFilter) {
    const img = await loadImageElement(ann.src);
    const x = ann.x * scaleFactor, y = ann.y * scaleFactor;
    const w = ann.width * scaleFactor, h = ann.height * scaleFactor;
    let sx = ann.cropX || 0, sy = ann.cropY || 0;
    let sw = ann.cropW || img.naturalWidth || w, sh = ann.cropH || img.naturalHeight || h;
    let source = img;
    const imgFilter = effectiveImageFilter(ann, pageFilter);
    const filterType = imgFilter.type;
    const adjusted = hasPhotoAdjust(ann);
    if (filterType && filterType !== "none" || adjusted) {
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(w));
      off.height = Math.max(1, Math.round(h));
      const octx = off.getContext("2d");
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
      if (adjusted) applyPhotoAdjust(octx, off, ann);
      applyPageFilter(octx, off, imgFilter, scaleFactor);
      source = off;
      sx = 0;
      sy = 0;
      sw = off.width;
      sh = off.height;
    }
    drawBoxWithEffects(ctx, ann, scaleFactor, (target) => {
      target.drawImage(source, sx, sy, sw, sh, 0, 0, ann.width, ann.height);
    });
  }

  // apps/ZEditor/src/model/strokes.js
  var PEN_COLOR_SWATCHES = ["#1a1a1a", "#dd531a", "#dc2626", "#2563eb"];
  var HIGHLIGHTER_COLOR_SWATCHES = ["#ffe066", "#ffb84d", "#7ec8ff", "#ff9ecf", "#7dffb3"];
  var PEN_DEFAULTS = { color: "#1a1a1a", width: 2.5 };
  var HIGHLIGHTER_DEFAULTS = { color: "#ffe066", width: 14 };
  function smoothPathD(points) {
    if (points.length < 2) return "";
    if (points.length === 2) {
      return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;
    }
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      d += ` Q ${x0},${y0} ${mx},${my}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last[0]},${last[1]}`;
    return d;
  }
  function distToSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a[0] + t * dx, cy = a[1] + t * dy;
    return Math.hypot(p[0] - cx, p[1] - cy);
  }
  function strokeHitTest(point, ann) {
    const threshold = (ann.strokeWidth || 8) / 2 + 6;
    for (let i = 0; i < ann.points.length - 1; i++) {
      if (distToSegment(point, ann.points[i], ann.points[i + 1]) <= threshold) return true;
    }
    return false;
  }
  function taperedPathD(points, baseWidth, taper) {
    if (points.length < 2) return "";
    const dists = [0];
    for (let i = 1; i < points.length; i++) {
      dists.push(dists[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    const total = dists[dists.length - 1] || 1;
    const tf = Math.min(0.45, Math.max(0, taper));
    function widthAt(t) {
      if (tf <= 0) return baseWidth;
      let factor;
      if (t < tf) factor = t / tf;
      else if (t > 1 - tf) factor = (1 - t) / tf;
      else factor = 1;
      return Math.max(baseWidth * 0.12, baseWidth * factor);
    }
    const left = [], right = [];
    for (let i = 0; i < points.length; i++) {
      const t = dists[i] / total;
      const w = widthAt(t) / 2;
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      let dx = next[0] - prev[0], dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const nx = -dy, ny = dx;
      left.push([points[i][0] + nx * w, points[i][1] + ny * w]);
      right.push([points[i][0] - nx * w, points[i][1] - ny * w]);
    }
    let d = `M ${left[0][0]},${left[0][1]}`;
    for (let i = 1; i < left.length; i++) d += ` L ${left[i][0]},${left[i][1]}`;
    for (let i = right.length - 1; i >= 0; i--) d += ` L ${right[i][0]},${right[i][1]}`;
    d += " Z";
    return d;
  }

  // apps/ZEditor/src/render/gradients.js
  function rectGradientStops(ann) {
    const v = controlValues(ann, RECT_CONTROLS);
    const c1 = hexToRgb(v.fillColor), c2 = hexToRgb(v.gradientColor);
    const a1 = v.fillAlpha / 100, a2 = v.gradientAlpha / 100;
    const start = v.gradientStart, end = Math.max(v.gradientStart, v.gradientEnd);
    const steps = a1 === a2 ? 1 : 16;
    const stops = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = a1 + (a2 - a1) * t;
      const channel = (p, q) => {
        const premultiplied = p * a1 + (q * a2 - p * a1) * t;
        return Math.round(a > 0 ? premultiplied / a : p + (q - p) * t);
      };
      stops.push({
        percent: start + (end - start) * t,
        color: `rgba(${channel(c1.r, c2.r)},${channel(c1.g, c2.g)},${channel(c1.b, c2.b)},${+a.toFixed(4)})`
      });
    }
    return stops;
  }
  function rectFillCss(ann) {
    const v = controlValues(ann, RECT_CONTROLS);
    if (v.fillType === "solid") {
      const { r, g, b } = hexToRgb(v.fillColor);
      return `rgba(${r},${g},${b},${v.fillAlpha / 100})`;
    }
    const stops = rectGradientStops(ann).map((s) => `${s.color} ${s.percent}%`).join(", ");
    return v.fillType === "linear" ? `linear-gradient(${v.gradientAngle}deg, ${stops})` : `radial-gradient(ellipse farthest-corner at 50% 50%, ${stops})`;
  }
  function makeLinearGradient(ctx, angleDegrees, stops, x, y, w, h) {
    const radians = angleDegrees * Math.PI / 180;
    const dx = Math.sin(radians), dy = -Math.cos(radians);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    const centerX = x + w / 2, centerY = y + h / 2;
    const gradient = ctx.createLinearGradient(centerX - dx * half, centerY - dy * half, centerX + dx * half, centerY + dy * half);
    stops.forEach((s) => gradient.addColorStop(s.percent / 100, s.color));
    return gradient;
  }
  function paintRectFill(ctx, ann) {
    const v = controlValues(ann, RECT_CONTROLS);
    const w = ann.width, h = ann.height;
    if (v.fillType === "solid") {
      const { r, g, b } = hexToRgb(v.fillColor);
      ctx.fillStyle = `rgba(${r},${g},${b},${v.fillAlpha / 100})`;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const stops = rectGradientStops(ann);
    if (v.fillType === "linear") {
      ctx.fillStyle = makeLinearGradient(ctx, v.gradientAngle, stops, 0, 0, w, h);
      ctx.fillRect(0, 0, w, h);
    } else {
      const reach = Math.SQRT2;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(w / 2 * reach, h / 2 * reach);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      stops.forEach((s) => gradient.addColorStop(s.percent / 100, s.color));
      ctx.fillStyle = gradient;
      ctx.fillRect(-1 / reach, -1 / reach, 2 / reach, 2 / reach);
      ctx.restore();
    }
  }

  // apps/ZEditor/src/render/drawShapes.js
  function drawStrokeOnCanvas(ctx, ann, scaleFactor) {
    const isHi = ann.tool === "highlighter";
    const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
    const width = (ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width)) * scaleFactor;
    const taper = ann.taper || 0;
    const pts = ann.points.map((p) => [p[0] * scaleFactor, p[1] * scaleFactor]);
    ctx.save();
    ctx.globalAlpha = isHi ? 0.45 : 1;
    if (taper > 0) {
      ctx.fillStyle = color;
      ctx.fill(new Path2D(taperedPathD(pts, width, taper)));
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(new Path2D(smoothPathD(pts)));
    }
    ctx.restore();
  }
  function drawRectOnCanvas(ctx, ann, scaleFactor) {
    drawBoxWithEffects(ctx, ann, scaleFactor, (target) => paintRectFill(target, ann));
  }

  // apps/ZEditor/src/model/text/colorRuns.js
  function normalizeRuns(runs) {
    const sorted = (runs || []).filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
    const merged = [];
    for (const run of sorted) {
      const last = merged[merged.length - 1];
      if (last && last.end === run.start && last.color === run.color) last.end = run.end;
      else merged.push({ ...run });
    }
    return merged;
  }
  function setRunColor(runs, start, end, color) {
    const next = [];
    for (const run of runs || []) {
      if (run.end <= start || run.start >= end) {
        next.push(run);
        continue;
      }
      if (run.start < start) next.push({ ...run, end: start });
      if (run.end > end) next.push({ ...run, start: end });
    }
    if (color) next.push({ start, end, color });
    return normalizeRuns(next);
  }
  function adjustRunsForEdit(runs, oldText, newText) {
    if (!runs || !runs.length) return runs;
    let start = 0;
    const maxStart = Math.min(oldText.length, newText.length);
    while (start < maxStart && oldText[start] === newText[start]) start++;
    let tail = 0;
    const maxTail = maxStart - start;
    while (tail < maxTail && oldText[oldText.length - 1 - tail] === newText[newText.length - 1 - tail]) tail++;
    const removedEnd = oldText.length - tail;
    const insertedLength = newText.length - start - tail;
    const delta = insertedLength - (removedEnd - start);
    const mapStart = (pos) => pos < start ? pos : pos >= removedEnd ? pos + delta : start + insertedLength;
    const mapEnd = (pos) => pos >= removedEnd ? pos + delta : pos <= start ? pos : start;
    return normalizeRuns(runs.map((run) => ({ ...run, start: mapStart(run.start), end: mapEnd(run.end) })));
  }
  function colorSegments(text, runs) {
    const segments = [];
    let position = 0;
    for (const run of runs || []) {
      if (run.start > position) segments.push({ text: text.slice(position, run.start), color: null });
      segments.push({ text: text.slice(run.start, run.end), color: run.color });
      position = run.end;
    }
    if (position < text.length) segments.push({ text: text.slice(position), color: null });
    return segments.filter((s) => s.text.length > 0);
  }
  function colorAtIndex(runs, index) {
    for (const run of runs || []) if (index >= run.start && index < run.end) return run.color;
    return null;
  }

  // apps/ZEditor/src/model/text/textLook.js
  function caseText(text, mode) {
    if (mode === "upper") return text.toUpperCase();
    if (mode === "lower") return text.toLowerCase();
    if (mode === "title") return text.replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (m, before, letter) => before + letter.toUpperCase());
    return text;
  }
  function stackText(text) {
    return Array.from(text).map((ch) => ch === "\n" ? "" : ch).join("\n");
  }
  var usesCanvasText = (ann) => Boolean(ann.ransom || ann.distress || ann.curve || ann.vertical === "stacked" || ann.fitHeight > 0 || ann.colorRuns && ann.colorRuns.length);
  function textLook(ann) {
    const fontSize = ann.fontSize || 16;
    const spacing = controlValues(ann, [LETTER_SPACING_CONTROL]).letterSpacing;
    const color = ann.color || "#1a1a1a";
    const fillAlpha = controlValues(ann, [TEXT_FILL_ALPHA_CONTROL]).fillAlpha;
    const photo = ann.fillSrc ? { src: ann.fillSrc, natW: ann.fillNatW, natH: ann.fillNatH, ...controlValues(ann, TEXT_PHOTO_CONTROLS) } : null;
    const gradient = ann.textGradient ? effectSettings(ann, TEXT_GRADIENT_EFFECT) : null;
    const label = ann.labelBox ? effectSettings(ann, TEXT_LABEL_EFFECT) : null;
    return {
      photo,
      ransom: ann.ransom ? effectSettings(ann, RANSOM_EFFECT) : null,
      curve: ann.curve ? effectSettings(ann, CURVE_EFFECT) : null,
      distress: ann.distress ? effectSettings(ann, DISTRESS_EFFECT) : null,
      lineHeight: controlValues(ann, [LINE_SPACING_CONTROL]).lineSpacing / 100,
      letterSpacingPx: fontSize * spacing / 100,
      strike: controlValues(ann, [STRIKE_CONTROL]).strike,
      textCase: controlValues(ann, [CASE_CONTROL]).textCase,
      stacked: controlValues(ann, [VERTICAL_CONTROL]).vertical === "stacked",
      color,
      fillAlpha,
      stroke: ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null,
      shadow: imageShadowOffset(ann),
      gradient,
      label,
      // The box's inner padding grows by the label's padding so the bar sits around the text.
      padX: 4 + (label ? label.labelPadding : 0),
      padY: 2 + (label ? label.labelPadding : 0)
    };
  }
  function photoPlacement(photo, w, h) {
    const cover = Math.max(w / photo.natW, h / photo.natH) * photo.fillScale / 100;
    const photoW = photo.natW * cover, photoH = photo.natH * cover;
    return {
      width: photoW,
      height: photoH,
      left: (w - photoW) / 2 + photo.fillX / 100 * w,
      top: (h - photoH) / 2 + photo.fillY / 100 * h
    };
  }
  function textGradientView(ann, look) {
    return { fillType: "linear", fillColor: look.color, fillAlpha: look.fillAlpha, ...look.gradient };
  }

  // apps/ZEditor/src/render/textLayout.js
  function fitText(ann) {
    if (!ann.fitHeight || !ann.text) return ann;
    const base = { ...ann, fitHeight: void 0 };
    if (measureTextBox(base).height <= ann.fitHeight) return base;
    let lo = 4, hi = ann.fontSize || 16;
    for (let i = 0; i < 12 && hi - lo > 0.25; i++) {
      const mid = (lo + hi) / 2;
      if (measureTextBox({ ...base, fontSize: mid }).height <= ann.fitHeight) lo = mid;
      else hi = mid;
    }
    return { ...base, fontSize: Math.floor(lo * 4) / 4 };
  }
  var WRAP_CJK_RE = /[⺀-〿぀-ヿ㄀-ㄯ㐀-䶿一-鿿가-힯豈-﫿︰-﹏＀-￯\u{20000}-\u{3FFFF}]/u;
  var WRAP_NO_LINE_START = "，。、．：；！？）］｝】〕〉》」』”’…ー";
  function wrapAtoms(word) {
    const atoms = [];
    let run = "";
    for (const ch of Array.from(word)) {
      if (WRAP_CJK_RE.test(ch)) {
        if (run) {
          atoms.push(run);
          run = "";
        }
        if (atoms.length && WRAP_NO_LINE_START.includes(ch)) atoms[atoms.length - 1] += ch;
        else atoms.push(ch);
      } else {
        run += ch;
      }
    }
    if (run) atoms.push(run);
    return atoms;
  }
  function wrapTextLines(ctx, text, maxWidth, measure = (s) => ctx.measureText(s).width) {
    const lines = [];
    const cutToFit = (piece) => {
      let chunk = "";
      for (const ch of Array.from(piece)) {
        if (chunk && measure(chunk + ch) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      return chunk;
    };
    for (const para of (text || "").split("\n")) {
      if (para === "") {
        lines.push("");
        continue;
      }
      let current = "";
      para.split(" ").forEach((word, wordIndex) => {
        const atoms = word === "" ? [""] : wrapAtoms(word);
        atoms.forEach((atom, atomIndex) => {
          const joiner = atomIndex === 0 && wordIndex > 0 ? " " : "";
          const test = current + joiner + atom;
          if (current && measure(test) > maxWidth) {
            lines.push(current);
            current = measure(atom) > maxWidth ? cutToFit(atom) : atom;
          } else if (!current && measure(test) > maxWidth) {
            current = cutToFit(test);
          } else {
            current = test;
          }
        });
      });
      lines.push(current);
    }
    return lines;
  }
  function layoutText(ctx, ann, scaleFactor) {
    ann = fitText(ann);
    const look = textLook(ann);
    const cased = caseText(ann.text || "", look.textCase);
    const shownText = look.stacked ? stackText(cased) : cased;
    const fontSize = (ann.fontSize || 16) * scaleFactor;
    const weight = ann.bold ? "700" : "400";
    const styleStr = ann.italic ? "italic" : "normal";
    const family = ann.fontFamily || "sans-serif";
    const variant = look.textCase === "small" ? "small-caps " : "";
    ctx.font = `${styleStr} ${variant}${weight} ${fontSize}px '${family}', sans-serif`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${look.letterSpacingPx * scaleFactor}px`;
    ctx.textBaseline = "alphabetic";
    ctx.font = `${styleStr} ${variant}${weight} ${ann.fontSize || 16}px '${family}', sans-serif`;
    const metrics = ctx.measureText("Hg");
    ctx.font = `${styleStr} ${variant}${weight} ${fontSize}px '${family}', sans-serif`;
    const ascent = (metrics.fontBoundingBoxAscent != null ? Math.round(metrics.fontBoundingBoxAscent) : (ann.fontSize || 16) * 0.8) * scaleFactor;
    const descent = (metrics.fontBoundingBoxDescent != null ? Math.round(metrics.fontBoundingBoxDescent) : (ann.fontSize || 16) * 0.2) * scaleFactor;
    const lineHeight = fontSize * look.lineHeight;
    const halfLeading = Math.floor(((ann.fontSize || 16) * look.lineHeight - (ascent + descent) / scaleFactor) / 2);
    const baselineOffset = halfLeading * scaleFactor + ascent;
    const x = ann.x * scaleFactor;
    const y = ann.y * scaleFactor;
    const padX = (look.padX + TEXT_BORDER_PX) * scaleFactor, padY = (look.padY + TEXT_BORDER_PX) * scaleFactor;
    const maxWidthCap = AUTO_TEXT_MAX_WIDTH * scaleFactor;
    const measure = look.ransom || look.curve ? (s) => Array.from(s).reduce((width, ch) => width + ctx.measureText(ch).width, 0) : (s) => ctx.measureText(s).width;
    let boxWidth;
    if (ann.width) {
      boxWidth = ann.width * scaleFactor;
    } else {
      const naturalWidth = Math.max(10, ...shownText.split("\n").map(measure));
      boxWidth = Math.min(naturalWidth + padX * 2, maxWidthCap);
    }
    const innerWidth = Math.max(4, boxWidth - padX * 2);
    const lines = wrapTextLines(ctx, shownText, innerWidth, measure);
    const lineStarts = [];
    let cursor = 0;
    if (look.stacked) {
      for (const ch of Array.from(ann.text || "")) {
        lineStarts.push(cursor);
        cursor += ch.length;
      }
    } else {
      for (const line of lines) {
        lineStarts.push(cursor);
        cursor += line.length;
        const next = shownText[cursor];
        if (next === "\n" || next === " ") cursor += 1;
      }
    }
    const textHeight = lines.length * lineHeight;
    let curve = null;
    if (look.curve && look.curve.curveBend !== 0) {
      const widest = Math.max(1, ...lines.map(measure));
      const radius = widest / (Math.abs(look.curve.curveBend) / 100 * Math.PI);
      curve = { radius, sign: look.curve.curveBend > 0 ? 1 : -1, sag: radius * (1 - Math.cos(widest / 2 / radius)) };
    }
    const boxHeight = textHeight + padY * 2 + (curve ? curve.sag : 0);
    return { look, fontSize, lineHeight, baselineOffset, x, y, padX, padY, boxWidth, innerWidth, lines, lineStarts, textHeight, boxHeight, measure, ascent, descent, curve };
  }
  function textCanvasMargin(ann, look) {
    const fontSize = ann.fontSize || 16;
    let margin = 2;
    if (look.stroke) margin += look.stroke.strokeThickness * 2;
    if (look.shadow) margin += Math.hypot(look.shadow.x, look.shadow.y) + look.shadow.blur * 2;
    if (look.ransom) margin += fontSize * (look.ransom.ransomShift / 100 + 0.35 + look.ransom.ransomSize / 100);
    if (look.curve) margin += fontSize * 0.6;
    return Math.ceil(margin);
  }
  function measureTextBox(ann) {
    const ctx = document.createElement("canvas").getContext("2d");
    const { boxWidth, boxHeight, innerWidth, textHeight } = layoutText(ctx, ann, 1);
    return { width: boxWidth, height: boxHeight, contentWidth: innerWidth, contentHeight: textHeight };
  }

  // apps/ZEditor/src/render/drawText.js
  function drawTextDecorationLine(ctx, style, x0, x1, y, fontSize, color) {
    const thickness = Math.max(1, fontSize * 0.06);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    if (style === "double") {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.moveTo(x0, y + thickness * 1.8);
      ctx.lineTo(x1, y + thickness * 1.8);
    } else if (style === "wavy") {
      const amplitude = Math.max(1, fontSize * 0.07), wavelength = Math.max(4, fontSize * 0.4);
      const centre = y + fontSize * 0.09;
      for (let x = x0; x <= x1; x += 1) {
        const wave = centre + amplitude * Math.sin((x - x0) / wavelength * Math.PI * 2);
        if (x === x0) ctx.moveTo(x, wave);
        else ctx.lineTo(x, wave);
      }
    } else {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  async function drawTextOnCanvas(ctx, ann, scaleFactor) {
    const photoImg = ann.fillSrc ? await loadImageElement(ann.fillSrc) : null;
    ctx.save();
    const { look, fontSize, lineHeight, baselineOffset, x, y, padX, padY, boxWidth, innerWidth, lines, lineStarts, textHeight, boxHeight, measure, ascent, descent, curve } = layoutText(ctx, ann, scaleFactor);
    rotateAboutCenter(ctx, ann, x + boxWidth / 2, y + boxHeight / 2);
    if (look.label) {
      ctx.fillStyle = rgbaCss(look.label.labelColor, look.label.labelAlpha);
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, look.label.labelRadius * scaleFactor);
      ctx.fill();
    }
    const fill = look.gradient ? makeLinearGradient(ctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight) : rgbaCss(look.color, look.fillAlpha);
    const decoStyle = look.strike === "double" || look.strike === "wavy" ? look.strike : "solid";
    const setFont = (c) => {
      c.font = ctx.font;
      c.textBaseline = "alphabetic";
      if ("letterSpacing" in c) c.letterSpacing = ctx.letterSpacing;
    };
    const runs = [];
    const lineExtents = [];
    let letterIndex = 0;
    lines.forEach((line, i) => {
      const lineWidth = measure(line);
      let lineX = x + padX;
      if (ann.align === "center" || look.stacked) lineX = x + (boxWidth - lineWidth) / 2;
      else if (ann.align === "right") lineX = x + boxWidth - padX - lineWidth;
      const lineTop = y + padY + (curve && curve.sign < 0 ? curve.sag : 0) + i * lineHeight;
      const baselineY = lineTop + baselineOffset;
      const lineStart = lineStarts[i];
      if (!look.ransom && !curve) {
        const lineRuns = (ann.colorRuns || []).filter((r) => r.end > lineStart && r.start < lineStart + line.length).map((r) => ({ ...r, start: Math.max(r.start, lineStart) - lineStart, end: Math.min(r.end, lineStart + line.length) - lineStart }));
        const segments = [];
        let offset = 0;
        for (const seg of colorSegments(line, lineRuns)) {
          const segX = lineX + (offset ? measure(line.slice(0, offset)) : 0);
          offset += seg.text.length;
          const segEnd = lineX + measure(line.slice(0, offset));
          runs.push({ text: seg.text, x: segX, baselineY, color: seg.color });
          segments.push({ x0: segX, x1: segEnd, color: seg.color });
        }
        lineExtents.push({ line, lineX, lineWidth, baselineY, segments });
        return;
      }
      lineExtents.push({ line, lineX, lineWidth, baselineY, segments: [{ x0: lineX, x1: lineX + lineWidth, color: null }] });
      let cursor = lineX;
      let charIndex = 0;
      for (const ch of Array.from(line)) {
        const advance = ctx.measureText(ch).width;
        const k = letterIndex++;
        const run = { text: ch, x: cursor, baselineY, color: colorAtIndex(ann.colorRuns, lineStart + charIndex) };
        charIndex += ch.length;
        if (ch !== " ") {
          run.cx = cursor + advance / 2;
          run.cy = lineTop + lineHeight / 2;
          run.advance = advance;
          run.tilt = 0;
          run.dx = 0;
          run.dy = 0;
          run.scale = 1;
          if (look.ransom) {
            const seed = look.ransom.ransomVariation;
            run.tilt = (seededNoise(k * 4, seed) - 0.5) * 2 * look.ransom.ransomTilt * Math.PI / 180;
            run.dy = (seededNoise(k * 4 + 1, seed) - 0.5) * 2 * fontSize * look.ransom.ransomShift / 100;
            run.scale = 1 + (seededNoise(k * 4 + 2, seed) - 0.5) * 2 * look.ransom.ransomSize / 100;
            if (look.ransom.ransomTiles === "paper") {
              run.tile = RANSOM_PAPER_COLORS[Math.floor(seededNoise(k * 4 + 3, seed) * RANSOM_PAPER_COLORS.length)];
            }
          }
          if (curve) {
            const phi = (run.cx - (lineX + lineWidth / 2)) / curve.radius;
            run.tilt += curve.sign * phi;
            run.dx += curve.radius * Math.sin(phi) - phi * curve.radius;
            run.dy += curve.sign * curve.radius * (1 - Math.cos(phi));
          }
        }
        runs.push(run);
        cursor += advance;
      }
    });
    const withRun = (c, run, draw) => {
      c.save();
      if (run.tilt !== void 0) {
        c.translate(run.cx + run.dx, run.cy + run.dy);
        c.rotate(run.tilt);
        c.scale(run.scale, run.scale);
        c.translate(-run.cx, -run.cy);
      }
      draw(run);
      c.restore();
    };
    const fillsThroughLayer = Boolean(photoImg || look.gradient && (look.ransom || curve));
    const tilePad = fontSize * 0.06;
    const paintText = (c) => {
      setFont(c);
      runs.forEach((run) => {
        if (!run.tile) return;
        withRun(c, run, () => {
          c.fillStyle = run.tile;
          c.fillRect(run.x - tilePad, run.baselineY - ascent - tilePad, run.advance + tilePad * 2, ascent + descent + tilePad * 2);
        });
      });
      if (look.stroke) {
        runs.forEach((run) => withRun(c, run, () => {
          c.strokeStyle = look.stroke.strokeColor;
          c.lineWidth = look.stroke.strokeThickness * scaleFactor;
          c.lineJoin = "miter";
          c.miterLimit = 4;
          c.strokeText(run.text, run.x, run.baselineY);
        }));
      }
      const paintOwnColors = () => runs.forEach((run) => {
        if (!run.color) return;
        withRun(c, run, () => {
          c.fillStyle = rgbaCss(run.color, look.fillAlpha);
          c.fillText(run.text, run.x, run.baselineY);
        });
      });
      if (!fillsThroughLayer) {
        runs.forEach((run) => withRun(c, run, () => {
          c.fillStyle = run.color ? rgbaCss(run.color, look.fillAlpha) : fill;
          c.fillText(run.text, run.x, run.baselineY);
        }));
      } else {
        const letters = document.createElement("canvas");
        letters.width = c.canvas.width;
        letters.height = c.canvas.height;
        const lctx = letters.getContext("2d");
        lctx.setTransform(c.getTransform());
        setFont(lctx);
        lctx.fillStyle = "#000";
        runs.forEach((run) => {
          if (!run.color) withRun(lctx, run, () => lctx.fillText(run.text, run.x, run.baselineY));
        });
        lctx.globalCompositeOperation = "source-in";
        if (photoImg) {
          const place = photoPlacement(look.photo, innerWidth / scaleFactor, textHeight / scaleFactor);
          lctx.globalAlpha = look.photo.fillPhotoAlpha / 100;
          lctx.drawImage(photoImg, x + padX + place.left * scaleFactor, y + padY + place.top * scaleFactor, place.width * scaleFactor, place.height * scaleFactor);
          if (look.photo.fillPhotoAlpha < 100) {
            lctx.globalAlpha = 1;
            lctx.globalCompositeOperation = "destination-over";
            lctx.fillStyle = look.gradient ? makeLinearGradient(lctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight) : rgbaCss(look.color, look.fillAlpha);
            runs.forEach((run) => {
              if (!run.color) withRun(lctx, run, () => lctx.fillText(run.text, run.x, run.baselineY));
            });
          }
        } else {
          lctx.fillStyle = makeLinearGradient(lctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight);
          lctx.fillRect(x - fontSize * 2, y - fontSize * 2, boxWidth + fontSize * 4, boxHeight + fontSize * 4);
        }
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(letters, 0, 0);
        c.restore();
        paintOwnColors();
      }
      lineExtents.forEach(({ line, baselineY, segments }) => {
        if (!line || curve) return;
        segments.forEach(({ x0, x1, color }) => {
          const decoColor = color || look.color;
          if (ann.underline) drawTextDecorationLine(c, decoStyle, x0, x1, baselineY + fontSize * 0.12, fontSize, decoColor);
          if (look.strike !== "none") drawTextDecorationLine(c, decoStyle, x0, x1, baselineY - fontSize * 0.3, fontSize, decoColor);
        });
      });
    };
    if (look.shadow || look.distress) {
      const layer = document.createElement("canvas");
      layer.width = ctx.canvas.width;
      layer.height = ctx.canvas.height;
      const layerCtx = layer.getContext("2d");
      layerCtx.setTransform(ctx.getTransform());
      paintText(layerCtx);
      if (look.distress) {
        layerCtx.save();
        layerCtx.globalCompositeOperation = "destination-out";
        drawDistressMarks(layerCtx, x, y, boxWidth, boxHeight, fontSize, look.distress);
        layerCtx.restore();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (look.shadow) {
        ctx.shadowColor = look.shadow.color;
        ctx.shadowOffsetX = look.shadow.x * scaleFactor;
        ctx.shadowOffsetY = look.shadow.y * scaleFactor;
        ctx.shadowBlur = look.shadow.blur * scaleFactor;
      }
      ctx.drawImage(layer, 0, 0);
    } else {
      paintText(ctx);
    }
    ctx.restore();
  }
  function drawDistressMarks(ctx, x, y, w, h, fontSize, settings) {
    const { distressGrit, distressDust, distressScratches, distressVariation } = settings;
    const area = w * h / (fontSize * fontSize);
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    const marks = (stream, count, alpha, paint, addMark) => {
      const noise = noiseStream(distressVariation, stream);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < Math.round(count); i++) addMark(noise);
      paint();
    };
    marks(11, distressGrit * 0.9 * area, 0.95, () => ctx.fill(), (noise) => {
      const size = fontSize * (0.015 + noise() * 0.05);
      ctx.rect(x + noise() * w, y + noise() * h, size, size * (0.5 + noise()));
    });
    marks(12, distressDust * 0.35 * area, 0.8, () => ctx.fill(), (noise) => {
      const radius = fontSize * (0.01 + noise() ** 2 * 0.06);
      const cx = x + noise() * w, cy = y + noise() * h;
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    });
    ctx.lineWidth = Math.max(0.5, fontSize * 0.022);
    marks(13, distressScratches * 0.12 * area, 0.9, () => ctx.stroke(), (noise) => {
      const startX = x + noise() * w, startY = y + noise() * h;
      const heading = (noise() - 0.5) * Math.PI;
      const length = fontSize * (0.3 + noise() * 0.9);
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + Math.cos(heading) * length, startY + Math.sin(heading) * length);
    });
    ctx.restore();
  }

  // apps/ZEditor/src/render/bake.js
  async function flattenedImagePatch(ann, pageFilter) {
    const filter = effectiveImageFilter(ann, pageFilter);
    const exportScale = EXPORT_SCALE / MAIN_SCALE;
    const hasLook = filter.type !== "none" || IMAGE_EFFECTS.some((effect) => ann[effect.key]);
    const sourceScale = (ann.cropW || ann.naturalWidth || ann.width) / ann.width;
    const scale = hasLook ? exportScale : Math.min(exportScale, sourceScale);
    const baked = await bakeBoxToImage(ann, scale, (ctx, box) => drawImageOnCanvas(ctx, box, scale, pageFilter));
    if (!baked) return null;
    const clearedEffects = Object.fromEntries(IMAGE_EFFECTS.flatMap((effect) => [
      [effect.key, void 0],
      ...effect.controls.map((c) => [c.prop, void 0])
    ]));
    return {
      ...clearedEffects,
      ...Object.fromEntries(PHOTO_ADJUST_CONTROLS.map((c) => [c.prop, void 0])),
      // baked in now
      ...baked,
      cropX: void 0,
      cropY: void 0,
      cropW: void 0,
      cropH: void 0,
      // Any filter is baked in now; an unfiltered image can keep following the page.
      filter: filter.type === "none" ? ann.filter : { type: "none" }
    };
  }
  function cropResetPatch(ann) {
    const cleared = { cropX: void 0, cropY: void 0, cropW: void 0, cropH: void 0 };
    if (ann.cropW == null || !ann.naturalWidth || !ann.naturalHeight) return cleared;
    const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
    const sx = ann.width / ann.cropW, sy = ann.height / (ann.cropH || ann.naturalHeight);
    const width = ann.naturalWidth * sx, height = ann.naturalHeight * sy;
    const lx = -cropX * sx + width / 2 - ann.width / 2;
    const ly = -cropY * sy + height / 2 - ann.height / 2;
    const rad = angleOf(ann) * Math.PI / 180;
    const cx = ann.x + ann.width / 2 + lx * Math.cos(rad) - ly * Math.sin(rad);
    const cy = ann.y + ann.height / 2 + lx * Math.sin(rad) + ly * Math.cos(rad);
    return { ...cleared, x: cx - width / 2, y: cy - height / 2, width, height };
  }
  async function rasterizedRectPatch(ann) {
    const scale = EXPORT_SCALE / MAIN_SCALE;
    const baked = await bakeBoxToImage(ann, scale, (ctx, box) => drawRectOnCanvas(ctx, box, scale));
    if (!baked) return null;
    const cleared = Object.fromEntries([
      "shape",
      ...RECT_FILL_PROPS,
      ...IMAGE_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)])
    ].map((prop) => [prop, void 0]));
    return { ...cleared, ...baked, type: "image", filter: { type: "none" } };
  }
  async function rasterizedTextPatch(ann) {
    if (!ann.text) return null;
    const scale = EXPORT_SCALE / MAIN_SCALE;
    const size = measureTextBox(ann);
    const box = { ...ann, width: size.width + 1, height: size.height };
    const baked = await bakeBoxToImage(box, scale, (ctx, boxAtOrigin) => drawTextOnCanvas(ctx, boxAtOrigin, scale));
    if (!baked) return null;
    const textProps = ["text", "fontFamily", "fontSize", "bold", "italic", "underline", "color", "align", "lineSpacing", "letterSpacing", "strike", "textCase", "vertical", "fitHeight", "fillAlpha", "colorRuns", ...TEXT_PHOTO_PROPS];
    const effectProps = TEXT_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]);
    const cleared = Object.fromEntries([...textProps, ...effectProps].map((prop) => [prop, void 0]));
    return { ...cleared, ...baked, type: "image", filter: { type: "none" } };
  }
  async function bakeBoxToImage(ann, scale, draw) {
    const shadow = imageShadowOffset(ann);
    const strokeReach = ann.stroke ? effectSettings(ann, STROKE_EFFECT).strokeThickness * STROKE_MITER_LIMIT / 2 : 0;
    const shadowReach = shadow ? Math.hypot(shadow.x, shadow.y) + shadow.blur * 2 : 0;
    const marginPx = Math.ceil((strokeReach + shadowReach + 1) * scale);
    const widthPx = Math.max(1, Math.round(ann.width * scale));
    const heightPx = Math.max(1, Math.round(ann.height * scale));
    const radians = angleOf(ann) * Math.PI / 180;
    const turnedWidth = Math.ceil(Math.abs(widthPx * Math.cos(radians)) + Math.abs(heightPx * Math.sin(radians)));
    const turnedHeight = Math.ceil(Math.abs(widthPx * Math.sin(radians)) + Math.abs(heightPx * Math.cos(radians)));
    const boxLeft = marginPx + (turnedWidth - widthPx) / 2;
    const boxTop = marginPx + (turnedHeight - heightPx) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = turnedWidth + marginPx * 2;
    canvas.height = turnedHeight + marginPx * 2;
    const ctx = canvas.getContext("2d");
    await draw(ctx, { ...ann, x: boxLeft / scale, y: boxTop / scale, width: widthPx / scale, height: heightPx / scale });
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const alphaAt = (x, y) => data[(y * canvas.width + x) * 4 + 3];
    let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (alphaAt(x, y) === 0) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < 0) return null;
    let opaque = true;
    for (let y = top; y <= bottom && opaque; y++) {
      for (let x = left; x <= right && opaque; x++) opaque = alphaAt(x, y) === 255;
    }
    const trimmedW = right - left + 1, trimmedH = bottom - top + 1;
    const trimmed = document.createElement("canvas");
    trimmed.width = trimmedW;
    trimmed.height = trimmedH;
    trimmed.getContext("2d").drawImage(canvas, -left, -top);
    const png = trimmed.toDataURL("image/png");
    const jpeg = opaque ? trimmed.toDataURL("image/jpeg", 0.92) : null;
    const src = jpeg && jpeg.length < png.length ? jpeg : png;
    return {
      src,
      x: ann.x + (left - boxLeft) / scale,
      y: ann.y + (top - boxTop) / scale,
      angle: void 0,
      // the rotation is part of the pixels now
      width: trimmedW / scale,
      height: trimmedH / scale,
      naturalWidth: trimmedW,
      naturalHeight: trimmedH
    };
  }

  // apps/ZEditor/src/model/geometry.js
  function rotatePoint(x, y, degrees) {
    const radians = degrees * Math.PI / 180;
    const cos = Math.cos(radians), sin = Math.sin(radians);
    return [x * cos - y * sin, x * sin + y * cos];
  }
  var MIN_RESIZE_SIZE = 20;
  function resizedBox(box, handle, dx, dy, keepAspect, minSize = MIN_RESIZE_SIZE, angle = 0) {
    const signX = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
    const signY = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
    let width = box.width + signX * dx;
    let height = box.height + signY * dy;
    if (keepAspect) {
      const scaleX = width / box.width, scaleY = height / box.height;
      const minScale = minSize / Math.min(box.width, box.height);
      const scale = Math.max(minScale, signX && signY ? Math.max(scaleX, scaleY) : signX ? scaleX : scaleY);
      width = box.width * scale;
      height = box.height * scale;
    } else {
      width = Math.max(minSize, width);
      height = Math.max(minSize, height);
    }
    const anchorX = signX > 0 ? 0 : signX < 0 ? 1 : 0.5;
    const anchorY = signY > 0 ? 0 : signY < 0 ? 1 : 0.5;
    const [oldOffsetX, oldOffsetY] = rotatePoint((anchorX - 0.5) * box.width, (anchorY - 0.5) * box.height, angle);
    const [newOffsetX, newOffsetY] = rotatePoint((anchorX - 0.5) * width, (anchorY - 0.5) * height, angle);
    const centerX = box.x + box.width / 2 + oldOffsetX - newOffsetX;
    const centerY = box.y + box.height / 2 + oldOffsetY - newOffsetY;
    return { x: centerX - width / 2, y: centerY - height / 2, width, height };
  }

  // apps/ZEditor/src/render/itemGeometry.js
  function annotationBounds(ann) {
    if (ann.type === "stroke") {
      const box = bboxOf(ann);
      const pad = (ann.strokeWidth || (ann.tool === "highlighter" ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width)) / 2;
      return { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
    }
    const size = ann.type === "text" ? measureTextBox(ann) : ann;
    const centerX = ann.x + size.width / 2, centerY = ann.y + size.height / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const [rx, ry] = rotatePoint(sx * size.width / 2, sy * size.height / 2, angleOf(ann));
      return [centerX + rx, centerY + ry];
    });
    const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  function rotatedAnnotation(ann, degrees, cx, cy) {
    if (ann.type === "stroke") {
      return { ...ann, points: ann.points.map(([px, py]) => {
        const [rx2, ry2] = rotatePoint(px - cx, py - cy, degrees);
        return [cx + rx2, cy + ry2];
      }) };
    }
    const size = ann.type === "text" ? measureTextBox(ann) : ann;
    const [rx, ry] = rotatePoint(ann.x + size.width / 2 - cx, ann.y + size.height / 2 - cy, degrees);
    return { ...ann, x: cx + rx - size.width / 2, y: cy + ry - size.height / 2, angle: ((angleOf(ann) + degrees) % 360 + 360) % 360 };
  }

  // apps/ZEditor/src/render/drawAnnotation.js
  async function drawAnnotationOnCanvas(ctx, ann, scaleFactor, pageFilter) {
    if (ann.type === "stroke") await drawWithOpacity(ctx, 1, (target) => drawStrokeOnCanvas(target, ann, scaleFactor), blendOf(ann));
    else if (ann.type === "text") await drawWithOpacity(ctx, 1, (target) => drawTextOnCanvas(target, ann, scaleFactor), blendOf(ann));
    else if (ann.type === "rect") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawRectOnCanvas(target, ann, scaleFactor), blendOf(ann));
    else await drawWithOpacity(ctx, opacityOf(ann), (target) => drawImageOnCanvas(target, ann, scaleFactor, pageFilter), blendOf(ann));
  }

  // apps/ZEditor/src/render/pageRender.js
  function docFor(pdfDocsRef, page) {
    const entry = pdfDocsRef.current[page.docId];
    return entry ? entry.doc : null;
  }
  async function getPageDisplaySize(page, pdfDocsRef, scale) {
    if (page.isBlank) {
      const swapped = page.rotation % 180 !== 0;
      return {
        width: Math.round((swapped ? page.height : page.width) * scale),
        height: Math.round((swapped ? page.width : page.height) * scale)
      };
    }
    const pdfPage = await docFor(pdfDocsRef, page).getPage(page.pageNumber);
    const viewport = pdfPage.getViewport({ scale, rotation: page.rotation });
    return { width: viewport.width, height: viewport.height };
  }
  function drawPageNumber(ctx, spec, width, height, pxPerPt) {
    const margin = spec.marginIn * 72 * pxPerPt;
    ctx.save();
    ctx.font = `${spec.size * pxPerPt}px 'Inter', sans-serif`;
    ctx.fillStyle = spec.color;
    ctx.textBaseline = spec.vertical === "top" ? "top" : "bottom";
    ctx.textAlign = spec.horizontal === "left" ? "left" : spec.horizontal === "right" ? "right" : "center";
    const x = spec.horizontal === "left" ? margin : spec.horizontal === "right" ? width - margin : width / 2;
    ctx.fillText(spec.text, x, spec.vertical === "top" ? margin : height - margin);
    ctx.restore();
  }
  async function renderPageToCanvas(page, pdfDocsRef, exportScale, pageFilter, numberSpec) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let w, h;
    if (page.isBlank) {
      const swapped = page.rotation % 180 !== 0;
      w = Math.round((swapped ? page.height : page.width) * exportScale);
      h = Math.round((swapped ? page.width : page.height) * exportScale);
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    } else {
      const pdfPage = await docFor(pdfDocsRef, page).getPage(page.pageNumber);
      const viewport = pdfPage.getViewport({ scale: exportScale, rotation: page.rotation });
      w = viewport.width;
      h = viewport.height;
      canvas.width = w;
      canvas.height = h;
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    }
    const scaleFactor = exportScale / MAIN_SCALE;
    applyPageFilter(ctx, canvas, pageFilter, scaleFactor);
    for (const a of page.annotations || []) {
      if (!a.hidden) await drawAnnotationOnCanvas(ctx, a, scaleFactor, pageFilter);
    }
    if (numberSpec) drawPageNumber(ctx, numberSpec, w, h, exportScale);
    return canvas;
  }
  function makeBlankThumb(width, height, rotation, scale) {
    const s = scale || THUMB_SCALE;
    const swapped = rotation % 180 !== 0;
    const w = Math.max(1, Math.round((swapped ? height : width) * s));
    const h = Math.max(1, Math.round((swapped ? width : height) * s));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    return canvas.toDataURL();
  }
  async function renderPdfThumb(doc, pageNumber, rotation) {
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: THUMB_SCALE, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL();
  }

  // apps/ZEditor/src/state/useAnnotationEdits.js
  var { useRef } = React;
  function useAnnotationEdits({ doc, history, selection, toolDefaults }) {
    const { pages, setPages, selectedIdx, selectedPageIndices, nextAnnIdRef, pdfDocsRef, pageFilter } = doc;
    const { recordUndoCheckpoint } = history;
    const {
      tool,
      selectTool,
      editingAnnId,
      setEditingAnnId,
      selectedAnnId,
      setSelectedAnnId,
      selectedAnnIds,
      setSelectedAnnIds,
      selectedAnnotationIds,
      currentAnnotations,
      handleSelectAnnotation
    } = selection;
    const imageInputRef = useRef(null);
    function updateAnnotationsFor(pageIdx, updater, coalesceKey) {
      recordUndoCheckpoint(coalesceKey);
      setPages((prev) => prev.map((p, i) => i === pageIdx ? { ...p, annotations: updater(p.annotations || []) } : p));
    }
    function updatePageFilter(patch) {
      if (selectedIdx === null) return;
      const targets = /* @__PURE__ */ new Set([selectedIdx, ...selectedPageIndices]);
      recordUndoCheckpoint("pagefilter:" + [...targets].sort((a, b) => a - b).join(","));
      setPages((prev) => prev.map((p, i) => targets.has(i) ? { ...p, filter: { ...p.filter || DEFAULT_PAGE_FILTER, ...patch } } : p));
    }
    function handleRotateAnnotations(originals, degrees, cx, cy) {
      if (selectedIdx === null) return;
      const turned = new Map(originals.map((a) => [a.id, rotatedAnnotation(a, degrees, cx, cy)]));
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => turned.get(a.id) || a), "rotate:" + [...turned.keys()].join());
    }
    function handleMoveAnnotations(originals, dx, dy) {
      if (selectedIdx === null) return;
      const moved = new Map(originals.map((a) => [a.id, translatedAnnotation(a, dx, dy)]));
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => moved.get(a.id) || a), "move:" + [...moved.keys()].join());
    }
    function finishTextEdit() {
      if (editingAnnId === null) return;
      const edited = selectedIdx === null ? null : (pages[selectedIdx].annotations || []).find((a) => a.id === editingAnnId);
      setEditingAnnId(null);
      selection.setTool("select");
      if (edited && !edited.text.trim()) {
        updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => a.id !== edited.id), "ann:" + edited.id);
        setSelectedAnnId((id) => id === edited.id ? null : id);
      }
    }
    function handleGroupSelection() {
      const ids = selectedAnnotationIds();
      if (selectedIdx === null || ids.length < 2) return;
      const groupId = "g" + nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => {
        const members = anns.filter((a) => ids.includes(a.id)).map((a) => ({ ...a, groupId }));
        const topIndex = Math.max(...anns.map((a, i) => ids.includes(a.id) ? i : -1));
        const rest = anns.filter((a) => !ids.includes(a.id));
        rest.splice(topIndex + 1 - members.length, 0, ...members);
        return rest;
      });
    }
    function handleUngroupSelection() {
      const ids = selectedAnnotationIds();
      if (selectedIdx === null) return;
      const groups = new Set(currentAnnotations().filter((a) => ids.includes(a.id) && a.groupId).map((a) => a.groupId));
      if (groups.size === 0) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => groups.has(a.groupId) ? { ...a, groupId: void 0 } : a));
    }
    function handleAddText(x, y, width) {
      if (selectedIdx === null) return;
      const id = nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
        id,
        type: "text",
        x,
        y,
        text: "",
        width,
        fontFamily: toolDefaults.textFontFamily,
        fontSize: toolDefaults.textFontSize,
        bold: toolDefaults.textBold,
        italic: toolDefaults.textItalic,
        underline: toolDefaults.textUnderline,
        color: toolDefaults.textColor,
        align: toolDefaults.textAlign
      }], "ann:" + id);
      setSelectedAnnId(id);
      setSelectedAnnIds([]);
      setEditingAnnId(id);
    }
    function handleAddRect(box) {
      if (selectedIdx === null) return;
      const id = nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
        id,
        type: "rect",
        shape: tool === "ellipse" ? "ellipse" : void 0,
        x: box.x,
        y: box.y,
        width: Math.max(MIN_RECT_SIZE, box.width),
        height: Math.max(MIN_RECT_SIZE, box.height),
        ...toolDefaults.rectDefaults
      }]);
      selectTool("select");
      setSelectedAnnId(id);
    }
    function handleAddStroke(stroke) {
      if (selectedIdx === null) return;
      const id = nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
        id,
        type: "stroke",
        tool: stroke.tool,
        points: stroke.points,
        color: stroke.color,
        strokeWidth: stroke.strokeWidth,
        taper: stroke.taper || 0
      }]);
    }
    function handleToggleLayerFlag(ann, flag) {
      const on = !ann[flag];
      handleUpdateAnnotation(ann.id, { [flag]: on });
      if (on && (ann.id === selectedAnnId || selectedAnnIds.includes(ann.id))) handleSelectAnnotation(ann.id, true, true);
    }
    function handleReorderLayers(draggedIds, insertBeforeRow) {
      const topFirst = (pages[selectedIdx].annotations || []).slice().reverse();
      const ids = withGroupMates(topFirst, draggedIds);
      const fromRows = topFirst.flatMap((a, row) => ids.includes(a.id) ? [row] : []);
      const newOrder = orderAfterMove(topFirst.length, fromRows, insertBeforeRow);
      if (newOrder) updateAnnotationsFor(selectedIdx, () => newOrder.map((row) => topFirst[row]).reverse());
    }
    function handleImageToolClick() {
      if (selectedIdx === null) return;
      imageInputRef.current && imageInputRef.current.click();
    }
    function addImageAnnotationFromFile(file, pageIdx) {
      if (!file || pageIdx === null) return;
      const pageAtChooseTime = pages[pageIdx];
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        const img = new Image();
        img.onload = async () => {
          const MAX_W = 260;
          const scale = img.naturalWidth > MAX_W ? MAX_W / img.naturalWidth : 1;
          const width = img.naturalWidth * scale;
          const height = img.naturalHeight * scale;
          const display = await getPageDisplaySize(pageAtChooseTime, pdfDocsRef, MAIN_SCALE);
          const x = Math.max(0, (display.width - width) / 2);
          const y = Math.max(0, (display.height - height) / 2);
          const id = nextAnnIdRef.current++;
          updateAnnotationsFor(pageIdx, (anns) => [...anns, {
            id,
            type: "image",
            x,
            y,
            width,
            height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            src
          }]);
          selectTool("select");
          setSelectedAnnId(id);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
    function handleImageFileChosen(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      addImageAnnotationFromFile(file, selectedIdx);
    }
    function handleUpdateAnnotation(id, patch) {
      if (selectedIdx === null) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => a.id === id ? { ...a, ...patch } : a), "ann:" + id);
    }
    async function handleFlattenImage(ann) {
      const pageIdx = selectedIdx;
      const patch = await flattenedImagePatch(ann, pageFilter);
      if (!patch) return;
      updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...patch } : a));
    }
    async function handleRasterizeText(ann) {
      const pageIdx = selectedIdx;
      const patch = await rasterizedTextPatch(ann);
      if (!patch) return;
      updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...patch } : a));
    }
    async function handleRasterizeRect(ann) {
      const pageIdx = selectedIdx;
      const patch = await rasterizedRectPatch(ann);
      if (!patch) return;
      updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...patch } : a));
    }
    function handleDeleteAnnotation() {
      if (selectedIdx === null || selectedAnnId === null) return;
      const idsToDelete = [selectedAnnId, ...selectedAnnIds];
      updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => !idsToDelete.includes(a.id)));
      setSelectedAnnId(null);
      setSelectedAnnIds([]);
    }
    function handleEraseStroke(id) {
      if (selectedIdx === null) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => a.id !== id), "eraser");
      setSelectedAnnId((cur) => cur === id ? null : cur);
    }
    function handleEraseImagePixels(id, src) {
      if (selectedIdx === null) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => a.id === id ? { ...a, src } : a));
    }
    return {
      updateAnnotationsFor,
      updatePageFilter,
      handleRotateAnnotations,
      handleMoveAnnotations,
      finishTextEdit,
      handleGroupSelection,
      handleUngroupSelection,
      handleAddText,
      handleAddRect,
      handleAddStroke,
      handleToggleLayerFlag,
      handleReorderLayers,
      imageInputRef,
      handleImageToolClick,
      addImageAnnotationFromFile,
      handleImageFileChosen,
      handleUpdateAnnotation,
      handleFlattenImage,
      handleRasterizeText,
      handleRasterizeRect,
      handleDeleteAnnotation,
      handleEraseStroke,
      handleEraseImagePixels
    };
  }

  // apps/ZEditor/src/state/useDialogs.js
  var { useState } = React;
  function useDialogs({ pages, openProjectPicker }) {
    const [newDocOpen, setNewDocOpen] = useState(false);
    const [newDocFromProject, setNewDocFromProject] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmStep, setConfirmStep] = useState(1);
    function openNewDocDialog(fromProject) {
      setNewDocFromProject(fromProject);
      setNewDocOpen(true);
    }
    function handleNewProjectClick() {
      setConfirmAction("newProject");
      setConfirmStep(1);
    }
    function handleLoadProjectClick() {
      if (pages.length > 0) {
        setConfirmAction("loadProject");
        setConfirmStep(1);
      } else {
        openProjectPicker();
      }
    }
    function handleConfirmProceed() {
      setConfirmStep(2);
    }
    function handleConfirmCancel() {
      setConfirmAction(null);
      setConfirmStep(1);
    }
    function handleConfirmYes() {
      const action = confirmAction;
      setConfirmAction(null);
      setConfirmStep(1);
      if (action === "newProject") openNewDocDialog(true);
      else if (action === "loadProject") openProjectPicker();
    }
    return {
      newDocOpen,
      setNewDocOpen,
      newDocFromProject,
      openNewDocDialog,
      shortcutsOpen,
      setShortcutsOpen,
      confirmAction,
      confirmStep,
      handleNewProjectClick,
      handleLoadProjectClick,
      handleConfirmProceed,
      handleConfirmCancel,
      handleConfirmYes
    };
  }

  // apps/ZEditor/src/model/documentTitle.js
  function titleStamp(date = /* @__PURE__ */ new Date()) {
    const two = (n) => String(n).padStart(2, "0");
    return two(date.getFullYear() % 100) + two(date.getMonth() + 1) + two(date.getDate()) + two(date.getHours()) + two(date.getMinutes());
  }
  function stripExtension(name) {
    return String(name || "").replace(/\.[^./\\]+$/, "");
  }
  function titleToFileName(title, extension) {
    const safe = String(title || "").replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
    return (safe || "zine") + extension;
  }

  // apps/ZEditor/src/io/pdfImport.js
  async function importPdfFile(file, ids) {
    const bytes = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const docId = ids.docId();
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const dataUrl = await renderPdfThumb(doc, i, 0);
      pages.push({ key: ids.pageKey(), docId, pageNumber: i, rotation: 0, dataUrl, isBlank: false, annotations: [] });
    }
    const p1 = await doc.getPage(1);
    const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
    return { docId, entry: { doc, bytes }, pages, firstPageSize: { width: vp1.width, height: vp1.height } };
  }

  // apps/ZEditor/src/state/useDocumentFiles.js
  var { useState: useState2, useRef: useRef2 } = React;
  function useDocumentFiles({ doc, history, status, project, selection, dialogs }) {
    const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, pageSizeRef, ids } = doc;
    const { setLoading, setErrorMsg } = status;
    const fileInputRef = useRef2(null);
    const insertPdfInputRef = useRef2(null);
    const [pendingInsertFile, setPendingInsertFile] = useState2(null);
    const [insertAfterPage, setInsertAfterPage] = useState2(0);
    async function handleFile(file) {
      setErrorMsg(null);
      setLoading(true);
      try {
        const imported = await importPdfFile(file, ids);
        pdfDocsRef.current = { [imported.docId]: imported.entry };
        if (!pageSizeRef.current) pageSizeRef.current = imported.firstPageSize;
        setPages(imported.pages);
        setSelectedIdx(imported.pages.length > 0 ? 0 : null);
        setSelectedPageIndices([]);
        history.clearHistory();
        project.startNewDocument(stripExtension(file.name) + " - " + titleStamp());
      } catch (err) {
        setErrorMsg("Couldn't load that PDF — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setLoading(false);
      }
    }
    function handleLoadClick() {
      fileInputRef.current && fileInputRef.current.click();
    }
    function handleFileInputChange(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) handleFile(file);
    }
    function handleCreateBlankDocument({ width, height, pageCount }) {
      dialogs.setNewDocOpen(false);
      setErrorMsg(null);
      pdfDocsRef.current = {};
      pageSizeRef.current = { width, height };
      const thumb = makeBlankThumb(width, height, 0);
      const newPages = Array.from({ length: pageCount }, () => ({
        key: nextKeyRef.current++,
        isBlank: true,
        rotation: 0,
        width,
        height,
        dataUrl: thumb,
        annotations: []
      }));
      setPages(newPages);
      setSelectedIdx(0);
      setSelectedPageIndices([]);
      selection.setSelectedAnnId(null);
      selection.setSelectedAnnIds([]);
      history.clearHistory();
      project.startNewDocument("New Zine - " + titleStamp());
    }
    function handleNewDocumentOpenPdf() {
      dialogs.setNewDocOpen(false);
      handleLoadClick();
    }
    function handleInsertPdfClick() {
      insertPdfInputRef.current && insertPdfInputRef.current.click();
    }
    function handleInsertPdfInputChange(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      setInsertAfterPage(selectedIdx !== null ? selectedIdx + 1 : pages.length);
      setPendingInsertFile(file);
    }
    async function handleConfirmInsertPdf() {
      const file = pendingInsertFile;
      const atIndex = Math.max(0, Math.min(pages.length, insertAfterPage));
      setPendingInsertFile(null);
      if (!file) return;
      setErrorMsg(null);
      setLoading(true);
      try {
        const imported = await importPdfFile(file, ids);
        pdfDocsRef.current[imported.docId] = imported.entry;
        if (!pageSizeRef.current) pageSizeRef.current = imported.firstPageSize;
        history.recordUndoCheckpoint();
        setPages((prev) => {
          const next = prev.slice();
          next.splice(atIndex, 0, ...imported.pages);
          return next;
        });
        setSelectedIdx(atIndex);
        setSelectedPageIndices([]);
      } catch (err) {
        setErrorMsg("Couldn't insert that PDF — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setLoading(false);
      }
    }
    return {
      fileInputRef,
      insertPdfInputRef,
      handleFile,
      handleLoadClick,
      handleFileInputChange,
      handleCreateBlankDocument,
      handleNewDocumentOpenPdf,
      handleInsertPdfClick,
      handleInsertPdfInputChange,
      pendingInsertFile,
      setPendingInsertFile,
      insertAfterPage,
      setInsertAfterPage,
      handleConfirmInsertPdf
    };
  }

  // apps/ZEditor/src/state/useDocumentState.js
  var { useState: useState3, useRef: useRef3, useMemo } = React;
  function useDocumentState() {
    const [pages, setPages] = useState3([]);
    const [selectedIdx, setSelectedIdx] = useState3(null);
    const [selectedPageIndices, setSelectedPageIndices] = useState3([]);
    const selectedPage = selectedIdx !== null ? pages[selectedIdx] : null;
    const pageFilter = useMemo(() => selectedPage && selectedPage.filter || DEFAULT_PAGE_FILTER, [selectedPage]);
    const pdfDocsRef = useRef3({});
    const nextKeyRef = useRef3(1);
    const nextAnnIdRef = useRef3(1);
    const nextDocIdRef = useRef3(1);
    const pageSizeRef = useRef3(null);
    const ids = {
      pageKey: () => nextKeyRef.current++,
      docId: () => "doc" + nextDocIdRef.current++,
      annId: () => nextAnnIdRef.current++
    };
    return {
      pages,
      setPages,
      selectedIdx,
      setSelectedIdx,
      selectedPageIndices,
      setSelectedPageIndices,
      selectedPage,
      pageFilter,
      pdfDocsRef,
      nextKeyRef,
      nextAnnIdRef,
      nextDocIdRef,
      pageSizeRef,
      ids
    };
  }

  // shared/js/download.js
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }

  // apps/ZEditor/src/io/fileSave.js
  function canvasToArrayBuffer(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("Couldn't encode a page image."));
          return;
        }
        resolve(await blob.arrayBuffer());
      }, "image/png");
    });
  }
  async function saveFile(data, filename, mimeType, description, extensions) {
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description, accept: { [mimeType]: extensions } }]
        });
        await writeFileHandle(handle, data);
        return handle;
      } catch (err) {
        if (err && err.name === "AbortError") return "cancelled";
      }
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    downloadBlob(blob, filename);
    return null;
  }
  async function writeFileHandle(handle, data) {
    if (handle.queryPermission && await handle.queryPermission({ mode: "readwrite" }) !== "granted") {
      if (await handle.requestPermission({ mode: "readwrite" }) !== "granted") {
        throw Object.assign(new Error("Permission to edit the file was refused"), { name: "NotAllowedError" });
      }
    }
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  }
  async function savePdfBytes(bytes, filename) {
    return saveFile(bytes, filename, "application/pdf", "PDF file", [".pdf"]);
  }

  // apps/ZEditor/src/io/pdfExport.js
  async function buildExportPdfBytes(pages, pdfDocsRef, pageNumbers) {
    const outDoc = await PDFLib.PDFDocument.create();
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const canvas = await renderPageToCanvas(page, pdfDocsRef, EXPORT_SCALE, page.filter || DEFAULT_PAGE_FILTER, pageNumberSpec(pageNumbers, pageIdx, pages.length));
      const pngBytes = await canvasToArrayBuffer(canvas);
      const pngImage = await outDoc.embedPng(pngBytes);
      const pageWidthPts = canvas.width / EXPORT_SCALE;
      const pageHeightPts = canvas.height / EXPORT_SCALE;
      const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
      outPage.drawImage(pngImage, { x: 0, y: 0, width: pageWidthPts, height: pageHeightPts });
    }
    return outDoc.save();
  }

  // shared/js/zineArrangerHandoff.js
  var ARRANGER_READY_MESSAGE = "zinearranger-ready";
  var HANDOFF_PDF_MESSAGE = "zeditor-handoff-pdf";
  async function sendPdfToZineArranger(buildBytes, filename) {
    const win = window.open("../ZineArranger/index.html", "_blank");
    if (!win) throw new Error("The browser blocked the new tab — allow popups for this page and try again.");
    const readyPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("ZineArranger didn't respond — it may still be loading, or didn't open as a new tab."));
      }, 15e3);
      function onMessage(event) {
        if (event.source !== win || !event.data || event.data.type !== ARRANGER_READY_MESSAGE) return;
        clearTimeout(timeoutId);
        window.removeEventListener("message", onMessage);
        resolve();
      }
      window.addEventListener("message", onMessage);
    });
    const pdfBytes = await buildBytes();
    const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    await readyPromise;
    win.postMessage({ type: HANDOFF_PDF_MESSAGE, buffer, filename }, "*", [buffer]);
  }

  // apps/ZEditor/src/state/useExport.js
  var { useState: useState4 } = React;
  function useExport({ doc, status, view, project }) {
    const { pages, pdfDocsRef } = doc;
    const { setErrorMsg } = status;
    const [exporting, setExporting] = useState4(false);
    const [sendingToArranger, setSendingToArranger] = useState4(false);
    const buildBytes = () => buildExportPdfBytes(pages, pdfDocsRef, view.pageNumbers);
    async function handleExportPdf() {
      if (pages.length === 0 || exporting) return;
      setErrorMsg(null);
      setExporting(true);
      try {
        const pdfBytes = await buildBytes();
        await savePdfBytes(pdfBytes, titleToFileName(project.docTitle, ".pdf"));
      } catch (err) {
        setErrorMsg("Couldn't export PDF — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setExporting(false);
      }
    }
    async function handleSendToZineArranger() {
      if (pages.length === 0 || exporting || sendingToArranger) return;
      setErrorMsg(null);
      setSendingToArranger(true);
      try {
        await sendPdfToZineArranger(buildBytes, titleToFileName(project.docTitle, ".pdf"));
      } catch (err) {
        setErrorMsg("Couldn't send to ZineArranger — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setSendingToArranger(false);
      }
    }
    return { exporting, sendingToArranger, handleExportPdf, handleSendToZineArranger };
  }

  // apps/ZEditor/src/model/history.js
  var UNDO_COALESCE_MS = 700;
  var MAX_UNDO_HISTORY = 50;

  // apps/ZEditor/src/state/useHistory.js
  var { useState: useState5, useRef: useRef4 } = React;
  function stripDataUrls(pagesArr) {
    return pagesArr.map(({ dataUrl, ...rest }) => rest);
  }
  function useHistory({ pages, setPages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices, pdfDocsRef }) {
    const [undoStack, setUndoStack] = useState5([]);
    const [redoStack, setRedoStack] = useState5([]);
    const lastCommitRef = useRef4({ time: 0, key: null });
    function recordUndoCheckpoint(coalesceKey) {
      const now = Date.now();
      if (coalesceKey && lastCommitRef.current.key === coalesceKey && now - lastCommitRef.current.time < UNDO_COALESCE_MS) {
        lastCommitRef.current.time = now;
        return;
      }
      lastCommitRef.current = { time: now, key: coalesceKey || null };
      setUndoStack((stack) => {
        const next = [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }];
        return next.length > MAX_UNDO_HISTORY ? next.slice(next.length - MAX_UNDO_HISTORY) : next;
      });
      setRedoStack([]);
    }
    function clearHistory() {
      setUndoStack([]);
      setRedoStack([]);
    }
    async function restoreSnapshot(snapshot) {
      const currentByKey = new Map(pages.map((p) => [p.key, p]));
      const withThumbs = await Promise.all(snapshot.pages.map(async (p) => {
        const existing = currentByKey.get(p.key);
        const reusable = existing && existing.dataUrl && existing.rotation === p.rotation && existing.isBlank === p.isBlank && existing.pageNumber === p.pageNumber && existing.docId === p.docId && existing.width === p.width && existing.height === p.height;
        if (reusable) return { ...p, dataUrl: existing.dataUrl };
        const dataUrl = p.isBlank ? makeBlankThumb(p.width, p.height, p.rotation) : await renderPdfThumb(docFor(pdfDocsRef, p), p.pageNumber, p.rotation);
        return { ...p, dataUrl };
      }));
      setPages(withThumbs);
      setSelectedIdx(snapshot.selectedIdx);
      setSelectedPageIndices(snapshot.selectedPageIndices);
    }
    function handleUndo() {
      if (undoStack.length === 0) return;
      const entry = undoStack[undoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1));
      setRedoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
      lastCommitRef.current = { time: 0, key: null };
      restoreSnapshot(entry);
    }
    function handleRedo() {
      if (redoStack.length === 0) return;
      const entry = redoStack[redoStack.length - 1];
      setRedoStack((stack) => stack.slice(0, -1));
      setUndoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
      lastCommitRef.current = { time: 0, key: null };
      restoreSnapshot(entry);
    }
    return { undoStack, redoStack, recordUndoCheckpoint, clearHistory, handleUndo, handleRedo };
  }

  // apps/ZEditor/src/state/useKeyboardShortcuts.js
  var { useRef: useRef5, useEffect } = React;
  function useKeyboardShortcuts(app) {
    const appRef = useRef5(app);
    appRef.current = app;
    const clipboardRef = useRef5(null);
    useEffect(() => {
      function handleKeyDown(e) {
        const { doc, history, selection, edits, pageOps, project, modalOpen } = appRef.current;
        const { pages, selectedIdx, selectedPageIndices, setSelectedIdx, setSelectedPageIndices, nextAnnIdRef } = doc;
        const { selectedAnnId, selectedAnnIds, setSelectedAnnId, selectTool } = selection;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (!modalOpen) project.handleSaveProject({ saveAs: e.shiftKey });
          return;
        }
        const tag = e.target && e.target.tagName || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target && e.target.isContentEditable) return;
        if (modalOpen) return;
        const key = e.key.toLowerCase();
        const mod = e.ctrlKey || e.metaKey;
        if (mod) {
          if (key === "z" && !e.shiftKey) {
            e.preventDefault();
            history.handleUndo();
            return;
          }
          if (key === "z" && e.shiftKey || key === "y") {
            e.preventDefault();
            history.handleRedo();
            return;
          }
          if (key === "r") {
            e.preventDefault();
            if (selectedIdx !== null) pageOps.handleRotate(selectedIdx);
            return;
          }
          if (key === "g") {
            e.preventDefault();
            if (e.shiftKey) edits.handleUngroupSelection();
            else edits.handleGroupSelection();
            return;
          }
          if (key === "c") {
            if (selectedIdx !== null && selectedAnnId !== null) {
              const ann = (pages[selectedIdx].annotations || []).find((a) => a.id === selectedAnnId);
              if (ann) {
                e.preventDefault();
                clipboardRef.current = JSON.parse(JSON.stringify(ann));
              }
            }
            return;
          }
          if (key === "v") {
            if (clipboardRef.current && selectedIdx !== null) {
              e.preventDefault();
              const clip = clipboardRef.current;
              const id = nextAnnIdRef.current++;
              const newAnn = { ...translatedAnnotation(clip, 20, 20), id, groupId: void 0 };
              edits.updateAnnotationsFor(selectedIdx, (anns) => [...anns, newAnn]);
              setSelectedAnnId(id);
            }
            return;
          }
          return;
        }
        if (key === "delete") {
          e.preventDefault();
          if (selectedAnnId !== null) edits.handleDeleteAnnotation();
          else if (selectedIdx !== null) {
            if (selectedPageIndices.length > 0) pageOps.handleDeleteSelectedPages();
            else pageOps.handleDelete(selectedIdx);
          }
          return;
        }
        const nudge = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
        if (nudge && selectedAnnId !== null) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const ids = [selectedAnnId, ...selectedAnnIds];
          edits.handleMoveAnnotations((pages[selectedIdx].annotations || []).filter((a) => ids.includes(a.id)), nudge[0] * step, nudge[1] * step);
          return;
        }
        if (key === "v") {
          selectTool("select");
          return;
        }
        if (key === "t") {
          selectTool("text");
          return;
        }
        if (key === "i") {
          edits.handleImageToolClick();
          return;
        }
        if (key === "r") {
          selectTool("rect");
          return;
        }
        if (key === "e") {
          selectTool("ellipse");
          return;
        }
        if (key === "h") {
          selectTool("highlighter");
          return;
        }
        if (key === "d") {
          selectTool("pen");
          return;
        }
        if (key === "arrowup") {
          e.preventDefault();
          setSelectedPageIndices([]);
          setSelectedIdx((cur) => cur === null ? cur : Math.max(0, cur - 1));
          return;
        }
        if (key === "arrowdown") {
          e.preventDefault();
          setSelectedPageIndices([]);
          setSelectedIdx((cur) => cur === null ? cur : Math.min(pages.length - 1, cur + 1));
          return;
        }
      }
      function handlePaste(e) {
        const { doc, edits, modalOpen } = appRef.current;
        const tag = e.target && e.target.tagName || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target && e.target.isContentEditable) return;
        if (modalOpen || doc.selectedIdx === null) return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        const imageItem = Array.from(items).find((item) => item.type && item.type.startsWith("image/"));
        if (!imageItem) return;
        e.preventDefault();
        edits.addImageAnnotationFromFile(imageItem.getAsFile(), doc.selectedIdx);
      }
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("paste", handlePaste);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("paste", handlePaste);
      };
    }, []);
  }

  // apps/ZEditor/src/state/useOnionGhost.js
  var { useState: useState6, useEffect: useEffect2 } = React;
  function useOnionGhost({ onionSkinOn, pages, selectedIdx, pdfDocsRef }) {
    const [onionGhostSrc, setOnionGhostSrc] = useState6(null);
    useEffect2(() => {
      if (!onionSkinOn || selectedIdx === null || selectedIdx === 0) {
        setOnionGhostSrc(null);
        return;
      }
      const prevPage = pages[selectedIdx - 1];
      if (!prevPage) {
        setOnionGhostSrc(null);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const canvas = await renderPageToCanvas(prevPage, pdfDocsRef, MAIN_SCALE, prevPage.filter || DEFAULT_PAGE_FILTER);
          if (!cancelled) setOnionGhostSrc(canvas.toDataURL());
        } catch (err) {
          if (!cancelled) setOnionGhostSrc(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [onionSkinOn, selectedIdx]);
    return onionGhostSrc;
  }

  // apps/ZEditor/src/state/usePageOps.js
  function usePageOps({ doc, history, selection }) {
    const { pages, setPages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices, pdfDocsRef, nextKeyRef, pageSizeRef } = doc;
    const { recordUndoCheckpoint } = history;
    const { pagesActedOn } = selection;
    async function handleRotate(idx) {
      const updatesByKey = /* @__PURE__ */ new Map();
      for (const i of pagesActedOn(idx)) {
        const target = pages[i];
        const rotation = (target.rotation + 90) % 360;
        const dataUrl = target.isBlank ? makeBlankThumb(target.width, target.height, rotation) : await renderPdfThumb(docFor(pdfDocsRef, target), target.pageNumber, rotation);
        updatesByKey.set(target.key, { rotation, dataUrl });
      }
      recordUndoCheckpoint();
      setPages((prev) => prev.map((p) => updatesByKey.has(p.key) ? { ...p, ...updatesByKey.get(p.key) } : p));
    }
    function handleInsertBlank(atIndex) {
      const size = pageSizeRef.current || DEFAULT_PAGE_SIZE;
      const newPage = {
        key: nextKeyRef.current++,
        isBlank: true,
        rotation: 0,
        width: size.width,
        height: size.height,
        dataUrl: makeBlankThumb(size.width, size.height, 0),
        annotations: []
      };
      recordUndoCheckpoint();
      setPages((prev) => {
        const next = prev.slice();
        next.splice(atIndex, 0, newPage);
        return next;
      });
      setSelectedIdx(atIndex);
      setSelectedPageIndices([]);
    }
    function handleDelete(idx) {
      recordUndoCheckpoint();
      setPages((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        return next;
      });
      setSelectedIdx((prevSel) => {
        if (prevSel === null) return null;
        if (idx === prevSel) return null;
        if (idx < prevSel) return prevSel - 1;
        return prevSel;
      });
    }
    function handleDeleteSelectedPages() {
      if (selectedIdx === null) return;
      const idxToDelete = /* @__PURE__ */ new Set([selectedIdx, ...selectedPageIndices]);
      recordUndoCheckpoint();
      setPages((prev) => prev.filter((_, i) => !idxToDelete.has(i)));
      setSelectedIdx(null);
      setSelectedPageIndices([]);
    }
    function handleDeleteThumbnail(idx) {
      if (selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx))) {
        handleDeleteSelectedPages();
      } else {
        handleDelete(idx);
      }
    }
    function handleReorder(fromIndices, insertBefore) {
      const newOrder = orderAfterMove(pages.length, fromIndices, insertBefore);
      if (!newOrder) return;
      const newIdxOf = new Array(newOrder.length);
      newOrder.forEach((oldIdx, newIdx) => {
        newIdxOf[oldIdx] = newIdx;
      });
      recordUndoCheckpoint();
      setPages((prev) => newOrder.map((oldIdx) => prev[oldIdx]));
      setSelectedIdx((prevSel) => prevSel === null ? null : newIdxOf[prevSel]);
      setSelectedPageIndices((prevSel) => prevSel.map((oldIdx) => newIdxOf[oldIdx]));
    }
    return { handleRotate, handleInsertBlank, handleDelete, handleDeleteSelectedPages, handleDeleteThumbnail, handleReorder };
  }

  // apps/ZEditor/src/io/base64.js
  function arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    const chunkSize = 32768;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  function base64ToArrayBuffer(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  // apps/ZEditor/src/io/customFonts.js
  var customFontStore = [];
  async function registerCustomFont(family, bytes) {
    const face = new FontFace(family, bytes.slice(0));
    await face.load();
    document.fonts.add(face);
  }
  async function addCustomFontFile(file, takenNames) {
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error("Choose a .ttf, .otf, .woff or .woff2 font file.");
    const bytes = await file.arrayBuffer();
    const base = file.name.replace(/\.[^.]+$/, "").replace(/_+/g, " ").replace(/['"\\]/g, "").trim() || "Custom font";
    let family = base, n = 2;
    while (takenNames.includes(family)) family = `${base} ${n++}`;
    try {
      await registerCustomFont(family, bytes);
    } catch (err) {
      throw new Error("That file isn't a font the browser can read.");
    }
    customFontStore.push({ family, data: arrayBufferToBase64(bytes) });
    return family;
  }

  // apps/ZEditor/src/io/projectFile.js
  function serializeProject({ title, pdfDocs, pages, textStyles, settings }) {
    const docs = {};
    for (const docId of Object.keys(pdfDocs)) {
      docs[docId] = arrayBufferToBase64(pdfDocs[docId].bytes);
    }
    const usedFamilies = /* @__PURE__ */ new Set();
    pages.forEach((p) => (p.annotations || []).forEach((a) => {
      if (a.type === "text" && a.fontFamily) usedFamilies.add(a.fontFamily);
    }));
    const fonts = customFontStore.filter((f) => usedFamilies.has(f.family));
    const project = {
      version: 2,
      // 2: the annotation list is the stacking order
      title,
      docs,
      fonts,
      textStyles,
      pages: pages.map(({ dataUrl, ...rest }) => rest),
      settings
    };
    return JSON.stringify(project);
  }
  async function readProjectFile(file, nextPageKey) {
    const text = await file.text();
    const project = JSON.parse(text);
    if (!project || !Array.isArray(project.pages)) throw new Error("That doesn't look like a ZEditor project file.");
    const docs = {};
    for (const docId of Object.keys(project.docs || {})) {
      const bytes = base64ToArrayBuffer(project.docs[docId]);
      const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      docs[docId] = { doc, bytes };
    }
    const loadedFamilies = [];
    for (const font of project.fonts || []) {
      if (customFontStore.some((f) => f.family === font.family && f.data === font.data)) {
        loadedFamilies.push(font.family);
        continue;
      }
      try {
        await registerCustomFont(font.family, base64ToArrayBuffer(font.data));
        customFontStore.push({ family: font.family, data: font.data });
        loadedFamilies.push(font.family);
      } catch (err) {
      }
    }
    const textStyles = Array.isArray(project.textStyles) ? project.textStyles.filter((s) => s && s.name && s.props) : [];
    const pages = await Promise.all(project.pages.map(async (p) => {
      const dataUrl = p.isBlank ? makeBlankThumb(p.width, p.height, p.rotation) : await renderPdfThumb(docs[p.docId].doc, p.pageNumber, p.rotation);
      const annotations = project.version >= 2 ? p.annotations : legacyLayerOrder(p.annotations || []);
      return { ...p, annotations, key: nextPageKey(), dataUrl };
    }));
    let maxDocNum = 0;
    Object.keys(docs).forEach((id) => {
      const m = /^doc(\d+)$/.exec(id);
      if (m) maxDocNum = Math.max(maxDocNum, Number(m[1]));
    });
    let maxAnnId = 0;
    pages.forEach((p) => (p.annotations || []).forEach((a) => {
      maxAnnId = Math.max(maxAnnId, a.id || 0);
    }));
    let pageSize = null;
    const firstReal = pages.find((p) => !p.isBlank);
    if (firstReal) {
      const p1 = await docs[firstReal.docId].doc.getPage(firstReal.pageNumber);
      const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
      pageSize = { width: vp1.width, height: vp1.height };
    } else if (pages.length > 0) {
      pageSize = { width: pages[0].width, height: pages[0].height };
    }
    return {
      docs,
      pages,
      loadedFamilies,
      textStyles,
      maxDocNum,
      maxAnnId,
      pageSize,
      // Projects saved before titles existed take their file's name (see the caller).
      title: typeof project.title === "string" && project.title ? project.title : null,
      settings: project.settings || {}
    };
  }

  // apps/ZEditor/src/state/useProject.js
  var { useState: useState7, useRef: useRef6 } = React;
  function useProject({ doc, history, status, view, toolDefaults }) {
    const { pages, setPages, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, nextAnnIdRef, nextDocIdRef, pageSizeRef } = doc;
    const { setLoading, setErrorMsg } = status;
    const projectInputRef = useRef6(null);
    const [savingProject, setSavingProject] = useState7(false);
    const [projectFile, setProjectFile] = useState7(null);
    const [docTitle, setDocTitle] = useState7("");
    const [justSaved, setJustSaved] = useState7(false);
    const justSavedTimerRef = useRef6(null);
    function flashSaved() {
      setJustSaved(true);
      clearTimeout(justSavedTimerRef.current);
      justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 1800);
    }
    function startNewDocument(title) {
      setProjectFile(null);
      setDocTitle(title);
    }
    async function handleSaveProject({ saveAs = false } = {}) {
      if (pages.length === 0 || savingProject) return;
      setErrorMsg(null);
      setSavingProject(true);
      try {
        const json = serializeProject({
          title: docTitle,
          pdfDocs: pdfDocsRef.current,
          pages,
          textStyles: toolDefaults.textStyles,
          settings: view.settingsForSave()
        });
        if (!saveAs && projectFile) {
          try {
            await writeFileHandle(projectFile.handle, json);
            flashSaved();
            return;
          } catch (err) {
          }
        }
        const handle = await saveFile(json, titleToFileName(docTitle, ".znow"), "application/json", "ZEditor project file", [".znow"]);
        if (handle !== "cancelled") flashSaved();
        if (handle && handle !== "cancelled") setProjectFile({ handle, name: handle.name });
      } catch (err) {
        setErrorMsg("Couldn't save the project — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setSavingProject(false);
      }
    }
    async function openProjectPicker() {
      if (typeof window.showOpenFilePicker === "function") {
        try {
          const [handle] = await window.showOpenFilePicker({
            types: [{ description: "ZEditor project file", accept: { "application/json": [".znow"] } }]
          });
          handleLoadProjectFile(await handle.getFile(), handle);
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }
      projectInputRef.current && projectInputRef.current.click();
    }
    function handleProjectInputChange(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) handleLoadProjectFile(file);
    }
    async function handleLoadProjectFile(file, handle = null) {
      setErrorMsg(null);
      setLoading(true);
      try {
        const loaded = await readProjectFile(file, () => nextKeyRef.current++);
        pdfDocsRef.current = loaded.docs;
        toolDefaults.mergeTextStyles(loaded.textStyles);
        toolDefaults.addFontFamilies(loaded.loadedFamilies);
        nextDocIdRef.current = loaded.maxDocNum + 1;
        nextAnnIdRef.current = loaded.maxAnnId + 1;
        if (!pageSizeRef.current && loaded.pageSize) pageSizeRef.current = loaded.pageSize;
        setPages(loaded.pages);
        setSelectedIdx(loaded.pages.length > 0 ? 0 : null);
        setSelectedPageIndices([]);
        history.clearHistory();
        setProjectFile(handle ? { handle, name: handle.name } : null);
        setDocTitle(loaded.title || stripExtension(file.name));
        view.applySavedSettings(loaded.settings);
      } catch (err) {
        setErrorMsg("Couldn't load that project — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setLoading(false);
      }
    }
    return {
      docTitle,
      setDocTitle,
      projectFile,
      justSaved,
      savingProject,
      projectInputRef,
      startNewDocument,
      handleSaveProject,
      openProjectPicker,
      handleProjectInputChange,
      handleLoadProjectFile
    };
  }

  // apps/ZEditor/src/state/useSelection.js
  var { useState: useState8, useEffect: useEffect3 } = React;
  function useSelection({ pages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices }) {
    const [tool, setTool] = useState8("select");
    const [selectedAnnId, setSelectedAnnId] = useState8(null);
    const [selectedAnnIds, setSelectedAnnIds] = useState8([]);
    const [editingAnnId, setEditingAnnId] = useState8(null);
    const [croppingAnnId, setCroppingAnnId] = useState8(null);
    function selectTool(t) {
      setTool(t);
      setEditingAnnId(null);
      if (t === "select") return;
      setSelectedAnnId(null);
      setSelectedAnnIds([]);
    }
    const currentAnnotations = () => selectedIdx === null ? [] : pages[selectedIdx].annotations || [];
    function handleSelectAnnotations(ids, additive) {
      const existing = additive && selectedAnnId !== null ? [selectedAnnId, ...selectedAnnIds] : [];
      const all = [.../* @__PURE__ */ new Set([...existing, ...withGroupMates(currentAnnotations(), ids)])];
      setSelectedAnnId(all.length > 0 ? all[0] : null);
      setSelectedAnnIds(all.slice(1));
    }
    function handleSelectAnnotation(id, shiftKey, single) {
      if (id === null) {
        setSelectedAnnId(null);
        setSelectedAnnIds([]);
        return;
      }
      const members = single ? [id] : withGroupMates(currentAnnotations(), [id]);
      if (!shiftKey) {
        setSelectedAnnId(id);
        setSelectedAnnIds(members.filter((m) => m !== id));
        return;
      }
      const currentAll = selectedAnnId !== null ? [selectedAnnId, ...selectedAnnIds] : [...selectedAnnIds];
      if (currentAll.includes(id)) {
        const next = currentAll.filter((x) => !members.includes(x));
        setSelectedAnnId(next.length > 0 ? next[0] : null);
        setSelectedAnnIds(next.slice(1));
      } else {
        setSelectedAnnIds([.../* @__PURE__ */ new Set([...currentAll, ...members.filter((m) => m !== id)])]);
        setSelectedAnnId(id);
      }
    }
    function handleSelectLayer(id, shiftKey, single) {
      selectTool("select");
      handleSelectAnnotation(id, shiftKey, single);
    }
    function selectedAnnotationIds() {
      return [selectedAnnId, ...selectedAnnIds].filter((id) => id !== null);
    }
    function handleSelectPage(idx, shiftKey) {
      if (!shiftKey || idx === null) {
        setSelectedIdx(idx);
        setSelectedPageIndices([]);
        return;
      }
      const currentAll = selectedIdx !== null ? [selectedIdx, ...selectedPageIndices] : [...selectedPageIndices];
      if (currentAll.includes(idx)) {
        const next = currentAll.filter((x) => x !== idx);
        setSelectedIdx(next.length > 0 ? next[0] : null);
        setSelectedPageIndices(next.slice(1));
      } else {
        setSelectedPageIndices(currentAll);
        setSelectedIdx(idx);
      }
    }
    function handleSelectAllPages() {
      if (pages.length === 0) return;
      const primary = selectedIdx !== null ? selectedIdx : 0;
      setSelectedIdx(primary);
      setSelectedPageIndices(pages.map((_, i) => i).filter((i) => i !== primary));
    }
    function pagesActedOn(idx) {
      const inMultiSelection = selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx));
      return inMultiSelection ? [selectedIdx, ...selectedPageIndices] : [idx];
    }
    function handleToggleCrop(id) {
      setCroppingAnnId((cur) => cur === id ? null : id);
    }
    useEffect3(() => {
      setSelectedAnnId(null);
    }, [selectedIdx]);
    useEffect3(() => {
      if (croppingAnnId !== null && croppingAnnId !== selectedAnnId) setCroppingAnnId(null);
    }, [selectedAnnId]);
    return {
      tool,
      setTool,
      selectTool,
      selectedAnnId,
      setSelectedAnnId,
      selectedAnnIds,
      setSelectedAnnIds,
      selectedAnnotationIds,
      currentAnnotations,
      editingAnnId,
      setEditingAnnId,
      croppingAnnId,
      handleToggleCrop,
      handleSelectAnnotations,
      handleSelectAnnotation,
      handleSelectLayer,
      handleSelectPage,
      handleSelectAllPages,
      pagesActedOn
    };
  }

  // apps/ZEditor/src/state/useStatus.js
  var { useState: useState9 } = React;
  function useStatus() {
    const [loading, setLoading] = useState9(false);
    const [errorMsg, setErrorMsg] = useState9(null);
    return { loading, setLoading, errorMsg, setErrorMsg };
  }

  // apps/ZEditor/src/model/magicEraser.js
  var MAGIC_ERASER_DEFAULTS = { tolerance: 32, contiguous: true };
  var MAGIC_TOLERANCE_MAX = 255;

  // apps/ZEditor/src/model/softEraser.js
  var SOFT_ERASER_DEFAULTS = { size: 40, softness: 60, strength: 100 };
  var SOFT_ERASER_DABS_PER_RADIUS = 4;

  // apps/ZEditor/src/model/text/textStyles.js
  var TEXT_STYLE_BASICS = ["fontFamily", "fontSize", "bold", "italic", "underline", "color", "align"];
  var TEXT_STYLE_PROPS = [
    ...TEXT_STYLE_BASICS,
    "lineSpacing",
    "letterSpacing",
    "strike",
    "textCase",
    "vertical",
    "fillAlpha",
    ...TEXT_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)])
  ];
  var BUILT_IN_TEXT_STYLES = [
    { name: "Title", builtIn: true, props: { fontSize: 56, bold: true, align: "center", letterSpacing: 4, lineSpacing: 100, textCase: "upper" } },
    { name: "Subtitle", builtIn: true, props: { fontSize: 28, italic: true, align: "center", letterSpacing: 1 } },
    { name: "Remark", builtIn: true, props: { fontSize: 12, italic: true } }
  ];
  function captureTextStyle(ann) {
    const props = {};
    TEXT_STYLE_PROPS.forEach((prop) => {
      if (ann[prop] !== void 0) props[prop] = ann[prop];
    });
    return props;
  }
  var TEXT_STYLE_KEEP_IF_MISSING = ["fontFamily", "fontSize", "color"];
  var TEXT_STYLE_RESETS = { bold: false, italic: false, underline: false, align: "left" };
  function textStylePatch(style) {
    const patch = {};
    TEXT_STYLE_PROPS.forEach((prop) => {
      if (style.props[prop] !== void 0) patch[prop] = style.props[prop];
      else if (prop in TEXT_STYLE_RESETS) patch[prop] = TEXT_STYLE_RESETS[prop];
      else if (!TEXT_STYLE_KEEP_IF_MISSING.includes(prop)) patch[prop] = void 0;
    });
    return patch;
  }
  var TEXT_STYLES_STORAGE_KEY = "zeditor.textStyles";
  function readStoredTextStyles() {
    try {
      const saved = JSON.parse(localStorage.getItem(TEXT_STYLES_STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter((s) => s && s.name && s.props) : [];
    } catch (err) {
      return [];
    }
  }

  // apps/ZEditor/src/state/useToolDefaults.js
  var { useState: useState10, useEffect: useEffect4 } = React;
  function useToolDefaults() {
    const [fontOptions, setFontOptions] = useState10(DEFAULT_FONT_OPTIONS);
    const [textStyles, setTextStyles] = useState10(readStoredTextStyles);
    useEffect4(() => {
      try {
        localStorage.setItem(TEXT_STYLES_STORAGE_KEY, JSON.stringify(textStyles));
      } catch (err) {
      }
    }, [textStyles]);
    function handleSaveTextStyle(name, ann) {
      setTextStyles((prev) => [...prev.filter((s) => s.name !== name), { name, props: captureTextStyle(ann) }]);
    }
    function handleDeleteTextStyle(name) {
      setTextStyles((prev) => prev.filter((s) => s.name !== name));
    }
    function mergeTextStyles(incoming) {
      if (!incoming.length) return;
      setTextStyles((prev) => [...prev.filter((s) => !incoming.some((i) => i.name === s.name)), ...incoming]);
    }
    function addFontFamilies(families) {
      if (!families.length) return;
      setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
    }
    const [penColor, setPenColor] = useState10(PEN_DEFAULTS.color);
    const [penWidth, setPenWidth] = useState10(PEN_DEFAULTS.width);
    const [penTaper, setPenTaper] = useState10(0);
    const [eraserMode, setEraserMode] = useState10("soft");
    const [softEraser, setSoftEraser] = useState10(SOFT_ERASER_DEFAULTS);
    const [magicEraser, setMagicEraser] = useState10(MAGIC_ERASER_DEFAULTS);
    const [highlighterColor, setHighlighterColor] = useState10(HIGHLIGHTER_DEFAULTS.color);
    const [highlighterWidth, setHighlighterWidth] = useState10(HIGHLIGHTER_DEFAULTS.width);
    const [highlighterTaper, setHighlighterTaper] = useState10(0);
    const [textFontFamily, setTextFontFamily] = useState10(DEFAULT_FONT_OPTIONS[0]);
    const [textFontSize, setTextFontSize] = useState10(16);
    const [textBold, setTextBold] = useState10(false);
    const [textItalic, setTextItalic] = useState10(false);
    const [textUnderline, setTextUnderline] = useState10(false);
    const [textColor, setTextColor] = useState10("#1a1a1a");
    const [textAlign, setTextAlign] = useState10("left");
    const [rectDefaults, setRectDefaults] = useState10(() => controlValues({}, RECT_CONTROLS));
    return {
      fontOptions,
      setFontOptions,
      addFontFamilies,
      textStyles,
      handleSaveTextStyle,
      handleDeleteTextStyle,
      mergeTextStyles,
      penColor,
      setPenColor,
      penWidth,
      setPenWidth,
      penTaper,
      setPenTaper,
      eraserMode,
      setEraserMode,
      softEraser,
      setSoftEraser,
      magicEraser,
      setMagicEraser,
      highlighterColor,
      setHighlighterColor,
      highlighterWidth,
      setHighlighterWidth,
      highlighterTaper,
      setHighlighterTaper,
      textFontFamily,
      setTextFontFamily,
      textFontSize,
      setTextFontSize,
      textBold,
      setTextBold,
      textItalic,
      setTextItalic,
      textUnderline,
      setTextUnderline,
      textColor,
      setTextColor,
      textAlign,
      setTextAlign,
      rectDefaults,
      setRectDefaults
    };
  }

  // apps/ZEditor/src/model/guides.js
  var GUIDE_FORMAT_PRESETS = [
    { key: "match", label: "Match Page Size" },
    { key: "half-letter", label: "Half Letter (5.5 × 8.5 in)", widthIn: 5.5, heightIn: 8.5 },
    { key: "digest", label: "Digest (5.5 × 8.25 in)", widthIn: 5.5, heightIn: 8.25 },
    { key: "a5", label: "A5 (5.83 × 8.27 in)", widthIn: 5.83, heightIn: 8.27 },
    { key: "a6", label: "A6 (4.13 × 5.83 in)", widthIn: 4.13, heightIn: 5.83 },
    { key: "quarter-letter", label: "Quarter Letter (4.25 × 5.5 in)", widthIn: 4.25, heightIn: 5.5 },
    { key: "letter", label: "US Letter (8.5 × 11 in)", widthIn: 8.5, heightIn: 11 },
    { key: "a4", label: "A4 (8.27 × 11.69 in)", widthIn: 8.27, heightIn: 11.69 }
  ];
  var DEFAULT_GUIDE_MARGIN_IN = 0.25;
  var DEFAULT_GUIDE_BLEED_IN = 0.125;

  // apps/ZEditor/src/state/useViewSettings.js
  var { useState: useState11 } = React;
  function useViewSettings() {
    const [guidesOn, setGuidesOn] = useState11(false);
    const [centerGuideOn, setCenterGuideOn] = useState11(false);
    const [guideFormat, setGuideFormat] = useState11("match");
    const [guideMarginIn, setGuideMarginIn] = useState11(DEFAULT_GUIDE_MARGIN_IN);
    const [guideBleedIn, setGuideBleedIn] = useState11(DEFAULT_GUIDE_BLEED_IN);
    const [pageNumbers, setPageNumbers] = useState11(DEFAULT_PAGE_NUMBERS);
    const [onionSkinOn, setOnionSkinOn] = useState11(false);
    const [onionSkinOpacity, setOnionSkinOpacity] = useState11(0.3);
    const [layersOpen, setLayersOpen] = useState11(true);
    const [layersPosition, setLayersPosition] = useState11(null);
    function settingsForSave() {
      return {
        guidesOn,
        guideFormat,
        guideMarginIn,
        guideBleedIn,
        centerGuideOn,
        onionSkinOn,
        onionSkinOpacity,
        pageNumbers
      };
    }
    function applySavedSettings(s) {
      if (s.guidesOn !== void 0) setGuidesOn(s.guidesOn);
      if (s.centerGuideOn !== void 0) setCenterGuideOn(s.centerGuideOn);
      if (s.guideFormat !== void 0) setGuideFormat(s.guideFormat);
      if (s.guideMarginIn !== void 0) setGuideMarginIn(s.guideMarginIn);
      if (s.guideBleedIn !== void 0) setGuideBleedIn(s.guideBleedIn);
      if (s.onionSkinOn !== void 0) setOnionSkinOn(s.onionSkinOn);
      if (s.onionSkinOpacity !== void 0) setOnionSkinOpacity(s.onionSkinOpacity);
      setPageNumbers({ ...DEFAULT_PAGE_NUMBERS, ...s.pageNumbers || {} });
    }
    return {
      guidesOn,
      setGuidesOn,
      centerGuideOn,
      setCenterGuideOn,
      guideFormat,
      setGuideFormat,
      guideMarginIn,
      setGuideMarginIn,
      guideBleedIn,
      setGuideBleedIn,
      pageNumbers,
      setPageNumbers,
      onionSkinOn,
      setOnionSkinOn,
      onionSkinOpacity,
      setOnionSkinOpacity,
      layersOpen,
      setLayersOpen,
      layersPosition,
      setLayersPosition,
      settingsForSave,
      applySavedSettings
    };
  }

  // apps/ZEditor/src/state/useZoom.js
  var { useState: useState12, useRef: useRef7, useLayoutEffect } = React;
  function useZoom() {
    const [zoomPercent, setZoomPercent] = useState12(ZOOM_PERCENT.initial);
    const previewPaneRef = useRef7(null);
    const zoomAnchorRef = useRef7(null);
    function artboardElement() {
      return previewPaneRef.current && previewPaneRef.current.querySelector(".ze-artboard-zoom");
    }
    function handleZoomChange(percent) {
      const pane = previewPaneRef.current, board = artboardElement();
      if (board) {
        zoomAnchorRef.current = {
          x: (pane.scrollLeft + pane.clientWidth / 2 - board.offsetLeft) / zoomPercent,
          y: (pane.scrollTop + pane.clientHeight / 2 - board.offsetTop) / zoomPercent
        };
      }
      setZoomPercent(percent);
    }
    useLayoutEffect(() => {
      const anchor = zoomAnchorRef.current, pane = previewPaneRef.current, board = artboardElement();
      if (!anchor || !board) return;
      zoomAnchorRef.current = null;
      pane.scrollLeft = anchor.x * zoomPercent + board.offsetLeft - pane.clientWidth / 2;
      pane.scrollTop = anchor.y * zoomPercent + board.offsetTop - pane.clientHeight / 2;
    }, [zoomPercent]);
    return { zoomPercent, previewPaneRef, handleZoomChange };
  }

  // apps/ZEditor/src/ui/pointer.js
  function dragDeltaFrom(startEvent, zoom, angle = 0) {
    const { clientX: startX, clientY: startY } = startEvent;
    return (ev) => {
      const [dx, dy] = rotatePoint((ev.clientX - startX) / zoom, (ev.clientY - startY) / zoom, -angle);
      return { dx, dy };
    };
  }
  var DRAG_THRESHOLD = 4;
  function trackPointerDrag(onMove, onUp) {
    const move = (ev) => onMove(ev);
    const up = (ev) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (onUp) onUp(ev);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function textOffsetAtPoint(x, y, element, textLength) {
    let node = null, offset = 0;
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (position) {
        node = position.offsetNode;
        offset = position.offset;
      }
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range) {
        node = range.startContainer;
        offset = range.startOffset;
      }
    }
    return node && node.nodeType === Node.TEXT_NODE && element.contains(node) ? offset : textLength;
  }

  // apps/ZEditor/src/ui/canvas/BoxEffectOverlays.jsx
  var { useRef: useRef8, useEffect: useEffect5 } = React;
  function BoxEffectOverlays({ ann, edgeOutline }) {
    const textureCanvasRef = useRef8(null);
    const textureKey = ann.texture ? JSON.stringify(effectSettings(ann, TEXTURE_EFFECT)) : null;
    const stroke = ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null;
    useEffect5(() => {
      const canvas = textureCanvasRef.current;
      if (!textureKey || !canvas) return;
      canvas.width = Math.max(1, Math.ceil(ann.width));
      canvas.height = Math.max(1, Math.ceil(ann.height));
      drawTextureMarks(canvas.getContext("2d"), ann);
    }, [textureKey, ann.width, ann.height]);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, ann.texture && /* @__PURE__ */ React.createElement("canvas", { ref: textureCanvasRef, className: "ze-ann-image-texture", style: { clipPath: edgeOutline ? `path("${edgeOutline}")` : void 0 } }), stroke && /* @__PURE__ */ React.createElement("svg", { className: "ze-ann-image-stroke", width: ann.width, height: ann.height, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(
      "path",
      {
        d: edgeOutline || rectOutline(ann),
        fill: "none",
        stroke: stroke.strokeColor,
        strokeWidth: stroke.strokeThickness,
        strokeLinejoin: "miter",
        strokeMiterlimit: STROKE_MITER_LIMIT
      }
    )));
  }

  // apps/ZEditor/src/ui/canvas/boxStyles.js
  var rotationCss = (ann) => angleOf(ann) ? `rotate(${angleOf(ann)}deg)` : void 0;
  function boxGroupStyle(ann) {
    const shadow = imageShadowOffset(ann);
    const opacity = opacityOf(ann);
    const blend = blendOf(ann);
    const [shadowX, shadowY] = shadow ? rotatePoint(shadow.x, shadow.y, -angleOf(ann)) : [0, 0];
    return {
      filter: shadow ? `drop-shadow(${shadowX}px ${shadowY}px ${shadow.blur}px ${shadow.color})` : void 0,
      opacity: opacity < 1 ? opacity : void 0,
      // A rotated box is its own stacking context, which would trap this
      // blend inside it; see boxOuterStyle, which carries it instead.
      mixBlendMode: blend !== "normal" && !angleOf(ann) ? blend : void 0
    };
  }
  function boxOuterStyle(ann) {
    const blend = blendOf(ann);
    return {
      left: ann.x,
      top: ann.y,
      width: ann.width,
      height: ann.height,
      transform: rotationCss(ann),
      mixBlendMode: angleOf(ann) && blend !== "normal" ? blend : void 0
    };
  }

  // apps/ZEditor/src/ui/canvas/ResizeHandles.jsx
  var ALL_RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  var TEXT_RESIZE_HANDLES = ["nw", "ne", "e", "se", "sw", "w"];
  function ResizeHandles({ handles, onStart, onRotate }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, handles.map((handle) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: handle,
        className: "ze-resize-handle ze-resize-handle-" + handle,
        onMouseDown: (e) => {
          e.preventDefault();
          e.stopPropagation();
          onStart(handle, e);
        }
      }
    )), onRotate && /* @__PURE__ */ React.createElement("div", { className: "ze-rotate-handle", title: "Rotate (hold Shift to snap to 15°)", onMouseDown: (e) => startRotateDrag(e, onRotate) }));
  }
  function startRotateDrag(e, onRotate) {
    e.preventDefault();
    e.stopPropagation();
    const box = e.currentTarget.parentElement.getBoundingClientRect();
    const centerX = box.left + box.width / 2, centerY = box.top + box.height / 2;
    trackPointerDrag((ev) => {
      let degrees = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180 / Math.PI + 90;
      degrees = ev.shiftKey ? Math.round(degrees / 15) * 15 : Math.round(degrees);
      onRotate((degrees % 360 + 360) % 360);
    });
  }

  // apps/ZEditor/src/ui/canvas/AnnotationImage.jsx
  var { useRef: useRef9, useEffect: useEffect6 } = React;
  var MIN_CROP_SIZE = 20;
  function AnnotationImage({ ann, tool, isSelected, showHandles, isCropping, onPress, onUpdate, onToggleCrop, pageFilter, zoom }) {
    const halftoneCanvasRef = useRef9(null);
    const naturalW = ann.naturalWidth, naturalH = ann.naturalHeight;
    const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
    const cropW = ann.cropW || naturalW, cropH = ann.cropH || naturalH;
    const displayScaleX = ann.width / cropW, displayScaleY = ann.height / cropH;
    function startResize(handle, e) {
      const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
      const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onUpdate(ann.id, resizedBox(orig, handle, dx, dy, !ev.shiftKey, MIN_RESIZE_SIZE, angleOf(ann)));
      });
    }
    function startCropPan(e) {
      e.preventDefault();
      e.stopPropagation();
      const dragDelta = dragDeltaFrom(e, zoom);
      const origCropX = cropX, origCropY = cropY;
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        const dxNat = dx / displayScaleX;
        const dyNat = dy / displayScaleY;
        const newCropX = Math.min(Math.max(0, origCropX - dxNat), Math.max(0, naturalW - cropW));
        const newCropY = Math.min(Math.max(0, origCropY - dyNat), Math.max(0, naturalH - cropH));
        onUpdate(ann.id, { cropX: newCropX, cropY: newCropY });
      });
    }
    function startCropCornerResize(corner, e) {
      e.preventDefault();
      e.stopPropagation();
      const imageOriginX = ann.x - cropX * displayScaleX;
      const imageOriginY = ann.y - cropY * displayScaleY;
      const dragDelta = dragDeltaFrom(e, zoom);
      const orig = { cropX, cropY, cropW, cropH };
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        const dxNat = dx / displayScaleX;
        const dyNat = dy / displayScaleY;
        let cx = orig.cropX, cy = orig.cropY, cw = orig.cropW, ch = orig.cropH;
        if (corner === "se") {
          cw = orig.cropW + dxNat;
          ch = orig.cropH + dyNat;
        } else if (corner === "ne") {
          cy = orig.cropY + dyNat;
          cw = orig.cropW + dxNat;
          ch = orig.cropH - dyNat;
        } else if (corner === "sw") {
          cx = orig.cropX + dxNat;
          cw = orig.cropW - dxNat;
          ch = orig.cropH + dyNat;
        } else {
          cx = orig.cropX + dxNat;
          cy = orig.cropY + dyNat;
          cw = orig.cropW - dxNat;
          ch = orig.cropH - dyNat;
        }
        cw = Math.max(MIN_CROP_SIZE, cw);
        ch = Math.max(MIN_CROP_SIZE, ch);
        cx = Math.min(Math.max(0, cx), orig.cropX + orig.cropW - MIN_CROP_SIZE);
        cy = Math.min(Math.max(0, cy), orig.cropY + orig.cropH - MIN_CROP_SIZE);
        cw = Math.min(cw, naturalW - cx);
        ch = Math.min(ch, naturalH - cy);
        onUpdate(ann.id, {
          cropX: cx,
          cropY: cy,
          cropW: cw,
          cropH: ch,
          x: imageOriginX + cx * displayScaleX,
          y: imageOriginY + cy * displayScaleY,
          width: cw * displayScaleX,
          height: ch * displayScaleY
        });
      });
    }
    const imgFilter = effectiveImageFilter(ann, pageFilter);
    const filterType = imgFilter.type;
    const adjusted = hasPhotoAdjust(ann);
    const usesFilterCanvas = Boolean(FILTER_CONTROLS[filterType]) || adjusted;
    const filterCanvasKey = usesFilterCanvas ? JSON.stringify([imgFilter, adjusted ? controlValues(ann, PHOTO_ADJUST_CONTROLS) : null]) : null;
    useEffect6(() => {
      if (!usesFilterCanvas || isCropping) return;
      let cancelled = false;
      (async () => {
        const img = await loadImageElement(ann.src);
        if (cancelled) return;
        const canvas = halftoneCanvasRef.current;
        if (!canvas) return;
        const w = Math.max(1, Math.round(ann.width));
        const h = Math.max(1, Math.round(ann.height));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, w, h);
        if (adjusted) applyPhotoAdjust(ctx, canvas, ann);
        applyPageFilter(ctx, canvas, imgFilter, 1);
      })();
      return () => {
        cancelled = true;
      };
    }, [filterCanvasKey, isCropping, ann.src, ann.width, ann.height, cropX, cropY, cropW, cropH]);
    if (isCropping) {
      const imageOriginX = ann.x - cropX * displayScaleX;
      const imageOriginY = ann.y - cropY * displayScaleY;
      const fullW = naturalW * displayScaleX, fullH = naturalH * displayScaleY;
      const winX = cropX * displayScaleX, winY = cropY * displayScaleY, winW = cropW * displayScaleX, winH = cropH * displayScaleY;
      return /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image ze-ann-image--cropping", style: { left: imageOriginX, top: imageOriginY, width: fullW, height: fullH } }, /* @__PURE__ */ React.createElement("img", { src: ann.src, alt: "", draggable: "false", className: "ze-crop-full-img" }), /* @__PURE__ */ React.createElement("div", { className: "ze-crop-window", style: { left: winX, top: winY, width: winW, height: winH }, onMouseDown: startCropPan }, /* @__PURE__ */ React.createElement("div", { className: "ze-crop-window-clip" }, /* @__PURE__ */ React.createElement("img", { src: ann.src, alt: "", draggable: "false", style: { position: "absolute", left: -winX, top: -winY, width: fullW, height: fullH } })), /* @__PURE__ */ React.createElement("div", { className: "ze-crop-handle ze-crop-handle-nw", onMouseDown: (e) => startCropCornerResize("nw", e) }), /* @__PURE__ */ React.createElement("div", { className: "ze-crop-handle ze-crop-handle-ne", onMouseDown: (e) => startCropCornerResize("ne", e) }), /* @__PURE__ */ React.createElement("div", { className: "ze-crop-handle ze-crop-handle-sw", onMouseDown: (e) => startCropCornerResize("sw", e) }), /* @__PURE__ */ React.createElement("div", { className: "ze-crop-handle ze-crop-handle-se", onMouseDown: (e) => startCropCornerResize("se", e) })));
    }
    const hasOwnDuotone = ann.filter && ann.filter.type === "duotone";
    const duotoneFilterId = hasOwnDuotone ? "ze-filter-duotone-img-" + ann.id : "ze-filter-duotone";
    const cssFilter = usesFilterCanvas ? void 0 : (
      // the canvas already has the filter applied
      filterType === "grayscale" ? "url(#ze-filter-grayscale)" : filterType === "duotone" ? `url(#${duotoneFilterId})` : void 0
    );
    const frameStyle = {};
    const edgeOutline = imageEdgeOutline(ann);
    if (edgeOutline) frameStyle.clipPath = `path("${edgeOutline}")`;
    if (cssFilter) frameStyle.filter = cssFilter;
    const ownDuotoneDarkRgb = hasOwnDuotone ? hexToRgb(imgFilter.darkColor || DEFAULT_DUOTONE_DARK) : null;
    const ownDuotoneLightRgb = hasOwnDuotone ? hexToRgb(imgFilter.lightColor || DEFAULT_DUOTONE_LIGHT) : null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-ann-id": ann.id,
        className: "ze-ann-image" + (isSelected ? " is-selected" : "") + (ann.locked ? " is-locked" : ""),
        style: boxOuterStyle(ann),
        onMouseDown: (e) => {
          if (tool === "select") onPress(e, ann);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image-shadow", style: boxGroupStyle(ann) }, usesFilterCanvas ? /* @__PURE__ */ React.createElement("canvas", { ref: halftoneCanvasRef, style: frameStyle }) : /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image-frame", style: frameStyle }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: ann.src,
          alt: "",
          draggable: "false",
          style: { position: "absolute", left: -cropX * displayScaleX, top: -cropY * displayScaleY, width: naturalW * displayScaleX, height: naturalH * displayScaleY }
        }
      )), /* @__PURE__ */ React.createElement(BoxEffectOverlays, { ann, edgeOutline })),
      showHandles && /* @__PURE__ */ React.createElement(ResizeHandles, { handles: ALL_RESIZE_HANDLES, onStart: startResize, onRotate: (angle) => onUpdate(ann.id, { angle }) }),
      hasOwnDuotone && /* @__PURE__ */ React.createElement("svg", { width: "0", height: "0", style: { position: "absolute" }, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("filter", { id: duotoneFilterId, colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feColorMatrix", { type: "matrix", values: LUMINANCE_MATRIX_VALUES }), /* @__PURE__ */ React.createElement("feComponentTransfer", null, /* @__PURE__ */ React.createElement("feFuncR", { type: "linear", slope: (ownDuotoneLightRgb.r - ownDuotoneDarkRgb.r) / 255, intercept: ownDuotoneDarkRgb.r / 255 }), /* @__PURE__ */ React.createElement("feFuncG", { type: "linear", slope: (ownDuotoneLightRgb.g - ownDuotoneDarkRgb.g) / 255, intercept: ownDuotoneDarkRgb.g / 255 }), /* @__PURE__ */ React.createElement("feFuncB", { type: "linear", slope: (ownDuotoneLightRgb.b - ownDuotoneDarkRgb.b) / 255, intercept: ownDuotoneDarkRgb.b / 255 })))))
    );
  }

  // apps/ZEditor/src/ui/canvas/AnnotationRect.jsx
  function AnnotationRect({ ann, tool, isSelected, showHandles, onPress, onUpdate, zoom }) {
    function startResize(handle, e) {
      const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
      const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onUpdate(ann.id, resizedBox(orig, handle, dx, dy, ev.shiftKey, MIN_RECT_SIZE, angleOf(ann)));
      });
    }
    const edgeOutline = imageEdgeOutline(ann);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-ann-id": ann.id,
        className: "ze-ann-image" + (isSelected ? " is-selected" : "") + (ann.locked ? " is-locked" : ""),
        style: boxOuterStyle(ann),
        onMouseDown: (e) => {
          if (tool === "select") onPress(e, ann);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image-shadow", style: boxGroupStyle(ann) }, /* @__PURE__ */ React.createElement("div", { className: "ze-ann-rect-fill", style: { background: rectFillCss(ann), clipPath: edgeOutline ? `path("${edgeOutline}")` : void 0 } }), /* @__PURE__ */ React.createElement(BoxEffectOverlays, { ann, edgeOutline })),
      showHandles && /* @__PURE__ */ React.createElement(ResizeHandles, { handles: ALL_RESIZE_HANDLES, onStart: startResize, onRotate: (angle) => onUpdate(ann.id, { angle }) })
    );
  }

  // apps/ZEditor/src/ui/textSelection.js
  var textSelectionStore = { annId: null, start: 0, end: 0 };

  // apps/ZEditor/src/ui/canvas/AnnotationText.jsx
  var { useRef: useRef10, useEffect: useEffect7, useLayoutEffect: useLayoutEffect2 } = React;
  function AnnotationText({ ann, tool, isSelected, isEditing, showHandles, zoom, onPress, onStartEdit, onFinishEdit, onUpdate }) {
    const boxRef = useRef10(null);
    const inputRef = useRef10(null);
    const pendingCaretRef = useRef10(null);
    const liveCanvasRef = useRef10(null);
    useLayoutEffect2(() => {
      if (!isEditing || !inputRef.current) return;
      const caret = pendingCaretRef.current != null ? pendingCaretRef.current : ann.text.length;
      pendingCaretRef.current = null;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(caret, caret);
    }, [isEditing]);
    function startEditingAt(x, y) {
      pendingCaretRef.current = textOffsetAtPoint(x, y, boxRef.current, ann.text.length);
      onStartEdit(ann.id);
    }
    function handleMouseDown(e) {
      if (isEditing) {
        e.stopPropagation();
        return;
      }
      if (tool !== "select" && tool !== "text") return;
      const { clientX, clientY } = e;
      onPress(e, ann, () => {
        if (tool === "text") startEditingAt(clientX, clientY);
      });
    }
    function startResize(handle, e) {
      const orig = { x: ann.x, y: ann.y, width: boxRef.current.offsetWidth, height: boxRef.current.offsetHeight };
      const origFontSize = ann.fontSize || 16;
      const hasSetWidth = Boolean(ann.width);
      const angle = angleOf(ann);
      const dragDelta = dragDeltaFrom(e, zoom, angle);
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        if (handle === "e" || handle === "w") {
          const box2 = resizedBox(orig, handle, dx, dy, false, MIN_RESIZE_SIZE, angle);
          onUpdate(ann.id, { x: box2.x, y: box2.y, width: box2.width });
          return;
        }
        const box = resizedBox(orig, handle, dx, dy, true, MIN_RESIZE_SIZE, angle);
        const scaled = { x: box.x, y: box.y, fontSize: Math.max(6, Math.round(origFontSize * box.width / orig.width)) };
        onUpdate(ann.id, hasSetWidth ? { ...scaled, width: box.width } : scaled);
      });
    }
    const look = textLook(ann);
    const hasLetterColors = Boolean(ann.colorRuns && ann.colorRuns.length);
    function rememberSelection(input) {
      textSelectionStore.annId = ann.id;
      textSelectionStore.start = input.selectionStart;
      textSelectionStore.end = input.selectionEnd;
    }
    const canvasMode = usesCanvasText(ann) && !isEditing && Boolean(ann.text);
    const liveBox = canvasMode ? measureTextBox(ann) : null;
    const canvasMargin = canvasMode ? textCanvasMargin(ann, look) : 0;
    const liveDrawKey = canvasMode ? JSON.stringify({ ...ann, x: 0, y: 0, angle: 0, id: 0, locked: void 0, hidden: void 0, name: void 0, blend: void 0 }) : "";
    useEffect7(() => {
      if (!canvasMode) return void 0;
      let cancelled = false;
      (async () => {
        const scale = Math.min(4, Math.max(1, zoom * (window.devicePixelRatio || 1)));
        const offscreen = document.createElement("canvas");
        offscreen.width = Math.ceil((liveBox.width + canvasMargin * 2) * scale);
        offscreen.height = Math.ceil((liveBox.height + canvasMargin * 2) * scale);
        const shadowDirection = controlValues(ann, SHADOW_EFFECT.controls).shadowDirection - angleOf(ann);
        await drawTextOnCanvas(offscreen.getContext("2d"), { ...ann, x: canvasMargin, y: canvasMargin, angle: 0, shadowDirection }, scale);
        const canvas = liveCanvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
        canvas.getContext("2d").drawImage(offscreen, 0, 0);
      })();
      return () => {
        cancelled = true;
      };
    }, [liveDrawKey, zoom, canvasMode]);
    const decorations = [ann.underline && "underline", look.strike !== "none" && "line-through"].filter(Boolean);
    const style = {
      left: ann.x,
      top: ann.y,
      fontFamily: ann.fontFamily ? `'${ann.fontFamily}', sans-serif` : void 0,
      fontSize: (ann.fontSize || 16) + "px",
      fontWeight: ann.bold ? 700 : 400,
      fontStyle: ann.italic ? "italic" : "normal",
      lineHeight: look.lineHeight,
      letterSpacing: look.letterSpacingPx ? look.letterSpacingPx + "px" : void 0,
      textTransform: { upper: "uppercase", lower: "lowercase", title: "capitalize" }[look.textCase],
      fontVariantCaps: look.textCase === "small" ? "small-caps" : void 0,
      textDecorationLine: decorations.length ? decorations.join(" ") : "none",
      textDecorationStyle: look.strike === "double" || look.strike === "wavy" ? look.strike : "solid",
      textDecorationColor: look.color,
      color: ann.color,
      textAlign: ann.align || "left",
      padding: `${look.padY}px ${look.padX}px`,
      mixBlendMode: blendOf(ann) !== "normal" ? blendOf(ann) : void 0,
      transform: rotationCss(ann)
    };
    if (look.label && !canvasMode) {
      style.background = rgbaCss(look.label.labelColor, look.label.labelAlpha);
      style.borderRadius = look.label.labelRadius;
    }
    if (ann.width) style.width = ann.width;
    else style.maxWidth = AUTO_TEXT_MAX_WIDTH;
    if (canvasMode) {
      style.width = liveBox.width;
      style.height = liveBox.height;
      style.maxWidth = void 0;
      style.color = "transparent";
    }
    const gradientStyle = look.gradient ? {
      backgroundImage: rectFillCss(textGradientView(ann, look)),
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent"
    } : null;
    const fillStyle = {};
    if (look.photo) {
      const area = measureTextBox(ann);
      const place = photoPlacement(look.photo, area.contentWidth, area.contentHeight);
      Object.assign(fillStyle, {
        backgroundImage: `url("${look.photo.src}")`,
        backgroundSize: `${place.width}px ${place.height}px`,
        backgroundPosition: `${place.left}px ${place.top}px`,
        backgroundRepeat: "no-repeat",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        // Fades only the photo letters: when faded, this block is always the
        // copy laid over the text-colour copy (see `layered`).
        opacity: look.photo.fillPhotoAlpha < 100 ? look.photo.fillPhotoAlpha / 100 : void 0
      });
    } else if (gradientStyle) {
      Object.assign(fillStyle, gradientStyle);
    } else if (look.fillAlpha < 100) {
      fillStyle.color = rgbaCss(look.color, look.fillAlpha);
    }
    const outlineStyle = {};
    if (look.stroke) {
      outlineStyle.WebkitTextStroke = `${look.stroke.strokeThickness}px ${look.stroke.strokeColor}`;
      outlineStyle.paintOrder = "stroke fill";
    }
    if (look.shadow) {
      const [shadowX, shadowY] = rotatePoint(look.shadow.x, look.shadow.y, -angleOf(ann));
      outlineStyle.textShadow = `${shadowX}px ${shadowY}px ${look.shadow.blur}px ${rgbaCss(look.shadow.color, look.fillAlpha)}`;
    }
    const fadedPhoto = Boolean(look.photo && look.photo.fillPhotoAlpha < 100);
    const baseFillStyle = fadedPhoto ? gradientStyle || { color: rgbaCss(look.color, look.fillAlpha) } : null;
    const layered = Boolean((look.gradient || look.photo) && (look.stroke || look.shadow || fadedPhoto) && ann.text);
    const bodyStyle = layered ? { display: "block", position: "relative" } : { display: "block", ...fillStyle, ...outlineStyle };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: boxRef,
        "data-ann-id": ann.id,
        className: "ze-ann-text" + (isSelected ? " is-selected" : "") + (isEditing ? " is-editing" : "") + (ann.locked ? " is-locked" : ""),
        style,
        onMouseDown: handleMouseDown,
        onDoubleClick: (e) => {
          e.stopPropagation();
          if (tool === "select" && !isEditing) startEditingAt(e.clientX, e.clientY);
        }
      },
      isEditing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "ze-ann-text-mirror" + (hasLetterColors ? " is-visible" : "") }, hasLetterColors ? colorSegments(ann.text + "​", ann.colorRuns).map((seg, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: seg.color ? { color: seg.color } : void 0 }, seg.text)) : ann.text + "​"), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          ref: inputRef,
          className: "ze-ann-text-input",
          style: hasLetterColors ? { color: "transparent", caretColor: ann.color } : void 0,
          value: ann.text,
          spellCheck: "false",
          onChange: (e) => {
            const text = e.target.value;
            const patch = { text };
            if (hasLetterColors) patch.colorRuns = adjustRunsForEdit(ann.colorRuns, ann.text, text);
            rememberSelection(e.target);
            onUpdate(ann.id, patch);
          },
          onSelect: (e) => rememberSelection(e.target),
          onBlur: (e) => {
            rememberSelection(e.target);
            onFinishEdit();
          },
          onMouseDown: (e) => e.stopPropagation(),
          onKeyDown: (e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onFinishEdit();
            }
          }
        }
      )) : canvasMode ? /* @__PURE__ */ React.createElement(
        "canvas",
        {
          ref: liveCanvasRef,
          className: "ze-ann-text-canvas",
          style: { left: -(canvasMargin + TEXT_BORDER_PX), top: -(canvasMargin + TEXT_BORDER_PX), width: liveBox.width + canvasMargin * 2, height: liveBox.height + canvasMargin * 2 }
        }
      ) : /* @__PURE__ */ React.createElement("span", { style: bodyStyle }, layered && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { display: "block", position: "absolute", left: 0, top: 0, width: "100%", color: "transparent", ...outlineStyle } }, ann.text), layered && baseFillStyle && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { display: "block", position: "absolute", left: 0, top: 0, width: "100%", ...baseFillStyle } }, ann.text), layered ? /* @__PURE__ */ React.createElement("span", { style: { display: "block", position: "relative", ...fillStyle } }, ann.text) : ann.text ? ann.text : /* @__PURE__ */ React.createElement("span", { className: "ze-ann-text-placeholder" }, "Text")),
      showHandles && !isEditing && /* @__PURE__ */ React.createElement(ResizeHandles, { handles: TEXT_RESIZE_HANDLES, onStart: startResize, onRotate: (angle) => onUpdate(ann.id, { angle }) })
    );
  }

  // apps/ZEditor/src/ui/canvas/StrokeShape.jsx
  function StrokeShape({ ann, tool, isSelected, onPress }) {
    const isHi = ann.tool === "highlighter";
    const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
    const width = ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width);
    const taper = ann.taper || 0;
    const box = bboxOf(ann);
    const handleMouseDown = (e) => {
      if (tool === "select") onPress(e, ann);
    };
    const pickable = tool === "select" && !ann.locked;
    const selectCursor = { cursor: pickable ? "move" : "default" };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, taper > 0 ? /* @__PURE__ */ React.createElement(
      "path",
      {
        "data-ann-id": ann.id,
        d: taperedPathD(ann.points, width, taper),
        fill: color,
        fillOpacity: isHi ? 0.45 : 1,
        stroke: "none",
        style: { pointerEvents: pickable ? "fill" : "none", ...selectCursor },
        onMouseDown: handleMouseDown
      }
    ) : /* @__PURE__ */ React.createElement(
      "path",
      {
        "data-ann-id": ann.id,
        d: smoothPathD(ann.points),
        fill: "none",
        stroke: color,
        strokeWidth: width,
        strokeOpacity: isHi ? 0.45 : 1,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        style: { pointerEvents: pickable ? "stroke" : "none", ...selectCursor },
        onMouseDown: handleMouseDown
      }
    ), isSelected && /* @__PURE__ */ React.createElement(
      "rect",
      {
        x: box.x - 6,
        y: box.y - 6,
        width: box.width + 12,
        height: box.height + 12,
        fill: "none",
        stroke: "#dd531a",
        strokeDasharray: "4 3",
        strokeWidth: "1.5",
        pointerEvents: "none"
      }
    ));
  }

  // apps/ZEditor/src/ui/canvas/AnnotationItem.jsx
  function AnnotationItem({
    ann: a,
    tool,
    zoom,
    pageSize,
    pageFilter,
    isSelected,
    showHandles,
    isEditing,
    isCropping,
    onPress,
    onUpdate,
    onToggleCrop,
    onStartTextEdit,
    onFinishTextEdit
  }) {
    if (a.type === "image") {
      return /* @__PURE__ */ React.createElement(
        AnnotationImage,
        {
          ann: a,
          tool,
          isSelected,
          showHandles,
          isCropping,
          onPress,
          onUpdate,
          onToggleCrop,
          pageFilter,
          zoom
        }
      );
    }
    if (a.type === "rect") {
      return /* @__PURE__ */ React.createElement(
        AnnotationRect,
        {
          ann: a,
          tool,
          isSelected,
          showHandles,
          onPress,
          onUpdate,
          zoom
        }
      );
    }
    if (a.type === "text") {
      return /* @__PURE__ */ React.createElement(
        AnnotationText,
        {
          ann: a,
          tool,
          isSelected,
          isEditing,
          showHandles,
          onPress,
          onStartEdit: onStartTextEdit,
          onFinishEdit: onFinishTextEdit,
          onUpdate,
          zoom
        }
      );
    }
    return /* @__PURE__ */ React.createElement("svg", { className: "ze-stroke-svg", width: pageSize.width, height: pageSize.height, style: blendOf(a) !== "normal" ? { mixBlendMode: blendOf(a) } : void 0 }, /* @__PURE__ */ React.createElement(StrokeShape, { ann: a, tool, isSelected, onPress }));
  }

  // apps/ZEditor/src/ui/canvas/GuidesOverlay.jsx
  function GuidesOverlay({ width, height, format, marginIn, bleedIn }) {
    const preset = GUIDE_FORMAT_PRESETS.find((p) => p.key === format) || GUIDE_FORMAT_PRESETS[0];
    const toPx = (inches) => inches * POINTS_PER_INCH * MAIN_SCALE;
    const trimW = preset.widthIn ? Math.min(width, toPx(preset.widthIn)) : width;
    const trimH = preset.heightIn ? Math.min(height, toPx(preset.heightIn)) : height;
    const trimX = (width - trimW) / 2;
    const trimY = (height - trimH) / 2;
    const showTrim = preset.key !== "match";
    const marginPx = toPx(marginIn || 0);
    const marginW = trimW - marginPx * 2, marginH = trimH - marginPx * 2;
    const showMargin = marginPx > 0 && marginW > 0 && marginH > 0;
    const bleedPx = toPx(bleedIn || 0);
    const showBleed = bleedPx > 0;
    return /* @__PURE__ */ React.createElement("svg", { className: "ze-guides-overlay", width, height, "aria-hidden": "true" }, showBleed && /* @__PURE__ */ React.createElement(
      "rect",
      {
        x: trimX - bleedPx,
        y: trimY - bleedPx,
        width: trimW + bleedPx * 2,
        height: trimH + bleedPx * 2,
        fill: "none",
        stroke: "#dd531a",
        strokeDasharray: "2 4",
        strokeWidth: "1",
        opacity: "0.6"
      }
    ), showTrim && /* @__PURE__ */ React.createElement("rect", { x: trimX, y: trimY, width: trimW, height: trimH, fill: "none", stroke: "#ffffff", strokeDasharray: "5 3", strokeWidth: "1.25", opacity: "0.85" }), showMargin && /* @__PURE__ */ React.createElement(
      "rect",
      {
        x: trimX + marginPx,
        y: trimY + marginPx,
        width: marginW,
        height: marginH,
        fill: "none",
        stroke: "#dd531a",
        strokeDasharray: "4 3",
        strokeWidth: "1.25"
      }
    ));
  }

  // apps/ZEditor/src/ui/canvas/CanvasOverlays.jsx
  function LiveStroke({ drawing, pageSize }) {
    return /* @__PURE__ */ React.createElement("svg", { className: "ze-stroke-svg", width: pageSize.width, height: pageSize.height }, drawing && (drawing.taper > 0 ? /* @__PURE__ */ React.createElement(
      "path",
      {
        d: taperedPathD(drawing.points, drawing.width, drawing.taper),
        fill: drawing.color,
        fillOpacity: drawing.tool === "highlighter" ? 0.45 : 1,
        stroke: "none"
      }
    ) : /* @__PURE__ */ React.createElement(
      "path",
      {
        d: smoothPathD(drawing.points),
        fill: "none",
        stroke: drawing.color,
        strokeWidth: drawing.width,
        strokeOpacity: drawing.tool === "highlighter" ? 0.45 : 1,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    )));
  }
  function BrushCursor({ pos, softEraser }) {
    return /* @__PURE__ */ React.createElement("div", { className: "ze-brush-cursor", style: { left: pos.x, top: pos.y, width: softEraser.size, height: softEraser.size } }, softEraser.softness > 0 && softEraser.softness < 100 && /* @__PURE__ */ React.createElement("div", { className: "ze-brush-cursor-core", style: { width: `${100 - softEraser.softness}%`, height: `${100 - softEraser.softness}%` } }));
  }
  function PageOverlays({ pageSize, numberSpec, guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn }) {
    if (pageSize.width <= 0) return null;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, numberSpec && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-page-number",
        style: {
          fontSize: numberSpec.size * MAIN_SCALE,
          color: numberSpec.color,
          [numberSpec.vertical]: numberSpec.marginIn * 72 * MAIN_SCALE,
          ...numberSpec.horizontal === "center" ? { left: 0, right: 0, textAlign: "center" } : { [numberSpec.horizontal]: numberSpec.marginIn * 72 * MAIN_SCALE }
        }
      },
      numberSpec.text
    ), guidesOn && /* @__PURE__ */ React.createElement(
      GuidesOverlay,
      {
        width: pageSize.width,
        height: pageSize.height,
        format: guideFormat,
        marginIn: guideMarginIn,
        bleedIn: guideBleedIn
      }
    ), centerGuideOn && // The page's vertical middle — where a two-page spread folds.
    /* @__PURE__ */ React.createElement("svg", { className: "ze-guides-overlay", width: pageSize.width, height: pageSize.height, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(
      "line",
      {
        x1: pageSize.width / 2,
        y1: 0,
        x2: pageSize.width / 2,
        y2: pageSize.height,
        stroke: "#1d9bf0",
        strokeDasharray: "6 4",
        strokeWidth: "1.25"
      }
    )));
  }

  // apps/ZEditor/src/ui/canvas/SelectionTurn.jsx
  function selectionTurnFor({ tool, annotations, selectedAnnId, selectedAnnIds, editingAnnId }) {
    const selectedItems = tool === "select" ? annotations.filter((a) => (a.id === selectedAnnId || selectedAnnIds.includes(a.id)) && !a.hidden && !a.locked) : [];
    const needsSelectionKnob = selectedItems.length > 1 || selectedItems.length === 1 && selectedItems[0].type === "stroke";
    if (!needsSelectionKnob || editingAnnId) return null;
    const bounds = selectedItems.map(annotationBounds);
    const x0 = Math.min(...bounds.map((b) => b.x)), y0 = Math.min(...bounds.map((b) => b.y));
    const x1 = Math.max(...bounds.map((b) => b.x + b.width)), y1 = Math.max(...bounds.map((b) => b.y + b.height));
    return { items: selectedItems, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function SelectionTurnKnob({ turn, zoom, toPagePoint, onRotateAnnotations }) {
    function startSelectionTurn(e) {
      e.preventDefault();
      e.stopPropagation();
      const { items, cx, cy } = turn;
      const pointerAngle = (ev) => {
        const p = toPagePoint(ev);
        return Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      };
      const startAngle = pointerAngle(e);
      trackPointerDrag((ev) => {
        let delta = pointerAngle(ev) - startAngle;
        delta = ev.shiftKey ? Math.round(delta / 15) * 15 : delta;
        onRotateAnnotations(items, delta, cx, cy);
      });
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, turn.items.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "ze-group-outline", style: { left: turn.box.x, top: turn.box.y, width: turn.box.width, height: turn.box.height } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-rotate-handle",
        title: "Rotate the selection (hold Shift to snap to 15°)",
        style: { left: turn.cx, top: turn.box.y - 22 / zoom },
        onMouseDown: startSelectionTurn
      }
    ));
  }

  // apps/ZEditor/src/render/magicErase.js
  function magicErase(imageData, x, y, tolerance, contiguous) {
    const { data, width, height } = imageData;
    const px = Math.floor(x), py = Math.floor(y);
    if (px < 0 || py < 0 || px >= width || py >= height) return 0;
    const start = py * width + px;
    if (data[start * 4 + 3] === 0) return 0;
    const r0 = data[start * 4], g0 = data[start * 4 + 1], b0 = data[start * 4 + 2];
    const matches = (i) => {
      const o = i * 4;
      return data[o + 3] !== 0 && Math.abs(data[o] - r0) <= tolerance && Math.abs(data[o + 1] - g0) <= tolerance && Math.abs(data[o + 2] - b0) <= tolerance;
    };
    let erased = 0;
    if (!contiguous) {
      for (let i = 0; i < width * height; i++) {
        if (matches(i)) {
          data[i * 4 + 3] = 0;
          erased++;
        }
      }
      return erased;
    }
    const seen = new Uint8Array(width * height);
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      if (!matches(i)) continue;
      data[i * 4 + 3] = 0;
      erased++;
      const cx = i % width, cy = (i - cx) / width;
      if (cx > 0 && !seen[i - 1]) {
        seen[i - 1] = 1;
        stack.push(i - 1);
      }
      if (cx < width - 1 && !seen[i + 1]) {
        seen[i + 1] = 1;
        stack.push(i + 1);
      }
      if (cy > 0 && !seen[i - width]) {
        seen[i - width] = 1;
        stack.push(i - width);
      }
      if (cy < height - 1 && !seen[i + width]) {
        seen[i + width] = 1;
        stack.push(i + width);
      }
    }
    return erased;
  }

  // apps/ZEditor/src/render/softErase.js
  function imagePixelAt(ann, px, py) {
    const cx = ann.x + ann.width / 2, cy = ann.y + ann.height / 2;
    const [lx, ly] = rotatePoint(px - cx, py - cy, -angleOf(ann));
    const u = lx + ann.width / 2, v = ly + ann.height / 2;
    const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
    const cropW = ann.cropW || ann.naturalWidth, cropH = ann.cropH || ann.naturalHeight;
    return {
      inside: u >= 0 && v >= 0 && u <= ann.width && v <= ann.height,
      x: cropX + u * cropW / ann.width,
      y: cropY + v * cropH / ann.height,
      // Natural px per page px, so the brush keeps its on-page size.
      scaleX: cropW / ann.width,
      scaleY: cropH / ann.height
    };
  }
  function stampSoftErase(ctx, x, y, radiusX, radiusY, softness, alpha) {
    const inner = Math.min(0.99, Math.max(0, 1 - softness / 100));
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.translate(x, y);
    ctx.scale(radiusX, radiusY);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(inner, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // apps/ZEditor/src/ui/canvas/magicEraseGesture.js
  async function magicEraseAt(e, { annotations, magicEraser, toPagePoint, onEraseImagePixels }) {
    e.preventDefault();
    const p = toPagePoint(e);
    let ann = null, hit = null;
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.type !== "image" || a.hidden || a.locked) continue;
      const h = imagePixelAt(a, p.x, p.y);
      if (h.inside) {
        ann = a;
        hit = h;
        break;
      }
    }
    if (!ann) return;
    const source = await loadImageElement(ann.src);
    const canvas = document.createElement("canvas");
    canvas.width = ann.naturalWidth;
    canvas.height = ann.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const x = Math.min(canvas.width - 1, Math.max(0, hit.x));
    const y = Math.min(canvas.height - 1, Math.max(0, hit.y));
    const erased = magicErase(imageData, x, y, magicEraser.tolerance, magicEraser.contiguous);
    if (erased === 0) return;
    ctx.putImageData(imageData, 0, 0);
    onEraseImagePixels(ann.id, canvas.toDataURL("image/png"));
  }

  // apps/ZEditor/src/ui/canvas/softEraseGesture.js
  function startSoftEraseGesture(e, { annotations, softEraser, layerEl, toPagePoint, onEraseImagePixels }) {
    e.preventDefault();
    const { size, softness, strength } = softEraser;
    const dabAlpha = 1 - Math.pow(1 - strength / 100, 1 / SOFT_ERASER_DABS_PER_RADIUS);
    const session = { ann: null, canvas: null, ctx: null, img: null, last: null, pending: [], touched: false, done: false };
    function pickImage(p) {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        if (a.type === "image" && !a.hidden && !a.locked && imagePixelAt(a, p.x, p.y).inside) return a;
      }
      return null;
    }
    function dab(p) {
      const hit = imagePixelAt(session.ann, p.x, p.y);
      stampSoftErase(session.ctx, hit.x, hit.y, size / 2 * hit.scaleX, size / 2 * hit.scaleY, softness, dabAlpha);
      session.touched = true;
    }
    function eraseTo(p) {
      if (!session.last) {
        dab(p);
        session.last = p;
        return;
      }
      const step = Math.max(0.5, size / 2 / SOFT_ERASER_DABS_PER_RADIUS);
      const from = session.last;
      const dist = Math.hypot(p.x - from.x, p.y - from.y);
      if (dist < step) return;
      const n = Math.floor(dist / step);
      for (let k = 1; k <= n; k++) {
        const t2 = k * step / dist;
        dab({ x: from.x + (p.x - from.x) * t2, y: from.y + (p.y - from.y) * t2 });
      }
      const t = n * step / dist;
      session.last = { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t };
    }
    async function begin(ann) {
      const source = await loadImageElement(ann.src);
      const canvas = document.createElement("canvas");
      canvas.width = ann.naturalWidth;
      canvas.height = ann.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      session.canvas = canvas;
      session.ctx = ctx;
      const img = layerEl && layerEl.querySelector(`[data-ann-id="${ann.id}"] .ze-ann-image-frame > img`);
      if (img) {
        canvas.style.cssText = img.style.cssText;
        canvas.style.pointerEvents = "none";
        img.parentNode.insertBefore(canvas, img.nextSibling);
        img.style.visibility = "hidden";
        session.img = img;
      }
      session.pending.forEach(eraseTo);
      session.pending = [];
      if (session.done) finish();
    }
    function handlePoint(p) {
      if (!session.ann) {
        const ann = pickImage(p);
        if (!ann) return;
        session.ann = ann;
        session.pending.push(p);
        begin(ann).catch(() => {
          session.ann = null;
        });
        return;
      }
      if (!session.ctx) {
        session.pending.push(p);
        return;
      }
      eraseTo(p);
    }
    function finish() {
      const { canvas, img, ann } = session;
      if (!canvas) return;
      if (session.touched) onEraseImagePixels(ann.id, canvas.toDataURL("image/png"));
      if (!img) return;
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        canvas.remove();
        img.style.visibility = "";
      };
      if (!session.touched) {
        cleanup();
        return;
      }
      img.addEventListener("load", cleanup, { once: true });
      setTimeout(cleanup, 1500);
    }
    handlePoint(toPagePoint(e));
    trackPointerDrag((ev) => handlePoint(toPagePoint(ev)), () => {
      session.done = true;
      if (session.ctx) finish();
    });
  }

  // apps/ZEditor/src/ui/canvas/usePageBackground.js
  var { useState: useState13, useRef: useRef11, useEffect: useEffect8 } = React;
  function usePageBackground(page, pdfDocsRef, pageFilter) {
    const canvasRef = useRef11(null);
    const [canvasSize, setCanvasSize] = useState13({ width: 0, height: 0 });
    useEffect8(() => {
      if (!page) return;
      let cancelled = false;
      (async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let w, h;
        if (page.isBlank) {
          const swapped = page.rotation % 180 !== 0;
          w = Math.round((swapped ? page.height : page.width) * MAIN_SCALE);
          h = Math.round((swapped ? page.width : page.height) * MAIN_SCALE);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        } else {
          const doc = docFor(pdfDocsRef, page);
          if (!doc) return;
          const pdfPage = await doc.getPage(page.pageNumber);
          const viewport = pdfPage.getViewport({ scale: MAIN_SCALE, rotation: page.rotation });
          if (cancelled) return;
          w = viewport.width;
          h = viewport.height;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        }
        if (cancelled) return;
        applyPageFilter(canvas.getContext("2d"), canvas, pageFilter, 1);
        setCanvasSize({ width: w, height: h });
      })();
      return () => {
        cancelled = true;
      };
    }, [page && page.key, page && page.rotation, pageFilter]);
    return { canvasRef, canvasSize };
  }

  // apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx
  var { useState: useState14, useRef: useRef12 } = React;
  function ComposeCanvas({
    pdfDocsRef,
    page,
    guidesOn,
    guideFormat,
    guideMarginIn,
    guideBleedIn,
    centerGuideOn,
    tool,
    pageFilter,
    onionGhostSrc,
    onionSkinOpacity,
    pageNumberSpec: numberSpec,
    penColor,
    penWidth,
    penTaper,
    highlighterColor,
    highlighterWidth,
    highlighterTaper,
    annotations,
    selectedAnnId,
    selectedAnnIds,
    editingAnnId,
    croppingAnnId,
    onSelectAnnotation,
    onSelectAnnotations,
    onMoveAnnotations,
    onRotateAnnotations,
    onAddText,
    onAddRect,
    onAddStroke,
    onUpdateAnnotation,
    onEraseStroke,
    onToggleCrop,
    onStartTextEdit,
    onFinishTextEdit,
    eraserMode,
    softEraser,
    magicEraser,
    onEraseImagePixels,
    zoom
  }) {
    const { canvasRef, canvasSize } = usePageBackground(page, pdfDocsRef, pageFilter);
    const layerRef = useRef12(null);
    const [dragRect, setDragRect] = useState14(null);
    const drawingRef = useRef12(null);
    const [brushPos, setBrushPos] = useState14(null);
    const softErasing = tool === "eraser" && eraserMode === "soft";
    const magicErasing = tool === "eraser" && eraserMode === "magic";
    const [, setDrawTick] = useState14(0);
    function overlayPoint(e) {
      const rect = canvasRef.current.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
    }
    function handleOverlayMouseDown(e) {
      if (!page) return;
      if (tool === "pen" || tool === "highlighter") {
        startDrawing(e);
        return;
      }
      if (softErasing) {
        startSoftEraseGesture(e, { annotations, softEraser, layerEl: layerRef.current, toPagePoint: overlayPoint, onEraseImagePixels });
        return;
      }
      if (magicErasing) {
        magicEraseAt(e, { annotations, magicEraser, toPagePoint: overlayPoint, onEraseImagePixels });
        return;
      }
      if (tool === "eraser") {
        startStrokeErase(e);
        return;
      }
      e.preventDefault();
      if (editingAnnId !== null) {
        onFinishTextEdit();
        onSelectAnnotation(null);
        return;
      }
      const additive = e.shiftKey;
      if (!additive) onSelectAnnotation(null);
      const start = overlayPoint(e);
      let rect = null;
      trackPointerDrag((ev) => {
        const p = overlayPoint(ev);
        if (!rect && Math.hypot(p.x - start.x, p.y - start.y) * zoom <= DRAG_THRESHOLD) return;
        rect = {
          x: Math.min(start.x, p.x),
          y: Math.min(start.y, p.y),
          width: Math.abs(p.x - start.x),
          height: Math.abs(p.y - start.y)
        };
        setDragRect(rect);
      }, () => {
        setDragRect(null);
        if (tool === "text") {
          if (rect) onAddText(rect.x, rect.y, Math.max(40, rect.width));
          else onAddText(start.x, start.y);
        } else if (tool === "rect" || tool === "ellipse") {
          onAddRect(rect || {
            ...DEFAULT_RECT_SIZE,
            x: start.x - DEFAULT_RECT_SIZE.width / 2,
            y: start.y - DEFAULT_RECT_SIZE.height / 2
          });
        } else if (rect) {
          onSelectAnnotations(annotationIdsTouching(rect), additive);
        }
      });
    }
    function startDrawing(e) {
      const start = overlayPoint(e);
      const color = tool === "highlighter" ? highlighterColor : penColor;
      const width = tool === "highlighter" ? highlighterWidth : penWidth;
      const taper = tool === "highlighter" ? highlighterTaper : penTaper;
      drawingRef.current = { tool, color, width, taper, points: [[start.x, start.y]] };
      setDrawTick((t) => t + 1);
      trackPointerDrag((ev) => {
        const p = overlayPoint(ev);
        drawingRef.current.points.push([p.x, p.y]);
        setDrawTick((t) => t + 1);
      }, () => {
        if (drawingRef.current && drawingRef.current.points.length > 1) {
          onAddStroke({
            tool: drawingRef.current.tool,
            points: drawingRef.current.points,
            color: drawingRef.current.color,
            strokeWidth: drawingRef.current.width,
            taper: drawingRef.current.taper
          });
        }
        drawingRef.current = null;
        setDrawTick((t) => t + 1);
      });
    }
    function startStrokeErase(e) {
      const erasedIds = /* @__PURE__ */ new Set();
      const tryErase = (pt) => {
        annotations.forEach((a) => {
          if (a.type === "stroke" && !a.hidden && !a.locked && !erasedIds.has(a.id) && strokeHitTest(pt, a)) {
            erasedIds.add(a.id);
            onEraseStroke(a.id);
          }
        });
      };
      tryErase([overlayPoint(e).x, overlayPoint(e).y]);
      trackPointerDrag((ev) => {
        const p = overlayPoint(ev);
        tryErase([p.x, p.y]);
      });
    }
    function annotationIdsTouching(rect) {
      const page2 = canvasRef.current.getBoundingClientRect();
      const left = page2.left + rect.x * zoom, top = page2.top + rect.y * zoom;
      const right = left + rect.width * zoom, bottom = top + rect.height * zoom;
      return [...layerRef.current.querySelectorAll("[data-ann-id]")].filter((el) => {
        const box = el.getBoundingClientRect();
        return box.left < right && box.right > left && box.top < bottom && box.bottom > top;
      }).map((el) => Number(el.dataset.annId)).filter((id) => !annotations.find((a) => a.id === id).locked);
    }
    function pressAnnotation(e, ann, onPlainClick) {
      e.preventDefault();
      e.stopPropagation();
      if (editingAnnId !== null && editingAnnId !== ann.id) onFinishTextEdit();
      const current = [selectedAnnId, ...selectedAnnIds].filter((id) => id !== null);
      const wasSelected = current.includes(ann.id);
      const single = e.altKey && !e.shiftKey && Boolean(ann.groupId);
      if (single) onSelectAnnotation(ann.id, false, true);
      else if (e.shiftKey || !wasSelected) onSelectAnnotation(ann.id, e.shiftKey);
      if (e.shiftKey && wasSelected) return;
      const mates = withGroupMates(annotations, [ann.id]);
      const movingIds = single ? [ann.id] : wasSelected ? current : e.shiftKey ? [...current, ...mates] : mates;
      const originals = annotations.filter((a) => movingIds.includes(a.id));
      const dragDelta = dragDeltaFrom(e, zoom);
      let moved = false;
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        if (!moved && Math.hypot(dx, dy) * zoom > DRAG_THRESHOLD) moved = true;
        if (moved) onMoveAnnotations(originals, dx, dy);
      }, () => {
        if (moved) return;
        if (wasSelected && !e.shiftKey && !single && current.length > 1) onSelectAnnotation(ann.id, false);
        if (onPlainClick) onPlainClick();
      });
    }
    if (!page) {
      return /* @__PURE__ */ React.createElement("div", { className: "preview-empty" }, "No pages yet — load a PDF or start a new document to get started.");
    }
    const showHandlesFor = (a) => tool === "select" && a.id === selectedAnnId && selectedAnnIds.length === 0;
    const selectionTurn = selectionTurnFor({ tool, annotations, selectedAnnId, selectedAnnIds, editingAnnId });
    const cursorClass = tool === "text" ? "ze-tool-text" : tool === "pen" || tool === "highlighter" || tool === "rect" || tool === "ellipse" ? "ze-tool-draw" : softErasing || magicErasing ? "ze-tool-soft-erase" : (
      // both work on image pixels: crosshair over everything
      tool === "eraser" ? "ze-tool-erase" : ""
    );
    return /* @__PURE__ */ React.createElement("div", { className: "ze-artboard-zoom", style: { width: canvasSize.width * zoom, height: canvasSize.height * zoom } }, /* @__PURE__ */ React.createElement("div", { className: "ze-page ze-page--rendered", style: { transform: zoom === 1 ? void 0 : `scale(${zoom})`, "--ze-zoom": zoom } }, /* @__PURE__ */ React.createElement("canvas", { ref: canvasRef }), onionGhostSrc && /* @__PURE__ */ React.createElement("img", { className: "ze-onion-ghost", src: onionGhostSrc, alt: "", style: { opacity: onionSkinOpacity } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: layerRef,
        className: "ze-annotation-layer " + cursorClass,
        style: { width: canvasSize.width, height: canvasSize.height },
        onMouseDown: handleOverlayMouseDown,
        onMouseMove: softErasing ? (e) => setBrushPos(overlayPoint(e)) : void 0,
        onMouseLeave: softErasing ? () => setBrushPos(null) : void 0
      },
      annotations.filter((a) => !a.hidden).map((a) => /* @__PURE__ */ React.createElement(
        AnnotationItem,
        {
          key: a.id,
          ann: a,
          tool,
          zoom,
          pageSize: canvasSize,
          pageFilter,
          isSelected: a.id === selectedAnnId || selectedAnnIds.includes(a.id),
          showHandles: showHandlesFor(a),
          isEditing: a.id === editingAnnId,
          isCropping: a.id === croppingAnnId,
          onPress: pressAnnotation,
          onUpdate: onUpdateAnnotation,
          onToggleCrop,
          onStartTextEdit,
          onFinishTextEdit
        }
      )),
      /* @__PURE__ */ React.createElement(LiveStroke, { drawing: drawingRef.current, pageSize: canvasSize }),
      selectionTurn && /* @__PURE__ */ React.createElement(SelectionTurnKnob, { turn: selectionTurn, zoom, toPagePoint: overlayPoint, onRotateAnnotations }),
      softErasing && brushPos && /* @__PURE__ */ React.createElement(BrushCursor, { pos: brushPos, softEraser }),
      dragRect && /* @__PURE__ */ React.createElement("div", { className: "ze-drag-rect", style: { left: dragRect.x, top: dragRect.y, width: dragRect.width, height: dragRect.height, borderRadius: tool === "ellipse" ? "50%" : void 0 } })
    ), /* @__PURE__ */ React.createElement(
      PageOverlays,
      {
        pageSize: canvasSize,
        numberSpec,
        guidesOn,
        guideFormat,
        guideMarginIn,
        guideBleedIn,
        centerGuideOn
      }
    )));
  }

  // apps/ZEditor/src/ui/canvas/LiveFilterDefs.jsx
  function LiveFilterDefs({ pageFilter }) {
    const dark = hexToRgb(pageFilter.darkColor || DEFAULT_DUOTONE_DARK);
    const light = hexToRgb(pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT);
    return /* @__PURE__ */ React.createElement("svg", { width: "0", height: "0", style: { position: "absolute" }, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("filter", { id: "ze-filter-grayscale", colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feColorMatrix", { type: "matrix", values: LUMINANCE_MATRIX_VALUES })), /* @__PURE__ */ React.createElement("filter", { id: "ze-filter-duotone", colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feColorMatrix", { type: "matrix", values: LUMINANCE_MATRIX_VALUES }), /* @__PURE__ */ React.createElement("feComponentTransfer", null, /* @__PURE__ */ React.createElement("feFuncR", { type: "linear", slope: (light.r - dark.r) / 255, intercept: dark.r / 255 }), /* @__PURE__ */ React.createElement("feFuncG", { type: "linear", slope: (light.g - dark.g) / 255, intercept: dark.g / 255 }), /* @__PURE__ */ React.createElement("feFuncB", { type: "linear", slope: (light.b - dark.b) / 255, intercept: dark.b / 255 })))));
  }

  // apps/ZEditor/src/ui/dialogs/ConfirmDialog.jsx
  function ConfirmDialog({ step, onProceed, onYes, onCancel }) {
    if (!step) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onCancel }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head" }, step === 1 ? "This will erase your unsaved edits" : "Confirm"), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-body" }, /* @__PURE__ */ React.createElement("p", { className: "ze-format-hint", style: { margin: 0 } }, step === 1 ? "This will ERASE all your current unsaved edits." : "Are you sure to proceed?")), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancel }, "Back"), step === 1 ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: onProceed }, "Proceed") : /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: onYes }, "Yes"))));
  }

  // apps/ZEditor/src/ui/dialogs/InsertPdfDialog.jsx
  function InsertPdfDialog({ file, pageCount, afterPage, onChangeAfterPage, onConfirm, onCancel }) {
    if (!file) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onCancel }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head" }, "Insert PDF"), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-body" }, /* @__PURE__ */ React.createElement("p", { className: "ze-format-hint", style: { margin: "0 0 14px" } }, "Inserting ", /* @__PURE__ */ React.createElement("strong", null, file.name), " into this document."), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Insert after page (0 for the very beginning)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        className: "ze-format-number",
        min: "0",
        max: pageCount,
        autoFocus: true,
        value: afterPage,
        onChange: (e) => onChangeAfterPage(Math.max(0, Math.min(pageCount, Number(e.target.value) || 0)))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "This document currently has ", pageCount, " page", pageCount === 1 ? "" : "s", ".")), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancel }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: onConfirm }, "Insert"))));
  }

  // apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx
  var { useState: useState15 } = React;
  function NewDocumentDialog({ open, onCreate, onOpenPdf, onCancel }) {
    const [presetKey, setPresetKey] = useState15("a5");
    const [orientation, setOrientation] = useState15("portrait");
    const [pageCountText, setPageCountText] = useState15("1");
    if (!open) return null;
    const preset = NEW_DOCUMENT_PRESETS.find((p) => p.key === presetKey) || NEW_DOCUMENT_PRESETS[0];
    const landscape = orientation === "landscape";
    const width = landscape ? preset.height : preset.width;
    const height = landscape ? preset.width : preset.height;
    const pageCount = Math.max(1, Math.min(MAX_NEW_DOCUMENT_PAGES, parseInt(pageCountText, 10) || 1));
    const mm = (pts) => Math.round(pts / POINTS_PER_INCH * 25.4);
    const inches = (pts) => +(pts / POINTS_PER_INCH).toFixed(2);
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onCancel }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head" }, "New document"), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-body" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Paper size"), /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value: presetKey, onChange: (e) => setPresetKey(e.target.value) }, NEW_DOCUMENT_PRESETS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, p.label)))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Orientation"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (!landscape ? " active" : ""), onClick: () => setOrientation("portrait") }, "Portrait"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (landscape ? " active" : ""), onClick: () => setOrientation("landscape") }, "Landscape"))), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Pages"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        className: "ze-format-number",
        min: "1",
        max: MAX_NEW_DOCUMENT_PAGES,
        value: pageCountText,
        onChange: (e) => setPageCountText(e.target.value),
        onBlur: () => setPageCountText(String(pageCount))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, mm(width), " × ", mm(height), " mm (", inches(width), " × ", inches(height), " in). You can add or remove pages later.")), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-actions" }, onOpenPdf && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onOpenPdf }, "Open a PDF instead"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancel }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: () => onCreate({ width, height, pageCount }) }, "Create"))));
  }

  // apps/ZEditor/src/ui/dialogs/shortcuts.js
  var KEYBOARD_SHORTCUTS = [
    {
      group: "Tools",
      rows: [
        ["V", "Move tool"],
        ["T", "Text tool"],
        ["I", "Add an image"],
        ["R", "Rectangle tool"],
        ["E", "Ellipse tool"],
        ["D", "Draw tool"],
        ["H", "Highlighter tool"]
      ]
    },
    {
      group: "Editing",
      rows: [
        ["Ctrl + Z", "Undo"],
        ["Ctrl + Shift + Z, or Ctrl + Y", "Redo"],
        ["Ctrl + C", "Copy the selected item"],
        ["Ctrl + V", "Paste a copied item, or an image from the clipboard"],
        ["Ctrl + S", "Save the project (asks where, the first time)"],
        ["Ctrl + Shift + S", "Save the project to a new file"],
        ["Delete", "Delete the selected item, or the selected page(s) if no item is selected"],
        ["Double-click text", "Edit it (Move tool)"],
        ["Esc", "Finish editing and keep the text selected"]
      ]
    },
    {
      group: "Pages and selection",
      rows: [
        ["↑ / ↓", "Previous / next page, when no item is selected"],
        ["Arrow keys", "Nudge the selected items 1 px"],
        ["Shift + arrow keys", "Nudge the selected items 10 px"],
        ["Ctrl + R", "Rotate the selected page"],
        ["Ctrl + G", "Group the selected items (select several first)"],
        ["Ctrl + Shift + G", "Ungroup"],
        ["Alt + click", "Pick one item out of a group"],
        ["Shift + click", "Add to or remove from the selection (pages and items)"],
        ["Drag on empty page", "Select the items it touches (Move tool)"],
        ["Shift + drag a handle", "Stretch an image freely, or keep a rectangle's proportions"]
      ]
    }
  ];

  // apps/ZEditor/src/ui/dialogs/ShortcutsDialog.jsx
  var { useEffect: useEffect9 } = React;
  function ShortcutsDialog({ open, onClose }) {
    useEffect9(() => {
      if (!open) return;
      const closeOnEscape = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", closeOnEscape);
      return () => window.removeEventListener("keydown", closeOnEscape);
    }, [open]);
    if (!open) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onClose }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal ze-modal--shortcuts", role: "dialog", "aria-label": "Keyboard shortcuts", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head ze-modal-head--with-close" }, "Keyboard Shortcuts", /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn ze-tool-icon-btn--round", title: "Close (Esc)", "aria-label": "Close", onClick: onClose }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6 6l12 12M18 6L6 18" })))), /* @__PURE__ */ React.createElement("div", { className: "ze-shortcuts-scroll" }, /* @__PURE__ */ React.createElement("table", { className: "ze-shortcuts-table" }, KEYBOARD_SHORTCUTS.map(({ group, rows }) => /* @__PURE__ */ React.createElement("tbody", { key: group }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { colSpan: "2" }, group)), rows.map(([keys, action]) => /* @__PURE__ */ React.createElement("tr", { key: keys }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("kbd", null, keys)), /* @__PURE__ */ React.createElement("td", null, action)))))), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "On a Mac, use Cmd instead of Ctrl. Shortcuts pause while you're typing in a text box or field."))));
  }

  // apps/ZEditor/src/ui/controls/inputs.jsx
  var { useState: useState16 } = React;
  function useDraftInputProps(value, commitText) {
    const [draft, setDraft] = useState16(null);
    return {
      value: draft != null ? draft : value,
      onChange: (e) => {
        setDraft(e.target.value);
        commitText(e.target.value);
      },
      onBlur: () => setDraft(null)
    };
  }
  function SliderNumberInput({ min, max, value, onChange }) {
    const numberProps = useDraftInputProps(value, (text) => {
      const n = Number(text);
      if (text.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
    });
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-slider-row" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min,
        max,
        step: "1",
        value,
        onChange: (e) => onChange(Number(e.target.value))
      }
    ), /* @__PURE__ */ React.createElement("input", { type: "number", className: "ze-format-number", min, max, step: "1", ...numberProps }));
  }
  function CustomColorInput({ value, onChange }) {
    return /* @__PURE__ */ React.createElement("label", { className: "ze-custom-color", title: "Custom color — pick any color" }, /* @__PURE__ */ React.createElement("input", { type: "color", value, onChange: (e) => onChange(e.target.value), "aria-label": "Custom color" }), /* @__PURE__ */ React.createElement("span", { className: "ze-custom-color-face", style: { backgroundColor: value } }), /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "m2 22 1-1h3l9-9" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21v-3l9-9" }), /* @__PURE__ */ React.createElement("path", { d: "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" })));
  }
  function HexColorInput({ value, onChange }) {
    const hexProps = useDraftInputProps(value, (text) => {
      const hex = "#" + text.trim().replace(/^#/, "");
      if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(hex.toLowerCase());
    });
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-slider-row" }, /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value, onChange: (e) => onChange(e.target.value) }), /* @__PURE__ */ React.createElement("input", { type: "text", className: "ze-format-number", spellCheck: "false", maxLength: "7", "aria-label": "Hex color", ...hexProps }));
  }
  function SelectInput({ options, value, onChange }) {
    return /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value, onChange: (e) => onChange(e.target.value) }, options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.key, value: o.key }, o.label)));
  }
  var EFFECT_CONTROL_INPUTS = { slider: SliderNumberInput, color: HexColorInput, select: SelectInput };

  // apps/ZEditor/src/ui/controls/ControlList.jsx
  function ControlList({ controls, source, onPatch }) {
    const values = controlValues(source, controls);
    return controls.filter((c) => !c.showIf || c.showIf(values)).map(({ kind, prop, label, min, max, options }) => {
      const ControlInput = EFFECT_CONTROL_INPUTS[kind];
      return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field", key: prop }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, label), /* @__PURE__ */ React.createElement(ControlInput, { min, max, options, value: values[prop], onChange: (v) => onPatch({ [prop]: v }) }));
    });
  }

  // apps/ZEditor/src/ui/controls/PanelSection.jsx
  var { useState: useState17, useRef: useRef13, useEffect: useEffect10 } = React;
  var sectionOpenMemory = {};
  function PanelSection({ id, title, checked, onToggle, disabled, defaultOpen = false, group, hint, summary, onReset, children }) {
    const hasToggle = typeof onToggle === "function";
    const expandable = children != null && children !== false;
    const [open, setOpenState] = useState17(() => id in sectionOpenMemory ? sectionOpenMemory[id] : defaultOpen);
    const setOpen = (value) => {
      sectionOpenMemory[id] = value;
      setOpenState(value);
    };
    const wasChecked = useRef13(checked);
    useEffect10(() => {
      if (checked && !wasChecked.current && expandable) setOpen(true);
      wasChecked.current = checked;
    }, [checked]);
    const isOff = hasToggle && !checked;
    const isOpen = expandable && open && !isOff;
    function clickTitle() {
      if (isOff) {
        if (!disabled) onToggle(true);
      } else if (expandable) setOpen(!open);
      else if (hasToggle && !disabled) onToggle(false);
    }
    return /* @__PURE__ */ React.createElement("section", { className: "ze-sec" + (isOpen ? " is-open" : "") + (isOff ? " is-off" : "") }, /* @__PURE__ */ React.createElement("div", { className: "ze-sec-head" }, hasToggle && /* @__PURE__ */ React.createElement("input", { type: "checkbox", className: "ze-sec-check", checked: Boolean(checked), disabled, "aria-label": title, onChange: (e) => onToggle(e.target.checked) }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-sec-title", "aria-expanded": expandable ? isOpen : void 0, onClick: clickTitle }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-name" }, title), expandable && /* @__PURE__ */ React.createElement("svg", { className: "ze-sec-caret" + (isOff ? " is-hidden" : ""), viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" })), hint && /* @__PURE__ */ React.createElement("span", { className: "ze-sec-help", title: hint }, "?"), summary && !isOpen && /* @__PURE__ */ React.createElement("span", { className: "ze-sec-summary" }, summary)), onReset && isOpen && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-sec-reset", title: "Reset to defaults", "aria-label": "Reset " + title, onClick: onReset }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 12a9 9 0 1 0 3-6.7" }), /* @__PURE__ */ React.createElement("path", { d: "M3 4v5h5" })))), isOpen && /* @__PURE__ */ React.createElement("div", { className: "ze-sec-body" + (group ? " is-group" : "") }, children));
  }
  var resetPatch = (controls) => Object.fromEntries(controls.map((c) => [c.prop, void 0]));

  // apps/ZEditor/src/ui/panels/EffectControls.jsx
  function EffectControls({ ann, onPatch, effects = IMAGE_EFFECTS }) {
    const toggleEffect = (effect, on) => {
      const otherEdgesOff = effect.outline && on ? Object.fromEntries(effects.filter((e) => e.outline).map((e) => [e.key, false])) : {};
      onPatch({ ...otherEdgesOff, [effect.key]: on });
    };
    const available = effects.filter((effect) => !(effect.outline && isEllipse(ann)) && !(effect === ELLIPSE_EFFECT && ann.type === "rect"));
    const active = available.filter((effect) => ann[effect.key]).map((effect) => effect.label);
    return /* @__PURE__ */ React.createElement(PanelSection, { id: "effects", title: "Effect", group: true, summary: active.length > 0 ? active.join(", ") : void 0 }, available.map((effect) => {
      const hint = [effect.outline && "Only one edge shape can be on at a time.", effect.hint].filter(Boolean).join(" ");
      return /* @__PURE__ */ React.createElement(
        PanelSection,
        {
          key: effect.key,
          id: "fx." + effect.key,
          title: effect.label,
          checked: Boolean(ann[effect.key]),
          onToggle: (on) => toggleEffect(effect, on),
          hint: hint || void 0,
          onReset: effect.controls.length > 0 ? () => onPatch(resetPatch(effect.controls)) : void 0
        },
        effect.controls.length > 0 && /* @__PURE__ */ React.createElement(ControlList, { controls: effect.controls, source: ann, onPatch })
      );
    }));
  }

  // apps/ZEditor/src/ui/panels/format/FormatPanelShell.jsx
  function FormatPanelShell({ title, sections = true, children }) {
    return /* @__PURE__ */ React.createElement("aside", { className: "ze-format-panel" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-panel-head" }, title), /* @__PURE__ */ React.createElement("div", { className: "ze-format-panel-body" + (sections ? " ze-sections" : "") }, children));
  }
  function SizeReadout({ ann }) {
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Size"), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { display: "block", marginTop: 0 } }, Math.round(ann.width), " × ", Math.round(ann.height), " px"));
  }

  // apps/ZEditor/src/ui/panels/format/ImageFormat.jsx
  function ImageFormat({ ann, onUpdate, croppingAnnId, onToggleCrop, onFlattenImage }) {
    const patch = (p) => onUpdate(ann.id, p);
    const isCroppingThis = croppingAnnId === ann.id;
    const hasCrop = ann.cropW != null && (ann.cropX || ann.cropY || ann.cropW !== ann.naturalWidth || ann.cropH !== ann.naturalHeight);
    const cropReset = cropResetPatch(ann);
    const filterType = ann.filter && ann.filter.type || "match";
    const filterOption = IMAGE_FILTER_OPTIONS.find((o) => o.key === filterType);
    const adjustedCount = PHOTO_ADJUST_CONTROLS.filter((c) => isAdjusted(ann, c)).length;
    const filtersSummary = [adjustedCount > 0 && adjustedCount + " adjusted", filterType !== "match" && filterOption && filterOption.label].filter(Boolean).join(" · ") || void 0;
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format — Image" }, /* @__PURE__ */ React.createElement(PanelSection, { id: "image.basic", title: "Basic", defaultOpen: true, hint: "Drag the image to move it. Drag a handle to resize; hold Shift to stretch it freely.", onReset: () => patch(resetPatch([OPACITY_CONTROL, ANGLE_CONTROL, BLEND_CONTROL])) }, /* @__PURE__ */ React.createElement(SizeReadout, { ann }), /* @__PURE__ */ React.createElement(ControlList, { controls: [OPACITY_CONTROL, ANGLE_CONTROL, BLEND_CONTROL], source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.crop",
        title: "Crop",
        checked: isCroppingThis || Boolean(hasCrop),
        disabled: Boolean(angleOf(ann)) && !isCroppingThis && !hasCrop,
        hint: "While cropping: drag inside the window to reposition the photo, drag a corner to resize the crop. Set the rotation to 0° to crop.",
        onToggle: (on) => {
          if (on) {
            if (!isCroppingThis) onToggleCrop(ann.id);
            return;
          }
          if (isCroppingThis) onToggleCrop(ann.id);
          patch(cropReset);
        },
        onReset: hasCrop ? () => patch(cropReset) : void 0
      },
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (isCroppingThis ? " active" : ""), onClick: () => onToggleCrop(ann.id) }, isCroppingThis ? "Done Cropping" : "Edit Crop")
    ), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.filters",
        title: "Filters",
        group: true,
        summary: filtersSummary,
        hint: "Adjust the photo's light, color and levels. Adjustments are applied before the Style filter, so a filter works on the adjusted photo."
      },
      PHOTO_ADJUST_SECTIONS.map((group) => {
        const changed = group.controls.filter((c) => isAdjusted(ann, c)).length;
        return /* @__PURE__ */ React.createElement(
          PanelSection,
          {
            key: group.id,
            id: "image.adjust." + group.id,
            title: group.title,
            summary: changed > 0 ? changed + " changed" : void 0,
            onReset: () => patch(resetPatch(group.controls))
          },
          /* @__PURE__ */ React.createElement(ControlList, { controls: group.controls, source: ann, onPatch: patch })
        );
      })
    ), /* @__PURE__ */ React.createElement(ImageStyleSection, { ann, filterType, filterOption, patch }), /* @__PURE__ */ React.createElement(EffectControls, { ann, onPatch: patch }), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.flatten",
        title: "Flatten",
        summary: Math.round(ann.src.length * 0.75 / 1024) + " KB",
        hint: "Bakes the crop, filter and effects into one image, so you can stack new effects on top. Undo brings them back."
      },
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: isCroppingThis, onClick: () => onFlattenImage(ann) }, "Flatten Image")
    ));
  }
  function ImageStyleSection({ ann, filterType, filterOption, patch }) {
    return /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.filter",
        title: "Style",
        summary: filterOption ? filterOption.label : void 0,
        hint: 'Overrides the page filter for just this image. "Match Page" follows whatever the page filter is set to.'
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement(SelectInput, { options: IMAGE_FILTER_OPTIONS, value: filterType, onChange: (type) => patch({ filter: { ...ann.filter, type } }) })),
      ann.filter && ann.filter.type === "duotone" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Dark tone"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          className: "ze-format-color-input",
          value: ann.filter.darkColor || DEFAULT_DUOTONE_DARK,
          onChange: (e) => patch({ filter: { ...ann.filter, darkColor: e.target.value } })
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Light tone"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          className: "ze-format-color-input",
          value: ann.filter.lightColor || DEFAULT_DUOTONE_LIGHT,
          onChange: (e) => patch({ filter: { ...ann.filter, lightColor: e.target.value } })
        }
      ))),
      ann.filter && FILTER_CONTROLS[ann.filter.type] && /* @__PURE__ */ React.createElement(
        ControlList,
        {
          controls: FILTER_CONTROLS[ann.filter.type],
          source: ann.filter,
          onPatch: (p) => patch({ filter: { ...ann.filter, ...p } })
        }
      )
    );
  }

  // apps/ZEditor/src/ui/panels/format/ShapeFormat.jsx
  var TRANSFORM_CONTROLS = [ANGLE_CONTROL, OPACITY_CONTROL, BLEND_CONTROL];
  function ShapeFormat({ ann, onUpdate, onRasterizeRect }) {
    const patch = (p) => onUpdate(ann.id, p);
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: isEllipse(ann) ? "Format — Ellipse" : "Format — Rectangle" }, /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.fill", title: "Fill", defaultOpen: true, onReset: () => patch(resetPatch(RECT_FILL_CONTROLS)) }, /* @__PURE__ */ React.createElement(ControlList, { controls: RECT_FILL_CONTROLS, source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "rect.transform",
        title: "Transform",
        defaultOpen: true,
        hint: isEllipse(ann) ? "Drag a handle to resize; hold Shift to keep its proportions (a circle stays a circle). Use Stroke for an outline." : "Drag a handle to resize; hold Shift to keep its proportions. Use Rounded for corner radius and Stroke for a border.",
        onReset: () => patch(resetPatch(TRANSFORM_CONTROLS))
      },
      /* @__PURE__ */ React.createElement(SizeReadout, { ann }),
      /* @__PURE__ */ React.createElement(ControlList, { controls: TRANSFORM_CONTROLS, source: ann, onPatch: patch })
    ), /* @__PURE__ */ React.createElement(EffectControls, { ann, onPatch: patch }), /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.rasterize", title: "Rasterize", hint: "Turns this shape into an image of what it looks like now — gradient, edge shape, stroke and shadow included — so image filters and effects can be applied to it. Undo brings the shape back." }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: () => onRasterizeRect(ann) }, "Rasterize to Image")));
  }

  // apps/ZEditor/src/ui/controls/StrokeFormatFields.jsx
  function StrokeFormatFields({ swatches, color, width, minWidth, maxWidth, taper, onColor, onWidth, onTaper }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Thickness (", Math.round(width), "px)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min: minWidth,
        max: maxWidth,
        step: "0.5",
        value: width,
        onChange: (e) => onWidth(Number(e.target.value))
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Taper (", Math.round((taper || 0) * 100 / 0.45), "%)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min: "0",
        max: "0.45",
        step: "0.01",
        value: taper || 0,
        onChange: (e) => onTaper(Number(e.target.value))
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Thins each end toward a point. 0% keeps a constant, rounded-off width.")), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Color"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-format-swatches" }, swatches.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c,
        type: "button",
        className: "ze-format-swatch" + (color === c ? " active" : ""),
        style: { backgroundColor: c },
        title: c,
        onClick: () => onColor(c)
      }
    )), /* @__PURE__ */ React.createElement(CustomColorInput, { value: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000", onChange: onColor }))));
  }

  // apps/ZEditor/src/ui/panels/format/StrokeFormat.jsx
  function StrokeFormat({ ann, onUpdate }) {
    const isHi = ann.tool === "highlighter";
    const patch = (p) => onUpdate(ann.id, p);
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format — " + (isHi ? "Highlighter" : "Draw") + " stroke" }, /* @__PURE__ */ React.createElement(PanelSection, { id: "stroke.basic", title: "Stroke", defaultOpen: true, hint: "Drag the round knob above the stroke to rotate it." }, /* @__PURE__ */ React.createElement(
      StrokeFormatFields,
      {
        swatches: isHi ? HIGHLIGHTER_COLOR_SWATCHES : PEN_COLOR_SWATCHES,
        color: ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color),
        width: ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width),
        minWidth: isHi ? 6 : 1,
        maxWidth: isHi ? 40 : 20,
        taper: ann.taper || 0,
        onColor: (c) => patch({ color: c }),
        onWidth: (w) => patch({ strokeWidth: w }),
        onTaper: (t) => patch({ taper: t })
      }
    )), /* @__PURE__ */ React.createElement(PanelSection, { id: "stroke.blend", title: "Blend" }, /* @__PURE__ */ React.createElement(ControlList, { controls: [BLEND_CONTROL], source: ann, onPatch: patch })));
  }

  // apps/ZEditor/src/ui/panels/LetterColors.jsx
  var { useState: useState18 } = React;
  function LetterColors({ ann, patch }) {
    const [message, setMessage] = useState18(null);
    const keepFocus = (e) => e.preventDefault();
    function applyColor(color) {
      const text = ann.text || "";
      const { annId, start } = textSelectionStore;
      const end = Math.min(textSelectionStore.end, text.length);
      if (annId !== ann.id || end <= start) {
        setMessage("Double-click the text and select some letters first.");
        return;
      }
      setMessage(null);
      patch({ colorRuns: setRunColor(ann.colorRuns, start, end, color) });
    }
    const count = (ann.colorRuns || []).reduce((total, run) => total + run.end - run.start, 0);
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-format-swatches", onMouseDown: keepFocus }, TEXT_COLOR_SWATCHES.map((c) => /* @__PURE__ */ React.createElement("button", { key: c, type: "button", className: "ze-format-swatch", style: { backgroundColor: c }, title: "Color the selected letters " + c, onClick: () => applyColor(c) })), /* @__PURE__ */ React.createElement(CustomColorInput, { value: "#dd531a", onChange: applyColor })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row", onMouseDown: keepFocus }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: () => applyColor(null) }, "Reset selected"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: !count, onClick: () => {
      setMessage(null);
      patch({ colorRuns: void 0 });
    } }, "Reset all")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, message || (count ? count + " letter" + (count === 1 ? "" : "s") + " colored. Select letters while editing, then pick a color." : "Double-click the text, select some letters, then pick a color.")));
  }

  // apps/ZEditor/src/ui/controls/FontCombobox.jsx
  var { useState: useState19, useRef: useRef14, useEffect: useEffect11, useMemo: useMemo2 } = React;
  function FontCombobox({ fontOptions, setFontOptions, value, onChange }) {
    const [query, setQuery] = useState19(value || "");
    const [typed, setTyped] = useState19(false);
    const [open, setOpen] = useState19(false);
    const [highlight, setHighlight] = useState19(-1);
    const previewFromRef = useRef14(null);
    const listRef = useRef14(null);
    const [status, setStatus] = useState19(null);
    const [loadingFonts, setLoadingFonts] = useState19(false);
    const containerRef = useRef14(null);
    const uploadInputRef = useRef14(null);
    useEffect11(() => {
      if (previewFromRef.current === null) {
        setQuery(value || "");
        setTyped(false);
      }
    }, [value]);
    useEffect11(() => {
      function handleClickOutside(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          cancelPreview();
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);
    const filtered = useMemo2(() => {
      const q = typed ? query.trim().toLowerCase() : "";
      if (!q) return fontOptions;
      return fontOptions.filter((f) => f.toLowerCase().includes(q));
    }, [fontOptions, query, typed]);
    useEffect11(() => {
      if (!open || highlight < 0 || !listRef.current) return;
      const item = listRef.current.children[highlight];
      if (item) item.scrollIntoView({ block: "nearest" });
    }, [open, highlight]);
    function openList() {
      if (!open) setHighlight(filtered.indexOf(value));
      setOpen(true);
    }
    function selectFont(font) {
      previewFromRef.current = null;
      onChange(font);
      setQuery(font);
      setTyped(false);
      setOpen(false);
    }
    function cancelPreview() {
      const original = previewFromRef.current;
      previewFromRef.current = null;
      if (original !== null && original !== value) onChange(original);
      setQuery(original !== null ? original : value || "");
      setTyped(false);
      setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!filtered.length) return;
        const start = open ? highlight : filtered.indexOf(value);
        const step = e.key === "ArrowDown" ? 1 : -1;
        const next = start < 0 ? step > 0 ? 0 : filtered.length - 1 : Math.min(filtered.length - 1, Math.max(0, start + step));
        setOpen(true);
        setHighlight(next);
        if (previewFromRef.current === null) previewFromRef.current = value || "";
        if (!typed) setQuery(filtered[next]);
        onChange(filtered[next]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (open && highlight >= 0 && filtered[highlight]) selectFont(filtered[highlight]);
        else if (open && filtered.length === 1) selectFont(filtered[0]);
      } else if (e.key === "Escape") {
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          cancelPreview();
        }
      }
    }
    async function handleUploadFont(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      setStatus(null);
      try {
        const family = await addCustomFontFile(file, fontOptions);
        setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, family])).sort((a, b) => a.localeCompare(b)));
        selectFont(family);
        setStatus({ type: "success", message: `Added "${family}". It will be saved inside the project.` });
      } catch (err) {
        setStatus({ type: "error", message: err.message });
      }
    }
    async function handleLoadLocalFonts() {
      setStatus(null);
      if (!("queryLocalFonts" in window)) {
        setStatus({ type: "error", message: "Local Font Access isn't supported in this browser — try Chrome or Edge." });
        return;
      }
      setLoadingFonts(true);
      try {
        const availableFonts = await window.queryLocalFonts();
        const families = Array.from(new Set(availableFonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b));
        setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
        setStatus({ type: "success", message: `Loaded ${families.length} local fonts.` });
      } catch (err) {
        const denied = err && (err.name === "NotAllowedError" || /permission/i.test(err.message || ""));
        setStatus({ type: "error", message: denied ? "Permission to read local fonts was denied." : "Couldn't load local fonts." });
      } finally {
        setLoadingFonts(false);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox", ref: containerRef }, /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox-input-wrap" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "ze-format-select ze-fontbox-input",
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setTyped(true);
          setHighlight(-1);
          setOpen(true);
        },
        onFocus: (e) => {
          e.target.select();
          openList();
        },
        onKeyDown: handleKeyDown,
        placeholder: "Search fonts…"
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-fontbox-caret", onClick: () => open ? cancelPreview() : openList(), "aria-label": "Toggle font list" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" })))), open && /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox-list", ref: listRef }, filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox-empty" }, 'No fonts match "', query, '"') : filtered.map((font, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: font,
        type: "button",
        className: "ze-fontbox-item" + (font === value ? " active" : "") + (i === highlight ? " is-highlighted" : ""),
        onMouseEnter: () => setHighlight(i),
        style: { fontFamily: `'${font}', sans-serif` },
        onClick: () => selectFont(font)
      },
      font
    ))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-fontbox-load", onClick: handleLoadLocalFonts, disabled: loadingFonts }, loadingFonts ? "Loading…" : "+ Load Local System Fonts"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-fontbox-load", onClick: () => uploadInputRef.current && uploadInputRef.current.click(), title: "Add a font file. It is saved inside the project, so it still works on another PC." }, "+ Upload Font File…"), /* @__PURE__ */ React.createElement("input", { ref: uploadInputRef, type: "file", accept: ".ttf,.otf,.woff,.woff2", style: { display: "none" }, onChange: handleUploadFont }), status && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" + (status.type === "error" ? " is-error" : "") }, status.message));
  }

  // apps/ZEditor/src/ui/panels/TextBasicSection.jsx
  function TextBasicSection({ fontOptions, setFontOptions, fontFamily, fontSize, bold, italic, underline, align, color, fillAlphaSource, onFillAlpha, onChange }) {
    return /* @__PURE__ */ React.createElement(PanelSection, { id: "text.basic", title: "Basic", defaultOpen: true }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Font"), /* @__PURE__ */ React.createElement(FontCombobox, { fontOptions, setFontOptions, value: fontFamily, onChange: (v) => onChange({ fontFamily: v }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Size & style"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-inline" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        className: "ze-format-number",
        min: "8",
        max: "200",
        "aria-label": "Font size (px)",
        value: fontSize,
        onChange: (e) => onChange({ fontSize: Number(e.target.value) || 16 })
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (bold ? " active" : ""), title: "Bold", onClick: () => onChange({ bold: !bold }) }, /* @__PURE__ */ React.createElement("strong", null, "B")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (italic ? " active" : ""), title: "Italic", onClick: () => onChange({ italic: !italic }) }, /* @__PURE__ */ React.createElement("em", null, "I")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (underline ? " active" : ""), title: "Underline", onClick: () => onChange({ underline: !underline }) }, /* @__PURE__ */ React.createElement("span", { style: { textDecoration: "underline" } }, "U")))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label", title: "Resize the box (drag its corner while editing) to see centering/right-align take effect." }, "Align"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (align === "left" ? " active" : ""), title: "Align left", onClick: () => onChange({ align: "left" }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M4 6h16M4 12h10M4 18h13" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (align === "center" ? " active" : ""), title: "Align center", onClick: () => onChange({ align: "center" }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M4 6h16M7 12h10M5.5 18h13" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (align === "right" ? " active" : ""), title: "Align right", onClick: () => onChange({ align: "right" }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M4 6h16M10 12h10M7 18h13" }))))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Color"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-format-swatches" }, TEXT_COLOR_SWATCHES.map((c) => /* @__PURE__ */ React.createElement("button", { key: c, type: "button", className: "ze-format-swatch" + (color === c ? " active" : ""), style: { backgroundColor: c }, title: c, onClick: () => onChange({ color: c }) })), /* @__PURE__ */ React.createElement(CustomColorInput, { value: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#1a1a1a", onChange: (c) => onChange({ color: c }) }))), fillAlphaSource && /* @__PURE__ */ React.createElement(ControlList, { controls: [TEXT_FILL_ALPHA_CONTROL], source: fillAlphaSource, onPatch: onFillAlpha }));
  }

  // apps/ZEditor/src/io/images.js
  function readPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Couldn't read that photo."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("That file isn't an image the browser can open."));
        img.onload = () => {
          const shrink = Math.min(1, 2e3 / Math.max(img.naturalWidth, img.naturalHeight));
          const width = Math.max(1, Math.round(img.naturalWidth * shrink));
          const height = Math.max(1, Math.round(img.naturalHeight * shrink));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve({ src: canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.92), width, height });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // apps/ZEditor/src/ui/panels/TextPhotoFill.jsx
  var { useState: useState20, useRef: useRef15 } = React;
  function TextPhotoFill({ ann, patch }) {
    const inputRef = useRef15(null);
    const [error, setError] = useState20(null);
    const hasPhoto = Boolean(ann.fillSrc);
    async function handleChosen(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        setError(null);
        const { src, width, height } = await readPhotoFile(file);
        patch({ fillSrc: src, fillNatW: width, fillNatH: height });
      } catch (err) {
        setError(err.message);
      }
    }
    const choose = () => inputRef.current && inputRef.current.click();
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "text.photo",
        title: "Photo fill",
        checked: hasPhoto,
        hint: "Shows a photo through the letters. Lower its opacity to let the text color or gradient show through.",
        onToggle: (on) => on ? choose() : patch(Object.fromEntries(TEXT_PHOTO_PROPS.map((prop) => [prop, void 0]))),
        onReset: () => patch(resetPatch(TEXT_PHOTO_CONTROLS))
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: choose }, "Change photo…"))),
      /* @__PURE__ */ React.createElement(ControlList, { controls: TEXT_PHOTO_CONTROLS, source: ann, onPatch: patch })
    ), /* @__PURE__ */ React.createElement("input", { ref: inputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: handleChosen }), error && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint is-error", style: { padding: "8px 16px", margin: 0 } }, error));
  }

  // apps/ZEditor/src/ui/panels/TextStyles.jsx
  var { useState: useState21 } = React;
  function TextStyles({ ann, patch, textStyles, onSaveStyle, onDeleteStyle }) {
    const [name, setName] = useState21("");
    const [message, setMessage] = useState21(null);
    function save() {
      const clean = name.trim();
      if (!clean) {
        setMessage("Type a name for the style first.");
        return;
      }
      if (BUILT_IN_TEXT_STYLES.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
        setMessage("That name is used by a built-in style.");
        return;
      }
      onSaveStyle(clean, ann);
      setName("");
      setMessage(`Saved "${clean}".`);
    }
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("div", { className: "ze-style-chips" }, BUILT_IN_TEXT_STYLES.map((style) => /* @__PURE__ */ React.createElement("button", { key: style.name, type: "button", className: "ze-format-toggle", title: `Give this text the ${style.name} look`, onClick: () => {
      setMessage(null);
      patch(textStylePatch(style));
    } }, style.name)), textStyles.map((style) => /* @__PURE__ */ React.createElement("span", { key: style.name, className: "ze-style-chip" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle", title: `Give this text the "${style.name}" look`, onClick: () => {
      setMessage(null);
      patch(textStylePatch(style));
    } }, style.name), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-style-chip-delete", title: `Delete "${style.name}"`, "aria-label": `Delete style ${style.name}`, onClick: () => onDeleteStyle(style.name) }, "×")))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-style-row" }, /* @__PURE__ */ React.createElement("input", { type: "text", className: "ze-format-number ze-style-name", placeholder: "Name this look…", maxLength: "30", value: name, onChange: (e) => setName(e.target.value), onKeyDown: (e) => {
      if (e.key === "Enter") save();
    } }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-style-save", onClick: save }, "Save")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, message || "Saves the font, size, color, spacing, case and effects (not the words). Your styles are remembered in this browser and saved inside the project."));
  }

  // apps/ZEditor/src/ui/panels/format/TextFormat.jsx
  var SPACING_CONTROLS = [LINE_SPACING_CONTROL, LETTER_SPACING_CONTROL, CASE_CONTROL, VERTICAL_CONTROL, FIT_HEIGHT_CONTROL, STRIKE_CONTROL];
  function TextFormat({ ann, onUpdate, onRasterizeText, toolDefaults }) {
    const patch = (p) => onUpdate(ann.id, p);
    const { fontOptions, setFontOptions, textStyles, handleSaveTextStyle, handleDeleteTextStyle } = toolDefaults;
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format — Text" }, /* @__PURE__ */ React.createElement(
      TextBasicSection,
      {
        fontOptions,
        setFontOptions,
        fontFamily: ann.fontFamily,
        fontSize: ann.fontSize || 16,
        bold: ann.bold,
        italic: ann.italic,
        underline: ann.underline,
        align: ann.align,
        color: ann.color,
        fillAlphaSource: ann,
        onFillAlpha: patch,
        onChange: patch
      }
    ), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.styles", title: "Saved styles" }, /* @__PURE__ */ React.createElement(TextStyles, { ann, patch, textStyles, onSaveStyle: handleSaveTextStyle, onDeleteStyle: handleDeleteTextStyle })), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.spacing", title: "Spacing & layout", onReset: () => patch(resetPatch(SPACING_CONTROLS)) }, /* @__PURE__ */ React.createElement(ControlList, { controls: SPACING_CONTROLS, source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.letters", title: "Letter color" }, /* @__PURE__ */ React.createElement(LetterColors, { ann, patch })), /* @__PURE__ */ React.createElement(TextPhotoFill, { ann, patch }), /* @__PURE__ */ React.createElement(EffectControls, { ann, onPatch: patch, effects: TEXT_EFFECTS }), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.transform", title: "Rotation & blend", onReset: () => patch(resetPatch([ANGLE_CONTROL, BLEND_CONTROL])) }, /* @__PURE__ */ React.createElement(ControlList, { controls: [ANGLE_CONTROL, BLEND_CONTROL], source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.rasterize", title: "Rasterize", hint: "Turns this text into an image of what it looks like now, so you can apply Halftone, Xerox or Threshold to it. The words can't be edited afterwards; Undo brings the text back." }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: !ann.text, onClick: () => onRasterizeText(ann) }, "Rasterize to Image")));
  }

  // apps/ZEditor/src/ui/panels/format/ToolPanels.jsx
  function ShapeToolPanel({ tool, toolDefaults }) {
    const { rectDefaults, setRectDefaults } = toolDefaults;
    const onChangeRectDefaults = (patch) => setRectDefaults((d) => ({ ...d, ...patch }));
    const shapeName = tool === "ellipse" ? "ellipse" : "rectangle";
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: tool === "ellipse" ? "Ellipse" : "Rectangle" }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-intro" }, "Drag on the page to draw, or click for a default size. These settings apply to the next ", shapeName, " (rectangles and ellipses share them)."), /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.fill", title: "Fill", defaultOpen: true, onReset: () => onChangeRectDefaults(resetPatch(RECT_FILL_CONTROLS)) }, /* @__PURE__ */ React.createElement(ControlList, { controls: RECT_FILL_CONTROLS, source: rectDefaults, onPatch: onChangeRectDefaults })), /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.look", title: "Opacity & blend", onReset: () => onChangeRectDefaults(resetPatch([OPACITY_CONTROL, BLEND_CONTROL])) }, /* @__PURE__ */ React.createElement(ControlList, { controls: [OPACITY_CONTROL, BLEND_CONTROL], source: rectDefaults, onPatch: onChangeRectDefaults })));
  }
  function TextToolPanel({ toolDefaults: t }) {
    const setters = {
      fontFamily: t.setTextFontFamily,
      fontSize: t.setTextFontSize,
      bold: t.setTextBold,
      italic: t.setTextItalic,
      underline: t.setTextUnderline,
      color: t.setTextColor,
      align: t.setTextAlign
    };
    const changeDefaults = (p) => Object.keys(p).forEach((prop) => setters[prop](p[prop]));
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Text" }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-intro" }, "Sets the font, size, style, alignment and color for the next text box you add."), /* @__PURE__ */ React.createElement(
      TextBasicSection,
      {
        fontOptions: t.fontOptions,
        setFontOptions: t.setFontOptions,
        fontFamily: t.textFontFamily,
        fontSize: t.textFontSize,
        bold: t.textBold,
        italic: t.textItalic,
        underline: t.textUnderline,
        align: t.textAlign,
        color: t.textColor,
        onChange: changeDefaults
      }
    ));
  }
  function StrokeToolPanel({ tool, toolDefaults: t }) {
    const isHi = tool === "highlighter";
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: isHi ? "Highlighter" : "Draw" }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-intro" }, "Sets the color and thickness for the next stroke you draw."), /* @__PURE__ */ React.createElement(PanelSection, { id: "stroke.basic", title: "Stroke", defaultOpen: true }, /* @__PURE__ */ React.createElement(
      StrokeFormatFields,
      {
        swatches: isHi ? HIGHLIGHTER_COLOR_SWATCHES : PEN_COLOR_SWATCHES,
        color: isHi ? t.highlighterColor : t.penColor,
        width: isHi ? t.highlighterWidth : t.penWidth,
        minWidth: isHi ? 6 : 1,
        maxWidth: isHi ? 40 : 20,
        taper: isHi ? t.highlighterTaper : t.penTaper,
        onColor: isHi ? t.setHighlighterColor : t.setPenColor,
        onWidth: isHi ? t.setHighlighterWidth : t.setPenWidth,
        onTaper: isHi ? t.setHighlighterTaper : t.setPenTaper
      }
    )));
  }
  function EraserToolPanel({ toolDefaults }) {
    const { eraserMode, setEraserMode, softEraser, setSoftEraser, magicEraser, setMagicEraser } = toolDefaults;
    const onChangeMagic = (patch) => setMagicEraser((cur) => ({ ...cur, ...patch }));
    const onChangeSoftEraser = (patch) => setSoftEraser((cur) => ({ ...cur, ...patch }));
    const slider = (prop, label, min, max, unit) => /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, label, " (", softEraser[prop], unit, ")"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min,
        max,
        step: "1",
        value: softEraser[prop],
        onChange: (e) => onChangeSoftEraser({ [prop]: Number(e.target.value) })
      }
    ));
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Eraser" }, /* @__PURE__ */ React.createElement(PanelSection, { id: "eraser.mode", title: "Mode", defaultOpen: true }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (eraserMode === "stroke" ? " active" : ""), onClick: () => setEraserMode("stroke") }, "Strokes"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (eraserMode === "soft" ? " active" : ""), onClick: () => setEraserMode("soft") }, "Soft (images)"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (eraserMode === "magic" ? " active" : ""), onClick: () => setEraserMode("magic") }, "Magic")), eraserMode === "stroke" && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Removes any pen or highlighter stroke you drag across.")), eraserMode === "magic" && /* @__PURE__ */ React.createElement(PanelSection, { id: "eraser.magic", title: "Magic eraser", defaultOpen: true, hint: "Click an image: the colour you click, and every colour within the Tolerance of it, becomes transparent. Each click is its own Ctrl+Z step. To use it on text or a shape, Rasterize to Image first." }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Tolerance (0 = exact colour, ", MAGIC_TOLERANCE_MAX, " = everything)"), /* @__PURE__ */ React.createElement(SliderNumberInput, { min: 0, max: MAGIC_TOLERANCE_MAX, value: magicEraser.tolerance, onChange: (tolerance) => onChangeMagic({ tolerance }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Erase"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (magicEraser.contiguous ? " active" : ""), onClick: () => onChangeMagic({ contiguous: true }) }, "Connected only"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (!magicEraser.contiguous ? " active" : ""), onClick: () => onChangeMagic({ contiguous: false }) }, "Whole image")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, magicEraser.contiguous ? "Only matching pixels touching the one you click (like Photoshop's Contiguous)." : "Every matching pixel in the image, connected or not."))), eraserMode === "soft" && /* @__PURE__ */ React.createElement(PanelSection, { id: "eraser.brush", title: "Brush", defaultOpen: true, hint: "Drag over an image to fade it to transparent with a feathered edge. Each swipe is its own Ctrl+Z step. To erase text or a shape, use its Rasterize to Image button first." }, slider("size", "Size", 4, 300, "px"), slider("softness", "Softness", 0, 100, "%"), slider("strength", "Strength", 5, 100, "%")));
  }

  // apps/ZEditor/src/ui/panels/FormatPanel.jsx
  function FormatPanel({
    tool,
    selectedAnn,
    onUpdate,
    croppingAnnId,
    onToggleCrop,
    onFlattenImage,
    onRasterizeRect,
    onRasterizeText,
    toolDefaults
  }) {
    const ann = selectedAnn;
    if (ann && ann.type === "text") return /* @__PURE__ */ React.createElement(TextFormat, { key: ann.id, ann, onUpdate, onRasterizeText, toolDefaults });
    if (ann && ann.type === "stroke") return /* @__PURE__ */ React.createElement(StrokeFormat, { key: ann.id, ann, onUpdate });
    if (ann && ann.type === "image") return /* @__PURE__ */ React.createElement(ImageFormat, { key: ann.id, ann, onUpdate, croppingAnnId, onToggleCrop, onFlattenImage });
    if (ann && ann.type === "rect") return /* @__PURE__ */ React.createElement(ShapeFormat, { key: ann.id, ann, onUpdate, onRasterizeRect });
    if (tool === "rect" || tool === "ellipse") return /* @__PURE__ */ React.createElement(ShapeToolPanel, { tool, toolDefaults });
    if (tool === "text") return /* @__PURE__ */ React.createElement(TextToolPanel, { toolDefaults });
    if (tool === "pen" || tool === "highlighter") return /* @__PURE__ */ React.createElement(StrokeToolPanel, { tool, toolDefaults });
    if (tool === "eraser") return /* @__PURE__ */ React.createElement(EraserToolPanel, { toolDefaults });
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format", sections: false }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-empty" }, "Select a text box, image, rectangle, or stroke to edit it, or pick a tool to set defaults for the next one you add."));
  }

  // apps/ZEditor/src/ui/panels/LayersPanel.jsx
  var { useState: useState22, useRef: useRef16, useEffect: useEffect12 } = React;
  function layerName(ann) {
    if (ann.name) return ann.name;
    if (ann.type === "text") return ann.text.trim().split("\n")[0] || "Text";
    if (ann.type === "stroke") return ann.tool === "highlighter" ? "Highlight" : "Drawing";
    if (ann.type === "rect") return isEllipse(ann) ? "Ellipse" : "Rectangle";
    return "Image";
  }
  function LayerThumb({ ann }) {
    if (ann.type === "image") return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("img", { src: ann.src, alt: "", draggable: "false" }));
    if (ann.type === "rect") return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb-fill", style: { background: rectFillCss(ann), borderRadius: isEllipse(ann) ? "50%" : void 0 } }));
    if (ann.type === "text") return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb ze-layer-thumb-text" }, "T");
    const isHi = ann.tool === "highlighter";
    return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color), strokeWidth: "3", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 16c4-9 6-9 8-4s4 5 10-5" })));
  }
  function LayersPanel({ position, onMove, onMinimize, annotations, selectedIds, onSelect, onGroup, onUngroup, onToggleFlag, onRename, onReorder }) {
    const [renamingId, setRenamingId] = useState22(null);
    const [dropInfo, setDropInfo] = useState22(null);
    const dragIdRef = useRef16(null);
    const listRef = useRef16(null);
    const panelRef = useRef16(null);
    const headRef = useRef16(null);
    const topFirst = annotations.slice().reverse();
    const canUngroup = annotations.some((a) => a.groupId && selectedIds.includes(a.id));
    function inView(x, y) {
      return {
        x: Math.max(0, Math.min(x, window.innerWidth - panelRef.current.offsetWidth)),
        y: Math.max(0, Math.min(y, window.innerHeight - headRef.current.offsetHeight))
      };
    }
    useEffect12(() => {
      if (!position) return;
      const keepInView = () => {
        const next = inView(position.x, position.y);
        if (next.x !== position.x || next.y !== position.y) onMove(next);
      };
      keepInView();
      window.addEventListener("resize", keepInView);
      return () => window.removeEventListener("resize", keepInView);
    }, [position]);
    function startPanelDrag(e) {
      e.preventDefault();
      const start = panelRef.current.getBoundingClientRect();
      const { clientX, clientY } = e;
      trackPointerDrag((ev) => onMove(inView(start.left + ev.clientX - clientX, start.top + ev.clientY - clientY)));
    }
    useEffect12(() => {
      const row = listRef.current && listRef.current.querySelector(".ze-layer-row.is-selected");
      if (row) row.scrollIntoView({ block: "nearest" });
    }, [selectedIds[0]]);
    function finishRename(ann, text) {
      setRenamingId(null);
      const name = text.trim();
      if (name && name !== layerName(ann)) onRename(ann.id, name);
    }
    function dragHandlersFor(ann, row) {
      return {
        onDragStart: (e) => {
          dragIdRef.current = ann.id;
          e.dataTransfer.setData("text/plain", "");
        },
        onDragOver: (e) => {
          e.preventDefault();
          const box = e.currentTarget.getBoundingClientRect();
          setDropInfo({ row, before: e.clientY < box.top + box.height / 2 });
        },
        onDragEnd: () => {
          dragIdRef.current = null;
          setDropInfo(null);
        },
        onDrop: (e) => {
          e.preventDefault();
          const from = dragIdRef.current;
          const info = dropInfo;
          dragIdRef.current = null;
          setDropInfo(null);
          if (from === null || !info) return;
          onReorder(selectedIds.includes(from) ? selectedIds : [from], info.row + (info.before ? 0 : 1));
        }
      };
    }
    return /* @__PURE__ */ React.createElement(
      "section",
      {
        className: "ze-layers-panel",
        ref: panelRef,
        style: position ? { left: position.x, top: position.y, right: "auto" } : void 0
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-panel-head ze-layers-head", ref: headRef, onMouseDown: startPanelDrag }, /* @__PURE__ */ React.createElement("span", null, "Layers", annotations.length > 0 ? " (" + annotations.length + ")" : ""), /* @__PURE__ */ React.createElement("span", { className: "ze-layers-head-actions", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-guides-settings-btn", title: "Group the selected layers (Ctrl+G)", "aria-label": "Group selected layers", disabled: selectedIds.length < 2, onClick: onGroup }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "11", height: "11", rx: "2" }), /* @__PURE__ */ React.createElement("rect", { x: "10", y: "10", width: "11", height: "11", rx: "2" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-guides-settings-btn", title: "Ungroup (Ctrl+Shift+G)", "aria-label": "Ungroup selected layers", disabled: !canUngroup, onClick: onUngroup }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "8", height: "8", rx: "2" }), /* @__PURE__ */ React.createElement("rect", { x: "13", y: "13", width: "8", height: "8", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M14 7h4M7 14v4", strokeDasharray: "1 3" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-guides-settings-btn", title: "Minimize layers", "aria-label": "Minimize layers", onClick: onMinimize }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5 10h10" }))))),
      /* @__PURE__ */ React.createElement("div", { className: "ze-layers-list", ref: listRef }, topFirst.map((ann, row) => {
        const isRenaming = renamingId === ann.id;
        return /* @__PURE__ */ React.createElement(React.Fragment, { key: ann.id }, dropInfo && dropInfo.row === row && dropInfo.before && /* @__PURE__ */ React.createElement("div", { className: "ze-drop-line" }), /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "ze-layer-row" + (selectedIds.includes(ann.id) ? " is-selected" : "") + (ann.hidden ? " is-hidden" : "") + (ann.groupId ? " is-grouped" : ""),
            style: ann.groupId ? { "--ze-group-color": groupColor(ann.groupId) } : void 0,
            title: ann.groupId ? "In a group — Alt + click selects just this layer" : void 0,
            "data-layer-id": ann.id,
            draggable: !isRenaming,
            onClick: (e) => {
              if (!ann.hidden && !ann.locked) onSelect(ann.id, e.shiftKey, e.altKey);
            },
            onDoubleClick: () => setRenamingId(ann.id),
            ...dragHandlersFor(ann, row)
          },
          /* @__PURE__ */ React.createElement(LayerThumb, { ann }),
          isRenaming ? /* @__PURE__ */ React.createElement(
            "input",
            {
              className: "ze-layer-name-input",
              defaultValue: layerName(ann),
              autoFocus: true,
              spellCheck: "false",
              onFocus: (e) => e.target.select(),
              onClick: (e) => e.stopPropagation(),
              onBlur: (e) => finishRename(ann, e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Escape") e.target.value = layerName(ann);
                if (e.key === "Enter" || e.key === "Escape") e.target.blur();
              }
            }
          ) : /* @__PURE__ */ React.createElement("span", { className: "ze-layer-name", title: "Double-click to rename" }, layerName(ann)),
          /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              className: "ze-layer-icon-btn" + (ann.locked ? " active" : ""),
              title: ann.locked ? "Unlock layer" : "Lock layer",
              "aria-pressed": Boolean(ann.locked),
              onClick: (e) => {
                e.stopPropagation();
                onToggleFlag(ann, "locked");
              },
              onDoubleClick: (e) => e.stopPropagation()
            },
            /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "5", y: "11", width: "14", height: "10", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: ann.locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2" }))
          ),
          /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              className: "ze-layer-icon-btn" + (ann.hidden ? " active" : ""),
              title: ann.hidden ? "Show layer" : "Hide layer",
              "aria-pressed": Boolean(ann.hidden),
              onClick: (e) => {
                e.stopPropagation();
                onToggleFlag(ann, "hidden");
              },
              onDoubleClick: (e) => e.stopPropagation()
            },
            /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" }), ann.hidden ? /* @__PURE__ */ React.createElement("path", { d: "M4 4l16 16" }) : /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }))
          )
        ), dropInfo && dropInfo.row === row && !dropInfo.before && /* @__PURE__ */ React.createElement("div", { className: "ze-drop-line" }));
      }), /* @__PURE__ */ React.createElement("div", { className: "ze-layer-row ze-layer-row--page" }, /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb-fill", style: { backgroundColor: "#ffffff" } })), /* @__PURE__ */ React.createElement("span", { className: "ze-layer-name" }, "Page")))
    );
  }

  // apps/ZEditor/src/ui/sidebar/PageGap.jsx
  function PageGap({ onInsert }) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-page-gap",
        role: "button",
        tabIndex: 0,
        title: "Add blank page",
        onClick: onInsert,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onInsert();
          }
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-page-gap-line" }),
      /* @__PURE__ */ React.createElement("span", { className: "ze-page-gap-btn", "aria-hidden": "true" }, "+")
    );
  }

  // apps/ZEditor/src/ui/sidebar/Thumbnail.jsx
  function Thumbnail({ p, idx, isSelected, onSelect, onRotate, onDelete, dragHandlers }) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-thumb" + (isSelected ? " is-selected" : ""),
        draggable: "true",
        onClick: (e) => onSelect(idx, e.shiftKey),
        ...dragHandlers
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-img-wrap" }, /* @__PURE__ */ React.createElement("img", { src: p.dataUrl, alt: p.isBlank ? "Blank page" : "Page " + p.pageNumber })),
      /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-footer" }, /* @__PURE__ */ React.createElement("span", { className: "ze-thumb-num" }, idx + 1), /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-actions" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "log-btn",
          title: "Rotate",
          onClick: (e) => {
            e.stopPropagation();
            onRotate(idx);
          }
        },
        "⟳"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "log-btn",
          title: "Delete",
          onClick: (e) => {
            e.stopPropagation();
            onDelete(idx);
          }
        },
        /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V4h6v3" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7l1 13h10l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }))
      )))
    );
  }

  // apps/ZEditor/src/ui/sidebar/Sidebar.jsx
  var { useState: useState23, useRef: useRef17, useEffect: useEffect13 } = React;
  var EDGE_SCROLL_ZONE = 44;
  var EDGE_SCROLL_SPEED = 4;
  function Sidebar({ pages, selectedIdx, selectedPageIndices, onSelect, onSelectAll, onRotate, onDelete, onReorder, onLoadClick, onNewDocClick, onInsertPdfClick, onInsertBlank, loading }) {
    const dragIndexRef = useRef17(null);
    const bodyRef = useRef17(null);
    const scrollDirRef = useRef17(0);
    const rafRef = useRef17(null);
    const [dragOverInfo, setDragOverInfo] = useState23(null);
    function startAutoScroll() {
      if (rafRef.current) return;
      const step = () => {
        const el = bodyRef.current;
        if (el && scrollDirRef.current !== 0) {
          el.scrollTop += scrollDirRef.current * EDGE_SCROLL_SPEED;
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    function stopAutoScroll() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      scrollDirRef.current = 0;
    }
    useEffect13(() => stopAutoScroll, []);
    function handleContainerDragOver(e) {
      const el = bodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const distFromTop = e.clientY - rect.top;
      const distFromBottom = rect.bottom - e.clientY;
      if (distFromTop < EDGE_SCROLL_ZONE) {
        scrollDirRef.current = -1;
      } else if (distFromBottom < EDGE_SCROLL_ZONE) {
        scrollDirRef.current = 1;
      } else {
        scrollDirRef.current = 0;
      }
    }
    function dragHandlersFor(idx) {
      return {
        onDragStart: () => {
          dragIndexRef.current = idx;
          startAutoScroll();
        },
        onDragOver: (e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < rect.top + rect.height / 2;
          setDragOverInfo({ idx, before });
        },
        onDragLeave: () => setDragOverInfo((cur) => cur && cur.idx === idx ? null : cur),
        onDragEnd: () => {
          dragIndexRef.current = null;
          setDragOverInfo(null);
          stopAutoScroll();
        },
        onDrop: (e) => {
          e.preventDefault();
          const from = dragIndexRef.current;
          const info = dragOverInfo;
          setDragOverInfo(null);
          dragIndexRef.current = null;
          stopAutoScroll();
          if (from === null || !info || from === idx) return;
          const selection = selectedIdx !== null ? [selectedIdx, ...selectedPageIndices] : selectedPageIndices;
          onReorder(selection.includes(from) ? selection : [from], idx + (info.before ? 0 : 1));
        }
      };
    }
    return /* @__PURE__ */ React.createElement("aside", { className: "ze-sidebar" }, /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-head" }, /* @__PURE__ */ React.createElement("span", null, "Pages", pages.length > 0 ? " (" + pages.length + ")" : ""), /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-head-actions" }, pages.length === 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onLoadClick, disabled: loading }, loading ? "Loading…" : "Load PDF"), pages.length === 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onNewDocClick, disabled: loading, title: "Start a blank document with a paper size you choose" }, "New Document"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "log-btn", onClick: onInsertPdfClick, disabled: loading || pages.length === 0, title: "Insert another PDF's pages into this document" }, "Insert PDF"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "log-btn", onClick: onSelectAll, disabled: loading || pages.length === 0, title: "Select every page" }, "Select All"))), /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-body", ref: bodyRef, onDragOver: handleContainerDragOver }, pages.length === 0 && !loading ? /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-empty" }, 'No pages yet. Click "Load PDF" to bring in a file, or "New Document" to start a blank layout.') : /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-list" }, /* @__PURE__ */ React.createElement(PageGap, { onInsert: () => onInsertBlank(0) }), pages.map((p, idx) => /* @__PURE__ */ React.createElement(React.Fragment, { key: p.key }, dragOverInfo && dragOverInfo.idx === idx && dragOverInfo.before && /* @__PURE__ */ React.createElement("div", { className: "ze-drop-line" }), /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-slot" }, /* @__PURE__ */ React.createElement(
      Thumbnail,
      {
        p,
        idx,
        isSelected: idx === selectedIdx || selectedPageIndices.includes(idx),
        onSelect,
        onRotate,
        onDelete,
        dragHandlers: dragHandlersFor(idx)
      }
    )), dragOverInfo && dragOverInfo.idx === idx && !dragOverInfo.before && /* @__PURE__ */ React.createElement("div", { className: "ze-drop-line" }), /* @__PURE__ */ React.createElement(PageGap, { onInsert: () => onInsertBlank(idx + 1) }))))));
  }

  // apps/ZEditor/src/ui/toolbar/ToolBar.jsx
  function ToolBar({ selection, edits, view, zoom, dialogs }) {
    const { tool, selectTool, selectedAnnId } = selection;
    const { layersOpen, setLayersOpen, centerGuideOn, setCenterGuideOn } = view;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar" }, /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar-group" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "select" ? " active" : ""), title: "Move (V)", onClick: () => selectTool("select") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 3l6.5 16 2-6.5L19 10.5z", fill: "currentColor" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "text" ? " active" : ""), title: "Text (T)", onClick: () => selectTool("text") }, /* @__PURE__ */ React.createElement("span", { className: "ze-tool-icon-text" }, "T")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn", title: "Insert Image (I)", onClick: edits.handleImageToolClick }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }), /* @__PURE__ */ React.createElement("circle", { cx: "8.5", cy: "9.5", r: "1.5", fill: "currentColor", stroke: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L5 19" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "rect" ? " active" : ""), title: "Rectangle (R)", onClick: () => selectTool("rect") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3.5", y: "6", width: "17", height: "12" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "ellipse" ? " active" : ""), title: "Ellipse (E)", onClick: () => selectTool("ellipse") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("ellipse", { cx: "12", cy: "12", rx: "8.5", ry: "6" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "pen" ? " active" : ""), title: "Draw (D)", onClick: () => selectTool("pen") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 20l1-4L16 5l3 3L8 19z" }), /* @__PURE__ */ React.createElement("path", { d: "M14 7l3 3" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "highlighter" ? " active" : ""), title: "Highlight (H)", onClick: () => selectTool("highlighter") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6 20l1-3.5 8-8 3.5 3.5-8 8z" }), /* @__PURE__ */ React.createElement("path", { d: "M14 9l3.5 3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21h5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "eraser" ? " active" : ""), title: "Eraser", onClick: () => selectTool("eraser") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M17 3l4 4-9.5 9.5H7L3 12z" }), /* @__PURE__ */ React.createElement("path", { d: "M7 21h13" }), /* @__PURE__ */ React.createElement("path", { d: "M9.5 5.5l6 6" }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn" + (layersOpen ? " active" : ""),
        "aria-pressed": layersOpen,
        "aria-label": "Layers panel",
        title: layersOpen ? "Minimize the Layers panel" : "Show the Layers panel",
        onClick: () => setLayersOpen((open) => !open)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M12 3l9 5-9 5-9-5z" }), /* @__PURE__ */ React.createElement("path", { d: "M3 12.5l9 5 9-5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 17l9 5 9-5" }))
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn" + (centerGuideOn ? " active" : ""),
        "aria-pressed": centerGuideOn,
        "aria-label": "Center guide",
        title: centerGuideOn ? "Hide the center guide" : "Show a guide down the middle of the page (for covers and two-page spreads)",
        onClick: () => setCenterGuideOn((on) => !on)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "5", width: "18", height: "14", rx: "1" }), /* @__PURE__ */ React.createElement("path", { d: "M12 3v18", strokeDasharray: "2.5 2.5" }))
    )), /* @__PURE__ */ React.createElement("div", { className: "ze-zoom-control" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Zoom (%)"), /* @__PURE__ */ React.createElement(SliderNumberInput, { min: ZOOM_PERCENT.min, max: ZOOM_PERCENT.max, value: zoom.zoomPercent, onChange: zoom.handleZoomChange })), /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar-group" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn",
        title: "Delete selected (Delete)",
        disabled: selectedAnnId === null,
        onClick: edits.handleDeleteAnnotation
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V4h6v3" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7l1 13h10l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }))
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn ze-tool-icon-btn--round",
        title: "Keyboard shortcuts",
        "aria-label": "Keyboard shortcuts",
        onClick: () => dialogs.setShortcutsOpen(true)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M12 11v7" }), /* @__PURE__ */ React.createElement("path", { d: "M12 6.5v.01" }))
    )));
  }

  // apps/ZEditor/src/ui/settings/FilterSettings.jsx
  function FilterSettings({
    filterType,
    onFilterTypeChange,
    duotoneDark,
    duotoneLight,
    onDuotoneDarkChange,
    onDuotoneLightChange,
    filter,
    onFilterPatch
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Filter"), /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value: filterType, onChange: (e) => onFilterTypeChange(e.target.value) }, PAGE_FILTER_OPTIONS.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.key, value: o.key }, o.label)))), filterType === "duotone" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Dark tone"), /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value: duotoneDark, onChange: (e) => onDuotoneDarkChange(e.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Light tone"), /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value: duotoneLight, onChange: (e) => onDuotoneLightChange(e.target.value) }))), FILTER_CONTROLS[filterType] && /* @__PURE__ */ React.createElement(ControlList, { controls: FILTER_CONTROLS[filterType], source: filter, onPatch: onFilterPatch }), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Applies to the selected pages' backgrounds and any placed images (other pages keep their own setting). Pen and text stay crisp on top. Baked into Export PDF too."));
  }

  // apps/ZEditor/src/ui/settings/GuidesSettings.jsx
  function GuidesSettings({ format, onFormatChange, marginIn, onMarginChange, bleedIn, onBleedChange }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Format"), /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value: format, onChange: (e) => onFormatChange(e.target.value) }, GUIDE_FORMAT_PRESETS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, p.label)))), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Margin (in)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        className: "ze-format-number",
        min: "0",
        max: "3",
        step: "0.0625",
        value: marginIn,
        onChange: (e) => onMarginChange(Math.max(0, Number(e.target.value) || 0))
      }
    )), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Bleed (in)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        className: "ze-format-number",
        min: "0",
        max: "1",
        step: "0.0625",
        value: bleedIn,
        onChange: (e) => onBleedChange(Math.max(0, Number(e.target.value) || 0))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, 'Trim is centered on the page; margin sits inside it, bleed extends outside. Pick "Match Page Size" if the page is already trimmed to its final size.'));
  }

  // apps/ZEditor/src/ui/settings/OnionSkinSettings.jsx
  function OnionSkinSettings({ opacity, onOpacityChange }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Opacity (", Math.round(opacity * 100), "%)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min: "0.05",
        max: "0.8",
        step: "0.05",
        value: opacity,
        onChange: (e) => onOpacityChange(Number(e.target.value))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Shows the previous page faintly on top, for aligning content across a spread. Switch pages and back to refresh it after editing that page."));
  }

  // apps/ZEditor/src/ui/settings/PageNumbersSettings.jsx
  function PageNumbersSettings({ settings, pageCount, onChange }) {
    const whole = (value, fallback, min = 0) => Math.max(min, Math.round(Number(value)) || fallback);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Start numbering on page"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "ze-format-number", min: "1", max: Math.max(1, pageCount), value: settings.from, onChange: (e) => onChange({ from: whole(e.target.value, 1, 1) }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Stop after page (empty = last)"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "ze-format-number", min: "1", max: Math.max(1, pageCount), placeholder: "last", value: settings.to || "", onChange: (e) => onChange({ to: e.target.value === "" ? 0 : whole(e.target.value, 0, 1) }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "First page shows number"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "ze-format-number", step: "1", value: settings.first, onChange: (e) => onChange({ first: Math.round(Number(e.target.value)) || 0 }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Position"), /* @__PURE__ */ React.createElement(SelectInput, { options: PAGE_NUMBER_POSITIONS, value: settings.position, onChange: (position) => onChange({ position }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Style"), /* @__PURE__ */ React.createElement(SelectInput, { options: PAGE_NUMBER_FORMATS, value: settings.format, onChange: (format) => onChange({ format }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Size (pt)"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "ze-format-number", min: "4", max: "48", value: settings.size, onChange: (e) => onChange({ size: Math.min(48, whole(e.target.value, 10, 4)) }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Distance from edge (in)"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "ze-format-number", min: "0", max: "3", step: "0.05", value: settings.marginIn, onChange: (e) => onChange({ marginIn: Math.max(0, Number(e.target.value) || 0) }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Color"), /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value: settings.color, onChange: (e) => onChange({ color: e.target.value }) })), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, 'Pages are counted by their place in the document. "Outer corner" puts odd pages on the right and even pages on the left, like a printed booklet. Drawn on top of everything in Export PDF and Send to ZineArranger.'));
  }

  // apps/ZEditor/src/ui/topbar/PageMenu.jsx
  var { useState: useState24 } = React;
  function PageMenuBody({ rows }) {
    const [customizing, setCustomizing] = useState24(null);
    const active = rows.find((r) => r.key === customizing);
    if (active) {
      return /* @__PURE__ */ React.createElement("div", { className: "ze-menu-settings" }, /* @__PURE__ */ React.createElement("div", { className: "ze-menu-settings-head" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-menu-back", title: "Back", onClick: () => setCustomizing(null) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M12.5 5.5L8 10l4.5 4.5" }))), /* @__PURE__ */ React.createElement("span", null, active.label)), active.settings);
    }
    return rows.map((row) => /* @__PURE__ */ React.createElement("div", { key: row.key, className: "ze-menu-toggle-row" + (row.disabled ? " disabled" : "") }, /* @__PURE__ */ React.createElement("div", { className: "ze-menu-toggle-text" }, /* @__PURE__ */ React.createElement("span", { className: "ze-menu-toggle-label" }, row.label), row.detail && /* @__PURE__ */ React.createElement("span", { className: "ze-menu-toggle-detail" }, row.detail)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-menu-customize", disabled: row.disabled, onClick: () => setCustomizing(row.key) }, "Customize…"), /* @__PURE__ */ React.createElement("label", { className: "toggle-switch", title: (row.checked ? "Turn off " : "Turn on ") + row.label }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: row.checked, disabled: row.disabled, onChange: (e) => row.onToggle(e.target.checked) }), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" }))));
  }

  // apps/ZEditor/src/ui/topbar/TopMenu.jsx
  var { useState: useState25, useRef: useRef18, useEffect: useEffect14, useLayoutEffect: useLayoutEffect3 } = React;
  function TopMenu({ label, solid, children }) {
    const [open, setOpen] = useState25(false);
    const containerRef = useRef18(null);
    useEffect14(() => {
      if (!open) return;
      function handleClickOutside(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
      }
      function handleEscape(e) {
        if (e.key === "Escape") setOpen(false);
      }
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [open]);
    const menuRef = useRef18(null);
    useLayoutEffect3(() => {
      const menu = menuRef.current;
      if (!open || !menu) return;
      const fit = () => {
        menu.style.transform = "";
        const { left } = menu.getBoundingClientRect();
        if (left < 8) menu.style.transform = `translateX(${8 - left}px)`;
      };
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(menu);
      window.addEventListener("resize", fit);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", fit);
      };
    }, [open]);
    return /* @__PURE__ */ React.createElement("div", { className: "ze-topbar-control", ref: containerRef }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-menu-trigger" + (solid ? " btn-solid" : "") + (open ? " open" : ""),
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: () => setOpen((o) => !o)
      },
      label,
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" }))
    ), open && /* @__PURE__ */ React.createElement("div", { className: "ze-menu", role: "menu", ref: menuRef }, children({ close: () => setOpen(false) })));
  }
  function MenuItem({ label, detail, shortcut, hint, disabled, onClick, close }) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        className: "ze-menu-item",
        disabled,
        title: hint,
        onClick: () => {
          close();
          onClick();
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "ze-menu-item-text" }, /* @__PURE__ */ React.createElement("span", null, label), detail && /* @__PURE__ */ React.createElement("span", { className: "ze-menu-item-detail" }, detail)),
      shortcut && /* @__PURE__ */ React.createElement("span", { className: "ze-menu-item-shortcut" }, shortcut)
    );
  }

  // apps/ZEditor/src/ui/topbar/Topbar.jsx
  function Topbar({ doc, history, view, edits, project, dialogs, exporter, status }) {
    const { pages, selectedPage, pageFilter } = doc;
    const { updatePageFilter } = edits;
    const { docTitle, setDocTitle, projectFile, savingProject, justSaved } = project;
    const { exporting, sendingToArranger } = exporter;
    return /* @__PURE__ */ React.createElement("header", { className: "topbar" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-brand" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-logo" }, "ZE"), /* @__PURE__ */ React.createElement("div", { className: "topbar-brand-text" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-title" }, "ZEditor"), /* @__PURE__ */ React.createElement("div", { className: "topbar-subtitle" }, "Compose zine pages"))), /* @__PURE__ */ React.createElement("div", { className: "topbar-actions" }, /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar-group" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn", title: "Undo (Ctrl+Z)", disabled: history.undoStack.length === 0, onClick: history.handleUndo }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M9 7L4 12l5 5" }), /* @__PURE__ */ React.createElement("path", { d: "M4 12h11a5 5 0 0 1 0 10h-1" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn", title: "Redo (Ctrl+Shift+Z)", disabled: history.redoStack.length === 0, onClick: history.handleRedo }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M15 7l5 5-5 5" }), /* @__PURE__ */ React.createElement("path", { d: "M20 12H9a5 5 0 0 0 0 10h1" })))), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "ze-title-input",
        "aria-label": "Zine title",
        placeholder: "Untitled zine",
        title: "Zine title — names the saved project and exported PDF",
        disabled: pages.length === 0,
        value: docTitle,
        onChange: (e) => setDocTitle(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
        },
        onBlur: () => setDocTitle((t) => t.trim())
      }
    ), /* @__PURE__ */ React.createElement(TopMenu, { label: "Page" }, () => /* @__PURE__ */ React.createElement(
      PageMenuBody,
      {
        rows: [
          {
            key: "filter",
            label: "Filter",
            // Per page, so it needs a page to act on. Turning it off
            // remembers the filter it was on, and turning it back on
            // restores that (its settings stay on the page throughout).
            disabled: !selectedPage,
            detail: pageFilter.type !== "none" ? (PAGE_FILTER_OPTIONS.find((o) => o.key === pageFilter.type) || PAGE_FILTER_OPTIONS[0]).label : null,
            checked: pageFilter.type !== "none",
            onToggle: (on) => updatePageFilter(on ? { type: pageFilter.lastType && pageFilter.lastType !== "none" ? pageFilter.lastType : "grayscale" } : { type: "none", lastType: pageFilter.type }),
            settings: /* @__PURE__ */ React.createElement(
              FilterSettings,
              {
                filterType: pageFilter.type,
                onFilterTypeChange: (type) => updatePageFilter({ type }),
                duotoneDark: pageFilter.darkColor || DEFAULT_DUOTONE_DARK,
                duotoneLight: pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT,
                onDuotoneDarkChange: (darkColor) => updatePageFilter({ darkColor }),
                onDuotoneLightChange: (lightColor) => updatePageFilter({ lightColor }),
                filter: pageFilter,
                onFilterPatch: updatePageFilter
              }
            )
          },
          {
            key: "onion",
            label: "Onion Skin",
            checked: view.onionSkinOn,
            onToggle: view.setOnionSkinOn,
            settings: /* @__PURE__ */ React.createElement(OnionSkinSettings, { opacity: view.onionSkinOpacity, onOpacityChange: view.setOnionSkinOpacity })
          },
          {
            key: "pageNumbers",
            label: "Page Numbers",
            checked: view.pageNumbers.on,
            onToggle: (on) => view.setPageNumbers((current) => ({ ...current, on })),
            settings: /* @__PURE__ */ React.createElement(
              PageNumbersSettings,
              {
                settings: view.pageNumbers,
                pageCount: pages.length,
                onChange: (patch) => view.setPageNumbers((current) => ({ ...current, ...patch }))
              }
            )
          },
          {
            key: "guides",
            label: "Guides",
            checked: view.guidesOn,
            onToggle: view.setGuidesOn,
            settings: /* @__PURE__ */ React.createElement(
              GuidesSettings,
              {
                format: view.guideFormat,
                onFormatChange: view.setGuideFormat,
                marginIn: view.guideMarginIn,
                onMarginChange: view.setGuideMarginIn,
                bleedIn: view.guideBleedIn,
                onBleedChange: view.setGuideBleedIn
              }
            )
          }
        ]
      }
    )), /* @__PURE__ */ React.createElement(TopMenu, { label: savingProject ? "Saving…" : justSaved ? "Saved ✓" : "Project" }, ({ close }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "New Project",
        disabled: pages.length === 0,
        onClick: dialogs.handleNewProjectClick,
        hint: "Start over by loading a different PDF — erases the current unsaved project"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Save",
        shortcut: "Ctrl+S",
        detail: projectFile ? projectFile.name : null,
        disabled: pages.length === 0 || savingProject,
        onClick: () => project.handleSaveProject(),
        hint: projectFile ? "Saves over " + projectFile.name : "Saves an editable project file — pages, text, images, and settings — to reopen and keep editing later"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Save As…",
        shortcut: "Ctrl+Shift+S",
        disabled: pages.length === 0 || savingProject,
        onClick: () => project.handleSaveProject({ saveAs: true }),
        hint: "Saves this project to a new file, and keeps saving there"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Load Project",
        disabled: status.loading,
        onClick: dialogs.handleLoadProjectClick,
        hint: "Reopen a saved ZEditor project file"
      }
    ))), /* @__PURE__ */ React.createElement(TopMenu, { label: exporting ? "Exporting…" : sendingToArranger ? "Sending…" : "Export", solid: true }, ({ close }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Export PDF",
        disabled: pages.length === 0 || exporting,
        onClick: exporter.handleExportPdf
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Send to ZineArranger",
        disabled: pages.length === 0 || exporting || sendingToArranger,
        onClick: exporter.handleSendToZineArranger,
        hint: "Exports the current zine and opens it directly in ZineArranger — no manual save/reopen step"
      }
    )))));
  }

  // apps/ZEditor/src/ui/App.jsx
  function App() {
    const status = useStatus();
    const doc = useDocumentState();
    const history = useHistory(doc);
    const view = useViewSettings();
    const toolDefaults = useToolDefaults();
    const selection = useSelection(doc);
    const edits = useAnnotationEdits({ doc, history, selection, toolDefaults });
    const pageOps = usePageOps({ doc, history, selection });
    const project = useProject({ doc, history, status, view, toolDefaults });
    const dialogs = useDialogs({ pages: doc.pages, openProjectPicker: project.openProjectPicker });
    const files = useDocumentFiles({ doc, history, status, project, selection, dialogs });
    const exporter = useExport({ doc, status, view, project });
    const zoom = useZoom();
    const onionGhostSrc = useOnionGhost({ onionSkinOn: view.onionSkinOn, pages: doc.pages, selectedIdx: doc.selectedIdx, pdfDocsRef: doc.pdfDocsRef });
    const modalOpen = Boolean(files.pendingInsertFile || dialogs.confirmAction || dialogs.shortcutsOpen || dialogs.newDocOpen);
    useKeyboardShortcuts({ doc, history, selection, edits, pageOps, project, modalOpen });
    const { pages, selectedIdx, selectedPageIndices, selectedPage, pageFilter } = doc;
    const { tool, selectedAnnId, selectedAnnIds, editingAnnId, croppingAnnId } = selection;
    const t = toolDefaults;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-shell" }, /* @__PURE__ */ React.createElement(Topbar, { doc, history, view, edits, project, dialogs, exporter, status }), status.errorMsg && /* @__PURE__ */ React.createElement("div", { className: "ze-error-bar" }, status.errorMsg), /* @__PURE__ */ React.createElement("div", { className: "ze-body" }, /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        pages,
        selectedIdx,
        selectedPageIndices,
        onSelect: selection.handleSelectPage,
        onSelectAll: selection.handleSelectAllPages,
        onRotate: pageOps.handleRotate,
        onDelete: pageOps.handleDeleteThumbnail,
        onReorder: pageOps.handleReorder,
        onLoadClick: files.handleLoadClick,
        onNewDocClick: () => dialogs.openNewDocDialog(false),
        onInsertPdfClick: files.handleInsertPdfClick,
        onInsertBlank: pageOps.handleInsertBlank,
        loading: status.loading
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "ze-compose-area" }, selectedPage && /* @__PURE__ */ React.createElement(ToolBar, { selection, edits, view, zoom, dialogs }), /* @__PURE__ */ React.createElement("div", { className: "preview-pane", ref: zoom.previewPaneRef }, /* @__PURE__ */ React.createElement("div", { className: "preview-canvas-wrapper" }, /* @__PURE__ */ React.createElement(
      ComposeCanvas,
      {
        zoom: zoom.zoomPercent / 100,
        pdfDocsRef: doc.pdfDocsRef,
        page: selectedPage,
        guidesOn: view.guidesOn,
        centerGuideOn: view.centerGuideOn,
        guideFormat: view.guideFormat,
        guideMarginIn: view.guideMarginIn,
        guideBleedIn: view.guideBleedIn,
        pageFilter,
        onionGhostSrc: view.onionSkinOn ? onionGhostSrc : null,
        onionSkinOpacity: view.onionSkinOpacity,
        pageNumberSpec: pageNumberSpec(view.pageNumbers, selectedIdx, pages.length),
        tool,
        penColor: t.penColor,
        penWidth: t.penWidth,
        penTaper: t.penTaper,
        highlighterColor: t.highlighterColor,
        highlighterWidth: t.highlighterWidth,
        highlighterTaper: t.highlighterTaper,
        annotations: selectedPage ? selectedPage.annotations || [] : [],
        selectedAnnId,
        selectedAnnIds,
        editingAnnId,
        onStartTextEdit: selection.setEditingAnnId,
        onFinishTextEdit: edits.finishTextEdit,
        onSelectAnnotations: selection.handleSelectAnnotations,
        onMoveAnnotations: edits.handleMoveAnnotations,
        onRotateAnnotations: edits.handleRotateAnnotations,
        croppingAnnId,
        onSelectAnnotation: selection.handleSelectAnnotation,
        onAddText: edits.handleAddText,
        onAddRect: edits.handleAddRect,
        onAddStroke: edits.handleAddStroke,
        onUpdateAnnotation: edits.handleUpdateAnnotation,
        onEraseStroke: edits.handleEraseStroke,
        onToggleCrop: selection.handleToggleCrop,
        eraserMode: t.eraserMode,
        softEraser: t.softEraser,
        magicEraser: t.magicEraser,
        onEraseImagePixels: edits.handleEraseImagePixels
      }
    )))), selectedPage && /* @__PURE__ */ React.createElement(
      FormatPanel,
      {
        key: selectedAnnId,
        tool,
        selectedAnn: (selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null,
        onUpdate: edits.handleUpdateAnnotation,
        croppingAnnId,
        onToggleCrop: selection.handleToggleCrop,
        onFlattenImage: edits.handleFlattenImage,
        onRasterizeRect: edits.handleRasterizeRect,
        onRasterizeText: edits.handleRasterizeText,
        toolDefaults
      }
    )), selectedPage && view.layersOpen && /* @__PURE__ */ React.createElement(
      LayersPanel,
      {
        position: view.layersPosition,
        onMove: view.setLayersPosition,
        onMinimize: () => view.setLayersOpen(false),
        annotations: selectedPage.annotations || [],
        selectedIds: selection.selectedAnnotationIds(),
        onSelect: selection.handleSelectLayer,
        onGroup: edits.handleGroupSelection,
        onUngroup: edits.handleUngroupSelection,
        onToggleFlag: edits.handleToggleLayerFlag,
        onRename: (id, name) => edits.handleUpdateAnnotation(id, { name }),
        onReorder: edits.handleReorderLayers
      }
    ), /* @__PURE__ */ React.createElement("input", { ref: files.fileInputRef, type: "file", accept: "application/pdf", style: { display: "none" }, onChange: files.handleFileInputChange }), /* @__PURE__ */ React.createElement("input", { ref: edits.imageInputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: edits.handleImageFileChosen }), /* @__PURE__ */ React.createElement("input", { ref: files.insertPdfInputRef, type: "file", accept: "application/pdf", style: { display: "none" }, onChange: files.handleInsertPdfInputChange }), /* @__PURE__ */ React.createElement("input", { ref: project.projectInputRef, type: "file", accept: ".znow", style: { display: "none" }, onChange: project.handleProjectInputChange }), /* @__PURE__ */ React.createElement(
      InsertPdfDialog,
      {
        file: files.pendingInsertFile,
        pageCount: pages.length,
        afterPage: files.insertAfterPage,
        onChangeAfterPage: files.setInsertAfterPage,
        onConfirm: files.handleConfirmInsertPdf,
        onCancel: () => files.setPendingInsertFile(null)
      }
    ), /* @__PURE__ */ React.createElement(
      NewDocumentDialog,
      {
        open: dialogs.newDocOpen,
        onCreate: files.handleCreateBlankDocument,
        onOpenPdf: dialogs.newDocFromProject ? files.handleNewDocumentOpenPdf : void 0,
        onCancel: () => dialogs.setNewDocOpen(false)
      }
    ), /* @__PURE__ */ React.createElement(ShortcutsDialog, { open: dialogs.shortcutsOpen, onClose: () => dialogs.setShortcutsOpen(false) }), /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        step: dialogs.confirmAction ? dialogs.confirmStep : 0,
        onProceed: dialogs.handleConfirmProceed,
        onYes: dialogs.handleConfirmYes,
        onCancel: dialogs.handleConfirmCancel
      }
    ), /* @__PURE__ */ React.createElement(LiveFilterDefs, { pageFilter }));
  }

  // apps/ZEditor/src/main.jsx
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
