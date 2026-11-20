// The ⓘ next to the title: a tap or click shows "Originally by Nash High" in a small pop-up under
// it (the credit to the original Zine Arranger; LICENSE and README.md have the details). It stays
// in the app on purpose: a link would open a new window, which on a tablet covers the app.
// Another tap on the ⓘ, a tap anywhere else, or Escape closes it.

export function setUpCredit() {
    var button = document.getElementById("za-credit");
    var pop = document.getElementById("za-credit-pop");
    if (!button || !pop) return;

    function setOpen(open) {
        pop.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        if (!open) return;
        // Under the icon, kept inside the window. Fixed, because the title clips what overflows it.
        var r = button.getBoundingClientRect();
        var left = Math.min(r.left, window.innerWidth - pop.offsetWidth - 8);
        pop.style.left = Math.max(8, left) + "px";
        pop.style.top = (r.bottom + 6) + "px";
    }

    button.addEventListener("click", function () { setOpen(pop.hidden); });
    document.addEventListener("pointerdown", function (e) {
        if (!pop.hidden && !button.contains(e.target) && !pop.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) setOpen(false); });
    window.addEventListener("resize", function () { if (!pop.hidden) setOpen(false); });
}
