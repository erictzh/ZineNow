// Loads the chosen PDF and draws each page into its cell on the laid-out sheets.

import { logCmd, logResult, logSys } from "./activityLog.js";
import { arrangeZineSheets } from "./imposition/arrangeZineSheets.js";
import { parsePageRange } from "./pageRange.js";
import { applyPreviewScale, setPreviewInfo } from "./previewZoom.js";
import { renderReverseImposeGrid, reverseImposePdf } from "./reverseImpose.js";
import { SIZE_QUARTER } from "./sizes.js";
import { state } from "./state.js";

export function selectFile() {
    logCmd("selectFile()");
    if(document.getElementById("selector").files.length > 0) {
        document.getElementById("zine-scale").innerHTML = ""; // clear out existing zine field to prevent weirdness hopefully
        document.getElementById("reverse-impose-grid").innerHTML = "";
        document.getElementById("preview-empty").style.display = "none";
        if(state.isReverseImposeActive) {
            document.getElementById("zine").style.display = "none";
            document.getElementById("reverse-impose-grid").style.display = "flex";
        } else {
            document.getElementById("zine").style.display = "block";
            document.getElementById("reverse-impose-grid").style.display = "none";
        }
        var fl = document.getElementById("selector").files[0];
        logResult("PDF selected: \"" + fl.name + "\" (" + Math.round(fl.size/1024) + " KB). Loading...");
        var nms = fl.name.split(".");
        if(nms.length > 1) {
            document.title = nms[0] + "-Printable." + nms[1];
        } else {
            document.title = fl.name + "-Printable.pdf";
        }
        var url = URL.createObjectURL(fl);
        
        logCmd("pdfjsLib.getDocument(url)");
        const loadingTask = pdfjsLib.getDocument(url);
        (async () => {
            const pdf = await loadingTask.promise;
            
            var actualPageCount = pdf.numPages;
            logResult("PDF loaded — " + actualPageCount + " page(s) detected.");

            if(state.isReverseImposeActive) {
                logCmd("reverseImposePdf()");
                var resultPages = await reverseImposePdf(pdf, actualPageCount);
                if(resultPages) {
                    renderReverseImposeGrid(resultPages, resultPages.length - 1);
                    logResult("Done — de-imposed layout ready to print.");
                }
                return;
            }

            // "Select Pages" — resolve the raw spec against the real page count now
            // that we know it. null/no valid tokens means "use every page".
            var selectedPages = parsePageRange(state.pageRangeSpec, actualPageCount);
            if(selectedPages) {
                logResult("Using " + selectedPages.length + " of " + actualPageCount + " page(s): " + selectedPages.join(", ") + ".");
            } else {
                selectedPages = [];
                for(var sp = 1; sp <= actualPageCount; sp++) selectedPages.push(sp);
            }
            
            // Build a mapping from PDF page number (1-indexed) to zine canvas slot (0-indexed),
            // leaving a gap in the slot numbering everywhere the user asked for a manual blank page.
            // A page number listed more than once in blankAfterPages leaves more than one gap.
            // Only walks selectedPages, not every PDF page — an excluded page never gets a slot
            // (and any "blank after N" rule for an excluded N simply has nothing to attach to).
            var blankCounts = {};
            state.blankAfterPages.forEach(function(p) {
                blankCounts[p] = (blankCounts[p] || 0) + 1;
            });
            var pdfPageToSlot = new Array(actualPageCount + 1);
            var slotCursor = 0;
            selectedPages.forEach(function(pn) {
                pdfPageToSlot[pn] = slotCursor;
                slotCursor += 1 + (blankCounts[pn] || 0);
            });
            var contentPageCount = slotCursor; // selected pages + manually inserted blanks
            
            // We'll do some special handling for double-sided zines when their page count is a multiple of 4 but not a multiple of the full sheet count.
            // Single sided zines get blank pages at the end, which is easy, but for this situation, we want to put them directly in the middle
            // That way the blank pages will all be at the bottom of the sheet/sheets & can be discarded after printing.
            // (Skipped whenever manual blank pages are in use, since the user is already placing blanks by hand.)
            var needsMidBump = (state.blankAfterPages.length == 0) && (state.doubleSided && selectedPages.length%4 == 0 && selectedPages.length % state.pgmult != 0); // whether we need to do special blank page handling
            var midBumper = 0; // if we need to insert blank pages into the middle, this will 'bump' the page count up by the blank page count part way through
            state.pageCount = contentPageCount;
            logCmd("arrangeZineSheets()");
            arrangeZineSheets(); // this will increase pageCount to a multiple of pgmult
            applyPreviewScale(); // size the box around the new sheets (previewZoom.js)
            var blankPages = state.pageCount - contentPageCount; // additional auto-padding blanks tacked on beyond any manual ones
            if(blankPages > 0) {
                logResult("Auto-padding with " + blankPages + " blank page(s) to reach a multiple of " + state.pgmult + (needsMidBump ? ", placed mid-sheet for double-sided folding." : "."));
            }
            logResult("Total zine layout: " + state.pageCount + " page slot(s) across " + (state.pageCount / state.pgmult) + " sheet(s).");
            // The zoom is shown by the footer's own controls (previewZoom.js), next to this.
            setPreviewInfo(state.aspectWidth + state.pgunit + " \u00d7 " + state.aspectHeight + state.pgunit + " \u00b7 " + (state.pageCount / state.pgmult) + " sheet(s), " + state.pageCount + " pages");
            //
            // Fetch the first page
            //
            for(var selIdx = 0; selIdx < selectedPages.length; selIdx++) {
                var i = selectedPages[selIdx];
                const page = await pdf.getPage(i);
                var viewport = page.getViewport({ scale: 1 });
                var scale;
                //console.log("VPW: " + viewport.width + " || VPH: " + viewport.height + " || pagrat: " + pagerat + " || pageWidth: " + pageWidth + " || pageHeight: " + pageHeight);
                if(viewport.width / viewport.height >= state.pagerat) {
                    scale = state.pageWidth / viewport.width;
                } else {
                    scale = state.pageHeight / viewport.height;
                }
                //const scale = 72 / 4 * 11 / viewport.width;
                viewport = page.getViewport({ scale: scale });
                
                const outputScale = 3;

                // for double-sided zines with inserted blank pages — compares against
                // POSITION within selectedPages (1-indexed), not the raw PDF page number,
                // since a page range can skip numbers
                if(needsMidBump && (selIdx + 1) == ((state.pageCount-blankPages)/2+1)) {
                    midBumper = blankPages;
                }
                var slotIndex = pdfPageToSlot[i] + midBumper;
                logCmd("renderPage(" + i + ")");
                logResult((selIdx + 1) + "/" + selectedPages.length + " (PDF page " + i + ") \u2192 zine slot " + slotIndex + (state.size == SIZE_QUARTER && state.quarterCopy ? " (+ copy)" : "") + ".");
                //
                // Prepare canvas using PDF page dimensions
                //
                const canvas = document.getElementById("p" + slotIndex);
                const context = canvas.getContext("2d");

                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                canvas.style.width = Math.floor(viewport.width) + "px";
                canvas.style.height = Math.floor(viewport.height) + "px";

                const transform = outputScale !== 1
                  ? [outputScale, 0, 0, outputScale, 0, 0] 
                  : null;

                //
                // Render PDF page into canvas context
                //
                const renderContext = {
                  canvasContext: context,
                  transform,
                  viewport,
                  /*background: 'rgba(0,0,0,0)',*/
                };
                const renderTask = page.render(renderContext);
                
                // If we are doing Quarter-Sized copy mode, prepare canvases for pXb pages
                if(state.size == SIZE_QUARTER && state.quarterCopy) {
                    const ready = await renderTask.promise;
                    
                    const pageB = await pdf.getPage(i);
                    var viewportB = page.getViewport({ scale: scale });
                    
                    //
                    // Prepare canvas using PDF page dimensions
                    //
                    const canvasB = document.getElementById("p" + slotIndex + "b");
                    const contextB = canvasB.getContext("2d");

                    canvasB.width = Math.floor(viewportB.width * outputScale);
                    canvasB.height = Math.floor(viewportB.height * outputScale);
                    canvasB.style.width = Math.floor(viewport.width) + "px";
                    canvasB.style.height = Math.floor(viewport.height) + "px";

                    //
                    // Render PDF page into canvas context
                    //
                    const renderContextB = {
                      canvasContext: contextB,
                      transform,
                      viewport,
                    };
                    page.render(renderContextB);
                }
            }
            logSys("Done — zine layout ready to print.");
      })();
    }
}
