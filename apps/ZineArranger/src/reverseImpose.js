// Reverse Impose: splits an imposed booklet PDF back into pages in reading order.

import { logCmd, logResult } from "./activityLog.js";
import { setReverseImposePageSize } from "./print.js";

// Renders one full PDF page at high resolution, then crops it into Left and
// Right half-canvases (W/2 x H each). Returns physical size in PDF points
// (1/72in) for each half too, so the caller can size the printed output
// to the real, correct physical dimensions rather than guessing.
async function splitPdfPageIntoHalves(page) {
    var renderScale = 2;
    var outputScale = 3; // extra canvas pixel density for print sharpness, same idea as the normal renderPage() path
    var viewport = page.getViewport({ scale: renderScale });

    var fullCanvas = document.createElement("canvas");
    fullCanvas.width = Math.floor(viewport.width * outputScale);
    fullCanvas.height = Math.floor(viewport.height * outputScale);
    var fullCtx = fullCanvas.getContext("2d");
    await page.render({
        canvasContext: fullCtx,
        transform: [outputScale, 0, 0, outputScale, 0, 0],
        viewport: viewport
    }).promise;

    var halfWidthPx = Math.floor(fullCanvas.width / 2);
    var heightPx = fullCanvas.height;

    var leftCanvas = document.createElement("canvas");
    leftCanvas.width = halfWidthPx;
    leftCanvas.height = heightPx;
    leftCanvas.getContext("2d").drawImage(fullCanvas, 0, 0, halfWidthPx, heightPx, 0, 0, halfWidthPx, heightPx);

    var rightCanvas = document.createElement("canvas");
    rightCanvas.width = fullCanvas.width - halfWidthPx;
    rightCanvas.height = heightPx;
    rightCanvas.getContext("2d").drawImage(fullCanvas, halfWidthPx, 0, rightCanvas.width, heightPx, 0, 0, rightCanvas.width, heightPx);

    var widthPt = (viewport.width / renderScale) / 2;
    var heightPt = viewport.height / renderScale;

    return {
        left: { canvas: leftCanvas, widthPt: widthPt, heightPt: heightPt },
        right: { canvas: rightCanvas, widthPt: widthPt, heightPt: heightPt }
    };
}

// The core Reverse Impose operation: takes an already-imposed source PDF
// (alternating front/back sheet sides — page 1=sheet-1-front, page 2=
// sheet-1-back, page 3=sheet-2-front, ... — the standard convention for a
// print-ready imposed booklet) and reconstructs it into ordinary sequential
// reading order by splitting every sheet side down the middle and remapping
// the four resulting halves per sheet using the reverse saddle-stitch formula:
//   Front Left  -> N - 2(k-1)      Front Right -> 2k - 1
//   Back Left   -> 2k              Back Right  -> N - (2k-1)
// where k is the sheet number (1-indexed) and N = totalSheets * 4.
// Returns a 1-indexed array (index 0 unused) of {canvas, widthPt, heightPt},
// or null (after showing a validation error) if the source can't be paired
// into whole sheets.
export async function reverseImposePdf(pdf, actualPageCount) {
    if(actualPageCount < 2 || actualPageCount % 2 !== 0) {
        var msg = "Reverse Impose needs one front + one back page per sheet (an even page count). This PDF has " + actualPageCount + " page(s).";
        logResult(msg, true);
        setReverseImposePageSize(null, null); // clear any stale size from a previous successful run
        alert(msg);
        return null;
    }

    var totalSheets = actualPageCount / 2;
    var N = totalSheets * 4;
    logResult("Reverse Impose: " + totalSheets + " sheet(s) detected \u2192 " + N + " sequential page(s) (a multiple of 4).");

    var resultPages = new Array(N + 1); // 1-indexed, [0] unused

    for(var k = 1; k <= totalSheets; k++) {
        var frontPageNum = 2 * k - 1;
        var backPageNum = 2 * k;

        logCmd("reverseImposePdf(): sheet " + k + "/" + totalSheets);

        var frontPage = await pdf.getPage(frontPageNum);
        var frontHalves = await splitPdfPageIntoHalves(frontPage);
        var backPage = await pdf.getPage(backPageNum);
        var backHalves = await splitPdfPageIntoHalves(backPage);

        var frontLeftSeq = N - 2 * (k - 1);
        var frontRightSeq = 2 * k - 1;
        var backLeftSeq = 2 * k;
        var backRightSeq = N - (2 * k - 1);

        resultPages[frontLeftSeq] = frontHalves.left;
        resultPages[frontRightSeq] = frontHalves.right;
        resultPages[backLeftSeq] = backHalves.left;
        resultPages[backRightSeq] = backHalves.right;

        logResult("Front (src p." + frontPageNum + ") \u2192 seq " + frontLeftSeq + " (L), " + frontRightSeq + " (R). Back (src p." + backPageNum + ") \u2192 seq " + backLeftSeq + " (L), " + backRightSeq + " (R).");
    }

    return resultPages;
}

export function renderReverseImposeGrid(resultPages, N) {
    var grid = document.getElementById("reverse-impose-grid");
    grid.innerHTML = "";
    var commonWidthIn = null, commonHeightIn = null; // for the @page size override below — see setReverseImposePageSize()
    for(var i = 1; i <= N; i++) {
        var entry = resultPages[i];
        var pageDiv = document.createElement("div");
        pageDiv.className = "reverse-impose-page";
        if(entry) {
            var widthIn = entry.widthPt / 72;
            var heightIn = entry.heightPt / 72;
            if(commonWidthIn === null) {
                commonWidthIn = widthIn;
                commonHeightIn = heightIn;
            }
            pageDiv.style.setProperty("--ri-print-width", widthIn + "in");
            // A tiny (imperceptible, ~0.25mm) reduction here — not in the @page size
            // itself, which stays exactly correct — so that per-element pixel rounding
            // across many stacked full-page boxes can never accumulate into spilling
            // onto a trailing blank extra page (this was happening: 8 pages x a
            // fraction of a rounded-up px each summed to a few px too many).
            pageDiv.style.setProperty("--ri-print-height", (heightIn - 0.05) + "in");
            pageDiv.style.aspectRatio = entry.widthPt + " / " + entry.heightPt;
            entry.canvas.style.width = "100%";
            entry.canvas.style.height = "100%";
            pageDiv.appendChild(entry.canvas);
        }
        var label = document.createElement("span");
        label.className = "ri-page-label noprint";
        label.textContent = "Page " + i + " / " + N;
        pageDiv.appendChild(label);
        grid.appendChild(pageDiv);
    }
    setReverseImposePageSize(commonWidthIn, commonHeightIn);
    var footerEl = document.getElementById("preview-footer");
    if(footerEl) {
        footerEl.textContent = "Reverse Impose \u00b7 " + N + " sequential page(s) reconstructed";
    }
}
