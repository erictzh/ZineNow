/* ==========================================================================
   ZineNow — app launcher dashboard (static-config edition)
   --------------------------------------------------------------------------
   Everything the dashboard needs to render — folder name, description,
   readme text — comes straight from window.ZINENOW_APPS, declared in
   config/apps-config.js and loaded via a plain <script> tag. No fetch(), no
   File System Access API, no permission prompts: script tags, <img> tags,
   and plain navigation (window.open with a relative URL) all work fine on
   file:// pages, so that's all this uses.

   Trade-off: since nothing reads the disk at runtime, there's no live
   validation that a folder or its index.html actually exists. A typo in
   apps-config.js just means that card fails to open when clicked — fix the
   entry and refresh.

   Adding/removing/reordering apps means hand-editing apps-config.js. The
   "+" button only generates a ready-to-paste snippet; it doesn't write
   anything.
   ========================================================================== */

(() => {
  "use strict";

  const APPS_DIR = "apps";
  const apps = Array.isArray(window.ZINENOW_APPS) ? window.ZINENOW_APPS : [];

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const overlay = $("overlay");

  let sidebarOpen = false;
  let addModalOpen = false;

  // ------------------------------------------------------------------
  // Tiny offline markdown -> HTML parser (headers, bold, italic, links,
  // inline code, lists, paragraphs). Deliberately not exhaustive.
  // ------------------------------------------------------------------
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function inlineMd(s) {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  function markdownToHtml(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let listType = null;

    const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) { closeList(); continue; }

      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { closeList(); const lvl = h[1].length; out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`); continue; }

      const ul = line.match(/^[-*]\s+(.*)$/);
      if (ul) { if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul"; } out.push(`<li>${inlineMd(ul[1])}</li>`); continue; }

      const ol = line.match(/^\d+\.\s+(.*)$/);
      if (ol) { if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol"; } out.push(`<li>${inlineMd(ol[1])}</li>`); continue; }

      closeList();
      out.push(`<p>${inlineMd(line)}</p>`);
    }
    closeList();
    return out.join("\n");
  }

  // ------------------------------------------------------------------
  // Rendering.
  // ------------------------------------------------------------------
  function letterMark(folder) {
    const clean = folder.replace(/[-_]+/g, " ").trim();
    const parts = clean.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  function badge(folder) {
    const b = document.createElement("div");
    b.className = "app-badge";
    b.textContent = letterMark(folder);
    return b;
  }

  // Only one card menu open at a time.
  function closeAllCardMenus(except) {
    grid.querySelectorAll(".app-card-menu").forEach((m) => {
      if (m !== except) m.hidden = true;
    });
  }

  function buildCard(entry) {
    const folder = entry.folder;
    const card = document.createElement("div");
    card.className = "app-card";
    card.dataset.folder = folder;

    // -- identity row: icon + title inline --------------------------------
    const row = document.createElement("div");
    row.className = "app-card-row";

    // Plain relative <img src> — a normal resource load, not fetch(), so it
    // works on file:// with no permission needed. Falls back to a letter
    // badge if the file isn't there.
    const img = document.createElement("img");
    img.className = "app-logo";
    img.src = `${APPS_DIR}/${folder}/app-logo.png`;
    img.alt = "";
    img.onerror = () => { img.replaceWith(badge(folder)); };
    row.appendChild(img);

    const title = document.createElement("div");
    title.className = "app-card-title";
    title.textContent = folder;
    row.appendChild(title);

    const desc = document.createElement("div");
    desc.className = "app-card-desc";
    desc.textContent = entry.desc || folder;

    const divider = document.createElement("div");
    divider.className = "app-card-divider";

    // -- footer: explicit Open action + overflow menu ----------------------
    const footer = document.createElement("div");
    footer.className = "app-card-footer";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "app-card-open btn-solid";
    openBtn.textContent = "Open";
    // Plain relative navigation — also unaffected by file://'s fetch
    // restriction, so opening the app needs no permission either.
    openBtn.addEventListener("click", () => {
      window.open(`${APPS_DIR}/${folder}/index.html`, "_blank");
    });

    const menuWrap = document.createElement("div");
    menuWrap.className = "app-card-menu-wrap";

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "app-card-menu-btn";
    menuBtn.title = "More";
    menuBtn.setAttribute("aria-label", "More");
    menuBtn.textContent = "\u22ef";

    const menu = document.createElement("div");
    menu.className = "app-card-menu";
    menu.hidden = true;

    const aboutItem = document.createElement("button");
    aboutItem.type = "button";
    aboutItem.className = "app-card-menu-item";
    aboutItem.textContent = "About";
    aboutItem.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden = true;
      openReadme(entry);
    });
    menu.appendChild(aboutItem);

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      closeAllCardMenus();
      menu.hidden = !willOpen;
    });

    menuWrap.appendChild(menuBtn);
    menuWrap.appendChild(menu);
    footer.appendChild(openBtn);
    footer.appendChild(menuWrap);

    card.appendChild(row);
    card.appendChild(desc);
    card.appendChild(divider);
    card.appendChild(footer);

    return card;
  }

  function renderGrid() {
    grid.innerHTML = "";

    if (apps.length === 0) {
      const empty = document.createElement("div");
      empty.className = "zn-empty";
      empty.textContent = "No apps yet — click + to generate an entry for config/apps-config.js.";
      grid.appendChild(empty);
      return;
    }

    apps
      .filter((e) => e && e.folder)
      .forEach((entry) => grid.appendChild(buildCard(entry)));
  }

  // ------------------------------------------------------------------
  // Readme sidebar — reads straight from the config entry, no disk access.
  // ------------------------------------------------------------------
  const sidebar = $("sidebar");
  const sidebarTitle = $("sidebar-title");
  const sidebarBody = $("sidebar-body");

  function openReadme(entry) {
    sidebarTitle.textContent = entry.folder;
    if (entry.readme && entry.readme.trim()) {
      sidebarBody.innerHTML = markdownToHtml(entry.readme);
    } else {
      sidebarBody.innerHTML = "";
      const p = document.createElement("div");
      p.className = "zn-sidebar-empty";
      p.textContent = "No readme provided for this app.";
      sidebarBody.appendChild(p);
    }
    openOverlayPanel("sidebar");
  }

  $("sidebar-close").addEventListener("click", closeAllPanels);

  // ------------------------------------------------------------------
  // Overlay plumbing shared by sidebar + the snippet modal.
  // ------------------------------------------------------------------
  function openOverlayPanel(which) {
    overlay.classList.add("is-open");
    if (which === "sidebar") { sidebar.classList.add("is-open"); sidebarOpen = true; }
    if (which === "add") { $("add-modal").classList.add("is-open"); addModalOpen = true; }
  }

  function closeAllPanels() {
    overlay.classList.remove("is-open");
    sidebar.classList.remove("is-open");
    $("add-modal").classList.remove("is-open");
    sidebarOpen = addModalOpen = false;
  }

  overlay.addEventListener("click", closeAllPanels);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && (sidebarOpen || addModalOpen)) closeAllPanels();
    if (e.key === "Escape") closeAllCardMenus();
  });
  document.addEventListener("click", () => closeAllCardMenus());

  // ------------------------------------------------------------------
  // "+" snippet generator — formats a ready-to-paste JS object. Writes
  // nothing; the user pastes it into config/apps-config.js themselves.
  // ------------------------------------------------------------------
  const addFolderInput = $("add-folder-input");
  const addDescInput = $("add-desc-input");
  const addReadmeInput = $("add-readme-input");
  const addHint = $("add-hint");
  const addSnippet = $("add-snippet");
  const addCopyBtn = $("add-copy");

  function jsStringLiteral(s) {
    return JSON.stringify(s);
  }

  function buildSnippet() {
    const folder = addFolderInput.value.trim();
    if (!folder) {
      addHint.textContent = "Fill in a folder name to generate the snippet.";
      addHint.className = "zn-modal-hint";
      addSnippet.style.display = "none";
      addCopyBtn.disabled = true;
      return;
    }

    const desc = addDescInput.value.trim();
    const readme = addReadmeInput.value;

    const lines = ["  {", `    folder: ${jsStringLiteral(folder)},`];
    if (desc) lines.push(`    desc: ${jsStringLiteral(desc)},`);
    if (readme.trim()) {
      lines.push("    readme: `" + readme.replace(/`/g, "\\`") + "`,");
    }
    lines.push("  },");

    addSnippet.textContent = lines.join("\n");
    addSnippet.style.display = "block";
    addCopyBtn.disabled = false;
    addHint.textContent = `Paste this inside the ZINENOW_APPS array in config/apps-config.js, matching the real folder name apps/${folder}/ exactly (case-sensitive), then refresh the page.`;
    addHint.className = "zn-modal-hint is-ok";
  }

  $("fab-add").addEventListener("click", () => {
    addFolderInput.value = "";
    addDescInput.value = "";
    addReadmeInput.value = "";
    addSnippet.style.display = "none";
    addCopyBtn.disabled = true;
    addHint.textContent = "Fill in a folder name to generate the snippet.";
    addHint.className = "zn-modal-hint";
    openOverlayPanel("add");
    setTimeout(() => addFolderInput.focus(), 50);
  });

  $("add-cancel").addEventListener("click", closeAllPanels);
  addFolderInput.addEventListener("input", buildSnippet);
  addDescInput.addEventListener("input", buildSnippet);
  addReadmeInput.addEventListener("input", buildSnippet);

  addCopyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(addSnippet.textContent);
      showToast("Snippet copied.");
    } catch {
      showToast("Couldn't copy automatically — select the text and copy manually.");
    }
  });

  // ------------------------------------------------------------------
  // Toast.
  // ------------------------------------------------------------------
  let toastTimer = null;
  function showToast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-visible"), 3000);
  }

  renderGrid();
})();
