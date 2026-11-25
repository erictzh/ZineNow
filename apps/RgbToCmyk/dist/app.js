// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.
(() => {
  // shared/js/pdfCmyk.js
  function rgbToCmyk(r, g, b) {
    const k = 1 - Math.max(r, g, b);
    if (k >= 1) return [0, 0, 0, 1];
    return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k];
  }
  var fmt = (v) => String(Math.round(Math.min(1, Math.max(0, v)) * 1e3) / 1e3);
  function convertContentColours(text, stats, blackAsK = true) {
    return text.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(rg|RG)(?![A-Za-z])/g, (m, r, g, b, op) => {
      r = +r;
      g = +g;
      b = +b;
      const grey = r === g && g === b;
      const cmyk = grey && blackAsK ? [0, 0, 0, 1 - r] : rgbToCmyk(r, g, b);
      stats[grey && blackAsK ? "greyColours" : "colours"]++;
      return cmyk.map(fmt).join(" ") + " " + (op === "rg" ? "k" : "K");
    });
  }
  function unfilterPng(data, width, height, bpp) {
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
          case 0:
            v = raw;
            break;
          case 1:
            v = raw + a;
            break;
          case 2:
            v = raw + b;
            break;
          case 3:
            v = raw + (a + b >> 1);
            break;
          case 4: {
            const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
            v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
            break;
          }
          default:
            return null;
        }
        out[dst + x] = v & 255;
      }
    }
    return out;
  }
  async function convertPdfToCmyk(PDFLib, inputBytes, options = {}) {
    const { PDFName, PDFRawStream, PDFArray, decodePDFRawStream } = PDFLib;
    const opts = { blackAsK: true, greyPictures: true, colourPictures: true, ...options };
    const doc = await PDFLib.PDFDocument.load(inputBytes, { updateMetadata: false });
    const ctx = doc.context;
    const stats = { greyColours: 0, colours: 0, picturesGrey: 0, picturesCmyk: 0, picturesKept: 0, notes: [] };
    const note = (text) => {
      if (!stats.notes.includes(text)) stats.notes.push(text);
    };
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
      for (const key of ["Subtype", "BBox", "Matrix", "Resources", "Group", "Type"]) {
        const v = d.get(PDFName.of(key));
        if (v) keep[key] = v;
      }
      return keep;
    };
    for (const page of doc.getPages()) {
      const contents = page.node.Contents();
      const refs = contents instanceof PDFArray ? contents.asArray() : [page.node.get(PDFName.of("Contents"))];
      refs.forEach((ref) => {
        const s = ctx.lookup(ref);
        if (s instanceof PDFRawStream) rewrite(ref, s);
      });
    }
    for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
      if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Form")) rewrite(ref, obj);
    }
    for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream)) continue;
      const d = obj.dict;
      if (d.get(PDFName.of("Subtype")) !== PDFName.of("Image")) continue;
      const cs = d.get(PDFName.of("ColorSpace")), bpc = d.get(PDFName.of("BitsPerComponent"));
      if (cs !== PDFName.of("DeviceRGB") || !bpc || bpc.asNumber() !== 8) {
        stats.picturesKept++;
        note("some pictures are not plain 8-bit RGB (already CMYK or grey, a colour profile, a palette, a mask): kept as they were");
        continue;
      }
      if (d.get(PDFName.of("Decode")) || d.get(PDFName.of("Mask"))) {
        stats.picturesKept++;
        note("some pictures use a decode array or colour-key mask: kept as they were");
        continue;
      }
      const w = d.get(PDFName.of("Width")).asNumber(), h = d.get(PDFName.of("Height")).asNumber();
      let rgb;
      try {
        rgb = decodePDFRawStream(obj).decode();
      } catch (err) {
        stats.picturesKept++;
        note("some pictures use a compression this can't read (for example JPEG): kept as they were");
        continue;
      }
      const parms = d.get(PDFName.of("DecodeParms"));
      const predictor = parms && parms.get ? parms.get(PDFName.of("Predictor")) : null;
      if (parms) {
        if (!predictor || predictor.asNumber() < 10 || parms.get(PDFName.of("Colors")) && parms.get(PDFName.of("Colors")).asNumber() !== 3) {
          stats.picturesKept++;
          note("some pictures use a predictor this can't read: kept as they were");
          continue;
        }
        rgb = unfilterPng(rgb, w, h, 3);
        if (!rgb) {
          stats.picturesKept++;
          note("a picture's data was shorter than its size: kept as it was");
          continue;
        }
      }
      if (rgb.length < w * h * 3) {
        stats.picturesKept++;
        continue;
      }
      let allGrey = true;
      for (let i = 0; i < w * h; i++) if (rgb[i * 3] !== rgb[i * 3 + 1] || rgb[i * 3] !== rgb[i * 3 + 2]) {
        allGrey = false;
        break;
      }
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
      } else {
        stats.picturesKept++;
        continue;
      }
      const mask = d.get(PDFName.of("SMask"));
      if (mask) dict.SMask = mask;
      ctx.assign(ref, ctx.flateStream(data, dict));
    }
    return { bytes: await doc.save(), stats };
  }
  function describeConversion(stats) {
    const bits = [];
    if (stats.greyColours) bits.push(`${stats.greyColours} black or grey colour${stats.greyColours === 1 ? "" : "s"} now print from the black ink only`);
    if (stats.colours) bits.push(`${stats.colours} colour${stats.colours === 1 ? "" : "s"} converted to CMYK`);
    if (stats.picturesGrey) bits.push(`${stats.picturesGrey} grey picture${stats.picturesGrey === 1 ? "" : "s"} now one-channel (black ink only)`);
    if (stats.picturesCmyk) bits.push(`${stats.picturesCmyk} colour picture${stats.picturesCmyk === 1 ? "" : "s"} converted to CMYK`);
    if (stats.picturesKept) bits.push(`${stats.picturesKept} picture${stats.picturesKept === 1 ? "" : "s"} left as they were`);
    return (bits.length ? bits.join("; ") + "." : "Nothing in this PDF needed converting.") + (stats.notes.length ? " " + stats.notes.map((n) => n[0].toUpperCase() + n.slice(1) + ".").join(" ") : "");
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

  // apps/RgbToCmyk/src/main.js
  var $ = (id) => document.getElementById(id);
  var source = null;
  var result = null;
  var kb = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  async function choose(file) {
    if (!file) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      $("status").textContent = "That is not a PDF.";
      return;
    }
    source = { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
    result = null;
    $("drop-title").textContent = file.name;
    $("drop-sub").textContent = kb(source.bytes.length) + " · click to choose another";
    $("options").hidden = false;
    $("result").hidden = true;
    $("status").textContent = "";
  }
  async function convert() {
    if (!source) return;
    $("convert").disabled = true;
    $("status").textContent = "Converting…";
    try {
      const { bytes, stats } = await convertPdfToCmyk(window.PDFLib, source.bytes, {
        blackAsK: $("opt-black").checked,
        greyPictures: $("opt-grey").checked,
        colourPictures: $("opt-colour").checked
      });
      result = { name: source.name.replace(/\.pdf$/i, "") + "-cmyk.pdf", bytes };
      $("report").textContent = describeConversion(stats);
      $("sizes").textContent = `Before: ${kb(source.bytes.length)} · After: ${kb(bytes.length)}`;
      $("result").hidden = false;
      $("status").textContent = "";
    } catch (err) {
      $("status").textContent = "Couldn't convert this PDF: " + (err && err.message ? err.message : "unknown error");
    } finally {
      $("convert").disabled = false;
    }
  }
  $("file").addEventListener("change", (e) => choose(e.target.files[0]));
  $("convert").addEventListener("click", convert);
  $("download").addEventListener("click", () => {
    if (result) downloadBlob(new Blob([result.bytes], { type: "application/pdf" }), result.name);
  });
  var drop = $("drop");
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $("file").click();
    }
  });
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("is-over");
    choose(e.dataTransfer.files[0]);
  });
})();
