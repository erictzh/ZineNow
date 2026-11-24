// The wiki page: a sidebar that follows the table of contents (a tree), the article, search, previous/next.
// All the text comes from content.js (window.WIKI: { toc: tree, pages: { key: { html, text } } }).
(function () {
  "use strict";
  var W = window.WIKI, $ = function (id) { return document.getElementById(id); };
  var flat = [], byKey = {};
  (function walk(nodes, trail) {
    nodes.forEach(function (n) {
      var f = { node: n, key: n.key, trail: trail.concat(n) };
      flat.push(f); byKey[n.key] = f;
      walk(n.children, f.trail);
    });
  })(W.toc, []);
  var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var label = function (n) { return (n.num ? n.num + " " : "") + n.title; };
  var written = function (key) { return !!W.pages[key]; };
  var leaves = flat.filter(function (f) { return !f.node.children.length; });
  var opened = {}; // which branches the reader has opened
  var query = "";

  function navNode(n, activeKey) {
    var cls = (activeKey === n.key ? "active" : "") + (written(n.key) || n.children.length ? "" : " soon");
    var link = '<a class="' + cls + '" href="#' + n.key + '">' + esc(label(n)) + "</a>";
    if (!n.children.length) return link;
    return '<details data-key="' + n.key + '"' + (opened[n.key] ? " open" : "") + '><summary class="' + cls + '"><a href="#' + n.key + '">' + esc(label(n)) + "</a></summary>" +
      n.children.map(function (c) { return navNode(c, activeKey); }).join("") + "</details>";
  }

  function renderNav(active) {
    var nav = $("nav");
    if (query.length >= 2) { nav.innerHTML = searchHtml(); return; }
    if (active) active.trail.forEach(function (n) { opened[n.key] = true; });
    nav.innerHTML = W.toc.map(function (n) { return navNode(n, active && active.key); }).join("");
  }

  function searchHtml() {
    var words = query.toLowerCase().split(/\s+/).filter(Boolean), hits = [];
    flat.forEach(function (f) {
      var rec = W.pages[f.key], title = (label(f.node) + " " + (f.node.desc || "")).toLowerCase(), text = rec ? rec.text.toLowerCase() : "";
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
      var where = h.f.trail.slice(0, -1).map(function (n) { return n.title; }).join(" › ");
      return '<a class="hit" href="#' + h.f.key + '">' + esc(label(h.f.node)) + (where ? " <small>" + esc(where) + "</small>" : "") + snip + "</a>";
    }).join("");
  }

  function childList(nodes) {
    return "<ul>" + nodes.map(function (n) {
      return '<li><a href="#' + n.key + '">' + esc(label(n)) + "</a>" + (n.desc ? " <small>(" + esc(n.desc) + ")</small>" : "") + (n.children.length ? childList(n.children) : "") + "</li>";
    }).join("") + "</ul>";
  }

  function home() {
    var done = leaves.filter(function (f) { return written(f.key); }).length;
    $("page").innerHTML = '<div class="wk-crumb">Tutorial / Wiki</div><h1>ZineNow Wiki</h1>' +
      "<p>A textbook for every tool on this site. Each page has four parts: <b>Intro</b> (what it is for), <b>How to use</b>, <b>How it works</b> (what the computer really does, with the proper names of the techniques) and <b>Code</b> (the real code behind it).</p>" +
      '<p class="wk-build">' + done + " of " + leaves.length + " pages written so far · wiki build " + esc(W.build) + "</p>" +
      '<div class="wk-grid">' + W.toc.map(function (c) {
        var all = leaves.filter(function (f) { return f.trail[0] === c; }), n = all.filter(function (f) { return written(f.key); }).length;
        return '<a href="#' + c.key + '">' + esc(label(c)) + "<small>" + n + " of " + all.length + " pages</small></a>";
      }).join("") + "</div>";
    document.title = "ZineNow Wiki";
    renderNav(null);
  }

  function show(key, anchor) {
    var f = byKey[key];
    if (!f) { home(); return; }
    var i = flat.indexOf(f), n = f.node, rec = W.pages[key], body = rec ? rec.html : "";
    if (n.children.length) body = (n.desc ? "<p>" + esc(n.desc) + "</p>" : "") + body + (rec ? "" : "") + "<h2>In this section</h2>" + childList(n.children);
    else if (!rec) body = '<div class="wk-soon">Coming soon. This page is in the menu but has not been written yet.</div>';
    else if (n.desc) body = '<p class="wk-lead">' + esc(n.desc) + "</p>" + body;
    var pn = function (g, lab, cls) { return g ? '<a class="' + cls + '" href="#' + g.key + '"><small>' + lab + "</small>" + esc(label(g.node)) + "</a>" : "<span></span>"; };
    var crumb = f.trail.slice(0, -1).map(function (t) { return '<a href="#' + t.key + '">' + esc(t.title) + "</a>"; }).join(" › ") || "Tutorial / Wiki";
    $("page").innerHTML = '<div class="wk-crumb">' + crumb + "</div><h1>" + esc(label(n)) + "</h1>" + body +
      '<div class="wk-pn">' + pn(flat[i - 1], "← Previous", "prev") + pn(flat[i + 1], "Next →", "next") + "</div>";
    document.title = n.title + " · ZineNow Wiki";
    Array.prototype.forEach.call(document.querySelectorAll("figure.code"), function (fig) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "copy-btn"; b.textContent = "Copy";
      b.onclick = function () {
        var t = Array.prototype.map.call(fig.querySelectorAll(".src"), function (e) { return e.textContent; }).join("\n") || fig.querySelector("code").textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "Copied"; }, function () { b.textContent = "Press Ctrl+C"; });
        setTimeout(function () { b.textContent = "Copy"; }, 1500);
      };
      fig.appendChild(b);
    });
    renderNav(f);
    var main = document.querySelector(".wk-main"), target = anchor && document.getElementById("h-" + anchor);
    if (target) target.scrollIntoView(); else main.scrollTop = 0;
    var act = document.querySelector(".wk-nav a.active"); if (act && act.scrollIntoView) act.scrollIntoView({ block: "nearest" });
    document.body.classList.remove("nav-open");
  }

  function route() {
    var h = decodeURIComponent(location.hash.slice(1)).split(":");
    if (!h[0]) home(); else show(h[0], h[1]);
  }

  $("nav").addEventListener("toggle", function (e) { if (e.target.dataset && e.target.dataset.key) opened[e.target.dataset.key] = e.target.open; }, true);
  $("search").addEventListener("input", function (e) { query = e.target.value.trim(); renderNav(byKey[location.hash.slice(1).split(":")[0]] || null); if (!query) route(); });
  $("menu-btn").addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  window.addEventListener("hashchange", route);
  route();
})();
