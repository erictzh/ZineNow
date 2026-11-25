// RGB PDF to CMYK (shared/js/pdfCmyk.js): the colour maths, the PNG predictor, and a whole PDF made with pdf-lib.
import zlib from "node:zlib";
import * as PDFLibModule from "../shared/vendor/pdf-lib/pdf-lib.min.js";
import { convertContentColours, convertPdfToCmyk, describeConversion, rgbToCmyk, unfilterPng } from "../shared/js/pdfCmyk.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const PDFLib = PDFLibModule.PDFDocument ? PDFLibModule : PDFLibModule.default;
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ---- the maths
const red = rgbToCmyk(1, 0, 0), black = rgbToCmyk(0, 0, 0), white = rgbToCmyk(1, 1, 1), grey = rgbToCmyk(0.5, 0.5, 0.5);
ok(near(red[0], 0) && near(red[1], 1) && near(red[2], 1) && near(red[3], 0), "pure red is magenta + yellow");
ok(black.join() === "0,0,0,1" && white.join() === "0,0,0,0", "black is K only, white is no ink");
ok(near(grey[0], 0) && near(grey[3], 0.5), "a grey is K only");

const stats = { greyColours: 0, colours: 0 };
const text = "q 0 0 0 rg 10 10 m 0.5 0.5 0.5 RG 1 0 0 rg 0.2 0.4 0.6 RG Q BT 0 0 1 rg ET";
const out = convertContentColours(text, stats, true);
ok(out.includes("0 0 0 1 k") && out.includes("0 0 0 0.5 K") && out.includes("0 1 1 0 k"), "drawing colours are rewritten (black, grey stroke, red fill)");
ok(stats.greyColours === 2 && stats.colours === 3, "grey and colour counted separately");
const s2 = { greyColours: 0, colours: 0 };
ok(convertContentColours("0 0 0 rg", s2, false).startsWith("0 0 0 1 k") && s2.colours === 1, "with 'black as K only' off, black goes through the formula (still K = 1)");
ok(convertContentColours("0 0 0 sc 1 0 0 g", { greyColours: 0, colours: 0 }) === "0 0 0 sc 1 0 0 g", "other colour operators are left alone");

// ---- PNG rows with every filter type
const W = 5, H = 5, BPP = 3;
const pixels = new Uint8Array(W * H * BPP).map((_, i) => (i * 37 + (i >> 3) * 11) & 255);
function filterRow(type, y) {
  const stride = W * BPP, row = new Uint8Array(1 + stride); row[0] = type;
  for (let x = 0; x < stride; x++) {
    const cur = pixels[y * stride + x];
    const a = x >= BPP ? pixels[y * stride + x - BPP] : 0, b = y > 0 ? pixels[(y - 1) * stride + x] : 0, c = x >= BPP && y > 0 ? pixels[(y - 1) * stride + x - BPP] : 0;
    let pred = 0;
    if (type === 1) pred = a; else if (type === 2) pred = b; else if (type === 3) pred = (a + b) >> 1;
    else if (type === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
    row[1 + x] = (cur - pred) & 255;
  }
  return row;
}
const filtered = new Uint8Array((W * BPP + 1) * H);
for (let y = 0; y < H; y++) filtered.set(filterRow(y % 5, y), y * (W * BPP + 1)); // rows use filters 0,1,2,3,4
const plain = unfilterPng(filtered, W, H, BPP);
ok(plain && plain.every((v, i) => v === pixels[i]), "all five PNG filter types are undone exactly");
ok(unfilterPng(filtered.subarray(0, 10), W, H, BPP) === null, "short data is refused, not guessed");

// ---- a whole PDF
function crc32(buf) { let c, crc = -1; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ -1) >>> 0; }
function png(w, h, colourType, pixelFn) {
  const bpp = colourType === 6 ? 4 : 3, raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const px = pixelFn(x, y); for (let k = 0; k < bpp; k++) raw[y * (w * bpp + 1) + 1 + x * bpp + k] = px[k]; }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = colourType;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
(async () => {
  const doc = await PDFLib.PDFDocument.create();
  const page = doc.addPage([200, 200]);
  page.drawRectangle({ x: 10, y: 10, width: 50, height: 50, color: PDFLib.rgb(0, 0, 0) });
  page.drawRectangle({ x: 70, y: 10, width: 50, height: 50, color: PDFLib.rgb(1, 0, 0) });
  const greyImg = await doc.embedPng(png(4, 4, 2, (x, y) => { const v = x * 40 + y * 10; return [v, v, v]; }));
  const colourImg = await doc.embedPng(png(4, 4, 2, (x, y) => [x * 60, y * 60, 128]));
  const alphaImg = await doc.embedPng(png(4, 4, 6, (x, y) => [200, 100, 50, x * 60]));
  page.drawImage(greyImg, { x: 10, y: 100, width: 40, height: 40 });
  page.drawImage(colourImg, { x: 60, y: 100, width: 40, height: 40 });
  page.drawImage(alphaImg, { x: 110, y: 100, width: 40, height: 40 });
  const input = await doc.save();

  const { bytes, stats: st } = await convertPdfToCmyk(PDFLib, input);
  const out2 = await PDFLib.PDFDocument.load(bytes);
  const ctx = out2.context;
  const kinds = [];
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFLib.PDFRawStream && obj.dict.get(PDFLib.PDFName.of("Subtype")) === PDFLib.PDFName.of("Image")) kinds.push(String(obj.dict.get(PDFLib.PDFName.of("ColorSpace"))));
  }
  ok(st.picturesGrey === 1, "the grey picture became one-channel");
  ok(st.picturesCmyk === 2, "the colour picture and the one with transparency became CMYK");
  ok(kinds.filter((k) => k.includes("DeviceGray")).length >= 1 && kinds.filter((k) => k.includes("DeviceCMYK")).length === 2, "the new colour spaces are in the file: " + kinds.join(","));
  ok(st.greyColours === 1 && st.colours === 1, "the black square became K only and the red one CMYK");
  ok(bytes.length > 100 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-", "the result is a PDF");
  ok(describeConversion(st).includes("one-channel"), "the report says what happened");
  ok(describeConversion({ greyColours: 0, colours: 0, picturesGrey: 0, picturesCmyk: 0, picturesKept: 0, notes: [] }).startsWith("Nothing"), "and when nothing changed");
  const off = await convertPdfToCmyk(PDFLib, input, { greyPictures: false, colourPictures: false });
  ok(off.stats.picturesKept === 4 && off.stats.picturesGrey === 0, "with the picture steps off, pictures stay (the alpha picture's mask counts too)");
  if (fails) { console.log(fails + " failed"); process.exit(1); }
})();
