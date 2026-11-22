/* 'Beat the close' tile (user, 23 Nov 2026): closing-line value next to each live test's record. The figures come from
   /assets/clv.json, written every two hours by BettingSignal's record.py (CLV = price taken x the closing chance with
   the market's margin removed - 1). The tile copies the page's own record tile, so it takes that page's look. */
(function () {
  var PAGES = [
    { path: /^\/basketball\/overs\/?$/, key: "basketball_overs", label: /^Settled picks$/ },
    { path: /^\/basketball\/women\/?$/, key: "women", label: /^Settled picks$/ },
    { path: /^\/handball\/?$/, key: "handball", label: /^Record$/, within: "#sgTiles" },
    { path: /^\/handball\/?$/, key: "handball_tracking", label: /^Record$/, within: "#tsTiles" },
    { path: /^\/volleyball\/?$/, key: "volleyball", label: /^Record$/, view: /^(home|picks)?$/ },
    { path: /^\/superleague\/?$/, key: "superleague", label: /^Settled so far$/ }
  ];
  var NOTE = "CLV compares the price taken with the market's final price before the start, with its margin removed. " +
             "Positive means the pick was taken at a better price than the market closed at.";
  var mine = PAGES.filter(function (p) { return p.path.test(location.pathname); });
  if (!mine.length) return;
  var data = null;

  function view() { var m = location.hash.match(/view=([a-z0-9]+)/i); return m ? m[1] : ""; }

  function place(p) {
    var d = data && data[p.key];
    if (!d || !d.n || d.avg == null) return;
    if (p.view && !p.view.test(view())) return;
    var scope = p.within ? document.querySelector(p.within) : document;
    if (!scope) return;
    [].forEach.call(scope.querySelectorAll(".tile, .metric"), function (t) {
      var lab = t.firstElementChild;
      if (!lab || !p.label.test(lab.textContent.trim())) return;
      var next = t.nextElementSibling;
      if (next && next.dataset && next.dataset.clv) return;
      var c = document.createElement(t.tagName === "A" ? "div" : t.tagName);
      c.className = t.className;
      c.dataset.clv = p.key;
      c.title = NOTE;
      [].forEach.call(t.children, function (ch, i) {
        var e = document.createElement(ch.tagName);
        e.className = ch.className;
        if (i === 0) e.textContent = "Beat the close";
        else if (i === 1) {
          e.textContent = (d.avg > 0 ? "+" : d.avg < 0 ? "−" : "") + Math.abs(d.avg * 100).toFixed(1) + "%";
          e.style.color = d.avg > 0 ? "var(--an-positive)" : d.avg < 0 ? "var(--an-negative)" : "";
        } else if (i === 2) e.textContent = "average CLV · " + d.n + " picks · " + d.beat + " beat the closing price";
        else return;
        c.appendChild(e);
      });
      if (c.children.length < 3) {
        var s = document.createElement("span");
        s.className = "an-clvsub";
        s.textContent = "average CLV · " + d.n + " picks · " + d.beat + " beat the closing price";
        c.appendChild(s);
      }
      t.parentNode.insertBefore(c, next);
      var box = t.parentNode;
      if (!(box.nextElementSibling && box.nextElementSibling.classList.contains("an-clvnote"))) {
        var n = document.createElement("p");
        n.className = "note an-clvnote";
        n.textContent = NOTE;
        box.parentNode.insertBefore(n, box.nextSibling);
      }
    });
  }

  var queued = false;
  function scan() { mine.forEach(place); }
  function soon() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; scan(); }); } }
  fetch("/assets/clv.json?t=" + Math.floor(Date.now() / 600000)).then(function (r) { return r.json(); }).then(function (j) {
    data = j;
    scan();
    new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", soon);
  }).catch(function () {});
})();
