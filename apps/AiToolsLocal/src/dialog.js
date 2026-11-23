// A small "are you sure" pop-up (Cancel / OK). Resolves true on OK. Escape or a press outside cancels.

export function confirmDialog({ title, points, ok = "OK", cancel = "Cancel" }) {
  return new Promise((resolve) => {
    const back = document.createElement("div"); back.className = "dlg-backdrop";
    const box = document.createElement("div"); box.className = "dlg"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", title);
    const h = document.createElement("div"); h.className = "dlg-title"; h.textContent = title;
    const ul = document.createElement("ul"); ul.className = "dlg-points";
    for (const p of points) { const li = document.createElement("li"); if (typeof p === "string") li.textContent = p; else li.append(p); ul.append(li); }
    const row = document.createElement("div"); row.className = "dlg-actions";
    const no = document.createElement("button"); no.type = "button"; no.textContent = cancel;
    const yes = document.createElement("button"); yes.type = "button"; yes.className = "btn-solid"; yes.textContent = ok;
    row.append(no, yes); box.append(h, ul, row); back.append(box); document.body.append(back);
    const done = (v) => { document.removeEventListener("keydown", onKey, true); back.remove(); resolve(v); };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
    document.addEventListener("keydown", onKey, true);
    no.addEventListener("click", () => done(false));
    yes.addEventListener("click", () => done(true));
    back.addEventListener("pointerdown", (e) => { if (e.target === back) done(false); });
    yes.focus();
  });
}

// "<b>text</b>" pieces without innerHTML: [["plain "], ["bold", true], [" more"]] -> a span.
export function rich(parts) {
  const s = document.createElement("span");
  for (const [text, bold] of parts) { if (bold) { const b = document.createElement("b"); b.textContent = text; s.append(b); } else s.append(text); }
  return s;
}
