(function () {
  var D = window.CUP, GF = D.games;
  var STATS = [
    ["goals", "Goals"], ["shots", "Shots"], ["sot", "Shots on target"], ["fouls", "Fouls"],
    ["gk", "Goal kicks"], ["ti", "Throw-ins"], ["sv", "Goalkeeper saves"], ["cards", "Cards"]
  ];
  var SHORT = {goals: "Goals", shots: "Shots", sot: "SoT", fouls: "Fouls", gk: "Goal kicks", ti: "Throw-ins", sv: "Saves", cards: "Cards"};
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
  var st = {view: "matches", round: "all", team: "", side: "for", sort: "goals", dir: -1, half: false};
  function periodSeg() {
    return '<div class="seg" id="per"><button data-p="0"' + (st.half ? '' : ' class="on"') + '>Full match</button><button data-p="1"' + (st.half ? ' class="on"' : '') + '>1st half</button></div>';
  }
  function bindPeriod(fn) {
    out.querySelectorAll("#per button").forEach(function (b) { b.onclick = function () { st.half = b.dataset.p === "1"; fn(); }; });
  }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function day(iso) { var d = new Date(iso + "T12:00:00"); return DAY[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function pct(x) { return Math.round(x * 100) + "%"; }
  function rounds() { var r = {}; G.forEach(function (g) { r[g.round] = 1; }); return Object.keys(r).map(Number).sort(function (a, b) { return b - a; }); }

  var last = GF.reduce(function (m, g) { return g.date > m ? g.date : m; }, "");
  document.getElementById("sub").textContent = "Season " + D.season + " · " + GF.length + " games · last game " + day(last);

  // ---------- matches ----------
  function matches() {
    G = st.half ? G1 : GF;
    var h = '<div class="bar">' + periodSeg() + '<div class="chips" id="rch">';
    h += '<button class="chip' + (st.round === "all" ? " on" : "") + '" data-r="all">All rounds</button>';
    rounds().forEach(function (r) { h += '<button class="chip' + (st.round == r ? " on" : "") + '" data-r="' + r + '">Round ' + r + '</button>'; });
    h += '</div>';
    if (st.team) h += '<button class="chip on" id="clr">' + esc(st.team) + ' &times;</button>';
    h += '</div>';
    rounds().forEach(function (r) {
      if (st.round !== "all" && st.round != r) return;
      var gs = G.filter(function (g) { return g.round === r && (!st.team || g.home === st.team || g.away === st.team); })
        .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      if (!gs.length) return;
      h += '<h2 class="day">Round ' + r + '</h2><div class="grid">';
      gs.forEach(function (g) { h += card(g); });
      h += '</div>';
    });
    out.innerHTML = h;
    bindPeriod(matches);
    out.querySelectorAll("#rch .chip").forEach(function (b) { b.onclick = function () { st.round = b.dataset.r; matches(); }; });
    var c = document.getElementById("clr"); if (c) c.onclick = function () { st.team = ""; matches(); };
    out.querySelectorAll("[data-team]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); st.team = a.dataset.team; matches(); }; });
  }

  function card(g) {
    var h = '<div class="card mc"><div class="meta">' + day(g.date) + ' · ' + tierHA(g) + (g.half ? ' · <span style="color:var(--gold)">1st half</span>' : '') + '</div><div class="row">';
    h += '<a class="tm" href="#" data-team="' + esc(g.home) + '" style="color:inherit;text-decoration:none">' + esc(g.home) + '</a>';
    h += '<span class="sc">' + g.goals[0] + ' – ' + g.goals[1] + '</span>';
    h += '<a class="tm" href="#" data-team="' + esc(g.away) + '" style="color:inherit;text-decoration:none;text-align:right">' + esc(g.away) + '</a></div><table>';
    STATS.slice(1).forEach(function (s) {
      var v = g[s[0]], t = v[0] + v[1];
      var a = t ? v[0] / t * 100 : 50;
      h += '<tr><td class="n h' + (v[0] < v[1] ? " lo" : "") + '"><b>' + v[0] + '</b></td><td class="lbl">' + s[1] +
        (t ? '<div class="bar2"><i style="width:' + a + '%"></i><i style="width:' + (100 - a) + '%"></i></div>' : '') +
        '</td><td class="n' + (v[1] < v[0] ? " lo" : "") + '"><b>' + v[1] + '</b></td></tr>';
    });
    return h + '</table></div>';
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
    var h = '<p class="note">Per-game averages in the cup only. <b>For</b> = what the team did, <b>Against</b> = what its opponents did, <b>Game total</b> = both sides. Click a column to sort, a team to see its games. One or two games per team, so treat these as notes, not ratings.</p>';
    h += '<div class="bar">' + periodSeg() + '<div class="seg" id="side">';
    [["for", "For"], ["against", "Against"], ["total", "Game total"]].forEach(function (s) {
      h += '<button data-s="' + s[0] + '"' + (st.side === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>';
    });
    h += '</div></div><div class="scroll"><table class="tt"><thead><tr><th>Team</th>' + th("gp", "GP") + '<th class="n">W-D-L</th>';
    STATS.forEach(function (s) { h += th(s[0], SHORT[s[0]]); });
    h += '</tr></thead><tbody>';
    rows.forEach(function (t) {
      h += '<tr><td><a href="#" data-team="' + esc(t.team) + '" style="color:inherit;text-decoration:none">' + esc(t.team) + '</a> <span class="tag">' + t.div + '</span></td><td class="n">' + t.gp +
        '</td><td class="n">' + t.w + '-' + t.d + '-' + t.l + '</td>';
      STATS.forEach(function (s) { h += '<td class="n' + (st.sort === s[0] ? " tot" : "") + '">' + f1(val(t, s[0])) + '</td>'; });
      h += '</tr>';
    });
    out.innerHTML = h + '</tbody></table></div>';
    bindPeriod(teams);
    out.querySelectorAll("#side button").forEach(function (b) { b.onclick = function () { st.side = b.dataset.s; teams(); }; });
    out.querySelectorAll("th.sort").forEach(function (c) {
      c.onclick = function () { var k = c.dataset.k; if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = -1; } teams(); };
    });
    out.querySelectorAll("[data-team]").forEach(function (a) {
      a.onclick = function (e) { e.preventDefault(); st.team = a.dataset.team; st.round = "all"; go("matches"); };
    });
  }
  function th(k, l) { return '<th class="n sort' + (st.sort === k ? " on" : "") + '" data-k="' + k + '">' + l + (st.sort === k ? (st.dir < 0 ? " ↓" : " ↑") : "") + '</th>'; }

  // ---------- stats (full match) and 1H stats ----------
  function stats() { G = GF; out.innerHTML = totals('Both teams added together, per game, across all ' + GF.length + ' cup games (full match). The lines are the half-points either side of the average, with how often the game went over.'); }
  function firstHalf() {
    G = G1;
    var h = totals('First half only (to the half-time whistle, stoppage time included), both teams added together, across ' + G1.length + ' games. Cards are those shown before half-time, counted the same way: yellow 1, straight red 2, second yellow 3.');
    h += '<h2>First half by tier</h2><div class="scroll"><table class="tt">' + head("Tier", "Games") + '<tbody>';
    ["SL1 v SL1", "SL1 v SL2", "SL2 v SL2"].forEach(function (t) { h += avgRow(G.filter(function (g) { return tier(g) === t; }), t); });
    h += avgRow(G, '<b>All</b>') + '</tbody></table></div>';
    h += '<h2>Share of the game in the first half</h2><p class="note">First-half total as a share of the full-match total, all games together.</p><div class="scroll"><table class="tt"><thead><tr><th>Stat</th><th class="n">1st half</th><th class="n">Full match</th><th class="n">Share</th></tr></thead><tbody>';
    STATS.forEach(function (s) {
      var a = 0, b = 0; G1.forEach(function (g) { a += g[s[0]][0] + g[s[0]][1]; });
      GF.forEach(function (g) { if (g.h1) b += g[s[0]][0] + g[s[0]][1]; });
      h += '<tr><td>' + s[1] + '</td><td class="n">' + f1(a / G1.length) + '</td><td class="n">' + f1(b / G1.length) + '</td><td class="n tot">' + (b ? pct(a / b) : "–") + '</td></tr>';
    });
    out.innerHTML = h + '</tbody></table></div>';
  }
  function totals(note) {
    var n = G.length;
    var h = '<p class="note">' + note + '</p>';
    h += '<div class="metrics">';
    [["goals", "Goals per game"], ["shots", "Shots per game"], ["cards", "Cards per game"]].forEach(function (m) {
      var s = 0; G.forEach(function (g) { s += g[m[0]][0] + g[m[0]][1]; });
      h += '<div class="metric"><div class="lbl">' + m[1] + '</div><div class="big">' + f1(s / n) + '</div></div>';
    });
    var hw = G.filter(function (g) { return g.goals[0] > g.goals[1]; }).length, dr = G.filter(function (g) { return g.goals[0] === g.goals[1]; }).length;
    h += '<div class="metric"><div class="lbl">Home / draw / away (' + (G === G1 ? 'half-time' : '90 min') + ')</div><div class="big">' + hw + ' / ' + dr + ' / ' + (n - hw - dr) + '</div></div></div>';
    h += '<div class="scroll"><table class="tt"><thead><tr><th>Stat</th><th class="n">Avg total</th><th class="n">Home</th><th class="n">Away</th><th class="n">Low</th><th class="n">Median</th><th class="n">High</th><th class="n">Over lines</th></tr></thead><tbody>';
    STATS.forEach(function (s) {
      var k = s[0], tot = G.map(function (g) { return g[k][0] + g[k][1]; }).sort(function (a, b) { return a - b; });
      var sum = tot.reduce(function (a, b) { return a + b; }, 0), avg = sum / n;
      var hs = 0, as = 0; G.forEach(function (g) { hs += g[k][0]; as += g[k][1]; });
      var med = n % 2 ? tot[(n - 1) / 2] : (tot[n / 2 - 1] + tot[n / 2]) / 2;
      var base = Math.floor(avg) + 0.5, lines = [base - 1, base, base + 1].filter(function (x) { return x > 0; });
      var ov = lines.map(function (L) {
        var c = tot.filter(function (t) { return t > L; }).length;
        return '<span style="display:inline-block;min-width:96px">' + L.toFixed(1) + ' <b style="color:var(--text);font-weight:500">' + pct(c / n) + '</b></span>';
      }).join("");
      h += '<tr><td>' + s[1] + '</td><td class="n tot">' + f1(avg) + '</td><td class="n">' + f1(hs / n) + '</td><td class="n">' + f1(as / n) +
        '</td><td class="n">' + tot[0] + '</td><td class="n">' + med + '</td><td class="n">' + tot[n - 1] + '</td><td class="n muted">' + ov + '</td></tr>';
    });
    h += '</tbody></table></div>';

    h += '<h2>Highest and lowest games</h2><div class="scroll"><table class="tt"><thead><tr><th>Stat</th><th>Highest</th><th>Lowest</th></tr></thead><tbody>';
    STATS.forEach(function (s) {
      var k = s[0], srt = G.slice().sort(function (a, b) { return (b[k][0] + b[k][1]) - (a[k][0] + a[k][1]); });
      var hi = srt[0], lo = srt[srt.length - 1];
      h += '<tr><td>' + s[1] + '</td><td class="wr">' + gm(hi, k) + '</td><td class="wr">' + gm(lo, k) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function gm(g, k) { return '<b style="color:var(--gold);font-weight:500;font-family:var(--mono)">' + (g[k][0] + g[k][1]) + '</b> <span class="muted">·</span> ' + esc(g.home) + ' ' + g.goals[0] + '–' + g.goals[1] + ' ' + esc(g.away) + ' <span class="muted">(' + (g.half ? 'HT, ' : '') + 'R' + g.round + ')</span>'; }

  // ---------- by tier ----------
  function avgRow(gs, label, extra) {
    var h = '<tr><td>' + label + '</td><td class="n">' + gs.length + '</td>';
    STATS.forEach(function (s) {
      var k = s[0], v = 0; gs.forEach(function (g) { v += extra ? extra(g, k) : g[k][0] + g[k][1]; });
      h += '<td class="n">' + (gs.length ? f1(v / gs.length) : "–") + '</td>';
    });
    return h + '</tr>';
  }
  function head(first, n) {
    var h = '<thead><tr><th>' + first + '</th><th class="n">' + n + '</th>';
    STATS.forEach(function (s) { h += '<th class="n">' + SHORT[s[0]] + '</th>'; });
    return h + '</tr></thead>';
  }
  function tiers() {
    G = GF;
    var T = ["SL1 v SL1", "SL1 v SL2", "SL2 v SL2"];
    var h = '<p class="note">SL1 = Super League clubs, SL2 = Super League 2. All figures are per game and add both teams together unless the column says home, away or side. Small samples: read them as a direction, not a rate.</p>';

    h += '<h2>Game totals by tier</h2><div class="scroll"><table class="tt">' + head("Tier", "Games") + '<tbody>';
    T.forEach(function (t) { h += avgRow(G.filter(function (g) { return tier(g) === t; }), t); });
    h += avgRow(G, '<b>All</b>') + '</tbody></table></div>';

    h += '<h2>Home and away by tier</h2><p class="note">Home side first: "SL2 v SL1" means the Super League 2 club was at home. Each cell is home – away.</p>';
    h += '<div class="scroll"><table class="tt">' + head("Home v away", "Games") + '<tbody>';
    ["SL1 v SL1", "SL1 v SL2", "SL2 v SL1", "SL2 v SL2", "All"].forEach(function (t) {
      var gs = G.filter(function (g) { return t === "All" || tierHA(g) === t; });
      h += '<tr><td>' + (t === "All" ? "<b>All</b>" : t) + '</td><td class="n">' + gs.length + '</td>';
      STATS.forEach(function (s) {
        var a = 0, b = 0; gs.forEach(function (g) { a += g[s[0]][0]; b += g[s[0]][1]; });
        h += '<td class="n">' + (gs.length ? f1(a / gs.length) + ' <span class="muted">–</span> ' + f1(b / gs.length) : "–") + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';

    var mixed = G.filter(function (g) { return tier(g) === "SL1 v SL2"; });
    h += '<h2>Super League v Super League 2 ties: each side</h2><p class="note">The ' + mixed.length + ' mixed ties split by the division of each team: what the SL1 club did and what the SL2 club did, home or away.</p>';
    h += '<div class="scroll"><table class="tt">' + head("Side", "Games") + '<tbody>';
    ["SL1", "SL2"].forEach(function (d) {
      h += avgRow(mixed, d + ' team', function (g, k) { return g[k][g.div[0] === d ? 0 : 1]; });
    });
    out.innerHTML = h + '</tbody></table></div>';
  }

  // ---------- about ----------
  function about() {
    out.innerHTML = '<div class="doc">' +
      '<p>Every Greek Cup ' + D.season + ' main-draw game (from Round 1, 1 September) with team stats for the full match and the first half: goals, shots, shots on target, fouls, goal kicks, throw-ins, goalkeeper saves and cards. The August qualifying rounds are not included.</p>' +
      '<ul><li>Score is after 90 minutes plus stoppage time, as recorded in the match stats.</li>' +
      '<li><b>Cards</b> are counted as: yellow 1, straight red 2, a player sent off with two yellows 3. Counted from the match incidents. The only red so far: PAOK v OFI, 2 Sep, a straight red in stoppage time (no second yellows yet).</li>' +
      '<li><b>Tiers</b>: SL1 = the 14 Super League clubs of 2026-27, SL2 = Super League 2 (Panserraikos, Niki Volos, AEL Larissa, Marko, Chrisoupolis). "SL1 v SL2" counts the tie whoever is at home; the home/away table keeps the home side first.</li>' +
      '<li>AEK 8-1 Panserraikos (17 Sep) is listed under Round 2, as published.</li>' +
      '<li>The cup mixes Super League clubs with lower-division sides, so team averages say as much about the draw as about the team.</li></ul>' +
      '<p class="muted">Updated ' + day(D.updated) + '.</p></div>';
  }

  // ---------- tabs ----------
  var VIEWS = {matches: matches, teams: teams, stats: stats, h1: firstHalf, tier: tiers, about: about};
  function go(v) {
    if (v === "totals") v = "stats";   // old link
    st.view = VIEWS[v] ? v : "matches";
    document.querySelectorAll("#tabs a").forEach(function (a) { a.classList.toggle("on", a.dataset.view === st.view); });
    if (location.hash !== "#view=" + st.view) history.replaceState(null, "", "#view=" + st.view);
    VIEWS[st.view]();
  }
  document.querySelectorAll("#tabs a").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); go(a.dataset.view); }; });
  window.addEventListener("hashchange", function () { go((location.hash.match(/view=(\w+)/) || [])[1]); });
  go((location.hash.match(/view=(\w+)/) || [])[1]);
})();
