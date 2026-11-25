// Turns an RGB PDF into one that prints with ink in mind (CMYK), in the browser, with pdf-lib. No colour profile is used, so
// this is a plain, honest conversion, not a press-proof one. What it does, step by step:
//
//   1. Black and grey drawing colours (text, lines, shapes where red = green = blue) become ONE ink: K only. Black text then
//      prints from the black plate alone, with no registration trouble.
//   2. Pictures that are only greys become one-channel DeviceGray pictures (also black ink only) and shrink to a third.
//   3. Pictures with colour become DeviceCMYK with a plain formula. Colours come out a little duller than on screen: that is
//      the nature of RGB to CMYK without a profile.
//   4. Other colour drawing operators (rg / RG) become k / K with the same formula.
//
// Left alone, and counted in the report: pictures in other colour spaces (already CMYK, grey, ICC profiles, palettes), pictures
// stored in a way this does not read, patterns and shadings, and colours set another way than rg / RG.
//
// The pure helpers (rgbToCmyk, convertContentColours, unfilterPng) need no PDF library and are what the tests check.

// Plain RGB (0..1) to CMYK (0..1): black is 1 - the brightest channel, the others are scaled by what is left.
export function rgbToCmyk(r, g, b) {
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 1];
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k];
}
const fmt = (v) => String(Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000);

// The colour operators of a page's drawing instructions (text). rg / RG set the fill / stroke colour in RGB. A grey (r = g = b)
// becomes K only (when `blackAsK`), anything else CMYK. Returns the new text; `stats` counts what was changed.
export function convertContentColours(text, stats, blackAsK = true) {
  return text.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(rg|RG)(?![A-Za-z])/g, (m, r, g, b, op) => {
    r = +r; g = +g; b = +b;
    const grey = r === g && g === b;
    const cmyk = grey && blackAsK ? [0, 0, 0, 1 - r] : rgbToCmyk(r, g, b);
    stats[grey && blackAsK ? "greyColours" : "colours"]++;
    return cmyk.map(fmt).join(" ") + " " + (op === "rg" ? "k" : "K");
  });
}

// PNG-style predictor (PDF Predictor 10-15): every row starts with a filter byte. Returns the plain bytes, or null if the data
// is shorter than the rows need. `bpp` is bytes per pixel (3 for 8-bit RGB).
export function unfilterPng(data, width, height, bpp) {
  const stride = width * bpp;
  if (data.length < (stride + 1) * height) return null;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const src = y * (stride + 1) + 1, dst = y * stride, prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const raw = data[src + x];
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = raw; break;
        case 1: v = raw + a; break;
        case 2: v = raw + b; break;
        case 3: v = raw + ((a + b) >> 1); break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: return null;
      }
      out[dst + x] = v & 255;
    }
  }
  return out;
}

