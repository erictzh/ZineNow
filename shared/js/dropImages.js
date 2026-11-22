// Dropping pictures into a page: from the file manager (the files themselves) or from another
// website (the picture's web address, which the page then tries to fetch). Shared by ZEditor and
// Markdown-to-PDF; each app says what to do with a drop (`onDrop`).
//
//   installImageDrop({ label, onDrop, onOther }) -> uninstall()
//
// What it takes care of:
//   - a dashed overlay with `label` while a picture is dragged over the window;
//   - the browser's own behaviour for a drop it doesn't know (opening the file in the tab, which
//     would leave the app) is stopped;
//   - drags that start inside the page (reordering pages or layers, dragging text) and text
//     dropped into a text field are left completely alone.

import { isSvgFile } from "./imageFiles.js";

const IMAGE_NAME = /\.(png|jpe?g|gif|webp|svg|svgz|bmp|avif|ico)$/i;
const IMAGE_URL = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)(\?[^#]*)?(#.*)?$/i;

export function isImageFile(file) {
  return Boolean(file) && ((file.type || "").startsWith("image/") || IMAGE_NAME.test(file.name || "") || isSvgFile(file));
}

// ---- Reading what was dropped -----------------------------------------------------------------

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" stays "&lt;"
}

function attribute(tag, name) {
  const m = new RegExp("\\s" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i").exec(tag);
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? "") : "";
}

function getData(dt, type) {
  try { return dt.getData(type) || ""; } catch (e) { return ""; }
}

// A web address worth fetching as a picture: http(s) (protocol-relative ones get https) or a data:
// image. Relative addresses, blob: and file: can't be fetched from here.
function usableUrl(url) {
  const u = String(url || "").trim();
  if (/^data:image\//i.test(u)) return u;
  if (u.startsWith("//")) return "https:" + u;
  return /^https?:\/\//i.test(u) ? u : null;
}

/**
 * What a drop holds: { files: [pictures from the file manager], url, alt } where `url` is a
 * picture's web address when the drop came from another page (and held no files); or null if
 * there is no picture in it.
 *
 * Chrome usually hands over the picture itself as a file when it comes from a website; Firefox
 * and Safari often give only its address (in the dragged HTML, or as a link).
 */
export function readDrop(dt) {
  const files = Array.from((dt && dt.files) || []).filter(isImageFile);
  if (files.length) return { files, url: null, alt: "" };
  if (!dt) return null;

  // The dragged HTML has the <img> that was grabbed (with its alt text).
  const html = getData(dt, "text/html");
  const tag = /<img\b[^>]*>/i.exec(html);
  if (tag) {
    const url = usableUrl(attribute(tag[0], "src"));
    if (url) return { files: [], url, alt: attribute(tag[0], "alt") };
  }
  // A bare address: a picture's link (not any link: an ordinary page address isn't a picture).
  const link = getData(dt, "text/uri-list").split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
  const plain = getData(dt, "text/plain").trim();
  for (const candidate of [link, /^\S+$/.test(plain) ? plain : ""]) {
    const url = usableUrl(candidate);
    if (url && (/^data:/i.test(url) || IMAGE_URL.test(url))) return { files: [], url, alt: "" };
  }
  return null;
}

// A picture's file name from its address (a data: address has none).
function nameFromUrl(url, type) {
  const ext = ((type || "").split("/")[1] || "png").replace("svg+xml", "svg").replace("jpeg", "jpg");
  if (!/^https?:/i.test(url)) return "dropped-picture." + ext;
  let last = "";
  try { last = decodeURIComponent(new URL(url).pathname.split("/").pop() || ""); } catch (e) { /* keep "" */ }
  last = last.replace(/[\\/:*?"<>|]+/g, "_").trim();
  if (!last) return "dropped-picture." + ext;
  return IMAGE_NAME.test(last) ? last : last + "." + ext;
}

/**
 * Fetches a dropped picture's address and returns it as a File, or null if that isn't possible.
 * Most websites don't let another page read their pictures (the CORS rule), so null is common for
 * pictures dragged from a site; the picture's own file, or a site that allows it, works.
 */
export async function fetchImageFile(url) {
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

// ---- Listening for drops ----------------------------------------------------------------------

const isEditable = (el) => el instanceof Element && Boolean(el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));

function makeOverlay(text) {
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed", top: "0", left: "0", right: "0", bottom: "0", zIndex: "2147483000", display: "none",
    alignItems: "center", justifyContent: "center", pointerEvents: "none", boxSizing: "border-box",
    background: "rgba(221, 83, 26, 0.12)", border: "3px dashed var(--ui-accent, #dd531a)",
  });
  const label = document.createElement("div");
  label.textContent = text;
  Object.assign(label.style, {
    padding: "14px 22px", borderRadius: "10px", background: "#201918", color: "var(--ui-fg, #e9e9ee)",
    border: "1px solid var(--ui-border, #3f3634)", boxShadow: "0 10px 24px rgba(0, 0, 0, 0.45)",
    font: "600 17px var(--ui-font, system-ui, sans-serif)",
  });
  overlay.appendChild(label);
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * @param {object} options
 * @param {string} options.label    The overlay's text, e.g. "Drop a picture to add it to the page".
 * @param {function} options.onDrop Called with { files, url, alt, x, y, target } (x, y: where it
 *                                  landed, in window pixels; see readDrop for files / url / alt).
 * @param {function} [options.onOther] Called with the dropped files when none of them is a picture.
 */
export function installImageDrop({ label, onDrop, onOther }) {
  let internal = false; // a drag that began in this page (reordering, dragging text): not ours
  let depth = 0; // dragenter minus dragleave, so moving between elements doesn't flicker the overlay
  let overlay = null;

  const types = (e) => Array.from((e.dataTransfer && e.dataTransfer.types) || []);
  // Pictures arrive as files or as an address/HTML; text-only drags aren't ours. Files always count
  // (an internal drag never has any), which also clears a stuck `internal`.
  const ours = (e) => {
    const t = types(e);
    if (t.includes("Files")) { internal = false; return true; }
    return !internal && (t.includes("text/uri-list") || t.includes("text/html") || t.includes("text/x-moz-url"));
  };
  const show = () => { if (!overlay) overlay = makeOverlay(label); overlay.style.display = "flex"; };
  const hide = () => { depth = 0; if (overlay) overlay.style.display = "none"; };

  const onDragStart = () => { internal = true; };
  const onDragEnd = () => { internal = false; hide(); };
  const onDragEnter = (e) => { if (ours(e)) { depth++; show(); } };
  const onDragLeave = (e) => {
    if (!ours(e)) return;
    depth = Math.max(0, depth - 1);
    const outside = e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight;
    if (depth === 0 || outside) hide();
  };
  const onDragOver = (e) => {
    if (!ours(e)) return;
    // Text fields take drops themselves (text, files...); only claim the drop where nothing would.
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
      const others = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (others.length) { e.preventDefault(); if (onOther) onOther(others); } // e.g. a PDF: not opened in the tab
      else if (!isEditable(e.target)) e.preventDefault(); // a link or text on the page: nothing to do
      return; // a link or text into a text field: the field's own business
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
