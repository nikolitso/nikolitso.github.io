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
const SEL = {'1x2': ['Home', 'Draw', 'Away'], 'ou2.5': ['Over 2.5', 'Under 2.5']};
const MK = {'1x2': '1X2', 'ou2.5': 'Over/under 2.5'};
const state = {view: 'picks', when: 'open', lg: 'all', open: null};
try { Object.assign(state, JSON.parse(sessionStorage.getItem('pg-state') || '{}')); } catch (e) {}
if (!['picks', 'backtest', 'upcoming', 'leagues', 'how'].includes(state.view)) state.view = 'picks';
const save = () => { try { sessionStorage.setItem('pg-state', JSON.stringify(state)); } catch (e) {} };

const pk = D.pick || {}, EDG = pk.edges || {'1x2': pk.edge || 0.02, 'ou2.5': pk.edge || 0.02};
const ep = k => Math.round(EDG[k] * 100) + '%';
const same = EDG['1x2'] === EDG['ou2.5'];
const live = D.angles.filter(a => (pk.keys || []).includes(a.key));
const tested = D.leagues.reduce((s, l) => s + l.games, 0);
$('#sub').textContent = `${D.leagues.length} leagues · ${tested.toLocaleString('en-GB')} games tested, 2023-24 to now · updated ${D.updated.replace('T', ' ').replace('Z', ' UTC')}`;
const fmtK = new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens'});
const when = s => new Date(s.replace('Z', ':00Z'));
const RULE = same ? `back the best price in 1X2 or over/under 2.5 when it is at least ${ep('1x2')} above the market's margin-free price`
  : `back the best price when it is above the market's margin-free price by at least ${ep('1x2')} in 1X2 or ${ep('ou2.5')} in over/under 2.5`;

function liveSummary() {
  const n = live.reduce((s, a) => s + a.n, 0);
  if (!n) return null;
  const w = k => live.reduce((s, a) => s + (a[k] || 0) * a.n, 0) / n;
  return {n, roi: w('roi'), clv: w('clv')};
}

// ---------- Picks ----------
function viewPicks() {
  const P = D.picks || [], done = P.filter(p => p.result), open = P.filter(p => !p.result);
  const w = done.filter(p => p.result === 'W').length, prof = done.reduce((s, p) => s + p.profit, 0);
  const bt = liveSummary();
  const sel = p => SEL[p.market][p.sel] + (p.market === '1x2' ? ' (1X2)' : '');
  const row = p => `<tr><td>${fmtK.format(when(p.dt))}</td><td>${LG[p.lg] ? LG[p.lg].label : p.lg}</td><td class="wrapc">${esc(p.home)} – ${esc(p.away)}</td><td>${sel(p)}</td>
    <td class="n">${p.odds.toFixed(2)}</td><td class="n">${odds(p.prob)}</td><td class="n pos">${spct(p.edge, 1)}</td>${p.result ? `<td class="n">${p.score}</td><td class="n ${p.profit > 0 ? 'pos' : 'neg'}">${p.profit > 0 ? '+' : ''}${p.profit.toFixed(2)}</td>` : ''}</tr>`;
  const head = res => `<thead><tr><th>Kick-off</th><th>League</th><th>Game</th><th>Bet</th><th class="n">Price</th><th class="n" title="The market's margin-free price when the pick was posted">Market</th><th class="n">Gap</th>${res ? '<th class="n">Score</th><th class="n">Units</th>' : ''}</tr></thead>`;
  return `<div class="facts">
    <span class="fact">${done.length ? `<b>Record ${w}–${done.length - w}</b> · ROI ${spct(prof / done.length)}` : 'No settled picks yet'}</span>
    <span class="fact">${open.length ? `<b>${open.length}</b>open ${open.length === 1 ? 'pick' : 'picks'}` : 'No open picks'}</span>
    ${bt ? `<span class="fact"><b>${spct(bt.roi)}</b>backtest ROI, ${bt.n.toLocaleString('en-GB')} bets</span><span class="fact"><b>${spct(bt.clv)}</b>backtest CLV</span>` : ''}
  </div>
  <p class="lede">One rule: <b>${RULE}</b>. The market price is the average of about 20 books with their margin taken out. A pick is posted the first time a game reaches the gap in the 8 days before kick-off, from prices read three times a day, and keeps that price. Flat 1 unit.${same ? '' : ` In 1X2 a ${ep('ou2.5')} gap did not pass the test in these leagues (break-even in 2023-25); ${ep('1x2')} did.`}</p>
  <h2>Open picks</h2>${open.length ? `<table>${head(false)}<tbody>${open.map(row).join('')}</tbody></table>` : '<p class="note">None right now.</p>'}
  <h2>Settled</h2>${done.length ? `<table>${head(true)}<tbody>${done.slice().reverse().map(row).join('')}</tbody></table>` : '<p class="note">None yet: the live record starts on 10 November 2026.</p>'}`;
}

