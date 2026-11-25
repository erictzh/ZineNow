// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.
(() => {
  // shared/js/inputMode.js
  function installInputMode() {
    if (typeof window === "undefined" || !window.PointerEvent) return;
    const root2 = document.documentElement;
    const mark = (kind) => {
      if (root2.dataset.input !== kind) root2.dataset.input = kind;
    };
    window.addEventListener("pointerdown", (e) => mark(e.pointerType === "mouse" ? "mouse" : "touch"), true);
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" && e.buttons === 0 && root2.dataset.input === "touch") mark("mouse");
    }, true);
  }

  // shared/js/numberFields.js
  var HOLD_MS = 450;
  var REPEAT_MS = 80;
  var isNumberBox = (el) => el instanceof HTMLInputElement && el.type === "number";
  var allowsEmpty = (el) => el.hasAttribute("data-allow-empty");
  var writeValue = (el, text) => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, text);
  var held = /* @__PURE__ */ new WeakMap();
  function holdEmpty(el) {
    if (held.has(el)) return;
    const own = Object.getOwnPropertyDescriptor(el, "value");
    held.set(el, own || null);
    if (!own || !own.get || !own.configurable) return;
    Object.defineProperty(el, "value", {
      configurable: true,
      enumerable: own.enumerable,
      get() {
        return own.get.call(this);
      },
      set() {
      }
    });
  }
  function releaseEmpty(el) {
    if (!held.has(el)) return;
    const own = held.get(el);
    held.delete(el);
    if (own) Object.defineProperty(el, "value", own);
    else delete el.value;
  }
  function installNumberFields() {
    const lastGood = /* @__PURE__ */ new WeakMap();
    document.addEventListener("focusin", (e) => {
      if (isNumberBox(e.target) && e.target.value !== "") lastGood.set(e.target, e.target.value);
    }, true);
    document.addEventListener("input", (e) => {
      const el = e.target;
      if (!isNumberBox(el)) return;
      if (el.value !== "") {
        releaseEmpty(el);
        lastGood.set(el, el.value);
        return;
      }
      if (allowsEmpty(el) || document.activeElement !== el) return;
      holdEmpty(el);
      e.stopImmediatePropagation();
    }, true);
    const restoreIfEmpty = (el) => {
      if (el.value !== "" || allowsEmpty(el) || !lastGood.has(el)) {
        releaseEmpty(el);
        return false;
      }
      releaseEmpty(el);
      writeValue(el, lastGood.get(el));
      return true;
    };
    document.addEventListener("change", (e) => {
      if (isNumberBox(e.target) && restoreIfEmpty(e.target)) e.stopImmediatePropagation();
    }, true);
    document.addEventListener("focusout", (e) => {
      if (isNumberBox(e.target)) restoreIfEmpty(e.target);
    }, true);
    function stepBy(el, dir) {
      const before = el.value;
      if (before === "" && el.placeholder !== "" && isFinite(Number(el.placeholder))) writeValue(el, el.placeholder);
      const start = el.value;
      try {
        if (dir > 0) el.stepUp();
        else el.stepDown();
      } catch (err) {
        return false;
      }
      const dec = (String(el.step).split(".")[1] || "").length;
      if (dec && el.value !== "" && isFinite(Number(el.value))) writeValue(el, String(Number(Number(el.value).toFixed(dec))));
      if (el.value === start && before !== "") return false;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    let holdTimer = 0;
    let repeatTimer = 0;
    const stop = () => {
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
      holdTimer = repeatTimer = 0;
    };
    const buttonOf = (e) => e.target instanceof Element ? e.target.closest(".zn-num-btn") : null;
    const boxOf = (button) => button.parentElement ? button.parentElement.querySelector('input[type="number"]') : null;
    document.addEventListener("pointerdown", (e) => {
      const button = buttonOf(e);
      if (!button || button.disabled || e.pointerType === "mouse" && e.button !== 0) return;
      const el = boxOf(button);
      if (!el || el.disabled || el.readOnly) return;
      e.preventDefault();
      const dir = Number(button.dataset.znStep) || 0;
      stop();
      stepBy(el, dir);
      holdTimer = setTimeout(() => {
        repeatTimer = setInterval(() => {
          if (!stepBy(el, dir)) stop();
        }, REPEAT_MS);
      }, HOLD_MS);
      const release = () => {
        stop();
        if (document.activeElement !== el) el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      };
      window.addEventListener("pointerup", release, { once: true });
      window.addEventListener("pointercancel", release, { once: true });
    }, true);
    for (const type of ["mousedown", "mouseup", "click"]) {
      document.addEventListener(type, (e) => {
        if (buttonOf(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    }
  }

  // shared/js/leaveWarning.js
  var hasWork = () => false;
  var bypassOnce = false;
  var installed = false;
  function warnBeforeLeaving(check) {
    hasWork = check;
    if (installed) return;
    installed = true;
    window.addEventListener("beforeunload", (e) => {
      if (bypassOnce || !hasWork()) return;
      e.preventDefault();
      e.returnValue = "";
    });
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

  // shared/js/imageFiles.js
  function isSvgFile(file) {
    return Boolean(file) && (file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name || ""));
  }
  var UNIT_PX = { px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 };
  function svgLength(value) {
    const m = /^\s*([\d.]+)\s*(px|pt|pc|in|cm|mm)?\s*$/i.exec(value || "");
    return m ? parseFloat(m[1]) * UNIT_PX[(m[2] || "px").toLowerCase()] : null;
  }
  function svgSize(svgEl) {
    const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    const hasViewBox = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
    let width = svgLength(svgEl.getAttribute("width"));
    let height = svgLength(svgEl.getAttribute("height"));
    if (hasViewBox) {
      if (!width && !height) {
        width = vb[2];
        height = vb[3];
      } else if (!width) width = height * (vb[2] / vb[3]);
      else if (!height) height = width * (vb[3] / vb[2]);
    }
    return { width: width || 300, height: height || 150, viewBox: hasViewBox ? vb : null };
  }
  function svgFileToPng(file, maxSide = 2048) {
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
  async function imageFileToDataUrl(file, { maxSide = 1600, quality = 0.85 } = {}) {
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

  // shared/js/dropImages.js
  var IMAGE_NAME = /\.(png|jpe?g|gif|webp|svg|svgz|bmp|avif|ico)$/i;
  var IMAGE_URL = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)(\?[^#]*)?(#.*)?$/i;
  function isImageFile(file) {
    return Boolean(file) && ((file.type || "").startsWith("image/") || IMAGE_NAME.test(file.name || "") || isSvgFile(file));
  }
  function decodeEntities(s) {
    return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  function attribute(tag, name) {
    const m = new RegExp("\\s" + name + `\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
    return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? "") : "";
  }
  function getData(dt, type) {
    try {
      return dt.getData(type) || "";
    } catch (e) {
      return "";
    }
  }
  function usableUrl(url) {
    const u = String(url || "").trim();
    if (/^data:image\//i.test(u)) return u;
    if (u.startsWith("//")) return "https:" + u;
    return /^https?:\/\//i.test(u) ? u : null;
  }
  function readDrop(dt) {
    const files = Array.from(dt && dt.files || []).filter(isImageFile);
    if (files.length) return { files, url: null, alt: "" };
    if (!dt) return null;
    const html = getData(dt, "text/html");
    const tag = /<img\b[^>]*>/i.exec(html);
    if (tag) {
      const url = usableUrl(attribute(tag[0], "src"));
      if (url) return { files: [], url, alt: attribute(tag[0], "alt") };
    }
    const link = getData(dt, "text/uri-list").split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
    const plain = getData(dt, "text/plain").trim();
    for (const candidate of [link, /^\S+$/.test(plain) ? plain : ""]) {
      const url = usableUrl(candidate);
      if (url && (/^data:/i.test(url) || IMAGE_URL.test(url))) return { files: [], url, alt: "" };
    }
    return null;
  }
  function nameFromUrl(url, type) {
    const ext = ((type || "").split("/")[1] || "png").replace("svg+xml", "svg").replace("jpeg", "jpg");
    if (!/^https?:/i.test(url)) return "dropped-picture." + ext;
    let last = "";
    try {
      last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    } catch (e) {
    }
    last = last.replace(/[\\/:*?"<>|]+/g, "_").trim();
    if (!last) return "dropped-picture." + ext;
    return IMAGE_NAME.test(last) ? last : last + "." + ext;
  }
  async function fetchImageFile(url) {
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!(blob.type || "").startsWith("image/")) return null;
      return new File([blob], nameFromUrl(url, blob.type), { type: blob.type });
    } catch (e) {
      return null;
    }
  }
  var isEditable = (el) => el instanceof Element && Boolean(el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
  function makeOverlay(text) {
    const overlay = document.createElement("div");
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      zIndex: "2147483000",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      boxSizing: "border-box",
      background: "rgba(221, 83, 26, 0.12)",
      border: "3px dashed var(--ui-accent, #dd531a)"
    });
    const label = document.createElement("div");
    label.textContent = text;
    Object.assign(label.style, {
      padding: "14px 22px",
      borderRadius: "10px",
      background: "#201918",
      color: "var(--ui-fg, #e9e9ee)",
      border: "1px solid var(--ui-border, #3f3634)",
      boxShadow: "0 10px 24px rgba(0, 0, 0, 0.45)",
      font: "600 17px var(--ui-font, system-ui, sans-serif)"
    });
    overlay.appendChild(label);
    document.body.appendChild(overlay);
    return overlay;
  }
  function installImageDrop({ label, onDrop, onOther }) {
    let internal = false;
    let depth = 0;
    let overlay = null;
    const types = (e) => Array.from(e.dataTransfer && e.dataTransfer.types || []);
    const ours = (e) => {
      const t = types(e);
      if (t.includes("Files")) {
        internal = false;
        return true;
      }
      return !internal && (t.includes("text/uri-list") || t.includes("text/html") || t.includes("text/x-moz-url"));
    };
    const show = () => {
      if (!overlay) overlay = makeOverlay(label);
      overlay.style.display = "flex";
    };
    const hide = () => {
      depth = 0;
      if (overlay) overlay.style.display = "none";
    };
    const onDragStart = () => {
      internal = true;
    };
    const onDragEnd = () => {
      internal = false;
      hide();
    };
    const onDragEnter = (e) => {
      if (ours(e)) {
        depth++;
        show();
      }
    };
    const onDragLeave = (e) => {
      if (!ours(e)) return;
      depth = Math.max(0, depth - 1);
      const outside = e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight;
      if (depth === 0 || outside) hide();
    };
    const onDragOver = (e) => {
      if (!ours(e)) return;
      if (!isEditable(e.target) || types(e).includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    };
    const onDropEvent = (e) => {
      const wasOurs = ours(e);
      hide();
      internal = false;
      if (!wasOurs) return;
      const found = readDrop(e.dataTransfer);
      if (!found) {
        const others = Array.from(e.dataTransfer && e.dataTransfer.files || []);
        if (others.length) {
          e.preventDefault();
          if (onOther) onOther(others);
        } else if (!isEditable(e.target)) e.preventDefault();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onDrop({ ...found, x: e.clientX, y: e.clientY, target: e.target });
    };
    const listeners = [["dragstart", onDragStart], ["dragend", onDragEnd], ["dragenter", onDragEnter], ["dragleave", onDragLeave], ["dragover", onDragOver], ["drop", onDropEvent]];
    for (const [type, fn] of listeners) document.addEventListener(type, fn, true);
    return () => {
      for (const [type, fn] of listeners) document.removeEventListener(type, fn, true);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
  }

  // apps/Markdown-to-PDF/src/editor/format.js
  var INLINE = {
    bold: "**",
    italic: "*",
    strike: "~~",
    code: "`"
  };
  function runBefore(text, pos, ch) {
    let n = 0;
    while (pos - n - 1 >= 0 && text[pos - n - 1] === ch) n++;
    return n;
  }
  function runAfter(text, pos, ch) {
    let n = 0;
    while (pos + n < text.length && text[pos + n] === ch) n++;
    return n;
  }
  function wrappedBy(text, s, e, marker) {
    if (marker === "**" || marker === "*") {
      const n = Math.min(runBefore(text, s, "*"), runAfter(text, e, "*"));
      return marker === "**" ? n >= 2 : n % 2 === 1;
    }
    return text.slice(s - marker.length, s) === marker && text.slice(e, e + marker.length) === marker;
  }
  function toggleInline(text, start, end, kind) {
    const m = INLINE[kind];
    const len = m.length;
    if (start === end) {
      if (text.slice(start - len, start) === m && text.slice(start, start + len) === m && wrappedBy(text, start, start, m)) {
        return { from: start - len, to: start + len, insert: "", selStart: start - len, selEnd: start - len };
      }
      return { from: start, to: end, insert: m + m, selStart: start + len, selEnd: start + len };
    }
    let s = start;
    let e = end;
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    if (s === e) return { from: start, to: end, insert: text.slice(start, end), selStart: start, selEnd: end };
    const inner = text.slice(s, e);
    if (wrappedBy(text, s, e, m)) {
      return { from: s - len, to: e + len, insert: inner, selStart: s - len, selEnd: e - len };
    }
    if (inner.length >= 2 * len && inner.startsWith(m) && inner.endsWith(m) && wrappedBy(inner, len, inner.length - len, m)) {
      const bare = inner.slice(len, inner.length - len);
      return { from: s, to: e, insert: bare, selStart: s, selEnd: s + bare.length };
    }
    return { from: s, to: e, insert: m + inner + m, selStart: s + len, selEnd: e + len };
  }
  var HEADING_RE = /^(#{1,6})[ \t]+/;
  var QUOTE_RE = /^>[ \t]?/;
  var BULLET_RE = /^[ \t]*[-*+][ \t]+/;
  var NUMBER_RE = /^[ \t]*\d+[.)][ \t]+/;
  function lineKind(line) {
    const h = HEADING_RE.exec(line);
    if (h) return "h" + h[1].length;
    if (QUOTE_RE.test(line)) return "quote";
    if (BULLET_RE.test(line)) return "ul";
    if (NUMBER_RE.test(line)) return "ol";
    return "p";
  }
  function blockAt(text, pos) {
    if (codeBlockAt(text, pos)) return "code";
    const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
    let lineEnd = text.indexOf("\n", pos);
    if (lineEnd === -1) lineEnd = text.length;
    return lineKind(text.slice(lineStart, lineEnd));
  }
  function stripPrefix(line) {
    return line.replace(HEADING_RE, "").replace(QUOTE_RE, "").replace(BULLET_RE, "").replace(NUMBER_RE, "");
  }
  function setBlock(text, start, end, kind) {
    const from = text.lastIndexOf("\n", start - 1) + 1;
    const lastPos = end > start && text[end - 1] === "\n" ? end - 1 : end;
    let to = text.indexOf("\n", lastPos);
    if (to === -1) to = text.length;
    const lines = text.slice(from, to).split("\n");
    const content = lines.filter((l) => l.trim() !== "");
    const allAlready = content.length > 0 && content.every((l) => lineKind(l) === kind);
    const target = allAlready ? "p" : kind;
    let number = 0;
    const prefixFor = () => {
      if (target === "h1" || target === "h2" || target === "h3") return "#".repeat(Number(target[1])) + " ";
      if (target === "quote") return "> ";
      if (target === "ul") return "- ";
      if (target === "ol") return ++number + ". ";
      return "";
    };
    const out = lines.map((l) => l.trim() === "" ? l : prefixFor() + stripPrefix(l));
    const insert = out.join("\n");
    if (start === end) {
      const oldLine = lines[0];
      const oldPrefix = oldLine.length - stripPrefix(oldLine).length;
      const newPrefix = out[0].length - stripPrefix(out[0]).length;
      const caret = from + Math.max(newPrefix, start - from - oldPrefix + newPrefix);
      return { from, to, insert, selStart: caret, selEnd: caret };
    }
    return { from, to, insert, selStart: from, selEnd: from + insert.length };
  }
  var FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;
  function fencedBlocks(text) {
    const blocks = [];
    let open = null;
    let pos = 0;
    while (pos <= text.length) {
      let end = text.indexOf("\n", pos);
      if (end === -1) end = text.length;
      const line = text.slice(pos, end);
      if (!open) {
        const m = FENCE_OPEN_RE.exec(line);
        if (m) open = { open: [pos, end], close: null, lang: m[2], fence: m[1] };
      } else {
        const t = line.trim();
        if (t.length >= open.fence.length && t === open.fence[0].repeat(t.length) && /^ {0,3}\S/.test(line)) {
          open.close = [pos, end];
          blocks.push(open);
          open = null;
        }
      }
      if (end === text.length) break;
      pos = end + 1;
    }
    if (open) blocks.push(open);
    return blocks;
  }
  function codeBlockAt(text, pos) {
    return fencedBlocks(text).find((b) => pos >= b.open[0] && pos <= (b.close ? b.close[1] : text.length)) || null;
  }
  function fenceFor(content) {
    const longest = (String(content).match(/`+/g) || []).reduce((n, run) => Math.max(n, run.length), 0);
    return "`".repeat(Math.max(3, longest + 1));
  }
  function toggleCodeBlock(text, start, end, lang) {
    const tag = lang || "";
    const block = codeBlockAt(text, start);
    if (block) {
      const [oStart, oEnd] = block.open;
      if (block.lang === tag) {
        const innerStart = Math.min(oEnd + 1, text.length);
        const innerEnd = block.close ? Math.max(innerStart, block.close[0] - 1) : text.length;
        const to2 = block.close ? block.close[1] : text.length;
        const insert2 = text.slice(innerStart, innerEnd);
        if (start === end) {
          const caret = oStart + Math.min(insert2.length, Math.max(0, start - innerStart));
          return { from: oStart, to: to2, insert: insert2, selStart: caret, selEnd: caret };
        }
        return { from: oStart, to: to2, insert: insert2, selStart: oStart, selEnd: oStart + insert2.length };
      }
      const openLine = text.slice(oStart, oEnd);
      const m = FENCE_OPEN_RE.exec(openLine);
      const insert = openLine.slice(0, m.index + m[0].length - m[2].length) + tag;
      const shift = (p) => p > oEnd ? p + insert.length - openLine.length : Math.min(p, oStart + insert.length);
      return { from: oStart, to: oEnd, insert, selStart: shift(start), selEnd: shift(end) };
    }
    if (start === end) {
      const edit2 = insertBlockLine(text, start, end, "```" + tag + "\n\n```");
      const caret = edit2.from + edit2.insert.indexOf("```") + 3 + tag.length + 1;
      return { ...edit2, selStart: caret, selEnd: caret };
    }
    const from = text.lastIndexOf("\n", start - 1) + 1;
    const lastPos = text[end - 1] === "\n" ? end - 1 : end;
    let to = text.indexOf("\n", lastPos);
    if (to === -1) to = text.length;
    const content = text.slice(from, to);
    const fence = fenceFor(content);
    const edit = insertBlockLine(text, from, to, fence + tag + "\n" + content + "\n" + fence);
    const selStart = edit.from + edit.insert.indexOf(fence) + fence.length + tag.length + 1;
    return { ...edit, selStart, selEnd: selStart + content.length };
  }
  function insertCodeBlock(text, start, end, content, lang) {
    const body = String(content).replace(/\r\n?/g, "\n").replace(/\n+$/, "");
    const fence = fenceFor(body);
    return insertBlockLine(text, start, end, fence + (lang || "") + "\n" + body + "\n" + fence);
  }
  function insertLink(text, start, end) {
    const label = text.slice(start, end);
    if (label === "") {
      const insert2 = "[link text](url)";
      return { from: start, to: end, insert: insert2, selStart: start + 1, selEnd: start + 10 };
    }
    const insert = "[" + label + "](url)";
    const urlAt = start + label.length + 3;
    return { from: start, to: end, insert, selStart: urlAt, selEnd: urlAt + 3 };
  }
  function nextImageRef(text) {
    let n = 0;
    for (const m of text.matchAll(/^\[image-(\d+)\]:/gm)) n = Math.max(n, Number(m[1]));
    return "image-" + (n + 1);
  }
  function insertImageFile(text, start, end, alt, url) {
    const ref = nextImageRef(text);
    const cleanAlt = String(alt || "image").replace(/[\[\]\n]/g, " ").trim() || "image";
    const line = insertBlockLine(text, start, end, "![" + cleanAlt + "][" + ref + "]");
    const withLine = applyEdit(text, line);
    const tail = withLine.replace(/\s+$/, "");
    const full = tail + "\n\n[" + ref + "]: " + url + "\n";
    return { from: start, to: text.length, insert: full.slice(start), selStart: line.selStart, selEnd: line.selEnd };
  }
  function insertImageLink(text, start, end, alt, url) {
    const cleanAlt = String(alt || "image").replace(/[\[\]\n]/g, " ").replace(/\s+/g, " ").trim() || "image";
    const safeUrl = String(url).trim().replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
    return insertBlockLine(text, start, end, "![" + cleanAlt + "](" + safeUrl + ")");
  }
  function insertImageUrl(text, start, end) {
    const line = "![" + (text.slice(start, end).replace(/[\[\]\n]/g, " ").trim() || "image") + "](https://)";
    const edit = insertBlockLine(text, start, end, line);
    const urlAt = edit.from + edit.insert.indexOf("](https://)") + 2;
    return { ...edit, selStart: urlAt, selEnd: urlAt + "https://".length };
  }
  function insertBlockLine(text, start, end, line) {
    const before = text.slice(0, start);
    const after = text.slice(end);
    const prefix = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const suffix = after.length === 0 ? "" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    const insert = prefix + line + suffix;
    const caret = start + insert.length;
    return { from: start, to: end, insert, selStart: caret, selEnd: caret };
  }
  function clampSpaceLines(value) {
    return Math.min(200, Math.max(1, parseInt(value, 10) || 5));
  }
  function applyEdit(text, edit) {
    return text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  }

  // apps/Markdown-to-PDF/src/editor/applyToTextarea.js
  function applyToTextarea(el, edit, setMarkdown) {
    el.focus({ preventScroll: true });
    el.setSelectionRange(edit.from, edit.to);
    let typed = false;
    if (edit.from === edit.to && edit.insert === "") typed = true;
    else {
      try {
        typed = edit.insert === "" ? document.execCommand("delete") : document.execCommand("insertText", false, edit.insert);
      } catch (e) {
        typed = false;
      }
    }
    if (!typed) {
      const savedScrollTop = el.scrollTop;
      ReactDOM.flushSync(() => setMarkdown(applyEdit(el.value, edit)));
      el.scrollTop = savedScrollTop;
    }
    el.setSelectionRange(edit.selStart, edit.selEnd);
  }
  function replaceAllEdit(el, text) {
    return { from: 0, to: el.value.length, insert: text, selStart: 0, selEnd: 0 };
  }

  // apps/Markdown-to-PDF/src/editor/droppedPictures.js
  var DROPPED_EVENT = "md2pdf-dropped-pictures";
  var pending = null;
  function queueDropped(drop) {
    pending = drop;
  }
  function takeDropped() {
    const drop = pending;
    pending = null;
    return drop;
  }

  // apps/Markdown-to-PDF/src/convert/requireGlobal.js
  function requireGlobal(name, featureLabel) {
    if (typeof window[name] === "undefined") {
      throw new Error(
        featureLabel + ' needs the "' + name + '" library, which did not load (this app loads it from a CDN, so it needs internet access the first time). Try again once you are online, or reload the page.'
      );
    }
    return window[name];
  }

  // apps/Markdown-to-PDF/src/convert/htmlToMarkdown.js
  function htmlToMarkdown(html) {
    var TurndownService = requireGlobal("TurndownService", "Document import");
    var td = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced"
    });
    return td.turndown(html || "");
  }

  // apps/Markdown-to-PDF/src/convert/docx.js
  function convertDocxToMarkdown(arrayBuffer) {
    var mammoth = requireGlobal("mammoth", "Word (.docx) import");
    return mammoth.convertToHtml({ arrayBuffer }).then(function(result) {
      return htmlToMarkdown(result.value);
    });
  }

  // apps/Markdown-to-PDF/src/document/markers.js
  var PAGE_BREAK_MARKER = "\\pagebreak";
  var PAGE_BREAK_LINE_RE = /^[ \t]*\\pagebreak[ \t]*$/gm;
  var SPACE_LINE_RE = /^[ \t]*\\space\{[ \t]*(\d+)[ \t]*\}[ \t]*$/gm;
  var MAX_SPACE_LINES = 200;
  var TOC_LINE_RE = /^[ \t]*\\toc[ \t]*$/gm;
  var TOC_SLOT_HTML = '<div class="md2ebook-toc-slot"></div>';
  function applyPageBreakMarkers(markdownText) {
    return String(markdownText).replace(PAGE_BREAK_LINE_RE, '\n\n<div class="md2ebook-pagebreak"></div>\n\n').replace(TOC_LINE_RE, "\n\n" + TOC_SLOT_HTML + "\n\n").replace(SPACE_LINE_RE, function(_, n) {
      var lines = Math.min(MAX_SPACE_LINES, Math.max(1, parseInt(n, 10) || 1));
      return '\n\n<div class="md2ebook-space" data-lines="' + lines + '" style="--md2ebook-space-lines: ' + lines + ';"></div>\n\n';
    });
  }

  // apps/Markdown-to-PDF/src/convert/epub.js
  function convertEpubToMarkdown(arrayBuffer) {
    var JSZip = requireGlobal("JSZip", "EPUB import");
    return JSZip.loadAsync(arrayBuffer).then(function(zip) {
      var containerFile = zip.file("META-INF/container.xml");
      if (!containerFile) {
        throw new Error("This file does not look like a valid EPUB (missing META-INF/container.xml).");
      }
      return containerFile.async("string").then(function(containerXml) {
        var containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
        var rootfileEl = containerDoc.querySelector("rootfile");
        var rootfilePath = rootfileEl ? rootfileEl.getAttribute("full-path") : null;
        if (!rootfilePath) {
          throw new Error("Could not find the EPUB's content file (rootfile) in container.xml.");
        }
        var opfFile = zip.file(rootfilePath);
        if (!opfFile) {
          throw new Error(`The EPUB's content file ("` + rootfilePath + '") is missing from the archive.');
        }
        var opfDir = rootfilePath.indexOf("/") > -1 ? rootfilePath.slice(0, rootfilePath.lastIndexOf("/") + 1) : "";
        return opfFile.async("string").then(function(opfText) {
          var opfDoc = new DOMParser().parseFromString(opfText, "application/xml");
          var manifest = {};
          var manifestItems = opfDoc.querySelectorAll("manifest > item");
          for (var m = 0; m < manifestItems.length; m++) {
            manifest[manifestItems[m].getAttribute("id")] = manifestItems[m].getAttribute("href");
          }
          var spineEls = opfDoc.querySelectorAll("spine > itemref");
          var spinePaths = [];
          for (var s = 0; s < spineEls.length; s++) {
            var href = manifest[spineEls[s].getAttribute("idref")];
            if (href) spinePaths.push(opfDir + href);
          }
          if (spinePaths.length === 0) {
            throw new Error("This EPUB's spine (chapter reading order) is empty or could not be read.");
          }
          var chapterPromises = spinePaths.map(function(path) {
            var file = zip.file(path) || zip.file(decodeURIComponent(path));
            if (!file) return Promise.resolve("");
            return file.async("string").then(function(xhtml) {
              var doc = new DOMParser().parseFromString(xhtml, "text/html");
              return doc.body ? htmlToMarkdown(doc.body.innerHTML).trim() : "";
            });
          });
          return Promise.all(chapterPromises).then(function(chapters) {
            return chapters.filter(Boolean).join("\n\n" + PAGE_BREAK_MARKER + "\n\n");
          });
        });
      });
    });
  }

  // apps/Markdown-to-PDF/src/convert/muse.js
  function convertMuseInline(s) {
    var result = String(s);
    result = result.replace(/\[\[([^\]\[]+)\]\[([^\]\[]+)\]\]/g, "[$2]($1)");
    result = result.replace(/\[\[([^\]\[]+)\]\]/g, "[$1]($1)");
    result = result.replace(/_([^_]+)_/g, "<u>$1</u>");
    result = result.replace(/=([^=]+)=/g, "`$1`");
    return result;
  }
  function convertMuseToMarkdown(museText) {
    var text = String(museText || "").replace(/\r\n?/g, "\n");
    var lines = text.split("\n");
    var out = [];
    var inBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*<(example|verbatim)>\s*$/i.test(line)) {
        inBlock = true;
        out.push("```");
        continue;
      }
      if (/^\s*<\/(example|verbatim)>\s*$/i.test(line)) {
        inBlock = false;
        out.push("```");
        continue;
      }
      if (inBlock) {
        out.push(line);
        continue;
      }
      if (line.trim() === "" || /^#\w+\s/.test(line)) {
        out.push(line);
        continue;
      }
      if (/^-{4,}\s*$/.test(line)) {
        out.push("---");
        continue;
      }
      var headingMatch = line.match(/^(\*{1,5})\s+(.*)$/);
      if (headingMatch) {
        var level = Math.min(headingMatch[1].length, 6);
        out.push(new Array(level + 1).join("#") + " " + convertMuseInline(headingMatch[2]));
        continue;
      }
      var ulMatch = line.match(/^(\s*)-\s+(.*)$/);
      if (ulMatch) {
        out.push(ulMatch[1] + "- " + convertMuseInline(ulMatch[2]));
        continue;
      }
      var olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (olMatch) {
        out.push(olMatch[1] + olMatch[2] + ". " + convertMuseInline(olMatch[3]));
        continue;
      }
      if (/^ {2,}\S/.test(line)) {
        out.push("> " + convertMuseInline(line.trim()));
        continue;
      }
      out.push(convertMuseInline(line));
    }
    return out.join("\n");
  }

  // apps/Markdown-to-PDF/src/editor/importDocument.js
  var DOCUMENT_INPUT_ACCEPT = ".md,.markdown,.txt,.muse,.docx,.epub";
  var DOCUMENT_PICKER_TYPES = {
    description: "Markdown, Word, EPUB, or Muse document",
    accept: {
      "text/markdown": [".md", ".markdown"],
      "text/plain": [".txt"],
      "text/x-muse": [".muse"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/epub+zip": [".epub"]
    }
  };
  async function documentToMarkdown(file) {
    const name = file && file.name || "document";
    const dot = name.lastIndexOf(".");
    const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : "";
    if (ext === "md" || ext === "markdown" || ext === "txt") return file.text();
    if (ext === "muse") return convertMuseToMarkdown(await file.text());
    if (ext === "docx") return convertDocxToMarkdown(await file.arrayBuffer());
    if (ext === "epub") return convertEpubToMarkdown(await file.arrayBuffer());
    throw new Error(`Unsupported file type ".${ext || "?"}" — supported: .md, .txt, .muse, .docx, .epub.`);
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

  // apps/Markdown-to-PDF/src/io/filePickers.js
  async function pickFile({ id, description, accept }) {
    if (typeof window.showOpenFilePicker !== "function") return "fallback";
    try {
      const handles = await window.showOpenFilePicker({ id, multiple: false, types: [{ description, accept }] });
      return await handles[0].getFile();
    } catch (err) {
      if (err && err.name === "AbortError") return null;
      return "fallback";
    }
  }
  async function saveTextFile(text, { id, filename, mimeType, description, extensions }) {
    if (typeof window.showSaveFilePicker !== "function") return downloadText(text, filename, mimeType);
    try {
      const handle = await window.showSaveFilePicker({
        id,
        suggestedName: filename,
        types: [{ description, accept: { [mimeType]: extensions } }]
      });
      await writeTextToHandle(handle, text);
      return { saved: handle.name, handle };
    } catch (err) {
      if (err && err.name === "AbortError") return null;
      return downloadText(text, filename, mimeType);
    }
  }
  async function writeTextToHandle(handle, text) {
    if (handle.queryPermission && await handle.queryPermission({ mode: "readwrite" }) !== "granted") {
      if (await handle.requestPermission({ mode: "readwrite" }) !== "granted") {
        throw new Error("The browser didn't allow writing to that file.");
      }
    }
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }
  function downloadText(text, filename, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    downloadBlob(blob, filename);
    return { downloaded: filename };
  }
  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("The browser blocked the copy.");
  }

  // apps/Markdown-to-PDF/src/document/highlight.js
  function unescapeHtml(s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  }
  function highlightCodeBlocks(html) {
    const Prism = typeof window !== "undefined" ? window.Prism : null;
    if (!Prism || typeof Prism.highlight !== "function" || !Prism.languages) return html;
    return html.replace(/<pre><code class="language-([^"\s]+)">([\s\S]*?)<\/code><\/pre>/g, (all, lang, body) => {
      const key = lang.toLowerCase();
      const grammar = Prism.languages[key];
      if (!grammar || typeof grammar !== "object") return all;
      try {
        const out = Prism.highlight(unescapeHtml(body), grammar, key);
        return '<pre class="md2ebook-code-hl"><code class="language-' + lang + '">' + out + "</code></pre>";
      } catch (e) {
        return all;
      }
    });
  }
  function highlightCss() {
    return "    .page pre.md2ebook-code-hl .token.comment, .page pre.md2ebook-code-hl .token.prolog, .page pre.md2ebook-code-hl .token.doctype, .page pre.md2ebook-code-hl .token.cdata { color: #94a3b8; font-style: italic; }\n    .page pre.md2ebook-code-hl .token.punctuation { color: #cbd5e1; }\n    .page pre.md2ebook-code-hl .token.property, .page pre.md2ebook-code-hl .token.tag, .page pre.md2ebook-code-hl .token.selector, .page pre.md2ebook-code-hl .token.cell, .page pre.md2ebook-code-hl .token.range, .page pre.md2ebook-code-hl .token.reference { color: #7dd3fc; }\n    .page pre.md2ebook-code-hl .token.string, .page pre.md2ebook-code-hl .token.char, .page pre.md2ebook-code-hl .token.attr-value, .page pre.md2ebook-code-hl .token.inserted { color: #86efac; }\n    .page pre.md2ebook-code-hl .token.number, .page pre.md2ebook-code-hl .token.boolean, .page pre.md2ebook-code-hl .token.constant, .page pre.md2ebook-code-hl .token.symbol { color: #fdba74; }\n    .page pre.md2ebook-code-hl .token.keyword, .page pre.md2ebook-code-hl .token.atrule, .page pre.md2ebook-code-hl .token.important, .page pre.md2ebook-code-hl .token.builtin { color: #c4b5fd; }\n    .page pre.md2ebook-code-hl .token.function, .page pre.md2ebook-code-hl .token.function-name, .page pre.md2ebook-code-hl .token.class-name, .page pre.md2ebook-code-hl .token.attr-name { color: #fde68a; }\n    .page pre.md2ebook-code-hl .token.operator, .page pre.md2ebook-code-hl .token.entity, .page pre.md2ebook-code-hl .token.url, .page pre.md2ebook-code-hl .token.delimiter, .page pre.md2ebook-code-hl .token.filter { color: #f0abfc; }\n    .page pre.md2ebook-code-hl .token.variable, .page pre.md2ebook-code-hl .token.regex, .page pre.md2ebook-code-hl .token.deleted { color: #fca5a5; }\n    .page pre.md2ebook-code-hl .token.bold { font-weight: bold; }\n    .page pre.md2ebook-code-hl .token.italic { font-style: italic; }\n    .page pre.md2ebook-code-hl { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n";
  }

  // apps/Markdown-to-PDF/src/document/html.js
  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slugify(text) {
    var s = String(text).replace(/&[a-z0-9#]+;/gi, " ").toLowerCase().trim();
    try {
      s = s.replace(/[^\p{L}\p{N}]+/gu, "-");
    } catch (e) {
      s = s.replace(/[^a-z0-9\u00c0-\uffff]+/g, "-");
    }
    return s.replace(/^-+|-+$/g, "").slice(0, 60);
  }

  // apps/Markdown-to-PDF/src/document/styleBlock.js
  function headingRule(on) {
    return on ? "      border-bottom: 2px solid #e2e8f0;\n      padding-bottom: 0.3em;\n" : "      border-bottom: none;\n      padding-bottom: 0;\n";
  }
  function generateStyleBlock(normalized, paper) {
    var vars = [
      "--md2ebook-font-family: " + normalized.fontStack + ";",
      "--md2ebook-heading-font-family: " + normalized.headingFontStack + ";",
      "--md2ebook-text-align: " + normalized.textAlign + ";",
      "--md2ebook-h1-text-align: " + normalized.h1TextAlign + ";",
      "--md2ebook-h2-text-align: " + normalized.h2TextAlign + ";",
      "--md2ebook-h3-text-align: " + normalized.h3TextAlign + ";",
      "--md2ebook-font-size: " + normalized.fontSize + "px;",
      "--md2ebook-line-height: " + normalized.lineHeight + ";",
      "--md2ebook-paragraph-spacing: " + normalized.paragraphSpacing + ";",
      "--md2ebook-h1-size: " + normalized.h1Size + "px;",
      "--md2ebook-h1-weight: " + normalized.h1Weight + ";",
      "--md2ebook-h2-size: " + normalized.h2Size + "px;",
      "--md2ebook-h2-weight: " + normalized.h2Weight + ";",
      "--md2ebook-h3-size: " + normalized.h3Size + "px;",
      "--md2ebook-h3-weight: " + normalized.h3Weight + ";",
      "--md2ebook-h1-line-height: " + normalized.h1LineHeight + ";",
      "--md2ebook-h2-line-height: " + normalized.h2LineHeight + ";",
      "--md2ebook-h3-line-height: " + normalized.h3LineHeight + ";",
      "--md2ebook-base-weight: " + normalized.baseWeight + ";",
      "--md2ebook-bold-weight: " + normalized.boldWeight + ";",
      "--md2ebook-page-width: " + paper.widthIn + "in;",
      "--md2ebook-page-height: " + paper.heightIn + "in;",
      "--md2ebook-page-margin-vertical: " + normalized.marginVerticalIn + "in;",
      "--md2ebook-page-margin-horizontal: " + normalized.marginHorizontalIn + "in;"
    ].join("\n      ");
    return "\n    :root {\n      " + vars + "\n    }\n\n    * { box-sizing: border-box; }\n\n    html, body {\n      margin: 0;\n      padding: 0;\n      background: transparent;\n    }\n\n    body {\n      display: flex;\n      justify-content: center;\n    }\n\n    .page {\n      box-sizing: border-box;\n      width: var(--md2ebook-page-width);\n      min-height: var(--md2ebook-page-height);\n      padding: var(--md2ebook-page-margin-vertical) var(--md2ebook-page-margin-horizontal);\n      background: #ffffff;\n      -webkit-print-color-adjust: exact;\n      print-color-adjust: exact;\n      font-family: var(--md2ebook-font-family);\n      font-size: var(--md2ebook-font-size);\n      line-height: var(--md2ebook-line-height);\n      font-weight: var(--md2ebook-base-weight);\n      text-align: var(--md2ebook-text-align);\n      color: #1a1a1a;\n      -webkit-font-smoothing: antialiased;\n    }\n\n    .page p, .page li, .page blockquote { hyphens: none; -webkit-hyphens: none; }\n\n    .page > *:first-child { margin-top: 0; }\n    .page > *:last-child { margin-bottom: 0; }\n\n    .page h1, .page h2, .page h3, .page h4, .page h5, .page h6 {\n      font-family: var(--md2ebook-heading-font-family);\n      text-align: var(--md2ebook-h3-text-align);\n      page-break-after: avoid;\n      break-after: avoid;\n      margin-top: 1.4em;\n      margin-bottom: 0.6em;\n    }\n\n    .page h1 {\n      font-size: var(--md2ebook-h1-size);\n      font-weight: var(--md2ebook-h1-weight);\n      text-align: var(--md2ebook-h1-text-align);\n      line-height: var(--md2ebook-h1-line-height);\n" + headingRule(normalized.h1Underline) + "    }\n\n    .page h2 {\n      font-size: var(--md2ebook-h2-size);\n      font-weight: var(--md2ebook-h2-weight);\n      text-align: var(--md2ebook-h2-text-align);\n      line-height: var(--md2ebook-h2-line-height);\n" + headingRule(normalized.h2Underline) + "    }\n\n    .page h3 {\n      font-size: var(--md2ebook-h3-size);\n      font-weight: var(--md2ebook-h3-weight);\n      line-height: var(--md2ebook-h3-line-height);\n" + headingRule(normalized.h3Underline) + "    }\n\n    .page h4 { font-size: calc(var(--md2ebook-h3-size) * 0.9); font-weight: var(--md2ebook-h3-weight); }\n\n    .page p {\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      orphans: 3;\n      widows: 3;\n    }\n\n    .page strong, .page b {\n      font-weight: var(--md2ebook-bold-weight);\n    }\n\n    .page em, .page i { font-style: italic; }\n\n    .page a {\n      color: #2563eb;\n      text-decoration: underline;\n      word-break: break-word;\n    }\n\n    .page ul, .page ol {\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      padding-left: 1.6em;\n    }\n\n    .page li { margin-bottom: 0.35em; }\n    .page li > ul, .page li > ol { margin-top: 0.35em; margin-bottom: 0; }\n\n    .page hr {\n      border: none;\n      border-top: 1px solid #cbd5e1;\n      margin: 2em 0;\n    }\n\n    .page blockquote {\n      margin: calc(var(--md2ebook-font-size) * var(--md2ebook-line-height)) 0;\n      padding: 0.6em 1.2em;\n      border-left: 4px solid #94a3b8;\n      background: #f8fafc;\n      color: #475569;\n      font-style: italic;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .page blockquote p:last-child { margin-bottom: 0; }\n\n    .page code {\n      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n      font-size: 0.88em;\n      background: #f1f5f9;\n      border: 1px solid #e2e8f0;\n      border-radius: 4px;\n      padding: 0.12em 0.4em;\n    }\n\n    .page pre {\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      padding: 1em 1.2em;\n      background: #0f172a;\n      color: #e2e8f0;\n      border-radius: 8px;\n      white-space: pre-wrap;\n      overflow-wrap: anywhere;\n      text-align: left;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .page pre code {\n      background: transparent;\n      border: none;\n      padding: 0;\n      font-size: 0.85em;\n      color: inherit;\n      line-height: 1.55;\n    }\n\n" + (normalized.codeHighlight ? highlightCss() + "\n" : "") + "    .page table {\n      width: 100%;\n      border-collapse: collapse;\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      font-size: 0.92em;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .page th, .page td {\n      border: 1px solid #cbd5e1;\n      padding: 0.5em 0.75em;\n      text-align: left;\n      vertical-align: top;\n    }\n\n    .page th {\n      background: #f1f5f9;\n      font-weight: var(--md2ebook-bold-weight);\n    }\n\n    .page tr:nth-child(even) td { background: #f8fafc; }\n\n    .page img {\n      max-width: 100%;\n      height: auto;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .md2ebook-toc { margin: 0 0 var(--md2ebook-paragraph-spacing) 0; text-align: left; }\n    .md2ebook-toc.md2ebook-toc-break { page-break-after: always; break-after: page; }\n    .md2ebook-toc-title {\n      font-family: var(--md2ebook-heading-font-family);\n      font-size: var(--md2ebook-h2-size);\n      font-weight: var(--md2ebook-h2-weight);\n      text-align: " + (normalized.tocTitleAlign || "var(--md2ebook-h2-text-align)") + ";\n      line-height: 1.3;\n      margin: 0 0 0.8em 0;\n    }\n    .md2ebook-toc ol { list-style: none; margin: 0; padding: 0; }\n    .md2ebook-toc li { margin: 0 0 0.35em 0; break-inside: avoid; page-break-inside: avoid; }\n" + normalized.tocLevelStyles.map(function(st, i) {
      var sel = "    .md2ebook-toc li.md2ebook-toc-l" + (i + 1);
      return sel + " { font-weight: " + (st.bold ? "var(--md2ebook-bold-weight)" : "var(--md2ebook-base-weight)") + "; font-style: " + (st.italic ? "italic" : "normal") + ";" + (st.size ? " font-size: " + st.size + "px;" : "") + (st.lineHeight ? " line-height: " + st.lineHeight + ";" : "") + " }\n" + (st.underline ? sel + " .md2ebook-toc-text { text-decoration: underline; text-underline-offset: 0.15em; }\n" : "");
    }).join("") + "    .md2ebook-toc li.md2ebook-toc-l1:not(:first-child) { margin-top: 0.6em; }\n    .md2ebook-toc li.md2ebook-toc-l2 { padding-left: 1.4em; }\n    .md2ebook-toc li.md2ebook-toc-l3 { padding-left: 2.8em; }\n    .page .md2ebook-toc a { display: flex; align-items: baseline; color: inherit; text-decoration: none; word-break: normal; }\n    .md2ebook-toc-text { flex: 0 1 auto; }\n    .md2ebook-toc-leader { flex: 1 1 auto; min-width: 1em; margin: 0 0.4em; }\n    .md2ebook-toc-dots .md2ebook-toc-leader { border-bottom: 1.5px dotted #94a3b8; transform: translateY(-0.3em); }\n    .md2ebook-toc-num { flex: 0 0 auto; min-width: 1.8em; text-align: right; font-variant-numeric: tabular-nums; }\n\n    .md2ebook-space {\n      display: block;\n      height: calc(var(--md2ebook-font-size) * var(--md2ebook-line-height) * var(--md2ebook-space-lines, 1));\n      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n      padding: 0;\n      border: 0;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n\n    .md2ebook-pagebreak {\n      height: 0;\n      margin: 0;\n      padding: 0;\n      border: 0;\n      page-break-before: always;\n      break-before: page;\n    }\n\n    @media print {\n      html, body { background: #ffffff; }\n      .page { box-shadow: none; }\n      .page h1, .page h2, .page h3 { page-break-after: avoid; break-after: avoid; }\n      .page pre, .page blockquote, .page table, .page img { page-break-inside: avoid; break-inside: avoid; }\n      .md2ebook-pagebreak { page-break-before: always; break-before: page; }\n    }\n";
  }
  function paginationJustifyFix() {
    return ".pagedjs_page_content [data-align-last-split-element='justify'] {\n  text-align-last: auto;\n}\n.pagedjs_page_content p[data-align-last-split-element='justify'],\n.pagedjs_page_content li[data-align-last-split-element='justify'] {\n  text-align-last: justify;\n}\n";
  }
  function buildPageBoxRule(parts) {
    var pageNumbers = buildPageNumberCss(parts.normalized);
    return "\n@page {\n  size: " + parts.paper.widthIn + "in " + parts.paper.heightIn + "in;\n  margin: " + parts.normalized.marginVerticalIn + "in " + parts.normalized.marginHorizontalIn + "in;\n" + pageNumbers.marginBox + "}\n" + pageNumbers.rootReset + pageNumbers.overrideRule + ".page {\n  width: 100%;\n  min-height: 0;\n  padding: 0;\n  box-shadow: none;\n}\nhtml, body {\n  background: transparent !important;\n}\n.pagedjs_page {\n  background: #ffffff !important;\n  margin-bottom: 24px !important;\n  border-bottom: 3px solid #4b4b4b !important;\n}\n" + paginationJustifyFix();
  }
  function buildPageNumberCss(normalized) {
    if (!normalized.pageNumbersEnabled) return { marginBox: "", rootReset: "", overrideRule: "" };
    return {
      marginBox: "  @bottom-center {\n    content: counter(page);\n    font-family: " + normalized.fontStack + ";\n    font-size: 10pt;\n    color: #6b7280;\n  }\n",
      rootReset: "html { counter-reset: page " + (normalized.pageStartFrom - 1) + "; }\n",
      // Only consumed by the live preview (buildPageBoxRule) — see the
      // pagination script in renderHtmlDocument for what actually sets
      // the data-md2ebook-pagenum attribute this targets. Harmless if
      // ever included elsewhere: with no matching attribute present,
      // this rule simply never matches anything.
      overrideRule: ".pagedjs_margin-content[data-md2ebook-pagenum]::after {\n  content: attr(data-md2ebook-pagenum) !important;\n}\n"
    };
  }

  // apps/Markdown-to-PDF/src/document/toc.js
  function applyToc(bodyHtml, normalized, tocPages) {
    if (bodyHtml.indexOf(TOC_SLOT_HTML) === -1) return bodyHtml;
    var used = {};
    var entries = [];
    var html = bodyHtml.replace(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, function(whole, level, attrs, inner) {
      attrs = attrs || "";
      var text = inner.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      var idMatch = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs);
      var id;
      if (idMatch) {
        id = idMatch[1];
      } else {
        var base = "h-" + (slugify(text) || "section");
        id = base;
        for (var n = 2; used[id]; n++) id = base + "-" + n;
        attrs = ' id="' + id + '"' + attrs;
      }
      used[id] = true;
      if (Number(level) <= normalized.tocLevels && text) {
        entries.push({ level: Number(level), id, text });
      }
      return "<h" + level + attrs + ">" + inner + "</h" + level + ">";
    });
    var items = entries.map(function(e) {
      var num = normalized.tocPageNumbers && tocPages && tocPages[e.id] != null ? String(tocPages[e.id]) : "";
      return '<li class="md2ebook-toc-l' + e.level + '"><a href="#' + e.id + '" data-toc-target="' + e.id + '"><span class="md2ebook-toc-text">' + e.text + "</span>" + (normalized.tocPageNumbers ? '<span class="md2ebook-toc-leader"></span><span class="md2ebook-toc-num">' + num + "</span>" : "") + "</a></li>";
    }).join("");
    var cls = "md2ebook-toc" + (normalized.tocPageNumbers && normalized.tocDotLeaders ? " md2ebook-toc-dots" : "") + (normalized.tocPageBreakAfter ? " md2ebook-toc-break" : "");
    var tocHtml = '<nav class="' + cls + '">' + (normalized.tocShowTitle && normalized.tocTitle ? '<p class="md2ebook-toc-title">' + escapeHtml(normalized.tocTitle) + "</p>" : "") + "<ol>" + (items || "<li><em>No headings yet.</em></li>") + "</ol></nav>";
    return html.split(TOC_SLOT_HTML).join(tocHtml);
  }
  function tocFillScript(normalized) {
    var start = normalized.pageNumbersEnabled ? normalized.pageStartFrom : 1;
    return '      var __tocPages = {};\n      try {\n        var __pgs = Array.prototype.slice.call(document.querySelectorAll(".pagedjs_page"));\n        var __links = document.querySelectorAll(".md2ebook-toc a[data-toc-target]");\n        for (var __k = 0; __k < __links.length; __k++) {\n          var __id = __links[__k].getAttribute("data-toc-target");\n          var __t = document.getElementById(__id);\n          var __p = __t && __t.closest(".pagedjs_page");\n          if (!__p) continue;\n          var __n = ' + start + ' + __pgs.indexOf(__p);\n          __tocPages[__id] = __n;\n          var __s = __links[__k].querySelector(".md2ebook-toc-num");\n          if (__s) __s.textContent = String(__n);\n        }\n      } catch (e) {}\n';
  }

  // apps/Markdown-to-PDF/src/settings/defaults.js
  var PAPER_SIZES = {
    a4: {
      key: "a4",
      label: 'A4 (8.27" x 11.69")',
      widthIn: 8.27,
      heightIn: 11.69,
      jsPdfFormat: "a4"
    },
    a5: {
      key: "a5",
      label: 'A5 (5.83" x 8.27")',
      widthIn: 5.83,
      heightIn: 8.27,
      jsPdfFormat: "a5"
    },
    letter: {
      key: "letter",
      label: 'US Letter (8.5" x 11")',
      widthIn: 8.5,
      heightIn: 11,
      jsPdfFormat: "letter"
    },
    tabloid: {
      key: "tabloid",
      label: '11" x 17" (Tabloid)',
      widthIn: 11,
      heightIn: 17,
      jsPdfFormat: "tabloid"
    }
  };
  var DEFAULT_PAPER_KEY = "a5";
  var HARDCODED_FALLBACK_DEFAULTS = {
    fontFamily: "Inter",
    // Heading typeface: when headingFontSameAsBody is true (or
    // headingFontFamily is blank), headings use the body fontFamily.
    headingFontSameAsBody: true,
    headingFontFamily: "",
    paperSize: DEFAULT_PAPER_KEY,
    fontSize: 13.33,
    // px (= 10pt, the Anarchist Library / Amusewiki default for A5 zine pages)
    lineHeight: 1.6,
    // unitless
    paragraphSpacing: 16,
    // px (bottom margin on <p>)
    textAlign: "left",
    // body text: left | center | right | justify
    // Per-heading alignment: blank = same as body text, or
    // left | center | right | justify. H4–H6 follow H3.
    h1TextAlign: "",
    h2TextAlign: "",
    h3TextAlign: "",
    h1Size: 28,
    // px
    h1Weight: 700,
    h2Size: 22,
    // px
    h2Weight: 600,
    h3Size: 18,
    // px
    h3Weight: 600,
    // Per-level heading line height (unitless) and the rule drawn
    // beneath the heading. H4–H6 are unaffected by these.
    h1LineHeight: 1.25,
    h2LineHeight: 1.3,
    h3LineHeight: 1.35,
    h1Underline: true,
    h2Underline: false,
    h3Underline: false,
    baseWeight: 400,
    // regular body text weight
    boldWeight: 700,
    // <strong>/<b> weight
    marginVerticalIn: 0.75,
    // page margin, top/bottom, inches
    marginHorizontalIn: 0.75,
    // page margin, left/right, inches
    // Table of contents (placed wherever a `\toc` line appears)
    tocLevels: 3,
    // include H1..H{tocLevels}
    tocShowTitle: true,
    tocTitle: "Contents",
    tocTitleAlign: "",
    // blank = same as H2
    // Per-level ToC entry style. Size (px) / line height blank = body text's.
    tocL1Bold: true,
    tocL1Italic: false,
    tocL1Underline: false,
    tocL1Size: "",
    tocL1LineHeight: "",
    tocL2Bold: false,
    tocL2Italic: false,
    tocL2Underline: false,
    tocL2Size: "",
    tocL2LineHeight: "",
    tocL3Bold: false,
    tocL3Italic: false,
    tocL3Underline: false,
    tocL3Size: "",
    tocL3LineHeight: "",
    tocPageNumbers: true,
    tocDotLeaders: true,
    tocPageBreakAfter: true,
    codeHighlight: true,
    // colour code blocks by their language (```json …) — document/highlight.js
    pageNumbersEnabled: false,
    // show a page number at the bottom-center of every page
    pageStartFrom: 1
    // the number shown on the first page when page numbers are on
  };
  var DEFAULTS = Object.assign({}, HARDCODED_FALLBACK_DEFAULTS, window.MD2eBookDefaultConfig || {});
  var ALLOWED_BOLD_WEIGHTS = [600, 700, 800, 900];
  var TEXT_ALIGN_OPTIONS = [
    { key: "left", label: "Left" },
    { key: "center", label: "Center" },
    { key: "right", label: "Right" },
    { key: "justify", label: "Justify" }
  ];
  var ALLOWED_TEXT_ALIGNS = TEXT_ALIGN_OPTIONS.map(function(o) {
    return o.key;
  });
  var WEB_SAFE_GOOGLE_FONTS = {
    Inter: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    Merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
    "JetBrains Mono": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
  };
  var SYSTEM_FONT_STACKS = {
    Georgia: "Georgia, 'Times New Roman', serif",
    Garamond: "Garamond, 'Apple Garamond', 'Times New Roman', serif",
    Arial: "Arial, Helvetica, sans-serif",
    "Times New Roman": "'Times New Roman', Times, serif"
  };
  var FONT_STACKS = Object.assign({}, WEB_SAFE_GOOGLE_FONTS, SYSTEM_FONT_STACKS);
  function fontStackFor(family) {
    return FONT_STACKS[family] || "'" + family + "', ui-sans-serif, system-ui, sans-serif";
  }

  // apps/Markdown-to-PDF/src/settings/normalizeConfig.js
  function isBlank(value) {
    return value === void 0 || value === null || typeof value === "string" && value.trim() === "";
  }
  function toNumber(value, fallback) {
    if (isBlank(value)) return fallback;
    var n = typeof value === "number" ? value : parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function toPositiveNumber(value, fallback) {
    var n = toNumber(value, fallback);
    return n > 0 ? n : fallback;
  }
  function toPositiveInteger(value, fallback) {
    var n = toPositiveNumber(value, fallback);
    return Math.round(n);
  }
  function toCssLength(value, fallback, bareUnit) {
    if (isBlank(value)) return fallback;
    var str = String(value).trim();
    if (/^-?\d*\.?\d+$/.test(str)) {
      return str + (bareUnit || "rem");
    }
    if (/^-?\d*\.?\d+(px|rem|em|in|cm|mm|pt|%)$/.test(str)) {
      return str;
    }
    return fallback;
  }
  function toBoldWeight(value, fallback) {
    var n = toNumber(value, fallback);
    if (ALLOWED_BOLD_WEIGHTS.indexOf(n) !== -1) return n;
    var closest = ALLOWED_BOLD_WEIGHTS[0];
    var closestDiff = Math.abs(n - closest);
    for (var i = 1; i < ALLOWED_BOLD_WEIGHTS.length; i++) {
      var diff = Math.abs(n - ALLOWED_BOLD_WEIGHTS[i]);
      if (diff < closestDiff) {
        closest = ALLOWED_BOLD_WEIGHTS[i];
        closestDiff = diff;
      }
    }
    return closest;
  }
  function toMarginInches(value, fallback) {
    if (isBlank(value)) return fallback;
    var str = String(value).trim();
    var bare = parseFloat(str);
    if (!Number.isFinite(bare)) return fallback;
    if (/mm$/i.test(str)) return bare / 25.4;
    if (/cm$/i.test(str)) return bare / 2.54;
    if (/pt$/i.test(str)) return bare / 72;
    return bare > 0 ? bare : fallback;
  }
  function toTextAlign(value, fallback) {
    if (isBlank(value)) return fallback;
    var v = String(value).trim().toLowerCase();
    return ALLOWED_TEXT_ALIGNS.indexOf(v) !== -1 ? v : fallback;
  }
  function toBoolean(value, fallback) {
    if (isBlank(value)) return Boolean(fallback);
    if (typeof value === "string") return !/^(false|0|no|off)$/i.test(value.trim());
    return Boolean(value);
  }
  function normalizeConfig(config) {
    config = config || {};
    var paperKey = PAPER_SIZES.hasOwnProperty(config.paperSize) ? config.paperSize : DEFAULT_PAPER_KEY;
    var fontFamilyRaw = isBlank(config.fontFamily) ? DEFAULTS.fontFamily : String(config.fontFamily).trim();
    var headingSameAsBody = toBoolean(config.headingFontSameAsBody, DEFAULTS.headingFontSameAsBody);
    var headingFontRaw = isBlank(config.headingFontFamily) ? DEFAULTS.headingFontFamily : config.headingFontFamily;
    var headingFontFamily = headingSameAsBody || isBlank(headingFontRaw) ? fontFamilyRaw : String(headingFontRaw).trim();
    var textAlign = toTextAlign(config.textAlign, toTextAlign(DEFAULTS.textAlign, "left"));
    var legacyHeadingAlign = toTextAlign(config.headingTextAlign, textAlign);
    return {
      fontFamily: fontFamilyRaw,
      fontStack: fontStackFor(fontFamilyRaw),
      headingFontFamily,
      headingFontStack: fontStackFor(headingFontFamily),
      paperSize: paperKey,
      textAlign,
      h1TextAlign: toTextAlign(config.h1TextAlign, toTextAlign(DEFAULTS.h1TextAlign, legacyHeadingAlign)),
      h2TextAlign: toTextAlign(config.h2TextAlign, toTextAlign(DEFAULTS.h2TextAlign, legacyHeadingAlign)),
      h3TextAlign: toTextAlign(config.h3TextAlign, toTextAlign(DEFAULTS.h3TextAlign, legacyHeadingAlign)),
      fontSize: toPositiveNumber(config.fontSize, DEFAULTS.fontSize),
      lineHeight: toPositiveNumber(config.lineHeight, DEFAULTS.lineHeight),
      paragraphSpacing: toCssLength(config.paragraphSpacing, DEFAULTS.paragraphSpacing + "px", "px"),
      h1Size: toPositiveNumber(config.h1Size, DEFAULTS.h1Size),
      h1Weight: toNumber(config.h1Weight, DEFAULTS.h1Weight),
      h2Size: toPositiveNumber(config.h2Size, DEFAULTS.h2Size),
      h2Weight: toNumber(config.h2Weight, DEFAULTS.h2Weight),
      h3Size: toPositiveNumber(config.h3Size, DEFAULTS.h3Size),
      h3Weight: toNumber(config.h3Weight, DEFAULTS.h3Weight),
      h1LineHeight: toPositiveNumber(config.h1LineHeight, DEFAULTS.h1LineHeight),
      h2LineHeight: toPositiveNumber(config.h2LineHeight, DEFAULTS.h2LineHeight),
      h3LineHeight: toPositiveNumber(config.h3LineHeight, DEFAULTS.h3LineHeight),
      h1Underline: toBoolean(config.h1Underline, DEFAULTS.h1Underline),
      h2Underline: toBoolean(config.h2Underline, DEFAULTS.h2Underline),
      h3Underline: toBoolean(config.h3Underline, DEFAULTS.h3Underline),
      baseWeight: toNumber(config.baseWeight, DEFAULTS.baseWeight),
      boldWeight: toBoldWeight(config.boldWeight, DEFAULTS.boldWeight),
      // Page margin, split into a vertical (top/bottom) and horizontal
      // (left/right) component so they can be set independently. Each
      // accepts a bare number (assumed inches) or a string with a unit
      // suffix ("0.75in", "20mm", "2cm", "54pt"), and falls back
      // independently if left blank.
      marginVerticalIn: toMarginInches(config.marginVertical, DEFAULTS.marginVerticalIn),
      marginHorizontalIn: toMarginInches(config.marginHorizontal, DEFAULTS.marginHorizontalIn),
      // Page numbers: a plain boolean toggle, and the number shown on
      // the first page (subsequent pages count up from it). Any
      // truthy, non-boolean value loaded from a hand-edited config
      // file (e.g. "true" as a string) is coerced the same way a
      // checkbox's own state would be.
      tocLevels: Math.min(3, Math.max(1, Math.round(toNumber(config.tocLevels, DEFAULTS.tocLevels)) || 3)),
      tocShowTitle: toBoolean(config.tocShowTitle, DEFAULTS.tocShowTitle),
      tocTitle: isBlank(config.tocTitle) ? String(DEFAULTS.tocTitle || "Contents") : String(config.tocTitle).trim(),
      tocTitleAlign: toTextAlign(config.tocTitleAlign, toTextAlign(DEFAULTS.tocTitleAlign, "")),
      tocLevelStyles: [1, 2, 3].map(function(n) {
        var k = "tocL" + n;
        return {
          bold: toBoolean(config[k + "Bold"], DEFAULTS[k + "Bold"]),
          italic: toBoolean(config[k + "Italic"], DEFAULTS[k + "Italic"]),
          underline: toBoolean(config[k + "Underline"], DEFAULTS[k + "Underline"]),
          size: toPositiveNumber(config[k + "Size"], toPositiveNumber(DEFAULTS[k + "Size"], null)),
          lineHeight: toPositiveNumber(config[k + "LineHeight"], toPositiveNumber(DEFAULTS[k + "LineHeight"], null))
        };
      }),
      tocPageNumbers: toBoolean(config.tocPageNumbers, DEFAULTS.tocPageNumbers),
      tocDotLeaders: toBoolean(config.tocDotLeaders, DEFAULTS.tocDotLeaders),
      tocPageBreakAfter: toBoolean(config.tocPageBreakAfter, DEFAULTS.tocPageBreakAfter),
      codeHighlight: toBoolean(config.codeHighlight, DEFAULTS.codeHighlight),
      pageNumbersEnabled: Boolean(
        isBlank(config.pageNumbersEnabled) ? DEFAULTS.pageNumbersEnabled : config.pageNumbersEnabled
      ),
      pageStartFrom: toPositiveInteger(config.pageStartFrom, DEFAULTS.pageStartFrom),
      filename: isBlank(config.filename) ? "md-to-pdf-converter.pdf" : String(config.filename).trim()
    };
  }

  // apps/Markdown-to-PDF/src/document/buildDocument.js
  function buildDocumentParts(markdownText, config, options) {
    var normalized = normalizeConfig(config);
    var paper = PAPER_SIZES[normalized.paperSize] || PAPER_SIZES[DEFAULT_PAPER_KEY];
    var styleText = generateStyleBlock(normalized, paper);
    var bodyHtml = "";
    if (typeof window.marked !== "undefined") {
      var markedFn = typeof window.marked.parse === "function" ? window.marked.parse : window.marked;
      try {
        if (window.marked.setOptions) {
          window.marked.setOptions({ breaks: false, gfm: true });
        }
      } catch (e) {
      }
      bodyHtml = markedFn(applyPageBreakMarkers(markdownText || ""));
      bodyHtml = applyToc(bodyHtml, normalized, options && options.tocPages);
      if (normalized.codeHighlight) bodyHtml = highlightCodeBlocks(bodyHtml);
    } else {
      bodyHtml = "<pre>" + escapeHtml(markdownText || "") + "</pre>";
    }
    return {
      normalized,
      paper,
      styleText,
      bodyHtml
    };
  }

  // apps/Markdown-to-PDF/src/document/fonts.js
  function fontLinkTags(normalized) {
    var tags = googleFontLinkTag(normalized.fontFamily);
    if (normalized.headingFontFamily !== normalized.fontFamily) {
      tags += googleFontLinkTag(normalized.headingFontFamily, true);
    }
    return tags;
  }
  function googleFontLinkTag(fontFamily, skipPreconnect) {
    if (WEB_SAFE_GOOGLE_FONTS.hasOwnProperty(fontFamily)) {
      var family = fontFamily.replace(/ /g, "+");
      return (skipPreconnect ? "" : '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>') + '<link href="https://fonts.googleapis.com/css2?family=' + family + ':wght@400;600;700;800;900&display=swap" rel="stylesheet">';
    }
    return "";
  }

  // apps/Markdown-to-PDF/src/export/printExport.js
  function exportToPdf(markdownText, config, options) {
    return new Promise(function(resolve, reject) {
      var parts;
      try {
        parts = buildDocumentParts(markdownText, config, options);
      } catch (err) {
        reject(err);
        return;
      }
      var docTitle = parts.normalized.filename.replace(/\.pdf$/i, "") || "Md to PDF Converter";
      var pageNumbers = buildPageNumberCss(parts.normalized);
      var printOnlyCss = "\n@page {\n  size: " + parts.paper.widthIn + "in " + parts.paper.heightIn + "in;\n  margin: " + parts.normalized.marginVerticalIn + "in " + parts.normalized.marginHorizontalIn + "in;\n" + // 2-value shorthand: vertical (top/bottom), then horizontal (left/right)
      pageNumbers.marginBox + "}\n" + pageNumbers.rootReset + "@media print {\n  html, body { margin: 0; padding: 0; background: #ffffff; }\n  .page {\n    width: 100%;\n    min-height: 0;\n    padding: 0;\n    box-shadow: none;\n  }\n}\n";
      var printDoc = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>' + escapeHtml(docTitle) + "</title>\n" + fontLinkTags(parts.normalized) + "\n<style>" + parts.styleText + printOnlyCss + '</style>\n</head>\n<body>\n<div class="page md2ebook-doc">' + parts.bodyHtml + "</div>\n</body>\n</html>";
      var iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      var settled = false;
      var cleanupTimer = null;
      function cleanup() {
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
          cleanupTimer = null;
        }
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }
      function settleResolve() {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      }
      function settleReject(err) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      }
      iframe.onload = function() {
        var win;
        try {
          win = iframe.contentWindow;
          if (!win) throw new Error("Could not access the print preview frame.");
        } catch (err) {
          settleReject(err);
          return;
        }
        var doc = iframe.contentDocument;
        var fontsReady = doc && doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
        fontsReady.catch(function() {
        }).then(function() {
          setTimeout(function() {
            try {
              let onAfterPrint = function() {
                win.removeEventListener("afterprint", onAfterPrint);
                settleResolve();
              };
              win.addEventListener("afterprint", onAfterPrint);
              win.focus();
              win.print();
              cleanupTimer = setTimeout(settleResolve, 6e4);
            } catch (err) {
              settleReject(err);
            }
          }, 150);
        });
      };
      iframe.onerror = function() {
        settleReject(new Error("The print preview frame failed to load."));
      };
      document.body.appendChild(iframe);
      iframe.srcdoc = printDoc;
    });
  }

  // apps/Markdown-to-PDF/src/export/rasterDocument.js
  function buildPageBoxRuleForCapture(parts) {
    var pageNumbers = buildPageNumberCss(parts.normalized);
    return "\n@page {\n  size: " + parts.paper.widthIn + "in " + parts.paper.heightIn + "in;\n  margin: " + parts.normalized.marginVerticalIn + "in " + parts.normalized.marginHorizontalIn + "in;\n" + pageNumbers.marginBox + "}\n" + pageNumbers.rootReset + pageNumbers.overrideRule + ".page {\n  width: 100%;\n  min-height: 0;\n  padding: 0;\n  box-shadow: none;\n}\n.pagedjs_page {\n  margin-bottom: 0 !important;\n  border-bottom: none !important;\n}\n" + paginationJustifyFix();
  }
  function renderRasterizationDocument(markdownText, config) {
    var parts = buildDocumentParts(markdownText, config);
    var sanitizedBodyHtml = DOMPurify.sanitize(parts.bodyHtml);
    var script = "<script>\n  window.PagedConfig = {\n    after: function (flow) {\n      try {\n" + (parts.normalized.pageNumbersEnabled ? '        var __pages = document.querySelectorAll(".pagedjs_page");\n        for (var __i = 0; __i < __pages.length; __i++) {\n          var __box = __pages[__i].querySelector(".pagedjs_margin-bottom-center .pagedjs_margin-content");\n          if (__box) {\n            __box.setAttribute("data-md2ebook-pagenum", String(' + parts.normalized.pageStartFrom + " + __i));\n          }\n        }\n" : "") + "      } catch (e) {}\n" + tocFillScript(parts.normalized) + '      var pages = document.querySelectorAll(".pagedjs_page");\n      var images = [];\n      var i = 0;\n      function fail(err) {\n        try {\n          window.parent.postMessage({ source: "md2ebook-rasterize", error: String((err && err.message) || err) }, "*");\n        } catch (e) {}\n      }\n      function captureNext() {\n        if (i >= pages.length) {\n          try {\n            var buffers = images.map(function (b) { return b.buffer; });\n            window.parent.postMessage({\n              source: "md2ebook-rasterize",\n              images: images,\n              widthIn: ' + parts.paper.widthIn + ",\n              heightIn: " + parts.paper.heightIn + '\n            }, "*", buffers);\n          } catch (e) { fail(e); }\n          return;\n        }\n        html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true })\n          .then(function (canvas) { return new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); }); })\n          .then(function (blob) { return blob.arrayBuffer(); })\n          .then(function (buffer) { images.push({ buffer: buffer }); i++; captureNext(); })\n          .catch(fail);\n      }\n      try { captureNext(); } catch (e) { fail(e); }\n    }\n  };\n<\/script>\n<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>\n<script src="https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.js"><\/script>\n';
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Md to PDF Converter — Export</title>\n  ' + fontLinkTags(parts.normalized) + "\n  <style>" + parts.styleText + buildPageBoxRuleForCapture(parts) + "  </style>\n  " + script + '</head>\n<body>\n  <div class="page md2ebook-doc">' + sanitizedBodyHtml + "</div>\n</body>\n</html>";
  }

  // apps/Markdown-to-PDF/src/settings/initialConfig.js
  var SAMPLE_MARKDOWN = window.MD2eBookSampleMarkdown || "# Start writing here…";
  var DEFAULT_FONT_OPTIONS = [
    "Inter",
    "Merriweather",
    "Georgia",
    "Garamond",
    "JetBrains Mono",
    "Arial",
    "Times New Roman"
  ];
  var PAPER_SIZE_OPTIONS = Object.values(PAPER_SIZES);
  var BOLD_WEIGHT_OPTIONS = ALLOWED_BOLD_WEIGHTS;
  var BOOLEAN_CONFIG_KEYS = [
    "pageNumbersEnabled",
    "headingFontSameAsBody",
    "tocShowTitle",
    "tocPageNumbers",
    "tocDotLeaders",
    "tocPageBreakAfter",
    "codeHighlight",
    "tocL1Bold",
    "tocL1Italic",
    "tocL1Underline",
    "tocL2Bold",
    "tocL2Italic",
    "tocL2Underline",
    "tocL3Bold",
    "tocL3Italic",
    "tocL3Underline",
    "h1Underline",
    "h2Underline",
    "h3Underline"
  ];
  function defaultBool(value, fallback) {
    if (value === void 0 || value === null || value === "") return fallback;
    if (typeof value === "string") return !/^(false|0|no|off)$/i.test(value.trim());
    return Boolean(value);
  }
  var INITIAL_CONFIG = {
    fontFamily: "Inter",
    headingFontSameAsBody: DEFAULTS.headingFontSameAsBody !== false && DEFAULTS.headingFontSameAsBody !== "false",
    headingFontFamily: DEFAULTS.headingFontFamily ? String(DEFAULTS.headingFontFamily) : "",
    paperSize: String(DEFAULTS.paperSize || "a5"),
    fontSize: "",
    lineHeight: "",
    paragraphSpacing: "",
    textAlign: String(DEFAULTS.textAlign || "left"),
    h1TextAlign: DEFAULTS.h1TextAlign ? String(DEFAULTS.h1TextAlign) : "",
    h2TextAlign: DEFAULTS.h2TextAlign ? String(DEFAULTS.h2TextAlign) : "",
    h3TextAlign: DEFAULTS.h3TextAlign ? String(DEFAULTS.h3TextAlign) : "",
    h1Size: "",
    h1Weight: String(DEFAULTS.h1Weight),
    h2Size: "",
    h2Weight: String(DEFAULTS.h2Weight),
    h3Size: "",
    h3Weight: String(DEFAULTS.h3Weight),
    h1LineHeight: "",
    h2LineHeight: "",
    h3LineHeight: "",
    h1Underline: defaultBool(DEFAULTS.h1Underline, true),
    h2Underline: defaultBool(DEFAULTS.h2Underline, false),
    h3Underline: defaultBool(DEFAULTS.h3Underline, false),
    baseWeight: String(DEFAULTS.baseWeight),
    boldWeight: String(DEFAULTS.boldWeight),
    marginVertical: "",
    marginHorizontal: "",
    tocLevels: String(DEFAULTS.tocLevels || 3),
    tocShowTitle: defaultBool(DEFAULTS.tocShowTitle, true),
    tocTitle: "",
    tocTitleAlign: DEFAULTS.tocTitleAlign ? String(DEFAULTS.tocTitleAlign) : "",
    tocL1Bold: defaultBool(DEFAULTS.tocL1Bold, true),
    tocL1Italic: defaultBool(DEFAULTS.tocL1Italic, false),
    tocL1Underline: defaultBool(DEFAULTS.tocL1Underline, false),
    tocL1Size: DEFAULTS.tocL1Size ? String(DEFAULTS.tocL1Size) : "",
    tocL1LineHeight: DEFAULTS.tocL1LineHeight ? String(DEFAULTS.tocL1LineHeight) : "",
    tocL2Bold: defaultBool(DEFAULTS.tocL2Bold, false),
    tocL2Italic: defaultBool(DEFAULTS.tocL2Italic, false),
    tocL2Underline: defaultBool(DEFAULTS.tocL2Underline, false),
    tocL2Size: DEFAULTS.tocL2Size ? String(DEFAULTS.tocL2Size) : "",
    tocL2LineHeight: DEFAULTS.tocL2LineHeight ? String(DEFAULTS.tocL2LineHeight) : "",
    tocL3Bold: defaultBool(DEFAULTS.tocL3Bold, false),
    tocL3Italic: defaultBool(DEFAULTS.tocL3Italic, false),
    tocL3Underline: defaultBool(DEFAULTS.tocL3Underline, false),
    tocL3Size: DEFAULTS.tocL3Size ? String(DEFAULTS.tocL3Size) : "",
    tocL3LineHeight: DEFAULTS.tocL3LineHeight ? String(DEFAULTS.tocL3LineHeight) : "",
    tocPageNumbers: defaultBool(DEFAULTS.tocPageNumbers, true),
    tocDotLeaders: defaultBool(DEFAULTS.tocDotLeaders, true),
    tocPageBreakAfter: defaultBool(DEFAULTS.tocPageBreakAfter, true),
    codeHighlight: defaultBool(DEFAULTS.codeHighlight, true),
    pageNumbersEnabled: Boolean(DEFAULTS.pageNumbersEnabled),
    pageStartFrom: ""
  };

  // apps/Markdown-to-PDF/src/ui/Menu.jsx
  var { useState, useRef, useEffect, useLayoutEffect } = React;
  function DropMenu({ trigger, title, align = "left", triggerClassName, keepEditorFocus, children }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    useEffect(() => {
      if (!open) return void 0;
      const onDown = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
      };
      const onKey = (e) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);
    const menuRef = useRef(null);
    useLayoutEffect(() => {
      const menu = menuRef.current;
      if (!open || !menu) return;
      menu.style.transform = "";
      const { left, right, width } = menu.getBoundingClientRect();
      const limit = document.documentElement.clientWidth - 8;
      const zoom = menu.offsetWidth ? width / menu.offsetWidth : 1;
      if (right > limit) menu.style.transform = `translateX(${Math.max(8 - left, limit - right) / zoom}px)`;
      else if (left < 8) menu.style.transform = `translateX(${(8 - left) / zoom}px)`;
    }, [open]);
    return /* @__PURE__ */ React.createElement("div", { className: "md2ebook-menu-wrap", ref: containerRef }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "md2ebook-menu-trigger" + (open ? " open" : "") + (triggerClassName ? " " + triggerClassName : ""),
        "aria-haspopup": "menu",
        "aria-expanded": open,
        title,
        onMouseDown: keepEditorFocus ? (e) => e.preventDefault() : void 0,
        onClick: () => setOpen((o) => !o)
      },
      trigger,
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" }))
    ), open ? /* @__PURE__ */ React.createElement("div", { className: "md2ebook-menu md2ebook-menu-" + align, role: "menu", ref: menuRef }, children({ close: () => setOpen(false), keepEditorFocus })) : null);
  }
  function MenuItem({ label, detail, shortcut, hint, onClick, close, keepEditorFocus, children }) {
    return /* @__PURE__ */ React.createElement("div", { className: "md2ebook-menu-row" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        className: "md2ebook-menu-item",
        title: hint,
        onMouseDown: keepEditorFocus ? (e) => e.preventDefault() : void 0,
        onClick: () => {
          close();
          onClick();
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "md2ebook-menu-item-text" }, /* @__PURE__ */ React.createElement("span", null, label), detail ? /* @__PURE__ */ React.createElement("span", { className: "md2ebook-menu-item-detail" }, detail) : null),
      shortcut ? /* @__PURE__ */ React.createElement("span", { className: "md2ebook-menu-item-shortcut" }, shortcut) : null
    ), children);
  }
  var MenuSeparator = () => /* @__PURE__ */ React.createElement("div", { className: "md2ebook-menu-sep", role: "separator" });

  // apps/Markdown-to-PDF/src/ui/shortcutKeys.js
  var IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var MOD = IS_MAC ? "⌘" : "Ctrl+";
  var ALT = IS_MAC ? "⌥" : "Alt+";
  var SHIFT = IS_MAC ? "⇧" : "Shift+";

  // apps/Markdown-to-PDF/src/ui/Header.jsx
  var OPEN_FILE_TYPES = `Opens Markdown (.md, .markdown), plain text (.txt), Word (.docx), EPUB (.epub) and Muse (.muse) files. Replaces the editor's text (${MOD}Z brings it back).`;
  function Header({ onOpenFile, onSaveMarkdown, onQuickSave, savedFileName, onLoadSample, onExport, isExporting, onSendToZineArranger, isSendingToArranger }) {
    return /* @__PURE__ */ React.createElement("header", { className: "md2ebook-header md2ebook-no-print topbar" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-brand" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-logo" }, "Md"), /* @__PURE__ */ React.createElement("div", { className: "topbar-brand-text" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-title" }, "Md to PDF Converter"), /* @__PURE__ */ React.createElement("div", { className: "topbar-subtitle", title: "Build number: changes whenever the app is updated" }, "Markdown → Publication-ready PDF · build ", "da430c5"))), /* @__PURE__ */ React.createElement("div", { className: "topbar-actions" }, /* @__PURE__ */ React.createElement(DropMenu, { trigger: "File", align: "right", triggerClassName: "md2ebook-topbar-btn md2ebook-file-menu" }, ({ close }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MenuItem, { label: "Open file…", detail: "md · txt · docx · epub · muse", shortcut: MOD + "O", hint: OPEN_FILE_TYPES, onClick: onOpenFile, close }), savedFileName ? /* @__PURE__ */ React.createElement(MenuItem, { label: "Save", detail: savedFileName, shortcut: MOD + "S", hint: `Save back to "${savedFileName}", no dialog`, onClick: onQuickSave, close }) : null, /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        label: "Save as Markdown…",
        shortcut: savedFileName ? MOD + SHIFT + "S" : MOD + "S",
        hint: "Save the editor's text as a .md file. After that, Save (and the toolbar's save button) writes back to it in one click.",
        onClick: onSaveMarkdown,
        close
      }
    ), /* @__PURE__ */ React.createElement(MenuSeparator, null), /* @__PURE__ */ React.createElement(MenuItem, { label: "Load sample Markdown", hint: `Replaces the editor's text with a sample document (${MOD}Z brings yours back)`, onClick: onLoadSample, close }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "md2ebook-topbar-btn",
        onClick: onSendToZineArranger,
        disabled: isSendingToArranger,
        title: "Exports the current document and opens it directly in ZineArranger — no manual save/reopen step"
      },
      isSendingToArranger ? "Sending…" : "Send to ZineArranger"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onExport,
        disabled: isExporting,
        title: `Opens your browser's print dialog — choose "Save as PDF" as the destination`,
        className: "btn-solid inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      },
      isExporting ? /* @__PURE__ */ React.createElement("svg", { className: "md2ebook-spinner", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", opacity: "0.3" }), /* @__PURE__ */ React.createElement("path", { d: "M22 12a10 10 0 0 0-10-10", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" })) : /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React.createElement(
        "path",
        {
          fillRule: "evenodd",
          d: "M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0118 8.653v4.097A2.25 2.25 0 0115.75 15h-.241l.305 2.14A.75.75 0 0115.023 18H4.977a.75.75 0 01-.79-.86L4.492 15H4.25A2.25 2.25 0 012 12.75V8.653c0-1.082.784-2.005 1.874-2.198.374-.056.75-.107 1.126-.153V2.75zM6.5 6.11c1.649-.176 3.319-.266 5-.266s3.351.09 5 .266V2.75a.25.25 0 00-.25-.25h-6.5a.25.25 0 00-.25-.25v3.61zm5.5 6.14v-1.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v1.25a.75.75 0 00.75.75h1.5a.75.75 0 00.75-.75z",
          clipRule: "evenodd"
        }
      )),
      isExporting ? "Opening Print Dialog…" : "Download PDF eBook"
    )));
  }

  // apps/Markdown-to-PDF/src/ui/PanelResizer.jsx
  var { useLayoutEffect: useLayoutEffect2, useRef: useRef2 } = React;
  var STORAGE_KEY = "md2pdf.sidebarWidth";
  var MIN_PANEL = 300;
  var MIN_PREVIEW = 320;
  var KEY_STEP = 16;
  function PanelResizer({ bodyRef }) {
    const handleRef = useRef2(null);
    const widthRef = useRef2(null);
    const clamp = (px) => {
      const body = bodyRef.current;
      const most = Math.max(MIN_PANEL, (body ? body.getBoundingClientRect().width : window.innerWidth) - MIN_PREVIEW);
      return Math.round(Math.min(most, Math.max(MIN_PANEL, px)));
    };
    const apply = (px, save) => {
      const root2 = document.documentElement;
      if (px == null) {
        widthRef.current = null;
        root2.style.removeProperty("--md2ebook-sidebar-width");
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
        }
      } else {
        widthRef.current = clamp(px);
        root2.style.setProperty("--md2ebook-sidebar-width", widthRef.current + "px");
        if (save) {
          try {
            localStorage.setItem(STORAGE_KEY, String(widthRef.current));
          } catch (e) {
          }
        }
      }
    };
    const panelWidth = () => {
      const aside = handleRef.current && handleRef.current.parentElement;
      return aside ? aside.getBoundingClientRect().width : MIN_PANEL;
    };
    useLayoutEffect2(() => {
      let saved = null;
      try {
        saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      } catch (e) {
      }
      if (saved > 0) apply(saved, false);
      const onResize = () => {
        if (widthRef.current != null && clamp(widthRef.current) !== widthRef.current) apply(widthRef.current, false);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.classList.add("is-dragging");
      document.body.style.userSelect = "none";
    };
    const onPointerMove = (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      apply(bodyRef.current.getBoundingClientRect().right - e.clientX, false);
    };
    const endDrag = (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      e.currentTarget.classList.remove("is-dragging");
      document.body.style.userSelect = "";
      if (widthRef.current != null) {
        try {
          localStorage.setItem(STORAGE_KEY, String(widthRef.current));
        } catch (err) {
        }
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        apply(panelWidth() + KEY_STEP, true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        apply(panelWidth() - KEY_STEP, true);
      } else if (e.key === "Home") {
        e.preventDefault();
        apply(null);
      }
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: handleRef,
        className: "md2ebook-resizer md2ebook-no-print",
        role: "separator",
        "aria-orientation": "vertical",
        "aria-label": "Resize the editor panel",
        tabIndex: 0,
        onPointerDown,
        onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onDoubleClick: () => apply(null),
        onKeyDown
      }
    );
  }

  // apps/Markdown-to-PDF/src/document/previewDocument.js
  function renderHtmlDocument(markdownText, config) {
    var parts = buildDocumentParts(markdownText, config);
    var paginationScript = "<script>\n  function __contentHeight() {\n    return Math.ceil(document.body.getBoundingClientRect().height);\n  }\n  window.addEventListener('message', function (e) {\n    var d = e.data;\n    if (e.source !== window.parent || !d || d.source !== 'md2ebook-app' || d.type !== 'darkPaper') return;\n    document.documentElement.classList.toggle('md2ebook-dark-paper', !!d.on);\n  });\n  window.PagedConfig = {\n    after: function (flow) {\n      try {\n" + (parts.normalized.pageNumbersEnabled ? '        var __pages = document.querySelectorAll(".pagedjs_page");\n        for (var __i = 0; __i < __pages.length; __i++) {\n          var __box = __pages[__i].querySelector(".pagedjs_margin-bottom-center .pagedjs_margin-content");\n          if (__box) {\n            __box.setAttribute("data-md2ebook-pagenum", String(' + parts.normalized.pageStartFrom + " + __i));\n          }\n        }\n" : "") + "      } catch (e) {}\n" + tocFillScript(parts.normalized) + `      try {
        window.parent.postMessage({
          source: 'md2ebook-pagedjs',
          tocPages: __tocPages,
          pageCount: flow && flow.total,
          height: __contentHeight()
        }, '*');
      } catch (e) {}
    }
  };
  window.addEventListener('load', function () {
    try {
      window.parent.postMessage({
        source: 'md2ebook-pagedjs',
        pageCount: null,
        height: __contentHeight()
      }, '*');
    } catch (e) {}
  });
<\/script>
<script src="https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.js"><\/script>
`;
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Md to PDF Converter — Preview</title>\n  ' + fontLinkTags(parts.normalized) + "\n  <style>" + parts.styleText + buildPageBoxRule(parts) + "\n    .md2ebook-space { outline: 1px dashed #cbd5e1; outline-offset: -1px; position: relative; }\n    html.md2ebook-dark-paper .pagedjs_page, html.md2ebook-dark-paper body > .page { filter: invert(0.92) hue-rotate(180deg); }\n    html.md2ebook-dark-paper img, html.md2ebook-dark-paper svg, html.md2ebook-dark-paper video, html.md2ebook-dark-paper picture { filter: invert(1) hue-rotate(180deg); }\n    .md2ebook-space::after { content: 'blank space \\00b7  ' attr(data-lines) ' lines'; position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); text-align: center; font: 11px ui-sans-serif, system-ui, sans-serif; color: #94a3b8; }\n  </style>\n  " + paginationScript + '</head>\n<body>\n  <div class="page md2ebook-doc">' + parts.bodyHtml + "</div>\n</body>\n</html>";
  }

  // shared/js/pinchGate.js
  var PINCH_THRESHOLD = 0.3;
  function createPinchGate(threshold = PINCH_THRESHOLD) {
    let base = null;
    return function gate(rawScale) {
      if (base === null) {
        if (!(rawScale > 0) || Math.abs(Math.log(rawScale)) < Math.log(1 + threshold)) return 1;
        base = rawScale;
      }
      return rawScale / base;
    };
  }

  // shared/js/NumberBox.jsx
  function NumberBox({ steppers = true, wrapClassName, ...inputProps }) {
    const input = /* @__PURE__ */ React.createElement("input", { type: "number", ...inputProps });
    if (!steppers) return input;
    const disabled = Boolean(inputProps.disabled);
    return /* @__PURE__ */ React.createElement("span", { className: "zn-num" + (wrapClassName ? " " + wrapClassName : "") }, input, /* @__PURE__ */ React.createElement("button", { type: "button", className: "zn-num-btn", "data-zn-step": "-1", tabIndex: -1, "aria-label": "Decrease", title: "Decrease", disabled }, "−"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "zn-num-btn", "data-zn-step": "1", tabIndex: -1, "aria-label": "Increase", title: "Increase", disabled }, "+"));
  }

  // apps/Markdown-to-PDF/src/ui/PreviewCanvas.jsx
  var { useState: useState2, useEffect: useEffect2, useLayoutEffect: useLayoutEffect3, useRef: useRef3, useMemo } = React;
  var PAGE_SEAM_PX = 3;
  var PAGE_GAP_PX = 24;
  var CANVAS_TOP_PAD_PX = 40;
  function PageJump({ current, total, onGo }) {
    const [draft, setDraft] = useState2(null);
    const commit = () => {
      if (draft == null) return;
      const n = parseInt(draft, 10);
      if (Number.isFinite(n)) onGo(n);
      setDraft(null);
    };
    return /* @__PURE__ */ React.createElement("span", { className: "md2ebook-page-jump" }, "Page", /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        min: 1,
        max: total,
        step: 1,
        value: draft != null ? draft : current,
        disabled: total <= 1,
        onChange: (e) => {
          if (e.nativeEvent && e.nativeEvent.inputType) setDraft(e.target.value);
          else {
            setDraft(null);
            onGo(Number(e.target.value));
          }
        },
        onBlur: commit,
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") setDraft(null);
        },
        "aria-label": `Go to page (1 to ${total})`,
        title: `Go to page — type 1 to ${total} and press Enter`
      }
    ), "of ", total);
  }
  var ZOOM_MIN = 15;
  var ZOOM_MAX = 200;
  var clampZoom = (n) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n)));
  function ZoomControl({ percent, isFit, onZoom }) {
    const [draft, setDraft] = useState2(null);
    const commit = () => {
      if (draft == null) return;
      const n = parseFloat(draft);
      if (Number.isFinite(n)) onZoom(clampZoom(n));
      setDraft(null);
    };
    return /* @__PURE__ */ React.createElement("span", { className: "md2ebook-zoom" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "md2ebook-zoom-slider",
        min: ZOOM_MIN,
        max: ZOOM_MAX,
        step: 1,
        value: percent,
        onChange: (e) => onZoom(clampZoom(Number(e.target.value))),
        "aria-label": "Preview zoom"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "md2ebook-zoom-number" }, /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        min: ZOOM_MIN,
        max: ZOOM_MAX,
        step: 5,
        value: draft != null ? draft : percent,
        onChange: (e) => {
          if (e.nativeEvent && e.nativeEvent.inputType) setDraft(e.target.value);
          else {
            setDraft(null);
            onZoom(clampZoom(Number(e.target.value)));
          }
        },
        onBlur: commit,
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") setDraft(null);
        },
        "aria-label": "Preview zoom percent"
      }
    ), "%"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "md2ebook-zoom-fit" + (isFit ? " active" : ""),
        onClick: () => {
          setDraft(null);
          onZoom(null);
        },
        "aria-pressed": isFit,
        title: "Fit the page to the preview's width"
      },
      "Fit"
    ));
  }
  function PreviewCanvas({ markdown, config, onTocPages, onPaperSizeChange }) {
    const onTocPagesRef = useRef3(onTocPages);
    onTocPagesRef.current = onTocPages;
    const outerRef = useRef3(null);
    const iframeRef = useRef3(null);
    const [fitScale, setFitScale] = useState2(1);
    const [zoomPct, setZoomPct] = useState2(null);
    const scale = zoomPct == null ? fitScale : zoomPct / 100;
    const [contentHeightPx, setContentHeightPx] = useState2(0);
    const [pageCount, setPageCount] = useState2(null);
    const [paginating, setPaginating] = useState2(true);
    const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
    const DPI = 96;
    const pageWidthPx = Math.round(paper.widthIn * DPI);
    const minPageHeightPx = Math.round(paper.heightIn * DPI);
    const renderedHeightPx = Math.max(minPageHeightPx, contentHeightPx);
    const srcDoc = useMemo(() => {
      return renderHtmlDocument(markdown, config);
    }, [markdown, config]);
    useEffect2(() => {
      setPaginating(true);
      setPageCount(null);
      if (onTocPagesRef.current) onTocPagesRef.current(null);
    }, [srcDoc]);
    useEffect2(() => {
      const el = outerRef.current;
      if (!el) return void 0;
      function recompute() {
        const availableWidth = el.clientWidth - 48;
        const next = Math.min(1, Math.max(ZOOM_MIN / 100, availableWidth / pageWidthPx));
        setFitScale(next);
      }
      recompute();
      let observer;
      if ("ResizeObserver" in window) {
        observer = new ResizeObserver(recompute);
        observer.observe(el);
      } else {
        window.addEventListener("resize", recompute);
      }
      return () => {
        if (observer) observer.disconnect();
        else window.removeEventListener("resize", recompute);
      };
    }, [pageWidthPx]);
    function sendDarkPaper() {
      const win = iframeRef.current && iframeRef.current.contentWindow;
      if (!win) return;
      const on = document.documentElement.classList.contains("md2ebook-dark-paper");
      try {
        win.postMessage({ source: "md2ebook-app", type: "darkPaper", on }, "*");
      } catch (e) {
      }
    }
    useEffect2(() => {
      window.addEventListener("zn-display-prefs", sendDarkPaper);
      return () => window.removeEventListener("zn-display-prefs", sendDarkPaper);
    }, []);
    useEffect2(() => {
      function handleMessage(event) {
        const data = event.data;
        if (!data || data.source !== "md2ebook-pagedjs") return;
        if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
        sendDarkPaper();
        const measuredHeight = Number(data.height);
        if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
          setContentHeightPx(measuredHeight);
        }
        if (data.tocPages && typeof data.tocPages === "object" && onTocPagesRef.current) {
          onTocPagesRef.current(data.tocPages);
        }
        const measuredPages = Number(data.pageCount);
        if (Number.isFinite(measuredPages) && measuredPages > 0) {
          setPageCount(measuredPages);
          setPaginating(false);
        }
      }
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, []);
    const [currentPage, setCurrentPage] = useState2(1);
    const pageStridePx = (minPageHeightPx + PAGE_SEAM_PX + PAGE_GAP_PX) * scale;
    useEffect2(() => {
      const el = outerRef.current;
      if (!el) return void 0;
      let ticking = false;
      function computeCurrentPage() {
        ticking = false;
        if (!pageCount || pageCount <= 1) {
          setCurrentPage(1);
          return;
        }
        if (!(pageStridePx > 0)) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setCurrentPage(pageCount);
          return;
        }
        const estimated = Math.floor((el.scrollTop - CANVAS_TOP_PAD_PX + pageStridePx / 3) / pageStridePx) + 1;
        setCurrentPage(Math.min(pageCount, Math.max(1, estimated)));
      }
      function handleScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(computeCurrentPage);
      }
      computeCurrentPage();
      el.addEventListener("scroll", handleScroll);
      return () => el.removeEventListener("scroll", handleScroll);
    }, [pageCount, pageStridePx]);
    const goToPage = (n) => {
      const el = outerRef.current;
      if (!el || !pageCount) return;
      const page = Math.min(pageCount, Math.max(1, Math.round(n)));
      el.scrollTop = CANVAS_TOP_PAD_PX + (page - 1) * pageStridePx - 8;
      setCurrentPage(page);
    };
    const boxRef = useRef3(null);
    const pointersRef = useRef3(/* @__PURE__ */ new Map());
    const panRef = useRef3(null);
    const pinchRef = useRef3(null);
    const twoPoints = () => [...pointersRef.current.values()].slice(0, 2);
    const startPanFrom = (p) => {
      panRef.current = { x: p.x, y: p.y, left: outerRef.current.scrollLeft, top: outerRef.current.scrollTop };
    };
    const keepPinchSpot = () => {
      const pinch = pinchRef.current, pane = outerRef.current, box = boxRef.current;
      if (!pinch || !pane || !box) return;
      const r = box.getBoundingClientRect();
      pane.scrollLeft += r.left + pinch.fx * r.width - pinch.mid.x;
      pane.scrollTop += r.top + pinch.fy * r.height - pinch.mid.y;
    };
    useLayoutEffect3(keepPinchSpot, [scale]);
    const startPan = (e) => {
      if (e.button !== 0 || !outerRef.current) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
      }
      e.currentTarget.classList.add("is-panning");
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 1) {
        startPanFrom({ x: e.clientX, y: e.clientY });
      } else if (pointersRef.current.size === 2 && boxRef.current) {
        const [a, b] = twoPoints();
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const r = boxRef.current.getBoundingClientRect();
        panRef.current = null;
        pinchRef.current = {
          spread0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          pct0: scale * 100,
          fx: (mid.x - r.left) / r.width,
          fy: (mid.y - r.top) / r.height,
          mid,
          gate: createPinchGate()
          // a small change in the fingers' gap only scrolls
        };
      }
    };
    const movePan = (e) => {
      if (!pointersRef.current.has(e.pointerId) || !outerRef.current) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pinch = pinchRef.current;
      if (pinch && pointersRef.current.size >= 2) {
        const [a, b] = twoPoints();
        pinch.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const s = pinch.gate(Math.hypot(a.x - b.x, a.y - b.y) / pinch.spread0);
        const pct = clampZoom(pinch.pct0 * s);
        if (s !== 1 && pct !== Math.round(scale * 100)) setZoomPct(pct);
        else keepPinchSpot();
        return;
      }
      const start = panRef.current;
      if (!start) return;
      outerRef.current.scrollLeft = start.left - (e.clientX - start.x);
      outerRef.current.scrollTop = start.top - (e.clientY - start.y);
    };
    const endPan = (e) => {
      if (!pointersRef.current.delete(e.pointerId)) return;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
      }
      if (pointersRef.current.size === 1) {
        pinchRef.current = null;
        startPanFrom(twoPoints()[0]);
        return;
      }
      if (pointersRef.current.size > 0) return;
      pinchRef.current = null;
      panRef.current = null;
      e.currentTarget.classList.remove("is-panning");
    };
    return /* @__PURE__ */ React.createElement("div", { ref: outerRef, className: "md2ebook-preview-pane" }, /* @__PURE__ */ React.createElement("div", { className: "md2ebook-canvas-wrapper" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: boxRef,
        className: "md2ebook-canvas-scale-box",
        style: {
          width: pageWidthPx * scale,
          height: renderedHeightPx * scale
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "md2ebook-page-shadow",
          style: {
            width: pageWidthPx,
            height: renderedHeightPx,
            transform: `scale(${scale})`
          }
        },
        /* @__PURE__ */ React.createElement(
          "iframe",
          {
            ref: iframeRef,
            title: "Md to PDF Converter live preview",
            className: "md2ebook-page-iframe",
            srcDoc,
            width: pageWidthPx,
            height: renderedHeightPx,
            sandbox: "allow-scripts"
          }
        )
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "md2ebook-pan-surface",
          onPointerDown: startPan,
          onPointerMove: movePan,
          onPointerUp: endPan,
          onPointerCancel: endPan
        }
      )
    )), /* @__PURE__ */ React.createElement("div", { className: "md2ebook-no-print md2ebook-preview-statusbar" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "md2ebook-statusbar-select",
        value: config.paperSize,
        onChange: (e) => onPaperSizeChange(e.target.value),
        "aria-label": "Paper size",
        title: "Paper size (also in Typography → Page)"
      },
      PAPER_SIZE_OPTIONS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, p.label))
    ), /* @__PURE__ */ React.createElement("span", { className: "md2ebook-statusbar-divider", "aria-hidden": "true" }, "|"), paginating ? /* @__PURE__ */ React.createElement("span", null, "Paginating…") : /* @__PURE__ */ React.createElement(PageJump, { current: currentPage, total: pageCount || 1, onGo: goToPage }), /* @__PURE__ */ React.createElement("span", { className: "md2ebook-statusbar-divider", "aria-hidden": "true" }, "|"), /* @__PURE__ */ React.createElement(ZoomControl, { percent: Math.round(scale * 100), isFit: zoomPct == null, onZoom: setZoomPct })));
  }

  // apps/Markdown-to-PDF/src/editor/codeLanguages.js
  var CODE_LANGUAGES = [
    { tag: "", label: "Plain text", ext: [".txt", ".log", ".csv"] },
    { tag: "json", label: "JSON", ext: [".json"] },
    { tag: "javascript", label: "JavaScript", ext: [".js", ".mjs", ".cjs", ".jsx"] },
    { tag: "php", label: "PHP", ext: [".php"] },
    { tag: "liquid", label: "Liquid (Shopify)", ext: [".liquid"] },
    { tag: "python", label: "Python", ext: [".py"] },
    { tag: "html", label: "HTML", ext: [".html", ".htm", ".xml", ".svg"] },
    { tag: "css", label: "CSS", ext: [".css"] },
    { tag: "bash", label: "Shell", ext: [".sh", ".bash", ".zsh"] },
    { tag: "yaml", label: "YAML", ext: [".yml", ".yaml"] },
    { tag: "excel-formula", label: "Excel formula", ext: [] },
    { tag: "markdown", label: "Markdown", ext: [".md", ".markdown"] }
  ];
  function languageForFile(name) {
    const dot = String(name || "").lastIndexOf(".");
    if (dot < 0) return "";
    const ext = String(name).slice(dot).toLowerCase();
    const lang = CODE_LANGUAGES.find((l) => l.ext.includes(ext));
    return lang ? lang.tag : "";
  }
  function languageLabel(tag) {
    const lang = CODE_LANGUAGES.find((l) => l.tag === tag);
    return lang ? lang.label : tag;
  }
  function cleanLanguageTag(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s`]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  }

  // apps/Markdown-to-PDF/src/ui/fields.jsx
  function SectionLabel({ children }) {
    return /* @__PURE__ */ React.createElement("h3", { className: "md2pdf-section-label" }, children);
  }
  function CollapsibleSection({ label, defaultOpen = false, children }) {
    const [open, setOpen] = React.useState(defaultOpen);
    const bodyId = React.useId();
    return /* @__PURE__ */ React.createElement("section", { className: "md2pdf-sec" + (open ? " is-open" : "") }, /* @__PURE__ */ React.createElement("h3", { className: "md2pdf-sec-head" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "md2pdf-sec-title", "aria-expanded": open, "aria-controls": bodyId, onClick: () => setOpen((o) => !o) }, /* @__PURE__ */ React.createElement("span", { className: "md2pdf-sec-name" }, label), /* @__PURE__ */ React.createElement("svg", { className: "md2pdf-sec-caret", viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" })))), /* @__PURE__ */ React.createElement("div", { id: bodyId, className: "md2pdf-sec-body", hidden: !open }, children));
  }
  function ControlField({ label, hint, children }) {
    return /* @__PURE__ */ React.createElement("label", { className: "block mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, label), children, hint ? /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted opacity-70 mt-1" }, hint) : null);
  }
  function ToggleRow({ checked, onChange, label }) {
    return /* @__PURE__ */ React.createElement("div", { className: "toggle-row mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked, onChange: (e) => onChange(e.target.checked) }), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" })), /* @__PURE__ */ React.createElement("div", { className: "toggle-row-text" }, /* @__PURE__ */ React.createElement(
      "p",
      {
        style: {
          margin: 0,
          color: "var(--ui-fg)",
          fontSize: "13px"
        }
      },
      label
    )));
  }
  function TextInput({ value, onChange, placeholder, type = "text", inputMode, step, min }) {
    const props = {
      inputMode,
      step,
      min,
      value,
      onChange: (e) => onChange(e.target.value),
      placeholder,
      className: "w-full text-sm placeholder-fg-muted"
    };
    if (type === "number") return /* @__PURE__ */ React.createElement(NumberBox, { ...props });
    return /* @__PURE__ */ React.createElement("input", { type, ...props });
  }
  function SelectInput({ value, onChange, children }) {
    return /* @__PURE__ */ React.createElement("select", { value, onChange: (e) => onChange(e.target.value), className: "w-full text-sm" }, children);
  }
  var ALIGN_ICON_LINES = {
    //            [x, width] for each of the 4 lines in a 16x16 box
    left: [
      [2, 12],
      [2, 8],
      [2, 12],
      [2, 6]
    ],
    center: [
      [2, 12],
      [4, 8],
      [2, 12],
      [5, 6]
    ],
    right: [
      [2, 12],
      [6, 8],
      [2, 12],
      [8, 6]
    ],
    justify: [
      [2, 12],
      [2, 12],
      [2, 12],
      [2, 7]
    ]
  };
  function AlignIcon({ align }) {
    return /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true" }, ALIGN_ICON_LINES[align].map(([x, w], i) => /* @__PURE__ */ React.createElement("rect", { key: i, x, y: 2.5 + i * 3.25, width: w, height: 1.5, rx: 0.75 })));
  }
  function LinkIcon() {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round",
        "aria-hidden": "true"
      },
      /* @__PURE__ */ React.createElement("path", { d: "M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9" }),
      /* @__PURE__ */ React.createElement("path", { d: "M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" })
    );
  }
  function AlignField({ label, value, onChange, inheritedValue, allowInherit, hint, linkLabel = "body text" }) {
    const following = allowInherit && !value;
    const shown = following ? inheritedValue : value;
    const linkButton = allowInherit ? /* @__PURE__ */ React.createElement(
      "button",
      {
        key: "link",
        type: "button",
        role: "radio",
        "aria-checked": following,
        title: following ? `Linked to ${linkLabel} alignment` : `Link to ${linkLabel} alignment`,
        onClick: () => onChange(""),
        className: "border-0 border-r border-line rounded-none px-2.5 py-1.5 flex items-center " + (following ? "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg")
      },
      /* @__PURE__ */ React.createElement(LinkIcon, null)
    ) : null;
    return /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, label), /* @__PURE__ */ React.createElement("div", { role: "radiogroup", "aria-label": label, className: "inline-flex rounded-md border border-line overflow-hidden" }, linkButton, TEXT_ALIGN_OPTIONS.map((o) => {
      const active = shown === o.key;
      const cls = active ? following ? "bg-ink-alt text-fg-muted" : "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg";
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: o.key,
          type: "button",
          role: "radio",
          "aria-checked": active && !following,
          title: o.label + (following && active ? " (following body text)" : ""),
          onClick: () => onChange(o.key),
          className: "border-0 rounded-none px-2.5 py-1.5 flex items-center " + cls
        },
        /* @__PURE__ */ React.createElement(AlignIcon, { align: o.key })
      );
    })), hint ? /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted opacity-70 mt-1" }, hint) : null);
  }
  function HeadingLineControls({ level, config, updateConfig }) {
    const lh = `h${level}LineHeight`;
    const ul = `h${level}Underline`;
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(ControlField, { label: `H${level} Line Height`, hint: `Default: ${DEFAULTS[lh]}` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "0.1",
        min: "0.5",
        value: config[lh],
        onChange: (v) => updateConfig(lh, v),
        placeholder: String(DEFAULTS[lh]),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ToggleRow, { checked: config[ul], onChange: (v) => updateConfig(ul, v), label: `Line beneath H${level}` }));
  }
  function TocLevelStyle({ level, config, updateConfig }) {
    const k = "tocL" + level;
    const toggles = [
      {
        key: "Bold",
        label: "B",
        title: "Bold",
        style: {
          fontWeight: 700
        }
      },
      {
        key: "Italic",
        label: "I",
        title: "Italic",
        style: {
          fontStyle: "italic",
          fontFamily: "Georgia, serif"
        }
      },
      {
        key: "Underline",
        label: "U",
        title: "Underline",
        style: {
          textDecoration: "underline"
        }
      }
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, `H${level} Entries`), /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "group",
        "aria-label": `H${level} entry style`,
        className: "inline-flex rounded-md border border-line overflow-hidden mb-2"
      },
      toggles.map((t, i) => {
        const on = Boolean(config[k + t.key]);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: t.key,
            type: "button",
            "aria-pressed": on,
            title: t.title,
            onClick: () => updateConfig(k + t.key, !on),
            className: "border-0 rounded-none w-8 py-1.5 text-sm leading-none " + (i > 0 ? "border-l border-line " : "") + (on ? "bg-ink-alt text-accent" : "bg-transparent text-fg-muted hover:text-fg"),
            style: t.style
          },
          t.label
        );
      })
    ), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "block" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted mb-1" }, "Font Size (px)"), /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        inputMode: "decimal",
        value: config[k + "Size"],
        onChange: (v) => updateConfig(k + "Size", v),
        placeholder: String(config.fontSize || DEFAULTS.fontSize),
        step: "1",
        min: "1"
      }
    )), /* @__PURE__ */ React.createElement("label", { className: "block" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-fg-muted mb-1" }, "Line Spacing"), /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        inputMode: "decimal",
        value: config[k + "LineHeight"],
        onChange: (v) => updateConfig(k + "LineHeight", v),
        placeholder: String(config.lineHeight || DEFAULTS.lineHeight),
        step: "0.1",
        min: "0.5"
      }
    ))));
  }
  function StatusLine({ status, className }) {
    if (!status) return null;
    return /* @__PURE__ */ React.createElement("p", { className: className + " text-[11px] " + (status.type === "error" ? "text-red-400" : "text-success") }, status.message);
  }

  // apps/Markdown-to-PDF/src/ui/editor/FormatToolbar.jsx
  var BLOCK_OPTIONS = [
    { value: "p", label: "Paragraph", keys: MOD + ALT + "0" },
    { value: "h1", label: "Heading 1", keys: MOD + ALT + "1" },
    { value: "h2", label: "Heading 2", keys: MOD + ALT + "2" },
    { value: "h3", label: "Heading 3", keys: MOD + ALT + "3" }
  ];
  var OTHER_BLOCK_LABELS = { h4: "Heading 4", h5: "Heading 5", h6: "Heading 6", quote: "Quote", ul: "Bulleted list", ol: "Numbered list", code: "Code block" };
  var Svg = ({ children, fill }) => /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: fill || "none", stroke: fill ? "none" : "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, children);
  var ICONS = {
    bold: /* @__PURE__ */ React.createElement("span", { className: "md2ebook-fmt-glyph", style: { fontWeight: 800 } }, "B"),
    italic: /* @__PURE__ */ React.createElement("span", { className: "md2ebook-fmt-glyph", style: { fontStyle: "italic", fontFamily: "Georgia, serif" } }, "I"),
    strike: /* @__PURE__ */ React.createElement("span", { className: "md2ebook-fmt-glyph", style: { textDecoration: "line-through" } }, "S"),
    code: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" })),
    // { } — a code block (the < > icon is inline code).
    codeBlock: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M5.5 2.5H5A1.5 1.5 0 0 0 3.5 4v2.2c0 .8-.6 1.3-1.5 1.8.9.5 1.5 1 1.5 1.8V12A1.5 1.5 0 0 0 5 13.5h.5" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 2.5h.5A1.5 1.5 0 0 1 12.5 4v2.2c0 .8.6 1.3 1.5 1.8-.9.5-1.5 1-1.5 1.8V12a1.5 1.5 0 0 1-1.5 1.5h-.5" })),
    link: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9" }), /* @__PURE__ */ React.createElement("path", { d: "M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" })),
    // A picture: frame, sun, hill.
    image: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("rect", { x: "2", y: "3", width: "12", height: "10", rx: "1.5" }), /* @__PURE__ */ React.createElement("circle", { cx: "5.8", cy: "6.4", r: "1.1", fill: "currentColor", stroke: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M14 10.5 10.8 7.4a1 1 0 0 0-1.4 0L3.5 13" })),
    ul: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M6 4h8M6 8h8M6 12h8" }), /* @__PURE__ */ React.createElement("circle", { cx: "2.6", cy: "4", r: "0.9", fill: "currentColor", stroke: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "2.6", cy: "8", r: "0.9", fill: "currentColor", stroke: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "2.6", cy: "12", r: "0.9", fill: "currentColor", stroke: "none" })),
    ol: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M6.5 4h7.5M6.5 8h7.5M6.5 12h7.5" }), /* @__PURE__ */ React.createElement("text", { x: "0.6", y: "5.6", fontSize: "4.6", fill: "currentColor", stroke: "none", fontFamily: "sans-serif", fontWeight: "700" }, "1"), /* @__PURE__ */ React.createElement("text", { x: "0.6", y: "9.6", fontSize: "4.6", fill: "currentColor", stroke: "none", fontFamily: "sans-serif", fontWeight: "700" }, "2"), /* @__PURE__ */ React.createElement("text", { x: "0.6", y: "13.6", fontSize: "4.6", fill: "currentColor", stroke: "none", fontFamily: "sans-serif", fontWeight: "700" }, "3")),
    quote: /* @__PURE__ */ React.createElement(Svg, { fill: "currentColor" }, /* @__PURE__ */ React.createElement("path", { d: "M2.5 9.2C2.5 6.6 3.8 4.7 6.3 4l.5 1c-1.3.5-2 1.3-2.1 2.4H6.6V12H2.5V9.2Zm7 0c0-2.6 1.3-4.5 3.8-5.2l.5 1c-1.3.5-2 1.3-2.1 2.4h1.9V12H9.5V9.2Z" })),
    save: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M3 2.5h8l2.5 2.5v8a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" }), /* @__PURE__ */ React.createElement("path", { d: "M5.5 2.5v3h4.5v-3M5 13.5V9.5h6v4" })),
    // A floppy disk with a pencil over its corner: save under a new name.
    saveAs: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M8.5 13.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5h8l2.5 2.5v2" }), /* @__PURE__ */ React.createElement("path", { d: "M5.5 2.5v3h4.5v-3M5 13.5V9.5h3" }), /* @__PURE__ */ React.createElement("path", { d: "M13.6 8.9l1 1-4 4H9.6v-1Z" })),
    copy: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("rect", { x: "5.5", y: "5.5", width: "8", height: "8.5", rx: "1.5" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H4A1.5 1.5 0 0 0 2.5 3.5V10A1.5 1.5 0 0 0 4 11.5h1.5" })),
    clear: /* @__PURE__ */ React.createElement(Svg, null, /* @__PURE__ */ React.createElement("path", { d: "M2.5 4.5h11M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.6a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.6" }), /* @__PURE__ */ React.createElement("path", { d: "M6.8 7v4.5M9.2 7v4.5" }))
  };
  function ToolButton({ icon, title, onPress, active, marked, disabled }) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled,
        className: "md2ebook-fmt-btn" + (active ? " active" : "") + (marked ? " marked" : ""),
        title,
        "aria-label": title,
        "aria-pressed": active == null ? void 0 : active,
        onMouseDown: (e) => e.preventDefault(),
        onClick: onPress
      },
      ICONS[icon]
    );
  }
  var Divider = () => /* @__PURE__ */ React.createElement("span", { className: "md2ebook-fmt-divider", "aria-hidden": "true" });
  var codeLangName = (tag) => tag ? languageLabel(tag) : "plain text";
  function CodeLanguageMenu({ codeLang, onAction }) {
    const [other, setOther] = React.useState("");
    return /* @__PURE__ */ React.createElement(DropMenu, { trigger: null, title: "Code block language, or insert a file as a code block", triggerClassName: "md2ebook-fmt-menu-trigger md2ebook-fmt-split-trigger", keepEditorFocus: true }, ({ close, keepEditorFocus }) => /* @__PURE__ */ React.createElement(React.Fragment, null, CODE_LANGUAGES.map((l) => /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        key: l.tag || "plain",
        label: l.label,
        shortcut: l.tag === codeLang ? "✓" : null,
        hint: "Code block in " + l.label + (l.tag ? " (```" + l.tag + ")" : ""),
        onClick: () => onAction("codeBlock", l.tag),
        close,
        keepEditorFocus
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "md2ebook-menu-other-lang" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: other,
        placeholder: "Other language…",
        "aria-label": "Other language tag, then Enter",
        title: "Type any language tag (e.g. ruby, sql) and press Enter",
        onChange: (e) => setOther(e.target.value),
        onKeyDown: (e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const tag = cleanLanguageTag(other);
          if (!tag) return;
          close();
          setOther("");
          onAction("codeBlock", tag);
        }
      }
    )), /* @__PURE__ */ React.createElement(MenuSeparator, null), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        label: "From file…",
        hint: "Inserts a text file (.json, .php, .liquid, .js…) as a code block; the language comes from its extension",
        onClick: () => onAction("codeFile"),
        close,
        keepEditorFocus
      }
    )));
  }
  function FormatToolbar({ blockKind, fileSave, onAction, spaceLines, setSpaceLines, codeLang }) {
    const isOther = !BLOCK_OPTIONS.some((o) => o.value === blockKind);
    return /* @__PURE__ */ React.createElement("div", { className: "md2ebook-fmt-bar", role: "toolbar", "aria-label": "Formatting" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "md2ebook-fmt-select",
        value: isOther ? "other" : blockKind,
        onChange: (e) => onAction("block", e.target.value),
        "aria-label": "Text style",
        title: "Text style — " + BLOCK_OPTIONS.map((o) => o.label + " " + o.keys).join(", ")
      },
      BLOCK_OPTIONS.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.value, value: o.value }, o.label)),
      isOther ? /* @__PURE__ */ React.createElement("option", { value: "other", disabled: true, hidden: true }, OTHER_BLOCK_LABELS[blockKind] || "Paragraph") : null
    ), /* @__PURE__ */ React.createElement(Divider, null), /* @__PURE__ */ React.createElement(ToolButton, { icon: "bold", title: `Bold (${MOD}B)`, onPress: () => onAction("inline", "bold") }), /* @__PURE__ */ React.createElement(ToolButton, { icon: "italic", title: `Italic (${MOD}I)`, onPress: () => onAction("inline", "italic") }), /* @__PURE__ */ React.createElement(ToolButton, { icon: "strike", title: `Strikethrough (${MOD}${SHIFT}X)`, onPress: () => onAction("inline", "strike") }), /* @__PURE__ */ React.createElement(ToolButton, { icon: "code", title: `Inline code (${MOD}E)`, onPress: () => onAction("inline", "code") }), /* @__PURE__ */ React.createElement("span", { className: "md2ebook-fmt-split" }, /* @__PURE__ */ React.createElement(
      ToolButton,
      {
        icon: "codeBlock",
        title: `Code block — ${codeLangName(codeLang)} (${MOD}${SHIFT}E); the arrow picks the language`,
        active: blockKind === "code",
        onPress: () => onAction("codeBlock", codeLang)
      }
    ), /* @__PURE__ */ React.createElement(CodeLanguageMenu, { codeLang, onAction })), /* @__PURE__ */ React.createElement(ToolButton, { icon: "link", title: `Link (${MOD}K)`, onPress: () => onAction("link") }), /* @__PURE__ */ React.createElement(ToolButton, { icon: "image", title: "Insert image from a file (it's saved inside the Markdown). For a picture on the web: Insert ▾ › Image from web address", onPress: () => onAction("imageFile") }), /* @__PURE__ */ React.createElement(Divider, null), /* @__PURE__ */ React.createElement(ToolButton, { icon: "ul", title: `Bulleted list (${MOD}${SHIFT}8)`, active: blockKind === "ul", onPress: () => onAction("block", "ul") }), /* @__PURE__ */ React.createElement(ToolButton, { icon: "ol", title: `Numbered list (${MOD}${SHIFT}7)`, active: blockKind === "ol", onPress: () => onAction("block", "ol") }), /* @__PURE__ */ React.createElement(ToolButton, { icon: "quote", title: `Quote (${MOD}${SHIFT}9)`, active: blockKind === "quote", onPress: () => onAction("block", "quote") }), /* @__PURE__ */ React.createElement(Divider, null), /* @__PURE__ */ React.createElement(DropMenu, { trigger: "Insert", title: "Insert at the cursor", triggerClassName: "md2ebook-fmt-menu-trigger", keepEditorFocus: true }, ({ close, keepEditorFocus }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MenuItem, { label: "Table of contents", hint: "Inserts \\toc — its look is set in the Typography tab", onClick: () => onAction("line", "\\toc"), close, keepEditorFocus }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Page break", hint: "Inserts \\pagebreak — what follows starts on a new page", onClick: () => onAction("line", "\\pagebreak"), close, keepEditorFocus }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Divider line", hint: "Inserts --- (a horizontal rule)", onClick: () => onAction("line", "---"), close, keepEditorFocus }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Code block", detail: codeLangName(codeLang), shortcut: MOD + SHIFT + "E", hint: "Inserts a fenced code block (``` … ```); pick its language with the arrow next to the { } button", onClick: () => onAction("codeBlock", codeLang), close, keepEditorFocus }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Code from file…", hint: "Inserts a text file as a code block; the language comes from its extension", onClick: () => onAction("codeFile"), close, keepEditorFocus }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Image from file…", detail: "png · jpg · gif · webp · svg", hint: "Inserts a picture, shrunk to at most 1600 px and kept inside the Markdown (its data goes at the end of the text), so a saved .md keeps it", onClick: () => onAction("imageFile"), close, keepEditorFocus }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Image from web address", hint: "Inserts ![image](https://) with the address selected: paste the picture's web address over it", onClick: () => onAction("imageUrl"), close, keepEditorFocus }), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        label: "Blank space",
        hint: "Inserts \\space{N}: empty space N body lines tall — room to paste an image into the PDF later",
        onClick: () => onAction("space"),
        close,
        keepEditorFocus
      },
      /* @__PURE__ */ React.createElement("span", { className: "md2ebook-menu-space" }, /* @__PURE__ */ React.createElement(
        NumberBox,
        {
          min: "1",
          max: "200",
          value: spaceLines,
          onChange: (e) => setSpaceLines(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              close();
              onAction("space");
            }
          },
          "aria-label": "Blank space height in lines"
        }
      ), "lines")
    ))), /* @__PURE__ */ React.createElement("span", { className: "md2ebook-fmt-spacer" }), /* @__PURE__ */ React.createElement(
      ToolButton,
      {
        icon: "save",
        disabled: !fileSave.name,
        marked: fileSave.unsaved,
        title: fileSave.name ? `Save to "${fileSave.name}" (${MOD}S)` + (fileSave.unsaved ? " — has unsaved changes" : " — no unsaved changes") : "Save — use Save As first to pick a .md file, then this saves back to it in one click",
        onPress: () => onAction("save")
      }
    ), /* @__PURE__ */ React.createElement(
      ToolButton,
      {
        icon: "saveAs",
        title: `Save As… — save as a new .md file (${fileSave.name ? MOD + SHIFT + "S" : MOD + "S"})`,
        onPress: () => onAction("saveAs")
      }
    ), /* @__PURE__ */ React.createElement(ToolButton, { icon: "copy", title: "Copy all the Markdown to the clipboard", onPress: () => onAction("copy") }), /* @__PURE__ */ React.createElement(ToolButton, { icon: "clear", title: `Clear the editor (${MOD}Z brings the text back)`, onPress: () => onAction("clear") }));
  }

  // apps/Markdown-to-PDF/src/ui/editor/EditorTab.jsx
  var { useState: useState3, useRef: useRef4, useEffect: useEffect3 } = React;
  var CODE_LANG_KEY = "md2pdf.codeLang";
  function loadCodeLang() {
    try {
      const v = localStorage.getItem(CODE_LANG_KEY);
      if (v != null) return v;
    } catch (e) {
    }
    return "json";
  }
  function saveCodeLang(tag) {
    try {
      localStorage.setItem(CODE_LANG_KEY, tag);
    } catch (e) {
    }
  }
  var CODE_FILE_MAX_BYTES = 512 * 1024;
  var CODE_FILE_EXTS = CODE_LANGUAGES.flatMap((l) => l.ext);
  var CODE_PICKER = { id: "md2pdf-code-file", description: "Code or text file", accept: { "text/plain": CODE_FILE_EXTS } };
  var IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
  var IMAGE_PICKER = { id: "md2pdf-image-file", description: "Picture", accept: { "image/*": IMAGE_EXTS } };
  var IMAGE_MAX_SIDE = 1600;
  var DROP_MAX_FILES = 12;
  function shortcutFor(e) {
    if (!(e.ctrlKey || e.metaKey) || e.getModifierState && e.getModifierState("AltGraph")) return null;
    const k = e.key.toLowerCase();
    if (e.altKey && !e.shiftKey) {
      const level = { Digit0: "p", Digit1: "h1", Digit2: "h2", Digit3: "h3" }[e.code];
      return level ? ["block", level] : null;
    }
    if (e.altKey) return null;
    if (e.shiftKey) {
      if (k === "x") return ["inline", "strike"];
      if (k === "e") return ["codeBlock", null];
      const block = { Digit7: "ol", Digit8: "ul", Digit9: "quote" }[e.code];
      return block ? ["block", block] : null;
    }
    return { b: ["inline", "bold"], i: ["inline", "italic"], e: ["inline", "code"], k: ["link"] }[k] || null;
  }
  function EditorTab({ markdown, setMarkdown, editorRef, fileSave, docStatus, setDocStatus, spaceLines, setSpaceLines }) {
    const [blockKind, setBlockKind] = useState3("p");
    const [codeLang, setCodeLangState] = useState3(loadCodeLang);
    const codeFileInputRef = useRef4(null);
    const imageFileInputRef = useRef4(null);
    const touchedRef = useRef4(false);
    const dropRef = useRef4(null);
    const setCodeLang = (tag) => {
      setCodeLangState(tag);
      saveCodeLang(tag);
    };
    const errorText = (err) => err && err.message ? err.message : String(err);
    const refreshBlockKind = () => {
      const el = editorRef.current;
      if (el) setBlockKind(blockAt(el.value, el.selectionStart));
    };
    function applyToEditor(edit) {
      const el = editorRef.current;
      if (!el) return;
      applyToTextarea(el, edit, setMarkdown);
      refreshBlockKind();
    }
    async function handleCopyAll() {
      setDocStatus(null);
      try {
        await copyText(markdown || "");
        setDocStatus({ type: "success", message: "Copied the Markdown source to the clipboard." });
      } catch (err) {
        setDocStatus({ type: "error", message: "Could not copy to the clipboard: " + errorText(err) });
      }
    }
    function handleClear() {
      const el = editorRef.current;
      if (!el || el.value === "") return;
      applyToEditor(replaceAllEdit(el, ""));
      setDocStatus({ type: "success", message: `Cleared the editor. ${MOD}Z brings the text back.` });
    }
    async function handleCodeFile() {
      setDocStatus(null);
      const file = await pickFile(CODE_PICKER);
      if (file === "fallback") {
        if (codeFileInputRef.current) codeFileInputRef.current.click();
        return;
      }
      if (file) await insertCodeFile(file);
    }
    async function insertCodeFile(file) {
      const el = editorRef.current;
      if (!el) return;
      if (file.size > CODE_FILE_MAX_BYTES) {
        setDocStatus({ type: "error", message: `"${file.name}" is too big for a code block (over ${CODE_FILE_MAX_BYTES / 1024} KB).` });
        return;
      }
      let content;
      try {
        content = await file.text();
      } catch (err) {
        setDocStatus({ type: "error", message: `Could not read "${file.name}": ` + errorText(err) });
        return;
      }
      if (content.includes("\0")) {
        setDocStatus({ type: "error", message: `"${file.name}" isn't a text file (a spreadsheet or image can't go in a code block).` });
        return;
      }
      const lang = languageForFile(file.name);
      applyToEditor(insertCodeBlock(el.value, el.selectionStart, el.selectionEnd, content, lang));
      el.focus();
      setDocStatus({ type: "success", message: `Inserted "${file.name}" as a ${lang ? languageLabel(lang) : "plain text"} code block.` });
    }
    function handleCodeFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) insertCodeFile(file);
    }
    async function handleImageFile() {
      setDocStatus(null);
      const file = await pickFile(IMAGE_PICKER);
      if (file === "fallback") {
        if (imageFileInputRef.current) imageFileInputRef.current.click();
        return;
      }
      if (file) await insertImage(file);
    }
    async function insertImage(file, altText) {
      const el = editorRef.current;
      if (!el) return;
      const at = { start: el.selectionStart, end: el.selectionEnd };
      setDocStatus({ type: "success", message: `Adding "${file.name}"…` });
      let picture;
      try {
        picture = await imageFileToDataUrl(file, { maxSide: IMAGE_MAX_SIDE });
      } catch (err) {
        setDocStatus({ type: "error", message: `Could not add "${file.name}": ` + errorText(err) });
        return;
      }
      const alt = altText || (file.name || "image").replace(/\.[^.]+$/, "");
      el.focus();
      el.setSelectionRange(at.start, at.end);
      applyToEditor(insertImageFile(el.value, at.start, at.end, alt, picture.src));
      const kb = Math.round(picture.src.length * 3 / 4 / 1024);
      setDocStatus({ type: "success", message: `Added "${file.name}" (${picture.width} × ${picture.height} px, ${kb} KB). Its data sits at the end of the text.` });
    }
    async function insertDropped({ files, url, alt }) {
      const el = editorRef.current;
      if (!el) return;
      setDocStatus(null);
      if (!touchedRef.current) el.setSelectionRange(el.value.length, el.value.length);
      if (files.length) {
        const taken = files.slice(0, DROP_MAX_FILES);
        for (const file2 of taken) await insertImage(file2);
        if (files.length > taken.length) setDocStatus({ type: "error", message: `Added the first ${taken.length} pictures; ${files.length - taken.length} more were left out.` });
        return;
      }
      setDocStatus({ type: "success", message: "Fetching the picture…" });
      const file = await fetchImageFile(url);
      if (file) {
        await insertImage(file, alt);
        return;
      }
      el.focus();
      el.setSelectionRange(Math.min(el.selectionStart, el.value.length), Math.min(el.selectionEnd, el.value.length));
      applyToEditor(insertImageLink(el.value, el.selectionStart, el.selectionEnd, alt, url));
      setDocStatus({ type: "success", message: "That website doesn't allow copying its pictures, so it is added as a web link. It shows only while the site keeps it online. To keep the picture inside your text, save it to your computer (right-click › Save image as…) and drop the file instead." });
    }
    dropRef.current = insertDropped;
    useEffect3(() => {
      const run = () => {
        const drop = takeDropped();
        if (drop && dropRef.current) dropRef.current(drop);
      };
      run();
      window.addEventListener(DROPPED_EVENT, run);
      return () => window.removeEventListener(DROPPED_EVENT, run);
    }, []);
    function handleImageFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) insertImage(file);
    }
    function runAction(action, arg) {
      if (action === "codeFile") return handleCodeFile();
      if (action === "imageFile") return handleImageFile();
      if (action === "save") return fileSave.onSave();
      if (action === "saveAs") return fileSave.onSaveAs();
      if (action === "copy") return handleCopyAll();
      if (action === "clear") return handleClear();
      const el = editorRef.current;
      if (!el) return;
      const text = el.value;
      const s = el.selectionStart;
      const e = el.selectionEnd;
      if (action === "inline") applyToEditor(toggleInline(text, s, e, arg));
      else if (action === "block") applyToEditor(setBlock(text, s, e, arg));
      else if (action === "link") applyToEditor(insertLink(text, s, e));
      else if (action === "imageUrl") applyToEditor(insertImageUrl(text, s, e));
      else if (action === "codeBlock") {
        const lang = arg == null ? codeLang : arg;
        setCodeLang(lang);
        applyToEditor(toggleCodeBlock(text, s, e, lang));
        el.focus();
      } else if (action === "line") applyToEditor(insertBlockLine(text, s, e, arg));
      else if (action === "space") {
        const n = clampSpaceLines(spaceLines);
        setSpaceLines(String(n));
        applyToEditor(insertBlockLine(text, s, e, "\\space{" + n + "}"));
      }
    }
    function handleEditorKeyDown(e) {
      const shortcut = shortcutFor(e);
      if (!shortcut) return;
      e.preventDefault();
      runAction(shortcut[0], shortcut[1]);
    }
    return /* @__PURE__ */ React.createElement("div", { className: "h-full flex flex-col p-3" }, /* @__PURE__ */ React.createElement(FormatToolbar, { blockKind, fileSave, onAction: runAction, spaceLines, setSpaceLines, codeLang }), /* @__PURE__ */ React.createElement("input", { ref: codeFileInputRef, type: "file", accept: CODE_FILE_EXTS.join(","), onChange: handleCodeFileSelected, className: "hidden" }), /* @__PURE__ */ React.createElement("input", { ref: imageFileInputRef, type: "file", accept: "image/*," + IMAGE_EXTS.join(","), onChange: handleImageFileSelected, className: "hidden" }), /* @__PURE__ */ React.createElement(StatusLine, { status: docStatus, className: "mb-2" }), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        ref: editorRef,
        onFocus: () => {
          touchedRef.current = true;
        },
        onKeyDown: handleEditorKeyDown,
        onSelect: refreshBlockKind,
        className: "md2ebook-editor-textarea flex-1 w-full min-h-[60vh] rounded-md border border-line\n                         bg-ink p-3 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent",
        value: markdown,
        onChange: (e) => setMarkdown(e.target.value),
        spellCheck: false,
        placeholder: "# Start writing your Markdown here…"
      }
    ));
  }

  // apps/Markdown-to-PDF/src/ui/typography/BodyTextSection.jsx
  function paragraphPx(v) {
    const m = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(String(v == null ? "" : v).trim());
    if (!m) return "";
    return m[2] === "rem" || m[2] === "em" ? String(Number((Number(m[1]) * 16).toFixed(2))) : m[1];
  }
  function BodyTextSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(CollapsibleSection, { label: "Body Text" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(ControlField, { label: "Body Font Size (px)", hint: `Default: ${DEFAULTS.fontSize}px` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "1",
        min: "1",
        value: config.fontSize,
        onChange: (v) => updateConfig("fontSize", v),
        placeholder: String(DEFAULTS.fontSize),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: "Line Spacing", hint: `Default: ${DEFAULTS.lineHeight}` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "0.1",
        min: "0.5",
        value: config.lineHeight,
        onChange: (v) => updateConfig("lineHeight", v),
        placeholder: String(DEFAULTS.lineHeight),
        inputMode: "decimal"
      }
    ))), /* @__PURE__ */ React.createElement(
      AlignField,
      {
        label: "Text Alignment",
        value: config.textAlign || "left",
        onChange: (v) => updateConfig("textAlign", v),
        hint: "Code blocks and tables stay left-aligned."
      }
    ), /* @__PURE__ */ React.createElement(ControlField, { label: "Paragraph Spacing (px)", hint: `Default: ${DEFAULTS.paragraphSpacing}px` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "1",
        min: "0",
        value: paragraphPx(config.paragraphSpacing),
        onChange: (v) => updateConfig("paragraphSpacing", v),
        placeholder: DEFAULTS.paragraphSpacing
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: "Base Font Weight (Regular)", hint: `Default: ${DEFAULTS.baseWeight}` }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.baseWeight, onChange: (v) => updateConfig("baseWeight", v) }, /* @__PURE__ */ React.createElement("option", { value: "300" }, "300 — Light"), /* @__PURE__ */ React.createElement("option", { value: "400" }, "400 — Regular"), /* @__PURE__ */ React.createElement("option", { value: "500" }, "500 — Medium"))), /* @__PURE__ */ React.createElement(ControlField, { label: "Bold Text Weight (Strong tags)", hint: `Default: ${DEFAULTS.boldWeight}` }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.boldWeight, onChange: (v) => updateConfig("boldWeight", v) }, BOLD_WEIGHT_OPTIONS.map((w) => /* @__PURE__ */ React.createElement("option", { key: w, value: w }, w)))));
  }

  // apps/Markdown-to-PDF/src/ui/typography/CodeBlocksSection.jsx
  function CodeBlocksSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(CollapsibleSection, { label: "Code Blocks" }, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        checked: config.codeHighlight,
        onChange: (v) => updateConfig("codeHighlight", v),
        label: "Colour code by its language"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "mb-3text-[11px] leading-relaxed text-fg-muted opacity-70" }, "Uses the language after the opening ``` (json, php, liquid, excel-formula…), set with the ", "{ }", " button's arrow in the Editor tab. Blocks without a language stay plain."));
  }

  // apps/Markdown-to-PDF/src/settings/configFile.js
  function readConfigFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("That file is not a config object.");
          }
          resolve(parsed);
        } catch (err) {
          reject(new Error("Could not read that file: " + (err && err.message ? err.message : String(err))));
        }
      };
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsText(file);
    });
  }
  function configFileName(typed) {
    const base = (typed || "config").trim() || "config";
    return /\.json$/i.test(base) ? base : base + ".json";
  }
  function appConfigFolderHint() {
    try {
      if (window.location.protocol !== "file:") return null;
      const path = decodeURIComponent(window.location.pathname);
      const slash = path.lastIndexOf("/");
      let dir = slash > -1 ? path.slice(0, slash) : path;
      if (/^\/[A-Za-z]:/.test(dir)) dir = dir.slice(1);
      return dir ? dir + "/config" : null;
    } catch (e) {
      return null;
    }
  }

  // apps/Markdown-to-PDF/src/ui/typography/ConfigFiles.jsx
  var { useRef: useRef5, useMemo: useMemo2 } = React;
  var CONFIG_PICKER_ID = "md2ebook-config";
  var CONFIG_PICKER_TYPES = { description: "JSON config file", accept: { "application/json": [".json"] } };
  function ConfigFiles({ config, applyConfig, configFilename, setConfigFilename, configStatus, setConfigStatus }) {
    const configFileInputRef = useRef5(null);
    const appFolderHint = useMemo2(appConfigFolderHint, []);
    async function loadConfigFromFile(file) {
      try {
        applyConfig(await readConfigFile(file));
        setConfigStatus({ type: "success", message: `Loaded "${file.name}".` });
      } catch (err) {
        setConfigStatus({ type: "error", message: err.message });
      }
    }
    function handleConfigFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      loadConfigFromFile(file);
    }
    async function handleOpenConfigClick() {
      setConfigStatus(null);
      const file = await pickFile({ id: CONFIG_PICKER_ID, ...CONFIG_PICKER_TYPES });
      if (file === "fallback") {
        if (configFileInputRef.current) configFileInputRef.current.click();
        return;
      }
      if (file) loadConfigFromFile(file);
    }
    async function handleSaveConfig() {
      setConfigStatus(null);
      try {
        const result = await saveTextFile(JSON.stringify(config, null, 2), {
          id: CONFIG_PICKER_ID,
          filename: configFileName(configFilename),
          mimeType: "application/json",
          description: CONFIG_PICKER_TYPES.description,
          extensions: [".json"]
        });
        if (!result) return;
        setConfigStatus({
          type: "success",
          message: result.saved ? `Saved "${result.saved}".` : `Downloaded "${result.downloaded}" (this browser doesn't support a Save As dialog).`
        });
      } catch (err) {
        setConfigStatus({ type: "error", message: "Could not save the config file." });
      }
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Saved Config Files"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1.5" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleOpenConfigClick, className: "log-btn" }, "Open…"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleSaveConfig, className: "log-btn" }, "Save…"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: configFilename,
        onChange: (e) => setConfigFilename(e.target.value),
        placeholder: "config.json",
        className: "min-w-0 flex-1 text-[11px] placeholder-fg-muted"
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: configFileInputRef,
        type: "file",
        accept: "application/json,.json",
        onChange: handleConfigFileSelected,
        className: "hidden"
      }
    )), configStatus ? /* @__PURE__ */ React.createElement(StatusLine, { status: configStatus, className: "mb-3" }) : /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-[11px] leading-relaxed text-fg-muted opacity-70" }, "Open a previously saved settings file, or save the settings below as a new one.", appFolderHint ? /* @__PURE__ */ React.createElement(React.Fragment, null, " ", "A browser can't be pointed at a folder automatically — navigate Open/Save to", " ", /* @__PURE__ */ React.createElement("code", { className: "text-[10px] not-italic" }, appFolderHint), " once (creating it if it doesn't exist yet), and both will default there from then on.") : null));
  }

  // apps/Markdown-to-PDF/src/ui/typography/HeadingsSection.jsx
  function HeadingsSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(HeadingLevel, { level: 1, config, updateConfig }), /* @__PURE__ */ React.createElement(HeadingLevel, { level: 2, config, updateConfig }), /* @__PURE__ */ React.createElement(HeadingLevel, { level: 3, config, updateConfig, alignHint: "H4–H6 use the H3 setting." }));
  }
  function HeadingLevel({ level, config, updateConfig, alignHint }) {
    const h = "h" + level;
    return /* @__PURE__ */ React.createElement(CollapsibleSection, { label: `H${level} Heading` }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(ControlField, { label: `H${level} Size (px)`, hint: `Default: ${DEFAULTS[h + "Size"]}px` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "1",
        min: "1",
        value: config[h + "Size"],
        onChange: (v) => updateConfig(h + "Size", v),
        placeholder: String(DEFAULTS[h + "Size"]),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: `H${level} Weight`, hint: `Default: ${DEFAULTS[h + "Weight"]}` }, /* @__PURE__ */ React.createElement(SelectInput, { value: config[h + "Weight"], onChange: (v) => updateConfig(h + "Weight", v) }, BOLD_WEIGHT_OPTIONS.map((w) => /* @__PURE__ */ React.createElement("option", { key: w, value: w }, w))))), /* @__PURE__ */ React.createElement(HeadingLineControls, { level, config, updateConfig }), /* @__PURE__ */ React.createElement(
      AlignField,
      {
        label: `H${level} Alignment`,
        value: config[h + "TextAlign"],
        onChange: (v) => updateConfig(h + "TextAlign", v),
        allowInherit: true,
        inheritedValue: config.textAlign || "left",
        hint: alignHint
      }
    ));
  }

  // apps/Markdown-to-PDF/src/ui/typography/PageNumbersSection.jsx
  function PageNumbersSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Page Numbers"), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        checked: config.pageNumbersEnabled,
        onChange: (v) => updateConfig("pageNumbersEnabled", v),
        label: "Show page number on every page"
      }
    ), config.pageNumbersEnabled ? /* @__PURE__ */ React.createElement(ControlField, { label: "Page Start From", hint: `Default: ${DEFAULTS.pageStartFrom}` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "1",
        min: "1",
        value: config.pageStartFrom,
        onChange: (v) => updateConfig("pageStartFrom", v),
        placeholder: String(DEFAULTS.pageStartFrom),
        inputMode: "numeric"
      }
    )) : null);
  }

  // apps/Markdown-to-PDF/src/ui/typography/PageSection.jsx
  function PageSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(CollapsibleSection, { label: "Page", defaultOpen: true }, /* @__PURE__ */ React.createElement(ControlField, { label: "Paper Size" }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.paperSize, onChange: (v) => updateConfig("paperSize", v) }, PAPER_SIZE_OPTIONS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, p.label)))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(ControlField, { label: "Margin — Vertical (in)", hint: `Default: ${DEFAULTS.marginVerticalIn}in` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "0.125",
        min: "0",
        value: config.marginVertical,
        onChange: (v) => updateConfig("marginVertical", v),
        placeholder: String(DEFAULTS.marginVerticalIn),
        inputMode: "decimal"
      }
    )), /* @__PURE__ */ React.createElement(ControlField, { label: "Margin — Horizontal (in)", hint: `Default: ${DEFAULTS.marginHorizontalIn}in` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        type: "number",
        step: "0.125",
        min: "0",
        value: config.marginHorizontal,
        onChange: (v) => updateConfig("marginHorizontal", v),
        placeholder: String(DEFAULTS.marginHorizontalIn),
        inputMode: "decimal"
      }
    ))));
  }

  // apps/Markdown-to-PDF/src/ui/typography/TocSection.jsx
  function TocSection({ config, updateConfig }) {
    return /* @__PURE__ */ React.createElement(CollapsibleSection, { label: "Table of Contents" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-[11px] leading-relaxed text-fg-muted opacity-70" }, "Put ", /* @__PURE__ */ React.createElement("code", { className: "text-[10px]" }, "\\toc"), " on its own line (or use + ToC above the editor) where the list should go. Entries link to their headings in the PDF."), /* @__PURE__ */ React.createElement(ControlField, { label: "Include Headings" }, /* @__PURE__ */ React.createElement(SelectInput, { value: config.tocLevels, onChange: (v) => updateConfig("tocLevels", v) }, /* @__PURE__ */ React.createElement("option", { value: "1" }, "H1 only"), /* @__PURE__ */ React.createElement("option", { value: "2" }, "H1 – H2"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "H1 – H3"))), /* @__PURE__ */ React.createElement(ToggleRow, { checked: config.tocShowTitle, onChange: (v) => updateConfig("tocShowTitle", v), label: "Show title" }), config.tocShowTitle ? /* @__PURE__ */ React.createElement(ControlField, { label: "Title", hint: `Default: ${DEFAULTS.tocTitle || "Contents"}. Styled like H2.` }, /* @__PURE__ */ React.createElement(
      TextInput,
      {
        value: config.tocTitle,
        onChange: (v) => updateConfig("tocTitle", v),
        placeholder: String(DEFAULTS.tocTitle || "Contents")
      }
    )) : null, config.tocShowTitle ? /* @__PURE__ */ React.createElement(
      AlignField,
      {
        label: "Title Alignment",
        value: config.tocTitleAlign,
        onChange: (v) => updateConfig("tocTitleAlign", v),
        allowInherit: true,
        linkLabel: "H2",
        inheritedValue: config.h2TextAlign || config.textAlign || "left"
      }
    ) : null, [1, 2, 3].filter((n) => n <= (parseInt(config.tocLevels, 10) || 3)).map((n) => /* @__PURE__ */ React.createElement(TocLevelStyle, { key: n, level: n, config, updateConfig })), /* @__PURE__ */ React.createElement("p", { className: "-mt-2 mb-3 text-[11px] text-fg-muted opacity-70" }, "Leave a box blank to match body text."), /* @__PURE__ */ React.createElement(ToggleRow, { checked: config.tocPageNumbers, onChange: (v) => updateConfig("tocPageNumbers", v), label: "Show page numbers" }), config.tocPageNumbers ? /* @__PURE__ */ React.createElement(ToggleRow, { checked: config.tocDotLeaders, onChange: (v) => updateConfig("tocDotLeaders", v), label: "Dotted line to page number" }) : null, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        checked: config.tocPageBreakAfter,
        onChange: (v) => updateConfig("tocPageBreakAfter", v),
        label: "Start a new page after the contents"
      }
    ));
  }

  // apps/Markdown-to-PDF/src/ui/FontCombobox.jsx
  var { useState: useState4, useEffect: useEffect4, useRef: useRef6, useMemo: useMemo3 } = React;
  function FontCombobox({ fontOptions, setFontOptions, value, onChange }) {
    const [query, setQuery] = useState4(value || "");
    const [open, setOpen] = useState4(false);
    const [status, setStatus] = useState4(null);
    const [loadingFonts, setLoadingFonts] = useState4(false);
    const containerRef = useRef6(null);
    useEffect4(() => {
      setQuery(value || "");
    }, [value]);
    useEffect4(() => {
      function handleClickOutside(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setOpen(false);
          setQuery(value || "");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);
    const filtered = useMemo3(() => {
      const q = query.trim().toLowerCase();
      if (!q) return fontOptions;
      return fontOptions.filter((f) => f.toLowerCase().includes(q));
    }, [fontOptions, query]);
    function selectFont(font) {
      onChange(font);
      setQuery(font);
      setOpen(false);
    }
    async function handleLoadLocalFonts() {
      setStatus(null);
      if (!("queryLocalFonts" in window)) {
        setStatus({
          type: "error",
          message: "Local Font Access is not supported in this browser. Try Chrome or Edge 103+ (over HTTPS or localhost)."
        });
        return;
      }
      setLoadingFonts(true);
      try {
        const availableFonts = await window.queryLocalFonts();
        const families = Array.from(new Set(availableFonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b));
        setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
        setStatus({
          type: "success",
          message: `Loaded ${families.length} local system fonts.`
        });
      } catch (err) {
        const denied = err && (err.name === "NotAllowedError" || /permission/i.test(err.message || ""));
        setStatus({
          type: "error",
          message: denied ? "Permission to read local fonts was denied." : "Could not load local fonts: " + (err && err.message ? err.message : String(err))
        });
      } finally {
        setLoadingFonts(false);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { ref: containerRef, className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setOpen(true);
        },
        onFocus: () => setOpen(true),
        placeholder: "Search fonts…",
        className: "w-full text-sm pr-8 placeholder-fg-muted"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setOpen((o) => !o),
        className: "absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg bg-transparent border-0 p-0",
        "aria-label": "Toggle font list"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React.createElement(
        "path",
        {
          fillRule: "evenodd",
          d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
          clipRule: "evenodd"
        }
      ))
    )), open ? /* @__PURE__ */ React.createElement("div", { className: "absolute z-20 mt-1 w-full rounded-md border border-line bg-ink-card shadow-lg" }, /* @__PURE__ */ React.createElement("ul", { className: "md2ebook-combobox-list py-1" }, filtered.length === 0 ? /* @__PURE__ */ React.createElement("li", { className: "px-3 py-2 text-sm text-fg-muted" }, 'No fonts match "', query, '"') : filtered.map((font) => /* @__PURE__ */ React.createElement("li", { key: font }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => selectFont(font),
        style: {
          fontFamily: `'${font}', sans-serif`
        },
        className: "w-full text-left px-3 py-1.5 text-sm border-0 hover:bg-ink-alt " + (font === value ? "bg-ink-alt text-accent font-medium" : "bg-transparent text-fg font-normal")
      },
      font
    ))))) : null, /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleLoadLocalFonts,
        disabled: loadingFonts,
        className: "inline-flex items-center gap-1.5 disabled:opacity-50"
      },
      loadingFonts ? /* @__PURE__ */ React.createElement("svg", { className: "md2ebook-spinner", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", opacity: "0.25" }), /* @__PURE__ */ React.createElement("path", { d: "M22 12a10 10 0 0 0-10-10", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" })) : /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 20 20", fill: "currentColor" }, /* @__PURE__ */ React.createElement("path", { d: "M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" })),
      "Load Local System Fonts"
    )), status ? /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-[11px] " + (status.type === "error" ? "text-red-400" : "text-success") }, status.message) : null);
  }

  // apps/Markdown-to-PDF/src/ui/typography/TypefaceSection.jsx
  function TypefaceSection({ config, updateConfig, fontOptions, setFontOptions }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionLabel, null, "Typeface"), /* @__PURE__ */ React.createElement(ControlField, { label: "Font Family" }, /* @__PURE__ */ React.createElement(
      FontCombobox,
      {
        fontOptions,
        setFontOptions,
        value: config.fontFamily,
        onChange: (v) => updateConfig("fontFamily", v)
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-fg-muted mb-1.5" }, "Heading Font Family"), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        checked: config.headingFontSameAsBody,
        label: "Same as body font",
        onChange: (same) => {
          updateConfig("headingFontSameAsBody", same);
          if (!same && !String(config.headingFontFamily || "").trim()) updateConfig("headingFontFamily", config.fontFamily);
        }
      }
    ), !config.headingFontSameAsBody ? /* @__PURE__ */ React.createElement(ControlField, { label: "Custom Heading Font", hint: "Used for H1–H6. Leave blank to fall back to the body font." }, /* @__PURE__ */ React.createElement(
      FontCombobox,
      {
        fontOptions,
        setFontOptions,
        value: config.headingFontFamily,
        onChange: (v) => updateConfig("headingFontFamily", v)
      }
    )) : null);
  }

  // apps/Markdown-to-PDF/src/ui/Sidebar.jsx
  var { useState: useState5 } = React;
  function Sidebar({ activeTab, setActiveTab, markdown, setMarkdown, editorRef, fileSave, docStatus, setDocStatus, config, updateConfig, applyConfig, fontOptions, setFontOptions, resizer }) {
    const [spaceLines, setSpaceLines] = useState5("5");
    const [configFilename, setConfigFilename] = useState5("config.json");
    const [configStatus, setConfigStatus] = useState5(null);
    const sectionProps = { config, updateConfig };
    return /* @__PURE__ */ React.createElement("aside", { className: "md2ebook-sidebar" }, resizer, /* @__PURE__ */ React.createElement("div", { className: "tabbar" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setActiveTab("editor"), className: "tab" + (activeTab === "editor" ? " active" : "") }, "Editor"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setActiveTab("typography"), className: "tab" + (activeTab === "typography" ? " active" : "") }, "Typography")), /* @__PURE__ */ React.createElement("div", { className: "md2ebook-sidebar-content" }, activeTab === "editor" ? /* @__PURE__ */ React.createElement(
      EditorTab,
      {
        markdown,
        setMarkdown,
        editorRef,
        fileSave,
        docStatus,
        setDocStatus,
        spaceLines,
        setSpaceLines
      }
    ) : /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement(
      ConfigFiles,
      {
        config,
        applyConfig,
        configFilename,
        setConfigFilename,
        configStatus,
        setConfigStatus
      }
    ), /* @__PURE__ */ React.createElement(TypefaceSection, { ...sectionProps, fontOptions, setFontOptions }), /* @__PURE__ */ React.createElement(PageSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(BodyTextSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(HeadingsSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(CodeBlocksSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(TocSection, { ...sectionProps }), /* @__PURE__ */ React.createElement(PageNumbersSection, { ...sectionProps }))));
  }

  // apps/Markdown-to-PDF/src/ui/App.jsx
  var { useEffect: useEffect5, useState: useState6, useRef: useRef7, useCallback } = React;
  var DOCUMENT_PICKER_ID = "md2ebook-document";
  function App() {
    const [markdown, setMarkdown] = useState6(SAMPLE_MARKDOWN);
    const [config, setConfig] = useState6(INITIAL_CONFIG);
    const [activeTab, setActiveTab] = useState6("editor");
    const [fontOptions, setFontOptions] = useState6(DEFAULT_FONT_OPTIONS);
    const [isExporting, setIsExporting] = useState6(false);
    const [exportError, setExportError] = useState6(null);
    const [isSendingToArranger, setIsSendingToArranger] = useState6(false);
    const bodyRef = useRef7(null);
    const markdownRef = useRef7(markdown);
    markdownRef.current = markdown;
    useEffect5(() => {
      warnBeforeLeaving(() => markdownRef.current.trim() !== "" && markdownRef.current !== SAMPLE_MARKDOWN);
    }, []);
    const tocPagesRef = useRef7(null);
    const handleTocPages = useCallback((map) => {
      tocPagesRef.current = map;
    }, []);
    const updateConfig = useCallback((key, value) => {
      setConfig((prev) => ({
        ...prev,
        [key]: value
      }));
    }, []);
    const applyConfig = useCallback((loaded) => {
      if (loaded && loaded.headingTextAlign) {
        loaded = {
          ...loaded
        };
        ["h1TextAlign", "h2TextAlign", "h3TextAlign"].forEach((k) => {
          if (!loaded[k]) loaded[k] = loaded.headingTextAlign;
        });
      }
      setConfig((prev) => {
        const next = {
          ...prev
        };
        Object.keys(prev).forEach((key) => {
          if (!Object.prototype.hasOwnProperty.call(loaded, key)) return;
          const value = loaded[key];
          if (BOOLEAN_CONFIG_KEYS.includes(key)) {
            next[key] = typeof value === "string" ? !/^(false|0|no|off|)$/i.test(value.trim()) : Boolean(value);
          } else {
            next[key] = value === null || value === void 0 ? "" : String(value);
          }
        });
        return next;
      });
    }, []);
    const [docStatus, setDocStatus] = useState6(null);
    const editorRef = useRef7(null);
    const documentFileInputRef = useRef7(null);
    const errorText = (err) => err && err.message ? err.message : String(err);
    const activeTabRef = useRef7(activeTab);
    activeTabRef.current = activeTab;
    useEffect5(() => installImageDrop({
      label: "Drop a picture to add it to your text",
      onDrop: (drop) => {
        queueDropped(drop);
        if (activeTabRef.current !== "editor") ReactDOM.flushSync(() => setActiveTab("editor"));
        window.dispatchEvent(new Event(DROPPED_EVENT));
      },
      onOther: () => setDocStatus({ type: "error", message: "That isn't a picture. Drop a .png, .jpg, .gif, .webp or .svg file." })
    }), []);
    function replaceAllText(text) {
      if (activeTab !== "editor") ReactDOM.flushSync(() => setActiveTab("editor"));
      const el = editorRef.current;
      if (!el) {
        setMarkdown(text);
        return;
      }
      applyToTextarea(el, replaceAllEdit(el, text), setMarkdown);
      el.scrollTop = 0;
    }
    const [savedFile, setSavedFile] = useState6(null);
    function handleLoadSample() {
      setDocStatus(null);
      setSavedFile(null);
      replaceAllText(SAMPLE_MARKDOWN);
    }
    async function handleImportFile(file) {
      setDocStatus(null);
      const name = file && file.name || "document";
      try {
        const text = await documentToMarkdown(file);
        setSavedFile(null);
        replaceAllText(text);
        setDocStatus({ type: "success", message: `Opened "${name}". ${MOD}Z brings back the text it replaced.` });
      } catch (err) {
        setDocStatus({ type: "error", message: "Could not open that file: " + errorText(err) });
      }
    }
    function handleDocumentFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) handleImportFile(file);
    }
    async function handleOpenFile() {
      setDocStatus(null);
      const file = await pickFile({ id: DOCUMENT_PICKER_ID, ...DOCUMENT_PICKER_TYPES });
      if (file === "fallback") {
        if (documentFileInputRef.current) documentFileInputRef.current.click();
        return;
      }
      if (file) await handleImportFile(file);
    }
    async function handleSaveMarkdown() {
      setDocStatus(null);
      try {
        const text = markdownRef.current || "";
        const result = await saveTextFile(text, {
          id: DOCUMENT_PICKER_ID,
          filename: deriveFilename(markdownRef.current).replace(/\.pdf$/, ".md"),
          mimeType: "text/markdown",
          description: "Markdown file",
          extensions: [".md"]
        });
        if (!result) return;
        setSavedFile(result.handle ? { handle: result.handle, name: result.saved, text } : null);
        setDocStatus({
          type: "success",
          message: result.saved ? `Saved "${result.saved}".` : `Downloaded "${result.downloaded}" (this browser doesn't support a Save As dialog).`
        });
      } catch (err) {
        setDocStatus({ type: "error", message: "Could not save the Markdown file." });
      }
    }
    async function handleQuickSave() {
      if (!savedFile) return handleSaveMarkdown();
      setDocStatus(null);
      const text = markdownRef.current || "";
      try {
        await writeTextToHandle(savedFile.handle, text);
        setSavedFile({ ...savedFile, text });
        setDocStatus({ type: "success", message: `Saved "${savedFile.name}".` });
      } catch (err) {
        setDocStatus({ type: "error", message: `Could not save "${savedFile.name}": ${errorText(err)} Use File → Save as Markdown… to pick the file again.` });
      }
    }
    const fileShortcutsRef = useRef7(null);
    fileShortcutsRef.current = { o: handleOpenFile, s: handleQuickSave, "shift+s": handleSaveMarkdown };
    useEffect5(() => {
      function onKeyDown(e) {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        const action = fileShortcutsRef.current[(e.shiftKey ? "shift+" : "") + e.key.toLowerCase()];
        if (!action) return;
        e.preventDefault();
        action();
      }
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
    function deriveFilename(md) {
      const match = /^#\s+(.+)$/m.exec(md || "");
      if (!match) return "md-to-pdf-converter.pdf";
      const slug = match[1].trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
      return (slug || "md2ebook") + ".pdf";
    }
    async function handleExport() {
      setExportError(null);
      setIsExporting(true);
      try {
        await exportToPdf(
          markdown,
          {
            ...config,
            filename: deriveFilename(markdown)
          },
          {
            tocPages: tocPagesRef.current
          }
        );
      } catch (err) {
        setExportError(err && err.message || "Something went wrong while opening the print dialog.");
      } finally {
        setIsExporting(false);
      }
    }
    async function handleSendToZineArranger() {
      if (isSendingToArranger) return;
      setExportError(null);
      setIsSendingToArranger(true);
      let iframe = null;
      async function buildBytes() {
        const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
        const DPI = 96;
        const rasterResult = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            window.removeEventListener("message", onRasterMessage);
            reject(new Error("Rendering the document for export timed out."));
          }, 6e4);
          function onRasterMessage(event) {
            if (!iframe || event.source !== iframe.contentWindow) return;
            const data = event.data;
            if (!data || data.source !== "md2ebook-rasterize") return;
            if (data.error) {
              clearTimeout(timeoutId);
              window.removeEventListener("message", onRasterMessage);
              reject(new Error(data.error));
              return;
            }
            if (!Array.isArray(data.images)) return;
            clearTimeout(timeoutId);
            window.removeEventListener("message", onRasterMessage);
            resolve(data);
          }
          window.addEventListener("message", onRasterMessage);
          iframe = document.createElement("iframe");
          iframe.setAttribute("aria-hidden", "true");
          iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
          iframe.style.position = "fixed";
          iframe.style.left = "-99999px";
          iframe.style.top = "0";
          iframe.style.border = "0";
          iframe.width = String(Math.round(paper.widthIn * DPI));
          iframe.height = String(Math.round(paper.heightIn * DPI));
          iframe.srcdoc = renderRasterizationDocument(markdown, config);
          document.body.appendChild(iframe);
        });
        const { PDFDocument } = window.PDFLib;
        const outDoc = await PDFDocument.create();
        const pageWidthPts = rasterResult.widthIn * 72;
        const pageHeightPts = rasterResult.heightIn * 72;
        for (const img of rasterResult.images) {
          const pngImage = await outDoc.embedPng(img.buffer);
          const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
          outPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pageWidthPts,
            height: pageHeightPts
          });
        }
        return outDoc.save();
      }
      try {
        await sendPdfToZineArranger(buildBytes, deriveFilename(markdown));
      } catch (err) {
        setExportError("Couldn't send to ZineArranger — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        setIsSendingToArranger(false);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "md2ebook-app" }, /* @__PURE__ */ React.createElement(
      Header,
      {
        onOpenFile: handleOpenFile,
        onSaveMarkdown: handleSaveMarkdown,
        onQuickSave: handleQuickSave,
        savedFileName: savedFile ? savedFile.name : null,
        onLoadSample: handleLoadSample,
        onExport: handleExport,
        isExporting,
        onSendToZineArranger: handleSendToZineArranger,
        isSendingToArranger
      }
    ), exportError ? /* @__PURE__ */ React.createElement("div", { className: "md2ebook-no-print flex-none bg-red-950/40 border-b border-red-900 text-red-300 text-xs px-5 py-2 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", null, "PDF export failed: ", exportError), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setExportError(null),
        className: "text-red-400 hover:text-red-300 font-medium ml-4 bg-transparent border-0 p-0"
      },
      "Dismiss"
    )) : null, /* @__PURE__ */ React.createElement("div", { className: "md2ebook-body", ref: bodyRef }, /* @__PURE__ */ React.createElement(PreviewCanvas, { markdown, config, onTocPages: handleTocPages, onPaperSizeChange: (v) => updateConfig("paperSize", v) }), /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        activeTab,
        setActiveTab,
        markdown,
        setMarkdown,
        editorRef,
        fileSave: {
          name: savedFile ? savedFile.name : null,
          unsaved: savedFile ? markdown !== savedFile.text : false,
          onSave: handleQuickSave,
          onSaveAs: handleSaveMarkdown
        },
        docStatus,
        setDocStatus,
        config,
        updateConfig,
        applyConfig,
        fontOptions,
        setFontOptions,
        resizer: /* @__PURE__ */ React.createElement(PanelResizer, { bodyRef })
      }
    )), /* @__PURE__ */ React.createElement("input", { ref: documentFileInputRef, type: "file", accept: DOCUMENT_INPUT_ACCEPT, onChange: handleDocumentFileSelected, className: "hidden" }));
  }

  // shared/js/displaySettings.js
  var EVENT = "zn-display-prefs";
  var clampTo = (v, s) => Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : s.initial;
  var snap = (v, s) => clampTo(Math.round(v / s.step) * s.step, s);
  var tidy = (v) => Math.round(v * 1e3) / 1e3;
  function installDisplaySettings(options) {
    const { storageKey, sliders = [], groups = [], title = "Display" } = options;
    const checks = groups.flatMap((g) => g.checks || []);
    const choices = groups.flatMap((g) => g.choices || []);
    const optionValues = (ch, o) => Object.fromEntries(ch.flags.map((f) => [f.key, o.values[f.key] === true]));
    const optionIndex = (ch, p) => ch.options.findIndex((o) => ch.flags.every((f) => p[f.key] === (o.values[f.key] === true)));
    const initialOption = (ch) => ch.options[ch.initial || 0];
    const defaults = {};
    for (const s of sliders) defaults[s.key] = s.initial;
    for (const c of checks) defaults[c.key] = false;
    for (const ch of choices) Object.assign(defaults, optionValues(ch, initialOption(ch)));
    function load() {
      let saved = {};
      try {
        saved = JSON.parse(localStorage.getItem(storageKey)) || {};
      } catch (e) {
      }
      const prefs2 = {};
      for (const s of sliders) prefs2[s.key] = clampTo(Number(saved[s.key]), s);
      for (const c of checks) prefs2[c.key] = saved[c.key] === true;
      for (const ch of choices) {
        for (const f of ch.flags) prefs2[f.key] = saved[f.key] === true;
        if (optionIndex(ch, prefs2) < 0) Object.assign(prefs2, optionValues(ch, initialOption(ch)));
      }
      return prefs2;
    }
    function apply() {
      const root2 = document.documentElement;
      for (const s of sliders) root2.style.setProperty(s.cssVar, s.cssValue ? s.cssValue(prefs[s.key]) : String(prefs[s.key]));
      for (const c of checks) if (c.htmlClass) root2.classList.toggle(c.htmlClass, prefs[c.key]);
      for (const ch of choices) for (const f of ch.flags) if (f.htmlClass) root2.classList.toggle(f.htmlClass, prefs[f.key]);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { ...prefs } }));
    }
    function set(changes) {
      prefs = { ...prefs, ...changes };
      try {
        localStorage.setItem(storageKey, JSON.stringify(prefs));
      } catch (e) {
      }
      apply();
      refresh();
    }
    let prefs = load();
    apply();
    const el = (tag, cls, attrs = {}) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      return n;
    };
    const floating = options.mount === void 0 || options.mount === null;
    const wrap = el("div", "zn-display" + (floating ? " zn-display-floating" : ""));
    const panel = el("div", "zn-display-panel", { role: "dialog", "aria-label": title + " settings" });
    panel.hidden = true;
    const head = el("div", "zn-display-title");
    head.textContent = title;
    panel.appendChild(head);
    const sliderViews = sliders.map((s) => {
      const row = el("div", "zn-display-row");
      const label = el("div", "zn-display-label");
      const name = el("span");
      name.textContent = s.label;
      const value = el("span", "zn-display-value");
      label.append(name, value);
      const control = el("div", "zn-display-control");
      const minus = el("button", "zn-display-step", { type: "button", "aria-label": "Smaller " + s.label.toLowerCase() });
      minus.textContent = "−";
      const range = el("input", "", { type: "range", min: s.min, max: s.max, step: s.step, "aria-label": s.label });
      const plus = el("button", "zn-display-step", { type: "button", "aria-label": "Larger " + s.label.toLowerCase() });
      plus.textContent = "+";
      control.append(minus, range, plus);
      row.append(label, control);
      panel.appendChild(row);
      minus.addEventListener("click", () => set({ [s.key]: tidy(snap(prefs[s.key] - s.step, s)) }));
      plus.addEventListener("click", () => set({ [s.key]: tidy(snap(prefs[s.key] + s.step, s)) }));
      range.addEventListener("input", () => set({ [s.key]: tidy(snap(Number(range.value), s)) }));
      return { s, value, minus, range, plus };
    });
    const checkViews = [];
    const choiceViews = [];
    for (const g of groups) {
      if (g.title) {
        const sub = el("div", "zn-display-subtitle");
        sub.textContent = g.title;
        panel.appendChild(sub);
      }
      const list = el("div", "zn-display-checks");
      for (const c of g.checks || []) {
        const label = el("label", "zn-display-check");
        const box = el("input", "", { type: "checkbox" });
        const text = el("span");
        text.textContent = c.label;
        label.append(box, text);
        list.appendChild(label);
        box.addEventListener("change", () => {
          const next = c.showMeans ? !box.checked : box.checked;
          if (next && c.confirm) {
            refresh();
            askConfirm(c.confirm).then((ok) => {
              if (ok) set({ [c.key]: true });
            });
            return;
          }
          set({ [c.key]: next });
        });
        checkViews.push({ c, label, box });
      }
      for (const ch of g.choices || []) {
        const label = el("label", "zn-display-choice");
        if (ch.hint) label.title = ch.hint;
        const text = el("span");
        text.textContent = ch.label;
        const select = el("select", "", { "aria-label": ch.label });
        ch.options.forEach((o, i) => {
          const opt = el("option", "", { value: String(i) });
          opt.textContent = o.label;
          select.appendChild(opt);
        });
        label.append(text, select);
        list.appendChild(label);
        select.addEventListener("change", () => set(optionValues(ch, ch.options[Number(select.value)])));
        choiceViews.push({ ch, select });
      }
      panel.appendChild(list);
    }
    const foot = el("div", "zn-display-foot");
    const note = el("span", "zn-display-note");
    note.textContent = "Saved in this browser";
    const reset = el("button", "zn-display-reset", { type: "button" });
    reset.textContent = "Reset";
    reset.addEventListener("click", () => set(defaults));
    foot.append(note, reset);
    panel.appendChild(foot);
    const gear = el("button", "zn-display-gear", {
      type: "button",
      title: title + " settings",
      "aria-label": title + " settings",
      "aria-expanded": "false"
    });
    gear.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    if (options.about) {
      const about = el("div", "zn-display-about");
      about.append(options.about.text + " ");
      (options.about.links || []).forEach((l, i) => {
        if (i) about.append(" · ");
        const a = el("a", "", { href: l.href, target: "_blank", rel: "noopener" });
        a.textContent = l.label;
        about.append(a);
      });
      panel.appendChild(about);
    }
    wrap.append(panel, gear);
    if (floating) document.body.appendChild(wrap);
    else if (options.mount) options.mount.appendChild(wrap);
    function askConfirm(c) {
      return new Promise((resolve) => {
        const backdrop = el("div", "zn-confirm-backdrop");
        const box = el("div", "zn-confirm", { role: "dialog", "aria-modal": "true", "aria-label": c.title });
        const h = el("div", "zn-confirm-title");
        h.textContent = c.title;
        const t = el("div", "zn-confirm-text");
        t.textContent = c.text;
        const row = el("div", "zn-confirm-actions");
        const cancel = el("button", "", { type: "button" });
        cancel.textContent = c.cancel || "Cancel";
        const ok = el("button", "zn-confirm-ok", { type: "button" });
        ok.textContent = c.ok || "OK";
        row.append(cancel, ok);
        box.append(h, t, row);
        backdrop.appendChild(box);
        document.body.appendChild(backdrop);
        const done = (v) => {
          document.removeEventListener("keydown", onKey, true);
          backdrop.remove();
          resolve(v);
        };
        const onKey = (e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            done(false);
          }
        };
        document.addEventListener("keydown", onKey, true);
        cancel.addEventListener("click", () => done(false));
        ok.addEventListener("click", () => done(true));
        backdrop.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          if (e.target === backdrop) done(false);
        });
        backdrop.addEventListener("mousedown", (e) => e.stopPropagation());
        ok.focus();
      });
    }
    function refresh() {
      for (const v of sliderViews) {
        const n = prefs[v.s.key];
        v.value.textContent = n + (v.s.unit || "");
        v.range.value = String(n);
        v.minus.disabled = n <= v.s.min;
        v.plus.disabled = n >= v.s.max;
      }
      for (const v of checkViews) {
        const on = prefs[v.c.key];
        v.box.checked = v.c.showMeans ? !on : on;
        v.label.title = v.c.hint || "";
      }
      for (const v of choiceViews) v.select.value = String(Math.max(0, optionIndex(v.ch, prefs)));
      reset.disabled = Object.keys(defaults).every((k) => prefs[k] === defaults[k]);
    }
    refresh();
    function setOpen(open) {
      panel.hidden = !open;
      gear.classList.toggle("open", open);
      gear.setAttribute("aria-expanded", String(open));
    }
    gear.addEventListener("click", () => setOpen(panel.hidden));
    document.addEventListener("pointerdown", (e) => {
      if (!panel.hidden && !wrap.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) setOpen(false);
    });
    wrap.addEventListener("pointerdown", (e) => e.stopPropagation());
    wrap.addEventListener("mousedown", (e) => e.stopPropagation());
    return { get prefs() {
      return { ...prefs };
    }, set, element: wrap };
  }

  // shared/js/about.js
  var REPO_URL = "https://github.com/erictzh/ZineNow";
  var ABOUT = {
    text: "ZineNow is free software (AGPL-3.0-or-later).",
    links: [
      { label: "Source code", href: REPO_URL },
      { label: "Third-party notices", href: REPO_URL + "/blob/main/THIRD-PARTY-NOTICES.md" }
    ]
  };
  var POLICY_URL = REPO_URL + "/blob/main/docs/AI-MODELS-POLICY.md";

  // apps/Markdown-to-PDF/src/ui/displaySettings.js
  function installMd2pdfDisplaySettings() {
    return installDisplaySettings({
      storageKey: "md2ebook-ui-prefs",
      about: ABOUT,
      // where the source code is (a small line in the gear pop-up)
      sliders: [
        { key: "editorFontSize", label: "Editor text size", min: 10, max: 28, step: 0.5, initial: 13.5, unit: "px", cssVar: "--md2ebook-editor-font-size", cssValue: (v) => v + "px" },
        { key: "uiScale", label: "Interface size", min: 75, max: 175, step: 5, initial: 100, unit: "%", cssVar: "--zn-ui-zoom", cssValue: (v) => String(v / 100) }
      ],
      groups: [
        { title: "Preview", checks: [
          { key: "darkPaper", label: "Dark paper", htmlClass: "md2ebook-dark-paper", hint: "Shows the pages dark while you work. Only the preview: the PDF stays white." }
        ] },
        { title: "Show", checks: [
          { key: "hideHeader", label: "Top bar", showMeans: true, htmlClass: "md2ebook-hide-header", hint: "The title, File menu and export buttons" }
        ], choices: [
          {
            label: "Panels",
            hint: "Preview: the pages and their status bar. Editor panel: the Editor and Typography tabs.",
            initial: 2,
            flags: [{ key: "hidePreview", htmlClass: "md2ebook-hide-preview" }, { key: "hideSidebar", htmlClass: "md2ebook-hide-sidebar" }],
            options: [
              { label: "Preview (left) only", values: { hideSidebar: true } },
              { label: "Editor panel (right) only", values: { hidePreview: true } },
              { label: "Show both", values: {} }
            ]
          }
        ] }
      ]
    });
  }

  // apps/Markdown-to-PDF/src/main.jsx
  installInputMode();
  installNumberFields();
  installMd2pdfDisplaySettings();
  var rootElement = document.getElementById("root");
  var root = ReactDOM.createRoot(rootElement);
  root.render(/* @__PURE__ */ React.createElement(App, null));
})();
