// The options panel: tabs, size buttons, paper presets, and reading every option into state (refreshSpecs).

import { logCmd, logResult } from "./activityLog.js";
import { selectFile } from "./loadPdf.js";
import { setReverseImposePageSize } from "./print.js";
import { SIZE_12TH, SIZE_16TH, SIZE_24TH, SIZE_32ND, SIZE_36TH, SIZE_48TH, SIZE_64TH, SIZE_CHARS, SIZE_EIGHTH, SIZE_HALF, SIZE_QUARTER } from "./sizes.js";
import { state } from "./state.js";

export function switchOptionsTab(tab) {
    var basicTab = document.getElementById("tab-basic");
    var advTab = document.getElementById("tab-advanced");
    var basicContent = document.getElementById("tab-content-basic");
    var advContent = document.getElementById("tab-content-advanced");
    if(tab === "advanced") {
        advTab.classList.add("active");
        basicTab.classList.remove("active");
        advContent.style.display = "flex";
        basicContent.style.display = "none";
    } else {
        basicTab.classList.add("active");
        advTab.classList.remove("active");
        basicContent.style.display = "flex";
        advContent.style.display = "none";
    }
}

export function toggleMoreSizes() {
    if(state.showExtraSizes) {
        document.getElementById("extra-sizes").style.display = "none";
        document.getElementById("extra-sizes-button").innerHTML = "More Sizes";
        state.showExtraSizes = false;
    } else {
        document.getElementById("extra-sizes").style.display = "inline";
        document.getElementById("extra-sizes-button").innerHTML = "Fewer Sizes";
        state.showExtraSizes = true;
    }
}

