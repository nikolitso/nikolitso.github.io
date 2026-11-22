/* Open picks (user, 23 Nov 2026): every "Open … picks" table on the sports pages gets the Handball card (a framed box,
   a count badge, the pick in large type, the time in grey) and, above it, filter buttons in the projects menu's style:
   All, then one per league (or per stat, from a row's data-g) with its count. Tables are found by their heading, so pages
   need no other change; pages that redraw a table are followed with a MutationObserver. */
(function () {
  var HEAD = /^\s*open\b[^]*\bpicks\b/i;
  var LEAGUE = /league/i, DATE = /^(date|tip-off|kick-off)$/i, PICK = /^(pick|call)$/i;

  function cols(table) {
    var row = table.tHead && table.tHead.rows[table.tHead.rows.length - 1], out = {};
    if (!row) return out;
    [].forEach.call(row.cells, function (th, i) {
      var t = th.textContent.trim();
      if (out.league == null && LEAGUE.test(t)) out.league = i;
      if (out.date == null && DATE.test(t)) out.date = i;
      if (out.pick == null && PICK.test(t)) out.pick = i;
    });
    return out;
  }

  function rows(table) {
    return [].filter.call(table.tBodies.length ? table.tBodies[0].rows : [], function (r) { return r.cells.length > 1; });
  }

  function key(r, c) {
    if (r.dataset.g) return r.dataset.g;
    var cell = c.league != null && r.cells[c.league];
    return cell ? cell.textContent.trim() : "";
  }

  function tableAfter(h) {                           // the table that belongs to this heading
    var box = h.closest(".opbox");
    if (box) return box.querySelector("table");
    for (var el = h.nextElementSibling, i = 0; el && i < 5; el = el.nextElementSibling, i++) {
      if (/^H[23]$/.test(el.tagName)) return null;
      if (el.tagName === "TABLE") return el;
      var t = el.querySelector && el.querySelector("table");
      if (t) return t;
    }
    return null;
  }

  function card(h, table) {                          // Handball's card around the heading, its notes and the table
    if (h.closest(".opbox") || h.closest(".an-opbox")) return h.closest(".opbox") ? null : h.closest(".an-opbox");
    var box = document.createElement("div");
    box.className = "an-opbox";
    h.parentNode.insertBefore(box, h);
    var el = h, stop = table.closest(".scroll") || table;
    while (el) {
      var next = el.nextElementSibling;
      box.appendChild(el);
      if (el === stop || el.contains(table)) break;
      el = next;
    }
    var n = document.createElement("span");
    n.className = "an-opn";
    h.appendChild(n);
    return box;
  }

  function polish(table, c) {
    rows(table).forEach(function (r) {
      var d = c.date != null && r.cells[c.date];
      if (d && !d.children.length) {
        var m = d.textContent.trim().match(/^(.+?)\s+(\d{1,2}:\d{2})$/);
        if (m) d.innerHTML = "<b>" + m[1] + '</b> <span class="an-optime">' + m[2] + "</span>";
      }
      var p = c.pick != null && r.cells[c.pick];
      if (p) p.classList.add("an-opcall");
    });
  }

  function chips(h, table) {
    var c = cols(table), R = rows(table), sig = R.length + "|" + (R[0] ? R[0].textContent : "") + "|" + (R.length ? R[R.length - 1].textContent : "");
    if (h._opSig === sig) return;
    h._opSig = sig;
    polish(table, c);
    var badge = h.querySelector(".an-opn");
    if (badge) badge.textContent = R.length;
    var bar = h._opBar;
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    var count = {}, order = [];
    R.forEach(function (r) {
      var k = key(r, c);
      if (!k) return;
      if (!(k in count)) { count[k] = 0; order.push(k); }
      count[k]++;
    });
    if (order.length < 2) { R.forEach(function (r) { r.hidden = false; }); return; }
    order.sort(function (a, b) { return count[b] - count[a] || a.localeCompare(b); });
    var sel = h._opSel && h._opSel in count ? h._opSel : "";
    bar = document.createElement("div");
    bar.className = "an-opf";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Show open picks by " + (c.league != null ? "league" : "type"));
    [""].concat(order).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "an-opchip";
      b.dataset.k = k;
      b.innerHTML = (k ? k.replace(/</g, "&lt;") : "All") + " <b>" + (k ? count[k] : R.length) + "</b>";
      b.addEventListener("click", function () { set(k); });
      bar.appendChild(b);
    });
    function set(k) {
      h._opSel = k;
      [].forEach.call(bar.children, function (b) { var on = b.dataset.k === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      R.forEach(function (r) { r.hidden = !!k && key(r, c) !== k; });
    }
    var anchor = h.closest(".ophd") || h;
    anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    h._opBar = bar;
    set(sel);
  }

  function scan() {
    [].forEach.call(document.querySelectorAll("h2, h3"), function (h) {
      if (!HEAD.test(h.textContent)) return;
      var table = tableAfter(h);
      if (!table || !table.tBodies.length) return;
      card(h, table);
      chips(h, table);
    });
  }

  var queued = false;
  function soon() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; scan(); }); } }
  function start() { scan(); new MutationObserver(soon).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