// `PDFLib` is the pdf-lib library (the page's global, or the module in tests).
// options: { blackAsK, greyPictures, colourPictures } all on by default.
// Returns { bytes, stats }: stats = { greyColours, colours, picturesGrey, picturesCmyk, picturesKept, notes: [text] }.
export async function convertPdfToCmyk(PDFLib, inputBytes, options = {}) {
  const { PDFName, PDFRawStream, PDFArray, decodePDFRawStream } = PDFLib;
  const opts = { blackAsK: true, greyPictures: true, colourPictures: true, ...options };
  const doc = await PDFLib.PDFDocument.load(inputBytes, { updateMetadata: false });
  const ctx = doc.context;
  const stats = { greyColours: 0, colours: 0, picturesGrey: 0, picturesCmyk: 0, picturesKept: 0, notes: [] };
  const note = (text) => { if (!stats.notes.includes(text)) stats.notes.push(text); };

  // 1 + 4) drawing instructions: every page's, and those of form XObjects (reusable drawings).
  const rewrite = (ref, stream) => {
    const bytes = decodePDFRawStream(stream).decode();
    let text = "";
    for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    const out = convertContentColours(text, stats, opts.blackAsK);
    if (out === text) return;
    const data = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) data[i] = out.charCodeAt(i) & 255;
    ctx.assign(ref, ctx.flateStream(data, stream.dict.get(PDFName.of("Subtype")) === PDFName.of("Form") ? formDict(stream.dict) : {}));
  };
  const formDict = (d) => {
    const keep = {};
    for (const key of ["Subtype", "BBox", "Matrix", "Resources", "Group", "Type"]) { const v = d.get(PDFName.of(key)); if (v) keep[key] = v; }
    return keep;
  };
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : [page.node.get(PDFName.of("Contents"))];
    refs.forEach((ref) => { const s = ctx.lookup(ref); if (s instanceof PDFRawStream) rewrite(ref, s); });
  }
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Form")) rewrite(ref, obj);
  }

  // 2 + 3) pictures
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (d.get(PDFName.of("Subtype")) !== PDFName.of("Image")) continue;
    const cs = d.get(PDFName.of("ColorSpace")), bpc = d.get(PDFName.of("BitsPerComponent"));
    if (cs !== PDFName.of("DeviceRGB") || !bpc || bpc.asNumber() !== 8) { stats.picturesKept++; note("some pictures are not plain 8-bit RGB (already CMYK or grey, a colour profile, a palette, a mask): kept as they were"); continue; }
    if (d.get(PDFName.of("Decode")) || d.get(PDFName.of("Mask"))) { stats.picturesKept++; note("some pictures use a decode array or colour-key mask: kept as they were"); continue; }
    const w = d.get(PDFName.of("Width")).asNumber(), h = d.get(PDFName.of("Height")).asNumber();
    let rgb;
    try { rgb = decodePDFRawStream(obj).decode(); } catch (err) { stats.picturesKept++; note("some pictures use a compression this can't read (for example JPEG): kept as they were"); continue; }
    const parms = d.get(PDFName.of("DecodeParms"));
    const predictor = parms && parms.get ? parms.get(PDFName.of("Predictor")) : null;
    if (parms) {
      if (!predictor || predictor.asNumber() < 10 || (parms.get(PDFName.of("Colors")) && parms.get(PDFName.of("Colors")).asNumber() !== 3)) { stats.picturesKept++; note("some pictures use a predictor this can't read: kept as they were"); continue; }
      rgb = unfilterPng(rgb, w, h, 3);
      if (!rgb) { stats.picturesKept++; note("a picture's data was shorter than its size: kept as it was"); continue; }
    }
    if (rgb.length < w * h * 3) { stats.picturesKept++; continue; }
    let allGrey = true;
    for (let i = 0; i < w * h; i++) if (rgb[i * 3] !== rgb[i * 3 + 1] || rgb[i * 3] !== rgb[i * 3 + 2]) { allGrey = false; break; }
    const dict = { Type: PDFName.of("XObject"), Subtype: PDFName.of("Image"), Width: w, Height: h, BitsPerComponent: 8 };
    let data;
    if (allGrey && opts.greyPictures) {
      data = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) data[i] = rgb[i * 3];
      dict.ColorSpace = PDFName.of("DeviceGray");
      stats.picturesGrey++;
    } else if (!allGrey && opts.colourPictures) {
      data = new Uint8Array(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        const c = rgbToCmyk(rgb[i * 3] / 255, rgb[i * 3 + 1] / 255, rgb[i * 3 + 2] / 255);
        for (let k = 0; k < 4; k++) data[i * 4 + k] = Math.round(c[k] * 255);
      }
      dict.ColorSpace = PDFName.of("DeviceCMYK");
      stats.picturesCmyk++;
    } else { stats.picturesKept++; continue; }
    const mask = d.get(PDFName.of("SMask"));
    if (mask) dict.SMask = mask;
    ctx.assign(ref, ctx.flateStream(data, dict));
  }
  return { bytes: await doc.save(), stats };
}

// A sentence or two about what a conversion did, for the page and for tests.
export function describeConversion(stats) {
  const bits = [];
  if (stats.greyColours) bits.push(`${stats.greyColours} black or grey colour${stats.greyColours === 1 ? "" : "s"} now print from the black ink only`);
  if (stats.colours) bits.push(`${stats.colours} colour${stats.colours === 1 ? "" : "s"} converted to CMYK`);
  if (stats.picturesGrey) bits.push(`${stats.picturesGrey} grey picture${stats.picturesGrey === 1 ? "" : "s"} now one-channel (black ink only)`);
  if (stats.picturesCmyk) bits.push(`${stats.picturesCmyk} colour picture${stats.picturesCmyk === 1 ? "" : "s"} converted to CMYK`);
  if (stats.picturesKept) bits.push(`${stats.picturesKept} picture${stats.picturesKept === 1 ? "" : "s"} left as they were`);
  return (bits.length ? bits.join("; ") + "." : "Nothing in this PDF needed converting.") + (stats.notes.length ? " " + stats.notes.map((n) => n[0].toUpperCase() + n.slice(1) + ".").join(" ") : "");
}
