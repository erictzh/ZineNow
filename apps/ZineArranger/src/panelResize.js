// The draggable line between the preview and the settings panel: drag it to make the panel wider or
// narrower, double-click it (or press Home) to go back to the default width. The width is remembered
// for next time. The panel's width is the CSS variable --md2ebook-sidebar-width (style.css).

const STORAGE_KEY = "zinearranger.settingsPanelWidth";
const MIN_PANEL = 280; // px: narrow enough to still read the settings
const MIN_PREVIEW = 320; // px: the preview always keeps at least this much room
const KEY_STEP = 16;

export function setUpPanelResize() {
    var handle = document.getElementById("workspace-resizer");
    var body = document.querySelector(".workspace");
    var panel = document.getElementById("workspace-panel");
    if(!handle || !body || !panel) return;
    var root = document.documentElement;
    var current = null; // px, or null while it's the default (40vw)

    // The panel's width kept between its minimum and what leaves the preview its room.
    function clamp(px) {
        var most = Math.max(MIN_PANEL, body.getBoundingClientRect().width - MIN_PREVIEW);
        return Math.round(Math.min(most, Math.max(MIN_PANEL, px)));
    }

    // Tells the preview to refit itself to its new width: main.js already does this on window resize.
    function refitPreview() {
        window.dispatchEvent(new Event("resize"));
    }

    function apply(px, save) {
        if(px == null) {
            current = null;
            root.style.removeProperty("--md2ebook-sidebar-width");
            try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
        } else {
            current = clamp(px);
            root.style.setProperty("--md2ebook-sidebar-width", current + "px");
            if(save) { try { localStorage.setItem(STORAGE_KEY, String(current)); } catch(e) {} }
        }
        refitPreview();
    }

    function panelWidth() {
        return panel.getBoundingClientRect().width;
    }

    // Dragging: the panel sits at the right, so its width is the distance from the pointer to the right edge.
    handle.addEventListener("pointerdown", function(e) {
        if(e.button !== 0) return;
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        handle.classList.add("is-dragging");
        document.body.style.userSelect = "none";
    });
    handle.addEventListener("pointermove", function(e) {
        if(!handle.hasPointerCapture(e.pointerId)) return;
        apply(body.getBoundingClientRect().right - e.clientX, false);
    });
    function endDrag(e) {
        if(!handle.hasPointerCapture(e.pointerId)) return;
        handle.releasePointerCapture(e.pointerId);
        handle.classList.remove("is-dragging");
        document.body.style.userSelect = "";
        if(current != null) { try { localStorage.setItem(STORAGE_KEY, String(current)); } catch(err) {} }
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    handle.addEventListener("dblclick", function() { apply(null); });

    // From the keyboard: the arrows nudge it, Home resets it.
    handle.addEventListener("keydown", function(e) {
        if(e.key === "ArrowLeft") { e.preventDefault(); apply(panelWidth() + KEY_STEP, true); }
        else if(e.key === "ArrowRight") { e.preventDefault(); apply(panelWidth() - KEY_STEP, true); }
        else if(e.key === "Home") { e.preventDefault(); apply(null); }
    });

    // A saved width is used again, and a smaller window pulls the panel in so the preview keeps its room.
    var saved = null;
    try { saved = parseInt(localStorage.getItem(STORAGE_KEY), 10); } catch(e) {}
    if(saved > 0) apply(saved, false);
    window.addEventListener("resize", function() {
        if(current != null && clamp(current) !== current) {
            current = clamp(current);
            root.style.setProperty("--md2ebook-sidebar-width", current + "px");
        }
    });
}
