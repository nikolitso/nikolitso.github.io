(() => {
const D = window.D, $ = s => document.querySelector(s), out = $('#out');
const L = D.leagues;
const pct = (x, d = 1) => x == null ? '–' : (x * 100).toFixed(d) + '%';
const spct = (x, d = 1) => x == null ? '–' : (x > 0 ? '+' : '') + (x * 100).toFixed(d) + '%';
const num = n => n.toLocaleString('en-GB');
const cls = x => x == null ? '' : x > 0 ? 'pos' : 'neg';
const GAP0 = Math.round((((D.pick || {}).edges || {})['1x2'] || 0.02) * 100);
// the betting rule: minimum gap and league groups (1 top divisions, 2 lower divisions)
const RULE = D.rule || {gap: 0.08, odds_above: 1.5, tiers: [1, 2], since: '2026-11-10'}, RG = Math.round(RULE.gap * 100);
const RO = RULE.odds_above || 0, ROT = RO.toFixed(2), RMIN = RO ? Math.round(RO * 100 + 1) / 100 : null;     // prices of RO or below are skipped

// ---------- the bets: one entry per backtest bet, filtered and grouped here ----------
const B = D.bets, N = B.l.length;
const Q = new Float32Array(N), P = new Float32Array(N);        // market chance, profit at 1 unit
for (let i = 0; i < N; i++) { Q[i] = (1 + B.g[i] / 1000) / (B.o[i] / 100); P[i] = B.w[i] ? B.o[i] / 100 - 1 : -1; }
const YRS = [...new Set(B.y)].sort((a, b) => a - b);
const season = y => `${2023 + y}-${24 + y}`;
const SIDES = ['Home wins', 'Away wins', 'Overs', 'Unders'];
const GAPS = [2, 3, 4, 5, 6, 8, 10];
const GROUPS = [['all', 'All', () => true],
  ['top', 'Top divisions', t => t === 1], ['low', 'Lower divisions', t => t === 2]];
const TIER = ['', 'Top divisions', 'Lower divisions'];
const MIN = 100;                                               // fewer bets than this: numbers greyed

const state = {view: 'picks', f: {gap: RG, od: [[RMIN, null], [RMIN, null], [RMIN, null], [RMIN, null]], lg: 'all', side: [1, 1, 1, 1]}};     // the filters start on the betting rule
try { Object.assign(state, JSON.parse(sessionStorage.getItem('pg-state8') || '{}')); } catch (e) {}
const save = () => { try { sessionStorage.setItem('pg-state8', JSON.stringify(state)); } catch (e) {} };

function index(noGap) {                                        // bets that pass the filters (noGap: ignore the gap filter)
  const f = state.f, g = GROUPS.find(x => x[0] === f.lg) || GROUPS[0], idx = [];
  for (let i = 0; i < N; i++) {
    const r = f.od[B.s[i]], o = B.o[i];                          // odds range of the bet's own selection
    if ((noGap || B.g[i] >= f.gap * 10) && (r[0] == null || o >= r[0] * 100 - 1e-6) && (r[1] == null || o <= r[1] * 100 + 1e-6) && f.side[B.s[i]] && g[2](L[B.l[i]].tier)) idx.push(i);
  }
  return idx;
}
function agg(idx, pred) {
  const a = {n: 0, pl: 0, exp: 0, won: 0, gap: 0, sq: 0, y: YRS.map(() => ({n: 0, pl: 0})), s: SIDES.map(() => ({n: 0, pl: 0}))};
  for (const i of idx) {
    if (pred && !pred(i)) continue;
    a.n++; a.pl += P[i]; a.sq += P[i] * P[i]; a.exp += Q[i]; a.won += B.w[i]; a.gap += B.g[i] / 1000;
    const y = a.y[YRS.indexOf(B.y[i])]; y.n++; y.pl += P[i];
    const s = a.s[B.s[i]]; s.n++; s.pl += P[i];
  }
  a.roi = a.n ? a.pl / a.n : null;
  a.se = a.n > 1 ? Math.sqrt(Math.max(a.sq / a.n - a.roi * a.roi, 0) / a.n) : null;
  return a;
}
const units = x => (x > 0 ? '+' : '') + x.toFixed(1);
const roiCell = (x, min = MIN) => !x.n ? '<td class="n mut">–</td>' : `<td class="n ${x.n < min ? 'mut' : cls(x.pl)}" title="${num(x.n)} bets">${spct(x.pl / x.n)}</td>`;

// one row of numbers for a group of bets: size, calibration, result, and the ROI of each season
const HEAD = () => `<th class="n">Bets</th><th class="n">EV%</th><th class="n">ROI</th><th class="n">±</th><th class="n">P/L</th>${YRS.map(y => `<th class="n">${season(y)}</th>`).join('')}`;
function cells(a) {
  if (!a.n) return `<td class="n">0</td>${'<td class="n mut">–</td>'.repeat(4 + YRS.length)}`;
  const m = a.n < MIN;
  return `<td class="n">${num(a.n)}</td><td class="n">${pct(a.gap / a.n)}</td><td class="n ${m ? 'mut' : cls(a.pl)}">${spct(a.roi)}</td><td class="n mut">${a.se == null ? '–' : (a.se * 100).toFixed(1)}</td>
    <td class="n ${m ? 'mut' : cls(a.pl)}">${units(a.pl)}</td>${a.y.map(y => roiCell(y, 50)).join('')}`;
}
function table(title, first, rows, idx, total) {
  const body = rows.map(([lab, pred]) => { const a = agg(idx, pred); return a.n ? `<tr><td>${lab}</td>${cells(a)}</tr>` : ''; }).join('');
  return `<h2>${title}</h2><table><thead><tr><th>${first}</th>${HEAD()}</tr></thead><tbody>${body}${total ? `<tr class="tot"><td><b>${total}</b></td>${cells(agg(idx))}</tr>` : ''}</tbody></table>`;
}

function filters() {
  const f = state.f, chip = (k, v, t, on) => `<button class="chip${on ? ' on' : ''}" data-f="${k}" data-v="${v}">${t}</button>`;
  return `<style>.od{display:inline-flex;align-items:center;gap:6px;font:500 13.5px var(--mono);color:var(--muted);margin-right:10px}.od.off{opacity:.4}.od input{width:62px;background:none;border:1px solid var(--line);border-radius:8px;color:var(--text);font:500 13.5px var(--mono);padding:4px 6px}.od input:focus{outline:none;border-color:var(--gold)}</style>
  <div class="flt"><span class="fl">EV%</span><div class="chips">${GAPS.filter(g => g >= GAP0).map(g => chip('gap', g, g + '%', f.gap === g)).join('')}</div></div>
  <div class="flt"><span class="fl">Leagues</span><div class="chips">${GROUPS.map(([k, t]) => chip('lg', k, t, f.lg === k)).join('')}</div></div>
  <div class="flt"><span class="fl">Bets on</span><div class="chips">${SIDES.map((t, i) => chip('side', i, t, f.side[i])).join('')}</div></div>
  <div class="flt"><span class="fl">Odds range</span><div class="chips">${SIDES.map((t, i) => `<label class="od${f.side[i] ? '' : ' off'}">${t} ${[0, 1].map(k => `<input type="number" min="1" step="0.05" inputmode="decimal" placeholder="${k ? 'max' : 'min'}" aria-label="${t}, ${k ? 'highest' : 'lowest'} odds" data-od="${i}" data-k="${k}" value="${f.od[i][k] == null ? '' : f.od[i][k]}">`).join('<span>–</span>')}</label>`).join('')}</div></div>`;
}

// ---------- Backtest ----------
function viewBacktest() {
  const idx = index(), all = agg(idx), f = state.f;
  const fact = (b, t) => `<span class="fact"><b>${b}</b>${t}</span>`;
  const pills = all.n ? `<div class="facts">${fact(num(all.n), 'bets')}${fact(spct(all.roi), 'ROI')}${fact(units(all.pl), 'units P/L')}</div>` : '<p class="note">No bets pass these filters.</p>';
  const band = (lo, hi) => i => B.g[i] >= lo * 10 && B.g[i] < hi * 10, ob = (lo, hi) => i => B.o[i] >= lo * 100 && B.o[i] < hi * 100;
  const GB = [[2, 3], [3, 4], [4, 5], [5, 6], [6, 8], [8, 10], [10, 15], [15, 999]].filter(([lo]) => lo >= GAP0);
  const OB = [[1, 1.5], [1.5, 1.8], [1.8, 2.1], [2.1, 2.5], [2.5, 3], [3, 4], [4, 6], [6, 999]];
  // side columns only for the sides chosen, and none when one side is chosen (they would repeat the total)
  const on = f.side.filter(x => x).length > 1 ? SIDES.map((t, k) => k).filter(k => f.side[k]) : [];
  const bySeason = YRS.map(y => { const a = agg(idx, i => B.y[i] === y); return `<tr><td>${season(y)}</td>${a.s.map((s, k) => on.includes(k) ? `<td class="n">${num(s.n)}</td>${roiCell(s)}` : '').join('')}<td class="n">${num(a.n)}</td><td class="n ${a.n < MIN ? 'mut' : cls(a.pl)}">${units(a.pl)}</td>${roiCell(a)}</tr>`; }).join('');
  return `<p class="note">2023-24 to now, opening prices, 1 unit a bet. Every bet with an EV of ${GAP0}% or more: the best price against the market's margin-free price. The draw is never bet. The filters start on the betting rule (EV of ${RG}% or more, prices above ${ROT}); change them to compare other rules: every table below is recounted.</p>
  ${filters()}
  ${pills}
  <h2>By season</h2><table><thead><tr><th>Season</th>${on.map(k => `<th class="n">${SIDES[k]}</th><th class="n">ROI</th>`).join('')}<th class="n">All bets</th><th class="n">P/L</th><th class="n">ROI</th></tr></thead><tbody>${bySeason}</tbody></table>
  ${on.length ? table('By side', 'Bets on', SIDES.map((t, s) => [t, i => B.s[i] === s]), idx, 'All') : ''}
  ${f.lg !== 'all' ? '' : table('By league group', 'Leagues', TIER.map((t, k) => [t, i => L[B.l[i]].tier === k]), idx, 'All')}
  ${table('By odds', 'Odds', OB.map(([lo, hi]) => [hi > 100 ? lo.toFixed(2) + '+' : lo === 1 ? `Under ${hi.toFixed(2)}` : `${lo.toFixed(2)}–${(hi - 0.01).toFixed(2)}`, ob(lo, hi)]), idx, 'All')}
  ${table('By EV%', 'EV%', GB.map(([lo, hi]) => [hi > 100 ? lo + '%+' : `${lo}–${hi}%`, band(lo, hi)]), idx, 'All')}
  <p class="note" style="margin-top:26px"><b>How to read.</b> <b>EV%</b>: the average EV of the bets, what they promise. <b>ROI</b>: what they returned at flat stakes. <b>±</b>: one standard error of the ROI in points; a ROI smaller than about twice it cannot be told from zero. The season columns show the ROI of each season: a rule worth using is positive in all of them. Seasons played inside one calendar year count with the season that starts that year. Grey numbers rest on fewer than ${MIN} bets (50 for one season). The <b>EV%</b> filter is the smallest EV a bet must have. <b>Odds range</b>: the lowest and highest price allowed, set for each selection on its own; an empty box means no limit.</p>`;
}

// ---------- Picks: live bets of the rule ----------
function viewPicks() {
  const key = {}; L.forEach(l => key[l.key] = l);
  const ps = (D.picks || []).filter(p => key[p.lg] && RULE.tiers.includes(key[p.lg].tier) && p.edge + 1e-9 >= RULE.gap && p.odds > RO + 1e-9 && p.posted.slice(0, 10) >= RULE.since);
  const open = ps.filter(p => !p.result), done = ps.filter(p => p.result).reverse();
  const won = done.filter(p => p.result === 'W').length, pl = done.reduce((s, p) => s + p.profit, 0);
  const bt = agg((() => { const o = []; for (let i = 0; i < N; i++) if (B.g[i] >= RG * 10 && B.o[i] > RO * 100 + 1e-6 && RULE.tiers.includes(L[B.l[i]].tier)) o.push(i); return o; })());
  const fact = (b, t) => `<span class="fact"><b>${b}</b>${t}</span>`;
  const when = s => new Date(s).toLocaleString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
  const bet = p => p.market === '1x2' ? (p.sel === 0 ? p.home : p.away) + ' to win' : (p.sel === 0 ? 'Over' : 'Under') + ' 2.5 goals';
  const row = (p, d) => `<tr><td>${when(p.dt)}</td><td>${key[p.lg].country} · ${key[p.lg].name}</td><td>${p.home} – ${p.away}</td><td><b>${bet(p)}</b></td><td class="n">${p.odds.toFixed(2)}</td><td class="n">${pct(p.prob, 0)}</td><td class="n">${spct(p.edge)}</td>${d ? `<td class="n">${p.score}</td><td class="n ${cls(p.profit)}">${p.result === 'W' ? 'Won' : 'Lost'}</td><td class="n ${cls(p.profit)}">${(p.profit > 0 ? '+' : '') + p.profit.toFixed(2)}</td>` : ''}</tr>`;
  const head = d => `<thead><tr><th>Kick-off</th><th>League</th><th>Game</th><th>Bet</th><th class="n">Price</th><th class="n">Chance</th><th class="n">EV%</th>${d ? '<th class="n">Score</th><th class="n">Result</th><th class="n">P/L</th>' : ''}</tr></thead>`;
  return `<p class="note"><b>The rule.</b> Bet when the best price is ${RG}% or more above the market's margin-free price, on a home win, an away win, over 2.5 or under 2.5 goals. Prices of ${ROT} or below are skipped. One unit a bet. Picks are logged from ${new Date(RULE.since).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}.</p>
  <div class="facts">${done.length ? fact(`${won}–${done.length - won}`, 'record') + fact(spct(pl / done.length), 'ROI') : fact('0', 'settled picks')}${fact(open.length, open.length === 1 ? 'open pick' : 'open picks')}${fact(spct(bt.roi), `ROI of the rule in the backtest, ${num(bt.n)} bets`)}</div>
  <h2>Open picks</h2>${open.length ? `<table class="pk">${head(0)}<tbody>${open.map(p => row(p, 0)).join('')}</tbody></table>` : '<p class="note">No open picks now. Prices are checked three times a day, for games up to 8 days ahead.</p>'}
  ${done.length ? `<h2>Settled picks</h2><table class="pk">${head(1)}<tbody>${done.map(p => row(p, 1)).join('')}</tbody></table>` : ''}
  <style>table.pk td{white-space:normal}table.pk td.n{white-space:nowrap}</style>
  <p class="note" style="margin-top:26px">A pick is logged the first time the EV reaches ${RG}% and keeps that price until the game is settled; one pick a game and market. <b>Chance</b>: the chance of the bet winning by the market price. Times are local. The backtest uses opening prices; a live pick is taken at the price found when the page is updated, so its results can differ from the backtest.</p>`;
}

// ---------- Leagues: the same filtered bets, league by league ----------
function viewLeagues() {
  const idx = index(), g = GROUPS.find(x => x[0] === state.f.lg) || GROUPS[0];
  const by = L.map(() => []); idx.forEach(i => by[B.l[i]].push(i));
  const list = L.map((l, k) => ({l, a: agg(by[k])})).filter(x => g[2](x.l.tier));
  const fs = state.f.side, on = fs.filter(x => x).length > 1 ? SIDES.map((t, k) => k).filter(k => fs[k]) : [];   // as in By season
  const COLS = [['country', 'Country', x => x.l.country], ['name', 'League', x => x.l.name], ['games', 'Games', x => x.l.games], ['gap2', 'EV 2%+', x => x.l.gap2]]
    .concat(...on.map(s => [['n' + s, SIDES[s], x => x.a.s[s].n], ['r' + s, 'ROI', x => x.a.s[s].n ? x.a.s[s].pl / x.a.s[s].n : null]]),
      [['n', 'All bets', x => x.a.n], ['r', 'ROI', x => x.a.roi]]);
  const srt = state.sort || {}, col = COLS.find(x => x[0] === srt.col);
  if (col) list.sort((p, q) => {
    const x = col[2](p), y = col[2](q);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;   // blanks always last
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * srt.dir;
  });
  const c = (x, b) => { const o = b ? '<b>' : '', e = b ? '</b>' : ''; return x.n ? `<td class="n">${o}${num(x.n)}${e}</td><td class="n ${x.n < MIN && !b ? 'mut' : cls(x.pl)}">${o}${spct(x.pl / x.n)}${e}</td>` : '<td class="n">0</td><td class="n mut">–</td>'; };
  const tot = agg(idx), games = list.reduce((s, x) => s + x.l.games, 0);
  const rows = list.map(x => `<tr><td>${x.l.country}</td><td>${x.l.name}</td><td class="n">${num(x.l.games)}</td><td class="n">${pct(x.l.gap2, 0)}</td>${on.map(s => c(x.a.s[s])).join('')}${c(x.a)}</tr>`).join('');
  const head = COLS.map(([k, t], i) => `<th data-sort="${k}" class="sortable${i > 1 ? ' n' : ''}" title="Sort">${t}${srt.col === k ? (srt.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
  return `<p class="note">2023-24 to now, opening prices. <b>EV 2%+</b>: share of games where the home or away opening price was at least 2% above the market. Then the bets that pass the filters in each league, split by the sides chosen, each with its ROI at flat stakes. One league's ROI rests on few bets (grey under ${MIN}) and a league's past ROI says little about its next season; the first row is all leagues together. Click a column to sort.</p>
  ${filters()}
  <style>table.lgs th,table.lgs td{padding-left:5px;padding-right:5px}th.sortable{cursor:pointer;user-select:none;white-space:nowrap}th.sortable:hover{text-decoration:underline}</style>
  <table class="lgs"><thead><tr>${head}</tr></thead><tbody><tr class="tot"><td><b>All</b></td><td><b>${list.length} leagues</b></td><td class="n"><b>${num(games)}</b></td><td class="n"></td>${on.map(s => c(tot.s[s], 1)).join('')}${c(tot, 1)}</tr>${rows}</tbody></table>`;
}

// ---------- How it works ----------
function viewHow() {
  const names = L.map(l => l.country + ' ' + l.name).join(', ');
  return `<div class="prose">
  <h2>What this is</h2>
  <p>A search for wrong prices in European football. Two markets: the match result (home or away win; the draw is never bet) and over/under 2.5 goals.</p>
  <p><b>${L.length} men's leagues</b>: ${names}.</p>
  <h2>The EV</h2>
  <p>Take the market's price: the odds of about 20 books with their margin removed (the power method, which puts more of the margin on longshots, as books do). Take the best price on offer at the same moment. The EV (expected value) is best price × market chance − 1: how far the best price stands above the market, in percent. No model and no team ratings: the market itself is the yardstick.</p>
  <h2>The backtest</h2>
  <p>Every game from 2023-24 to now, at opening prices. Each time the EV on a home win, an away win, over 2.5 or under 2.5 was at least ${GAP0}%, one unit is bet on it at the best price.</p>
  <p>The Backtest tab is built for choosing a rule. Four filters cut the bets: the minimum EV, the league group (top divisions, lower divisions), the side, and an odds range set for each side on its own. Every table is recounted for the bets that pass.</p>
  <p>Each table row shows the number of bets, the average EV they promised, the ROI, its standard error, the profit or loss, and the ROI of each season. A rule is worth using when the result holds in every season, not only in the total. The Leagues tab shows the same bets league by league; one league's numbers rest on few bets and its past ROI says little about its next season.</p>
  <h2>Why it can work</h2>
  <p>Some prices open before the market settles, or are shaded, and for a while stand above it. They are corrected quickly: at closing prices the EV is much smaller, so it has to be taken early.</p>
  <h2>Betting rules</h2>
  <p>Set on 10 November 2026 from the backtest. A bet is made when the EV is <b>${RG}% or more</b> and the price is <b>above ${ROT}</b>, on a home win, an away win, over 2.5 or under 2.5 goals, in every league on this page. One unit a bet.</p>
  <p>Why 8%. The return grows with the EV: the bigger the EV, the more the bets returned, and bets with an EV of 8% or more returned about twice as much as all bets with 2% or more. The rule made a profit in every season of the test, and when it was chosen on the first two seasons alone it returned about the same in the two that followed. It leaves fewer bets: about a quarter of those with an EV of 2% or more.</p>
  <p>Why prices of ${ROT} or below are skipped. They were the weakest part of the test: 201 bets with an EV of 8% or more returned 5.1%, against 15.2% for the rest, with one losing season. A short price leaves little room for a wrong price.</p>
  <p>Picks are logged on the Picks tab from that date: the first time a game within 8 days shows an EV of ${RG}% or more and a price above ${ROT}, at the price on offer then. The Backtest tab opens on the rule; the other filters stay so other rules can be compared with it.</p>
  <h2>What was tried and dropped</h2>
  <p>An xG team model and detailed match data (lineups, missing starters, finishing, set pieces, rest, squad value) were tested against the opening price. None of them added anything the price did not already know, so they are not used.</p>
  <p>The top divisions of England, Spain, Germany, Italy and France were tested the same way. The bets returned nothing there: 2,857 bets lost 0.7%. Those five leagues were taken out of the page and its data.</p>
  <p>Women's leagues were tested the same way. The market price there is less accurate: the bets won less often than it said and kept under half of the EV, so the women's leagues were dropped and more men's leagues added.</p>
  <h2>Data</h2>
  <p>Opening and closing odds from a public odds feed. Updated three times a day.</p>
  </div>`;
}

const VIEWS = ['picks', 'backtest', 'men', 'how'];
function render() {
  document.querySelectorAll('#tabs a[data-view]').forEach(a => a.classList.toggle('on', a.dataset.view === state.view));
  $('#sub').textContent = `${L.length} leagues · ${num(L.reduce((s, l) => s + l.games, 0))} games tested, 2023-24 to now · updated ${D.updated.replace('T', ' ').replace('Z', ' UTC')}`;
  out.innerHTML = state.view === 'how' ? viewHow() : state.view === 'picks' ? viewPicks() : state.view === 'men' ? viewLeagues() : viewBacktest();
  save();
}
out.addEventListener('click', e => {
  const c = e.target.closest('[data-f]');
  if (c) {
    const f = state.f, k = c.dataset.f, v = c.dataset.v;
    if (k === 'side') { f.side[+v] = f.side[+v] ? 0 : 1; if (!f.side.some(x => x)) f.side = [1, 1, 1, 1]; }
    else f[k] = k === 'lg' ? v : +v;
    return render();
  }
  const t = e.target.closest('[data-sort]');
  if (!t) return;
  const k = t.dataset.sort, s = state.sort || {};
  state.sort = {col: k, dir: s.col === k ? -s.dir : (k === 'country' || k === 'name' ? 1 : -1)};
  render();
});
out.addEventListener('change', e => {                          // odds range boxes
  const b = e.target.closest('[data-od]');
  if (!b) return;
  const v = parseFloat(b.value);
  state.f.od[+b.dataset.od][+b.dataset.k] = v >= 1 ? v : null;
  render();
});
function route() {
  const m = location.hash.match(/view=(\w+)/);
  state.view = m && VIEWS.includes(m[1]) ? m[1] : 'picks';         // no hash and old links (upcoming, leagues, women) land on the Picks tab
  render();
}
window.addEventListener('hashchange', route);
route();
})();
