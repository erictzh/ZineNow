// ZineArranger entry point: startup, the ZEditor hand-off, and the functions index.html's
// onclick/onchange attributes call. The code lives in the files next to this one —
// see docs/ARCHITECTURE.md for what goes where.

import { clearLog, copyLog, logSys, toggleLogPanel } from "./activityLog.js";
import { getPreviewTargetWidth, refreshSpecs, select12thSize, select16thSize, select24thSize, select32ndSize, select36thSize, select48thSize, select64thSize, selectEighthSize, selectHalfSize, selectQuarterSize, setPage11_17, setPageA3, setPageA4, setPageUSLetter, switchOptionsTab, toggleMoreSizes, toggleReverseImpose } from "./optionsPanel.js";
import { state } from "./state.js";
import { triggerPrint } from "./print.js";

logSys("Zine Arranger ready. Select a PDF to begin.");

// Keep the preview filling its column as the window is resized (refreshSpecs()
// only reruns on option changes, not on resize).
window.addEventListener("resize", function() {
    clearTimeout(state.previewResizeTimer);
    state.previewResizeTimer = setTimeout(function() {
        document.querySelector(':root').style.setProperty('--sheet-scale', (getPreviewTargetWidth() / state.sheetWidth));
    }, 100);
});
        

document.getElementById("selector").addEventListener("change", refreshSpecs, false);
refreshSpecs();

// ---- ZEditor handoff --------------------------------------------------
// Lets ZEditor's "Send to ZineArranger" button skip the manual
// export-then-reopen round trip: it opens this app in a new tab via
// window.open(), waits for the "ready" postMessage below, then posts
// the exported PDF's bytes back. Received here by feeding them into
// the SAME #selector file input + change event a manual file pick
// already uses, so nothing about the normal load path changes.
(function setUpZEditorHandoff() {
    function receivePdf(file) {
        var input = document.getElementById("selector");
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    window.addEventListener("message", function (event) {
        var data = event.data;
        if (!data || data.type !== "zeditor-handoff-pdf" || !(data.buffer instanceof ArrayBuffer)) return;
        var file = new File([data.buffer], data.filename || "zine.pdf", { type: "application/pdf" });
        receivePdf(file);
        logSys("Received \"" + file.name + "\" from ZEditor (" + Math.round(file.size / 1024) + " KB).");
    });

    if (window.opener) {
        // Repeated rather than a single fire-and-forget ping: ZEditor
        // attaches its listener before doing anything else, so in
        // principle one ping right away is enough — but postMessage
        // doesn't queue for a listener that isn't there yet, so if
        // anything on either side delays that attachment, a single
        // ping arriving in the gap would be lost for good with no way
        // to recover. Repeating for a few seconds costs nothing (the
        // listener on the other end just resolves once and detaches)
        // and removes the failure mode entirely.
        var pingCount = 0;
        var pingInterval = setInterval(function () {
            pingCount++;
            try {
                window.opener.postMessage({ type: "zinearranger-ready" }, "*");
            } catch (err) {
                clearInterval(pingInterval); // opener gone or unreachable — this tab still works standalone
            }
            if (pingCount >= 15) clearInterval(pingInterval); // ~7.5s at 500ms apart
        }, 500);
    }
})();

// index.html calls these from onclick/onchange attributes, which only see globals.
Object.assign(window, { clearLog, copyLog, refreshSpecs, select12thSize, select16thSize, select24thSize, select32ndSize, select36thSize, select48thSize, select64thSize, selectEighthSize, selectHalfSize, selectQuarterSize, setPage11_17, setPageA3, setPageA4, setPageUSLetter, switchOptionsTab, toggleLogPanel, toggleMoreSizes, toggleReverseImpose, triggerPrint });
