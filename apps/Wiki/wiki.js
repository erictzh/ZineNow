// The wiki page: a sidebar of chapters, the article, search, previous/next. All the text comes from content.js (window.WIKI).
(function () {
  "use strict";
  var W = window.WIKI, $ = function (id) { return document.getElementById(id); };
  var flat = [];
  W.toc.forEach(function (c) { c.pages.forEach(function (p) { flat.push({ key: c.slug + "/" + p.slug, chapter: c, page: p }); }); });
  var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var written = function (key) { return !!W.pages[key]; };
  var query = "";

  function renderNav(active) {
    var nav = $("nav");
    if (query.length >= 2) { nav.innerHTML = searchHtml(); return; }
    nav.innerHTML = W.toc.map(function (c) {
      var open = active && active.chapter === c ? " open" : "";
      return "<details" + open + "><summary>" + esc(c.title) + "</summary>" + c.pages.map(function (p) {
        var key = c.slug + "/" + p.slug;
        var cls = (active && active.key === key ? "active" : "") + (written(key) ? "" : " soon");
        return '<a class="' + cls + '" href="#' + key + '">' + esc(p.title) + "</a>";
      }).join("") + "</details>";
    }).join("");
  }

  function searchHtml() {
    var q = query.toLowerCase(), words = q.split(/\s+/).filter(Boolean), hits = [];
    flat.forEach(function (f) {
      var rec = W.pages[f.key], title = f.page.title.toLowerCase(), text = rec ? rec.text.toLowerCase() : "";
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        if (title.indexOf(words[i]) >= 0) score += 10; else if (text.indexOf(words[i]) >= 0) score += 1; else { score = 0; break; }
      }
      if (score) hits.push({ f: f, score: score, at: text.indexOf(words[0]) });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    if (!hits.length) return '<div class="none">Nothing found for “' + esc(query) + "”.</div>";
    return hits.slice(0, 30).map(function (h) {
      var rec = W.pages[h.f.key], snip = "";
      if (rec && h.at >= 0) snip = "<small>…" + esc(rec.text.slice(Math.max(0, h.at - 40), h.at + 90)) + "…</small>";
      return '<a class="hit" href="#' + h.f.key + '">' + esc(h.f.page.title) + " <small>" + esc(h.f.chapter.title) + "</small>" + snip + "</a>";
    }).join("");
  }

  function home() {
    var done = Object.keys(W.pages).length;
    $("page").innerHTML = '<div class="wk-crumb">Tutorial / Wiki</div><h1>ZineNow Wiki</h1>' +
      "<p>A textbook for every tool on this site. Each page has four parts: <b>Intro</b> (what it is for), <b>How to use</b>, <b>How it works</b> (what the computer really does, with the proper names of the techniques) and <b>Code</b> (the real code behind it).</p>" +
      '<p class="wk-build">' + done + " of " + flat.length + " pages written so far · wiki build " + esc(W.build) + "</p>" +
      '<div class="wk-grid">' + W.toc.map(function (c) {
        var n = c.pages.filter(function (p) { return written(c.slug + "/" + p.slug); }).length;
        return '<a href="#' + c.slug + "/" + c.pages[0].slug + '">' + esc(c.title) + "<small>" + n + " of " + c.pages.length + " pages</small></a>";
      }).join("") + "</div>";
    document.title = "ZineNow Wiki";
    renderNav(null);
  }

  function show(key, anchor) {
    var i = flat.findIndex(function (f) { return f.key === key; });
    if (i < 0) { home(); return; }
    var f = flat[i], rec = W.pages[key];
    var body = rec ? rec.html : '<div class="wk-soon">Coming soon. This page is in the menu but has not been written yet.</div>';
    var pn = function (g, label, cls) { return g ? '<a class="' + cls + '" href="#' + g.key + '"><small>' + label + "</small>" + esc(g.page.title) + "</a>" : "<span></span>"; };
    $("page").innerHTML = '<div class="wk-crumb">' + esc(f.chapter.title) + "</div><h1>" + esc(f.page.title) + "</h1>" + body +
      '<div class="wk-pn">' + pn(flat[i - 1], "← Previous", "prev") + pn(flat[i + 1], "Next →", "next") + "</div>";
    document.title = f.page.title + " · ZineNow Wiki";
    Array.prototype.forEach.call(document.querySelectorAll("figure.code"), function (fig) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "copy-btn"; b.textContent = "Copy";
      b.onclick = function () {
        var t = fig.querySelector("code").textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "Copied"; }, function () { b.textContent = "Press Ctrl+C"; });
        setTimeout(function () { b.textContent = "Copy"; }, 1500);
      };
      fig.appendChild(b);
    });
    renderNav(f);
    var main = document.querySelector(".wk-main"), target = anchor && document.getElementById("h-" + anchor);
    if (target) target.scrollIntoView(); else main.scrollTop = 0;
    document.body.classList.remove("nav-open");
  }

  function route() {
    var h = decodeURIComponent(location.hash.slice(1)).split(":");
    if (!h[0]) home(); else show(h[0], h[1]);
  }

  $("search").addEventListener("input", function (e) { query = e.target.value.trim(); renderNav(null); if (!query) route(); });
  $("menu-btn").addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  window.addEventListener("hashchange", route);
  route();
})();
