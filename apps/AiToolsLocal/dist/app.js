// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.
(() => {
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

  // shared/js/imageHandoff.js
  var ZEDITOR_READY_MESSAGE = "zeditor-ready";
  var AITOOLS_READY_MESSAGE = "aitools-ready";
  var HANDOFF_IMAGE_MESSAGE = "zinenow-handoff-image";
  async function sendImageToApp(path, readyType, getBlob, filename, meta) {
    const win = window.open(path, "_blank");
    if (!win) throw new Error("The browser blocked the new tab. Allow pop-ups for this page and try again.");
    const ready = new Promise((resolve, reject) => {
      const timer7 = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("The other app didn't answer. It may still be loading: try again in a moment."));
      }, 2e4);
      function onMessage(e) {
        if (e.source !== win || e.origin !== location.origin || !e.data || e.data.type !== readyType) return;
        clearTimeout(timer7);
        window.removeEventListener("message", onMessage);
        resolve();
      }
      window.addEventListener("message", onMessage);
    });
    const made = await getBlob();
    const blob = made.blob || made;
    const buffer = await blob.arrayBuffer();
    await ready;
    win.postMessage({ type: HANDOFF_IMAGE_MESSAGE, buffer, filename, mime: blob.type || "image/png", meta: made.blob ? made.meta : meta }, location.origin, [buffer]);
  }
  var sendImageToZEditor = (getBlob, filename, meta) => sendImageToApp("../ZEditor/index.html", ZEDITOR_READY_MESSAGE, getBlob, filename, meta);
  function hasOpener() {
    try {
      return Boolean(window.opener && window.opener !== window && !window.opener.closed && window.opener.location.origin === location.origin);
    } catch (e) {
      return false;
    }
  }
  async function sendImageToOpener(getBlob, filename, meta) {
    if (!hasOpener()) throw new Error("The app that opened this one has been closed.");
    const made = await getBlob();
    const blob = made.blob || made;
    const buffer = await blob.arrayBuffer();
    window.opener.postMessage({ type: HANDOFF_IMAGE_MESSAGE, buffer, filename, mime: blob.type || "image/png", meta: made.blob ? made.meta : meta }, location.origin, [buffer]);
  }
  function listenForHandoffImage(readyType, onImage) {
    let ping = 0, n = 0, pinging = true;
    const stopPing = () => {
      pinging = false;
      clearInterval(ping);
    };
    function onMessage(e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== HANDOFF_IMAGE_MESSAGE || !(e.data.buffer instanceof ArrayBuffer)) return;
      stopPing();
      onImage(new File([e.data.buffer], e.data.filename || "picture.png", { type: e.data.mime || "image/png" }), e.source === window.opener, e.data.meta);
    }
    window.addEventListener("message", onMessage);
    if (window.opener && window.opener !== window) {
      const send = () => {
        if (!pinging) return;
        try {
          window.opener.postMessage({ type: readyType }, location.origin);
        } catch (err) {
        }
        if (++n > 40) stopPing();
      };
      ping = setInterval(send, 500);
      send();
    }
    return () => {
      stopPing();
      window.removeEventListener("message", onMessage);
    };
  }

  // shared/js/numberFields.js
  var HOLD_MS = 450;
  var REPEAT_MS = 80;
  var isNumberBox = (el9) => el9 instanceof HTMLInputElement && el9.type === "number";
  var allowsEmpty = (el9) => el9.hasAttribute("data-allow-empty");
  var writeValue = (el9, text) => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el9, text);
  var held = /* @__PURE__ */ new WeakMap();
  function holdEmpty(el9) {
    if (held.has(el9)) return;
    const own = Object.getOwnPropertyDescriptor(el9, "value");
    held.set(el9, own || null);
    if (!own || !own.get || !own.configurable) return;
    Object.defineProperty(el9, "value", {
      configurable: true,
      enumerable: own.enumerable,
      get() {
        return own.get.call(this);
      },
      set() {
      }
    });
  }
  function releaseEmpty(el9) {
    if (!held.has(el9)) return;
    const own = held.get(el9);
    held.delete(el9);
    if (own) Object.defineProperty(el9, "value", own);
    else delete el9.value;
  }
  function makeButton(dir) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "zn-num-btn";
    b.tabIndex = -1;
    b.dataset.znStep = String(dir);
    b.textContent = dir < 0 ? "−" : "+";
    b.setAttribute("aria-label", dir < 0 ? "Decrease" : "Increase");
    b.title = dir < 0 ? "Decrease" : "Increase";
    return b;
  }
  function wrapNumberInput(input) {
    if (!input || !input.parentNode || input.closest(".zn-num") || input.hasAttribute("data-no-steppers")) return input;
    const wrap = document.createElement("span");
    wrap.className = "zn-num";
    input.parentNode.insertBefore(wrap, input);
    wrap.append(input, makeButton(-1), makeButton(1));
    return wrap;
  }
  function wrapNumberInputs(root = document) {
    root.querySelectorAll('input[type="number"]').forEach(wrapNumberInput);
  }
  function installNumberFields() {
    const lastGood = /* @__PURE__ */ new WeakMap();
    document.addEventListener("focusin", (e) => {
      if (isNumberBox(e.target) && e.target.value !== "") lastGood.set(e.target, e.target.value);
    }, true);
    document.addEventListener("input", (e) => {
      const el9 = e.target;
      if (!isNumberBox(el9)) return;
      if (el9.value !== "") {
        releaseEmpty(el9);
        lastGood.set(el9, el9.value);
        return;
      }
      if (allowsEmpty(el9) || document.activeElement !== el9) return;
      holdEmpty(el9);
      e.stopImmediatePropagation();
    }, true);
    const restoreIfEmpty = (el9) => {
      if (el9.value !== "" || allowsEmpty(el9) || !lastGood.has(el9)) {
        releaseEmpty(el9);
        return false;
      }
      releaseEmpty(el9);
      writeValue(el9, lastGood.get(el9));
      return true;
    };
    document.addEventListener("change", (e) => {
      if (isNumberBox(e.target) && restoreIfEmpty(e.target)) e.stopImmediatePropagation();
    }, true);
    document.addEventListener("focusout", (e) => {
      if (isNumberBox(e.target)) restoreIfEmpty(e.target);
    }, true);
    function stepBy(el9, dir) {
      const before = el9.value;
      if (before === "" && el9.placeholder !== "" && isFinite(Number(el9.placeholder))) writeValue(el9, el9.placeholder);
      const start = el9.value;
      try {
        if (dir > 0) el9.stepUp();
        else el9.stepDown();
      } catch (err) {
        return false;
      }
      const dec = (String(el9.step).split(".")[1] || "").length;
      if (dec && el9.value !== "" && isFinite(Number(el9.value))) writeValue(el9, String(Number(Number(el9.value).toFixed(dec))));
      if (el9.value === start && before !== "") return false;
      el9.dispatchEvent(new Event("input", { bubbles: true }));
      el9.dispatchEvent(new Event("change", { bubbles: true }));
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
      const el9 = boxOf(button);
      if (!el9 || el9.disabled || el9.readOnly) return;
      e.preventDefault();
      const dir = Number(button.dataset.znStep) || 0;
      stop();
      stepBy(el9, dir);
      holdTimer = setTimeout(() => {
        repeatTimer = setInterval(() => {
          if (!stepBy(el9, dir)) stop();
        }, REPEAT_MS);
      }, HOLD_MS);
      const release = () => {
        stop();
        if (document.activeElement !== el9) el9.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
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

  // apps/AiToolsLocal/src/debug.js
  var lines = [];
  var MAX_LINES = 600;
  var stamp = () => (/* @__PURE__ */ new Date()).toISOString().slice(11, 23);
  var num = (v) => typeof v === "number" ? Number.isInteger(v) ? String(v) : Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : String(Math.round(v * 1e6) / 1e6) : String(v);
  function fmt(obj, indent = "  ") {
    const out = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out.push(indent + k + ":");
        out.push(fmt(v, indent + "  "));
      } else if (Array.isArray(v)) out.push(indent + k + ": " + v.map((x) => x && typeof x === "object" ? Object.entries(x).map(([a, b]) => a + " " + num(b)).join(" ") : num(x)).join(" | "));
      else out.push(indent + k + ": " + num(v));
    }
    return out.join("\n");
  }
  var debug = {
    log(text) {
      lines.push(stamp() + "  " + text);
      if (lines.length > MAX_LINES) lines.shift();
      if (refresh) refresh();
    },
    section(title, obj) {
      this.log(title + "\n" + fmt(obj));
    },
    // like section(), but at the very top (the device information comes first)
    head(title, obj) {
      lines.unshift(stamp() + "  " + title + "\n" + fmt(obj));
      if (refresh) refresh();
    },
    clear() {
      lines.length = 0;
      if (refresh) refresh();
    },
    get body() {
      return lines.join("\n");
    }
  };
  var refresh = null;
  function alphaStats(canvas) {
    const w = canvas.width, h = canvas.height;
    const d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    let clear = 0, part = 0, solid = 0;
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i];
      if (a === 0) clear++;
      else if (a === 255) solid++;
      else part++;
    }
    const n = w * h;
    return { size: w + "x" + h, transparentPct: Math.round(1e3 * clear / n) / 10, partlyPct: Math.round(1e3 * part / n) / 10, opaquePct: Math.round(1e3 * solid / n) / 10 };
  }
  async function describePng(blob) {
    const head = new Uint8Array(await blob.slice(0, 33).arrayBuffer());
    const colorType = head.length > 25 ? head[25] : -1;
    const names = { 0: "grey", 2: "RGB (no transparency)", 3: "palette", 4: "grey + alpha", 6: "RGBA (has transparency)" };
    const out = { bytes: blob.size, type: blob.type, pngColourType: colorType + " = " + (names[colorType] || "unknown") };
    try {
      const bmp = await createImageBitmap(blob);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext("2d").drawImage(bmp, 0, 0);
      out.decoded = alphaStats(c);
    } catch (e) {
      out.decoded = "could not decode: " + e.message;
    }
    return out;
  }
  function installDebug({ host, getState, getCanvas }) {
    host.classList.add("logwin");
    const bar = document.createElement("div");
    bar.className = "log-bar";
    const title = document.createElement("b");
    title.textContent = "Log";
    const mk = (label, fn, cls) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (cls) b.className = cls;
      b.addEventListener("click", fn);
      return b;
    };
    const ta = document.createElement("textarea");
    ta.readOnly = true;
    ta.spellcheck = false;
    ta.setAttribute("aria-label", "Log");
    const fold = mk("▾", () => setFolded(!host.classList.contains("folded")), "log-fold");
    fold.title = "Fold or unfold the log (Ctrl+Shift+D)";
    const copy = mk("Copy", async () => {
      let msg;
      try {
        await navigator.clipboard.writeText(ta.value);
        msg = "Copied ✓";
      } catch (e) {
        ta.focus();
        ta.select();
        msg = document.execCommand && document.execCommand("copy") ? "Copied ✓" : "Select it";
      }
      copy.textContent = msg;
      setTimeout(() => {
        copy.textContent = "Copy";
      }, 2500);
    }, "btn-solid log-copy");
    const right = document.createElement("span");
    right.className = "log-actions";
    right.append(mk("Snapshot", () => snapshot()), mk("Clear", () => {
      debug.clear();
      header();
    }), copy);
    bar.append(fold, title, right);
    host.append(bar, ta);
    refresh = () => {
      ta.value = debug.body;
      ta.scrollTop = ta.scrollHeight;
    };
    async function header() {
      const info = {
        app: "Ai Tools (Local) build " + (true ? "2bcf4d6" : "?"),
        time: (/* @__PURE__ */ new Date()).toISOString(),
        browser: navigator.userAgent,
        screen: screen.width + "x" + screen.height + " @" + (window.devicePixelRatio || 1) + ", window " + innerWidth + "x" + innerHeight,
        cpuThreads: navigator.hardwareConcurrency || "?",
        memoryGB: navigator.deviceMemory || "?",
        crossOriginIsolated: Boolean(self.crossOriginIsolated),
        webgpu: Boolean(navigator.gpu),
        online: navigator.onLine,
        serviceWorker: navigator.serviceWorker && navigator.serviceWorker.controller ? "controlling this page" : "none"
      };
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const e = await navigator.storage.estimate();
          info.storage = Math.round((e.usage || 0) / 1048576) + " MB used of " + Math.round((e.quota || 0) / 1048576) + " MB";
        }
      } catch (e) {
      }
      debug.head("== Ai Tools (Local) log ==", info);
    }
    async function snapshot() {
      debug.section("Snapshot", { ...getState ? getState() : {}, picture: getCanvas && getCanvas() && getCanvas().width ? alphaStats(getCanvas()) : "no picture" });
    }
    function setFolded(f) {
      host.classList.toggle("folded", f);
      fold.textContent = f ? "▸" : "▾";
    }
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setFolded(!host.classList.contains("folded"));
      }
    });
    window.addEventListener("error", (e) => debug.log("ERROR: " + e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : "")));
    window.addEventListener("unhandledrejection", (e) => debug.log("ERROR (promise): " + (e.reason && e.reason.message ? e.reason.message : e.reason)));
    header().then(refresh);
  }

  // shared/js/ai/modelStore.js
  var DEFAULT_MODEL_URL = "https://huggingface.co/lxfater/inpaint-web/resolve/main/migan.onnx";
  var CACHE_NAME = "zinenow-ai-tools-model";
  async function isModelSaved(url, cacheName = CACHE_NAME) {
    try {
      return Boolean(await (await caches.open(cacheName)).match(url));
    } catch (e) {
      return false;
    }
  }
  async function getModelBytes(url, onProgress, signal, cacheName = CACHE_NAME) {
    let cache = null;
    try {
      cache = await caches.open(cacheName);
    } catch (e) {
    }
    if (cache) {
      const saved = await cache.match(url);
      if (saved) return { bytes: await saved.arrayBuffer(), downloaded: false };
    }
    const res = await fetch(url, signal ? { signal } : void 0);
    if (!res.ok) throw new Error("Couldn't download the model (HTTP " + res.status + "). Check your internet connection.");
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (onProgress) onProgress(got, total);
    }
    const bytes = new Uint8Array(got);
    let off = 0;
    for (const c of chunks) {
      bytes.set(c, off);
      off += c.length;
    }
    if (cache) {
      try {
        await cache.put(url, new Response(bytes.buffer, { headers: { "content-type": "application/octet-stream" } }));
      } catch (e) {
      }
    }
    return { bytes: bytes.buffer, downloaded: true };
  }
  async function forgetModel(cacheName = CACHE_NAME) {
    try {
      await caches.delete(cacheName);
    } catch (e) {
    }
  }
  async function forgetModelUrl(url, cacheName = CACHE_NAME) {
    try {
      await (await caches.open(cacheName)).delete(url);
    } catch (e) {
    }
  }

  // shared/js/ai/fill.js
  var MODEL_SIZE = 512;
  var CONTEXT = 1.5;
  function holeBounds(mask, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (!mask[row + x]) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
  function dilate(mask, w, h, r) {
    if (r <= 0) return mask;
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let last = -1e9;
      for (let x = 0; x < w; x++) {
        if (mask[row + x]) last = x;
        if (x - last <= r) tmp[row + x] = 1;
      }
      last = 1e9;
      for (let x = w - 1; x >= 0; x--) {
        if (mask[row + x]) last = x;
        if (last - x <= r) tmp[row + x] = 1;
      }
    }
    for (let x = 0; x < w; x++) {
      let last = -1e9;
      for (let y = 0; y < h; y++) {
        if (tmp[y * w + x]) last = y;
        if (y - last <= r) out[y * w + x] = 1;
      }
      last = 1e9;
      for (let y = h - 1; y >= 0; y--) {
        if (tmp[y * w + x]) last = y;
        if (last - y <= r) out[y * w + x] = 1;
      }
    }
    return out;
  }
  function cropWindow(bounds, w, h) {
    const bw = bounds.x1 - bounds.x0 + 1, bh = bounds.y1 - bounds.y0 + 1;
    const need = Math.max(bw, bh);
    const short = Math.min(w, h);
    if (need > short * 0.92) return null;
    let side = Math.max(MODEL_SIZE, Math.ceil(need * CONTEXT));
    side = Math.min(side, short);
    const cx = (bounds.x0 + bounds.x1 + 1) / 2, cy = (bounds.y0 + bounds.y1 + 1) / 2;
    const x = Math.round(Math.min(Math.max(0, cx - side / 2), w - side));
    const y = Math.round(Math.min(Math.max(0, cy - side / 2), h - side));
    return { x, y, side };
  }
  function windowMask(mask, w, crop) {
    const out = new Uint8Array(MODEL_SIZE * MODEL_SIZE);
    const k = crop.side / MODEL_SIZE;
    for (let my = 0; my < MODEL_SIZE; my++) {
      const y0 = crop.y + Math.floor(my * k), y1 = crop.y + Math.max(Math.floor(my * k), Math.ceil((my + 1) * k) - 1);
      for (let mx = 0; mx < MODEL_SIZE; mx++) {
        const x0 = crop.x + Math.floor(mx * k), x1 = crop.x + Math.max(Math.floor(mx * k), Math.ceil((mx + 1) * k) - 1);
        let hit = 0;
        for (let yy = y0; yy <= y1 && !hit; yy++) for (let xx = x0; xx <= x1; xx++) if (mask[yy * w + xx]) {
          hit = 1;
          break;
        }
        out[my * MODEL_SIZE + mx] = hit;
      }
    }
    return out;
  }
  function buildInput(rgba, hole, sign = 1) {
    const n = MODEL_SIZE * MODEL_SIZE;
    const x = new Float32Array(4 * n);
    for (let i = 0; i < n; i++) {
      const known = hole[i] ? 0 : 1;
      x[i] = sign * (known - 0.5);
      for (let c = 0; c < 3; c++) x[(c + 1) * n + i] = (rgba[i * 4 + c] / 127.5 - 1) * known;
    }
    return x;
  }
  function outputToRgba(out) {
    const n = MODEL_SIZE * MODEL_SIZE;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < 3 * n; i += 7) {
      const v = out[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const mode = min < -0.01 && max <= 1.5 ? "signed" : max <= 1.5 ? "unit" : "byte";
    const rgba = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 3; c++) {
        const v = out[c * n + i];
        rgba[i * 4 + c] = mode === "signed" ? (v + 1) * 127.5 : mode === "unit" ? v * 255 : v;
      }
      rgba[i * 4 + 3] = 255;
    }
    return rgba;
  }
  function blendWeights(mask, w, crop, feather) {
    const s = crop.side;
    const inside = new Uint8Array(s * s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) inside[y * s + x] = mask[(crop.y + y) * w + crop.x + x];
    if (feather <= 0) return Float32Array.from(inside);
    const a = new Float32Array(s * s), r = feather;
    const rowSum = new Float32Array(s * s);
    for (let y = 0; y < s; y++) {
      let sum = 0;
      const row = y * s;
      for (let x = -r; x < s + r; x++) {
        const add = x + r, sub = x - r - 1;
        if (add < s && add >= 0) sum += inside[row + add];
        if (sub >= 0 && sub < s) sum -= inside[row + sub];
        if (x >= 0 && x < s) rowSum[row + x] = sum;
      }
    }
    const win = 2 * r + 1;
    for (let x = 0; x < s; x++) {
      let sum = 0;
      for (let y = -r; y < s + r; y++) {
        const add = y + r, sub = y - r - 1;
        if (add < s && add >= 0) sum += rowSum[add * s + x];
        if (sub >= 0 && sub < s) sum -= rowSum[sub * s + x];
        if (y >= 0 && y < s) a[y * s + x] = Math.min(1, sum / (win * win) * 2);
      }
    }
    for (let i = 0; i < a.length; i++) if (inside[i]) a[i] = 1;
    return a;
  }
  function paste(image, w, crop, answer, weights) {
    const s = crop.side;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const a = weights[y * s + x];
        if (a <= 0) continue;
        const d = ((crop.y + y) * w + crop.x + x) * 4, o = (y * s + x) * 4;
        for (let c = 0; c < 3; c++) image[d + c] = image[d + c] + (answer[o + c] - image[d + c]) * a;
      }
    }
  }
  function labelPieces(mask, w, h) {
    const labels = new Int32Array(w * h);
    const boxes = [];
    const stack = [];
    for (let start = 0; start < labels.length; start++) {
      if (!mask[start] || labels[start]) continue;
      const id = boxes.length + 1;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      labels[start] = id;
      stack.push(start);
      while (stack.length) {
        const i = stack.pop();
        const x = i % w, y = (i - x) / w;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (mask[j] && !labels[j]) {
              labels[j] = id;
              stack.push(j);
            }
          }
        }
      }
      boxes.push({ x0, y0, x1, y1 });
    }
    return { labels, boxes };
  }
  var overlaps = (a, b) => a.x < b.x + b.side && b.x < a.x + a.side && a.y < b.y + b.side && b.y < a.y + a.side;
  function groupPieces(boxes, w, h) {
    let groups = boxes.map((b, i) => ({ ids: [i + 1], bounds: { ...b } }));
    for (const g of groups) g.crop = cropWindow(g.bounds, w, h);
    let merged = true;
    while (merged && groups.length > 1) {
      merged = false;
      outer: for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const a = groups[i], b = groups[j];
          if (a.crop && b.crop && !overlaps(a.crop, b.crop)) continue;
          const bounds = { x0: Math.min(a.bounds.x0, b.bounds.x0), y0: Math.min(a.bounds.y0, b.bounds.y0), x1: Math.max(a.bounds.x1, b.bounds.x1), y1: Math.max(a.bounds.y1, b.bounds.y1) };
          const g = { ids: [...a.ids, ...b.ids], bounds, crop: cropWindow(bounds, w, h) };
          groups = groups.filter((_, k) => k !== i && k !== j);
          groups.push(g);
          merged = true;
          break outer;
        }
      }
    }
    return groups.sort((p, q) => p.bounds.y0 - q.bounds.y0 || p.bounds.x0 - q.bounds.x0);
  }
  function groupMask(labels, ids) {
    const wanted = new Set(ids);
    const out = new Uint8Array(labels.length);
    for (let i = 0; i < labels.length; i++) if (labels[i] && wanted.has(labels[i])) out[i] = 1;
    return out;
  }
  async function findMaskSign(run) {
    const n = MODEL_SIZE * MODEL_SIZE;
    const rgba = new Uint8ClampedArray(n * 4), truth = new Uint8ClampedArray(n * 4), hole = new Uint8Array(n);
    for (let y = 0; y < MODEL_SIZE; y++) for (let x = 0; x < MODEL_SIZE; x++) {
      const i = y * MODEL_SIZE + x;
      const px = [40 + x / MODEL_SIZE * 180, 60 + y / MODEL_SIZE * 150, 140 + (x + y) / (2 * MODEL_SIZE) * 90];
      for (let c = 0; c < 3; c++) {
        rgba[i * 4 + c] = px[c];
        truth[i * 4 + c] = px[c];
      }
      rgba[i * 4 + 3] = truth[i * 4 + 3] = 255;
      if (Math.hypot(x - 256, y - 256) < 60) hole[i] = 1;
    }
    const errors = {};
    for (const sign of [1, -1]) {
      const out = await run(rgba, hole, sign);
      let sum = 0, count = 0;
      for (let i = 0; i < n; i++) if (hole[i]) {
        for (let c = 0; c < 3; c++) sum += Math.abs(out[i * 4 + c] - truth[i * 4 + c]);
        count += 3;
      }
      errors[sign] = sum / count;
    }
    return { sign: errors[-1] < errors[1] ? -1 : 1, errors };
  }

  // shared/js/ai/runtime.js
  var ORT_VERSION = "1.31.1";
  var ORT_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VERSION + "/dist/ort.all.min.js";
  var ortPromise = null;
  function loadOrt() {
    if (self.ort) return Promise.resolve(self.ort);
    if (!ortPromise) {
      ortPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = ORT_URL;
        s.onload = () => resolve(self.ort);
        s.onerror = () => {
          ortPromise = null;
          reject(new Error("Couldn't load the AI runtime. It needs the internet the first time."));
        };
        document.head.append(s);
      });
    }
    return ortPromise;
  }
  async function gpuUsable() {
    try {
      return Boolean(navigator.gpu && await navigator.gpu.requestAdapter());
    } catch (e) {
      return false;
    }
  }
  async function createSession(modelBytes, preferGpu) {
    const ort = await loadOrt();
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
    if (preferGpu && await gpuUsable()) {
      try {
        return { session: await ort.InferenceSession.create(modelBytes, { executionProviders: ["webgpu"], graphOptimizationLevel: "all" }), backend: "gpu" };
      } catch (e) {
      }
    }
    return { session: await ort.InferenceSession.create(modelBytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" }), backend: "cpu" };
  }
  async function runModel(session2, rgba, hole, sign = 1) {
    const ort = await loadOrt();
    const input = new ort.Tensor("float32", buildInput(rgba, hole, sign), [1, 4, MODEL_SIZE, MODEL_SIZE]);
    const out = await session2.run({ [session2.inputNames[0]]: input });
    return outputToRgba(out[session2.outputNames[0]].data);
  }

  // shared/js/ai/session.js
  var IDLE_MS = 6e4;
  var current = null;
  var starting = null;
  var timer = 0;
  var SIGN_KEY = "zinenow.ai.maskSign:" + DEFAULT_MODEL_URL;
  var savedSign = () => {
    try {
      const v = Number(localStorage.getItem(SIGN_KEY));
      return v === 1 || v === -1 ? v : null;
    } catch (e) {
      return null;
    }
  };
  function releaseSession() {
    clearTimeout(timer);
    const c = current;
    current = null;
    starting = null;
    if (c && c.session && c.session.release) {
      try {
        c.session.release();
      } catch (e) {
      }
    }
  }
  var touch = () => {
    clearTimeout(timer);
    timer = setTimeout(releaseSession, IDLE_MS);
  };
  async function acquireSession(onStatus) {
    if (current) {
      touch();
      return current;
    }
    if (!starting) {
      starting = (async () => {
        if (!await isModelSaved(DEFAULT_MODEL_URL)) throw new Error("The AI model is not downloaded. Download it first (Marquee panel, AI model box).");
        onStatus && onStatus("Starting the AI model…");
        const { bytes } = await getModelBytes(DEFAULT_MODEL_URL);
        const made = await createSession(bytes, true);
        let sign = savedSign();
        if (!sign) {
          onStatus && onStatus("Checking the AI model (one time)…");
          sign = (await findMaskSign((rgba, hole, s) => runModel(made.session, rgba, hole, s))).sign;
          try {
            localStorage.setItem(SIGN_KEY, String(sign));
          } catch (e) {
          }
        }
        current = { session: made.session, backend: made.backend, sign, bytes };
        return current;
      })().catch((e) => {
        starting = null;
        throw e;
      });
    }
    const c = await starting;
    touch();
    return c;
  }
  async function runOnSession(rgba, hole, onStatus) {
    const c = await acquireSession(onStatus);
    try {
      const out = await runModel(c.session, rgba, hole, c.sign);
      touch();
      return out;
    } catch (e) {
      if (c.backend !== "gpu") throw e;
      onStatus && onStatus("The graphics chip failed; trying the processor…");
      const cpu = await createSession(c.bytes, false);
      try {
        c.session.release && c.session.release();
      } catch (err) {
      }
      current = { session: cpu.session, backend: "cpu", sign: c.sign, bytes: c.bytes };
      touch();
      return runModel(cpu.session, rgba, hole, c.sign);
    }
  }

  // shared/js/ai/bgModel.js
  var BG_CACHE = "zinenow-ai-bg-model";
  var BG_MODELS = [
    {
      key: "u2netp",
      name: "U²-Netp",
      kind: "General",
      label: "U²-Netp (General)",
      mb: 4.4,
      licence: "Apache-2.0",
      host: "huggingface.co",
      repo: "huggingface.co/edgetools/u2netp",
      url: "https://huggingface.co/edgetools/u2netp/resolve/main/u2netp.onnx",
      about: "Any single subject: an object, an animal or a person. Edges are a little rough."
    },
    {
      key: "modnet",
      name: "MODNet",
      kind: "Portrait",
      label: "MODNet (Portrait)",
      mb: 25,
      licence: "Apache-2.0",
      host: "huggingface.co",
      repo: "huggingface.co/Xenova/modnet",
      url: "https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx",
      about: "Photos of people (head and shoulders): soft hair edges. Not for objects or animals."
    }
  ];
  var bgModel = (key) => BG_MODELS.find((m) => m.key === key) || BG_MODELS[0];

  // shared/js/ai/segment.js
  var SEG_PREP = {
    u2netp: { size: 320, mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225], byBrightest: true, mask: "minmax" },
    modnet: { size: 512, mean: [0.5, 0.5, 0.5], std: [0.5, 0.5, 0.5], byBrightest: false, mask: "clamp" }
  };
  function segInput(rgba, prep = SEG_PREP.u2netp) {
    const size = typeof prep === "number" ? SEG_PREP.u2netp.size : prep.size;
    const p = typeof prep === "number" ? SEG_PREP.u2netp : prep;
    const n = size * size;
    let max = 255;
    if (p.byBrightest) {
      max = 1;
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        if (rgba[o] > max) max = rgba[o];
        if (rgba[o + 1] > max) max = rgba[o + 1];
        if (rgba[o + 2] > max) max = rgba[o + 2];
      }
    }
    const out = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / max - p.mean[c]) / p.std[c];
    return out;
  }
  function segMask(data, how = "minmax") {
    const n = data.length;
    const out = new Float32Array(n);
    if (how === "clamp") {
      for (let i = 0; i < n; i++) out[i] = data[i] < 0 ? 0 : data[i] > 1 ? 1 : data[i];
      return out;
    }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = data[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const range = hi - lo || 1;
    for (let i = 0; i < n; i++) out[i] = (data[i] - lo) / range;
    return out;
  }
  function softCut(v, cutoff, soft) {
    if (cutoff <= 0) return 1;
    const width = Math.max(1e-4, Math.min(soft, 1 - cutoff));
    const a = (v - cutoff) / width;
    return a < 0 ? 0 : a > 1 ? 1 : a;
  }
  function maskToAlpha(mask, cutoff, soft) {
    const out = new Uint8ClampedArray(mask.length);
    for (let i = 0; i < mask.length; i++) out[i] = Math.round(softCut(mask[i], cutoff, soft) * 255);
    return out;
  }
  var BUCKETS = [1e-4, 1e-3, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0000001];
  function maskStats(mask) {
    const n = mask.length;
    let lo = Infinity, hi = -Infinity, sum = 0;
    const counts = new Array(BUCKETS.length).fill(0);
    const BINS = 2e3, hist = new Float64Array(BINS);
    for (let i = 0; i < n; i++) {
      const v = mask[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      sum += v;
      let b = 0;
      while (v >= BUCKETS[b]) b++;
      counts[b]++;
      hist[Math.min(BINS - 1, Math.floor(v * BINS))]++;
    }
    const pct = (p) => {
      let acc = 0;
      for (let b = 0; b < BINS; b++) {
        acc += hist[b];
        if (acc >= p * n) return (b + 0.5) / BINS;
      }
      return 1;
    };
    const h2 = new Float64Array(256);
    for (let b = 0; b < BINS; b++) h2[Math.min(255, Math.floor(b * 256 / BINS))] += hist[b];
    let total = 0, wsum = 0;
    for (let b = 0; b < 256; b++) {
      total += h2[b];
      wsum += b * h2[b];
    }
    let wB = 0, sB = 0, best = 0, bestT = 0;
    for (let t = 0; t < 256; t++) {
      wB += h2[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sB += t * h2[t];
      const mB = sB / wB, mF = (wsum - sB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) {
        best = between;
        bestT = t;
      }
    }
    return {
      n,
      min: lo,
      max: hi,
      mean: sum / n,
      below: BUCKETS.map((lt, i) => ({ lt: i === BUCKETS.length - 1 ? 1 : lt, share: counts[i] / n })),
      p5: pct(0.05),
      p25: pct(0.25),
      p50: pct(0.5),
      p75: pct(0.75),
      p95: pct(0.95),
      otsu: (bestT + 1) / 256
    };
  }

  // shared/js/ai/bgSession.js
  var IDLE_MS2 = 6e4;
  var sessions = /* @__PURE__ */ new Map();
  var timer2 = 0;
  function releaseBgSession() {
    clearTimeout(timer2);
    const all = [...sessions.values()];
    sessions.clear();
    for (const s of all) Promise.resolve(s).then((x) => {
      if (x && x.release) {
        try {
          x.release();
        } catch (e) {
        }
      }
    }, () => {
    });
  }
  var touch2 = () => {
    clearTimeout(timer2);
    timer2 = setTimeout(releaseBgSession, IDLE_MS2);
  };
  function acquire(key, onStatus) {
    touch2();
    if (!sessions.has(key)) {
      const m = bgModel(key);
      sessions.set(key, (async () => {
        if (!await isModelSaved(m.url, BG_CACHE)) throw new Error(m.name + " is not downloaded. Download it first (Image panel, AI Background Removal).");
        onStatus && onStatus("Starting " + m.name + "…");
        const { bytes } = await getModelBytes(m.url, void 0, void 0, BG_CACHE);
        return (await createSession(bytes, false)).session;
      })().catch((e) => {
        sessions.delete(key);
        throw e;
      }));
    }
    return sessions.get(key);
  }
  async function segmentCanvas(canvas, key, onStatus) {
    const prep = SEG_PREP[bgModel(key).key];
    const session2 = await acquire(key, onStatus);
    const ort = await loadOrt();
    const small = document.createElement("canvas");
    small.width = small.height = prep.size;
    const sx = small.getContext("2d", { willReadFrequently: true });
    sx.imageSmoothingQuality = "high";
    sx.drawImage(canvas, 0, 0, prep.size, prep.size);
    const input = new ort.Tensor("float32", segInput(sx.getImageData(0, 0, prep.size, prep.size).data, prep), [1, 3, prep.size, prep.size]);
    onStatus && onStatus("Finding the subject…");
    const t0 = performance.now();
    const out = await session2.run({ [session2.inputNames[0]]: input });
    const first = out[session2.outputNames[0]];
    const side = Math.round(Math.sqrt(first.data.length));
    touch2();
    let rawMin = Infinity, rawMax = -Infinity;
    for (let i = 0; i < first.data.length; i++) {
      const v = first.data[i];
      if (v < rawMin) rawMin = v;
      if (v > rawMax) rawMax = v;
    }
    const info = { model: key, prep: prep.mask + ", size " + prep.size, inputName: session2.inputNames[0], outputNames: session2.outputNames.join(","), outputDims: first.dims.join("x"), outputType: first.type, rawMin, rawMax, runMs: Math.round(performance.now() - t0) };
    return { mask: segMask(first.data, prep.mask), side, info };
  }
  function cutOutCanvas(canvas, mask, side, cutoff, soft) {
    const m = document.createElement("canvas");
    m.width = m.height = side;
    const mx = m.getContext("2d");
    const img = mx.createImageData(side, side);
    const alpha = maskToAlpha(mask, cutoff, soft);
    for (let i = 0; i < side * side; i++) {
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = alpha[i];
    }
    mx.putImageData(img, 0, 0);
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ox = out.getContext("2d");
    ox.drawImage(canvas, 0, 0);
    ox.globalCompositeOperation = "destination-in";
    ox.imageSmoothingQuality = "high";
    ox.drawImage(m, 0, 0, canvas.width, canvas.height);
    return out;
  }

  // shared/js/ai/faceModel.js
  var FACE_CACHE = "zinenow-ai-face-model";
  var FACE_MODEL = {
    key: "yunet",
    name: "YuNet",
    kind: "Face detection",
    label: "YuNet (Face detection)",
    mb: 0.23,
    licence: "MIT",
    host: "huggingface.co",
    repo: "huggingface.co/opencv/face_detection_yunet",
    url: "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
    about: "Finds where faces are (boxes only). It does not recognise or identify anyone."
  };

  // shared/js/ai/faces.js
  var FACE_SIZE = 640;
  function yunetInput(rgba, W, H) {
    const n = W * H, out = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      out[i] = rgba[i * 4 + 2];
      out[n + i] = rgba[i * 4 + 1];
      out[2 * n + i] = rgba[i * 4];
    }
    return out;
  }
  var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  function decodeYunet(get, W, H, k, minScore) {
    const faces = [];
    for (const s of [8, 16, 32]) {
      const cls = get("cls", s), obj = get("obj", s), bb = get("bbox", s);
      if (!cls || !obj || !bb) throw new Error("Unexpected model outputs (stride " + s + ").");
      const cols = Math.ceil(W / s), rows = Math.ceil(H / s);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const score = Math.sqrt(clamp01(cls[i]) * clamp01(obj[i]));
        if (score < minScore) continue;
        const cx = (c + bb[i * 4]) * s, cy = (r + bb[i * 4 + 1]) * s, w = Math.exp(bb[i * 4 + 2]) * s, h = Math.exp(bb[i * 4 + 3]) * s;
        faces.push({ x: (cx - w / 2) / k, y: (cy - h / 2) / k, w: w / k, h: h / k, score });
      }
    }
    return nms(faces, 0.3);
  }
  function nms(faces, thr) {
    faces.sort((a, b) => b.score - a.score);
    const keep = [];
    for (const f of faces) {
      const clear = keep.every((g) => {
        const x1 = Math.max(f.x, g.x), y1 = Math.max(f.y, g.y), x2 = Math.min(f.x + f.w, g.x + g.w), y2 = Math.min(f.y + f.h, g.y + g.h);
        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        return inter / (f.w * f.h + g.w * g.h - inter) < thr;
      });
      if (clear) keep.push(f);
    }
    return keep;
  }
  function paddedBox(f, padPct, W, H) {
    const px = f.w * padPct / 100, py = f.h * padPct / 100;
    const x0 = Math.max(0, Math.floor(f.x - px)), y0 = Math.max(0, Math.floor(f.y - py));
    const x1 = Math.min(W, Math.ceil(f.x + f.w + px)), y1 = Math.min(H, Math.ceil(f.y + f.h + py));
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  }

  // shared/js/ai/faceSession.js
  var IDLE_MS3 = 6e4;
  var session = null;
  var starting2 = null;
  var timer3 = 0;
  function releaseFaceSession() {
    clearTimeout(timer3);
    const s = session;
    session = null;
    starting2 = null;
    if (s && s.release) {
      try {
        s.release();
      } catch (e) {
      }
    }
  }
  var touch3 = () => {
    clearTimeout(timer3);
    timer3 = setTimeout(releaseFaceSession, IDLE_MS3);
  };
  async function acquire2(onStatus) {
    touch3();
    if (session) return session;
    if (!starting2) {
      starting2 = (async () => {
        if (!await isModelSaved(FACE_MODEL.url, FACE_CACHE)) throw new Error(FACE_MODEL.name + " is not downloaded. Download it first (Models page, or the Face blur tool).");
        onStatus && onStatus("Starting " + FACE_MODEL.name + "…");
        const { bytes } = await getModelBytes(FACE_MODEL.url, void 0, void 0, FACE_CACHE);
        session = (await createSession(bytes, false)).session;
        return session;
      })().catch((e) => {
        starting2 = null;
        throw e;
      });
    }
    return starting2;
  }
  async function detectFaces(canvas, onStatus) {
    const sess = await acquire2(onStatus);
    const ort = await loadOrt();
    const W = FACE_SIZE, H = FACE_SIZE;
    const k = Math.min(W / canvas.width, H / canvas.height);
    const w = Math.round(canvas.width * k), h = Math.round(canvas.height * k);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#000";
    x.fillRect(0, 0, W, H);
    x.drawImage(canvas, 0, 0, w, h);
    const input = new ort.Tensor("float32", yunetInput(x.getImageData(0, 0, W, H).data, W, H), [1, 3, H, W]);
    onStatus && onStatus("Finding faces…");
    const t0 = performance.now();
    const out = await sess.run({ [sess.inputNames[0]]: input });
    const runMs = Math.round(performance.now() - t0);
    const names = sess.outputNames;
    const get = (p, s) => {
      const n = names.find((q) => q === p + "_" + s) || names.find((q) => q.includes(p) && q.includes(String(s)));
      return n ? out[n].data : null;
    };
    const faces = decodeYunet(get, W, H, k, 0.1);
    touch3();
    return { faces, info: { model: FACE_MODEL.label, inputSize: W + "x" + H, fitScale: k, outputNames: names.join(","), runMs, found10pct: faces.length } };
  }

  // shared/js/ai/samModel.js
  var SAM_CACHE = "zinenow-ai-sam-model";
  var SAM_MODEL = {
    key: "mobilesam",
    name: "MobileSAM",
    kind: "Click-to-select",
    label: "MobileSAM (Click-to-select)",
    mb: 44.7,
    licence: "Apache-2.0",
    host: "huggingface.co",
    repo: "huggingface.co/Acly/MobileSAM",
    encoderUrl: "https://huggingface.co/Acly/MobileSAM/resolve/main/mobile_sam_image_encoder.onnx",
    encoderMb: 28.2,
    decoderUrl: "https://huggingface.co/Acly/MobileSAM/resolve/main/sam_mask_decoder_single.onnx",
    decoderMb: 16.5,
    about: "Click on a thing and it outlines it. Two files: an image reader (about 28 MB) and a mask maker (about 16.5 MB)."
  };

  // shared/js/ai/sam.js
  var SAM_SIZE = 1024;
  function samDims(w, h) {
    const k = SAM_SIZE / Math.max(w, h);
    return { k, w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
  }
  function samInput(rgba, w, h) {
    const out = new Float32Array(w * h * 3);
    for (let i = 0, o = 0; i < w * h; i++) {
      out[o++] = rgba[i * 4];
      out[o++] = rgba[i * 4 + 1];
      out[o++] = rgba[i * 4 + 2];
    }
    return out;
  }
  function samPoints(points, k) {
    const n = points.length + 1, coords = new Float32Array(n * 2), labels = new Float32Array(n);
    points.forEach((p, i) => {
      coords[i * 2] = p.x * k;
      coords[i * 2 + 1] = p.y * k;
      labels[i] = p.label ? 1 : 0;
    });
    labels[n - 1] = -1;
    return { coords, labels, n };
  }
  function pickMask(data, dims, iou) {
    const mw = dims[dims.length - 1], mh = dims[dims.length - 2], kk = dims.length === 4 ? dims[1] : 1;
    let best = 0;
    if (iou && kk > 1) {
      for (let i = 1; i < kk; i++) if (iou[i] > iou[best]) best = i;
    }
    const mask = new Uint8Array(mw * mh);
    let on = 0;
    const base = best * mw * mh;
    for (let i = 0; i < mask.length; i++) if (data[base + i] > 0) {
      mask[i] = 1;
      on++;
    }
    return { mask, w: mw, h: mh, best, coverage: on / mask.length };
  }

  // shared/js/ai/samSession.js
  var IDLE_MS4 = 9e4;
  var parts = null;
  var starting3 = null;
  var timer4 = 0;
  function releaseSamSession() {
    clearTimeout(timer4);
    const p = parts;
    parts = null;
    starting3 = null;
    if (p) for (const s of [p.enc, p.dec]) {
      try {
        s.release && s.release();
      } catch (e) {
      }
    }
  }
  var touch4 = () => {
    clearTimeout(timer4);
    timer4 = setTimeout(releaseSamSession, IDLE_MS4);
  };
  async function acquire3(onStatus) {
    touch4();
    if (parts) return parts;
    if (!starting3) {
      starting3 = (async () => {
        if (!await isModelSaved(SAM_MODEL.encoderUrl, SAM_CACHE) || !await isModelSaved(SAM_MODEL.decoderUrl, SAM_CACHE)) throw new Error(SAM_MODEL.name + " is not downloaded. Download it first (Models page, or the Click-to-select tool).");
        onStatus && onStatus("Starting " + SAM_MODEL.name + "…");
        const encBytes = (await getModelBytes(SAM_MODEL.encoderUrl, void 0, void 0, SAM_CACHE)).bytes;
        const decBytes = (await getModelBytes(SAM_MODEL.decoderUrl, void 0, void 0, SAM_CACHE)).bytes;
        const enc = await createSession(encBytes, true);
        const dec = await createSession(decBytes, false);
        parts = { enc: enc.session, encBackend: enc.backend, encBytes, dec: dec.session };
        return parts;
      })().catch((e) => {
        starting3 = null;
        throw e;
      });
    }
    return starting3;
  }
  async function prepareSam(canvas, onStatus) {
    const p = await acquire3(onStatus);
    const ort = await loadOrt();
    const d = samDims(canvas.width, canvas.height);
    const c = document.createElement("canvas");
    c.width = d.w;
    c.height = d.h;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.imageSmoothingQuality = "high";
    x.drawImage(canvas, 0, 0, d.w, d.h);
    const input = new ort.Tensor("float32", samInput(x.getImageData(0, 0, d.w, d.h).data, d.w, d.h), [d.h, d.w, 3]);
    onStatus && onStatus("Reading the picture (about 10 seconds, once per picture)…");
    await new Promise((r) => setTimeout(r, 40));
    const t0 = performance.now();
    let out;
    try {
      out = await p.enc.run({ [p.enc.inputNames[0]]: input });
    } catch (e) {
      if (p.encBackend !== "gpu") throw e;
      onStatus && onStatus("The graphics chip failed; reading the picture on the processor (slower)…");
      const cpu = await createSession(p.encBytes, false);
      try {
        p.enc.release && p.enc.release();
      } catch (err) {
      }
      p.enc = cpu.session;
      p.encBackend = "cpu";
      out = await p.enc.run({ [p.enc.inputNames[0]]: input });
    }
    touch4();
    return { embeddings: out[p.enc.outputNames[0]], k: d.k, w: canvas.width, h: canvas.height, backend: p.encBackend, ms: Math.round(performance.now() - t0) };
  }
  async function outline(prep, points) {
    const p = await acquire3();
    const ort = await loadOrt();
    const pt = samPoints(points, prep.k);
    const has = (n) => p.dec.inputNames.includes(n);
    const feeds = { image_embeddings: prep.embeddings, point_coords: new ort.Tensor("float32", pt.coords, [1, pt.n, 2]), point_labels: new ort.Tensor("float32", pt.labels, [1, pt.n]) };
    if (has("mask_input")) feeds.mask_input = new ort.Tensor("float32", new Float32Array(256 * 256), [1, 1, 256, 256]);
    if (has("has_mask_input")) feeds.has_mask_input = new ort.Tensor("float32", new Float32Array([0]), [1]);
    if (has("orig_im_size")) feeds.orig_im_size = new ort.Tensor("float32", new Float32Array([prep.h, prep.w]), [2]);
    const t0 = performance.now();
    const out = await p.dec.run(feeds);
    const ms = Math.round(performance.now() - t0);
    const masks = out[p.dec.outputNames.find((q) => /^masks?$/.test(q)) || p.dec.outputNames[0]];
    const iouT = out[p.dec.outputNames.find((q) => /iou/.test(q))];
    const r = pickMask(masks.data, masks.dims, iouT ? iouT.data : null);
    touch4();
    return { mask: r.mask, w: r.w, h: r.h, coverage: r.coverage, iou: iouT ? Array.from(iouT.data) : [], ms };
  }

  // shared/js/ai/upscaleModel.js
  var UPSCALE_CACHE = "zinenow-ai-upscale-model";
  var UPSCALE_MODEL = {
    key: "realesr-x4v3",
    name: "Real-ESRGAN general x4v3",
    kind: "Upscale",
    label: "Real-ESRGAN x4v3 (Upscale)",
    mb: 4.9,
    licence: "BSD-3-Clause",
    host: "huggingface.co",
    repo: "huggingface.co/OwlMaster/AllFilesRope",
    url: "https://huggingface.co/OwlMaster/AllFilesRope/resolve/main/realesr-general-x4v3.onnx",
    about: "Enlarges a picture 2 or 4 times and adds believable detail. It works piece by piece, so big pictures are slow."
  };

  // shared/js/ai/upscale.js
  function tilePlan(W, H, tile) {
    const list = [];
    for (let y0 = 0; y0 < H; y0 += tile) for (let x0 = 0; x0 < W; x0 += tile) list.push({ x0, y0, w: Math.min(tile, W - x0), h: Math.min(tile, H - y0) });
    return list;
  }
  function tileInput(rgba, W, H, ox, oy, T) {
    const out = new Float32Array(3 * T * T), n = T * T;
    for (let y = 0; y < T; y++) {
      const sy = Math.min(H - 1, Math.max(0, oy + y));
      for (let x = 0; x < T; x++) {
        const sx = Math.min(W - 1, Math.max(0, ox + x)), i = (sy * W + sx) * 4, o = y * T + x;
        out[o] = rgba[i] / 255;
        out[n + o] = rgba[i + 1] / 255;
        out[2 * n + o] = rgba[i + 2] / 255;
      }
    }
    return out;
  }
  function tileToRgba(od, OT, S, pad, w, h) {
    const cw = w * S, ch = h * S, n = OT * OT, out = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const si = (pad * S + y) * OT + (pad * S + x), di = (y * cw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v = od[c * n + si];
        out[di + c] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
      }
      out[di + 3] = 255;
    }
    return out;
  }
  function resultSize(W, H, want, maxSide) {
    const w = W * want, h = H * want;
    return { w, h, tooBig: Math.max(w, h) > maxSide };
  }

  // shared/js/ai/upscaleSession.js
  var IDLE_MS5 = 12e4;
  var current2 = null;
  var starting4 = null;
  var timer5 = 0;
  function releaseUpscaleSession() {
    clearTimeout(timer5);
    const c = current2;
    current2 = null;
    starting4 = null;
    if (c && c.session && c.session.release) {
      try {
        c.session.release();
      } catch (e) {
      }
    }
  }
  var touch5 = () => {
    clearTimeout(timer5);
    timer5 = setTimeout(releaseUpscaleSession, IDLE_MS5);
  };
  async function acquire4(gpu, onStatus) {
    touch5();
    if (current2 && current2.wantGpu === gpu) return current2;
    if (current2) releaseUpscaleSession();
    if (!starting4) {
      starting4 = (async () => {
        if (!await isModelSaved(UPSCALE_MODEL.url, UPSCALE_CACHE)) throw new Error(UPSCALE_MODEL.name + " is not downloaded. Download it first (Models page, or the Upscale tool).");
        onStatus && onStatus("Starting " + UPSCALE_MODEL.name + "…");
        const { bytes } = await getModelBytes(UPSCALE_MODEL.url, void 0, void 0, UPSCALE_CACHE);
        const made = await createSession(bytes, gpu);
        current2 = { session: made.session, backend: made.backend, bytes, wantGpu: gpu };
        return current2;
      })().catch((e) => {
        starting4 = null;
        throw e;
      });
    }
    const c = await starting4;
    starting4 = null;
    return c;
  }
  var sizeOf = (session2) => {
    try {
      const m = session2.inputMetadata, sh = Array.isArray(m) ? m[0].shape : m && m[session2.inputNames[0]] && m[session2.inputNames[0]].shape;
      const ok = (v) => Number.isFinite(v) && v > 0 && v < 4096;
      if (sh && ok(sh[2]) && ok(sh[3])) return [sh[3], sh[2]];
    } catch (e) {
    }
    return null;
  };
  async function upscaleCanvas(canvas, { tile = 128, pad = 12, gpu = false, onProgress, shouldCancel, onStatus } = {}) {
    let c = await acquire4(gpu, onStatus);
    const ort = await loadOrt();
    const W = canvas.width, H = canvas.height;
    const fixed = sizeOf(c.session);
    let T = tile + 2 * pad;
    if (fixed) {
      T = fixed[0];
      tile = Math.max(8, T - 2 * pad);
    }
    const src = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const tiles = tilePlan(W, H, tile);
    let out = null, S = 0, outX = null;
    const times = [];
    const info = { backend: c.backend, tile, pad, input: T + "x" + T, fixedInput: Boolean(fixed), tiles: tiles.length };
    for (let k = 0; k < tiles.length; k++) {
      if (shouldCancel && shouldCancel()) return { cancelled: true, info: { ...info, doneTiles: k } };
      const t = tiles[k];
      const feed = new ort.Tensor("float32", tileInput(src, W, H, t.x0 - pad, t.y0 - pad, T), [1, 3, T, T]);
      const t1 = performance.now();
      let res;
      try {
        res = await c.session.run({ [c.session.inputNames[0]]: feed });
      } catch (e) {
        if (c.backend !== "gpu") throw e;
        onStatus && onStatus("The graphics chip failed; continuing on the processor (slower)…");
        const cpu = await createSession(c.bytes, false);
        try {
          c.session.release && c.session.release();
        } catch (err) {
        }
        c.session = cpu.session;
        c.backend = "cpu";
        info.backend = "cpu (the graphics chip failed)";
        res = await c.session.run({ [c.session.inputNames[0]]: feed });
      }
      const o = res[c.session.outputNames[0]], OT = o.dims[3];
      if (!out) {
        S = OT / T;
        if (!Number.isInteger(S) || S < 1) throw new Error("Unexpected model output size " + o.dims.join("x") + " for an input of " + T + "x" + T + ".");
        out = document.createElement("canvas");
        out.width = W * S;
        out.height = H * S;
        outX = out.getContext("2d");
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < o.data.length; i += 11) {
          if (o.data[i] < lo) lo = o.data[i];
          if (o.data[i] > hi) hi = o.data[i];
        }
        info.outputDims = o.dims.join("x");
        info.scale = S;
        info.valueRange = lo.toFixed(3) + " to " + hi.toFixed(3);
      }
      const rgba = tileToRgba(o.data, OT, S, pad, t.w, t.h);
      outX.putImageData(new ImageData(rgba, t.w * S, t.h * S), t.x0 * S, t.y0 * S);
      times.push(Math.round(performance.now() - t1));
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      onProgress && onProgress(k + 1, tiles.length, avg);
      await new Promise((r) => setTimeout(r, 0));
    }
    touch5();
    info.firstTileMs = times[0];
    info.slowestTileMs = Math.max(...times);
    info.avgTileMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    return { canvas: out, info };
  }

  // shared/js/ai/manager.js
  var CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VERSION + "/dist/";
  var SIZES = { model: 28.2, runtimeGpu: 30.4, runtimeCpu: 15.7 };
  function runtimeUrls(gpu) {
    return (gpu ? ["ort.all.min.js", "ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"] : ["ort.all.min.js", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]).map((f) => CDN + f);
  }
  async function downloadPlan() {
    const gpu = await gpuUsable();
    const runtimeMb = gpu ? SIZES.runtimeGpu : SIZES.runtimeCpu;
    return { gpu, modelMb: SIZES.model, runtimeMb, totalMb: Math.round(SIZES.model + runtimeMb) };
  }
  async function aiSaved() {
    const plan = await downloadPlan();
    const runtimeSaved = await Promise.all(runtimeUrls(plan.gpu).map(async (u) => {
      try {
        return Boolean(await caches.match(u));
      } catch (e) {
        return false;
      }
    }));
    return { model: await isModelSaved(DEFAULT_MODEL_URL), runtime: runtimeSaved.every(Boolean) };
  }
  async function downloadAi({ onProgress, signal, which = "fill", model = "u2netp" } = {}) {
    const bg = which === "background", face = which === "face", sam = which === "sam", up = which === "upscale";
    const plan = await downloadPlan();
    const saved = up ? await upscaleSaved() : sam ? await samSaved() : face ? await faceSaved() : bg ? await bgSaved(model) : await aiSaved();
    const modelMb = up ? UPSCALE_MODEL.mb : sam ? SAM_MODEL.mb : face ? FACE_MODEL.mb : bg ? bgModel(model).mb : plan.modelMb;
    const total = (saved.runtime ? 0 : plan.runtimeMb) + (saved.model ? 0 : modelMb);
    let doneMb = 0;
    const report = (extra) => onProgress && onProgress(Math.min(total, doneMb + extra), total);
    if (!saved.runtime) {
      for (const url of runtimeUrls(plan.gpu)) {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error("Couldn't download the AI runtime (HTTP " + res.status + ").");
        const copy = res.clone();
        const reader = res.body.getReader();
        let got = 0;
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          got += value.length;
          report(got / 1048576);
        }
        doneMb += got / 1048576;
        try {
          if (!await caches.match(url)) await (await caches.open("zinenow-ai-runtime")).put(url, copy);
        } catch (e) {
        }
      }
    }
    if (!saved.model) {
      if (up) await getModelBytes(UPSCALE_MODEL.url, (got) => report(got / 1048576), signal, UPSCALE_CACHE);
      else if (sam) {
        const first = await isModelSaved(SAM_MODEL.encoderUrl, SAM_CACHE) ? 0 : SAM_MODEL.encoderMb;
        await getModelBytes(SAM_MODEL.encoderUrl, (got) => report(got / 1048576), signal, SAM_CACHE);
        doneMb += first;
        await getModelBytes(SAM_MODEL.decoderUrl, (got) => report(got / 1048576), signal, SAM_CACHE);
      } else if (face) await getModelBytes(FACE_MODEL.url, (got) => report(got / 1048576), signal, FACE_CACHE);
      else if (bg) await getModelBytes(bgModel(model).url, (got) => report(got / 1048576), signal, BG_CACHE);
      else await getModelBytes(DEFAULT_MODEL_URL, (got) => report(got / 1048576), signal);
    }
    try {
      if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
    } catch (e) {
    }
    onProgress && onProgress(total, total);
  }
  async function bgPlan(key) {
    const plan = await downloadPlan();
    const mb = bgModel(key).mb;
    return { gpu: plan.gpu, modelMb: mb, runtimeMb: plan.runtimeMb, totalMb: Math.round(mb + plan.runtimeMb) };
  }
  async function bgSaved(key) {
    const saved = await aiSaved();
    return { model: await isModelSaved(bgModel(key).url, BG_CACHE), runtime: saved.runtime };
  }
  async function facePlan() {
    const plan = await downloadPlan();
    return { gpu: plan.gpu, modelMb: FACE_MODEL.mb, runtimeMb: plan.runtimeMb, totalMb: Math.round(FACE_MODEL.mb + plan.runtimeMb) };
  }
  async function faceSaved() {
    const saved = await aiSaved();
    return { model: await isModelSaved(FACE_MODEL.url, FACE_CACHE), runtime: saved.runtime };
  }
  async function upscalePlan() {
    const plan = await downloadPlan();
    return { gpu: plan.gpu, modelMb: UPSCALE_MODEL.mb, runtimeMb: plan.runtimeMb, totalMb: Math.round(UPSCALE_MODEL.mb + plan.runtimeMb) };
  }
  async function upscaleSaved() {
    const saved = await aiSaved();
    return { model: await isModelSaved(UPSCALE_MODEL.url, UPSCALE_CACHE), runtime: saved.runtime };
  }
  async function samPlan() {
    const plan = await downloadPlan();
    return { gpu: plan.gpu, modelMb: SAM_MODEL.mb, runtimeMb: plan.runtimeMb, totalMb: Math.round(SAM_MODEL.mb + plan.runtimeMb) };
  }
  async function samSaved() {
    const saved = await aiSaved();
    return { model: await isModelSaved(SAM_MODEL.encoderUrl, SAM_CACHE) && await isModelSaved(SAM_MODEL.decoderUrl, SAM_CACHE), runtime: saved.runtime };
  }
  async function anyModelSaved(except) {
    if (except !== "upscale" && await isModelSaved(UPSCALE_MODEL.url, UPSCALE_CACHE)) return true;
    if (except !== "sam" && (await isModelSaved(SAM_MODEL.encoderUrl, SAM_CACHE) || await isModelSaved(SAM_MODEL.decoderUrl, SAM_CACHE))) return true;
    if (except !== "face" && await isModelSaved(FACE_MODEL.url, FACE_CACHE)) return true;
    if (except !== "fill" && await isModelSaved(DEFAULT_MODEL_URL)) return true;
    for (const m of BG_MODELS) if (m.key !== except && await isModelSaved(m.url, BG_CACHE)) return true;
    return false;
  }
  async function deleteRuntime() {
    try {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) if (/onnxruntime-web/.test(req.url)) await cache.delete(req);
      }
    } catch (e) {
    }
  }
  async function deleteUpscale() {
    releaseUpscaleSession();
    await forgetModelUrl(UPSCALE_MODEL.url, UPSCALE_CACHE);
    if (!await anyModelSaved("upscale")) await deleteRuntime();
  }
  async function deleteSam() {
    releaseSamSession();
    await forgetModelUrl(SAM_MODEL.encoderUrl, SAM_CACHE);
    await forgetModelUrl(SAM_MODEL.decoderUrl, SAM_CACHE);
    if (!await anyModelSaved("sam")) await deleteRuntime();
  }
  async function deleteFace() {
    releaseFaceSession();
    await forgetModelUrl(FACE_MODEL.url, FACE_CACHE);
    if (!await anyModelSaved("face")) await deleteRuntime();
  }
  async function deleteBg(key) {
    releaseBgSession();
    await forgetModelUrl(bgModel(key).url, BG_CACHE);
    if (!await anyModelSaved(key)) await deleteRuntime();
  }
  async function deleteAi() {
    releaseSession();
    await forgetModel();
    if (!await anyModelSaved("fill")) await deleteRuntime();
  }

  // shared/js/ai/ocrLangs.js
  var TJS_VERSION = "5.1.1";
  var CORE_VERSION = "5.1.0";
  var DATA_VERSION = "1.0.0";
  var TJS_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@" + TJS_VERSION + "/dist/tesseract.min.js";
  var WORKER_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@" + TJS_VERSION + "/dist/worker.min.js";
  var CORE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js-core@" + CORE_VERSION;
  var OCR_ENGINE_MB = 4.1;
  var OCR_ENGINE = { name: "Tesseract.js reader", licence: "Apache-2.0", host: "cdn.jsdelivr.net", repo: "cdn.jsdelivr.net/npm/tesseract.js@" + TJS_VERSION, mb: OCR_ENGINE_MB };
  var OCR_LANGS = [
    { code: "eng", name: "English", mb: 2.95 },
    { code: "msa", name: "Malay (Bahasa Melayu)", mb: 1.18 },
    { code: "ind", name: "Indonesian", mb: 1.19 },
    { code: "chi_sim", name: "Chinese (simplified)", mb: 1.72 },
    { code: "chi_tra", name: "Chinese (traditional)", mb: 1.66 },
    { code: "tam", name: "Tamil", mb: 1.45 }
  ];
  var ocrLang = (code) => OCR_LANGS.find((l) => l.code === code) || OCR_LANGS[0];
  var ocrLangUrl = (code) => "https://cdn.jsdelivr.net/npm/@tesseract.js-data/" + code + "@" + DATA_VERSION + "/4.0.0_best_int";
  function ocrModel(l) {
    return {
      key: "ocr-" + l.code,
      name: l.name,
      kind: "Text reading (OCR)",
      label: l.name + " (Text reading)",
      mb: l.mb,
      licence: "Apache-2.0",
      host: "cdn.jsdelivr.net",
      repo: "cdn.jsdelivr.net/npm/@tesseract.js-data/" + l.code,
      about: "The " + l.name + " language file for the Tesseract text reader."
    };
  }

  // shared/js/ai/ocr.js
  var FLAG = "zinenow.ocr.engineSaved";
  var IDLE_MS6 = 6e4;
  var workers = /* @__PURE__ */ new Map();
  var timer6 = 0;
  var ocrEngineSaved = () => {
    try {
      return localStorage.getItem(FLAG) === "1";
    } catch (e) {
      return false;
    }
  };
  var setEngineFlag = (on) => {
    try {
      if (on) localStorage.setItem(FLAG, "1");
      else localStorage.removeItem(FLAG);
    } catch (e) {
    }
  };
  function idb(fn) {
    return new Promise((resolve) => {
      let q;
      try {
        q = indexedDB.open("keyval-store");
      } catch (e) {
        resolve(null);
        return;
      }
      q.onupgradeneeded = () => {
        try {
          q.result.createObjectStore("keyval");
        } catch (e) {
        }
      };
      q.onerror = () => resolve(null);
      q.onsuccess = async () => {
        const db = q.result;
        try {
          resolve(await fn(db));
        } catch (e) {
          resolve(null);
        } finally {
          db.close();
        }
      };
    });
  }
  async function ocrLangSaved(code) {
    const r = await idb((db) => new Promise((res) => {
      if (!db.objectStoreNames.contains("keyval")) {
        res(false);
        return;
      }
      const q = db.transaction("keyval").objectStore("keyval").getKey("./" + code + ".traineddata");
      q.onsuccess = () => res(q.result !== void 0);
      q.onerror = () => res(false);
    }));
    return Boolean(r);
  }
  var scriptPromise = null;
  function loadTesseract() {
    if (self.Tesseract) return Promise.resolve(self.Tesseract);
    if (!scriptPromise) {
      scriptPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = TJS_URL;
        s.onload = () => resolve(self.Tesseract);
        s.onerror = () => {
          scriptPromise = null;
          reject(new Error("Couldn't load the text reader. It needs the internet the first time."));
        };
        document.head.append(s);
      });
    }
    return scriptPromise;
  }
  var makeWorker = async (code, logger = () => {
  }) => (await loadTesseract()).createWorker(code, 1, { workerPath: WORKER_URL, corePath: CORE_URL, langPath: ocrLangUrl(code), logger });
  async function downloadOcr(code, { onProgress, signal } = {}) {
    const lang = ocrLang(code);
    const engine = ocrEngineSaved() ? 0 : OCR_ENGINE_MB;
    const total = engine + lang.mb;
    let aborted = false;
    if (signal) signal.addEventListener("abort", () => {
      aborted = true;
    });
    const report = (done) => onProgress && onProgress(Math.min(total, done), total);
    report(0);
    const worker = await makeWorker(code, (m) => {
      if (typeof m.progress !== "number") return;
      if (/core/.test(m.status)) report(m.progress * engine);
      else if (/language/.test(m.status)) report(engine + m.progress * lang.mb);
      else if (/initializing/.test(m.status)) report(engine + (m.status.includes("api") ? lang.mb : 0));
    });
    try {
      await worker.terminate();
    } catch (e) {
    }
    setEngineFlag(true);
    try {
      if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
    } catch (e) {
    }
    report(total);
    if (aborted) {
      const err = new Error("Cancelled");
      err.name = "AbortError";
      throw err;
    }
  }
  function releaseOcr() {
    clearTimeout(timer6);
    const all = [...workers.values()];
    workers.clear();
    for (const w of all) Promise.resolve(w).then((x) => {
      if (x && x.terminate) {
        try {
          x.terminate();
        } catch (e) {
        }
      }
    }, () => {
    });
  }
  var touch6 = () => {
    clearTimeout(timer6);
    timer6 = setTimeout(releaseOcr, IDLE_MS6);
  };
  async function deleteEngineFiles() {
    setEngineFlag(false);
    try {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) if (/tesseract/i.test(req.url)) await cache.delete(req);
      }
    } catch (e) {
    }
  }
  async function deleteOcrLang(code, allCodes) {
    releaseOcr();
    await idb((db) => new Promise((res) => {
      const t = db.transaction("keyval", "readwrite");
      t.objectStore("keyval").delete("./" + code + ".traineddata");
      t.oncomplete = () => res(true);
      t.onerror = () => res(false);
    }));
    let any = false;
    for (const c of allCodes) if (c !== code && await ocrLangSaved(c)) any = true;
    if (!any) await deleteEngineFiles();
  }
  async function recognizeText(canvas, { lang = "eng", psm = "3" } = {}, onStatus) {
    if (!await ocrLangSaved(lang)) throw new Error(ocrLang(lang).name + " is not downloaded. Download it first (Models page, or the Text from image tool).");
    touch6();
    if (!workers.has(lang)) {
      onStatus && onStatus("Starting the text reader…");
      workers.set(lang, makeWorker(lang).catch((e) => {
        workers.delete(lang);
        throw e;
      }));
    }
    const worker = await workers.get(lang);
    await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
    onStatus && onStatus("Reading the text…");
    const t0 = performance.now();
    const { data } = await worker.recognize(canvas);
    touch6();
    return { text: (data.text || "").trim(), confidence: data.confidence || 0, words: (data.words || []).filter((w) => w.text && w.text.trim()), runMs: Math.round(performance.now() - t0) };
  }

  // shared/js/ai/modelList.js
  var FILL_MODEL = {
    key: "migan",
    name: "MI-GAN",
    kind: "Remove object",
    label: "MI-GAN (Remove object)",
    mb: 28.2,
    licence: "MIT",
    host: "huggingface.co",
    repo: "huggingface.co/lxfater/inpaint-web",
    url: DEFAULT_MODEL_URL,
    about: "Fills the area you mark with what would plausibly be behind it."
  };
  var MODEL_ROWS = [
    { id: "fill", tool: "Remove object", model: FILL_MODEL },
    ...BG_MODELS.map((m) => ({ id: "bg:" + m.key, tool: "Remove background", model: m })),
    { id: "face", tool: "Face blur", model: FACE_MODEL },
    { id: "sam", tool: "Click-to-select", model: SAM_MODEL },
    { id: "upscale", tool: "Upscale", model: UPSCALE_MODEL },
    ...OCR_LANGS.map((l) => ({ id: "ocr:" + l.code, tool: "Text from image", model: ocrModel(l) }))
  ];

  // apps/AiToolsLocal/src/dialog.js
  function confirmDialog({ title, points, ok = "OK", cancel = "Cancel" }) {
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "dlg-backdrop";
      const box = document.createElement("div");
      box.className = "dlg";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-label", title);
      const h = document.createElement("div");
      h.className = "dlg-title";
      h.textContent = title;
      const ul = document.createElement("ul");
      ul.className = "dlg-points";
      for (const p of points) {
        const li = document.createElement("li");
        if (typeof p === "string") li.textContent = p;
        else li.append(p);
        ul.append(li);
      }
      const row = document.createElement("div");
      row.className = "dlg-actions";
      const no = document.createElement("button");
      no.type = "button";
      no.textContent = cancel;
      const yes = document.createElement("button");
      yes.type = "button";
      yes.className = "btn-solid";
      yes.textContent = ok;
      row.append(no, yes);
      box.append(h, ul, row);
      back.append(box);
      document.body.append(back);
      const done = (v) => {
        document.removeEventListener("keydown", onKey, true);
        back.remove();
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          done(false);
        }
      };
      document.addEventListener("keydown", onKey, true);
      no.addEventListener("click", () => done(false));
      yes.addEventListener("click", () => done(true));
      back.addEventListener("pointerdown", (e) => {
        if (e.target === back) done(false);
      });
      yes.focus();
    });
  }
  function rich(parts2) {
    const s = document.createElement("span");
    for (const [text, bold] of parts2) {
      if (bold) {
        const b = document.createElement("b");
        b.textContent = text;
        s.append(b);
      } else s.append(text);
    }
    return s;
  }

  // apps/AiToolsLocal/src/models.js
  var controls = /* @__PURE__ */ new Map();
  var globalListeners = /* @__PURE__ */ new Set();
  var onModelsChanged = (fn) => {
    globalListeners.add(fn);
    return () => globalListeners.delete(fn);
  };
  var tellAll = () => {
    for (const f of globalListeners) f();
  };
  var rowFor = (id) => MODEL_ROWS.find((r) => r.id === id);
  function modelControl(id) {
    if (controls.has(id)) return controls.get(id);
    const row = rowFor(id);
    const isFill = id === "fill", isFace = id === "face", isSam = id === "sam", isUp = id === "upscale", isOcr = id.startsWith("ocr:"), ocrCode = isOcr ? id.slice(4) : "";
    const listeners = /* @__PURE__ */ new Set();
    const state = { phase: "checking", plan: null, doneMb: 0, totalMb: 0, error: null };
    let abort = null;
    const emit = () => {
      for (const f of listeners) f(state);
      tellAll();
    };
    const set = (patch) => {
      Object.assign(state, patch);
      emit();
    };
    async function refresh2() {
      try {
        if (isOcr) {
          const saved2 = await ocrLangSaved(ocrCode) && ocrEngineSaved();
          set({ phase: saved2 ? "ready" : "none", plan: { gpu: false, modelMb: row.model.mb, runtimeMb: OCR_ENGINE_MB, totalMb: Math.round(row.model.mb + OCR_ENGINE_MB) } });
          return;
        }
        const [saved, plan] = await Promise.all(isFill ? [aiSaved(), downloadPlan()] : isFace ? [faceSaved(), facePlan()] : isSam ? [samSaved(), samPlan()] : isUp ? [upscaleSaved(), upscalePlan()] : [bgSaved(row.model.key), bgPlan(row.model.key)]);
        set({ phase: saved.model && saved.runtime ? "ready" : "none", plan });
      } catch (e) {
        set({ phase: "none", error: e && e.message ? e.message : String(e) });
      }
    }
    async function download() {
      const ctl2 = new AbortController();
      abort = ctl2;
      set({ phase: "downloading", doneMb: 0, totalMb: state.plan ? state.plan.totalMb : 0, error: null });
      try {
        if (isOcr) await downloadOcr(ocrCode, { signal: ctl2.signal, onProgress: (done, total) => set({ doneMb: done, totalMb: total }) });
        else await downloadAi({ which: isFill ? "fill" : isFace ? "face" : isSam ? "sam" : isUp ? "upscale" : "background", model: isFill || isFace || isSam || isUp ? void 0 : row.model.key, signal: ctl2.signal, onProgress: (done, total) => set({ doneMb: done, totalMb: total }) });
        await refresh2();
      } catch (e) {
        await refresh2();
        if (!(e && e.name === "AbortError")) set({ error: "The download didn't finish: " + (e && e.message ? e.message : e) });
      } finally {
        abort = null;
      }
    }
    const cancel = () => {
      if (abort) abort.abort();
    };
    async function remove() {
      await (isOcr ? deleteOcrLang(ocrCode, OCR_LANGS.map((l) => l.code)) : isFill ? deleteAi() : isFace ? deleteFace() : isSam ? deleteSam() : isUp ? deleteUpscale() : deleteBg(row.model.key));
      await refresh2();
    }
    const ctl = { id, row, state, refresh: refresh2, download, cancel, remove, subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    } };
    controls.set(id, ctl);
    refresh2();
    return ctl;
  }
  async function askDownload(ctl) {
    const m = ctl.row.model, plan = ctl.state.plan;
    if (!plan) return false;
    return confirmDialog({
      title: "Download AI model?",
      points: [
        rich([["You are downloading "], [m.kind === "Remove object" ? "an AI object-remover model" : m.kind === "Face detection" ? "an AI face-detection model" : m.kind === "Click-to-select" ? "an AI click-to-select model (two files)" : m.kind === "Upscale" ? "an AI upscaling model" : m.kind === "Text reading (OCR)" ? "an AI text-reading (OCR) language file" : "an AI background-remover model"], [" ("], [m.label, true], [", about " + (m.mb < 1 ? "0.2" : Math.round(m.mb * 10) / 10) + " MB, " + m.licence + " licence) from "], [m.host, true], [" (" + m.repo + "), plus its runtime (about " + Math.round(plan.runtimeMb) + " MB, skipped if you already have it) from "], ["cdn.jsdelivr.net", true], [". About " + plan.totalMb + " MB in total."]]),
        "The AI model will not connect to the internet. It runs on your device and no file or picture leaves your device.",
        rich([["Warning:", true], [" it may freeze or cause lag on certain lower-end devices. You can delete it later (Delete button)."]])
      ],
      ok: "Confirm Download",
      cancel: "Cancel"
    });
  }
  function askDelete(ctl) {
    const m = ctl.row.model;
    return confirmDialog({
      title: "Delete AI model?",
      points: [
        "This removes " + m.label + " from this device. The runtime is only removed when no AI model needs it.",
        "ZEditor uses the same files, so it may need to download them again.",
        "You can download it again any time."
      ],
      ok: "Delete",
      cancel: "Cancel"
    });
  }
  var el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  function sizeLabel(mb) {
    if (mb >= 1e3) return Math.round(mb / 100) / 10 + " GB";
    return (mb < 1 ? mb.toFixed(2) : String(Math.round(mb * 10) / 10)) + " MB";
  }
  function modelBox(id, { compact = false, deletable = true, showSize = false } = {}) {
    const ctl = modelControl(id), m = ctl.row.model;
    const box = el("div", "model-box");
    const title = el("div", "model-title");
    title.append(el("b", "", m.name + " (" + m.kind + ")"));
    if (showSize) title.append(el("span", "model-size", sizeLabel(m.mb)));
    const facts = el("span", "hint", (compact ? "" : m.about + " ") + m.licence + " licence (free and open source). About " + Math.round(m.mb * 10) / 10 + " MB, downloaded from " + m.repo + ". Runs on your device; nothing is uploaded.");
    const live = el("div", "model-live");
    box.append(title, facts, live);
    function draw(s) {
      live.textContent = "";
      if (s.phase === "checking") live.append(el("span", "hint", "Checking…"));
      else if (s.phase === "none") {
        const b = el("button", "btn-solid wide", "Download " + m.name + (s.plan ? " (about " + s.plan.totalMb + " MB)" : ""));
        b.type = "button";
        b.addEventListener("click", async () => {
          if (await askDownload(ctl)) ctl.download();
        });
        live.append(b);
      } else if (s.phase === "downloading") {
        const p = document.createElement("progress");
        p.max = s.totalMb || 1;
        p.value = s.doneMb;
        const t = el("span", "hint", "Downloading… " + s.doneMb.toFixed(1) + " of " + s.totalMb.toFixed(1) + " MB");
        const c = el("button", "wide", "Cancel download");
        c.type = "button";
        c.addEventListener("click", ctl.cancel);
        live.append(p, t, c);
      } else if (s.phase === "ready") {
        live.append(el("span", "hint ok", "Downloaded: works offline." + (deletable ? "" : " (Delete it on the Models page.)")));
        if (deletable) {
          const d = el("button", "wide", "Delete " + m.name);
          d.type = "button";
          d.addEventListener("click", async () => {
            if (await askDelete(ctl)) ctl.remove();
          });
          live.append(d);
        }
      }
      if (s.error) live.append(el("span", "hint bad", s.error));
    }
    draw(ctl.state);
    const off = ctl.subscribe(draw);
    box.dispose = off;
    return box;
  }

  // apps/AiToolsLocal/src/modelsPage.js
  var el2 = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  function createModelsPage(host) {
    host.hidden = true;
    host.className = "models-page";
    let off = null, boxes = [];
    async function build() {
      host.textContent = "";
      for (const b of boxes) b.dispose && b.dispose();
      boxes = [];
      host.append(el2("h2", "", "Models"));
      host.append(el2("p", "hint", "Every AI model the tools use. They run on this device and nothing is uploaded. Each is downloaded once, only when you choose to, then works offline. Delete any you don't need."));
      const total = el2("p", "total");
      host.append(total);
      const toolFor = /* @__PURE__ */ new Map();
      for (const r of MODEL_ROWS) {
        const card = el2("div", "model-card");
        card.append(el2("div", "model-tool", "Used by: " + r.tool));
        const box = modelBox(r.id, { showSize: true });
        boxes.push(box);
        card.append(box);
        host.append(card);
        toolFor.set(r.id, r);
      }
      const engine = el2("div", "model-card");
      engine.append(el2("div", "model-tool", "Shared by all tools"));
      const eTitle = el2("b", "", "AI engine (ONNX Runtime Web " + ORT_VERSION + ")");
      const eFacts = el2("span", "hint", "MIT licence. Downloaded from cdn.jsdelivr.net the first time you download any model (about 16 to 30 MB, depending on your device), then kept. It is removed automatically when the last AI model is deleted.");
      const eState = el2("span", "hint");
      engine.append(eTitle, eFacts, eState);
      host.append(engine);
      const tess = el2("div", "model-card");
      tess.append(el2("div", "model-tool", "Used by: Text from image"));
      const tHead = el2("div", "model-title");
      tHead.append(el2("b", "", OCR_ENGINE.name), el2("span", "model-size", "about " + OCR_ENGINE.mb + " MB"));
      const tFacts = el2("span", "hint", OCR_ENGINE.licence + " licence. Downloaded from " + OCR_ENGINE.repo + " the first time you download a language, then kept. It is removed automatically when the last language is deleted.");
      const tState = el2("span", "hint");
      const tBox = el2("div", "model-box");
      tBox.append(tHead, tFacts, tState);
      tess.append(tBox);
      host.append(tess);
      async function updateTotals() {
        const saved = await aiSaved();
        const plan = await downloadPlan();
        let mb = saved.runtime ? plan.runtimeMb : 0;
        let n = 0;
        for (const r of MODEL_ROWS) if (modelControl(r.id).state.phase === "ready") {
          mb += r.model.mb;
          n++;
        }
        tState.textContent = ocrEngineSaved() ? "On this device." : "Not downloaded.";
        tState.className = "hint" + (ocrEngineSaved() ? " ok" : "");
        if (ocrEngineSaved()) mb += OCR_ENGINE.mb;
        eState.textContent = saved.runtime ? "On this device (about " + Math.round(plan.runtimeMb) + " MB)." : "Not downloaded.";
        eState.className = "hint" + (saved.runtime ? " ok" : "");
        total.textContent = n || saved.runtime || ocrEngineSaved() ? "Saved on this device: " + n + " model" + (n === 1 ? "" : "s") + (saved.runtime ? ", the AI engine" : "") + (ocrEngineSaved() ? ", the text reader" : "") + ", about " + Math.round(mb) + " MB in total." : "Nothing is downloaded yet.";
      }
      off = onModelsChanged(updateTotals);
      updateTotals();
    }
    return {
      show() {
        host.hidden = false;
        build();
      },
      hide() {
        host.hidden = true;
        if (off) off();
        off = null;
        for (const b of boxes) b.dispose && b.dispose();
        boxes = [];
        host.textContent = "";
      }
    };
  }

  // apps/AiToolsLocal/src/picture.js
  var MAX_SIDE = 4096;
  var MAX_UNDO = 8;
  function createPicture({ stage, world, imgC, origC, emptyEl, onChange }) {
    const imgX = imgC.getContext("2d", { willReadFrequently: true });
    const overlays = [];
    let fileName = "picture";
    let loaded = false, busy = false;
    let view = { s: 1, x: 0, y: 0 };
    let undoStack = [], redoStack = [];
    let handler = null;
    const openListeners = [], viewListeners = [];
    const changed = () => onChange && onChange();
    const toImage = (e) => {
      const r = stage.getBoundingClientRect();
      return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s };
    };
    function applyView() {
      world.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.s + ")";
      for (const f of viewListeners) f();
    }
    function fit() {
      const r = stage.getBoundingClientRect();
      const s = Math.min(r.width / imgC.width, r.height / imgC.height, 1) * 0.96;
      view = { s, x: (r.width - imgC.width * s) / 2, y: (r.height - imgC.height * s) / 2 };
      applyView();
    }
    async function open(file) {
      if (!file || !/^image\//.test(file.type || "image/")) return { ok: false, message: "That isn't a picture file." };
      try {
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
        for (const c of [imgC, origC, ...overlays]) {
          c.width = w;
          c.height = h;
        }
        imgX.clearRect(0, 0, w, h);
        imgX.drawImage(bmp, 0, 0, w, h);
        origC.getContext("2d").drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        fileName = (file.name || "picture").replace(/\.[^.]+$/, "");
        for (const b of [...undoStack, ...redoStack]) b.close && b.close();
        undoStack = [];
        redoStack = [];
        loaded = true;
        emptyEl.hidden = true;
        world.hidden = false;
        fit();
        changed();
        for (const f of openListeners) f();
        return { ok: true, width: w, height: h, shrunk: k < 1 };
      } catch (e) {
        return { ok: false, message: "Couldn't open that picture: " + e.message };
      }
    }
    function setSize(w, h) {
      for (const c of [imgC, ...overlays]) {
        c.width = w;
        c.height = h;
      }
    }
    const snapshot = () => createImageBitmap(imgC);
    function commit(before) {
      undoStack.push(before);
      if (undoStack.length > MAX_UNDO) undoStack.shift().close();
      for (const b of redoStack) b.close && b.close();
      redoStack = [];
      changed();
    }
    async function swap(from, to) {
      if (!from.length || busy) return false;
      to.push(await createImageBitmap(imgC));
      const bmp = from.pop();
      const resized = bmp.width !== imgC.width || bmp.height !== imgC.height;
      if (resized) setSize(bmp.width, bmp.height);
      imgX.clearRect(0, 0, imgC.width, imgC.height);
      imgX.drawImage(bmp, 0, 0);
      bmp.close();
      if (resized) fit();
      changed();
      return true;
    }
    const undo = () => swap(undoStack, redoStack);
    const redo = () => swap(redoStack, undoStack);
    const toBlob = () => new Promise((resolve, reject) => imgC.toBlob((b) => b ? resolve(b) : reject(new Error("Couldn't make the picture.")), "image/png"));
    const pointers = /* @__PURE__ */ new Map();
    let pinch = null, gesture = false;
    stage.addEventListener("pointerdown", (e) => {
      if (!loaded || busy) return;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        if (gesture && handler && handler.cancel) handler.cancel();
        gesture = false;
        const [p, q] = [...pointers.values()];
        pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2 };
        return;
      }
      if (pointers.size > 2) return;
      if (handler && handler.down) {
        gesture = true;
        handler.down(toImage(e), e);
      }
    });
    stage.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [p, q] = [...pointers.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y), cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2;
        const r = stage.getBoundingClientRect();
        const s2 = Math.min(40, Math.max(0.05, view.s * d / pinch.d));
        const ix = (pinch.cx - r.left - view.x) / view.s, iy = (pinch.cy - r.top - view.y) / view.s;
        view = { s: s2, x: cx - r.left - ix * s2, y: cy - r.top - iy * s2 };
        pinch = { d, cx, cy };
        applyView();
        return;
      }
      if (gesture && handler && handler.move) handler.move(toImage(e), e);
    });
    function endPointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0 && gesture) {
        gesture = false;
        if (handler && handler.up) handler.up(toImage(e), e);
      }
    }
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);
    stage.addEventListener("wheel", (e) => {
      if (!loaded) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const s2 = Math.min(40, Math.max(0.05, view.s * Math.exp(-e.deltaY * 15e-4)));
      const ix = (e.clientX - r.left - view.x) / view.s, iy = (e.clientY - r.top - view.y) / view.s;
      view = { s: s2, x: e.clientX - r.left - ix * s2, y: e.clientY - r.top - iy * s2 };
      applyView();
    }, { passive: false });
    stage.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("resize", () => {
      if (loaded) fit();
    });
    return {
      stage,
      world,
      canvas: imgC,
      ctx: imgX,
      original: origC,
      get loaded() {
        return loaded;
      },
      get width() {
        return imgC.width;
      },
      get height() {
        return imgC.height;
      },
      get name() {
        return fileName;
      },
      get busy() {
        return busy;
      },
      setBusy(b) {
        busy = Boolean(b);
        changed();
      },
      get canUndo() {
        return undoStack.length > 0;
      },
      get canRedo() {
        return redoStack.length > 0;
      },
      get depth() {
        return undoStack.length;
      },
      get view() {
        return { ...view };
      },
      setView(v) {
        view = { ...v };
        applyView();
      },
      // Replaces the picture with `canvas` (any size, e.g. a crop); the caller takes a snapshot first and commits it, so it is one undo step.
      replaceWith(canvas) {
        const resized = canvas.width !== imgC.width || canvas.height !== imgC.height;
        if (resized) setSize(canvas.width, canvas.height);
        imgX.clearRect(0, 0, imgC.width, imgC.height);
        imgX.drawImage(canvas, 0, 0);
        if (resized) fit();
      },
      // Is the picture still the same size as the one that was opened (only then can "Hold to compare" show the original)?
      get comparable() {
        return imgC.width === origC.width && imgC.height === origC.height;
      },
      onView(fn) {
        viewListeners.push(fn);
      },
      toImage,
      fit,
      open,
      snapshot,
      commit,
      undo,
      redo,
      toBlob,
      setPointerHandler(h) {
        handler = h;
      },
      // A canvas a tool draws on top of the picture (same size, follows it). Returns the canvas.
      addOverlay(canvas) {
        canvas.classList.add("overlay");
        canvas.width = imgC.width;
        canvas.height = imgC.height;
        overlays.push(canvas);
        world.append(canvas);
        return canvas;
      },
      removeOverlay(canvas) {
        const i = overlays.indexOf(canvas);
        if (i >= 0) overlays.splice(i, 1);
        canvas.remove();
      },
      onOpen(fn) {
        openListeners.push(fn);
      },
      showOriginal(on) {
        origC.hidden = !on;
        imgC.style.visibility = on ? "hidden" : "visible";
      }
    };
  }

  // apps/AiToolsLocal/src/registry.js
  var tools = [];
  var registerTool = (t) => {
    tools.push(t);
    return t;
  };
  var allTools = () => tools.slice();

  // apps/AiToolsLocal/src/tools/faceBlur.js
  var el3 = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var MIN_BOX = 8;
  function hideBox(ctx2, src, b, mode, strength) {
    if (b.w < 1 || b.h < 1) return;
    if (mode === "black") {
      ctx2.fillStyle = "#000";
      ctx2.fillRect(b.x, b.y, b.w, b.h);
      return;
    }
    if (mode === "pixel") {
      const cells = Math.max(3, Math.round(24 - strength / 100 * 20));
      const block = Math.max(2, Math.round(Math.max(b.w, b.h) / cells));
      const t = document.createElement("canvas");
      t.width = Math.max(1, Math.round(b.w / block));
      t.height = Math.max(1, Math.round(b.h / block));
      t.getContext("2d").drawImage(src, b.x, b.y, b.w, b.h, 0, 0, t.width, t.height);
      ctx2.save();
      ctx2.imageSmoothingEnabled = false;
      ctx2.drawImage(t, 0, 0, t.width, t.height, b.x, b.y, b.w, b.h);
      ctx2.restore();
      return;
    }
    const radius = Math.max(1, strength / 100 * 0.3 * Math.max(b.w, b.h));
    ctx2.save();
    ctx2.beginPath();
    ctx2.rect(b.x, b.y, b.w, b.h);
    ctx2.clip();
    if (typeof ctx2.filter === "string") {
      ctx2.filter = "blur(" + radius + "px)";
      ctx2.drawImage(src, 0, 0);
    } else {
      const f = Math.max(2, Math.round(radius / 2));
      const t = document.createElement("canvas");
      t.width = Math.max(1, Math.round(b.w / f));
      t.height = Math.max(1, Math.round(b.h / f));
      const tx = t.getContext("2d");
      tx.imageSmoothingQuality = "high";
      tx.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, t.width, t.height);
      ctx2.imageSmoothingQuality = "high";
      ctx2.drawImage(t, 0, 0, t.width, t.height, b.x, b.y, b.w, b.h);
    }
    ctx2.restore();
  }
  var faceBlurTool = {
    id: "face-blur",
    name: "Face blur",
    summary: "Find faces and hide them: blur, pixelate or a black box.",
    create(ctx2) {
      const { picture: picture2 } = ctx2;
      const facesC = picture2.addOverlay(document.createElement("canvas"));
      facesC.id = "faces";
      facesC.style.display = "none";
      const fx = facesC.getContext("2d");
      const ctl = modelControl("face");
      let mounted = false, ui = {};
      let found = null;
      let manual = [];
      let minScore = 60, mode = "blur", strength = 50, pad = 15, drawMode = false;
      let drag = null;
      const visible = () => [...found ? found.faces.filter((f) => f.score * 100 >= minScore) : [], ...manual];
      const boxOf = (f) => f.manual ? { x: Math.round(f.x), y: Math.round(f.y), w: Math.round(f.w), h: Math.round(f.h) } : paddedBox(f, pad, picture2.width, picture2.height);
      function drawBoxes() {
        fx.clearRect(0, 0, facesC.width, facesC.height);
        if (!found && !manual.length && !drag) {
          facesC.style.display = "none";
          return;
        }
        facesC.style.display = "";
        const s = picture2.view.s;
        visible().forEach((f, i) => {
          const b = boxOf(f);
          fx.lineWidth = 3 / s;
          if (f.on) {
            fx.setLineDash([]);
            fx.strokeStyle = "#e8622a";
          } else {
            fx.setLineDash([8 / s, 6 / s]);
            fx.strokeStyle = "#9a9a9a";
          }
          fx.strokeRect(b.x, b.y, b.w, b.h);
          fx.setLineDash([]);
          const label = i + 1 + (f.manual ? "" : " · " + Math.round(f.score * 100) + "%"), fs = 13 / s;
          fx.font = "bold " + fs + "px sans-serif";
          const tw = fx.measureText(label).width + 8 / s;
          fx.fillStyle = f.on ? "#e8622a" : "#6b6b6b";
          fx.fillRect(b.x, Math.max(0, b.y - fs - 6 / s), tw, fs + 6 / s);
          fx.fillStyle = "#fff";
          fx.fillText(label, b.x + 4 / s, Math.max(fs, b.y - 5 / s));
        });
        if (drag) {
          fx.setLineDash([8 / s, 6 / s]);
          fx.lineWidth = 2 / s;
          fx.strokeStyle = "#fff";
          fx.strokeRect(Math.min(drag.a.x, drag.b.x), Math.min(drag.a.y, drag.b.y), Math.abs(drag.b.x - drag.a.x), Math.abs(drag.b.y - drag.a.y));
          fx.setLineDash([]);
        }
        refresh2();
      }
      const handler = {
        down(pt) {
          if (drawMode) {
            drag = { a: pt, b: pt };
            return;
          }
          const hits = visible().filter((f) => {
            const b = boxOf(f);
            return pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h;
          }).sort((p, q) => p.w * p.h - q.w * q.h);
          if (hits.length) {
            hits[0].on = !hits[0].on;
            drawBoxes();
          }
        },
        move(pt) {
          if (drag) {
            drag.b = pt;
            drawBoxes();
          }
        },
        up() {
          if (!drag) return;
          const w = Math.abs(drag.b.x - drag.a.x), h = Math.abs(drag.b.y - drag.a.y);
          if (w >= MIN_BOX && h >= MIN_BOX) manual.push({ x: Math.min(drag.a.x, drag.b.x), y: Math.min(drag.a.y, drag.b.y), w, h, score: 1, manual: true, on: true });
          drag = null;
          drawBoxes();
        },
        cancel() {
          drag = null;
          drawBoxes();
        }
      };
      function reset() {
        found = null;
        manual = [];
        drag = null;
        fx.clearRect(0, 0, facesC.width, facesC.height);
        facesC.style.display = "none";
        refresh2();
      }
      async function find() {
        if (picture2.busy || !picture2.loaded || ctl.state.phase !== "ready") return;
        picture2.setBusy(true);
        try {
          ctx2.status("Starting the face detector…");
          const t0 = performance.now();
          const { faces, info } = await detectFaces(picture2.canvas, (t) => ctx2.status(t));
          found = { faces: faces.map((f) => ({ ...f, on: true })), depth: picture2.depth };
          ctx2.debug.section("Find faces", { picture: picture2.width + "x" + picture2.height, ...info, facesAt60pct: faces.filter((f) => f.score >= 0.6).length, bestScores: faces.slice(0, 8).map((f) => Math.round(f.score * 100) + "%").join(" ") });
          const n = visible().length;
          ctx2.status("Found " + faces.length + " possible face" + (faces.length === 1 ? "" : "s") + " in " + ((performance.now() - t0) / 1e3).toFixed(1) + " s; " + n + " shown at a minimum score of " + minScore + " %. Tap a box to leave that face alone, or draw a box by hand for one that was missed.", "ok");
          picture2.setPointerHandler(handler);
          drawBoxes();
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          picture2.setBusy(false);
        }
      }
      async function apply() {
        const todo = visible().filter((f) => f.on);
        if (!todo.length || picture2.busy) {
          ctx2.status("There is no face to hide: find faces first, or draw a box by hand.", "bad");
          return;
        }
        picture2.setBusy(true);
        try {
          const before = await picture2.snapshot();
          const src = document.createElement("canvas");
          src.width = picture2.width;
          src.height = picture2.height;
          src.getContext("2d").drawImage(picture2.canvas, 0, 0);
          for (const f of todo) hideBox(picture2.ctx, src, boxOf(f), mode, strength);
          picture2.commit(before);
          ctx2.debug.log("Face blur applied: " + todo.length + " box(es), " + mode + ", strength " + strength + ", grow " + pad + " %");
          reset();
          ctx2.status("Hid " + todo.length + " face" + (todo.length === 1 ? "" : "s") + " (" + (mode === "blur" ? "blur" : mode === "pixel" ? "pixelate" : "black box") + "). Undo brings them back.", "ok");
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          picture2.setBusy(false);
        }
      }
      function refresh2() {
        if (!mounted) return;
        const ready = ctl.state.phase === "ready", has = picture2.loaded, idle = !picture2.busy;
        ui.need.hidden = ready || ctl.state.phase === "checking";
        ui.find.disabled = !has || !idle || !ready;
        const n = visible().filter((f) => f.on).length;
        ui.apply.disabled = !has || !idle || n === 0;
        ui.apply.textContent = n ? "Hide " + n + " face" + (n === 1 ? "" : "s") : "Hide faces";
        ui.draw.classList.toggle("active", drawMode);
        ui.draw.textContent = drawMode ? "Drawing a box: drag on the picture (tap to stop)" : "Draw a box by hand";
        ui.draw.disabled = !has || !idle;
        ui.clearManual.hidden = !manual.length;
        ui.minScore.closest(".field").classList.toggle("off", !found);
        ui.strength.disabled = mode === "black";
      }
      picture2.onView(() => {
        if (mounted) drawBoxes();
      });
      picture2.onOpen(reset);
      ctl.subscribe(refresh2);
      return {
        mount(panel) {
          mounted = true;
          const secA = el3("section");
          secA.append(el3("h2", "", "Find faces"));
          ui.need = el3("p", "hint required", "Download required: get the face model below first.");
          ui.find = el3("button", "btn-solid big", "Find faces");
          ui.find.type = "button";
          ui.find.addEventListener("click", find);
          const msF = el3("label", "field");
          msF.append(el3("span", "", "Minimum score (%)"));
          const ms = document.createElement("input");
          ms.type = "number";
          ms.min = 10;
          ms.max = 100;
          ms.step = 5;
          ms.value = minScore;
          ms.addEventListener("input", () => {
            const v = Number(ms.value);
            if (ms.value.trim() !== "" && Number.isFinite(v)) {
              minScore = Math.min(100, Math.max(10, v));
              drawBoxes();
            }
          });
          msF.append(ms);
          wrapNumberInput(ms);
          ui.minScore = ms;
          const msH = el3("p", "hint", "Lower shows more possible faces (and more false ones). Tap a box on the picture to leave that face alone; tap again to include it.");
          ui.draw = el3("button", "wide", "Draw a box by hand");
          ui.draw.type = "button";
          ui.draw.addEventListener("click", () => {
            drawMode = !drawMode;
            if (picture2.loaded) picture2.setPointerHandler(handler);
            refresh2();
          });
          ui.clearManual = el3("button", "wide", "Remove my hand-drawn boxes");
          ui.clearManual.type = "button";
          ui.clearManual.hidden = true;
          ui.clearManual.addEventListener("click", () => {
            manual = [];
            drawBoxes();
            if (!found) {
              facesC.style.display = "none";
            }
          });
          secA.append(ui.need, ui.find, msF, msH, ui.draw, ui.clearManual);
          const secB = el3("section");
          secB.append(el3("h2", "", "Hide them with"));
          const seg = el3("div", "seg");
          seg.style.gridTemplateColumns = "repeat(3, 1fr)";
          for (const [key, label] of [["blur", "Blur"], ["pixel", "Pixelate"], ["black", "Black box"]]) {
            const b = el3("button", key === mode ? "active" : "", label);
            b.type = "button";
            b.addEventListener("click", () => {
              mode = key;
              for (const o of seg.children) o.classList.toggle("active", o === b);
              refresh2();
            });
            seg.append(b);
          }
          const stF = el3("label", "field");
          stF.append(el3("span", "", "Strength (%)"));
          const st = document.createElement("input");
          st.type = "number";
          st.min = 1;
          st.max = 100;
          st.step = 5;
          st.value = strength;
          st.addEventListener("input", () => {
            const v = Number(st.value);
            if (st.value.trim() !== "" && Number.isFinite(v)) strength = Math.min(100, Math.max(1, v));
          });
          stF.append(st);
          wrapNumberInput(st);
          ui.strength = st;
          const pdF = el3("label", "field");
          pdF.append(el3("span", "", "Grow each box by (%)"));
          const pd = document.createElement("input");
          pd.type = "number";
          pd.min = 0;
          pd.max = 100;
          pd.step = 5;
          pd.value = pad;
          pd.addEventListener("input", () => {
            const v = Number(pd.value);
            if (pd.value.trim() !== "" && Number.isFinite(v)) {
              pad = Math.min(100, Math.max(0, v));
              drawBoxes();
            }
          });
          pdF.append(pd);
          wrapNumberInput(pd);
          const pdH = el3("p", "hint", "The detector's box is tight; a little extra covers the forehead, ears and chin. Hand-drawn boxes are used as drawn.");
          ui.apply = el3("button", "btn-solid big", "Hide faces");
          ui.apply.type = "button";
          ui.apply.addEventListener("click", apply);
          const note = el3("p", "hint", "Hiding is applied to the picture (Undo brings it back). The detector only finds where faces are; it does not recognise or identify anyone.");
          secB.append(seg, stF, pdF, pdH, ui.apply, note);
          const secC = el3("section");
          secC.append(el3("h2", "", "Model"));
          secC.append(modelBox("face", { compact: true, deletable: false }));
          panel.append(secA, secB, secC);
          if (found || manual.length || drawMode) picture2.setPointerHandler(handler);
          drawBoxes();
          refresh2();
        },
        unmount() {
          mounted = false;
          drag = null;
          facesC.style.display = "none";
          picture2.setPointerHandler(null);
        },
        onPictureChange() {
          if (found && picture2.depth !== found.depth) reset();
          refresh2();
        },
        primary() {
          if (found || manual.length) apply();
          else find();
        }
      };
    }
  };

  // apps/AiToolsLocal/src/tools/ocr.js
  var el4 = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var MIN_BOX2 = 12;
  var PSMS = [["3", "Automatic (a normal page with paragraphs)"], ["11", "Scattered text (signs, posters, zine pages)"], ["6", "One block of text"], ["7", "One line"]];
  var confColor = (c) => c >= 80 ? "#3fd26f" : c >= 55 ? "#f2c94c" : "#ff5a5a";
  var ocrTool = {
    id: "ocr",
    name: "Text from image",
    summary: "Read the text in a picture and copy it.",
    create(ctx2) {
      const { picture: picture2 } = ctx2;
      const boxesC = picture2.addOverlay(document.createElement("canvas"));
      boxesC.id = "ocrboxes";
      boxesC.style.display = "none";
      const bx = boxesC.getContext("2d");
      let mounted = false, ui = {}, boxEl = null;
      let lang = "eng", psm = "3", showBoxes = true, drawMode = false;
      let area = null;
      let result = null;
      let drag = null;
      const unsub = [];
      const ctl = () => modelControl("ocr:" + lang);
      function drawOverlay() {
        bx.clearRect(0, 0, boxesC.width, boxesC.height);
        if (!area && !(result && showBoxes) && !drag) {
          boxesC.style.display = "none";
          return;
        }
        boxesC.style.display = "";
        const s = picture2.view.s;
        if (area) {
          bx.lineWidth = 2.5 / s;
          bx.setLineDash([8 / s, 6 / s]);
          bx.strokeStyle = "#fff";
          bx.strokeRect(area.x, area.y, area.w, area.h);
          bx.setLineDash([]);
        }
        if (result && showBoxes) {
          bx.lineWidth = Math.max(1.5, 2 / s);
          for (const w of result.words) {
            bx.strokeStyle = confColor(w.confidence);
            bx.strokeRect(result.region.x + w.bbox.x0, result.region.y + w.bbox.y0, w.bbox.x1 - w.bbox.x0, w.bbox.y1 - w.bbox.y0);
          }
        }
        if (drag) {
          bx.lineWidth = 2 / s;
          bx.setLineDash([8 / s, 6 / s]);
          bx.strokeStyle = "#e8622a";
          bx.strokeRect(Math.min(drag.a.x, drag.b.x), Math.min(drag.a.y, drag.b.y), Math.abs(drag.b.x - drag.a.x), Math.abs(drag.b.y - drag.a.y));
          bx.setLineDash([]);
        }
      }
      const handler = {
        down(pt) {
          if (drawMode) drag = { a: pt, b: pt };
        },
        move(pt) {
          if (drag) {
            drag.b = pt;
            drawOverlay();
          }
        },
        up() {
          if (!drag) return;
          const x0 = Math.max(0, Math.min(drag.a.x, drag.b.x)), y0 = Math.max(0, Math.min(drag.a.y, drag.b.y));
          const x1 = Math.min(picture2.width, Math.max(drag.a.x, drag.b.x)), y1 = Math.min(picture2.height, Math.max(drag.a.y, drag.b.y));
          if (x1 - x0 >= MIN_BOX2 && y1 - y0 >= MIN_BOX2) {
            area = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
            result = null;
            ui.text.value = "";
            ui.conf.textContent = "";
            drawMode = false;
          }
          drag = null;
          drawOverlay();
          refresh2();
        },
        cancel() {
          drag = null;
          drawOverlay();
        }
      };
      function reset() {
        area = null;
        result = null;
        drag = null;
        drawMode = false;
        if (ui.text) {
          ui.text.value = "";
          ui.conf.textContent = "";
        }
        drawOverlay();
        refresh2();
      }
      async function read() {
        if (picture2.busy || !picture2.loaded || ctl().state.phase !== "ready") return;
        picture2.setBusy(true);
        try {
          ctx2.status("Starting the text reader…");
          const region = area ? { x: Math.round(area.x), y: Math.round(area.y), w: Math.round(area.w), h: Math.round(area.h) } : { x: 0, y: 0, w: picture2.width, h: picture2.height };
          const src = document.createElement("canvas");
          src.width = region.w;
          src.height = region.h;
          src.getContext("2d").drawImage(picture2.canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
          const t0 = performance.now();
          const r = await recognizeText(src, { lang, psm }, (t) => ctx2.status(t));
          result = { words: r.words, region, depth: picture2.depth };
          ui.text.value = r.text;
          ui.conf.textContent = r.text ? "Average confidence " + Math.round(r.confidence) + " % · " + r.words.length + " words" : "";
          ctx2.debug.section("Read text", { language: lang, layoutMode: psm, region: region.w + "x" + region.h + " at " + region.x + "," + region.y, runMs: r.runMs, totalMs: Math.round(performance.now() - t0), confidence: r.confidence, words: r.words.length, characters: r.text.length });
          drawOverlay();
          ctx2.status(r.text ? "Read " + r.words.length + " words in " + (r.runMs / 1e3).toFixed(1) + " s. Check them against the picture (green = sure, yellow = unsure, red = very unsure), then copy the text." : "No text was found. Try another page layout (Scattered text suits posters), or draw a box round the text.", r.text ? "ok" : "bad");
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          picture2.setBusy(false);
        }
      }
      function refresh2() {
        if (!mounted) return;
        const ready = ctl().state.phase === "ready", has = picture2.loaded, idle = !picture2.busy;
        ui.need.hidden = ready || ctl().state.phase === "checking";
        ui.read.disabled = !has || !idle || !ready;
        ui.draw.classList.toggle("active", drawMode);
        ui.draw.textContent = drawMode ? "Drag on the picture to draw the box…" : area ? "Draw the box again" : "Read only an area (draw a box)";
        ui.draw.disabled = !has || !idle;
        ui.clearArea.hidden = !area;
        const has_text = Boolean(ui.text.value.trim());
        ui.copy.disabled = !has_text;
        ui.save.disabled = !has_text;
      }
      picture2.onView(() => {
        if (mounted) drawOverlay();
      });
      picture2.onOpen(reset);
      function drawModelBox() {
        if (boxEl) {
          boxEl.dispose && boxEl.dispose();
          boxEl.remove();
        }
        boxEl = modelBox("ocr:" + lang, { compact: true, deletable: false });
        ui.boxHost.append(boxEl);
      }
      return {
        mount(panel) {
          mounted = true;
          const secA = el4("section");
          secA.append(el4("h2", "", "Read the text"));
          const lf = el4("label", "field");
          lf.append(el4("span", "", "Language"));
          ui.lang = el4("select");
          for (const l of OCR_LANGS) {
            const o = el4("option", "", l.name);
            o.value = l.code;
            ui.lang.append(o);
          }
          ui.lang.value = lang;
          ui.lang.addEventListener("change", () => {
            lang = ui.lang.value;
            result = null;
            ui.text.value = "";
            ui.conf.textContent = "";
            drawOverlay();
            drawModelBox();
            refresh2();
          });
          lf.append(ui.lang);
          const pf = el4("label", "field");
          pf.append(el4("span", "", "How the page is laid out"));
          ui.psm = el4("select");
          for (const [v, t] of PSMS) {
            const o = el4("option", "", t);
            o.value = v;
            ui.psm.append(o);
          }
          ui.psm.value = psm;
          ui.psm.addEventListener("change", () => {
            psm = ui.psm.value;
          });
          pf.append(ui.psm);
          ui.need = el4("p", "hint required", "Download required: get the language below first.");
          ui.draw = el4("button", "wide", "Read only an area (draw a box)");
          ui.draw.type = "button";
          ui.draw.addEventListener("click", () => {
            drawMode = !drawMode;
            if (drawMode) picture2.setPointerHandler(handler);
            refresh2();
          });
          ui.clearArea = el4("button", "wide", "Read the whole picture again");
          ui.clearArea.type = "button";
          ui.clearArea.hidden = true;
          ui.clearArea.addEventListener("click", () => {
            area = null;
            result = null;
            ui.text.value = "";
            ui.conf.textContent = "";
            drawOverlay();
            refresh2();
          });
          ui.read = el4("button", "btn-solid big", "Read text");
          ui.read.type = "button";
          ui.read.addEventListener("click", read);
          secA.append(lf, pf, ui.need, ui.draw, ui.clearArea, ui.read);
          const secB = el4("section");
          secB.append(el4("h2", "", "Text"));
          ui.conf = el4("p", "hint");
          ui.text = document.createElement("textarea");
          ui.text.className = "ocr-text";
          ui.text.rows = 9;
          ui.text.placeholder = "The text will appear here. You can fix mistakes before copying.";
          ui.text.addEventListener("input", refresh2);
          const row = el4("div", "row");
          ui.copy = el4("button", "", "Copy text");
          ui.copy.type = "button";
          ui.copy.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(ui.text.value);
              ctx2.status("Text copied.", "ok");
            } catch (e) {
              ui.text.select();
              ctx2.status("Select the text and copy it by hand.", "bad");
            }
          });
          ui.save = el4("button", "", "Save as .txt");
          ui.save.type = "button";
          ui.save.addEventListener("click", () => downloadBlob(new Blob([ui.text.value], { type: "text/plain;charset=utf-8" }), picture2.name + ".txt"));
          row.append(ui.copy, ui.save);
          const lab = el4("label", "radio");
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = showBoxes;
          cb.addEventListener("change", () => {
            showBoxes = cb.checked;
            drawOverlay();
          });
          lab.append(cb, el4("span", "", " Show the words found on the picture"));
          const hint = el4("p", "hint", "Works best on clean printed text. Handwriting and decorative fonts read poorly. Green boxes are sure, yellow unsure, red very unsure.");
          secB.append(ui.conf, ui.text, row, lab, hint);
          const secC = el4("section");
          secC.append(el4("h2", "", "Language file"));
          ui.boxHost = el4("div");
          secC.append(ui.boxHost);
          panel.append(secA, secB, secC);
          drawModelBox();
          for (const l of OCR_LANGS) unsub.push(modelControl("ocr:" + l.code).subscribe(refresh2));
          if (area || drawMode) picture2.setPointerHandler(handler);
          drawOverlay();
          refresh2();
        },
        unmount() {
          mounted = false;
          drag = null;
          boxesC.style.display = "none";
          picture2.setPointerHandler(null);
          while (unsub.length) unsub.pop()();
          if (boxEl) {
            boxEl.dispose && boxEl.dispose();
            boxEl = null;
          }
        },
        onPictureChange() {
          if (result && picture2.depth !== result.depth) {
            result = null;
            drawOverlay();
          }
          refresh2();
        },
        primary() {
          read();
        }
      };
    }
  };

  // apps/AiToolsLocal/src/tools/upscale.js
  var el5 = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var MAX_SIDE2 = 8192;
  var MAX_PIXELS = 4e7;
  var TILES = [["64", "64 px (gentle on memory, slower)"], ["96", "96 px"], ["128", "128 px (default)"], ["192", "192 px (faster, more memory)"]];
  var upscaleTool = {
    id: "upscale",
    name: "Upscale",
    summary: "Enlarge a picture 2 or 4 times with AI detail.",
    create(ctx2) {
      const { picture: picture2 } = ctx2;
      const ctl = modelControl("upscale");
      let mounted = false, ui = {};
      let want = 2, tile = "128", gpu = false, running = false, cancelled = false;
      function sizeLine() {
        if (!picture2.loaded) return { text: "Open a picture first.", bad: false };
        const r = resultSize(picture2.width, picture2.height, want, MAX_SIDE2);
        const big = r.tooBig || r.w * r.h > MAX_PIXELS;
        return { text: picture2.width + " × " + picture2.height + " px  →  " + r.w + " × " + r.h + " px" + (big ? " (too big: use 2×, or crop the picture first)" : ""), bad: big };
      }
      async function run() {
        if (running || picture2.busy || !picture2.loaded || ctl.state.phase !== "ready") return;
        const line = sizeLine();
        if (line.bad) {
          ctx2.status("That would be too big: " + line.text, "bad");
          return;
        }
        running = true;
        cancelled = false;
        picture2.setBusy(true);
        refresh2();
        try {
          const before = await picture2.snapshot();
          const t0 = performance.now();
          ctx2.status("Starting the upscaler…");
          const res = await upscaleCanvas(picture2.canvas, {
            tile: Number(tile),
            pad: 12,
            gpu,
            onStatus: (t) => ctx2.status(t),
            shouldCancel: () => cancelled,
            onProgress: (done, total, avg) => {
              ui.prog.max = total;
              ui.prog.value = done;
              ctx2.status("Tile " + done + " of " + total + " · " + Math.round(avg) + " ms each · about " + Math.round(avg * (total - done) / 1e3) + " s left");
            }
          });
          if (res.cancelled) {
            before.close();
            ctx2.debug.section("Upscale cancelled", { ...res.info });
            ctx2.status("Cancelled after " + res.info.doneTiles + " of " + res.info.tiles + " tiles. The picture is unchanged.", "bad");
            return;
          }
          let final = res.canvas;
          const w = picture2.width * want, h = picture2.height * want;
          if (final.width !== w || final.height !== h) {
            const f = document.createElement("canvas");
            f.width = w;
            f.height = h;
            const fx = f.getContext("2d");
            fx.imageSmoothingQuality = "high";
            fx.drawImage(final, 0, 0, w, h);
            final = f;
          }
          const probe = picture2.ctx.getImageData(0, 0, picture2.width, picture2.height).data;
          let hasAlpha = false;
          for (let i = 3; i < probe.length; i += 4) if (probe[i] < 255) {
            hasAlpha = true;
            break;
          }
          if (hasAlpha) {
            const a = document.createElement("canvas");
            a.width = w;
            a.height = h;
            const ax = a.getContext("2d");
            ax.imageSmoothingQuality = "high";
            ax.drawImage(picture2.canvas, 0, 0, w, h);
            const ad = ax.getImageData(0, 0, w, h).data, fx = final.getContext("2d"), fd = fx.getImageData(0, 0, w, h);
            for (let i = 3; i < fd.data.length; i += 4) fd.data[i] = ad[i];
            fx.putImageData(fd, 0, 0);
          }
          picture2.replaceWith(final);
          picture2.commit(before);
          const sec = (performance.now() - t0) / 1e3;
          ctx2.debug.section("Upscale", { picture: probe.length / 4 + " px -> " + w + "x" + h, wanted: want + "x", totalSeconds: Math.round(sec * 10) / 10, hasTransparency: hasAlpha, ...res.info });
          ctx2.status("Done in " + sec.toFixed(1) + " s: the picture is now " + w + " × " + h + " px. Undo brings the original back.", "ok");
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          running = false;
          ui.prog.value = 0;
          picture2.setBusy(false);
          refresh2();
        }
      }
      function refresh2() {
        if (!mounted) return;
        const ready = ctl.state.phase === "ready", has = picture2.loaded;
        ui.need.hidden = ready || ctl.state.phase === "checking";
        const line = sizeLine();
        ui.size.textContent = line.text;
        ui.size.classList.toggle("bad", line.bad);
        ui.run.disabled = !has || running || picture2.busy || !ready || line.bad;
        ui.run.textContent = running ? "Enlarging…" : "Enlarge";
        ui.cancel.hidden = !running;
        ui.prog.hidden = !running;
        for (const c of [ui.want, ui.tile, ui.ep]) c.disabled = running;
      }
      picture2.onOpen(refresh2);
      ctl.subscribe(refresh2);
      return {
        mount(panel) {
          mounted = true;
          const secA = el5("section");
          secA.append(el5("h2", "", "Enlarge"));
          const wf = el5("label", "field");
          wf.append(el5("span", "", "Enlarge by"));
          ui.want = el5("select");
          for (const [v, t] of [["2", "2× (about 4 times faster)"], ["4", "4× (the model's own size)"]]) {
            const o = el5("option", "", t);
            o.value = v;
            ui.want.append(o);
          }
          ui.want.value = String(want);
          ui.want.addEventListener("change", () => {
            want = Number(ui.want.value);
            refresh2();
          });
          wf.append(ui.want);
          ui.size = el5("p", "hint");
          const tf = el5("label", "field");
          tf.append(el5("span", "", "Piece size (tiles)"));
          ui.tile = el5("select");
          for (const [v, t] of TILES) {
            const o = el5("option", "", t);
            o.value = v;
            ui.tile.append(o);
          }
          ui.tile.value = tile;
          ui.tile.addEventListener("change", () => {
            tile = ui.tile.value;
          });
          tf.append(ui.tile);
          const ef = el5("label", "field");
          ef.append(el5("span", "", "Run on"));
          ui.ep = el5("select");
          const o1 = el5("option", "", "The processor (CPU)");
          o1.value = "cpu";
          ui.ep.append(o1);
          if (navigator.gpu) {
            const o2 = el5("option", "", "The graphics chip (if it works)");
            o2.value = "gpu";
            ui.ep.append(o2);
          }
          ui.ep.value = gpu ? "gpu" : "cpu";
          ui.ep.addEventListener("change", () => {
            gpu = ui.ep.value === "gpu";
          });
          ef.append(ui.ep);
          ui.need = el5("p", "hint required", "Download required: get the model below first.");
          ui.run = el5("button", "btn-solid big", "Enlarge");
          ui.run.type = "button";
          ui.run.addEventListener("click", run);
          ui.prog = document.createElement("progress");
          ui.prog.hidden = true;
          ui.prog.max = 1;
          ui.prog.value = 0;
          ui.cancel = el5("button", "big", "Cancel");
          ui.cancel.type = "button";
          ui.cancel.hidden = true;
          ui.cancel.addEventListener("click", () => {
            cancelled = true;
            ctx2.status("Cancelling…");
          });
          const note = el5("p", "hint", "This is the heaviest tool: a small picture (about 500 px wide) takes seconds to a minute on a tablet, a big one much longer. Try a small picture or 2× first. The result is the new picture (Undo brings the original back).");
          secA.append(wf, ui.size, tf, ef, ui.need, ui.run, ui.prog, ui.cancel, note);
          const secB = el5("section");
          secB.append(el5("h2", "", "Model"));
          secB.append(modelBox("upscale", { compact: true, deletable: false }));
          panel.append(secA, secB);
          refresh2();
        },
        unmount() {
          mounted = false;
        },
        onPictureChange() {
          refresh2();
        },
        primary() {
          run();
        }
      };
    }
  };

  // apps/AiToolsLocal/src/tools/selectObject.js
  var el6 = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var MAX_WORK = 1280;
  var selectObjectTool = {
    id: "select-object",
    name: "Click-to-select",
    summary: "Click a thing to select it; cut it out or remove it.",
    create(ctx2) {
      const { picture: picture2 } = ctx2;
      const selC = picture2.addOverlay(document.createElement("canvas"));
      selC.id = "selection";
      selC.style.display = "none";
      const selX = selC.getContext("2d");
      const ctl = modelControl("sam");
      let mounted = false, ui = {};
      let prep = null;
      let points = [];
      let sel = null;
      let addMode = true;
      let deciding = false, again = false;
      function drawSelection() {
        selX.clearRect(0, 0, selC.width, selC.height);
        if (!sel && !points.length) {
          selC.style.display = "none";
          return;
        }
        selC.style.display = "";
        if (sel) {
          const mc = document.createElement("canvas");
          mc.width = sel.w;
          mc.height = sel.h;
          const mx = mc.getContext("2d"), id = mx.createImageData(sel.w, sel.h);
          for (let i = 0; i < sel.mask.length; i++) if (sel.mask[i]) {
            id.data[i * 4] = 232;
            id.data[i * 4 + 1] = 98;
            id.data[i * 4 + 2] = 42;
            id.data[i * 4 + 3] = 150;
          }
          mx.putImageData(id, 0, 0);
          selX.imageSmoothingEnabled = true;
          selX.drawImage(mc, 0, 0, selC.width, selC.height);
        }
        const r = Math.max(4, 7 / picture2.view.s);
        for (const p of points) {
          selX.beginPath();
          selX.arc(p.x, p.y, r, 0, 7);
          selX.fillStyle = p.label ? "#3fd26f" : "#ff5a5a";
          selX.fill();
          selX.lineWidth = 2 / picture2.view.s;
          selX.strokeStyle = "#fff";
          selX.stroke();
        }
      }
      async function prepare() {
        if (picture2.busy || !picture2.loaded || ctl.state.phase !== "ready") return;
        picture2.setBusy(true);
        try {
          const scale = Math.min(1, MAX_WORK / Math.max(picture2.width, picture2.height));
          const work = document.createElement("canvas");
          work.width = Math.max(1, Math.round(picture2.width * scale));
          work.height = Math.max(1, Math.round(picture2.height * scale));
          const wx = work.getContext("2d");
          wx.imageSmoothingQuality = "high";
          wx.drawImage(picture2.canvas, 0, 0, work.width, work.height);
          const t0 = performance.now();
          const p = await prepareSam(work, (t) => ctx2.status(t));
          prep = { ...p, depth: picture2.depth, scale };
          points = [];
          sel = null;
          ctx2.debug.section("Read the picture (click-to-select)", { picture: picture2.width + "x" + picture2.height, readAt: work.width + "x" + work.height, backend: p.backend, readMs: p.ms, totalMs: Math.round(performance.now() - t0), embeddings: p.embeddings.dims.join("x") });
          picture2.setPointerHandler(handler);
          ctx2.status("Picture read in " + (p.ms / 1e3).toFixed(1) + " s (" + (p.backend === "gpu" ? "graphics chip" : "processor") + "). Click or tap things to select them.", "ok");
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          picture2.setBusy(false);
          drawSelection();
          refresh2();
        }
      }
      async function decode() {
        if (deciding) {
          again = true;
          return;
        }
        deciding = true;
        try {
          do {
            again = false;
            if (!points.length) {
              sel = null;
              break;
            }
            const r = await outline(prep, points.map((p) => ({ x: p.x * prep.scale, y: p.y * prep.scale, label: p.label })));
            sel = { mask: r.mask, w: r.w, h: r.h };
            ctx2.debug.log("Click " + points.length + ": decoder " + r.ms + " ms, selected " + (100 * r.coverage).toFixed(1) + " % of the picture, quality " + r.iou.map((v) => v.toFixed(2)).join(","));
            ctx2.status("Selected " + (100 * r.coverage).toFixed(1) + " % of the picture (" + r.ms + " ms). Click more to add" + (addMode ? "" : " (taking away)") + ", or use the selection below.", "ok");
            drawSelection();
          } while (again);
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          deciding = false;
          drawSelection();
          refresh2();
        }
      }
      const handler = {
        down(pt) {
          if (!prep) return;
          points.push({ x: pt.x, y: pt.y, label: addMode ? 1 : 0 });
          drawSelection();
          refresh2();
          decode();
        }
      };
      function selectionAtPictureSize() {
        const mc = document.createElement("canvas");
        mc.width = sel.w;
        mc.height = sel.h;
        const mx = mc.getContext("2d"), id = mx.createImageData(sel.w, sel.h);
        for (let i = 0; i < sel.mask.length; i++) if (sel.mask[i]) {
          id.data[i * 4 + 3] = 255;
        }
        mx.putImageData(id, 0, 0);
        const c = document.createElement("canvas");
        c.width = picture2.width;
        c.height = picture2.height;
        const x = c.getContext("2d", { willReadFrequently: true });
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = "high";
        x.drawImage(mc, 0, 0, c.width, c.height);
        return { canvas: c, data: x.getImageData(0, 0, c.width, c.height).data };
      }
      async function apply(keep) {
        if (!sel || picture2.busy) return;
        picture2.setBusy(true);
        try {
          const before = await picture2.snapshot();
          const { data } = selectionAtPictureSize();
          const img = picture2.ctx.getImageData(0, 0, picture2.width, picture2.height);
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3] / 255;
            img.data[i + 3] = Math.round(img.data[i + 3] * (keep ? a : 1 - a));
          }
          picture2.ctx.putImageData(img, 0, 0);
          picture2.commit(before);
          ctx2.debug.log("Click-to-select: " + (keep ? "cut out the selection" : "made the selection see-through"));
          reset(true);
          ctx2.status(keep ? "Cut out: only the selection is left (everything else is see-through). Undo brings it back." : "Done: the selection is see-through. Undo brings it back.", "ok");
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          picture2.setBusy(false);
        }
      }
      function useAsMarks() {
        if (!sel) return;
        const { data } = selectionAtPictureSize();
        const marks = new Uint8Array(picture2.width * picture2.height);
        for (let i = 0; i < marks.length; i++) marks[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
        ctx2.useAsMarks(marks);
      }
      function reset(keepNothing) {
        prep = keepNothing ? null : prep;
        points = [];
        sel = null;
        deciding = false;
        again = false;
        selX.clearRect(0, 0, selC.width, selC.height);
        selC.style.display = "none";
        if (keepNothing) picture2.setPointerHandler(null);
        refresh2();
      }
      function refresh2() {
        if (!mounted) return;
        const ready = ctl.state.phase === "ready", has = picture2.loaded, idle = !picture2.busy;
        ui.need.hidden = ready || ctl.state.phase === "checking";
        ui.prepare.disabled = !has || !idle || !ready;
        ui.prepare.textContent = prep ? "Read the picture again" : "Read the picture";
        ui.step2.hidden = !prep;
        ui.mode.children[0].classList.toggle("active", addMode);
        ui.mode.children[1].classList.toggle("active", !addMode);
        const has_sel = Boolean(sel) && idle;
        ui.undoClick.disabled = !points.length || !idle;
        ui.clear.disabled = !points.length || !idle;
        for (const b of [ui.keep, ui.hole, ui.marks]) b.disabled = !has_sel;
      }
      picture2.onView(() => {
        if (mounted) drawSelection();
      });
      picture2.onOpen(() => {
        prep = null;
        reset(true);
      });
      ctl.subscribe(refresh2);
      return {
        mount(panel) {
          mounted = true;
          const secA = el6("section");
          secA.append(el6("h2", "", "Read the picture"));
          ui.need = el6("p", "hint required", "Download required: get the model below first.");
          ui.prepare = el6("button", "btn-solid big", "Read the picture");
          ui.prepare.type = "button";
          ui.prepare.addEventListener("click", prepare);
          const note = el6("p", "hint", "The model reads the picture once (about 10 seconds on a tablet), then every click is quick. Read it again after you change the picture.");
          secA.append(ui.need, ui.prepare, note);
          ui.step2 = el6("div");
          ui.step2.hidden = true;
          const secB = el6("section");
          secB.append(el6("h2", "", "Click to select"));
          ui.mode = el6("div", "seg");
          for (const [label, add] of [["Add to selection", true], ["Take away", false]]) {
            const b = el6("button", "", label);
            b.type = "button";
            b.addEventListener("click", () => {
              addMode = add;
              refresh2();
            });
            ui.mode.append(b);
          }
          ui.undoClick = el6("button", "wide", "Remove the last click");
          ui.undoClick.type = "button";
          ui.undoClick.addEventListener("click", () => {
            points.pop();
            if (!points.length) sel = null;
            drawSelection();
            refresh2();
            if (points.length) decode();
          });
          ui.clear = el6("button", "wide", "Clear the selection");
          ui.clear.type = "button";
          ui.clear.addEventListener("click", () => {
            points = [];
            sel = null;
            drawSelection();
            refresh2();
          });
          const tip = el6("p", "hint", "Click once on a thing. If it picked too little or too much, click again to add (green) or switch to Take away and click the part that should not be included (red).");
          secB.append(ui.mode, ui.undoClick, ui.clear, tip);
          const secC = el6("section");
          secC.append(el6("h2", "", "Use the selection"));
          ui.keep = el6("button", "btn-solid big", "Cut it out");
          ui.keep.type = "button";
          ui.keep.addEventListener("click", () => apply(true));
          ui.hole = el6("button", "big", "Make it see-through");
          ui.hole.type = "button";
          ui.hole.addEventListener("click", () => apply(false));
          ui.marks = el6("button", "big", "Send to Remove object");
          ui.marks.type = "button";
          ui.marks.addEventListener("click", useAsMarks);
          const use = el6("p", "hint", "Cut it out keeps only the selection and makes everything else see-through. Make it see-through does the opposite. Send to Remove object marks it, so the AI fills it with what is behind it. Undo brings the picture back.");
          secC.append(ui.keep, ui.hole, ui.marks, use);
          ui.step2.append(secB, secC);
          const secD = el6("section");
          secD.append(el6("h2", "", "Model"));
          secD.append(modelBox("sam", { compact: true, deletable: false }));
          panel.append(secA, ui.step2, secD);
          if (prep) picture2.setPointerHandler(handler);
          drawSelection();
          refresh2();
        },
        unmount() {
          mounted = false;
          selC.style.display = "none";
          picture2.setPointerHandler(null);
        },
        onPictureChange() {
          if (prep && picture2.depth !== prep.depth) {
            prep = null;
            reset(true);
          }
          refresh2();
        },
        primary() {
          if (!prep) prepare();
        }
      };
    }
  };

  // apps/AiToolsLocal/src/tools/removeBackground.js
  var el7 = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var DEFAULT_CUTOFF = 0.1;
  var MIN_CROP = 16;
  function hitCrop(c, pt, tol) {
    const nearL = Math.abs(pt.x - c.x) <= tol, nearR = Math.abs(pt.x - (c.x + c.w)) <= tol;
    const nearT = Math.abs(pt.y - c.y) <= tol, nearB = Math.abs(pt.y - (c.y + c.h)) <= tol;
    const inX = pt.x > c.x - tol && pt.x < c.x + c.w + tol, inY = pt.y > c.y - tol && pt.y < c.y + c.h + tol;
    if (nearT && nearL) return "nw";
    if (nearT && nearR) return "ne";
    if (nearB && nearL) return "sw";
    if (nearB && nearR) return "se";
    if (nearT && inX) return "n";
    if (nearB && inX) return "s";
    if (nearL && inY) return "w";
    if (nearR && inY) return "e";
    if (pt.x > c.x && pt.x < c.x + c.w && pt.y > c.y && pt.y < c.y + c.h) return "move";
    return null;
  }
  var removeBackgroundTool = {
    id: "remove-background",
    name: "Remove background",
    summary: "Keep the main subject, make the rest see-through.",
    create(ctx2) {
      const { picture: picture2 } = ctx2;
      const cropC = picture2.addOverlay(document.createElement("canvas"));
      cropC.id = "crop";
      cropC.style.display = "none";
      const cropX = cropC.getContext("2d");
      const previewC = picture2.addOverlay(document.createElement("canvas"));
      previewC.id = "preview";
      previewC.style.display = "none";
      const previewX = previewC.getContext("2d");
      let mounted = false, ui = {}, boxEl = null;
      let modelKey = BG_MODELS[0].key;
      let cutoff = DEFAULT_CUTOFF, soft = 10;
      let found = null;
      let crop = null;
      let raf = 0;
      const ctl = () => modelControl("bg:" + modelKey);
      function drawCrop() {
        cropX.clearRect(0, 0, cropC.width, cropC.height);
        if (!crop || found) {
          cropC.style.display = "none";
          return;
        }
        cropC.style.display = "";
        const s = picture2.view.s, c = crop;
        cropX.fillStyle = "rgba(0,0,0,.55)";
        cropX.fillRect(0, 0, cropC.width, cropC.height);
        cropX.clearRect(c.x, c.y, c.w, c.h);
        cropX.lineWidth = 2 / s;
        cropX.strokeStyle = "#fff";
        cropX.strokeRect(c.x, c.y, c.w, c.h);
        cropX.strokeStyle = "rgba(255,255,255,.45)";
        cropX.lineWidth = 1 / s;
        for (const f of [1 / 3, 2 / 3]) {
          cropX.beginPath();
          cropX.moveTo(c.x + c.w * f, c.y);
          cropX.lineTo(c.x + c.w * f, c.y + c.h);
          cropX.moveTo(c.x, c.y + c.h * f);
          cropX.lineTo(c.x + c.w, c.y + c.h * f);
          cropX.stroke();
        }
        const hs = 9 / s;
        cropX.fillStyle = "#e8622a";
        cropX.strokeStyle = "#fff";
        cropX.lineWidth = 1.5 / s;
        for (const [hx, hy] of [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h], [c.x + c.w / 2, c.y], [c.x + c.w / 2, c.y + c.h], [c.x, c.y + c.h / 2], [c.x + c.w, c.y + c.h / 2]]) {
          cropX.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
          cropX.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
        }
        if (ui.cropInfo) ui.cropInfo.textContent = "Crop: " + Math.round(c.w) + " × " + Math.round(c.h) + " px (of " + picture2.width + " × " + picture2.height + ")";
      }
      let drag = null;
      const cropHandler = {
        down(pt) {
          if (!crop) return;
          const part = hitCrop(crop, pt, 18 / picture2.view.s);
          if (part) drag = { part, start: pt, orig: { ...crop } };
        },
        move(pt) {
          if (!drag || !crop) return;
          const o = drag.orig, dx = pt.x - drag.start.x, dy = pt.y - drag.start.y, W = picture2.width, H = picture2.height;
          let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
          if (drag.part === "move") {
            const nx = Math.min(Math.max(0, o.x + dx), W - o.w), ny = Math.min(Math.max(0, o.y + dy), H - o.h);
            crop = { x: nx, y: ny, w: o.w, h: o.h };
          } else {
            if (drag.part.includes("w")) x0 = Math.min(Math.max(0, o.x + dx), x1 - MIN_CROP);
            if (drag.part.includes("e")) x1 = Math.max(Math.min(W, o.x + o.w + dx), x0 + MIN_CROP);
            if (drag.part.includes("n")) y0 = Math.min(Math.max(0, o.y + dy), y1 - MIN_CROP);
            if (drag.part.includes("s")) y1 = Math.max(Math.min(H, o.y + o.h + dy), y0 + MIN_CROP);
            crop = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
          }
          drawCrop();
        },
        up() {
          drag = null;
        },
        cancel() {
          drag = null;
        }
      };
      function setCrop(on) {
        if (on && picture2.loaded) {
          const mx = picture2.width * 0.1, my = picture2.height * 0.1;
          crop = crop || { x: mx, y: my, w: picture2.width - 2 * mx, h: picture2.height - 2 * my };
          discard();
          picture2.setPointerHandler(cropHandler);
        } else {
          crop = null;
          drag = null;
          picture2.setPointerHandler(null);
        }
        drawCrop();
        refresh2();
      }
      const discard = () => {
        found = null;
        previewC.style.display = "none";
        previewX.clearRect(0, 0, previewC.width, previewC.height);
        picture2.canvas.style.visibility = "visible";
        if (crop && mounted) picture2.setPointerHandler(cropHandler);
        drawCrop();
        refresh2();
      };
      function drawPreview() {
        raf = 0;
        if (!found) return;
        previewX.clearRect(0, 0, previewC.width, previewC.height);
        previewX.drawImage(cutOutCanvas(found.src, found.mask, found.side, cutoff / 100, Math.max(0.1, soft) / 100), found.region.x, found.region.y);
      }
      const queuePreview = () => {
        if (!raf) raf = requestAnimationFrame(drawPreview);
      };
      function regionCanvas() {
        const r = crop ? { x: Math.round(crop.x), y: Math.round(crop.y), w: Math.round(crop.w), h: Math.round(crop.h) } : { x: 0, y: 0, w: picture2.width, h: picture2.height };
        const c = document.createElement("canvas");
        c.width = r.w;
        c.height = r.h;
        c.getContext("2d").drawImage(picture2.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
        return { canvas: c, region: r };
      }
      async function find() {
        if (picture2.busy || !picture2.loaded || ctl().state.phase !== "ready") return;
        picture2.setBusy(true);
        try {
          ctx2.status("Starting " + bgModel(modelKey).name + "…");
          const t0 = performance.now();
          const { canvas: src, region } = regionCanvas();
          const { mask, side, info } = await segmentCanvas(src, modelKey, (t) => ctx2.status(t));
          found = { mask, side, depth: picture2.depth, region, src };
          ctx2.debug.section("Find subject", { model: bgModel(modelKey).label, picture: picture2.width + "x" + picture2.height, region: region.w + "x" + region.h + " at " + region.x + "," + region.y, maskSide: side, ...info, edgeCutoffPct: cutoff, softEdgePct: soft, maskStats: maskStats(mask) });
          picture2.setPointerHandler(null);
          previewC.style.display = "";
          picture2.canvas.style.visibility = "hidden";
          drawPreview();
          drawCrop();
          ctx2.debug.section("Preview at the current cut-off", alphaStats(previewC));
          ctx2.status("Found the subject in " + ((performance.now() - t0) / 1e3).toFixed(1) + " s. Adjust the Edge cut-off if needed, then press Apply." + (crop ? " The picture will become the cropped area." : ""), "ok");
        } catch (e) {
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e), "bad");
        } finally {
          picture2.setBusy(false);
        }
      }
      async function apply() {
        if (!found || picture2.busy) return;
        const before = await picture2.snapshot();
        const out = cutOutCanvas(found.src, found.mask, found.side, cutoff / 100, Math.max(0.1, soft) / 100);
        const cropped = found.region.w !== picture2.width || found.region.h !== picture2.height;
        picture2.replaceWith(out);
        picture2.commit(before);
        ctx2.debug.section("Apply", { edgeCutoffPct: cutoff, softEdgePct: soft, cropped, pictureNow: alphaStats(picture2.canvas) });
        crop = null;
        drag = null;
        picture2.setPointerHandler(null);
        discard();
        ctx2.status(cropped ? "Applied: the picture is now the cropped area. Undo brings the whole picture back." : "Applied. Not right? Undo, then change the Edge cut-off or the model and find the subject again.", "ok");
      }
      function refresh2() {
        if (!mounted) return;
        const ready = ctl().state.phase === "ready", has = picture2.loaded, idle = !picture2.busy;
        for (const k of ["cutoff", "soft"]) {
          ui[k].disabled = !ready;
          ui[k].closest(".field").classList.toggle("off", !ready);
        }
        for (const n of ui.need) n.hidden = ready || ctl().state.phase === "checking";
        ui.find.disabled = !has || !idle || !ready;
        ui.apply.hidden = ui.discard.hidden = !found;
        ui.apply.disabled = ui.discard.disabled = !idle;
        ui.find.hidden = Boolean(found);
        ui.cropToggle.disabled = !has || !idle || Boolean(found);
        ui.cropToggle.textContent = crop ? "Remove the crop box" : "Crop first…";
        ui.cropBox.hidden = !crop;
        if (!crop) ui.cropInfo.textContent = "";
      }
      const unsub = [];
      function drawModelBox() {
        if (boxEl) {
          boxEl.dispose && boxEl.dispose();
          boxEl.remove();
        }
        boxEl = modelBox("bg:" + modelKey, { deletable: false });
        ui.boxHost.append(boxEl);
      }
      picture2.onView(() => {
        if (mounted) drawCrop();
      });
      picture2.onOpen(() => {
        crop = null;
        drag = null;
        found = null;
        previewC.style.display = "none";
        cropC.style.display = "none";
        picture2.canvas.style.visibility = "visible";
      });
      return {
        mount(panel) {
          mounted = true;
          const sec1 = el7("section");
          sec1.append(el7("h2", "", "Model"));
          const radios = el7("div", "radios");
          for (const m of BG_MODELS) {
            const lab = el7("label", "radio");
            const r = document.createElement("input");
            r.type = "radio";
            r.name = "bg-model";
            r.checked = m.key === modelKey;
            r.addEventListener("change", () => {
              modelKey = m.key;
              discard();
              drawModelBox();
              refresh2();
            });
            lab.append(r, el7("span", "", " " + m.label + " · " + m.mb + " MB"));
            radios.append(lab);
          }
          ui.boxHost = el7("div");
          sec1.append(radios, ui.boxHost);
          const secC = el7("section");
          secC.append(el7("h2", "", "Crop first (optional)"));
          ui.cropToggle = el7("button", "wide", "Crop first…");
          ui.cropToggle.type = "button";
          ui.cropToggle.addEventListener("click", () => setCrop(!crop));
          ui.cropBox = el7("div");
          ui.cropBox.hidden = true;
          ui.cropInfo = el7("p", "hint");
          const cropHint = el7("p", "hint", "Drag the box or its edges and corners. Only what is inside is used, which also helps the model on a busy picture. When you Apply, the picture becomes the cropped area (Undo brings the whole picture back).");
          const reset = el7("button", "wide", "Reset the box");
          reset.type = "button";
          reset.addEventListener("click", () => {
            crop = null;
            setCrop(true);
          });
          ui.cropBox.append(ui.cropInfo, cropHint, reset);
          secC.append(ui.cropToggle, ui.cropBox);
          const sec2 = el7("section");
          sec2.append(el7("h2", "", "Cut out"));
          const num2 = (label, key, min, max, step, value, onInput) => {
            const f = el7("label", "field");
            f.append(el7("span", "", label));
            const i = document.createElement("input");
            i.type = "number";
            i.min = min;
            i.max = max;
            i.step = step;
            i.value = value;
            i.addEventListener("input", () => {
              const v = Number(i.value);
              if (i.value.trim() !== "" && Number.isFinite(v)) {
                onInput(Math.min(max, Math.max(min, v)));
                queuePreview();
              }
            });
            f.append(i);
            wrapNumberInput(i);
            ui[key] = i;
            return f;
          };
          const need = () => {
            const p = el7("p", "hint required", "Download required");
            return p;
          };
          ui.need = [need(), need()];
          const f1 = num2("Edge cut-off (%)", "cutoff", 0, 100, 0.125, cutoff, (v) => {
            cutoff = v;
          });
          const h1 = el7("p", "hint", "Everything the model scores at or below this is see-through. Higher keeps less (a tighter cut). 0 keeps everything. You can type finer values like 0.05.");
          const f2 = num2("Soft edge (%) — fade above the cut-off", "soft", 0.1, 50, 0.5, soft, (v) => {
            soft = v;
          });
          ui.find = el7("button", "btn-solid big", "Find subject");
          ui.find.type = "button";
          ui.find.addEventListener("click", find);
          ui.apply = el7("button", "btn-solid big", "Apply");
          ui.apply.type = "button";
          ui.apply.addEventListener("click", apply);
          ui.discard = el7("button", "big", "Discard");
          ui.discard.type = "button";
          ui.discard.addEventListener("click", () => {
            discard();
            ctx2.status("Discarded.");
          });
          const note = el7("p", "hint", "Works on the picture as it is now. Apply makes it the picture (Undo brings it back).");
          sec2.append(f1, ui.need[0], h1, f2, ui.need[1], ui.find, ui.apply, ui.discard, note);
          panel.append(secC, sec2, sec1);
          drawModelBox();
          for (const id of BG_MODELS.map((m) => "bg:" + m.key)) unsub.push(modelControl(id).subscribe(refresh2));
          if (crop) picture2.setPointerHandler(cropHandler);
          drawCrop();
          refresh2();
        },
        unmount() {
          mounted = false;
          drag = null;
          const keep = crop;
          discard();
          crop = keep;
          cropC.style.display = "none";
          picture2.setPointerHandler(null);
          while (unsub.length) unsub.pop()();
          if (boxEl) {
            boxEl.dispose && boxEl.dispose();
            boxEl = null;
          }
        },
        onPictureChange() {
          if (found && picture2.depth !== found.depth) discard();
          if (crop && (crop.x + crop.w > picture2.width + 1 || crop.y + crop.h > picture2.height + 1)) {
            crop = null;
            picture2.setPointerHandler(null);
            drawCrop();
          }
          refresh2();
        },
        primary() {
          if (found) apply();
          else find();
        }
      };
    }
  };

  // shared/js/ai/variations.js
  var AI_VARIATIONS = [
    { dx: 0, dy: 0, scale: 1, grow: 0 },
    { dx: -0.12, dy: 0, scale: 1, grow: 0 },
    { dx: 0.12, dy: 0, scale: 1, grow: 0 },
    { dx: 0, dy: -0.12, scale: 1, grow: 1 },
    { dx: 0, dy: 0.12, scale: 1, grow: 2 },
    { dx: 0, dy: 0, scale: 1.25, grow: 0 },
    { dx: 0.08, dy: 0.08, scale: 0.85, grow: 3 }
  ];
  function variationFor(n) {
    return AI_VARIATIONS[((Math.round(n) || 0) % AI_VARIATIONS.length + AI_VARIATIONS.length) % AI_VARIATIONS.length];
  }
  function varyCrop(crop, v, bounds, w, h) {
    let side = Math.min(Math.min(w, h), Math.max(1, Math.round(crop.side * v.scale)));
    const need = Math.max(bounds.x1 - bounds.x0 + 1, bounds.y1 - bounds.y0 + 1);
    if (side < need) side = Math.min(Math.min(w, h), crop.side);
    const cx = crop.x + crop.side / 2 + v.dx * crop.side, cy = crop.y + crop.side / 2 + v.dy * crop.side;
    let x = Math.round(cx - side / 2), y = Math.round(cy - side / 2);
    x = Math.min(Math.max(0, x), w - side);
    y = Math.min(Math.max(0, y), h - side);
    x = Math.min(Math.max(x, bounds.x1 + 1 - side), bounds.x0);
    y = Math.min(Math.max(y, bounds.y1 + 1 - side), bounds.y0);
    x = Math.min(Math.max(0, x), w - side);
    y = Math.min(Math.max(0, y), h - side);
    if (x > bounds.x0 || y > bounds.y0 || x + side < bounds.x1 + 1 || y + side < bounds.y1 + 1) return crop;
    return { x, y, side };
  }

  // shared/js/ai/fillMask.js
  var FEATHER = 3;
  var MAX_GROUPS = 12;
  async function aiFillMask(ctx2, buildMask, variation, onStatus) {
    const v = variationFor(variation);
    const canvas = ctx2.canvas, w = canvas.width, h = canvas.height;
    const mask = buildMask(v.grow);
    const { labels, boxes } = labelPieces(mask, w, h);
    if (!boxes.length) return false;
    const groups = groupPieces(boxes, w, h);
    if (groups.some((g) => !g.crop)) throw new Error("That area is too big for the AI: mark a smaller part, or do it in a few steps.");
    if (groups.length > MAX_GROUPS) throw new Error("That is " + groups.length + " separate areas: do at most " + MAX_GROUPS + " at a time.");
    for (let i = 0; i < groups.length; i++) {
      if (groups.length > 1) onStatus && onStatus("Removing area " + (i + 1) + " of " + groups.length + "…");
      const crop = variation ? varyCrop(groups[i].crop, v, groups[i].bounds, w, h) : groups[i].crop;
      const gm = groups.length === 1 ? mask : groupMask(labels, groups[i].ids);
      const win = document.createElement("canvas");
      win.width = win.height = MODEL_SIZE;
      const wx = win.getContext("2d", { willReadFrequently: true });
      wx.imageSmoothingQuality = "high";
      wx.drawImage(canvas, crop.x, crop.y, crop.side, crop.side, 0, 0, MODEL_SIZE, MODEL_SIZE);
      const rgba = wx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
      const answer = await runOnSession(rgba, windowMask(gm, w, crop), onStatus);
      const ac = document.createElement("canvas");
      ac.width = ac.height = MODEL_SIZE;
      ac.getContext("2d").putImageData(new ImageData(answer, MODEL_SIZE, MODEL_SIZE), 0, 0);
      const sc = document.createElement("canvas");
      sc.width = sc.height = crop.side;
      const sx = sc.getContext("2d", { willReadFrequently: true });
      sx.imageSmoothingQuality = "high";
      sx.drawImage(ac, 0, 0, crop.side, crop.side);
      const region = ctx2.getImageData(crop.x, crop.y, crop.side, crop.side);
      paste(region.data, crop.side, { x: 0, y: 0, side: crop.side }, sx.getImageData(0, 0, crop.side, crop.side).data, blendWeights(gm, w, crop, FEATHER));
      ctx2.putImageData(region, crop.x, crop.y);
    }
    return true;
  }

  // apps/AiToolsLocal/src/tools/removeObject.js
  var SETTINGS_KEY = "zinenow.aitools.settings";
  var settings = { brush: 40, grow: 6 };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch (e) {
  }
  var save = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
    }
  };
  var el8 = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var removeObjectTool = {
    id: "remove-object",
    name: "Remove object",
    summary: "Mark something, it is filled with what would be behind it.",
    create(ctx2) {
      const { picture: picture2 } = ctx2;
      const maskC = picture2.addOverlay(document.createElement("canvas"));
      maskC.id = "mask";
      const draftC = picture2.addOverlay(document.createElement("canvas"));
      draftC.id = "draft";
      const maskX = maskC.getContext("2d", { willReadFrequently: true }), draftX = draftC.getContext("2d");
      const ring = el8("div", "ring");
      ring.hidden = true;
      picture2.stage.append(ring);
      const ctl = modelControl("fill");
      let mounted = false, tool = "brush", stroke = null;
      let last = null;
      let ui = {};
      const markedPixels = () => {
        const d = maskX.getImageData(0, 0, maskC.width, maskC.height).data;
        const m = new Uint8Array(maskC.width * maskC.height);
        for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 64 ? 1 : 0;
        return m;
      };
      const clearMarks = () => maskX.clearRect(0, 0, maskC.width, maskC.height);
      function paintLine(a, b) {
        maskX.save();
        maskX.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
        maskX.strokeStyle = maskX.fillStyle = "#e8622a";
        maskX.lineCap = maskX.lineJoin = "round";
        maskX.lineWidth = settings.brush;
        maskX.beginPath();
        maskX.moveTo(a.x, a.y);
        maskX.lineTo(b.x + 0.01, b.y);
        maskX.stroke();
        maskX.restore();
      }
      const handler = {
        down(pt, e) {
          if (tool === "pan") stroke = { kind: "pan", sx: e.clientX, sy: e.clientY, v: picture2.view };
          else if (tool === "box") stroke = { kind: "box", a: pt, b: pt };
          else {
            stroke = { kind: "paint", last: pt };
            paintLine(pt, pt);
          }
        },
        move(pt, e) {
          if (!stroke) return;
          if (stroke.kind === "pan") picture2.setView({ ...stroke.v, x: stroke.v.x + e.clientX - stroke.sx, y: stroke.v.y + e.clientY - stroke.sy });
          else if (stroke.kind === "paint") {
            paintLine(stroke.last, pt);
            stroke.last = pt;
          } else if (stroke.kind === "box") {
            stroke.b = pt;
            draftX.clearRect(0, 0, draftC.width, draftC.height);
            const s = picture2.view.s;
            draftX.strokeStyle = "#ffffff";
            draftX.setLineDash([8 / s, 6 / s]);
            draftX.lineWidth = 2 / s;
            draftX.strokeRect(stroke.a.x, stroke.a.y, pt.x - stroke.a.x, pt.y - stroke.a.y);
          }
        },
        up() {
          if (stroke && stroke.kind === "box") {
            draftX.clearRect(0, 0, draftC.width, draftC.height);
            maskX.fillStyle = "#e8622a";
            maskX.fillRect(Math.min(stroke.a.x, stroke.b.x), Math.min(stroke.a.y, stroke.b.y), Math.abs(stroke.b.x - stroke.a.x), Math.abs(stroke.b.y - stroke.a.y));
          }
          stroke = null;
        },
        cancel() {
          draftX.clearRect(0, 0, draftC.width, draftC.height);
          stroke = null;
        }
      };
      function showRing(e) {
        if (!mounted || !picture2.loaded || tool !== "brush" && tool !== "erase") {
          ring.hidden = true;
          return;
        }
        const r = picture2.stage.getBoundingClientRect(), d = Math.max(4, settings.brush * picture2.view.s);
        ring.style.width = ring.style.height = d + "px";
        ring.style.left = e.clientX - r.left - d / 2 + "px";
        ring.style.top = e.clientY - r.top - d / 2 + "px";
        ring.hidden = false;
      }
      const hideRing = () => {
        ring.hidden = true;
      };
      const touchHide = (e) => {
        if (e.pointerType !== "mouse") ring.hidden = true;
      };
      async function runFill(marked, variation) {
        const w = picture2.width, h = picture2.height;
        const grow = Math.max(0, Math.round(settings.grow));
        picture2.setBusy(true);
        const t0 = performance.now();
        let before = null;
        try {
          before = await picture2.snapshot();
          ctx2.status("Removing it…");
          await new Promise((r) => setTimeout(r, 30));
          const ok = await aiFillMask(picture2.ctx, (extra) => dilate(marked, w, h, grow + extra), variation, (t) => ctx2.status(t));
          if (!ok) {
            before.close();
            ctx2.status("Paint over the object first (Brush or Box), then press Remove object.", "bad");
            return;
          }
          picture2.commit(before);
          before = null;
          clearMarks();
          last = { marked, variation, depth: picture2.depth };
          ctx2.status("Done in " + ((performance.now() - t0) / 1e3).toFixed(1) + " s" + (variation ? " (variation " + variation + ")" : "") + ". Not right? Try another, Undo, or mark a bit differently.", "ok");
        } catch (e) {
          if (before) {
            picture2.ctx.clearRect(0, 0, w, h);
            picture2.ctx.drawImage(before, 0, 0);
            before.close();
          }
          ctx2.status("Something went wrong: " + (e && e.message ? e.message : e) + " The picture was left as it was.", "bad");
        } finally {
          picture2.setBusy(false);
        }
      }
      function removeObject() {
        if (picture2.busy || !picture2.loaded) return;
        if (ctl.state.phase !== "ready") {
          ctx2.status("Download the model first (below).", "bad");
          return;
        }
        const marked = markedPixels();
        if (!holeBounds(marked, picture2.width, picture2.height)) {
          ctx2.status("Paint over the object first (Brush or Box), then press Remove object.", "bad");
          return;
        }
        runFill(marked, 0);
      }
      async function tryAnother() {
        if (picture2.busy || !last || picture2.depth !== last.depth || ctl.state.phase !== "ready") return;
        const { marked, variation } = last;
        await picture2.undo();
        runFill(marked, variation + 1);
      }
      function refreshButtons() {
        if (!mounted) return;
        const ready = ctl.state.phase === "ready", has = picture2.loaded, idle = !picture2.busy;
        ui.clear.disabled = !has || !idle;
        ui.fill.disabled = !has || !idle || !ready;
        ui.another.disabled = !has || !idle || !ready || !last || picture2.depth !== last.depth;
        ui.need.hidden = ready || ctl.state.phase === "checking";
      }
      ctl.subscribe(refreshButtons);
      return {
        mount(panel) {
          mounted = true;
          for (const c of [maskC, draftC]) c.style.display = "";
          picture2.setPointerHandler(handler);
          picture2.stage.addEventListener("pointermove", showRing);
          picture2.stage.addEventListener("pointerdown", showRing);
          picture2.stage.addEventListener("pointerleave", hideRing);
          picture2.stage.addEventListener("pointerup", touchHide);
          const sec1 = el8("section");
          sec1.append(el8("h2", "", "Mark what to remove"));
          const seg = el8("div", "seg");
          seg.setAttribute("role", "group");
          for (const [key, label] of [["brush", "Brush"], ["erase", "Erase mark"], ["box", "Box"], ["pan", "Move"]]) {
            const b = el8("button", key === tool ? "active" : "", label);
            b.type = "button";
            b.addEventListener("click", () => {
              tool = key;
              for (const o of seg.children) o.classList.toggle("active", o === b);
            });
            seg.append(b);
          }
          const brushField = el8("label", "field");
          brushField.append(el8("span", "", "Brush size (px)"));
          const brush = document.createElement("input");
          brush.type = "number";
          brush.min = 1;
          brush.max = 400;
          brush.step = 5;
          brush.value = settings.brush;
          brush.addEventListener("input", () => {
            const v = Number(brush.value);
            if (v >= 1) {
              settings.brush = v;
              save();
            }
          });
          brushField.append(brush);
          wrapNumberInput(brush);
          ui.brush = brush;
          const hint = el8("p", "hint", "Two fingers always move and zoom the picture.");
          ui.clear = el8("button", "", "Clear marks");
          ui.clear.type = "button";
          ui.clear.addEventListener("click", clearMarks);
          sec1.append(seg, brushField, hint, ui.clear);
          const sec2 = el8("section");
          sec2.append(el8("h2", "", "Remove it"));
          const growField = el8("label", "field");
          growField.append(el8("span", "", "Grow the marked area by (px)"));
          const grow = document.createElement("input");
          grow.type = "number";
          grow.min = 0;
          grow.max = 60;
          grow.step = 1;
          grow.value = settings.grow;
          grow.addEventListener("input", () => {
            const v = Number(grow.value);
            if (v >= 0) {
              settings.grow = v;
              save();
            }
          });
          growField.append(grow);
          wrapNumberInput(grow);
          const growHint = el8("p", "hint", "A few pixels more than you painted covers shadows and fringes.");
          ui.need = el8("p", "hint required", "Download required: get the model below first.");
          ui.fill = el8("button", "btn-solid big", "Remove object");
          ui.fill.type = "button";
          ui.fill.addEventListener("click", removeObject);
          ui.another = el8("button", "big", "Try another");
          ui.another.type = "button";
          ui.another.title = "Undoes the last fill and fills again, showing the model the area from a slightly different view";
          ui.another.addEventListener("click", tryAnother);
          sec2.append(growField, growHint, ui.need, ui.fill, ui.another);
          const sec3 = el8("section");
          sec3.append(el8("h2", "", "Model"));
          sec3.append(modelBox("fill", { compact: true, deletable: false }));
          panel.append(sec1, sec2, sec3);
          refreshButtons();
        },
        unmount() {
          mounted = false;
          stroke = null;
          ring.hidden = true;
          for (const c of [maskC, draftC]) c.style.display = "none";
          picture2.setPointerHandler(null);
          picture2.stage.removeEventListener("pointermove", showRing);
          picture2.stage.removeEventListener("pointerdown", showRing);
          picture2.stage.removeEventListener("pointerleave", hideRing);
          picture2.stage.removeEventListener("pointerup", touchHide);
        },
        // marks made elsewhere (Click-to-select): shown as the marks to fill
        importMask(mask) {
          clearMarks();
          const w = maskC.width, h = maskC.height, id = maskX.createImageData(w, h);
          for (let i = 0; i < w * h && i < mask.length; i++) if (mask[i]) {
            id.data[i * 4] = 232;
            id.data[i * 4 + 1] = 98;
            id.data[i * 4 + 2] = 42;
            id.data[i * 4 + 3] = 255;
          }
          maskX.putImageData(id, 0, 0);
        },
        onPictureChange: refreshButtons,
        primary: removeObject,
        onKey(e) {
          if (e.key !== "[" && e.key !== "]") return false;
          const v = Math.min(400, Math.max(1, Math.round(settings.brush * (e.key === "]" ? 1.2 : 1 / 1.2) + (e.key === "]" ? 1 : -1))));
          settings.brush = v;
          if (ui.brush) ui.brush.value = v;
          save();
          return true;
        }
      };
    }
  };

  // apps/AiToolsLocal/src/main.js
  var $ = (id) => document.getElementById(id);
  installNumberFields();
  wrapNumberInputs();
  function status(text, kind) {
    const s = $("status");
    s.textContent = text;
    s.className = kind || "";
    debug.log("[" + (kind || "info") + "] " + text);
  }
  var cameFromZEditor = false;
  var handoffMeta;
  var active = null;
  var picture = createPicture({
    stage: $("stage"),
    world: $("world"),
    imgC: $("img"),
    origC: $("orig"),
    emptyEl: $("empty"),
    onChange() {
      const has = picture.loaded, busy = picture.busy;
      for (const id of ["save", "send"]) $(id).disabled = !has || busy;
      $("compare").disabled = !has || busy || !picture.comparable;
      $("undo").disabled = !picture.canUndo || busy;
      $("redo").disabled = !picture.canRedo || busy;
      if (active && active.tool && active.tool.onPictureChange) active.tool.onPictureChange();
    }
  });
  async function openFile(file) {
    const r = await picture.open(file);
    if (!r.ok) {
      status(r.message, "bad");
      return;
    }
    status("Picture opened (" + r.width + " × " + r.height + ")." + (r.shrunk ? " It was shrunk so it fits in memory." : "") + " Pick a tool on the left.");
  }
  var ctx = {
    picture,
    status,
    debug,
    openModels: () => select("models"),
    // marks made by another tool (a selection): switch to Remove object and show them as the marks to fill
    useAsMarks(mask) {
      select("remove-object");
      const t = instances.get("remove-object");
      if (t && t.importMask) {
        t.importMask(mask);
        status("The selection is now marked in Remove object. Press Remove object to fill it.", "ok");
      }
    }
  };
  registerTool(removeObjectTool);
  registerTool(removeBackgroundTool);
  registerTool(faceBlurTool);
  registerTool(selectObjectTool);
  registerTool(upscaleTool);
  registerTool(ocrTool);
  var instances = /* @__PURE__ */ new Map();
  var modelsPage = createModelsPage($("models"));
  var MODELS_TOOL = { id: "models", name: "Models", summary: "Downloads, licences and storage." };
  function buildList() {
    const list = $("tools-list");
    for (const t of [...allTools(), MODELS_TOOL]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tool-btn";
      b.dataset.id = t.id;
      const n = document.createElement("span");
      n.className = "tool-name";
      n.textContent = t.name;
      const s = document.createElement("span");
      s.className = "tool-sum";
      s.textContent = t.summary;
      b.append(n, s);
      b.addEventListener("click", () => select(t.id));
      list.append(b);
    }
  }
  function select(id) {
    if (active && active.id === id) return;
    if (active) {
      if (active.tool) active.tool.unmount();
      else modelsPage.hide();
    }
    const panel = $("tool-panel");
    panel.textContent = "";
    for (const b of document.querySelectorAll(".tool-btn")) b.classList.toggle("active", b.dataset.id === id);
    if (id === "models") {
      active = { id };
      modelsPage.show();
      panel.append(Object.assign(document.createElement("p"), { className: "hint", textContent: "Download or delete models on the page to the left. Your picture stays open: pick a tool again to carry on." }));
      return;
    }
    const def = allTools().find((t) => t.id === id);
    if (!instances.has(id)) instances.set(id, def.create(ctx));
    const tool = instances.get(id);
    active = { id, tool };
    tool.mount(panel);
    if (tool.onPictureChange) tool.onPictureChange();
  }
  buildList();
  $("undo").addEventListener("click", () => picture.undo());
  $("redo").addEventListener("click", () => picture.redo());
  var compare = $("compare");
  compare.addEventListener("pointerdown", () => picture.showOriginal(true));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) compare.addEventListener(ev, () => picture.showOriginal(false));
  $("save").addEventListener("click", async () => {
    try {
      const blob = await picture.toBlob();
      downloadBlob(blob, picture.name + "-edited.png");
      debug.section("Save PNG (what was exported)", await describePng(blob));
    } catch (e) {
      status("Couldn't save the picture.", "bad");
    }
  });
  $("send").addEventListener("click", async () => {
    if (!picture.loaded) return;
    try {
      if (cameFromZEditor && hasOpener()) {
        await sendImageToOpener(picture.toBlob, picture.name + "-edited.png", handoffMeta);
        status("Sent back to ZEditor: a new layer in the document it came from.", "ok");
        return;
      }
      status("Opening ZEditor…");
      await sendImageToZEditor(picture.toBlob, picture.name + "-edited.png");
      status("Sent to ZEditor (it opened in a new tab).", "ok");
    } catch (e) {
      status("Couldn't send it: " + (e && e.message ? e.message : e), "bad");
    }
  });
  listenForHandoffImage(AITOOLS_READY_MESSAGE, async (file, fromOpener, meta) => {
    await openFile(file);
    cameFromZEditor = fromOpener;
    handoffMeta = meta;
    if (fromOpener) $("send").textContent = "Send back to ZEditor";
  });
  $("open").addEventListener("click", () => $("file").click());
  $("empty-open").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) openFile(f);
  });
  $("stage").addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) openFile(f);
  });
  document.addEventListener("paste", (e) => {
    const item = [...e.clipboardData ? e.clipboardData.items : []].find((i) => i.type.startsWith("image/"));
    if (item) openFile(item.getAsFile());
  });
  document.addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      (e.shiftKey ? $("redo") : $("undo")).click();
      return;
    }
    const tool = active && active.tool;
    if (!tool) return;
    if (tool.onKey && tool.onKey(e)) return;
    if (e.key === "Enter" && picture.loaded && tool.primary) tool.primary();
  });
  installDebug({
    host: $("logwin"),
    getCanvas: () => picture.canvas,
    getState: () => ({
      pictureLoaded: picture.loaded,
      pictureSize: picture.width + "x" + picture.height,
      undoSteps: picture.depth,
      tool: active ? active.id : "none",
      models: Object.fromEntries(["fill", "bg:u2netp", "bg:modnet", "face", "sam", "upscale", "ocr:eng", "ocr:msa"].map((id) => [id, modelControl(id).state.phase]))
    })
  });
  select("remove-object");
})();
