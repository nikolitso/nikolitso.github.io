(() => {
const D = window.D, $ = s => document.querySelector(s), out = $('#out');
const LG = Object.fromEntries(D.leagues.map(l => [l.key, l]));
const dup = {}; D.leagues.forEach(l => { dup[l.country] = (dup[l.country] || 0) + 1; });
D.leagues.forEach(l => { l.label = dup[l.country] > 1 ? l.country + ' ' + l.name : l.country; });
const pct = (x, d = 1) => x == null ? '–' : (x * 100).toFixed(d) + '%';
const spct = (x, d = 1) => x == null ? '–' : (x > 0 ? '+' : '') + (x * 100).toFixed(d) + '%';
const odds = p => p ? (1 / p).toFixed(2) : '–';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const cls = x => x == null ? '' : x > 0 ? 'pos' : 'neg';
const HOME = D.women ? 'women' : 'men';
const state = {view: HOME};
try { Object.assign(state, JSON.parse(sessionStorage.getItem('pg-state2') || '{}')); } catch (e) {}
const save = () => { try { sessionStorage.setItem('pg-state2', JSON.stringify(state)); } catch (e) {} };

// both pages show men AND women: the other group's data.js is read as JSON
const OTHER = D.women ? '/football/research/data.js' : '/football/women-europe/data.js';
let D2 = null;
fetch(OTHER + '?v=' + encodeURIComponent(D.updated)).then(r => r.text()).then(t => {
  D2 = JSON.parse(t.slice(t.indexOf('=') + 1, t.lastIndexOf(';')));
  render();
}).catch(() => {});
const grp = g => (g === 'women') === !!D.women ? D : D2;
const GAP = X => Math.round((((X.pick || {}).edges || {})['1x2'] || 0.02) * 100) + '%';

// ---------- Backtest (one table per group: leagues x home wins, away wins, overs, unders) ----------
function viewLeagues(g) {
  const X = grp(g);
  if (!X) return '<p class="note">Loading…</p>';
  const c = (x, b) => x && x.n ? `<td class="n">${b ? '<b>' : ''}${x.n.toLocaleString('en-GB')}${b ? '</b>' : ''}</td><td class="n ${cls(x.roi)}">${b ? '<b>' : ''}${spct(x.roi)}${b ? '</b>' : ''}</td>` : '<td class="n">0</td><td class="n">–</td>';
  const sd = (l, k, f) => { const x = (l.sides || {})[k]; return x && x.n ? x[f] : (f === 'n' ? 0 : null); };
  const SIDE = [['home', 'Home wins'], ['away', 'Away wins'], ['over', 'Overs'], ['under', 'Unders']];
  const COLS = [['country', 'Country', l => l.country], ['name', 'League', l => l.name], ['games', 'Games', l => l.games],
    ['gap2', 'Gap 2%+', l => l.gap2]].concat(...SIDE.map(([k, t]) => [[k + 'n', t, l => sd(l, k, 'n')], [k + 'r', 'ROI', l => sd(l, k, 'roi')]]));
  const srt = state.sort || {}, col = COLS.find(x => x[0] === srt.col);
  const list = X.leagues.slice();
  if (col) list.sort((p, q) => {
    const x = col[2](p), y = col[2](q);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;   // blanks always last
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * srt.dir;
  });
  const tot = k => { const n = X.leagues.reduce((s, l) => s + sd(l, k, 'n'), 0); return {n, roi: n ? X.leagues.reduce((s, l) => s + (sd(l, k, 'roi') || 0) * sd(l, k, 'n'), 0) / n : null}; };
  const games = X.leagues.reduce((s, l) => s + l.games, 0);
  const rows = list.map(l => `<tr><td>${l.country}</td><td>${l.name}</td><td class="n">${l.games.toLocaleString('en-GB')}</td>
    <td class="n">${pct(l.gap2, 0)}</td>${SIDE.map(([k]) => c((l.sides || {})[k])).join('')}</tr>`).join('');
  const head = COLS.map(([k, t], i) => `<th data-sort="${k}" class="sortable${i > 1 ? ' n' : ''}" title="Sort">${t}${srt.col === k ? (srt.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
  return `<p class="note">2023-24 to now, opening prices. <b>Gap 2%+</b>: share of games where the home or away opening price was at least 2% above the market. Then every bet at a ${GAP(X)} gap or more in each league, split into home wins, away wins, overs and unders (the draw is never bet), each with its ROI at flat stakes. One league's ROI rests on few bets; the first row is all leagues together. Click a column to sort.</p>
  <style>th.sortable{cursor:pointer;user-select:none;white-space:nowrap}th.sortable:hover{text-decoration:underline}</style>
  <table><thead><tr>${head}</tr></thead><tbody><tr class="tot"><td><b>All</b></td><td><b>${X.leagues.length} leagues</b></td><td class="n"><b>${games.toLocaleString('en-GB')}</b></td><td class="n"></td>${SIDE.map(([k]) => c(tot(k), 1)).join('')}</tr>${rows}</tbody></table>`;
}

// ---------- Backtest by gap size: men and women ----------
function gapTable(X, title) {
  if (!X) return `<h2>${title}</h2><p class="note">Loading…</p>`;
  const K = ['home', 'away', 'over', 'under'], NM = ['Home wins', 'Away wins', 'Overs', 'Unders'];
  const u = x => (x > 0 ? '+' : '') + x.toFixed(1);
  const cell = (x, b) => { const o = b ? '<b>' : '', c = b ? '</b>' : ''; return x.n ? `<td class="n">${o}${x.n.toLocaleString('en-GB')}${c}</td><td class="n ${cls(x.pl)}">${o}${u(x.pl)}${c}</td>` : '<td class="n">0</td><td class="n">–</td>'; };
  const sum = xs => xs.reduce((s, x) => ({n: s.n + x.n, pl: s.pl + x.pl}), {n: 0, pl: 0});
  const G = X.gaps || [], get = (g, k) => g[k] || {n: 0, pl: 0};
  const row = (lab, f, b) => { const a = sum(K.map(f)), o = b ? '<b>' : '', c = b ? '</b>' : ''; return `<tr${b ? ' class="tot"' : ''}><td>${o}${lab}${c}</td>${K.map(k => cell(f(k), b)).join('')}${cell(a, b)}<td class="n ${cls(a.pl)}">${o}${a.n ? spct(a.pl / a.n) : '–'}${c}</td></tr>`; };
  return `<h2>${title}</h2><table><thead><tr><th>Gap</th>${NM.map(t => `<th class="n">${t}</th><th class="n">P/L</th>`).join('')}<th class="n">All bets</th><th class="n">P/L</th><th class="n">ROI</th></tr></thead>
    <tbody>${G.map(g => row(g.lo === 10 ? '10%+' : `${g.lo}–${g.lo + 1}%`, k => get(g, k))).join('')}${row('All 2%+', k => sum(G.map(g => get(g, k))), 1)}</tbody></table>`;
}
function calTable(X, title) {
  if (!X) return '';
  const G = (X.gaps || []).filter(g => g.cal), K = ['home', 'away', 'over', 'under'];
  if (!G.length) return '';
  const pl = g => K.reduce((s, k) => s + ((g[k] || {}).pl || 0), 0);
  const row = (lab, c, p, b) => { const o = b ? '<b>' : '', e = b ? '</b>' : ''; return !c.n ? '' : `<tr${b ? ' class="tot"' : ''}><td>${o}${lab}${e}</td><td class="n">${o}${c.n.toLocaleString('en-GB')}${e}</td><td class="n">${o}${pct(c.exp / c.n)}${e}</td><td class="n">${o}${pct(c.won / c.n)}${e}</td><td class="n">${o}${spct(c.gap / c.n)}${e}</td><td class="n ${cls(p)}">${o}${spct(p / c.n)}${e}</td><td class="n">${o}${(p / c.gap * 100).toFixed(0)}%${e}</td></tr>`; };
  const sum = gs => [gs.reduce((s, g) => ({n: s.n + g.cal.n, gap: s.gap + g.cal.gap, exp: s.exp + g.cal.exp, won: s.won + g.cal.won}), {n: 0, gap: 0, exp: 0, won: 0}), gs.reduce((s, g) => s + pl(g), 0)];
  const GR = [['2–4%', g => g.lo < 4], ['4–8%', g => g.lo >= 4 && g.lo < 8], ['8%+', g => g.lo >= 8], ['All 2%+', () => true]];
  return `<h2>${title}</h2><table><thead><tr><th>Gap</th><th class="n">Bets</th><th class="n">Wins expected</th><th class="n">Wins actual</th><th class="n">Gap promised</th><th class="n">ROI</th><th class="n">Share kept</th></tr></thead>
    <tbody>${GR.map(([lab, f], i) => row(lab, ...sum(G.filter(f)), i === 3)).join('')}</tbody></table>`;
}
function viewGaps() {
  const M = grp('men'), W = grp('women');
  return `<p class="note">2023-24 to now, opening prices. Every bet with a gap of 2% or more, grouped by the size of the gap: the best price against the market's margin-free price. For each side: the number of bets and the profit or loss in units at 1 unit a bet. The draw is never bet.</p>
  ${gapTable(M, `Men${M ? ' · ' + M.leagues.length + ' leagues' : ''}`)}
  ${gapTable(W, `Women${W ? ' · ' + W.leagues.length + ' leagues' : ''}`)}
  <p class="note" style="margin-top:34px"><b>Calibration.</b> Is the gap real? <b>Wins expected</b>: the share of bets the market's margin-free price says should win. <b>Wins actual</b>: the share that did. If the two match, the market price is right and the bet earns the gap. <b>Gap promised</b> is the average gap of the bets, <b>ROI</b> what they returned, <b>Share kept</b> the ROI as a share of the gap promised: 100% means the whole gap was earned.</p>
  ${calTable(M, 'Calibration · men')}
  ${calTable(W, 'Calibration · women')}`;
}

// ---------- How it works ----------
function viewHow() {
  const M = grp('men'), W = grp('women'), names = X => X.leagues.map(l => l.country + ' ' + l.name).join(', ');
  return `<div class="prose">
  <h2>What this is</h2>
  <p>A search for wrong prices in European football. Two markets: the match result (home or away win; the draw is never bet) and over/under 2.5 goals.</p>
  ${M ? `<p><b>Men, ${M.leagues.length} leagues</b>: ${names(M)}.</p>` : ''}
  ${W ? `<p><b>Women, ${W.leagues.length} leagues</b>: ${names(W)}.</p>` : ''}
  <h2>The gap</h2>
  <p>Take the market's price: the odds of about 20 books with their margin removed (the power method, which puts more of the margin on longshots, as books do). Take the best price on offer at the same moment. The gap is best price × market chance − 1. No model and no team ratings: the market itself is the yardstick.</p>
  <h2>The backtest</h2>
  <p>Every game from 2023-24 to now, at opening prices. Each time the gap on a home win, an away win, over 2.5 or under 2.5 was at least ${GAP(D)}, one unit is bet on it at the best price. The tables show those bets per league and side, with the ROI. One league's numbers rest on few bets, so the row for all leagues together is the one to read. The Backtest tab groups the same bets by the size of the gap, from 2–3% up to 10% and more, with the profit or loss of each group, and a calibration table: the share of bets the market price said would win against the share that did, and the ROI against the gap promised.</p>
  <h2>Why it can work</h2>
  <p>Some prices open before the market settles, or are shaded, and for a while stand above it. They are corrected quickly: at closing prices the gap is much smaller, so it has to be taken early.</p>
  <h2>Betting rules</h2>
  <p>None yet. These pages are the test results; the rules for picks will be set later from them.</p>
  <h2>What was tried and dropped</h2>
  <p>An xG team model and detailed match data (lineups, missing starters, finishing, set pieces, rest, squad value) were tested against the opening price. None of them added anything the price did not already know, so they are not used.</p>
  <h2>Data</h2>
  <p>Opening and closing odds from a public odds feed. Updated three times a day.</p>
  </div>`;
}

const VIEWS = ['backtest', 'men', 'women', 'how'];
function render() {
  document.querySelectorAll('#tabs a[data-view]').forEach(a => a.classList.toggle('on', a.dataset.view === state.view));
  const X = state.view === 'men' || state.view === 'women' ? grp(state.view) : null;
  $('#sub').textContent = (X ? `${X.leagues.length} leagues · ${X.leagues.reduce((s, l) => s + l.games, 0).toLocaleString('en-GB')} games tested, 2023-24 to now · ` : '') + `updated ${D.updated.replace('T', ' ').replace('Z', ' UTC')}`;
  out.innerHTML = state.view === 'how' ? viewHow() : state.view === 'backtest' ? viewGaps() : viewLeagues(state.view);
  save();
}
out.addEventListener('click', e => {
  const t = e.target.closest('[data-sort]');
  if (!t) return;
  const k = t.dataset.sort, s = state.sort || {};
  state.sort = {col: k, dir: s.col === k ? -s.dir : (k === 'country' || k === 'name' ? 1 : -1)};
  render();
});
function route() {
  const m = location.hash.match(/view=(\w+)/);
  state.view = m && VIEWS.includes(m[1]) ? m[1] : 'backtest';      // no hash and old links (picks, upcoming, leagues) land on the Backtest tab
  render();
}
window.addEventListener('hashchange', route);
route();
})();