// ---------- Backtest ----------
const HEAD = `<thead><tr><th>Rule</th><th class="n">Bets</th><th class="n">ROI</th><th class="n" title="One standard error of the ROI">±</th><th class="n" title="Closing line value: the price taken against the market's margin-free closing price">CLV</th><th class="n" title="2023-24 and 2024-25">2023-25</th><th class="n" title="2025-26 and 2026-27 so far">2025-27</th><th>Verdict</th></tr></thead>`;
function ruleRow(a) {
  const v = a.verdict === 'gap' ? '<span class="tag ok">Passes</span>' : a.verdict === 'lead' ? '<span class="tag">Lead</span>' : a.verdict === 'too few' ? '<span class="tag">Too few</span>' : '<span class="tag no">No</span>';
  const isLive = (pk.keys || []).includes(a.key);
  return `<tr class="click${state.open === a.key ? ' sel' : ''}" data-k="${a.key}"><td class="wrapc">${esc(a.label)}${isLive ? ' <span class="tag ok">Live</span>' : ''}</td><td class="n">${a.n.toLocaleString('en-GB')}</td>
    <td class="n ${cls(a.roi)}">${spct(a.roi)}</td><td class="n">${a.se ? '±' + (a.se * 100).toFixed(1) : '–'}</td>
    <td class="n ${cls(a.clv)}">${spct(a.clv)}</td><td class="n ${cls(a.t1 && a.t1.roi)}">${a.t1 ? spct(a.t1.roi) : '–'}</td>
    <td class="n ${cls(a.t2 && a.t2.roi)}">${a.t2 ? spct(a.t2.roi) : '–'}</td><td>${v}</td></tr>`;
}
function ruleDetail(a) {
  const rows = (o, name) => Object.entries(o).map(([k, s]) => `<tr><td>${esc(name ? name(k) : k)}</td><td class="n">${s.n}</td><td class="n ${cls(s.roi)}">${spct(s.roi)}</td><td class="n ${cls(s.clv)}">${spct(s.clv)}</td></tr>`).join('');
  return `<tr class="detail"><td colspan="8"><div class="mkcols2">
    <table><thead><tr><th>League</th><th class="n">Bets</th><th class="n">ROI</th><th class="n">CLV</th></tr></thead><tbody>${rows(a.by_league, k => LG[k] ? LG[k].label : k)}</tbody></table>
    <table><thead><tr><th>Season</th><th class="n">Bets</th><th class="n">ROI</th><th class="n">CLV</th></tr></thead><tbody>${rows(a.by_season)}</tbody></table>
  </div></td></tr>`;
}
function viewBacktest() {
  const bt = liveSummary();
  const list = D.angles.filter(a => a.when === state.when);
  const tbl = xs => `<table class="ang">${HEAD}<tbody>${xs.map(a => ruleRow(a) + (state.open === a.key ? ruleDetail(a) : '')).join('')}</tbody></table>`;
  return `${bt ? `<div class="facts"><span class="fact"><b>${bt.n.toLocaleString('en-GB')}</b>bets on the live rule</span><span class="fact"><b>${spct(bt.roi)}</b>ROI</span><span class="fact"><b>${spct(bt.clv)}</b>CLV</span></div>` : ''}
  <p class="lede">Every game since 2023-24: the best price of the books we bet with against the market's margin-free price at the same moment. A rule <b>passes</b> if it had at least 150 bets, beat the closing price on average (CLV above zero) and made a profit both in 2023-25 and in 2025-27. The rule was set before the results were seen.</p>
  <div class="bar"><div class="seg">${[['open', 'Opening prices'], ['clos', 'Closing prices']].map(([k, l]) => `<button class="${state.when === k ? 'on' : ''}" data-w="${k}">${l}</button>`).join('')}</div></div>
  <p class="note">${state.when === 'open' ? 'Opening prices are where the gap is: the books we bet with open some prices above the market, and most of those are corrected by kick-off.' : 'At closing prices the gap is smaller and less steady; CLV cannot be measured here, so these rules can only be leads.'} Click a rule for its leagues and seasons.</p>
  ${tbl(list)}`;
}

