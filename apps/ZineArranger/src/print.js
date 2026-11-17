// Printing: the print button, and the @page orientation / size rules the printed sheets need.

import { logCmd, logResult } from "./activityLog.js";

export function triggerPrint() {
    logCmd("triggerPrint()");
    logResult("Opening the browser print dialog...");
    window.print();
}

// Populates #reverse-impose-grid with the reconstructed sequential pages —
// a plain wrapped grid in reading order (unlike .zine's folded/imposed
// layout), since the whole point of this mode is that the result is an
// ordinary document again, not something meant to be folded.
// Sizing the .reverse-impose-page elements themselves (via --ri-print-width/
// height above) only controls how much of the PAPER the content fills — it
// does NOT change what paper size the browser actually prints onto. Without
// this, the printer kept using whatever page size was last selected (e.g. A4),
// so the correctly-sized half-page content just sat in the corner of a much
// bigger sheet. This injects an explicit @page size override matching the
// real reconstructed page dimensions, so each printed sheet IS that size —
// e.g. an A5-ish portrait sheet, filled edge to edge, not a corner of A4.
// Cleared (see toggleReverseImpose()) when Reverse Impose is off, since the
// normal zine flow relies on the user's own paper-size selection instead.
export function setReverseImposePageSize(widthIn, heightIn) {
    var styleEl = document.getElementById("ri-page-size-style");
    if(!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "ri-page-size-style";
        document.head.appendChild(styleEl);
    }
    if(widthIn && heightIn) {
        styleEl.textContent = "@media print { @page { size: " + widthIn.toFixed(3) + "in " + heightIn.toFixed(3) + "in; margin: 0; } }";
        logResult("Print page size set to " + widthIn.toFixed(2) + "in \u00d7 " + heightIn.toFixed(2) + "in to match the de-imposed pages.");
    } else {
        styleEl.textContent = "";
    }
}

export function setPageOrientation(prt) {
    //document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: " + aspectWidth + pgunit + " " + aspectHeight + pgunit + "; } }";
    //document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: " + sheetWidth + "px " + sheetHeight + "px; } }";
    
    if(prt) {
        document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: portrait; } }";
    } else {
        document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: landscape; } }";
    }
    
    /*if(prt) {
        document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: " + sheetWidth + "px " + sheetHeight + "px; } }";
    } else {
        document.getElementById("page-orient-style").innerHTML = "@media print { @page { size: " + sheetHeight + "px " + sheetWidth + " px; } }";
    }*/
}
