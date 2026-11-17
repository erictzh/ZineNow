// Reads every option from the form into state, and the short spec string ("8-1ps") that names the layout.

import { logResult } from "./activityLog.js";
import { SIZE_12TH, SIZE_16TH, SIZE_24TH, SIZE_32ND, SIZE_36TH, SIZE_48TH, SIZE_64TH, SIZE_CHARS, SIZE_EIGHTH, SIZE_HALF, SIZE_QUARTER } from "./sizes.js";
import { state } from "./state.js";

export function readOptionsIntoState() {
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
}

// e.g. "8-1ps": size, 1/2-sided, portrait/landscape, side/top spine.
export function updateSpecString() {
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
}
