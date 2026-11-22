// The preview's zoom: Fit (the sheets fill the pane's width, up to real size) or a percent picked in
// the footer (100% = the paper's real size on screen), pinch to zoom with two fingers, and drag to
// scroll with one finger or the mouse. Also keeps the sheets centred in the pane.
//
// The sheets are drawn at an internal size (state.sheetWidth px wide) and shrunk with
// transform: scale(var(--sheet-scale)) on #zine-scale. A transform changes how big they look but
// not how much room the layout gives them, so #zine (the box around them) is sized here to their
// scaled size (--zine-box-w/h, used by style.css on screen only — print has its own sizes). That
// is what lets the pane centre them, and scroll both ways once they're zoomed in.

import { state } from "./state.js";
import { createPinchGate } from "../../../shared/js/pinchGate.js";
import { wrapNumberInput } from "../../../shared/js/numberFields.js";

const ZOOM_MIN = 15; // percent
const ZOOM_MAX = 200;
const clampZoom = (n) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n)));

let zoomPct = null; // null: Fit
let footerInfo = null, slider = null, numberBox = null, fitButton = null;

// How wide the sheet's paper really is, in CSS px (96 per inch).
function paperWidthPx() {
    var w = parseFloat(state.aspectWidth) || 0;
    return state.pgunit === "mm" ? (w / 25.4) * 96 : w * 96;
}

// How wide (in px) the sheets fill the preview pane at Fit: its width minus the canvas wrapper's
// 24px side padding. (Was also the target for --sheet-scale before zoom existed.)
export function getPreviewTargetWidth() {
    var pane = document.getElementById("workspace-preview-scroll");
    if (pane && pane.clientWidth > 0) return Math.max(200, pane.clientWidth - 48);
    return 550; // before the pane has been laid out
}

// Fit, as a percent of real size: fills the pane's width, but never bigger than real size.
function fitPercent() {
    var paper = paperWidthPx();
    if (!paper) return 100;
    return Math.max(ZOOM_MIN, Math.min(100, (getPreviewTargetWidth() / paper) * 100));
}

export function currentZoomPercent() {
    return zoomPct == null ? fitPercent() : zoomPct;
}

// Applies the current zoom: the sheets' scale, the box around them, and the footer controls.
export function applyPreviewScale() {
    var root = document.documentElement;
    var paper = paperWidthPx();
    var pct = currentZoomPercent();
    var scale = state.sheetWidth && paper ? (pct / 100) * paper / state.sheetWidth : getPreviewTargetWidth() / (state.sheetWidth || 550);
    root.style.setProperty("--sheet-scale", scale);
    sizeZineBox(scale);
    updateControls(pct);
}

// #zine takes up exactly the scaled sheets' room (their unscaled layout height times the scale).
function sizeZineBox(scale) {
    var zine = document.getElementById("zine");
    var inner = document.getElementById("zine-scale");
    if (!zine || !inner) return;
    zine.style.setProperty("--zine-box-w", Math.ceil(inner.offsetWidth * scale) + "px");
    zine.style.setProperty("--zine-box-h", Math.ceil(inner.offsetHeight * scale) + "px");
}

function updateControls(pct) {
    var shown = Math.round(pct);
    if (slider) slider.value = String(shown);
    if (numberBox && document.activeElement !== numberBox) numberBox.value = String(shown);
    if (fitButton) {
        fitButton.classList.toggle("active", zoomPct == null);
        fitButton.setAttribute("aria-pressed", String(zoomPct == null));
    }
}

// Sets the zoom (a percent, or null for Fit), keeping the spot at (anchorX, anchorY) on screen —
// the pane's middle by default — where it is.
export function setPreviewZoom(pct, anchorX, anchorY) {
    var pane = document.getElementById("workspace-preview-scroll");
    var box = document.getElementById("zine");
    var spot = null;
    if (pane && box && box.offsetWidth) {
        var pr = pane.getBoundingClientRect();
        var ax = anchorX == null ? pr.left + pane.clientWidth / 2 : anchorX;
        var ay = anchorY == null ? pr.top + pane.clientHeight / 2 : anchorY;
        var r = box.getBoundingClientRect();
        spot = { fx: (ax - r.left) / r.width, fy: (ay - r.top) / r.height, ax: ax, ay: ay };
    }
    zoomPct = pct == null ? null : clampZoom(pct);
    applyPreviewScale();
    if (spot) keepSpot(spot);
}

// Scrolls so the fraction (fx, fy) of the sheets' box sits at screen point (ax, ay).
function keepSpot(spot) {
    var pane = document.getElementById("workspace-preview-scroll");
    var box = document.getElementById("zine");
    if (!pane || !box) return;
    var r = box.getBoundingClientRect();
    pane.scrollLeft += r.left + spot.fx * r.width - spot.ax;
    pane.scrollTop += r.top + spot.fy * r.height - spot.ay;
}

// The footer's text (paper size, sheet count…), next to the zoom controls.
export function setPreviewInfo(text) {
    if (footerInfo) footerInfo.textContent = text;
}

