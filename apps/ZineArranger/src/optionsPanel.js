// The options panel: tabs, size buttons, paper presets, the Reverse Impose toggle, and refreshSpecs (re-reads options and re-lays out).

import { logCmd, logResult } from "./activityLog.js";
import { selectFile } from "./loadPdf.js";
import { readOptionsIntoState, updateSpecString } from "./readOptions.js";
import { sheetGrid } from "./sheetGrid.js";
import { applySheetSizes, updateSheetLabels } from "./sheetSizes.js";
import { setReverseImposePageSize } from "./print.js";
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

// Re-reads every option, recomputes the layout, and re-lays out the loaded PDF (if any).
export function refreshSpecs() {
    logCmd("refreshSpecs()");
    readOptionsIntoState();
    updateSpecString();
    // set the number of zine pages per sheet and the paper orientation (based on zine size & zine orientation)
    Object.assign(state, sheetGrid(state));
    updateSheetLabels();
    applySheetSizes();
    logResult("Layout settings updated (spec: " + state.specsString + ", " + (state.doubleSided ? "double" : "single") + "-sided).");
    selectFile(); // refresh the PDF if one has already been selected
}

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
