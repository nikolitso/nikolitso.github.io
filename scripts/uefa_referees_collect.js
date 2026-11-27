// UEFA Referees collector (user, 27 Nov 2026: "Opta via browser", same feed as the Super League scoresway snippet).
// Run in a browser tab on https://www.scoresway.com (any page). It reads the Opta feed for UCL / UEL / UECL,
// keeps the main competition (league phase onwards, no qualifying rounds), and saves one JSON file with every
// competition-season to the browser's downloads: uefa_opta_<date>.json. Move it to _uefa/raw/ and run
// python scripts/build_uefa_referees.py. Progress: window.UEFA_PROGRESS. Optional: window.UEFA_ONLY = ['UCL_2026-27'].
(async () => {
  // the feed key is not kept in this public repo: set window.OPTA_KEY first (the key the Super League
  // scoresway snippet uses, kept outside the site repo), or paste it when asked
  const key = window.OPTA_KEY || prompt('Opta feed key'), base = 'https://api.performfeeds.com/soccerdata';
  if (!key) throw new Error('no feed key');
  const TMCL = [
    ['UCL', '2024-25', 'bam3j6qs1v79osuz7nwgy4rh0'], ['UCL', '2025-26', '2mr0u0l78k2gdsm79q56tb2fo'], ['UCL', '2026-27', '99jev9kv55deht65t6myggxlg'],
    ['UEL', '2024-25', 'ejcp3vqc3ac7q66lowlv41ixg'], ['UEL', '2025-26', '7ttpe5jzya3vjhjadiemjy7mc'], ['UEL', '2026-27', '1rpi0q64a7kut2wiuvecmgbv8'],
    ['UECL', '2024-25', 'cc4kfcd13e029cj3nawmm0hec'], ['UECL', '2025-26', '7x2zp2hm4p6wuijwdw3h7a8t0'], ['UECL', '2026-27', 'acatl9aedc5l4im3r8l890y6s'],
  ];
  const main = s => !/Qualifying|Preliminary/i.test(s || '') && s !== 'Play-offs';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const get = async url => {
    for (let i = 0; i < 4; i++) {
      try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (e) {}
      await sleep(1500 * (i + 1));
    }
    throw new Error('failed ' + url);
  };
  const P = window.UEFA_PROGRESS = { done: [], current: null, errors: [] };
  const files = [];
  for (const [comp, season, tmcl] of TMCL) {
    const tag = `${comp}_${season}`;
    if (window.UEFA_ONLY && !window.UEFA_ONLY.includes(tag)) continue;
    P.current = tag;
    try {
      const list = await get(`${base}/match/${key}/?_rt=c&tmcl=${tmcl}&live=yes&_pgSz=400&_lcl=en&_fmt=json`);
      const ms = (list.match || []).filter(m => main(m.matchInfo.stage?.name));
      const out = new Array(ms.length);
      P.total = ms.length; P.n = 0;
      // four workers, no timers between requests: Chrome throttles timers in background tabs to a crawl
      let next = 0;
      const worker = async () => { while (next < ms.length) { const i = next++; out[i] = await one(ms[i]); P.n++; } };
      const one = async m => {
        const mi = m.matchInfo, ld = m.liveData || {}, md = ld.matchDetails || {};
        const strip = o => { const { lastUpdated, optaEventId, ...rest } = o; return rest; };
        const rec = {
          id: mi.id, comp, season, stage: mi.stage?.name, date: mi.date, time: mi.time, week: mi.week,
          home: mi.contestant.find(c => c.position === 'home'), away: mi.contestant.find(c => c.position === 'away'),
          venue: mi.venue?.longName, status: md.matchStatus, winner: md.winner, scores: md.scores, periods: (md.period || []).map(p => p.id),
          officials: (ld.matchDetailsExtra?.matchOfficial || []).map(o => ({ id: o.id, type: o.type, name: `${o.firstName} ${o.lastName}`.trim() })),
          cards: (ld.card || []).map(strip), subs: (ld.substitute || []).map(strip),
        };
        if (md.matchStatus === 'Played') {
          const s = await get(`${base}/matchstats/${key}/${mi.id}?_rt=c&_fmt=json&_lcl=en`);
          rec.teams = {};
          for (const lu of s.liveData?.lineUp || []) {
            const st = t => lu.stat?.find(x => x.type === t);
            const f = st('fkFoulLost');
            rec.teams[lu.contestantId] = {
              start: lu.player.filter(p => p.position !== 'Substitute').map(p => p.playerId),
              bench: lu.player.filter(p => p.position === 'Substitute').map(p => p.playerId),
              coach: (lu.teamOfficial || []).filter(o => o.type === 'manager').map(o => `${o.firstName} ${o.lastName}`.trim()),
              fouls: f ? +f.value : null, fouls_fh: f?.fh != null ? +f.fh : null, fouls_sh: f?.sh != null ? +f.sh : null,
              yc: +(st('totalYellowCard')?.value || 0), rc: +(st('totalRedCard')?.value || 0),
            };
          }
        }
        return rec;
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      files.push({ comp, season, tmcl, fetched: new Date().toISOString(), matches: out });
      P.done.push(`${tag}: ${out.length} matches`);
    } catch (e) { P.errors.push(`${tag}: ${e.message}`); }
  }
  // one download at the end: Chrome blocks a page's second automatic download until the user allows it
  const blob = new Blob([JSON.stringify({ files })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `uefa_opta_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  P.current = 'finished';
})();