// Builds the footer's zoom controls and the drag/pinch handling. Called once at startup.
export function setUpPreviewZoom() {
    var footer = document.getElementById("preview-footer");
    var pane = document.getElementById("workspace-preview-scroll");
    var wrapper = document.getElementById("canvas-wrapper");
    if (!footer || !pane || !wrapper) return;

    // Footer: "info | zoom slider, percent box, Fit".
    var initial = footer.textContent;
    footer.textContent = "";
    footerInfo = document.createElement("span");
    footerInfo.className = "za-preview-info";
    footerInfo.textContent = initial;
    var divider = document.createElement("span");
    divider.className = "za-statusbar-divider";
    divider.setAttribute("aria-hidden", "true");
    divider.textContent = "|";
    var zoom = document.createElement("span");
    zoom.className = "za-zoom";
    slider = document.createElement("input");
    slider.type = "range";
    slider.className = "za-zoom-slider";
    slider.min = String(ZOOM_MIN);
    slider.max = String(ZOOM_MAX);
    slider.step = "1";
    slider.setAttribute("aria-label", "Preview zoom");
    slider.addEventListener("input", function () { setPreviewZoom(Number(slider.value)); });
    numberBox = document.createElement("input");
    numberBox.type = "number";
    numberBox.className = "za-zoom-number";
    numberBox.min = String(ZOOM_MIN);
    numberBox.max = String(ZOOM_MAX);
    numberBox.step = "5";
    numberBox.setAttribute("aria-label", "Preview zoom percent");
    numberBox.title = "100% is the paper's real size";
    // Typed numbers apply on Enter or leaving the box; the spinner arrows straight away.
    numberBox.addEventListener("input", function (e) { if (!e.inputType) setPreviewZoom(Number(numberBox.value)); });
    numberBox.addEventListener("change", function () { var n = parseFloat(numberBox.value); if (isFinite(n)) setPreviewZoom(n); });
    numberBox.addEventListener("keydown", function (e) { if (e.key === "Enter") numberBox.blur(); });
    var percentSign = document.createElement("span");
    percentSign.textContent = "%";
    fitButton = document.createElement("button");
    fitButton.type = "button";
    fitButton.className = "za-zoom-fit";
    fitButton.textContent = "Fit";
    fitButton.title = "Fit the sheets to the preview's width (at most real size)";
    fitButton.addEventListener("click", function () { setPreviewZoom(null); });
    zoom.append(slider, numberBox, percentSign, fitButton);
    wrapNumberInput(numberBox); // the - and + buttons beside the box
    footer.append(footerInfo, divider, zoom);

    // The box around the sheets follows their content (a new PDF, different options).
    var inner = document.getElementById("zine-scale");
    if (inner && window.ResizeObserver) new ResizeObserver(function () { applyPreviewScale(); }).observe(inner);

    // Drag to scroll (mouse or one finger) and pinch to zoom (two fingers) over the sheets.
    var pointers = new Map(); // pointerId -> { x, y }
    var pan = null; // { x, y, left, top }
    var pinch = null; // { spread0, pct0, fx, fy, gate }
    var two = function () { return Array.from(pointers.values()).slice(0, 2); };
    var startPanAt = function (p) { pan = { x: p.x, y: p.y, left: pane.scrollLeft, top: pane.scrollTop }; };
    wrapper.addEventListener("pointerdown", function (e) {
        if (e.button !== 0 || !e.target.closest("#zine")) return;
        e.preventDefault();
        try { wrapper.setPointerCapture(e.pointerId); } catch (err) { /* the drag still works */ }
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        wrapper.classList.add("is-panning");
        if (pointers.size === 1) {
            startPanAt({ x: e.clientX, y: e.clientY });
        } else if (pointers.size === 2) {
            var ab = two(), a = ab[0], b = ab[1];
            var box = document.getElementById("zine").getBoundingClientRect();
            var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            pan = null;
            pinch = { spread0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), pct0: currentZoomPercent(), fx: (mx - box.left) / box.width, fy: (my - box.top) / box.height, gate: createPinchGate() };
        }
    });
    wrapper.addEventListener("pointermove", function (e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pointers.size >= 2) {
            var ab = two(), a = ab[0], b = ab[1];
            var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            var s = pinch.gate(Math.hypot(a.x - b.x, a.y - b.y) / pinch.spread0);
            if (s !== 1) { // under the threshold it's a two-finger scroll: the zoom (or Fit) stays
                zoomPct = clampZoom(pinch.pct0 * s);
                applyPreviewScale();
            }
            keepSpot({ fx: pinch.fx, fy: pinch.fy, ax: mx, ay: my });
            return;
        }
        if (!pan) return;
        pane.scrollLeft = pan.left - (e.clientX - pan.x);
        pane.scrollTop = pan.top - (e.clientY - pan.y);
    });
    var end = function (e) {
        if (!pointers.delete(e.pointerId)) return;
        try { if (wrapper.hasPointerCapture(e.pointerId)) wrapper.releasePointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
        if (pointers.size === 1) { pinch = null; startPanAt(two()[0]); return; } // one finger lifted: keep scrolling
        if (pointers.size > 0) return;
        pinch = null;
        pan = null;
        wrapper.classList.remove("is-panning");
    };
    wrapper.addEventListener("pointerup", end);
    wrapper.addEventListener("pointercancel", end);

    applyPreviewScale();
}
