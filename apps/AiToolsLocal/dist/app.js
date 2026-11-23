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
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("The other app didn't answer. It may still be loading: try again in a moment."));
      }, 2e4);
      function onMessage(e) {
        if (e.source !== win || e.origin !== location.origin || !e.data || e.data.type !== readyType) return;
        clearTimeout(timer);
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
  async function createSession(modelBytes2, preferGpu) {
    const ort = await loadOrt();
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
    if (preferGpu && await gpuUsable()) {
      try {
        return { session: await ort.InferenceSession.create(modelBytes2, { executionProviders: ["webgpu"], graphOptimizationLevel: "all" }), backend: "gpu" };
      } catch (e) {
      }
    }
    return { session: await ort.InferenceSession.create(modelBytes2, { executionProviders: ["wasm"], graphOptimizationLevel: "all" }), backend: "cpu" };
  }
  async function runModel(session2, rgba, hole, sign = 1) {
    const ort = await loadOrt();
    const input = new ort.Tensor("float32", buildInput(rgba, hole, sign), [1, 4, MODEL_SIZE, MODEL_SIZE]);
    const out = await session2.run({ [session2.inputNames[0]]: input });
    return outputToRgba(out[session2.outputNames[0]].data);
  }
  var findSign = (session2) => findMaskSign((rgba, hole, sign) => runModel(session2, rgba, hole, sign));

  // apps/AiToolsLocal/src/main.js
  var $ = (id) => document.getElementById(id);
  var MAX_SIDE = 4096;
  var FEATHER = 3;
  var MAX_UNDO = 8;
  installNumberFields();
  wrapNumberInputs();
  var settings = { brush: 40, grow: 6, url: DEFAULT_MODEL_URL };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem("zinenow.aitools.settings") || "{}"));
  } catch (e) {
  }
  var saveSettings = () => {
    try {
      localStorage.setItem("zinenow.aitools.settings", JSON.stringify(settings));
    } catch (e) {
    }
  };
  $("brush").value = settings.brush;
  $("grow").value = settings.grow;
  $("model-url").value = settings.url;
  var stage = $("stage");
  var world = $("world");
  var imgC = $("img");
  var origC = $("orig");
  var maskC = $("mask");
  var draftC = $("draft");
  var imgX = imgC.getContext("2d", { willReadFrequently: true });
  var maskX = maskC.getContext("2d", { willReadFrequently: true });
  var draftX = draftC.getContext("2d");
  var fileName = "picture";
  var view = { s: 1, x: 0, y: 0 };
  var tool = "brush";
  var busy = false;
  var undoStack = [];
  var redoStack = [];
  var session = null;
  var modelBytes = null;
  var maskSign = null;
  var cameFromZEditor = false;
  var handoffMeta;
  function status(text, kind) {
    const s = $("status");
    s.textContent = text;
    s.className = kind || "";
  }
  var loaded = false;
  function hasPicture() {
    return loaded;
  }
  function applyView() {
    world.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.s + ")";
  }
  function fitView() {
    const r = stage.getBoundingClientRect();
    const s = Math.min(r.width / imgC.width, r.height / imgC.height, 1) * 0.96;
    view = { s, x: (r.width - imgC.width * s) / 2, y: (r.height - imgC.height * s) / 2 };
    applyView();
  }
  function updateButtons() {
    const has = hasPicture();
    for (const id of ["save", "send", "clear", "fill", "compare"]) $(id).disabled = !has || busy;
    $("undo").disabled = !undoStack.length || busy;
    $("redo").disabled = !redoStack.length || busy;
  }
  async function openFile(file) {
    if (!file || !/^image\//.test(file.type || "image/")) {
      status("That isn't a picture file.", "bad");
      return;
    }
    try {
      let bmp = await createImageBitmap(file);
      let note = "";
      const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
      if (k < 1) note = " It was shrunk to " + w + " × " + h + " so it fits in memory.";
      for (const c of [imgC, origC, maskC, draftC]) {
        c.width = w;
        c.height = h;
      }
      imgX.clearRect(0, 0, w, h);
      imgX.drawImage(bmp, 0, 0, w, h);
      origC.getContext("2d").drawImage(bmp, 0, 0, w, h);
      bmp.close && bmp.close();
      fileName = (file.name || "picture").replace(/\.[^.]+$/, "");
      undoStack = [];
      redoStack = [];
      loaded = true;
      $("empty").hidden = true;
      world.hidden = false;
      fitView();
      updateButtons();
      status("Picture opened (" + w + " × " + h + ")." + note + " Paint over the object you want gone, then press Remove object.");
    } catch (e) {
      status("Couldn't open that picture: " + e.message, "bad");
    }
  }
  var pointers = /* @__PURE__ */ new Map();
  var stroke = null;
  var pinch = null;
  var toImage = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s };
  };
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
  stage.addEventListener("pointerdown", (e) => {
    if (!hasPicture() || busy) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      stroke = null;
      const [p, q] = [...pointers.values()];
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2 };
      return;
    }
    if (pointers.size > 2) return;
    const pt = toImage(e);
    if (tool === "pan") stroke = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    else if (tool === "box") stroke = { kind: "box", a: pt, b: pt };
    else {
      stroke = { kind: "paint", last: pt };
      paintLine(pt, pt);
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
    if (!stroke) return;
    const pt = toImage(e);
    if (stroke.kind === "pan") {
      view.x = stroke.vx + e.clientX - stroke.sx;
      view.y = stroke.vy + e.clientY - stroke.sy;
      applyView();
    } else if (stroke.kind === "paint") {
      paintLine(stroke.last, pt);
      stroke.last = pt;
    } else if (stroke.kind === "box") {
      stroke.b = pt;
      draftX.clearRect(0, 0, draftC.width, draftC.height);
      draftX.strokeStyle = "#ffffff";
      draftX.setLineDash([8 / view.s, 6 / view.s]);
      draftX.lineWidth = 2 / view.s;
      draftX.strokeRect(stroke.a.x, stroke.a.y, pt.x - stroke.a.x, pt.y - stroke.a.y);
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (stroke && stroke.kind === "box" && pointers.size === 0) {
      draftX.clearRect(0, 0, draftC.width, draftC.height);
      maskX.fillStyle = "#e8622a";
      maskX.fillRect(Math.min(stroke.a.x, stroke.b.x), Math.min(stroke.a.y, stroke.b.y), Math.abs(stroke.b.x - stroke.a.x), Math.abs(stroke.b.y - stroke.a.y));
    }
    if (pointers.size === 0) stroke = null;
  }
  var ring = $("ring");
  function showRing(e) {
    if (!hasPicture() || tool !== "brush" && tool !== "erase" || pointers.size > 1) {
      ring.hidden = true;
      return;
    }
    const r = stage.getBoundingClientRect(), d = Math.max(4, settings.brush * view.s);
    ring.style.width = ring.style.height = d + "px";
    ring.style.left = e.clientX - r.left - d / 2 + "px";
    ring.style.top = e.clientY - r.top - d / 2 + "px";
    ring.hidden = false;
  }
  stage.addEventListener("pointermove", showRing);
  stage.addEventListener("pointerdown", showRing);
  stage.addEventListener("pointerleave", () => {
    ring.hidden = true;
  });
  stage.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") ring.hidden = true;
  });
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("wheel", (e) => {
    if (!hasPicture()) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const s2 = Math.min(40, Math.max(0.05, view.s * Math.exp(-e.deltaY * 15e-4)));
    const ix = (e.clientX - r.left - view.x) / view.s, iy = (e.clientY - r.top - view.y) / view.s;
    view = { s: s2, x: e.clientX - r.left - ix * s2, y: e.clientY - r.top - iy * s2 };
    applyView();
  }, { passive: false });
  for (const b of document.querySelectorAll("[data-tool]")) {
    b.addEventListener("click", () => {
      tool = b.dataset.tool;
      for (const o of document.querySelectorAll("[data-tool]")) o.classList.toggle("active", o === b);
    });
  }
  $("brush").addEventListener("input", () => {
    const v = Number($("brush").value);
    if (v >= 1) {
      settings.brush = v;
      saveSettings();
    }
  });
  $("grow").addEventListener("input", () => {
    const v = Number($("grow").value);
    if (v >= 0) {
      settings.grow = v;
      saveSettings();
    }
  });
  $("clear").addEventListener("click", () => maskX.clearRect(0, 0, maskC.width, maskC.height));
  function markedPixels() {
    const d = maskX.getImageData(0, 0, maskC.width, maskC.height).data;
    const m = new Uint8Array(maskC.width * maskC.height);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 64 ? 1 : 0;
    return m;
  }
  async function checkMaskSign(url) {
    const key = "sign:" + url;
    const saved = (settings.signs || {})[key];
    if (saved === 1 || saved === -1) {
      maskSign = saved;
      return;
    }
    status("Checking the model (one time, a few seconds)…");
    const r = await findSign(session.session);
    maskSign = r.sign;
    settings.signs = { ...settings.signs || {}, [key]: r.sign };
    saveSettings();
  }
  async function ensureSession() {
    if (session) return session;
    const url = $("model-url").value.trim() || DEFAULT_MODEL_URL;
    settings.url = url;
    saveSettings();
    if (!modelBytes) {
      status("Getting the model…");
      $("prog").hidden = false;
      const r = await getModelBytes(url, (got, total) => {
        $("prog").max = total || got * 2;
        $("prog").value = got;
        status("Downloading the model (first time only)… " + (got / 1048576).toFixed(1) + (total ? " of " + (total / 1048576).toFixed(1) : "") + " MB");
      });
      $("prog").hidden = true;
      modelBytes = r.bytes;
    }
    status("Starting the model…");
    session = await createSession(modelBytes, true);
    await checkMaskSign(url);
    refreshModelInfo();
    return session;
  }
  var MAX_OBJECTS = 12;
  async function fillOne(mask, crop, w) {
    const sess = await ensureSession();
    const win = document.createElement("canvas");
    win.width = win.height = MODEL_SIZE;
    const wx = win.getContext("2d", { willReadFrequently: true });
    wx.imageSmoothingQuality = "high";
    wx.drawImage(imgC, crop.x, crop.y, crop.side, crop.side, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const rgba = wx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
    const hole = windowMask(mask, w, crop);
    let answer;
    try {
      answer = await runModel(sess.session, rgba, hole, maskSign || 1);
    } catch (e) {
      if (sess.backend !== "gpu") throw e;
      status("The graphics chip failed; trying the processor…");
      session = await createSession(modelBytes, false);
      answer = await runModel(session.session, rgba, hole, maskSign || 1);
      refreshModelInfo();
    }
    const ac = document.createElement("canvas");
    ac.width = ac.height = MODEL_SIZE;
    ac.getContext("2d").putImageData(new ImageData(answer, MODEL_SIZE, MODEL_SIZE), 0, 0);
    const sc = document.createElement("canvas");
    sc.width = sc.height = crop.side;
    const sx = sc.getContext("2d", { willReadFrequently: true });
    sx.imageSmoothingQuality = "high";
    sx.drawImage(ac, 0, 0, crop.side, crop.side);
    const scaled = sx.getImageData(0, 0, crop.side, crop.side).data;
    const region = imgX.getImageData(crop.x, crop.y, crop.side, crop.side);
    paste(region.data, crop.side, { x: 0, y: 0, side: crop.side }, scaled, blendWeights(mask, w, crop, FEATHER));
    imgX.putImageData(region, crop.x, crop.y);
  }
  async function removeObject() {
    if (busy || !hasPicture()) return;
    const w = imgC.width, h = imgC.height;
    const marked = markedPixels();
    if (!holeBounds(marked, w, h)) {
      status("Paint over the object first (Brush or Box), then press Remove object.", "bad");
      return;
    }
    const mask = dilate(marked, w, h, Math.max(0, Math.round(settings.grow)));
    const { labels, boxes } = labelPieces(mask, w, h);
    const groups = groupPieces(boxes, w, h);
    if (groups.some((g) => !g.crop)) {
      status("That area is too big for the AI: mark a smaller part, or do it in two or three steps.", "bad");
      return;
    }
    if (groups.length > MAX_OBJECTS) {
      status("That is " + groups.length + " separate marks: do at most " + MAX_OBJECTS + " at a time.", "bad");
      return;
    }
    busy = true;
    updateButtons();
    const t0 = performance.now();
    let before = null;
    try {
      before = await createImageBitmap(imgC);
      for (let i = 0; i < groups.length; i++) {
        status((groups.length > 1 ? "Removing object " + (i + 1) + " of " + groups.length + "… " : "Removing it… ") + (session ? session.backend === "gpu" ? "(graphics chip)" : "(processor, slower)" : ""));
        await new Promise((r) => setTimeout(r, 30));
        await fillOne(groups.length === 1 ? mask : groupMask(labels, groups[i].ids), groups[i].crop, w);
      }
      undoStack.push(before);
      if (undoStack.length > MAX_UNDO) undoStack.shift().close();
      redoStack = [];
      maskX.clearRect(0, 0, maskC.width, maskC.height);
      status("Done in " + ((performance.now() - t0) / 1e3).toFixed(1) + " s" + (groups.length > 1 ? " (" + groups.length + " objects)" : "") + ". Not right? Undo, mark a bit differently, or press Remove object again.", "ok");
    } catch (e) {
      $("prog").hidden = true;
      if (before) {
        imgX.clearRect(0, 0, w, h);
        imgX.drawImage(before, 0, 0);
        before.close();
      }
      status("Something went wrong: " + (e && e.message ? e.message : e) + " The picture was left as it was.", "bad");
    } finally {
      busy = false;
      updateButtons();
    }
  }
  $("fill").addEventListener("click", removeObject);
  async function restore(from, to) {
    if (!from.length || busy) return;
    to.push(await createImageBitmap(imgC));
    const bmp = from.pop();
    imgX.clearRect(0, 0, imgC.width, imgC.height);
    imgX.drawImage(bmp, 0, 0);
    bmp.close();
    updateButtons();
  }
  $("undo").addEventListener("click", () => restore(undoStack, redoStack));
  $("redo").addEventListener("click", () => restore(redoStack, undoStack));
  var showOriginal = (on) => {
    origC.hidden = !on;
    imgC.style.visibility = on ? "hidden" : "visible";
  };
  var compare = $("compare");
  for (const ev of ["pointerdown"]) compare.addEventListener(ev, () => showOriginal(true));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) compare.addEventListener(ev, () => showOriginal(false));
  $("save").addEventListener("click", () => {
    imgC.toBlob((blob) => {
      if (blob) downloadBlob(blob, fileName + "-filled.png");
      else status("Couldn't save the picture.", "bad");
    }, "image/png");
  });
  var toBlob = () => new Promise((resolve, reject) => imgC.toBlob((b) => b ? resolve(b) : reject(new Error("Couldn't make the picture.")), "image/png"));
  $("send").addEventListener("click", async () => {
    if (!hasPicture()) return;
    try {
      if (cameFromZEditor && hasOpener()) {
        await sendImageToOpener(toBlob, fileName + "-filled.png", handoffMeta);
        status("Sent back to ZEditor: a new layer in the document it came from.", "ok");
        return;
      }
      status("Opening ZEditor…");
      await sendImageToZEditor(toBlob, fileName + "-filled.png");
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
  stage.addEventListener("dragover", (e) => e.preventDefault());
  stage.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) openFile(f);
  });
  document.addEventListener("paste", (e) => {
    const item = [...e.clipboardData ? e.clipboardData.items : []].find((i) => i.type.startsWith("image/"));
    if (item) openFile(item.getAsFile());
  });
  document.addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      (e.shiftKey ? $("redo") : $("undo")).click();
    } else if (e.key === "Enter" && hasPicture()) removeObject();
    else if (e.key === "[" || e.key === "]") {
      const v = Math.min(400, Math.max(1, Math.round(settings.brush * (e.key === "]" ? 1.2 : 1 / 1.2) + (e.key === "]" ? 1 : -1))));
      settings.brush = v;
      $("brush").value = v;
      saveSettings();
    }
  });
  window.addEventListener("resize", () => {
    if (hasPicture()) fitView();
  });
  async function refreshModelInfo() {
    const saved = await isModelSaved($("model-url").value.trim() || DEFAULT_MODEL_URL);
    const gpu = await gpuUsable();
    $("model-info").textContent = "Model: " + (saved ? "saved on this device (works offline)." : "not downloaded yet (about 28 MB, downloaded the first time you press Remove object).") + "  Chip: " + (session ? session.backend === "gpu" ? "graphics chip (fast)." : "processor (slower)." : gpu ? "graphics chip available." : "no graphics chip mode here: the processor will be used.");
  }
  $("forget").addEventListener("click", async () => {
    await forgetModel();
    session = null;
    modelBytes = null;
    refreshModelInfo();
    status("The saved model was removed from this device.");
  });
  refreshModelInfo();
  updateButtons();
})();