// ---------- Upcoming ----------
function chipsLg() {
  const opts = [['all', 'All']].concat(D.leagues.filter(l => D.upcoming.some(u => u.lg === l.key)).map(l => [l.key, l.label]));
  return `<div class="chips">${opts.map(([k, l]) => `<button class="chip${state.lg === k ? ' on' : ''}" data-lg="${k}">${l}</button>`).join('')}</div>`;
}
function viewUpcoming() {
  const fmt = new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Athens'});
  const tf = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens'});
  if (state.lg !== 'all' && !LG[state.lg]) state.lg = 'all';
  const gs = D.upcoming.filter(u => state.lg === 'all' || u.lg === state.lg);
  let html = `<div class="bar">${chipsLg()}</div><p class="note">The next 14 days, Athens time. <b>Market</b>: the market's margin-free odds now (and at opening). <b>Best</b>: the best price now. <b>Gap</b>: best price × market chance − 1; gold when it reaches the live rule (${same ? ep('1x2') : `${ep('1x2')} in 1X2, ${ep('ou2.5')} in over/under`}), which makes it a pick.</p>`;
  if (!gs.length) return html + '<p class="note">No games in the next 14 days.</p>';
  let day = '';
  html += '<div class="grid">';
  for (const u of gs) {
    const d = when(u.dt), dl = fmt.format(d);
    if (dl !== day) { html += `</div><h2 class="day">${dl}</h2><div class="grid">`; day = dl; }
    const tbl = k => SEL[k].map((lab, i) => {
      const m = u.mk[k], b = m.best ? m.best.best[i] : null, f = m.now ? m.now.fair[i] : null, gap = b && f ? b * f - 1 : null;
      return `<tr><td>${lab}</td><td class="n">${f ? odds(f) : '–'}</td><td class="n mut">${m.open ? odds(m.open.fair[i]) : '–'}</td>
        <td class="n">${b ? b.toFixed(2) : '–'}</td><td class="n ${gap != null && gap >= EDG[k] ? 'pos' : 'mut'}">${gap == null ? '–' : spct(gap, 1)}</td></tr>`;
    }).join('');
    html += `<div class="card"><div class="top"><span class="lgtag">${LG[u.lg].label}</span> <span class="ko">${tf.format(d)}</span></div>
      <h3>${esc(u.home)} – ${esc(u.away)}</h3>
      <table class="mk"><thead><tr><th></th><th class="n">Market</th><th class="n">Open</th><th class="n">Best</th><th class="n">Gap</th></tr></thead><tbody>
      ${tbl('1x2')}${tbl('ou2.5')}</tbody></table></div>`;
  }
  return html + '</div>';
}

