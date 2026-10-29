(function () {
  var D = window.CUP, GF = D.games;
  var STATS = [
    ["goals", "Goals"], ["xg", "xG"], ["xgot", "xG on target"], ["bc", "Big chances"], ["co", "Corners"],
    ["shots", "Shots"], ["sot", "Shots on target"], ["fouls", "Fouls"], ["gk", "Goal kicks"], ["ti", "Throw-ins"],
    ["sv", "Goalkeeper saves"], ["cards", "Cards"]
  ];
  var SHORT = {goals: "Goals", xg: "xG", xgot: "xGOT", shots: "Shots", sot: "SoT", bc: "Big ch.", co: "Corners", fouls: "Fouls", gk: "Goal kicks", ti: "Throw-ins", sv: "Saves", cards: "Cards"};
  var XG = {xg: 1, xgot: 1};   // shown with two decimals, no over line
  // first-half copy of every game: same shape, stats taken from g.h1
  var G1 = GF.filter(function (g) { return g.h1; }).map(function (g) {
    var o = {}; for (var k in g) o[k] = g[k];
    STATS.forEach(function (s) { o[s[0]] = g.h1[s[0]]; });
    o.half = true; return o;
  });
  var G = GF;   // the set the current view reads: GF (full match) or G1 (first half)
  // tier is order-free ("SL1 v SL2" whoever is at home); tierHA keeps the home side first
  function tier(g) { return g.div.slice().sort().join(" v "); }
  function tierHA(g) { return g.div[0] + " v " + g.div[1]; }
  var out = document.getElementById("out");
  var st = {view: "stats", team: "", side: "for", sort: "goals", dir: -1, half: false, tier: "SL1 v SL1", grp: "att", ob: "f0"};
  function periodSeg() {
    return '<div class="seg" id="per"><button data-p="0"' + (st.half ? '' : ' class="on"') + '>Full match</button><button data-p="1"' + (st.half ? ' class="on"' : '') + '>1st half</button></div>';
  }
  // wide tables show one group of stats at a time so they fit the page
  var GROUPS = {att: ["goals", "xg", "xgot", "bc", "co", "shots", "sot"], oth: ["fouls", "gk", "ti", "sv", "cards"]};
  function COLS() { return STATS.filter(function (s) { return GROUPS[st.grp].indexOf(s[0]) >= 0; }); }
  function grpSeg() {
    return '<div class="seg grp"><button data-g="att"' + (st.grp === "att" ? ' class="on"' : '') + '>Attack</button><button data-g="oth"' + (st.grp === "oth" ? ' class="on"' : '') + '>Other</button></div>';
  }
  function bindGrp(fn) {
    out.querySelectorAll(".grp button").forEach(function (b) { b.onclick = function () {
      st.grp = b.dataset.g; if (GROUPS[st.grp].indexOf(st.sort) < 0) { st.sort = GROUPS[st.grp][0]; st.dir = -1; } fn();
    }; });
  }
  function bindPeriod(fn) {
    out.querySelectorAll("#per button").forEach(function (b) { b.onclick = function () { st.half = b.dataset.p === "1"; fn(); }; });
  }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function day(iso) { var d = new Date(iso + "T12:00:00"); return DAY[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function xl(t) { return String(t).replace(/xG/g, '<span style="text-transform:none">xG</span>'); }
  var DEC2 = {goals: 1, xg: 1, xgot: 1, cards: 1};   // averages shown with two decimals
  function fk(k, x) { return DEC2[k] ? (Math.round(x * 100) / 100).toFixed(2) : f1(x); }
  function pct(x) { return Math.round(x * 100) + "%"; }
  function dates() { var r = {}; G.forEach(function (g) { r[g.date] = 1; }); return Object.keys(r).sort().reverse(); }

  var last = GF.reduce(function (m, g) { return g.date > m ? g.date : m; }, "");
  document.getElementById("sub").textContent = "Season " + D.season + " · " + GF.length + " games · last game " + day(last);

  // ---------- matches ----------
  function matches() {
    G = st.half ? G1 : GF;
    var h = '<div class="bar">' + periodSeg();
    if (st.team) h += '<button class="chip on" id="clr">' + esc(st.team) + ' &times;</button>';
    h += '</div>';
    dates().forEach(function (d) {
      var gs = G.filter(function (g) { return g.date === d && (!st.team || g.home === st.team || g.away === st.team); });
      if (!gs.length) return;
      h += '<h2 class="day">' + day(d) + '</h2><div class="grid">';
      gs.forEach(function (g) { h += card(g); });
      h += '</div>';
    });
    out.innerHTML = h;
    bindPeriod(matches);
    var c = document.getElementById("clr"); if (c) c.onclick = function () { st.team = ""; matches(); };
    out.querySelectorAll("[data-team]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); st.team = a.dataset.team; matches(); }; });
  }

  function card(g) {
    var h = '<div class="card mc"><div class="meta">' + day(g.date) + ' · ' + tierHA(g) + (g.half ? ' · <span style="color:var(--gold)">1st half</span>' : '') + '</div><div class="row">';
    h += '<a class="tm" href="#" data-team="' + esc(g.home) + '" style="color:inherit;text-decoration:none">' + esc(g.home) + '</a>';
    h += '<span class="sc">' + g.goals[0] + ' – ' + g.goals[1] + '</span>';
    h += '<a class="tm" href="#" data-team="' + esc(g.away) + '" style="color:inherit;text-decoration:none;text-align:right">' + esc(g.away) + '</a></div>';
    if (g.odds) h += oddsLine(g);
    if (g.ref) h += '<div class="ref">Referee <b>' + esc(g.ref) + '</b></div>';
    h += '<table>';
    STATS.slice(1).forEach(function (s) {
      var v = g[s[0]], t = v[0] + v[1];
      var a = t ? v[0] / t * 100 : 50;
      h += '<tr><td class="n h' + (v[0] < v[1] ? " lo" : "") + '"><b>' + (XG[s[0]] ? v[0].toFixed(2) : v[0]) + '</b></td><td class="lbl">' + xl(s[1]) +
        (t ? '<div class="bar2"><i style="width:' + a + '%"></i><i style="width:' + (100 - a) + '%"></i></div>' : '') +
        '</td><td class="n' + (v[1] < v[0] ? " lo" : "") + '"><b>' + (XG[s[0]] ? v[1].toFixed(2) : v[1]) + '</b></td></tr>';
    });
    return h + '</table></div>';
  }

  function oddsLine(g) {
    var o = g.odds, f = full(g), r = f.goals[0] > f.goals[1] ? 0 : f.goals[0] === f.goals[1] ? 1 : 2;
    var ov = f.goals[0] + f.goals[1] > 2.5 ? 0 : 1;
    function c(lbl, v, on) { return '<span class="od' + (on ? ' hit' : '') + '"><i>' + lbl + '</i>' + (v ? v.toFixed(2) : '–') + '</span>'; }
    var h = '<div class="odds">';
    if (o.x12) h += c("1", o.x12[0], r === 0) + c("X", o.x12[1], r === 1) + c("2", o.x12[2], r === 2);
    if (o.ou25) h += '<span class="sep"></span>' + c("O2.5", o.ou25[0], ov === 0) + c("U2.5", o.ou25[1], ov === 1);
    return h + '</div>';
  }
  function full(g) { return g.half ? GF.filter(function (x) { return x.date === g.date && x.home === g.home; })[0] : g; }

  // ---------- by odds ----------
  // no-margin chances from a set of odds
  function fair(arr) { var inv = arr.map(function (x) { return 1 / x; }), s = inv.reduce(function (a, b) { return a + b; }, 0); return inv.map(function (x) { return x / s; }); }
  function favSide(g) { return g.odds.x12[0] <= g.odds.x12[2] ? 0 : 1; }
  function favPrice(g) { return Math.min(g.odds.x12[0], g.odds.x12[2]); }
  // split games into three groups as equal as possible (8 / 8 / 7 for 23), lowest price first
  function thirds(gs, key) {
    var srt = gs.slice().sort(function (a, b) { return key(a) - key(b); }), n = srt.length, out3 = [], i0 = 0;
    for (var i = 0; i < 3; i++) {
      var size = Math.floor(n / 3) + (i < n % 3 ? 1 : 0), part = srt.slice(i0, i0 + size); i0 += size;
      if (part.length) out3.push({gs: part, lo: key(part[0]), hi: key(part[part.length - 1])});
    }
    return out3;
  }
  function byOdds() {
    var all = st.half ? G1 : GF;
    var fav = thirds(all.filter(function (g) { return g.odds && g.odds.x12; }), favPrice);
    var ovr = thirds(all.filter(function (g) { return g.odds && g.odds.ou25; }), function (g) { return g.odds.ou25[0]; });
    if (!/^[fo][0-2]$/.test(st.ob)) st.ob = "f0";
    var h = '<p class="note">Games split into three groups as equal as possible, by the favourite\u2019s 1X2 price or by the over 2.5 goals price. Odds are the middle price across the bookmakers listed before kick-off. <b>Odds %</b> is the chance the odds give once the margin is removed; results and over/under always use the full match.</p>';
    h += '<div class="bar">' + periodSeg() + '</div>';
    function pills(lbl, set, pre) {
      var r = '<div class="bar"><span class="muted" style="font:500 12px var(--mono);text-transform:uppercase;letter-spacing:.06em;min-width:150px">' + lbl + '</span><div class="chips">';
      set.forEach(function (t, i) {
        r += '<button class="chip' + (st.ob === pre + i ? " on" : "") + '" data-ob="' + pre + i + '">' + t.lo.toFixed(2) + ' – ' + t.hi.toFixed(2) + ' <span style="opacity:.7">' + t.gs.length + '</span></button>';
      });
      return r + '</div></div>';
    }
    h += pills("Favourite\u2019s price", fav, "f") + pills("Over 2.5 price", ovr, "o");
    var isFav = st.ob[0] === "f", grp = (isFav ? fav : ovr)[+st.ob[1]];
    if (!grp) { out.innerHTML = h; bindOdds(); return; }
    var gs = grp.gs, n = gs.length, rng = grp.lo.toFixed(2) + ' – ' + grp.hi.toFixed(2);
    h += '<div class="facts">';
    if (isFav) {
      var w = 0, d = 0, l = 0, pe = 0;
      gs.forEach(function (g) {
        var f = full(g), fs = favSide(g), gf = f.goals[fs], ga = f.goals[1 - fs];
        if (gf > ga) w++; else if (gf === ga) d++; else l++;
        pe += fair(g.odds.x12)[fs === 0 ? 0 : 2];
      });
      h += '<span class="fact"><b>' + w + '-' + d + '-' + l + '</b>favourite won-drew-lost</span>' +
        '<span class="fact"><b>' + pct(pe / n) + '</b>favourite win, odds %</span>' +
        '<span class="fact"><b>' + pct(w / n) + '</b>favourite win, happened</span>';
    } else {
      var pe2 = 0, ov = 0;
      gs.forEach(function (g) { var f = full(g); pe2 += fair(g.odds.ou25)[0]; if (f.goals[0] + f.goals[1] > 2.5) ov++; });
      h += '<span class="fact"><b>' + ov + ' of ' + n + '</b>went over 2.5</span>' +
        '<span class="fact"><b>' + pct(pe2 / n) + '</b>over 2.5, odds %</span>' +
        '<span class="fact"><b>' + pct(ov / n) + '</b>over 2.5, happened</span>';
    }
    h += '</div>';
    G = gs;
    h += totals((isFav ? 'Favourite priced ' : 'Over 2.5 priced ') + rng + ': ' + n + ' games' + (st.half ? ', first half' : ', full match') +
      ', both teams added together, per game. The over line is the half-point next to the average, with how often the game went over it.');
    if (isFav) {
      h += '<h2>Favourite and underdog</h2><p class="note">Per game, what the favourite and the underdog did on their own.</p><div class="scroll"><table class="tt"><thead><tr><th>Stat</th><th class="n">Favourite</th><th class="n">Underdog</th></tr></thead><tbody>';
      STATS.forEach(function (s) {
        var a = 0, c = 0; gs.forEach(function (g) { var fs = favSide(g); a += g[s[0]][fs]; c += g[s[0]][1 - fs]; });
        h += '<tr><td>' + s[1] + '</td><td class="n tot">' + fk(s[0], a / n) + '</td><td class="n">' + fk(s[0], c / n) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    out.innerHTML = h;
    bindOdds();
  }
  function bindOdds() {
    bindPeriod(byOdds);
    out.querySelectorAll("[data-ob]").forEach(function (b) { b.onclick = function () { st.ob = b.dataset.ob; byOdds(); }; });
  }

  // ---------- teams ----------
  function teamRows() {
    var T = {};
    G.forEach(function (g) {
      [[g.home, 0], [g.away, 1]].forEach(function (p) {
        var t = T[p[0]] || (T[p[0]] = {team: p[0], div: g.div[p[1]], gp: 0, w: 0, d: 0, l: 0, f: {}, a: {}});
        var me = p[1], op = 1 - me;
        t.gp++;
        if (g.goals[me] > g.goals[op]) t.w++; else if (g.goals[me] < g.goals[op]) t.l++; else t.d++;
        STATS.forEach(function (s) {
          t.f[s[0]] = (t.f[s[0]] || 0) + g[s[0]][me];
          t.a[s[0]] = (t.a[s[0]] || 0) + g[s[0]][op];
        });
      });
    });
    return Object.keys(T).map(function (k) { return T[k]; });
  }

  function val(t, k) {
    if (k === "gp") return t.gp;
    if (st.side === "for") return t.f[k] / t.gp;
    if (st.side === "against") return t.a[k] / t.gp;
    return (t.f[k] + t.a[k]) / t.gp;
  }

  function teams() {
    G = st.half ? G1 : GF;
    var rows = teamRows();
    rows.sort(function (a, b) {
      var d = (val(a, st.sort) - val(b, st.sort)) * st.dir;
      return d || a.team.localeCompare(b.team);
    });
    // clubs in the league phase by division, from every game played
    var dv = {}; GF.forEach(function (g) { dv[g.home] = g.div[0]; dv[g.away] = g.div[1]; });
    var nt = Object.keys(dv).length, n1 = Object.keys(dv).filter(function (k) { return dv[k] === "SL1"; }).length;
    var h = '<div class="facts"><span class="fact"><b>' + nt + '</b> teams in the league phase</span>' +
      '<span class="fact"><b>' + n1 + '</b> from Super League (SL1)</span>' +
      '<span class="fact"><b>' + (nt - n1) + '</b> from Super League 2 (SL2)</span></div>';
    h += '<p class="note">Per-game averages in the cup only. <b>For</b> = what the team did, <b>Against</b> = what its opponents did, <b>Game total</b> = both sides. Click a column to sort, a team to see its games. Only a few games per team, so treat these as notes, not ratings.</p>';
    h += '<div class="bar">' + periodSeg() + grpSeg() + '<div class="seg" id="side">';
    [["for", "For"], ["against", "Against"], ["total", "Game total"]].forEach(function (s) {
      h += '<button data-s="' + s[0] + '"' + (st.side === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>';
    });
    h += '</div></div><div class="scroll"><table class="tt"><thead><tr><th>Team</th><th>League</th>' + th("gp", "GP") + '<th class="n">W-D-L</th>';
    COLS().forEach(function (s) { h += th(s[0], xl(SHORT[s[0]])); });
    h += '</tr></thead><tbody>';
    rows.forEach(function (t) {
      h += '<tr><td><a href="#" data-team="' + esc(t.team) + '" style="color:inherit;text-decoration:none">' + esc(t.team) + '</a></td><td><span class="tag">' + t.div + '</span></td><td class="n">' + t.gp +
        '</td><td class="n">' + t.w + '-' + t.d + '-' + t.l + '</td>';
      COLS().forEach(function (s) { h += '<td class="n' + (st.sort === s[0] ? " tot" : "") + '">' + fk(s[0], val(t, s[0])) + '</td>'; });
      h += '</tr>';
    });
    out.innerHTML = h + '</tbody></table></div>';
    bindPeriod(teams); bindGrp(teams);
    out.querySelectorAll("#side button").forEach(function (b) { b.onclick = function () { st.side = b.dataset.s; teams(); }; });
    out.querySelectorAll("th.sort").forEach(function (c) {
      c.onclick = function () { var k = c.dataset.k; if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = -1; } teams(); };
    });
    out.querySelectorAll("[data-team]").forEach(function (a) {
      a.onclick = function (e) { e.preventDefault(); st.team = a.dataset.team; go("matches"); };
    });
  }
  function th(k, l) { return '<th class="n sort' + (st.sort === k ? " on" : "") + '" data-k="' + k + '">' + l + (st.sort === k ? (st.dir < 0 ? " ↓" : " ↑") : "") + '</th>'; }

  // ---------- stats (full match) and 1H stats ----------
  function stats() { G = GF; out.innerHTML = totals('Both teams added together, per game, across all ' + GF.length + ' cup games (full match). The over line is the half-point next to the average, with how often the game went over it.'); }
  function firstHalf() {
    G = G1;
    // first-half share of goals and throw-ins, as pills above the tables
    function share(k) { var a = 0, b = 0; G1.forEach(function (g) { a += g[k][0] + g[k][1]; }); GF.forEach(function (g) { if (g.h1) b += g[k][0] + g[k][1]; }); return [a / G1.length, (b - a) / G1.length, b ? a / b : 0]; }
    var sg = share("goals"), st_ = share("ti");
    var p = '<div class="facts">' +
      '<span class="fact"><b>' + pct(sg[2]) + '</b> of goals in the first half: ' + f1(sg[0]) + ' per game before the break, ' + f1(sg[1]) + ' after (a league season is usually nearer 45%)</span>' +
      '<span class="fact"><b>' + pct(st_[2]) + '</b> of throw-ins in the first half: ' + f1(st_[0]) + ' per game before the break, ' + f1(st_[1]) + ' after</span>' +
      '</div>';
    var h = p + totals('First half only (to the half-time whistle, stoppage time included), both teams added together, across ' + G1.length + ' games. Cards are those shown before half-time, counted the same way: yellow 1, straight red 2, second yellow 3.');
    h += '<h2>First half by tier</h2><div class="bar">' + grpSeg() + '</div><div class="scroll"><table class="tt">' + head("Tier", "Games") + '<tbody>';
    ["SL1 v SL1", "SL1 v SL2", "SL2 v SL2"].forEach(function (t) { h += avgRow(G.filter(function (g) { return tier(g) === t; }), t); });
    h += avgRow(G, '<b>All</b>') + '</tbody></table></div>';
    h += '<h2>Share of the game in the first half</h2><p class="note">First-half total as a share of the full-match total, all games together.</p><div class="scroll"><table class="tt"><thead><tr><th>Stat</th><th class="n">1st half</th><th class="n">Full match</th><th class="n">Share</th></tr></thead><tbody>';
    STATS.forEach(function (s) {
      var a = 0, b = 0; G1.forEach(function (g) { a += g[s[0]][0] + g[s[0]][1]; });
      GF.forEach(function (g) { if (g.h1) b += g[s[0]][0] + g[s[0]][1]; });
      h += '<tr><td>' + s[1] + '</td><td class="n">' + fk(s[0], a / G1.length) + '</td><td class="n">' + fk(s[0], b / G1.length) + '</td><td class="n tot">' + (b ? pct(a / b) : "–") + '</td></tr>';
    });
    out.innerHTML = h + '</tbody></table></div>';
    bindGrp(firstHalf);
  }
  function totals(note) {
    var n = G.length;
    var h = '<p class="note">' + note + '</p>';
    h += '<div class="metrics"><div class="metric"><div class="lbl">Matches</div><div class="big">' + n + '</div></div>';
    [["goals", "Goals per game"], ["xg", "xG per game"], ["co", "Corners per game"], ["sot", "SoT per game"], ["shots", "Shots per game"], ["cards", "Cards per game"]].forEach(function (m) {
      var s = 0; G.forEach(function (g) { s += g[m[0]][0] + g[m[0]][1]; });
      h += '<div class="metric"><div class="lbl">' + xl(m[1]) + '</div><div class="big">' + fk(m[0], s / n) + '</div></div>';
    });
    h += '</div>';
    h += '<div class="scroll"><table class="tt"><thead><tr><th>Stat</th><th class="n">Avg total</th><th class="n">Home</th><th class="n">Away</th><th class="n">Over line</th></tr></thead><tbody>';
    STATS.forEach(function (s) {
      var k = s[0], tot = G.map(function (g) { return g[k][0] + g[k][1]; }).sort(function (a, b) { return a - b; });
      var sum = tot.reduce(function (a, b) { return a + b; }, 0), avg = sum / n;
      var hs = 0, as = 0; G.forEach(function (g) { hs += g[k][0]; as += g[k][1]; });
      // the half-point line next to the average
      var L = Math.floor(avg) + 0.5, c = tot.filter(function (t) { return t > L; }).length;
      var ov = XG[k] ? '–' : L.toFixed(1) + ' <b style="color:var(--text);font-weight:500">' + pct(c / n) + '</b>';
      h += '<tr><td>' + s[1] + '</td><td class="n tot">' + fk(k, avg) + '</td><td class="n">' + fk(k, hs / n) + '</td><td class="n">' + fk(k, as / n) +
        '</td><td class="n muted">' + ov + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  // ---------- by tier ----------
  function avgRow(gs, label, extra) {
    var h = '<tr><td>' + label + '</td><td class="n">' + gs.length + '</td>';
    COLS().forEach(function (s) {
      var k = s[0], v = 0; gs.forEach(function (g) { v += extra ? extra(g, k) : g[k][0] + g[k][1]; });
      h += '<td class="n">' + (gs.length ? fk(k, v / gs.length) : "–") + '</td>';
    });
    return h + '</tr>';
  }
  function head(first, n) {
    var h = '<thead><tr><th>' + first + '</th><th class="n">' + n + '</th>';
    COLS().forEach(function (s) { h += '<th class="n">' + xl(SHORT[s[0]]) + '</th>'; });
    return h + '</tr></thead>';
  }
  function tiers() {
    var T = ["SL1 v SL1", "SL1 v SL2", "SL2 v SL2"];
    if (T.indexOf(st.tier) < 0) st.tier = T[0];
    var all = st.half ? G1 : GF;
    var h = '<div class="bar">' + periodSeg() + '<div class="chips" id="tch">';
    T.forEach(function (t) {
      var c = all.filter(function (g) { return tier(g) === t; }).length;
      h += '<button class="chip' + (st.tier === t ? " on" : "") + '" data-t="' + t + '">' + t + ' <span style="opacity:.7">' + c + '</span></button>';
    });
    h += '</div></div>';
    G = all.filter(function (g) { return tier(g) === st.tier; });
    if (!G.length) { out.innerHTML = h + '<p class="note">No games in this tier yet.</p>'; bindTiers(); return; }
    h += totals('SL1 = Super League clubs, SL2 = Super League 2. ' + st.tier + ' games only' + (st.half ? ', first half' : ', full match') +
      ', both teams added together, per game. The over line is the half-point next to the average, with how often the game went over it. Small samples: read them as a direction, not a rate.');
    if (st.tier === "SL1 v SL2") {
      h += '<h2>Each side</h2><p class="note">What the SL1 club and the SL2 club did on their own, home or away, per game.</p><div class="bar">' + grpSeg() + '</div>';
      h += '<div class="scroll"><table class="tt">' + head("Side", "Games") + '<tbody>';
      ["SL1", "SL2"].forEach(function (d) {
        h += avgRow(G, d + ' team', function (g, k) { return g[k][g.div[0] === d ? 0 : 1]; });
      });
      h += '</tbody></table></div>';
    }
    out.innerHTML = h;
    bindTiers();
  }
  function bindTiers() {
    bindPeriod(tiers); bindGrp(tiers);
    out.querySelectorAll("#tch .chip").forEach(function (b) { b.onclick = function () { st.tier = b.dataset.t; tiers(); }; });
  }

  // ---------- how it works ----------
  function how() {
    var dv = {}; GF.forEach(function (g) { dv[g.home] = g.div[0]; dv[g.away] = g.div[1]; });
    var sl2 = Object.keys(dv).filter(function (k) { return dv[k] === "SL2"; }).sort();
    var links = [["stats", "Stats", "per-game averages and over lines"], ["tier", "By tier", "SL1 v SL1, SL1 v SL2, SL2 v SL2"],
      ["h1", "1H stats", "the first half on its own"], ["teams", "Teams", "every club, for and against"],
      ["odds", "By odds", "stats by the favourite's price and the over 2.5 price"], ["matches", "Matches", "every game by date"]];
    var h = '<div class="doc">' +
      '<p>Every Greek Cup ' + D.season + ' league-phase game with team stats for the full match and the first half: goals, xG, xG on target, shots, shots on target, big chances, corners, fouls, goal kicks, throw-ins, goalkeeper saves and cards. The August qualifiers are not included.</p>';
    h += '<div class="facts">';
    links.forEach(function (l) { h += '<a class="fact" href="#view=' + l[0] + '" style="text-decoration:none"><b>' + l[1] + '</b>' + l[2] + '</a>'; });
    h += '</div>' +
      '<ul><li><b>All stats are 90 minutes plus stoppage time</b>, as recorded in the match stats. Extra time is not included, as it does not count in betting settlements.</li>' +
      '<li><b>xG</b> (expected goals) and <b>xG on target</b> are shown with two decimals. <b>Big chances</b> are clear scoring chances as logged for each game.</li>' +
      '<li><b>Cards</b> are counted as: yellow 1, straight red 2, a player sent off with two yellows 3. Counted from the match incidents.</li>' +
      '<li><b>Tiers</b>: SL1 = Super League clubs, SL2 = Super League 2 (' + sl2.join(", ") + '). "SL1 v SL2" counts the tie whoever is at home.</li>' +
      '<li><b>Odds</b>: 1X2 and over/under 2.5 goals before kick-off, the middle price across the bookmakers listed for each game. "Odds %" removes the margin.</li>' +
      '<li>The cup mixes Super League clubs with lower-division sides, so team averages say as much about the draw as about the team.</li></ul>' +
      '<p class="muted">Updated ' + day(D.updated) + '.</p></div>';
    out.innerHTML = h;
  }

  // ---------- tabs ----------
  var VIEWS = {matches: matches, teams: teams, stats: stats, h1: firstHalf, tier: tiers, odds: byOdds, how: how};
  function go(v) {
    if (v === "totals") v = "stats";   // old link
    if (v === "about" || v === "home") v = "how";   // old links
    st.view = VIEWS[v] ? v : "stats";   // no tab chosen: the page opens on Stats
    document.querySelectorAll("#tabs a").forEach(function (a) { a.classList.toggle("on", a.dataset.view === st.view); });
    var want = st.view === "stats" ? "" : "#view=" + st.view;
    if (location.hash !== want) history.replaceState(null, "", location.pathname + want);
    VIEWS[st.view]();
  }
  document.querySelectorAll("#tabs a").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); go(a.dataset.view); }; });
  window.addEventListener("hashchange", function () { go((location.hash.match(/view=(\w+)/) || [])[1]); });
  go((location.hash.match(/view=(\w+)/) || [])[1]);
})();
