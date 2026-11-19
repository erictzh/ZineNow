// Works out the on-screen sheet and page sizes from the paper size and grid, and sets the CSS variables the preview and print use.

import { applyPreviewScale } from "./previewZoom.js";
import { state } from "./state.js";

// Labels that depend on pages per sheet.
export function updateSheetLabels() {
    var lblPcMultEl = document.getElementById("lbl-pc-mult");
    if(lblPcMultEl) {
        lblPcMultEl.innerHTML = "To avoid blank pages at the end, the page count should be a multiple of " + state.pgmult + ".";
    }
    document.getElementById("sig-size-label").innerHTML = "Sheets per signature (" + (state.pgmult * state.sigSize) + " zine pages/signature)";
}

export function applySheetSizes() {
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
    applyPreviewScale(); // --sheet-scale, from the preview's zoom (previewZoom.js)
}


// Shows/hides the cards that don't apply while de-imposing (everything about
// HOW to impose a fresh zine — Zine Size, Select Pages, Insert Blank Pages, and
// the whole Advanced tab), and disables the Advanced tab itself. Then reprocesses
// whatever file is currently loaded (if any) under the new mode.
