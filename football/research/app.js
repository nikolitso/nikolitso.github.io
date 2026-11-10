(() => {
const D = window.D, $ = s => document.querySelector(s), out = $('#out');
const L = D.leagues;
const pct = (x, d = 1) => x == null ? '–' : (x * 100).toFixed(d) + '%';
const spct = (x, d = 1) => x == null ? '–' : (x > 0 ? '+' : '') + (x * 100).toFixed(d) + '%';
const num = n => n.toLocaleString('en-GB');
const cls = x => x == null ? '' : x > 0 ? 'pos' : 'neg';
const GAP0 = 8;                                                // the smallest EV the page shows (the data carries every bet from 2%)
// the betting rule: minimum gap and league groups (1 top divisions, 2 lower divisions)
const RULE = Object.assign({gap: 0.10, markets: ['1x2'], odds_above: 1.5, tiers: [1, 2], since: '2026-11-10'}, D.rule || {});
const RG = Math.round(RULE.gap * 100);                        // minimum EV of the rule
const RO = RULE.odds_above || 0, ROT = RO.toFixed(2), RMIN = RO ? Math.round(RO * 100 + 1) / 100 : null;     // prices of RO or below are skipped

// ---------- the bets: one entry per backtest bet, filtered and grouped here ----------
const B = D.bets, N = B.l.length;
const Q = new Float32Array(N), P = new Float32Array(N);        // market chance, profit at 1 unit
for (let i = 0; i < N; i++) { Q[i] = (1 + B.g[i] / 1000) / (B.o[i] / 100); P[i] = B.w[i] ? B.o[i] / 100 - 1 : -1; }
const YRS = [...new Set(B.y)].sort((a, b) => a - b);
const season = y => `${2023 + y}-${24 + y}`;
const SIDES = ['Home wins', 'Away wins'];
const GAPS = [8, 10, 12, 14, 16];
const GROUPS = [['all', 'All', () => true],
  ['top', 'Top divisions', t => t === 1], ['low', 'Lower divisions', t => t === 2]];
const TIER = ['', 'Top divisions', 'Lower divisions'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MIN = 100;                                               // fewer bets than this: numbers greyed

const state = {view: 'picks', f: {gap: RG, od: [[RMIN, null], [RMIN, null]], lg: 'all', side: [1, 1]}};     // the filters start on the betting rule
try { Object.assign(state, JSON.parse(sessionStorage.getItem('pg-state13') || '{}')); } catch (e) {}
const save = () => { try { sessionStorage.setItem('pg-state13', JSON.stringify(state)); } catch (e) {} };

// does a bet pass the filters: side 0-3, EV in 0.1%, odds x100
const pass = (s, g, o, rd) => { const f = state.f, r = f.od[s]; return f.side[s] && (rd == null || rd >= (f.rd || 1)) && g >= f.gap * 10 && (r[0] == null || o >= r[0] * 100 - 1e-6) && (r[1] == null || o <= r[1] * 100 + 1e-6); };
function index(lg) {                                           // bets that pass the filters (lg: one league only, by its index)
  const g = GROUPS.find(x => x[0] === state.f.lg) || GROUPS[0], idx = [];
  for (let i = 0; i < N; i++)
    if (pass(B.s[i], B.g[i], B.o[i], B.r ? B.r[i] : null) && (lg == null ? g[2](L[B.l[i]].tier) : B.l[i] === lg)) idx.push(i);
  return idx;
}
// the same bets settled at the closing price of the selection (B.c, x100; 0 when the price was gone by the close)
function closing(idx) {
  if (!B.c) return null;
  const a = {n: 0, pl: 0, od: 0};
  for (const i of idx) if (B.c[i]) { a.n++; a.od += B.c[i] / 100; a.pl += B.w[i] ? B.c[i] / 100 - 1 : -1; }
  a.roi = a.n ? a.pl / a.n : null;
  return a;
}
// which way the market went after the bet: share of bets whose market chance rose by the close, and whose fell (B.v)
function moved(idx) {
  if (!B.v) return null;
  let n = 0, up = 0, dn = 0;
  for (const i of idx) if (B.v[i] !== -9999) { n++; if (B.v[i] > 0) up++; else if (B.v[i] < 0) dn++; }
  return n ? {n, up: up / n, dn: dn / n} : null;
}
const movePill = m => m ? `<span class="fact">Closing line: <b style="margin-left:4px">${pct(m.up, 0)}</b>moved towards the bet · <b>${pct(m.dn, 0)}</b>against</span>` : '';
function agg(idx, pred) {
  const a = {n: 0, pl: 0, od: 0, exp: 0, won: 0, gap: 0, sq: 0, y: YRS.map(() => ({n: 0, pl: 0})), s: SIDES.map(() => ({n: 0, pl: 0}))};
  for (const i of idx) {
    if (pred && !pred(i)) continue;
    a.n++; a.od += B.o[i] / 100; a.pl += P[i]; a.sq += P[i] * P[i]; a.exp += Q[i]; a.won += B.w[i]; a.gap += B.g[i] / 1000;
    const y = a.y[YRS.indexOf(B.y[i])]; y.n++; y.pl += P[i];
    const s = a.s[B.s[i]]; s.n++; s.pl += P[i];
  }
  a.roi = a.n ? a.pl / a.n : null;
  a.se = a.n > 1 ? Math.sqrt(Math.max(a.sq / a.n - a.roi * a.roi, 0) / a.n) : null;
  return a;
}
const units = x => (x > 0 ? '+' : '') + x.toFixed(1);
const roiCell = (x, min = MIN) => !x.n ? '<td class="n mut">–</td>' : `<td class="n ${cls(x.pl)}${x.n < min ? ' few' : ''}" title="${num(x.n)} bets">${spct(x.pl / x.n)}</td>`;

// one row of numbers for a group of bets: size, calibration, result, and the ROI of each season
const HEAD = () => `<th class="n">Bets</th><th class="n">EV%</th><th class="n">ROI</th><th class="n">±</th><th class="n">P/L</th>${YRS.map(y => `<th class="n">${season(y)}</th>`).join('')}`;
function cells(a) {
  if (!a.n) return `<td class="n">0</td>${'<td class="n mut">–</td>'.repeat(4 + YRS.length)}`;
  const m = a.n < MIN;
  return `<td class="n">${num(a.n)}</td><td class="n">${pct(a.gap / a.n)}</td><td class="n ${cls(a.pl)}${m ? ' few' : ''}">${spct(a.roi)}</td><td class="n mut">${a.se == null ? '–' : (a.se * 100).toFixed(1)}</td>
    <td class="n ${cls(a.pl)}${m ? ' few' : ''}">${units(a.pl)}</td>${a.y.map(y => roiCell(y, 50)).join('')}`;
}
// REG[table title][row label] = the test a bet must pass to belong to that row; a click on a row lists those games
let REG = {};
function table(title, first, rows, idx, total) {
  REG[title] = Object.fromEntries(rows);
  if (total) REG[title][total] = () => true;
  const body = rows.map(([lab, pred]) => { const a = agg(idx, pred); return a.n ? `<tr data-row="${lab}" title="Show the games"><td>${lab}</td>${cells(a)}</tr>` : ''; }).join('');
  return `<h2>${title}</h2><table data-t="${title}"><thead><tr><th>${first}</th>${HEAD()}</tr></thead><tbody>${body}${total ? `<tr class="tot" data-row="${total}" title="Show the games"><td><b>${total}</b></td>${cells(agg(idx))}</tr>` : ''}</tbody></table>`;
}

// odds presets: one click sets the range of both sides (the boxes under them still take any range)
const ODDS = [[RMIN, null, 'All'], [RMIN || 1.01, 1.99, `${(RMIN || 1.01).toFixed(2)}–1.99`], [2, 2.49, '2.00–2.49'], [2.5, 2.99, '2.50–2.99'], [3, 3.99, '3.00–3.99'], [4, null, '4.00+']];
function filters(noLg) {
  const f = state.f, chip = (k, v, t, on) => `<button class="chip${on ? ' on' : ''}" data-f="${k}" data-v="${v}">${t}</button>`;
  return `<style>th.sortable{cursor:pointer;user-select:none;white-space:nowrap}th.sortable:hover{text-decoration:underline}.od{display:inline-flex;align-items:center;gap:6px;font:500 13.5px var(--mono);color:var(--muted);margin-right:10px}.od.off{opacity:.4}.od input{width:62px;background:none;border:1px solid var(--line);border-radius:8px;color:var(--text);font:500 13.5px var(--mono);padding:4px 6px}.od input:focus{outline:none;border-color:var(--gold)}</style>
  <div class="flt"><span class="fl">EV%</span><div class="chips">${GAPS.map(g => chip('gap', g, g + '%+', f.gap === g)).join('')}</div></div>
  ${noLg ? '' : `<div class="flt"><span class="fl">Leagues</span><div class="chips">${GROUPS.map(([k, t]) => chip('lg', k, t, f.lg === k)).join('')}</div></div>`}
  ${B.r ? `<div class="flt"><span class="fl">From round</span><div class="chips">${[1, 2, 3, 4, 5, 6, 8, 10].map(k => chip('rd', k, k === 1 ? 'All' : k + '+', (f.rd || 1) === k)).join('')}</div></div>` : ''}
  <div class="flt"><span class="fl">Bets on</span><div class="chips">${SIDES.map((t, i) => chip('side', i, t, f.side[i])).join('')}</div></div>
  <div class="flt"><span class="fl">Odds</span><div class="chips">${ODDS.map(([lo, hi, lab], k) => chip('odp', k, lab, f.od.every(r => r[0] === lo && r[1] === hi))).join('')}</div></div>
  <div class="flt"><span class="fl">Odds range</span><div class="chips">${SIDES.map((t, i) => `<label class="od${f.side[i] ? '' : ' off'}">${t} ${[0, 1].map(k => `<input type="number" min="1" step="0.05" inputmode="decimal" placeholder="${k ? 'max' : 'min'}" aria-label="${t}, ${k ? 'highest' : 'lowest'} odds" data-od="${i}" data-k="${k}" value="${f.od[i][k] == null ? '' : f.od[i][k]}">`).join('<span>–</span>')}</label>`).join('')}</div></div>`;
}

// ---------- where the profit comes from: one book, a few teams? ----------
function concentration(idx) {
  if (!B.b || !idx.length) return '';
  const all = agg(idx), nb = D.books || 0;
  const cnt = [...Array(nb)].map(() => 0); idx.forEach(i => cnt[B.b[i]]++);
  const byBook = table('By book', 'Best price from', cnt.map((n, k) => [`Book ${k + 1}`, i => B.b[i] === k]), idx, 'All');
  const s2 = {n: 0, pl: 0, od: 0}; let one = 0;
  for (const i of idx) { if (B.p[i]) { s2.n++; s2.od += B.p[i] / 100; s2.pl += B.w[i] ? B.p[i] / 100 - 1 : -1; } else one++; }
  const tm = new Map();
  for (const i of idx) { const a = tm.get(B.t[i]) || {n: 0, pl: 0, l: B.l[i]}; a.n++; a.pl += P[i]; tm.set(B.t[i], a); }
  const list = [...tm.entries()].sort((a, b) => b[1].pl - a[1].pl), top = list.slice(0, 10), set = new Set(top.map(x => x[0]));
  const rest = agg(idx, i => !set.has(B.t[i])), topPl = top.reduce((s, x) => s + x[1].pl, 0), winners = list.filter(x => x[1].pl > 0).length;
  REG['By team'] = Object.fromEntries(top.map(([k]) => [D.teams[k], i => B.t[i] === k]));
  const rows = top.map(([k, a]) => `<tr data-row="${D.teams[k]}" title="Show the games"><td>${D.teams[k]}</td><td>${L[a.l].country} · ${L[a.l].name}</td><td class="n">${num(a.n)}</td><td class="n ${cls(a.pl)}">${units(a.pl)}</td><td class="n ${cls(a.pl)} few">${spct(a.pl / a.n)}</td></tr>`).join('');
  const lead = cnt.length ? cnt[0] / idx.length : 0;
  return `<h2>Concentration</h2>
  <p class="note">Does the result rest on one book or on a few teams? <b>By book</b>: which book had the best price at the opening, the one the bet is made at. The books are numbered by how many bets they supply and are not named. Book 1 had the best price in ${pct(lead, 0)} of these bets.</p>
  ${byBook}
  <p class="note" style="margin-top:14px"><b>At the second-best price.</b> The same bets taken from the next book instead: ${s2.n ? `<b class="${cls(s2.pl)}">${spct(s2.pl / s2.n)}</b> ROI on ${num(s2.n)} bets, ${units(s2.pl)} units, average price ${(s2.od / s2.n).toFixed(2)}` : 'no bet had a second price'}${one ? ` (${num(one)} bets had one book only)` : ''}. The best price returned ${spct(all.roi)} at an average of ${(all.od / all.n).toFixed(2)}.</p>
  <h2>By team</h2>
  <p class="note">${num(list.length)} teams were bet on; ${num(winners)} of them made a profit. The ten most profitable made ${units(topPl)} of the ${units(all.pl)} units. Without them the other bets returned <b class="${cls(rest.pl)}">${spct(rest.roi)}</b> on ${num(rest.n)} bets.</p>
  <table data-t="By team"><thead><tr><th>Team bet on</th><th>League</th><th class="n">Bets</th><th class="n">P/L</th><th class="n">ROI</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------- Backtest ----------
const PRIOR = `Only data that was known before the game are used.`;
const RULETXT = `home and away wins with an EV of ${RG}% or more, prices above ${ROT}`;
function viewBacktest(lg) {
  const idx = index(lg), all = agg(idx), f = state.f;
  const fact = (b, t) => `<span class="fact"><b>${b}</b>${t}</span>`;
  const cl = closing(idx), pill = (lab, a) => `<span class="fact">${lab}: <b style="margin-left:4px">${a.n ? spct(a.roi) : '–'}</b>ROI · ${num(a.n)} bets · ${a.n ? units(a.pl) : '0'} units · average price <b style="margin:0 0 0 4px">${a.n ? (a.od / a.n).toFixed(2) : '–'}</b></span>`;
  const pills = all.n || (cl && cl.n) ? `<div class="facts">${pill('Opening prices', all)}${cl ? pill('Closing prices', cl) : ''}${movePill(moved(idx))}</div>` : '<p class="note">No bets pass these filters.</p>';
  const band = (lo, hi) => i => B.g[i] >= lo * 10 && B.g[i] < hi * 10, ob = (lo, hi) => i => B.o[i] >= lo * 100 && B.o[i] < hi * 100;
  const GB = [[8, 10], [10, 12], [12, 14], [14, 16], [16, 999]];
  const OB = [[1, 2], [2, 2.5], [2.5, 3], [3, 4], [4, 999]];
  // side columns only for the sides chosen, and none when one side is chosen (they would repeat the total)
  const on = f.side.filter(x => x).length > 1 ? SIDES.map((t, k) => k).filter(k => f.side[k]) : [];
  REG._idx = idx;
  REG['By season'] = Object.fromEntries(YRS.map(y => [season(y), i => B.y[i] === y]));
  const bySeason = YRS.map(y => { const a = agg(idx, i => B.y[i] === y); return `<tr data-row="${season(y)}" title="Show the games"><td>${season(y)}</td>${a.s.map((s, k) => on.includes(k) ? `<td class="n">${num(s.n)}</td>${roiCell(s)}` : '').join('')}<td class="n">${num(a.n)}</td><td class="n ${cls(a.pl)}${a.n < MIN ? ' few' : ''}">${units(a.pl)}</td>${roiCell(a)}</tr>`; }).join('');
  const tables = `${pills}
  <h2>By season</h2><table data-t="By season"><thead><tr><th>Season</th>${on.map(k => `<th class="n">${SIDES[k]}</th><th class="n">ROI</th>`).join('')}<th class="n">All bets</th><th class="n">P/L</th><th class="n">ROI</th></tr></thead><tbody>${bySeason}</tbody></table>
  ${on.length ? table('By side', 'Bets on', SIDES.map((t, s) => [t, i => B.s[i] === s]), idx, 'All') : ''}`;
  if (lg != null) return tables;                               // a league's page: the headline tables only
  return `${PKCSS}<p class="note">2023-24 to now, regular league games only (no play-offs), 1 unit a bet. Every bet with an EV of ${GAP0}% or more: the best price against the market's margin-free price. The draw is never bet. The two pills are the same bets settled twice: at the opening price, and at the price the same selection had at the close (the last before kick-off). <b>Average price</b>: the mean odds of the bets, at the opening and at the close. <b>Closing line</b>: the share of the bets whose market chance was higher at the close than at the opening (the market moved towards the bet) and the share where it was lower. The tables below use the opening price. The filters start on the betting rule (${RULETXT}); change them to compare other rules: every table below is recounted.</p>
  <p class="note">${PRIOR}</p>
  ${filters()}
  ${pills}
  <h2>By season</h2><table data-t="By season"><thead><tr><th>Season</th>${on.map(k => `<th class="n">${SIDES[k]}</th><th class="n">ROI</th>`).join('')}<th class="n">All bets</th><th class="n">P/L</th><th class="n">ROI</th></tr></thead><tbody>${bySeason}</tbody></table>
  ${on.length ? table('By side', 'Bets on', SIDES.map((t, s) => [t, i => B.s[i] === s]), idx, 'All') : ''}
  ${f.lg !== 'all' ? '' : table('By league group', 'Leagues', TIER.map((t, k) => [t, i => L[B.l[i]].tier === k]), idx, 'All')}
  ${B.r ? table('By round', 'Round', [[1, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, 30], [31, 99]].map(([lo, hi]) => [hi > 90 ? `${lo} and later` : `${lo}–${hi}`, i => B.r[i] >= lo && B.r[i] <= hi]), idx, 'All') : ''}
  ${B.m ? table('By month', 'Month', [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map(m => [MONTHS[m - 1], i => B.m[i] === m]), idx, 'All') : ''}
  ${table('By odds', 'Odds', OB.map(([lo, hi]) => [hi > 100 ? lo.toFixed(2) + '+' : lo === 1 ? `Under ${hi.toFixed(2)}` : `${lo.toFixed(2)}–${(hi - 0.01).toFixed(2)}`, ob(lo, hi)]), idx, 'All')}
  ${table('By EV%', 'EV%', GB.map(([lo, hi]) => [hi > 100 ? lo + '%+' : `${lo}–${hi}%`, band(lo, hi)]), idx, 'All')}
  ${concentration(idx)}
  <p class="note" style="margin-top:26px"><b>How to read.</b> <b>EV%</b>: the average EV of the bets, what they promise. <b>ROI</b>: what they returned at flat stakes. <b>±</b>: one standard error of the ROI in points; a ROI smaller than about twice it cannot be told from zero. The season columns show the ROI of each season: a rule worth using is positive in all of them. Seasons played inside one calendar year count with the season that starts that year. <b>By round</b> is the round of the league season the game belonged to, so the first rows are the start of a season; games without a round (play-offs, finals) are not in the test. <b>By month</b> is the month the game was played, from July, when most seasons start, to June. Green is a profit, red a loss. Faded numbers rest on fewer than ${MIN} bets (50 for one season). The <b>EV%</b> filter is the smallest EV a bet must have. <b>From round</b> leaves out the first rounds of each season: 4+ keeps the bets from round 4 on. <b>Odds</b>: one click sets a price band for both sides. <b>Odds range</b>: the lowest and highest price allowed, set for each selection on its own; an empty box means no limit. Click a column heading to sort a table by it; click the first column to go back to the usual order. <b>Click any row of a table to list the games behind it</b>, each with the prices the bet was made from.</p>`;
}

// ---------- Picks: live bets of the rule ----------
const PKCSS = `<style>table[data-t] tbody tr[data-row]{cursor:pointer}table[data-t] tbody tr[data-row]:hover td{background:color-mix(in srgb,var(--line) 35%,transparent)}table[data-t] tbody tr.sel td{background:color-mix(in srgb,var(--gold) 14%,transparent)}.mt{margin:12px 0 30px;padding-left:14px;border-left:2px solid var(--gold)}a.lk{color:inherit;text-decoration:underline;text-decoration-color:var(--muted);text-underline-offset:3px}a.lk:hover{color:var(--gold)}table.pk td{white-space:normal}table.pk td.n{white-space:nowrap}tr.exp{cursor:pointer}tr.exp:hover td{background:color-mix(in srgb,var(--line) 35%,transparent)}tr.detail>td{padding:6px 8px 18px 22px}.an p{margin:8px 0;max-width:820px;color:var(--muted);font-size:15.5px}.an p b{color:var(--text)}table.ant{width:auto;margin:6px 0 10px}table.ant td,table.ant th{white-space:nowrap;padding:5px 14px 5px 0;font-size:15.5px}</style>`;
function viewPicks() {
  const key = {}; L.forEach(l => key[l.key] = l);
  const ps = (D.picks || []).filter(p => key[p.lg] && RULE.tiers.includes(key[p.lg].tier) && RULE.markets.includes(p.market) && p.edge + 1e-9 >= RULE.gap && p.odds > RO + 1e-9 && p.posted.slice(0, 10) >= RULE.since);
  const open = ps.filter(p => !p.result), done = ps.filter(p => p.result).reverse();
  const won = done.filter(p => p.result === 'W').length, pl = done.reduce((s, p) => s + p.profit, 0);
  const ri = (() => { const o = []; for (let i = 0; i < N; i++) if (B.s[i] < 2 && B.g[i] >= RG * 10 && B.o[i] > RO * 100 + 1e-6 && RULE.tiers.includes(L[B.l[i]].tier)) o.push(i); return o; })(), bt = agg(ri);
  const fact = (b, t) => `<span class="fact"><b>${b}</b>${t}</span>`;
  const when = s => new Date(s).toLocaleString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
  const bet = p => p.market === '1x2' ? (p.sel === 0 ? p.home : p.away) + ' to win' : (p.sel === 0 ? 'Over' : 'Under') + ' 2.5 goals';
  const row = (p, d) => `<tr${p.fair ? ' class="exp" title="Show how the pick was made"' : ''}><td>${when(p.dt)}</td><td>${key[p.lg].country} · ${key[p.lg].name}</td><td>${p.home} – ${p.away}</td><td><b>${bet(p)}</b></td><td class="n">${p.odds.toFixed(2)}</td><td class="n">${pct(p.prob, 0)}</td><td class="n">${spct(p.edge)}</td>${d ? `<td class="n">${p.score}</td><td class="n ${cls(p.profit)}">${p.result === 'W' ? 'Won' : 'Lost'}</td><td class="n ${cls(p.profit)}">${(p.profit > 0 ? '+' : '') + p.profit.toFixed(2)}</td>` : ''}</tr>${p.fair ? `<tr class="detail" hidden><td colspan="${d ? 10 : 7}">${analysis({mi: p.market === '1x2' ? 0 : 1, s: p.sel, fair: p.fair, best: p.best, nw: p.nw, nb: p.nb, wavg: p.wavg, margin: p.margin, home: p.home, away: p.away, ev: p.edge, live: 1, score: p.score, won: p.result ? p.result === 'W' : null})}</td></tr>` : ''}`;
  const head = d => `<thead><tr><th>Kick-off</th><th>League</th><th>Game</th><th>Bet</th><th class="n">Price</th><th class="n">Chance</th><th class="n">EV%</th>${d ? '<th class="n">Score</th><th class="n">Result</th><th class="n">P/L</th>' : ''}</tr></thead>`;
  return `${PKCSS}<p class="note"><b>The rule.</b> Bet a home or an away win when the best price is ${RG}% or more above the market's margin-free price (EV ${RG}%+). Prices of ${ROT} or below are skipped. One unit a bet. Picks are logged from ${new Date(RULE.since).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}.</p>
  <div class="facts">${done.length ? fact(`${won}–${done.length - won}`, 'record') + fact(spct(pl / done.length), 'ROI') : fact('0', 'settled picks')}${fact(open.length, open.length === 1 ? 'open pick' : 'open picks')}${fact(spct(bt.roi), `ROI of the rule at opening prices, ${num(bt.n)} bets, average price ${bt.n ? (bt.od / bt.n).toFixed(2) : '–'}`)}${(c => c && c.n ? fact(spct(c.roi), `ROI of the same bets at closing prices, average price ${(c.od / c.n).toFixed(2)}`) : '')(closing(ri))}${movePill(moved(ri))}</div>
  <h2>Open picks</h2>${open.length ? `<table class="pk">${head(0)}<tbody>${open.map(p => row(p, 0)).join('')}</tbody></table>` : '<p class="note">No open picks now. Prices are checked every hour, for games up to 8 days ahead.</p>'}
  ${done.length ? `<h2>Settled picks</h2><table class="pk">${head(1)}<tbody>${done.map(p => row(p, 1)).join('')}</tbody></table>` : ''}
  <p class="note" style="margin-top:26px">A pick is logged the first time the EV reaches the rule's level and keeps that price until the game is settled; one pick a game and market. <b>Chance</b>: the chance of the bet winning by the market price. Times are local. The two backtest pills are the same bets twice: taken at the opening price, and taken at the price the same selection had at the close (the last before kick-off). The gap between them is what waiting costs. <b>Closing line</b>: the share of the bets whose market chance rose between the opening and the close, and the share where it fell. A live pick is taken at the price found when the page is updated, between the two, so its results can differ from both. Click a pick to see the prices it was made from.</p>`;
}

// ---------- Leagues: the same filtered bets, league by league ----------
function viewLeagues() {
  const idx = index(), g = GROUPS.find(x => x[0] === state.f.lg) || GROUPS[0];
  const by = L.map(() => []); idx.forEach(i => by[B.l[i]].push(i));
  const list = L.map((l, k) => ({l, a: agg(by[k])})).filter(x => g[2](x.l.tier));
  const fs = state.f.side, on = fs.filter(x => x).length > 1 ? SIDES.map((t, k) => k).filter(k => fs[k]) : [];   // as in By season
  const COLS = [['country', 'Country', x => x.l.country], ['name', 'League', x => x.l.name], ['games', 'Games', x => x.l.games]]
    .concat(...on.map(s => [['n' + s, SIDES[s], x => x.a.s[s].n], ['r' + s, 'ROI', x => x.a.s[s].n ? x.a.s[s].pl / x.a.s[s].n : null]]),
      [['n', 'All bets', x => x.a.n], ['r', 'ROI', x => x.a.roi]]);
  const srt = state.sort || {}, col = COLS.find(x => x[0] === srt.col);
  if (col) list.sort((p, q) => {
    const x = col[2](p), y = col[2](q);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;   // blanks always last
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * srt.dir;
  });
  const c = (x, b) => { const o = b ? '<b>' : '', e = b ? '</b>' : ''; return x.n ? `<td class="n">${o}${num(x.n)}${e}</td><td class="n ${cls(x.pl)}${x.n < MIN && !b ? ' few' : ''}">${o}${spct(x.pl / x.n)}${e}</td>` : '<td class="n">0</td><td class="n mut">–</td>'; };
  const tot = agg(idx), games = list.reduce((s, x) => s + x.l.games, 0);
  const rows = list.map(x => `<tr><td>${x.l.country}</td><td><a class="lk" href="#view=lg&k=${x.l.key}">${x.l.name}</a></td><td class="n">${num(x.l.games)}</td>${on.map(s => c(x.a.s[s])).join('')}${c(x.a)}</tr>`).join('');
  const head = COLS.map(([k, t], i) => `<th data-sort="${k}" class="sortable${i > 1 ? ' n' : ''}" title="Sort">${t}${srt.col === k ? (srt.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
  return `<p class="note">2023-24 to now, opening prices. The bets that pass the filters in each league, split by the sides chosen, each with its ROI at flat stakes. One league's ROI rests on few bets (faded under ${MIN}) and a league's past ROI says little about its next season; the first row is all leagues together. Click a column to sort, or a league to see its bets one by one, each with the prices it was made from.</p>
  ${filters()}
  <style>a.lk{color:inherit;text-decoration:underline;text-decoration-color:var(--muted);text-underline-offset:3px}a.lk:hover{color:var(--gold)}table.lgs th,table.lgs td{padding-left:5px;padding-right:5px}th.sortable{cursor:pointer;user-select:none;white-space:nowrap}th.sortable:hover{text-decoration:underline}</style>
  <table class="lgs"><thead><tr>${head}</tr></thead><tbody><tr class="tot"><td><b>All</b></td><td><b>${list.length} leagues</b></td><td class="n"><b>${num(games)}</b></td>${on.map(s => c(tot.s[s], 1)).join('')}${c(tot, 1)}</tr>${rows}</tbody></table>`;
}

// ---------- how one bet was made: every outcome's market chance and best price when the bet was chosen ----------
function analysis(o) {
  const names = o.mi === 0 ? [o.home + ' win', 'Draw', o.away + ' win'] : ['Over 2.5 goals', 'Under 2.5 goals'];
  const W = o.wavg, raw = W ? W.reduce((s, x) => s + 1 / x, 0) : null;      // the wide market's average prices, and their chances added up
  const evs = o.fair.map((p, i) => i === o.s && o.ev != null ? o.ev : p * o.best[i] - 1), draw = i => o.mi === 0 && i === 1;
  const rows = names.map((nm, i) => `<tr${i === o.s ? ' class="tot"' : ''}><td>${i === o.s ? `<b>${nm}</b>` : nm}</td>${W ? `<td class="n">${W[i].toFixed(2)}</td><td class="n">${pct(1 / W[i])}</td>` : ''}<td class="n">${pct(o.fair[i])}</td><td class="n">${(1 / o.fair[i]).toFixed(2)}</td><td class="n">${o.best[i].toFixed(2)}</td><td class="n ${draw(i) ? 'mut' : cls(evs[i])}">${spct(evs[i])}</td><td>${i === o.s ? 'the bet' : draw(i) ? 'never bet' : ''}</td></tr>`).join('');
  const sd = o.mi * 2 + (o.mi === 0 ? (o.s === 2 ? 1 : 0) : o.s), need = RG, ev = o.ev == null ? evs[o.s] : o.ev;
  const ok = ev * 100 + 1e-6 >= need && o.best[o.s] > RO + 1e-9;
  const why = ok ? `Inside the rule: EV of ${need}% or more and a price above ${ROT}.` : `Outside the rule: ${ev * 100 + 1e-6 < need ? `the EV is under ${need}%` : `the price is ${ROT} or below`}.`;
  let after = '';
  if (!o.live) {
    const mv = o.fc == null ? '' : `The market closed at a chance of ${pct(o.fc)} for the bet (it opened at ${pct(o.fair[o.s])}): ${o.fc > o.fair[o.s] + 0.0005 ? 'it moved towards the bet' : o.fc < o.fair[o.s] - 0.0005 ? 'it moved against the bet' : 'it did not move'}. Against that closing chance the price taken was worth ${spct(o.best[o.s] * o.fc - 1)}.${o.bc ? ` The best price at the close was ${o.bc.toFixed(2)}.` : ''} `;
    after = `<p><b>After.</b> ${mv}Score ${o.score}: the bet ${o.won ? 'won' : 'lost'}, ${o.won ? '+' + (o.best[o.s] - 1).toFixed(2) : '−1.00'} units.</p>`;
  } else if (o.won != null) after = `<p><b>After.</b> Score ${o.score}: the bet ${o.won ? 'won' : 'lost'}.</p>`;
  return `<div class="an"><p><b>${o.live ? 'When the pick was logged' : 'Before the game: opening prices'}.</b> Market chance: the prices of ${o.nw} book${o.nw === 1 ? '' : 's'} with the margin removed. Best price: the highest of ${o.nb} other book${o.nb === 1 ? '' : 's'} at the same moment.</p>
  <table class="ant"><thead><tr><th>Outcome</th>${W ? '<th class="n">Market price</th><th class="n">As a chance</th>' : ''}<th class="n">Market chance</th><th class="n">Fair odds</th><th class="n">Best price</th><th class="n">EV</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  ${W ? `<p><b>How the market chance is worked out.</b> <b>Market price</b> is the average price of the ${o.nw} books. One divided by a price is the chance it stands for (1 ÷ ${W[o.s].toFixed(2)} = ${pct(1 / W[o.s])}). Added up, the chances come to ${pct(raw)}, not 100%: the ${pct(raw - 1)} on top is the books' margin. The margin is taken out book by book with the power method, which raises every chance to the same power until they add up to 100% and so takes more off outsiders than off favourites, as books load them; the books are then averaged. That gives the <b>market chance</b>, and <b>fair odds</b> are one divided by it (1 ÷ ${pct(o.fair[o.s])} = ${(1 / o.fair[o.s]).toFixed(2)}). The <b>EV</b> is the best price times the market chance, minus one.</p>` : ''}
  <p><b>The bet.</b> ${names[o.s]} at ${o.best[o.s].toFixed(2)}, the side with the highest EV: ${o.best[o.s].toFixed(2)} × ${pct(o.fair[o.s])} − 1 = ${spct(ev)}. ${why}</p>${after}</div>`;
}

// a list of bets, newest first as given; each row opens how the bet was made. showLg: a League column (bets of many leagues)
function betTable(items, showLg) {
  const hasR = items.some(x => x.r.length > 15), span = 9 + (hasR ? 1 : 0) + (showLg ? 1 : 0);
  const day = s => new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
  const body = items.map(({r, l}) => {
    const won = r[5] === 0 ? (r[6] === 0 ? r[3] > r[4] : r[4] > r[3]) : (r[6] === 0 ? r[3] + r[4] > 2.5 : r[3] + r[4] < 2.5), o = r[8][r[6]], pl = won ? o - 1 : -1;
    const bet = r[5] === 0 ? (r[6] === 0 ? r[1] : r[2]) + ' to win' : (r[6] === 0 ? 'Over' : 'Under') + ' 2.5 goals';
    return `<tr class="exp" title="Show how the bet was made"><td>${day(r[0])}</td>${showLg ? `<td>${l.country} · ${l.name}</td>` : ''}${hasR ? `<td class="n">${r[15] || '–'}</td>` : ''}<td>${r[1]} – ${r[2]}</td><td class="n">${r[3]}-${r[4]}</td><td><b>${bet}</b></td><td class="n">${o.toFixed(2)}</td><td class="n">${pct(r[7][r[6]], 0)}</td><td class="n">${spct(r[14] / 1000)}</td><td class="n ${cls(pl)}">${won ? 'Won' : 'Lost'}</td><td class="n ${cls(pl)}">${(pl > 0 ? '+' : '') + pl.toFixed(2)}</td></tr>
    <tr class="detail" hidden><td colspan="${span}">${analysis({mi: r[5], s: r[6], fair: r[7], best: r[8], nw: r[9], nb: r[10], fc: r[11], bc: r[12], wavg: r[16], margin: r[17], home: r[1], away: r[2], ev: r[14] / 1000, score: `${r[3]}-${r[4]}`, won})}</td></tr>`;
  }).join('');
  return `<table class="pk"><thead><tr><th>Date</th>${showLg ? '<th>League</th>' : ''}${hasR ? '<th class="n">Round</th>' : ''}<th>Game</th><th class="n">Score</th><th>Bet</th><th class="n">Price</th><th class="n">Chance</th><th class="n">EV%</th><th class="n">Result</th><th class="n">P/L</th></tr></thead><tbody>${body}</tbody></table>`;
}

// the games behind one table row (state.open = {t: table, row: label}): shown under that table
const MAXGAMES = 400;
function loadLg(keys) {
  return Promise.all(keys.map(k => new Promise(res => {
    if ((window.LG || {})[k]) return res();
    const s = document.createElement('script');
    s.src = `lg/${k}.js?v=${encodeURIComponent(D.updated)}`; s.onload = res; s.onerror = res;
    document.head.appendChild(s);
  })));
}
function showMatches(scroll) {
  const o = state.open;
  if (!o || !B.k || !REG._idx) return;
  const tb = [...out.querySelectorAll('table[data-t]')].find(x => x.dataset.t === o.t), pred = (REG[o.t] || {})[o.row];
  if (!tb || !pred) return;
  [...tb.tBodies[0].rows].forEach(tr => tr.classList.toggle('sel', tr.dataset.row === o.row));
  const ix = REG._idx.filter(pred), keys = [...new Set(ix.map(i => L[B.l[i]].key))], box = document.createElement('div');
  box.className = 'mt'; tb.after(box);
  if (keys.some(k => !(window.LG || {})[k])) {
    box.innerHTML = '<p class="note">Loading the games…</p>';
    loadLg(keys).then(() => { if (state.open === o) { showMatches.scroll = scroll; render(); } });
    return;
  }
  const items = ix.map(i => ({r: (LG[L[B.l[i]].key] || [])[B.k[i]], l: L[B.l[i]]})).filter(x => x.r).sort((p, q) => p.r[0] < q.r[0] ? 1 : p.r[0] > q.r[0] ? -1 : 0);
  box.innerHTML = `<p class="note"><b>${o.t}: ${o.row}.</b> ${num(items.length)} ${items.length === 1 ? 'bet' : 'bets, newest first'}${items.length > MAXGAMES ? `; the last ${MAXGAMES} are listed` : ''}. Click a bet to see how it was made; click the row again to close. <a class="lk" href="#" data-close="1">Close</a></p>${betTable(items.slice(0, MAXGAMES), state.view !== 'lg')}`;
  if (scroll) box.scrollIntoView({block: 'nearest', behavior: 'smooth'});
}

// ---------- one league: its numbers and every bet, each with the prices it was made from ----------
const loading = {};
function viewLeague() {
  const k = L.findIndex(l => l.key === state.lgk), l = L[k];
  if (!l) return '<p class="note">League not found. <a class="lk" href="#view=men">All leagues</a></p>';
  const rows = (window.LG || {})[l.key];
  if (!rows && !loading[l.key]) {
    loading[l.key] = 1;
    const s = document.createElement('script');
    s.src = `lg/${l.key}.js?v=${encodeURIComponent(D.updated)}`;
    s.onload = () => { if (state.view === 'lg' && state.lgk === l.key) render(); };
    s.onerror = () => { loading[l.key] = 2; if (state.view === 'lg' && state.lgk === l.key) render(); };
    document.head.appendChild(s);
  }
  let list = '<p class="note">Loading the bets…</p>';
  if (loading[l.key] === 2) list = '<p class="note">The bets of this league could not be loaded.</p>';
  if (rows) {
    const side = r => r[5] * 2 + (r[5] === 0 ? (r[6] === 2 ? 1 : 0) : r[6]);
    const xs = rows.filter(r => pass(side(r), r[14], Math.round(r[8][r[6]] * 100), r.length > 15 ? r[15] : null));
    list = xs.length ? betTable(xs.map(r => ({r}))) : '<p class="note">No bets pass these filters.</p>';
  }
  return `${PKCSS}<p class="note"><a class="lk" href="#view=men">← All leagues</a></p>
  <h2 style="margin-top:6px">${l.country} · ${l.name}</h2>
  <p class="note">${num(l.games)} games tested, 2023-24 to now, opening prices, 1 unit a bet. The filters start on the betting rule (${RULETXT}).</p>
  <p class="note">${PRIOR}</p>
  ${filters(1)}
  ${viewBacktest(k)}
  <h2>Every bet</h2>
  <p class="note">Newest first. Click a bet to see how it was made: the market chance and the best price of every outcome when the prices opened, then what followed.</p>
  ${list}`;
}

// ---------- How it works ----------
function viewHow() {
  const names = L.map(l => l.country + ' ' + l.name).join(', ');
  return `<div class="prose">
  <h2>What this is</h2>
  <p>A search for wrong prices in European football. One market: the match result, home or away win. The draw is never bet.</p>
  <p><b>${L.length} men's leagues</b>: ${names}.</p>
  <h2>The EV</h2>
  <p>Take the market's price: the odds of about 20 books with their margin removed (the power method: every book's chances, one divided by its prices, are raised to the same power until they add up to 100%, which takes more of the margin off outsiders, as books load them; the books are then averaged). Every bet on a league page shows this worked out with its own numbers. Take the best price on offer at the same moment. The EV (expected value) is best price × market chance − 1: how far the best price stands above the market, in percent. No model and no team ratings: the market itself is the yardstick.</p>
  <h2>The backtest</h2>
  <p>Every regular league game from 2023-24 to now (play-offs and finals are left out), at opening prices. Each time the EV on a home win or an away win was at least ${GAP0}%, one unit is bet on it at the best price.</p>
  <p>${PRIOR}</p>
  <p>The Backtest tab is built for choosing a rule. Filters cut the bets: the minimum EV, the league group (top divisions, lower divisions), the first round of the season to bet from, the side, and an odds range set for each side on its own. Every table is recounted for the bets that pass. Every rule is read twice: the bets at their opening price, and the same bets at the price the selection had at the close, the last before kick-off. The two pills above the tables show both; the tables use the opening price. A third pill shows how often the market's own chance for the bet rose by the close and how often it fell.</p>
  <p>Each table row shows the number of bets, the average EV they promised, the ROI, its standard error, the profit or loss, and the ROI of each season. Every table row can be clicked to list the games behind it, and each game opens to show how the bet was made. The tables split the bets by season, side, league group, round of the season, month of the game, odds and EV. A last section, Concentration, shows which book had the best price (the books are numbered, not named), what the same bets returned at the second-best price, and how much of the profit comes from the ten best teams. A rule is worth using when the result holds in every season, not only in the total. The Leagues tab shows the same bets league by league; one league's numbers rest on few bets and its past ROI says little about its next season. Each league opens on a page of its own with every bet listed: a click on a bet shows the market chance and the best price of every outcome when the prices opened, the EV of each side, why that side was bet, and then how the market closed and how the game ended.</p>
  <h2>Why it can work</h2>
  <p>Some prices open before the market settles, or are shaded, and for a while stand above it. They are corrected quickly: the same bets taken at the closing price return far less, so the price has to be taken early.</p>
  <h2>Betting rules</h2>
  <p>Set on 10 November 2026 from the backtest. A home or an away win is bet when the EV is <b>${RG}% or more</b> and the price is <b>above ${ROT}</b>. The draw is not bet. Every league on this page, one unit a bet.</p>
  <p>Why 10%. The return grows with the EV: the bigger the EV, the more the bets returned. Home and away wins with an EV of 10% or more returned 19.0% on 2,773 bets, with a profit in every season of the test. Those between 8% and 10% returned 12.5% on 1,249 bets: also a profit, but a smaller one, and they are left out.</p>
  <p>Why prices of ${ROT} or below are skipped. They were the weakest part of the test: 201 bets with an EV of 8% or more returned 5.1%, against 15.2% for the rest, with one losing season. A short price leaves little room for a wrong price.</p>
  <p>Picks are logged on the Picks tab from that date: the first time a game within 8 days meets the rule, at the price on offer then. The Backtest tab opens on the rule; the other filters stay so other rules can be compared with it.</p>
  <h2>What was tried and dropped</h2>
  <p>An xG team model and detailed match data (lineups, missing starters, finishing, set pieces, rest, squad value) were tested against the opening price. None of them added anything the price did not already know, so they are not used.</p>
  <p>Over and under 2.5 goals were tested the same way. A small EV returned almost nothing there: with an EV between 8% and 14% they returned 2.6% on 622 bets, with one losing season. Above 14% they returned 17.4%, but on 199 bets only, and that line was drawn after seeing the results, so it proves little. They were taken out of the rule and of the page.</p>
  <p>The top divisions of England, Spain, Germany, Italy and France were tested the same way. The bets returned nothing there: 2,857 bets lost 0.7%. Those five leagues were taken out of the page and its data.</p>
  <p>Women's leagues were tested the same way. The market price there is less accurate: the bets won less often than it said and kept under half of the EV, so the women's leagues were dropped and more men's leagues added.</p>
  <h2>Data</h2>
  <p>Opening and closing odds from a public odds feed. Updated every hour.</p>
  </div>`;
}

// the Backtest tables sort by any column: a click on a heading, a second click turns the order; the total row stays last
function sortTables() {
  out.querySelectorAll('table[data-t]').forEach(tb => {
    const s = (state.ts || {})[tb.dataset.t], ths = [...tb.tHead.rows[0].cells];
    ths.forEach((th, i) => { th.classList.add('sortable'); th.dataset.c = i; th.title = 'Sort'; });
    if (!s || s.col >= ths.length) return;
    const body = tb.tBodies[0], all = [...body.rows], rows = all.filter(r => !r.classList.contains('tot')), tot = all.filter(r => r.classList.contains('tot'));
    rows.forEach((r, i) => r._i = i);
    const val = r => { if (s.col === 0) return r._i; const v = parseFloat(r.cells[s.col].textContent.replace(/[,%+]/g, '').replace('−', '-')); return isNaN(v) ? null : v; };
    rows.sort((a, b) => { const x = val(a), y = val(b); if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; return (x - y) * s.dir || a._i - b._i; });
    [...rows, ...tot].forEach(r => body.appendChild(r));
    ths[s.col].textContent += s.dir > 0 ? ' ▲' : ' ▼';
  });
}
const VIEWS = ['picks', 'backtest', 'men', 'lg', 'how'];
function render() {
  REG = {};
  document.querySelectorAll('#tabs a[data-view]').forEach(a => a.classList.toggle('on', a.dataset.view === (state.view === 'lg' ? 'men' : state.view)));
  // the line under the tabs counts the leagues in view: the league group chosen on Backtest and Leagues, one league on its page
  const grp = GROUPS.find(x => x[0] === state.f.lg) || GROUPS[0], one = state.view === 'lg' && L.find(l => l.key === state.lgk);
  const shown = one ? [one] : state.view === 'backtest' || state.view === 'men' ? L.filter(l => grp[2](l.tier)) : L;
  $('#sub').textContent = `${shown.length === L.length ? `${L.length} leagues` : one ? `${one.country} · ${one.name}` : `${shown.length} of ${L.length} leagues (${grp[1].toLowerCase()})`} · ${num(shown.reduce((s, l) => s + l.games, 0))} games tested, 2023-24 to now · updated ${D.updated.replace('T', ' ').replace('Z', ' UTC')}`;
  out.innerHTML = state.view === 'how' ? viewHow() : state.view === 'picks' ? viewPicks() : state.view === 'men' ? viewLeagues() : state.view === 'lg' ? viewLeague() : viewBacktest();
  sortTables();
  showMatches(showMatches.scroll); showMatches.scroll = 0;
  save();
}
out.addEventListener('click', e => {
  const x = e.target.closest('tr.exp');                        // a bet: show or hide how it was made
  if (x && x.nextElementSibling && x.nextElementSibling.classList.contains('detail')) { x.nextElementSibling.hidden = !x.nextElementSibling.hidden; return; }
  const c = e.target.closest('[data-f]');
  if (c) {
    const f = state.f, k = c.dataset.f, v = c.dataset.v;
    if (k === 'side') { f.side[+v] = f.side[+v] ? 0 : 1; if (!f.side.some(x => x)) f.side = [1, 1]; }
    else if (k === 'odp') f.od = f.od.map(() => [ODDS[+v][0], ODDS[+v][1]]);
    else f[k] = k === 'lg' ? v : +v;
    return render();
  }
  if (e.target.closest('[data-close]')) { e.preventDefault(); state.open = null; return render(); }
  const row = e.target.closest('table[data-t] tbody tr[data-row]');   // a table row: list the games behind it (again: close)
  if (row) {
    const tname = row.closest('table').dataset.t, o = state.open;
    state.open = o && o.t === tname && o.row === row.dataset.row ? null : {t: tname, row: row.dataset.row};
    showMatches.scroll = 1;
    return render();
  }
  const h = e.target.closest('table[data-t] th');
  if (h) {
    const k = h.closest('table').dataset.t, c = +h.dataset.c, s = (state.ts = state.ts || {})[k] || {};
    state.ts[k] = {col: c, dir: s.col === c ? -s.dir : (c === 0 ? 1 : -1)};
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
  const k = location.hash.match(/[&#]k=(\w+)/);
  state.lgk = k ? k[1] : null;
  if ((m && m[1]) !== state.view) { window.scrollTo(0, 0); state.open = null; }
  state.view = m && VIEWS.includes(m[1]) ? m[1] : 'picks';         // no hash and old links (upcoming, leagues, women) land on the Picks tab
  render();
}
window.addEventListener('hashchange', route);
route();
})();
