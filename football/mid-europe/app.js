(() => {
const D = window.D, $ = s => document.querySelector(s), out = $('#out');
const LG = Object.fromEntries(D.leagues.map(l => [l.key, l]));
const pct = (x, d = 1) => x == null ? '–' : (x * 100).toFixed(d) + '%';
const spct = (x, d = 1) => x == null ? '–' : (x > 0 ? '+' : '') + (x * 100).toFixed(d) + '%';
const odds = p => p ? (1 / p).toFixed(2) : '–';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const cls = x => x == null ? '' : x > 0 ? 'pos' : 'neg';
const state = {view: 'gaps', mkt: '1x2', when: 'open', lg: 'all', tlg: D.leagues[0].key, open: null, sort: null};
try { Object.assign(state, JSON.parse(sessionStorage.getItem('me-state') || '{}')); } catch (e) {}
const save = () => { try { sessionStorage.setItem('me-state', JSON.stringify(state)); } catch (e) {} };

const gaps = D.angles.filter(a => a.verdict === 'gap'), leads = D.angles.filter(a => a.verdict === 'lead');
const mktOf = a => /ou2\.5/.test(a.key) ? 'ou2.5' : '1x2';
const SEL = {'1x2': ['Home', 'Draw', 'Away'], 'ou2.5': ['Over 2.5', 'Under 2.5']};
const tested = D.leagues.reduce((s, l) => s + l.games, 0);
$('#sub').textContent = `${D.leagues.length} leagues · ${tested.toLocaleString('en-GB')} games tested, 2023-24 to now · updated ${D.updated.replace('T', ' ').replace('Z', ' UTC')}`;

function pills() {
  return `<div class="facts">
    <span class="fact"><b>${D.leagues.length}</b>leagues</span>
    <span class="fact"><b>${tested.toLocaleString('en-GB')}</b>games tested</span>
    <span class="fact"><b>${D.angles.length}</b>betting rules tested</span>
    <span class="fact"><b>${gaps.length}</b>${gaps.length === 1 ? 'gap passes' : 'gaps pass'} the rule</span>
  </div>`;
}

function angleRow(a) {
  const v = a.verdict === 'gap' ? '<span class="tag ok">Gap</span>' : a.verdict === 'lead' ? '<span class="tag">Lead</span>' : a.verdict === 'too few' ? '<span class="tag">Too few</span>' : '<span class="tag no">No gap</span>';
  return `<tr class="click${state.open === a.key ? ' sel' : ''}" data-k="${a.key}"><td class="wrapc">${esc(a.label)}</td><td class="n">${a.n}</td>
    <td class="n ${cls(a.roi)}">${spct(a.roi)}</td><td class="n">${a.se ? '±' + (a.se * 100).toFixed(1) : '–'}</td>
    <td class="n ${cls(a.clv)}">${spct(a.clv)}</td><td class="n ${cls(a.t1 && a.t1.roi)}">${a.t1 ? spct(a.t1.roi) : '–'}</td>
    <td class="n ${cls(a.t2 && a.t2.roi)}">${a.t2 ? spct(a.t2.roi) : '–'}</td><td>${v}</td></tr>`;
}
function angleDetail(a) {
  const rows = (o, name) => Object.entries(o).map(([k, s]) => `<tr><td>${esc(name ? name(k) : k)}</td><td class="n">${s.n}</td><td class="n ${cls(s.roi)}">${spct(s.roi)}</td><td class="n ${cls(s.clv)}">${spct(s.clv)}</td></tr>`).join('');
  return `<tr class="detail"><td colspan="8"><div class="mkcols2">
    <table><thead><tr><th>League</th><th class="n">Bets</th><th class="n">ROI</th><th class="n">CLV</th></tr></thead><tbody>${rows(a.by_league, k => LG[k] ? LG[k].country : k)}</tbody></table>
    <table><thead><tr><th>Season</th><th class="n">Bets</th><th class="n">ROI</th><th class="n">CLV</th></tr></thead><tbody>${rows(a.by_season)}</tbody></table>
  </div></td></tr>`;
}
const ANG_HEAD = `<thead><tr><th>Rule</th><th class="n">Bets</th><th class="n">ROI</th><th class="n" title="One standard error of the ROI">±</th><th class="n" title="Closing line value: opening price against the margin-free closing price">CLV</th><th class="n" title="2023-24 and 2024-25">Tuning ROI</th><th class="n" title="2025-26 and 2026-27 so far">Check ROI</th><th>Verdict</th></tr></thead>`;

function viewGaps() {
  if (!['1x2', 'ou2.5'].includes(state.mkt)) state.mkt = '1x2';
  const order = {model: 0, side: 1, flat: 2, band: 3};
  const list = D.angles.filter(a => mktOf(a) === state.mkt && a.key.includes(state.when === 'open' ? '_open' : '_clos'))
    .sort((a, b) => order[a.group] - order[b.group]);
  const tbl = xs => `<table class="ang">${ANG_HEAD}<tbody>${xs.map(a => angleRow(a) + (state.open === a.key ? angleDetail(a) : '')).join('')}</tbody></table>`;
  const live = D.pick ? D.angles.find(x => x.key === D.pick.key) : null;
  const passed = gaps.length ? tbl(gaps) + (live ? `<p class="note">The live picks follow <b>${esc(live.label)}</b>: of the rules that pass, it is the one that also made the same profit on the ten leagues added after the model's settings were fixed. Expect a small edge.</p>` : '')
    : `<p class="note">None of the ${D.angles.length} rules passes yet, so no picks are posted. The tables below show how close each one comes.</p>`;
  return pills() + `<p class="lede">Two markets only: <b>1X2</b> and <b>over/under 2.5 goals</b>. A <b>gap</b> is a betting rule that, on past games, (1) had at least 150 bets, (2) beat the closing price on average (CLV above zero, so it is bet at opening prices) and (3) made a profit both in the seasons used to set the model up (2023-24, 2024-25) and in the seasons after (2025-26, 2026-27 so far). The rule was set before the results were seen.</p>
  <h2>Gaps that pass</h2>${passed}
  ${leads.length ? `<h2>Leads</h2><p class="note">Profit in both the tuning and the check seasons, but no support from the closing price. Watched, not bet.</p>${tbl(leads)}` : ''}
  <h2>Every rule tested</h2>
  <div class="bar"><div class="seg">${[['1x2', '1X2'], ['ou2.5', 'Over/under 2.5']].map(([k, l]) => `<button class="${state.mkt === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
  <div class="seg">${[['open', 'Opening price'], ['close', 'Closing price']].map(([k, l]) => `<button class="${state.when === k ? 'on' : ''}" data-w="${k}">${l}</button>`).join('')}</div></div>
  <p class="note">Prices are the best of the Greek-licensed books; CLV is against the margin-free closing price of about 20 UK books. Click a rule for its leagues and seasons.</p>
  ${tbl(list)}
  <h2>Does the model know more than the price?</h2>
  <p class="note">Log loss: lower is more accurate. <b>Move</b>: the share of the model's disagreement with the opening price that the closing price takes up (0% means the market ignores what the model sees; a clear positive number means the opening price is beatable). <b>Blend</b>: the weight the model earns next to the opening price, fitted on 2023-25.</p>
  ${infoTable()}`;
}

function infoTable() {
  const c = (i, m) => { const x = i && i[m]; return x; };
  const rows = D.leagues.map(l => {
    const i = l.info, a = i['1x2'] || {}, o = i['ou2.5'] || {};
    const mv = x => x && x.move != null ? `<span class="${x.move - 2 * x.move_se > 0 ? 'pos' : ''}">${(x.move * 100).toFixed(0)}%</span>` : '–';
    return `<tr><td>${l.country}</td><td class="n">${a.n || '–'}</td>
      <td class="n">${a.ll_model ?? '–'}</td><td class="n">${a.ll_open ?? '–'}</td>
      <td class="n">${o.ll_model ?? '–'}</td><td class="n">${o.ll_open ?? '–'}</td>
      <td class="n">${mv(a)}</td><td class="n">${mv(o)}</td>
      <td class="n">${a.w_open != null ? pct(a.w_open, 0) : '–'}</td><td class="n">${o.w_open != null ? pct(o.w_open, 0) : '–'}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>League</th><th class="n">Games</th><th class="n">1X2 model</th><th class="n">1X2 opening</th>
    <th class="n">O/U model</th><th class="n">O/U opening</th><th class="n">Move 1X2</th><th class="n">Move O/U</th><th class="n">Blend 1X2</th><th class="n">Blend O/U</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function chipsLg(key, all = true) {
  const opts = (all ? [['all', 'All']] : []).concat(D.leagues.map(l => [l.key, l.country]));
  return `<div class="chips">${opts.map(([k, l]) => `<button class="chip${state[key] === k ? ' on' : ''}" data-${key}="${k}">${l}</button>`).join('')}</div>`;
}

function viewUpcoming() {
  const fmt = new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Athens'});
  const tf = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens'});
  const gs = D.upcoming.filter(u => state.lg === 'all' || u.lg === state.lg);
  let html = `<div class="bar">${chipsLg('lg')}</div><p class="note">The next 14 days. <b>Model</b>: the xG model's chance and fair odds. <b>Market</b>: the margin-free price of about 20 UK books, now (and at opening). <b>Best</b>: best Greek-licensed price now. <b>Gap</b>: model chance × best price − 1. A gap here is not a pick: on its own it has not passed the rule (see Gaps). Times are Athens time.</p>`;
  if (!gs.length) return html + '<p class="note">No games in the next 14 days.</p>';
  let day = '';
  html += '<div class="grid">';
  for (const u of gs) {
    const d = new Date(u.dt.replace('Z', ':00Z'));
    const dl = fmt.format(d);
    if (dl !== day) { html += `</div><h2 class="day">${dl}</h2><div class="grid">`; day = dl; }
    const tbl = (k, labs) => {
      const m = u.mod[k], mk = u.mk[k];
      return labs.map((lab, i) => {
        const best = mk.gr ? mk.gr.best[i] : null, gap = best ? m[i] * best - 1 : null;
        return `<tr><td>${lab}</td><td class="n">${pct(m[i], 0)}</td><td class="n">${odds(m[i])}</td>
          <td class="n">${mk.now ? odds(mk.now.fair[i]) : '–'}</td><td class="n mut">${mk.open ? odds(mk.open.fair[i]) : '–'}</td>
          <td class="n">${best ? best.toFixed(2) : '–'}</td><td class="n ${gap != null && gap >= 0.05 ? 'pos' : ''}">${gap == null ? '–' : spct(gap, 0)}</td></tr>`;
      }).join('');
    };
    const lk = x => x == null ? '' : `<span class="${x > 0 ? 'hot' : 'cold'}">${x > 0 ? '+' : ''}${x}</span>`;
    html += `<div class="card"><div class="top"><span class="lgtag">${LG[u.lg].country}</span> <span class="ko">${tf.format(d)}</span></div>
      <h3>${esc(u.home)} – ${esc(u.away)}</h3>
      <div class="xgl">Model xG ${u.xg[0].toFixed(2)} – ${u.xg[1].toFixed(2)}${u.luck[0] != null || u.luck[1] != null ? ` · goals − xG, last 8: ${lk(u.luck[0]) || '–'} / ${lk(u.luck[1]) || '–'}` : ''}</div>
      <table class="mk"><thead><tr><th></th><th class="n">Model</th><th class="n">Fair</th><th class="n">Market</th><th class="n">Open</th><th class="n">Best</th><th class="n">Gap</th></tr></thead><tbody>
      ${tbl('1x2', SEL['1x2'])}${tbl('ou2.5', SEL['ou2.5'])}</tbody></table></div>`;
  }
  return html + '</div>';
}

function viewPicks() {
  const P = D.picks || [], done = P.filter(p => p.result), open = P.filter(p => !p.result), pk = D.pick;
  const w = done.filter(p => p.result === 'W').length, prof = done.reduce((s, p) => s + p.profit, 0);
  const rule = pk ? D.angles.find(a => a.key === pk.key) || {} : null;
  const fmt = new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens'});
  const sel = p => (SEL[p.market] || [])[p.sel] || '–';
  const row = p => `<tr><td>${fmt.format(new Date(p.dt.replace('Z', ':00Z')))}</td><td>${LG[p.lg].country}</td><td class="wrapc">${esc(p.home)} – ${esc(p.away)}</td><td>${sel(p)}</td>
    <td class="n">${p.odds.toFixed(2)}</td><td class="n">${odds(p.prob)}</td><td class="n pos">${spct(p.edge, 0)}</td>${p.result ? `<td class="n">${p.score}</td><td class="n ${p.profit > 0 ? 'pos' : 'neg'}">${p.profit > 0 ? '+' : ''}${p.profit.toFixed(2)}</td>` : ''}</tr>`;
  const head = res => `<thead><tr><th>Kick-off</th><th>League</th><th>Game</th><th>Bet</th><th class="n">Price</th><th class="n">Model odds</th><th class="n">Edge</th>${res ? '<th class="n">Score</th><th class="n">Units</th>' : ''}</tr></thead>`;
  const facts = `<div class="facts">
    <span class="fact">${done.length ? `<b>Record ${w}–${done.length - w}</b> · ROI ${spct(prof / done.length)}` : 'No settled picks yet'}</span>
    <span class="fact">${open.length ? `<b>${open.length}</b>open ${open.length === 1 ? 'pick' : 'picks'}` : 'No open picks'}</span>
    ${rule ? `<span class="fact"><b>${spct(rule.roi)}</b>backtest ROI, ${rule.n} bets</span><span class="fact"><b>${spct(rule.clv)}</b>backtest CLV</span>` : ''}
  </div>`;
  const lede = rule ? `<p class="lede">The rule that passed (see Gaps): <b>${esc(rule.label)}</b>. A pick is posted the first time a game reaches that edge at the best Greek-licensed price in the 8 days before kick-off and keeps that price. Flat 1 unit. Expect a small edge; on past games the bets beat the closing price on average.</p>`
    : `<p class="lede">No 1X2 or over/under 2.5 rule has passed the test yet (see Gaps), so no picks are posted. Picks start only when a rule passes; the Upcoming tab shows the model's prices for every game in the meantime.</p>`;
  return facts + lede + (P.length ? `<h2>Open picks</h2>${open.length ? `<table>${head(false)}<tbody>${open.map(row).join('')}</tbody></table>` : '<p class="note">None right now.</p>'}
  <h2>Settled</h2>${done.length ? `<table>${head(true)}<tbody>${done.slice().reverse().map(row).join('')}</tbody></table>` : '<p class="note">None yet.</p>'}` : '');
}

function viewLeagues() {
  const rows = D.leagues.map(l => `<tr><td>${l.country}</td><td>${l.name}</td><td>${l.xg}</td><td class="n">${l.games}</td>
    <td class="n">${pct(l.home, 0)}</td><td class="n">${pct(l.draw, 0)}</td><td class="n">${pct(l.over, 0)}</td><td class="n">${l.goals.toFixed(2)}</td>
    <td class="n">${pct(l.margin_wide)}</td><td class="n">${pct(l.margin_gr)}</td></tr>`).join('');
  return `<p class="note">2023-24 to now. Margin: the average 1X2 overround at closing (UK books; Greek-licensed books).</p>
  <table><thead><tr><th>Country</th><th>League</th><th>Chance data</th><th class="n">Games</th><th class="n">Home win</th><th class="n">Draw</th><th class="n">Over 2.5</th><th class="n">Goals</th><th class="n">Margin UK</th><th class="n">Margin GR</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function viewTeams() {
  const T = (D.teams[state.tlg] || []).slice();
  const cols = [['team', 'Team', 0], ['gp', 'GP', 1], ['gf', 'GF', 1], ['ga', 'GA', 1], ['xgf', 'xGF', 1], ['xga', 'xGA', 1], ['gd', 'G − xG', 1], ['luck8', 'Last 8', 1], ['att', 'Attack', 1], ['def', 'Defence', 1]];
  T.forEach(t => { t.gd = Math.round(((t.gf - t.xgf) - (t.ga - t.xga)) * 10) / 10; });
  if (state.sort) { const [k, dir] = state.sort; T.sort((a, b) => ((a[k] ?? -99) > (b[k] ?? -99) ? 1 : -1) * dir); }
  const f = (k, v) => v == null ? '–' : (k === 'att' || k === 'def') ? (v > 0 ? '+' : '') + v.toFixed(2) : (k === 'gd' || k === 'luck8') ? `<span class="${v > 0 ? 'hot' : v < 0 ? 'cold' : ''}">${v > 0 ? '+' : ''}${v}</span>` : v;
  return `<div class="bar">${chipsLg('tlg', false)}</div>
  <p class="note">This season. xG is FotMob's where the league has it, else the box-score estimate (see How it works). <b>G − xG</b>: (goals − xG) − (conceded − xG against); above zero, the team's results ran ahead of its chances. <b>Last 8</b>: the same over its last eight games. <b>Attack/Defence</b>: the model's ratings (log scale, 0 = league average, higher is better). Click a heading to sort.</p>
  <table class="sortable"><thead><tr>${cols.map(([k, l, n]) => `<th class="${n ? 'n' : ''}" data-s="${k}">${l}</th>`).join('')}</tr></thead>
  <tbody>${T.map(t => `<tr>${cols.map(([k, , n]) => `<td class="${n ? 'n' : ''}">${k === 'team' ? esc(t.team) : f(k, t[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function viewHow() {
  const p = D.params, px = D.proxy;
  return `<div class="prose">
  <h2>What this is</h2>
  <p>A search for wrong prices in ${D.leagues.length} mid-tier European leagues: ${D.leagues.map(l => l.country).join(', ')}. It builds an xG model of every team, compares it with the bookmakers' prices at opening and at closing, and tests a list of betting rules on every game since 2023-24.</p>
  <h2>The model</h2>
  <p>Each team has an attack and a defence rating. A game's expected goals are exp(league level + home edge + attack − opponent's defence). The ratings are fitted on every earlier game with more weight on recent ones (half-life ${p.hl} days) and a pull towards average (strength ${p.lam}). What they are fitted on is a mix of chances and goals: ${Math.round(p.w * 100)}% xG and ${Math.round((1 - p.w) * 100)}% goals. Newly promoted teams start ${p.new} below average. Expected goals turn into score chances with a Poisson model with a small correction for low scores (ρ = ${p.rho}). Every game is predicted only from the games before its day.</p>
  <h2>xG where there is none</h2>
  <p>FotMob publishes xG for some of these leagues and seasons only (the Leagues tab shows which). Elsewhere the model uses an estimate from the box score, fitted on the ${px.full.n.toLocaleString('en-GB')} team-games that have both: xG ≈ ${px.full.coef[0]} × big chances + ${px.full.coef[1]} × other shots in the box + ${px.full.coef[2]} × shots from outside + ${px.full.coef[3]} × shots on target (correlation with real xG ${px.full.r}). Where big chances are not counted: ${px.basic.coef[0]} × shots + ${px.basic.coef[1]} × shots on target (correlation ${px.basic.r}).</p>
  <h2>Prices</h2>
  <p>Two markets: 1X2 and over/under 2.5 goals. Opening and closing odds of about 20 UK books and of the Greek-licensed books. The margin is removed with the power method, which puts more of it on longshots, as books do. Bets are struck at the best Greek-licensed price. CLV (closing line value) is the opening price times the margin-free closing chance, minus one: over many bets, beating the closing price is the best sign that an edge is real, and it needs far fewer bets than profit to show.</p>
  <h2>The rule for a gap</h2>
  <p>Set before the results were seen: at least 150 bets, CLV above zero, and a profit both in the tuning seasons (2023-24, 2024-25, used to choose the model's settings) and in the check seasons (2025-26 and 2026-27 so far), which the settings never saw. A rule that passes is a lead, not a proof: twenty leagues and dozens of rules give luck many chances. Ten of the leagues (${D.leagues.filter(l => l.batch === 2).map(l => l.country).join(', ')}) were added after the model's settings were fixed, so they never shaped them.</p>
  <h2>Data</h2>
  <p>Results, xG and box scores from FotMob; odds from a public odds feed. Updated daily.</p>
  </div>`;
}

function render() {
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.view === state.view));
  out.innerHTML = {gaps: viewGaps, picks: viewPicks, upcoming: viewUpcoming, leagues: viewLeagues, teams: viewTeams, how: viewHow}[state.view]();
  save();
}
out.addEventListener('click', e => {
  const t = e.target.closest('[data-m],[data-w],[data-k],[data-lg],[data-tlg],[data-s]');
  if (!t) return;
  if (t.dataset.m) { state.mkt = t.dataset.m; state.open = null; }
  else if (t.dataset.w) state.when = t.dataset.w;
  else if (t.dataset.k) state.open = state.open === t.dataset.k ? null : t.dataset.k;
  else if (t.dataset.lg) state.lg = t.dataset.lg;
  else if (t.dataset.tlg) { state.tlg = t.dataset.tlg; state.sort = null; }
  else if (t.dataset.s) state.sort = state.sort && state.sort[0] === t.dataset.s ? [t.dataset.s, -state.sort[1]] : [t.dataset.s, t.dataset.s === 'team' ? 1 : -1];
  render();
});
function route() { const m = location.hash.match(/view=(\w+)/); if (m) state.view = m[1]; render(); }
window.addEventListener('hashchange', route);
route();
})();