// ---------- Leagues ----------
function viewLeagues() {
  const a = D.angles.find(a => a.key === (pk.keys || [])[0]) || {by_league: {}};
  const o = D.angles.find(a => a.key === (pk.keys || [])[1]) || {by_league: {}};
  const c = (x) => x && x.n ? `<td class="n">${x.n}</td><td class="n ${cls(x.roi)}">${spct(x.roi)}</td>` : '<td class="n">0</td><td class="n">–</td>';
  const st = (x, f) => x && x.n ? x[f] : null;
  const COLS = [['country', 'Country', l => l.country], ['name', 'League', l => l.name], ['games', 'Games', l => l.games],
    ['gap2', 'Gap 2%+', l => l.gap2], ['an', '1X2 bets', l => st(a.by_league[l.key], 'n') || 0], ['aroi', 'ROI', l => st(a.by_league[l.key], 'roi')],
    ['on', 'O/U bets', l => st(o.by_league[l.key], 'n') || 0], ['oroi', 'ROI', l => st(o.by_league[l.key], 'roi')],
    ['home', 'Home win', l => l.home], ['draw', 'Draw', l => l.draw], ['over', 'Over 2.5', l => l.over]];
  const srt = state.sort || {}, col = COLS.find(x => x[0] === srt.col);
  const list = D.leagues.slice();
  if (col) list.sort((p, q) => {
    const x = col[2](p), y = col[2](q);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;   // blanks always last
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * srt.dir;
  });
  const rows = list.map(l => `<tr><td>${l.country}</td><td>${l.name}</td><td class="n">${l.games.toLocaleString('en-GB')}</td>
    <td class="n">${pct(l.gap2, 0)}</td>${c(a.by_league[l.key])}${c(o.by_league[l.key])}
    <td class="n">${pct(l.home, 0)}</td><td class="n">${pct(l.draw, 0)}</td><td class="n">${pct(l.over, 0)}</td></tr>`).join('');
  const head = COLS.map(([k, t], i) => `<th data-sort="${k}" class="sortable${i > 1 ? ' n' : ''}" title="Sort">${t}${srt.col === k ? (srt.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
  return `<p class="note">2023-24 to now. <b>Gap 2%+</b>: share of games where some 1X2 opening price was at least 2% above the market. Then the live rule's backtest per league, at opening prices: bets and ROI in 1X2 and in over/under 2.5. One league's ROI rests on few bets; judge the rule on all of them together. Click a column to sort.</p>
  <style>th.sortable{cursor:pointer;user-select:none;white-space:nowrap}th.sortable:hover{text-decoration:underline}</style>
  <table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------- How it works ----------
function viewHow() {
  return `<div class="prose">
  <h2>What this is</h2>
  <p>A search for wrong prices in ${D.leagues.length} European ${D.women ? "women's " : ''}leagues: ${D.leagues.map(l => l.country + ' ' + l.name).join(', ')}. Two markets: 1X2 and over/under 2.5 goals.</p>
  <h2>The rule</h2>
  <p>Take the market's price: the odds of about 20 books with their margin removed (the power method, which puts more of the margin on longshots, as books do). Take the best price among the books we bet with. When that price is far enough above the market's (best price × market chance − 1 at least ${same ? ep('1x2') : `${ep('1x2')} in 1X2 and ${ep('ou2.5')} in over/under 2.5`}), bet it. No model and no team ratings: the market itself is the yardstick.</p>
  <h2>Why it can work</h2>
  <p>Some books open their prices before the market settles, or shade them, and for a while stand above it. The backtest shows those prices beat the closing price on average and made a profit. They are corrected quickly: at closing prices the gap is much smaller, so it has to be taken early.</p>
  <h2>The test</h2>
  <p>Set before the results were seen: at least 150 bets, CLV above zero (the price taken against the market's margin-free closing price), and a profit both in 2023-25 and in 2025-27. ${D.women ? '' : 'The rule was first found on twenty leagues and then held on nineteen more added afterwards. '}A rule that passes is a lead, not a proof.</p>
  <h2>What was tried and dropped</h2>
  <p>An xG team model and detailed match data (lineups, missing starters, finishing, set pieces, rest, squad value) were tested against the opening price. None of them added anything the price did not already know, so they are not used.</p>
  <h2>Data</h2>
  <p>Results from FotMob; opening and closing odds from a public odds feed. Updated three times a day.</p>
  </div>`;
}

function render() {
  document.querySelectorAll('#tabs a[data-view]').forEach(a => a.classList.toggle('on', a.dataset.view === state.view));
  out.innerHTML = {picks: viewPicks, backtest: viewBacktest, upcoming: viewUpcoming, leagues: viewLeagues, how: viewHow}[state.view]();
  save();
}
out.addEventListener('click', e => {
  const t = e.target.closest('[data-w],[data-k],[data-lg],[data-sort]');
  if (!t) return;
  if (t.dataset.sort) {
    const k = t.dataset.sort, s = state.sort || {};
    state.sort = {col: k, dir: s.col === k ? -s.dir : (k === 'country' || k === 'name' ? 1 : -1)};
  }
  else if (t.dataset.w) { state.when = t.dataset.w; state.open = null; }
  else if (t.dataset.k) state.open = state.open === t.dataset.k ? null : t.dataset.k;
  else if (t.dataset.lg) state.lg = t.dataset.lg;
  render();
});
function route() { const m = location.hash.match(/view=(\w+)/); if (m) state.view = m[1]; render(); }
window.addEventListener('hashchange', route);
route();
})();
