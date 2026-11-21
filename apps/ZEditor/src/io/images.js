// Reads a photo file into a (downscaled) data URL.

// Reads a chosen photo for a text fill: scaled down to at most 2000 px on a
// side (it only shows through letters, and it's stored in the project file).
export function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that photo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't an image the browser can open."));
      img.onload = () => {
        const shrink = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
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

// ---- SVG files for Insert Image ------------------------------------------------------------
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
