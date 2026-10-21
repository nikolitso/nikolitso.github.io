// Quotes to live by: renders quotes.json (edited in Pages CMS) as chapters, with a chapter filter.
(function () {
  "use strict";
  var list = document.getElementById("q-list");
  var filter = document.getElementById("q-filter");
  var wide = window.matchMedia("(min-width: 861px)");
  // Chapters in reading order, each with its one-line summary. Unknown categories go last.
  var CHAPTERS = [
    ["Action & initiative", "Start before you feel ready; nobody else will build your life for you."],
    ["Discipline & consistency", "Small steps every day, whatever your mood."],
    ["Health & daily habits", "Move, sleep, eat well, protect your focus."],
    ["Excellence & work ethic", "Do things well, be reliable, enjoy the work."],
    ["Resilience & inner growth", "Face the truth about yourself, let go, recover faster."],
    ["Happiness & gratitude", "Happiness is an activity: appreciate what you have and solve problems."],
    ["Relationships & character", "Appreciate people, speak well of the absent, keep confidences, belong somewhere."],
    ["Authenticity & independence", "Be real, think for yourself, stop performing for others."],
    ["Time & money", "Time is the real wealth; spend it on what satisfies you."],
    ["Rules for life", "Checklists that span every chapter."]
  ];
  var ORDER = CHAPTERS.map(function (c) { return c[0]; });
  function rank(c) { var i = ORDER.indexOf(c); return i < 0 ? 99 : i; }

  function slug(s) { return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Plain text -> paragraphs; a block whose lines all start with "- " (or "1. ") becomes a list.
  function body(text) {
    var wrap = el("div", "q-text");
    String(text || "").replace(/\r/g, "").split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;
      if (lines.every(function (l) { return /^[-•*]\s+/.test(l); })) {
        var ul = el("ul");
        lines.forEach(function (l) { ul.appendChild(el("li", null, l.replace(/^[-•*]\s+/, ""))); });
        wrap.appendChild(ul);
      } else if (lines.every(function (l) { return /^\d+[.)]\s+/.test(l); })) {
        var ol = el("ol");
        lines.forEach(function (l) { ol.appendChild(el("li", null, l.replace(/^\d+[.)]\s+/, ""))); });
        wrap.appendChild(ol);
      } else {
        wrap.appendChild(el("p", null, lines.join(" ")));
      }
    });
    return wrap;
  }

  function card(q) {
    var art = el("article", "q");
    art.id = "q-" + q.id;
    var short = !q.title && String(q.text || "").length <= 220 && !/\n/.test(q.text || "");
    if (short) art.classList.add("short");
    var top = el("div", "q-top");
    top.appendChild(el("span", "tag", q.category || ""));
    var a = el("a", "q-link", "#" + q.id);
    a.href = "#q-" + q.id;
    a.setAttribute("aria-label", "Link to quote " + q.id);
    top.appendChild(a);
    art.appendChild(top);
    if (q.title) art.appendChild(el("h3", null, q.title));
    art.appendChild(body(q.text));
    if (q.context) art.appendChild(el("p", "q-context", q.context));
    if (q.note) art.appendChild(el("p", "q-note", q.note));
    if (q.source) art.appendChild(el("p", "q-source", q.source));
    return art;
  }

  // Two columns on wide screens; each card goes to the shorter column so order reads across.
  function grid(parent, items) {
    var g = parent.appendChild(el("div", "q-grid"));
    var n = wide.matches ? 2 : 1, cols = [], h = [];
    g.style.setProperty("--cols", n);
    for (var i = 0; i < n; i++) { cols.push(g.appendChild(el("div", "q-col"))); h.push(0); }
    items.forEach(function (q) {
      var c = h.indexOf(Math.min.apply(null, h));
      var node = cols[c].appendChild(card(q));
      h[c] += node.offsetHeight + 20;
    });
  }

  function render(quotes, active) {
    list.textContent = "";
    var groups = {};
    quotes.forEach(function (q) {
      if (active && slug(q.category || "") !== active) return;
      (groups[q.category] = groups[q.category] || []).push(q);
    });
    var cats = Object.keys(groups).sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); });
    if (!cats.length) { list.appendChild(el("p", "q-empty", "No quotes in this chapter yet.")); return; }
    cats.forEach(function (c) {
      var sec = list.appendChild(el("section", "q-chapter"));
      sec.id = slug(c);
      var r = rank(c);
      var h = sec.appendChild(el("h2", null, c));
      if (r < 99) {
        h.insertBefore(el("span", "q-num", String(r + 1).padStart(2, "0")), h.firstChild);
        sec.appendChild(el("p", "q-sum", CHAPTERS[r][1]));
      }
      grid(sec, groups[c]);
    });
  }

  function buttons(quotes, active, onPick) {
    var counts = {};
    quotes.forEach(function (q) { counts[q.category] = (counts[q.category] || 0) + 1; });
    var cats = Object.keys(counts).sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); });
    filter.textContent = "";
    [["", "All", quotes.length]].concat(cats.map(function (c) { return [slug(c), c, counts[c]]; })).forEach(function (c) {
      var li = el("li"), b = el("button", null, c[1]);
      b.type = "button";
      b.appendChild(el("span", null, String(c[2])));
      b.setAttribute("aria-pressed", String(c[0] === active));
      b.addEventListener("click", function () { onPick(c[0]); });
      li.appendChild(b);
      filter.appendChild(li);
    });
  }

  fetch("/quotes/quotes.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      // Within a chapter, quotes read in number order.
      var quotes = (Array.isArray(data) ? data : []).filter(function (q) { return q && q.text && !q.draft; })
        .map(function (q, i) { if (q.id == null) q.id = i + 1; return q; })
        .sort(function (a, b) { return a.id - b.id; });
      var params = new URLSearchParams(location.search);
      var active = params.get("topic") || "";
      if (active && !quotes.some(function (q) { return slug(q.category || "") === active; })) active = "";
      function pick(s) {
        active = s;
        var u = new URL(location.href);
        if (s) u.searchParams.set("topic", s); else u.searchParams.delete("topic");
        u.hash = "";
        history.replaceState(null, "", u);
        buttons(quotes, active, pick);
        render(quotes, active);
      }
      buttons(quotes, active, pick);
      render(quotes, active);
      wide.addEventListener("change", function () { render(quotes, active); });
      if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
    })
    .catch(function () {
      list.textContent = "";
      list.appendChild(el("p", "q-empty", "The quotes could not be loaded. Please refresh the page."));
    });
})();