export function selectEighthSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function selectQuarterSize() {
    document.getElementById("dx-double").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function selectHalfSize() {
    document.getElementById("dx-double").checked = true;
    document.getElementById("spine-side").checked = document.getElementById("ori-portrait").checked;
    refreshSpecs();
}

export function select12thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function select16thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function select24thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function select32ndSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function select36thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function select48thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function select64thSize() {
    document.getElementById("dx-single").checked = true;
    document.getElementById("ori-portrait").checked = true;
    document.getElementById("spine-side").checked = true;
    refreshSpecs();
}

export function setPageUSLetter() {
    document.getElementById("page-inches").checked = true;
    document.getElementById("rt-width").value = "8.5";
    document.getElementById("rt-height").value = "11";
    refreshSpecs();
}

export function setPage11_17() {
    document.getElementById("page-inches").checked = true;
    document.getElementById("rt-width").value = "11";
    document.getElementById("rt-height").value = "17";
    refreshSpecs();
}

export function setPageA4() {
    document.getElementById("page-mm").checked = true;
    document.getElementById("rt-width").value = "210";
    document.getElementById("rt-height").value = "297";
    refreshSpecs();
}

export function setPageA3() {
    document.getElementById("page-mm").checked = true;
    document.getElementById("rt-width").value = "297";
    document.getElementById("rt-height").value = "420";
    refreshSpecs();
}

// refreshes all parameters
export function refreshSpecs() {
    logCmd("refreshSpecs()");
    // poll main layout options
    if(document.getElementById("zs-half").checked) {
        state.size = SIZE_HALF;
    } else if(document.getElementById("zs-qtr").checked) {
        state.size = SIZE_QUARTER;
    } else if(document.getElementById("zs-eighth").checked) {
        state.size = SIZE_EIGHTH;
    } else if(document.getElementById("zs-twlv").checked) {
        state.size = SIZE_12TH;
    } else if(document.getElementById("zs-sxtn").checked) {
        state.size = SIZE_16TH;
    } else if(document.getElementById("zs-twfr").checked) {
        state.size = SIZE_24TH;
    } else if(document.getElementById("zs-thtw").checked) {
        state.size = SIZE_32ND;
    } else if(document.getElementById("zs-thsx").checked) {
        state.size = SIZE_36TH;
    } else if(document.getElementById("zs-frei").checked) {
        state.size = SIZE_48TH;
    } else if(document.getElementById("zs-sxfr").checked) {
        state.size = SIZE_64TH;
    }
    
    state.doubleSided = document.getElementById("dx-double").checked;
    state.zinePortrait = document.getElementById("ori-portrait").checked;
    state.spineSide = document.getElementById("spine-side").checked;
    state.flipBackCover = document.getElementById("flip-bc").checked;
    state.quarterCopy = document.getElementById("quarter-copy").checked;
    
    if(document.getElementById("cust-sig-size").checked) {
        document.getElementById("sig-size").style = "display:inline";
        document.getElementById("sig-size-label").style = "display:inline";
        state.sigSize = document.getElementById("sig-size").value;
    } else {
        document.getElementById("sig-size").style = "display:none";
        document.getElementById("sig-size-label").style = "display:none";
        state.sigSize = 0;
    }
    
    state.guideMargins = document.getElementById("guide-margin").checked;
    state.guideCenter = document.getElementById("guide-center").checked;
    state.guideFolds = document.getElementById("guide-folds").checked;
    
    // parse the "Insert Blank Pages" field into a list of PDF page numbers to insert blanks after
    // (a page number may be repeated to insert more than one blank after it)
    state.blankAfterPages = document.getElementById("blank-after-pages").value
        .split(",")
        .map(function(s) { return parseInt(s.trim(), 10); })
        .filter(function(n) { return !isNaN(n) && n > 0; });
    if(state.blankAfterPages.length > 0) {
        logResult("Manual blank pages requested after PDF page(s): " + state.blankAfterPages.join(", ") + ".");
    }

    // "Select Pages" — raw spec only; actual parsing happens in selectFile() once the
    // real PDF page count is known (needed to resolve open-ended / out-of-range values)
    state.pageRangeSpec = document.getElementById("page-range").value.trim();
    if(state.pageRangeSpec.length > 0) {
        logResult("Page range requested: \"" + state.pageRangeSpec + "\".");
    }
    
    state.specsString = SIZE_CHARS[state.size];
    
    if(state.doubleSided) {
        state.specsString = state.specsString + "2";
    } else {
        state.specsString = state.specsString + "1";
    }
    
    if(state.zinePortrait) {
        state.specsString = state.specsString + "p";
    } else {
        state.specsString = state.specsString + "l";
    }
    
    if(state.spineSide) {
        state.specsString = state.specsString + "s";
    } else {
        state.specsString = state.specsString + "t";
    }
    var foldingInsEl = document.getElementById("folding-ins");
    if(foldingInsEl) {
        foldingInsEl.innerHTML = "<a href=\"folding.html?" + state.specsString + "\">Folding Instructions</a>";
    }
    
    state.pgmult = 0
    
    
    // set the number of zine pages per sheet and the paper orientation (based on zine size & zine orientation)
    switch(state.size) {
        case SIZE_HALF:
            state.pgmult = 4;
            state.pagePortrait = !state.zinePortrait;
            if(state.zinePortrait) {
                state.divVert = 1;
                state.divHoriz = 2;
            } else {
                state.divVert = 2;
                state.divHoriz = 1;
            }
            break;
        case SIZE_QUARTER:
            if(state.doubleSided) {
                if(state.quarterCopy) {
                    state.pgmult = 4;
                } else {
                    state.pgmult = 8;
                }
            } else {
                state.pgmult = 4;
            }
            state.divVert = 2;
            state.divHoriz = 2;
            state.pagePortrait = state.zinePortrait;
            break;
        case SIZE_EIGHTH:
            if(state.doubleSided) {
                state.pgmult = 16;
            } else {
                state.pgmult = 8;
            }
            if(state.zinePortrait) {
                state.divVert = 2;
                state.divHoriz = 4;
            } else {
                state.divVert = 4;
                state.divHoriz = 2;
            }
            state.pagePortrait = !state.zinePortrait;
            break;
        case SIZE_12TH:
            if(state.doubleSided) {
                state.pgmult = 24;
            } else {
                state.pgmult = 12;
            }
            if(state.zinePortrait) {
                state.divVert = 2
                state.divHoriz = 6;
            } else {
                state.divVert = 6;
                state.divHoriz = 2;
            }
            state.pagePortrait = !state.zinePortrait;
            break;
        case SIZE_16TH:
            if(state.doubleSided) {
                state.pgmult = 32;
            } else {
                state.pgmult = 16;
            }
            state.divVert = 4;
            state.divHoriz = 4;
            state.pagePortrait = state.zinePortrait;
            break;
        case SIZE_24TH:
            if(state.doubleSided) {
                state.pgmult = 48;
            } else {
                state.pgmult = 24;
            }
            if(state.zinePortrait) {
                state.divVert = 4;
                state.divHoriz = 6;
            } else {
                state.divVert = 6;
                state.divHoriz = 4;
            }
            state.pagePortrait = !state.zinePortrait;
            break;
        case SIZE_32ND:
            if(state.doubleSided) {
                state.pgmult = 64;
            } else {
                state.pgmult = 32;
            }
            if(state.zinePortrait) {
                state.divVert = 4;
                state.divHoriz = 8;
            } else {
                state.divVert = 8;
                state.divHoriz = 4;
            }
            state.pagePortrait = !state.zinePortrait;
            break;
        case SIZE_36TH:
            if(state.doubleSided) {
                state.pgmult = 72;
            } else {
                state.pgmult = 36;
            }
            state.divVert = 6;
            state.divHoriz = 6;
            state.pagePortrait = state.zinePortrait;
            break;
        case SIZE_48TH:
            if(state.doubleSided) {
                state.pgmult = 96;
            } else {
                state.pgmult = 48;
            }
            if(state.zinePortrait) {
                state.divVert = 6;
                state.divHoriz = 8;
            } else {
                state.divVert = 8;
                state.divHoriz = 6;
            }
            state.pagePortrait = !state.zinePortrait;
            break;
        case SIZE_64TH:
            if(state.doubleSided) {
                state.pgmult = 128;
            } else {
                state.pgmult = 64;
            }
            state.divVert = 8;
            state.divHoriz = 8;
            state.pagePortrait = state.zinePortrait;
        default: // this better not happen!!!
            break;
    }
    
    var lblPcMultEl = document.getElementById("lbl-pc-mult");
    if(lblPcMultEl) {
        lblPcMultEl.innerHTML = "To avoid blank pages at the end, the page count should be a multiple of " + state.pgmult + ".";
    }
    document.getElementById("sig-size-label").innerHTML = "Sheets per signature (" + (state.pgmult * state.sigSize) + " zine pages/signature)";
    
    // update aspect ratio labels & poll aspect ratio values
    // this is based on the paper orientation
    if(state.pagePortrait) {
        document.getElementById("rt-width-label").innerHTML = "Width";
        document.getElementById("rt-height-label").innerHTML = "Height";
        
        state.aspectWidth = document.getElementById("rt-width").value;
        state.aspectHeight = document.getElementById("rt-height").value;
    } else {
        document.getElementById("rt-width-label").innerHTML = "Height";
        document.getElementById("rt-height-label").innerHTML = "Width";
        
        state.aspectWidth = document.getElementById("rt-height").value;
        state.aspectHeight = document.getElementById("rt-width").value;
    }
    
    // calculate the zine page aspect ratio
    state.pagerat = (state.aspectWidth / state.divHoriz) / (state.aspectHeight / state.divVert);

    // update the CSS dimensions
    var scl = state.aspectWidth;
    if(scl == 0) {
        scl = 1;
    }
    while(scl < 1000) {
        scl *= 2;
    }
    var scl = scl / state.aspectWidth; // frame width is 574; this is 550 x2 (will be scaled by 0.5 in CSS)
    scl = Math.floor(scl,1);
    
    state.sheetWidth = scl*state.aspectWidth;
    state.sheetHeight = scl*state.aspectHeight;
    
    
    state.pgunit = "in";
    
    if(document.getElementById("page-mm").checked) {
        state.pgunit = "mm";
    }
    
    state.pageWidth = Math.floor(state.sheetWidth / state.divHoriz);
    state.pageHeight = Math.floor(state.sheetHeight / state.divVert);
    
    
    var rt = document.querySelector(':root');
    rt.style.setProperty('--sheet-width', state.sheetWidth + "px");
    rt.style.setProperty('--sheet-height', state.sheetHeight + "px");
    rt.style.setProperty('--sheet-print-width', state.aspectWidth + state.pgunit);
    rt.style.setProperty('--sheet-print-height', state.aspectHeight + state.pgunit);
    rt.style.setProperty('--page-width', state.pageWidth + "px");
    rt.style.setProperty('--page-height', state.pageHeight + "px");
    rt.style.setProperty('--sheet-scale', (getPreviewTargetWidth() / state.sheetWidth));
    
    logResult("Layout settings updated (spec: " + state.specsString + ", " + (state.doubleSided ? "double" : "single") + "-sided).");
    selectFile(); // refresh the PDF if one has already been selected
}

// How wide (in px) the on-screen sheet preview should render, so it fills the
// available preview pane instead of always shrinking to a fixed 550px
// regardless of how much room is actually available.
export function getPreviewTargetWidth() {
    var pane = document.getElementById("workspace-preview-scroll");
    if(pane) {
        var paneWidth = pane.clientWidth;
        if(paneWidth > 0) {
            return Math.min(900, Math.max(200, paneWidth - 48)); // minus the pane's own 24px left/right padding, capped so it doesn't blow up huge on ultra-wide screens
        }
    }
    return 550; // fallback for before the pane has been laid out
}


// Shows/hides the cards that don't apply while de-imposing (everything about
// HOW to impose a fresh zine — Zine Size, Select Pages, Insert Blank Pages, and
// the whole Advanced tab), and disables the Advanced tab itself. Then reprocesses
// whatever file is currently loaded (if any) under the new mode.
export function toggleReverseImpose() {
    state.isReverseImposeActive = document.getElementById("reverse-impose-toggle").checked;
    logCmd("toggleReverseImpose()");

    var cardsToHide = [
        "opt-zinesize", "opt-page-range", "opt-blank-pages",
        "opt-duplex", "opt-orient", "opt-spine", "opt-extras",
        "opt-signatures", "opt-guides", "opt-ratio", "opt-page-presets"
    ];
    cardsToHide.forEach(function(id) {
        var el = document.getElementById(id);
        if(!el) return;
        if(state.isReverseImposeActive) {
            el.classList.add("ri-hidden");
            el.setAttribute("aria-hidden", "true");
        } else {
            el.classList.remove("ri-hidden");
            el.removeAttribute("aria-hidden");
        }
    });

    var advTab = document.getElementById("tab-advanced");
    if(state.isReverseImposeActive) {
        if(advTab.classList.contains("active")) {
            switchOptionsTab("basic"); // the Advanced tab is about to be disabled — back out of it first if it's open
        }
        advTab.setAttribute("disabled", "true");
    } else {
        advTab.removeAttribute("disabled");
        setReverseImposePageSize(null, null); // clear the custom @page size override — normal zine printing uses the user's own paper-size selection instead
    }

    logResult(state.isReverseImposeActive
        ? "Reverse Impose enabled — normal imposition controls hidden; the Advanced tab is disabled."
        : "Reverse Impose disabled — normal imposition controls restored.");

    selectFile(); // reprocess the current file (if any) under the new mode
}
