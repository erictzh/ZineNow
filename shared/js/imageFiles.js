// Picture files read in the browser, shared by the apps: SVGs drawn into PNGs, and any picture
// shrunk into a data URL ready to embed (ZEditor's Insert Image and SVG button, Markdown-to-PDF's
// image button).

// ---- SVG files ------------------------------------------------------------------------------
// An SVG is turned into a PNG as it's inserted, so it behaves like any other picture (eraser,
// filters, crop, Vectorize) and works whether or not the file says how big it is: an SVG with
// only a viewBox has no size of its own, and the browser would draw it at 0 x 0. The longest
// side is drawn at `maxSide` px, plenty for printing at the sizes a zine uses.

export function isSvgFile(file) {
  return Boolean(file) && (file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name || ""));
}

// Its size in CSS px from width/height (units roughly converted) or the viewBox; 300 x 150 (the
// browser's own default) if it gives neither.
const UNIT_PX = { px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 };
function svgLength(value) {
  const m = /^\s*([\d.]+)\s*(px|pt|pc|in|cm|mm)?\s*$/i.exec(value || "");
  return m ? parseFloat(m[1]) * UNIT_PX[(m[2] || "px").toLowerCase()] : null; // % and em: unknown
}

export function svgSize(svgEl) {
  const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  const hasViewBox = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
  let width = svgLength(svgEl.getAttribute("width"));
  let height = svgLength(svgEl.getAttribute("height"));
  if (hasViewBox) {
    if (!width && !height) { width = vb[2]; height = vb[3]; }
    else if (!width) width = height * (vb[2] / vb[3]);
    else if (!height) height = width * (vb[3] / vb[2]);
  }
  return { width: width || 300, height: height || 150, viewBox: hasViewBox ? vb : null };
}

export function svgFileToPng(file, maxSide = 2048) {
  return file.text().then((text) => new Promise((resolve, reject) => {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) {
      reject(new Error("That SVG file couldn't be read."));
      return;
    }
    const size = svgSize(svg);
    const scale = maxSide / Math.max(size.width, size.height);
    const outW = Math.max(1, Math.round(size.width * scale));
    const outH = Math.max(1, Math.round(size.height * scale));
    // Give it an explicit size (and a viewBox, so the drawing scales up with it).
    if (!size.viewBox) svg.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    svg.setAttribute("width", String(outW));
    svg.setAttribute("height", String(outH));
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    const img = new Image();
    img.onerror = () => reject(new Error("That SVG file couldn't be drawn."));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      canvas.getContext("2d").drawImage(img, 0, 0, outW, outH);
      resolve({ src: canvas.toDataURL("image/png"), width: size.width, height: size.height });
    };
    img.src = url;
  }));
}

// ---- Any picture, as an embeddable data URL -------------------------------------------------
// Shrinks it so the longest side is at most `maxSide` px (never enlarges), keeping transparency
// (PNG) where it has any, else JPEG, which is far smaller for photos. An SVG is drawn first
// (svgFileToPng). Resolves to { src, width, height } (width/height of the result).
export async function imageFileToDataUrl(file, { maxSide = 1600, quality = 0.85 } = {}) {
  const url = isSvgFile(file) ? (await svgFileToPng(file, maxSide)).src : await readAsDataUrl(file);
  const img = await loadImage(url);
  const shrink = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * shrink));
  const height = Math.max(1, Math.round(img.naturalHeight * shrink));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  // A GIF's animation is lost either way (only its first frame is drawn).
  const png = hasTransparency(ctx, width, height);
  return { src: png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality), width, height };
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Couldn't read "${file.name}".`));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("That file isn't a picture the browser can open."));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function hasTransparency(ctx, width, height) {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}
