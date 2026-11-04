"""Refresh the pills on the homepage's "Data & models" cards from the live project sites.

Each card gets up to three short pills (when the data was last updated, what's next, a running
record), read from the data the project pages themselves use. Everything between
<!-- live:SLUG:start --> and <!-- live:SLUG:end --> in index.html is rewritten. A site that can't
be read keeps its current pills. Runs every morning (.github/workflows/update-projects.yml).

Usage:  python scripts/update_projects.py [--dry-run]
"""
import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
SITE = "https://antonisnikolitsopoulos.com"

try:
    from zoneinfo import ZoneInfo
    ATHENS = ZoneInfo("Europe/Athens")
except Exception:                                        # no tz database (e.g. bare Windows Python)
    ATHENS = timezone(timedelta(hours=2))
NOW = datetime.now(ATHENS)


def get(path):
    req = urllib.request.Request(SITE + path, headers={"User-Agent": "antonisnikolitsopoulos.com project pills"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def js_object(path, start):
    """The JSON object that follows `start` (e.g. 'window.PROJ =') in a page or script."""
    s = get(path)
    m = re.search(start, s)
    return json.JSONDecoder().raw_decode(s[m.end():].lstrip())[0]


def when(dt, time=False):
    dt = dt.astimezone(ATHENS) if dt.tzinfo else dt
    day = f"{dt:%a} {dt.day} {dt:%b}"
    return f"{day}, {dt:%H:%M}" if time and (dt.hour or dt.minute) else day


def nxt(home, away, dt):
    """The 'Next' pill every card shares: 'Next: A – B, Sat 7 Nov'."""
    return f"Next: {home} – {away}, {when(dt)}"


def parse(s):
    """'2026-10-27 18:00', '2026-10-27T18:00', '...Z' -> datetime (naive = Athens time)."""
    s = s.strip().replace("T", " ")
    if s.endswith("Z"):
        return datetime.fromisoformat(s[:-1]).replace(tzinfo=timezone.utc).astimezone(ATHENS)
    return datetime.fromisoformat(s[:16]).replace(tzinfo=ATHENS)


def updated(s):
    dt = parse(s)
    return f"Updated {dt.day} {dt:%b}"


def upcoming(items, key):
    return sorted((it for it in items if parse(key(it)) >= NOW - timedelta(hours=2)), key=lambda it: parse(key(it)))


def record(won, lost, profit, n_open):
    """The three pills every card with picks shares, in this order: past record, its ROI (flat stakes), open picks."""
    n = won + lost
    pills = [f"Record {won}–{lost}", f"ROI {profit / n * 100:+.1f}%"] if n else ["No settled picks yet"]
    return pills + [f"{n_open} open pick{'s' if n_open != 1 else ''}" if n_open else "No open picks"]


def short(team):
    return team.replace("PAOK Thessaloniki FC", "PAOK").strip()


# ---- one function per card: returns a list of pill texts ------------------------------------------
# Cards with picks read the same way: past record, ROI in its own pill, then open picks (record()). The other cards:
# what comes next and one number. No "Updated" pill (user, 3 Nov 2026).

def paok_hub():
    s = get("/paok-hub/fixtures.html")
    games = []
    for card in re.findall(r'<div class="match-card">(.*?)</div>\s*</div>\s*</div>', s, re.S):
        teams = re.search(r'class="teams">(.*?)</div>', card, re.S)
        comp = re.search(r'class="comp-badge">(.*?)</span>', card, re.S)
        day = re.search(r'class="match-meta">\s*<span>(.*?)</span>', card, re.S)
        if not (teams and day):
            continue
        d = re.match(r"\w+ (\d+ \w+ \d{4})(?:, (\d\d:\d\d))?", html.unescape(day.group(1)).strip())
        if not d:
            continue
        dt = datetime.strptime(d.group(1) + " " + (d.group(2) or "00:00"), "%d %B %Y %H:%M").replace(tzinfo=ATHENS)
        if dt < NOW - timedelta(hours=2):
            continue
        home, away = [short(x) for x in html.unescape(teams.group(1)).split(" vs ")]
        games.append((dt, home, away, html.unescape(comp.group(1)).strip() if comp else ""))
    stamp = re.search(r'meta-pill">(After matchday \d+)', get("/paok-hub/league-standings.html"))
    pills = [stamp.group(1)] if stamp else []
    if games:
        dt, home, away, comp = min(games)
        pills.append(nxt(home, away, dt))
        if comp:
            pills.append(comp.replace("SL · ", "Super League ").replace("MD", "MD "))
    return pills


def paok_basketball():
    games, records, stamps = [], {}, []
    for name, f in (("Basket League", "gbl"), ("EuroCup", "eurocup")):
        d = json.loads(get(f"/paok-basketball/data/{f}.json"))
        if d.get("updated"):
            stamps.append(d["updated"])
        for g in d.get("games", []):
            if not g.get("played"):
                games.append((parse(g["date"]), g["home"], g["opp"], name))
        me = next((t for t in d.get("standings", []) if t.get("paok")), None)
        if me:
            records[name] = f"{name} {me['w']}–{me['l']}"
    pills = []
    coming = [g for g in games if g[0] >= NOW - timedelta(hours=2)]
    if coming:
        dt, home, opp, comp = min(coming)
        pills.append(nxt("PAOK", opp, dt) if home else nxt(opp, "PAOK", dt))
        if comp in records:                                 # the record in the competition of the next game
            pills.append(records[comp])
    else:
        pills += list(records.values())
    return pills


def superleague():
    d = js_object("/superleague/data.js", r"window\.SL\s*=")
    fx = upcoming(d.get("fixtures", []), lambda f: f["kickoff"])
    v = d.get("value") or {}
    rec = (v.get("record") or {}).get("all") or {}
    pills = record(rec.get("won", 0), rec.get("bets", 0) - rec.get("won", 0), rec.get("profit", 0), len(v.get("bets") or []))
    if fx:
        pills.append(nxt(fx[0]["home"], fx[0]["away"], parse(fx[0]["kickoff"])))
    return pills


def greek_cup():
    d = js_object("/football/greek-cup/data.js", r"window\.CUP\s*=")
    g = max(d["games"], key=lambda g: g["date"])
    return [f"Last: {g['home']} {g['goals'][0]}–{g['goals'][1]} {g['away']}",
            f"{len(d['games'])} games"]


def basketball_cup(folder):
    d = js_object(f"/{folder}/projections.js", r"window\.PROJ\s*=")
    games = upcoming(d.get("list", []), lambda g: g["when"])
    pills = []
    if games:
        rnd = games[0]["round"]
        n = sum(1 for g in games if g["round"] == rnd)
        pills += [f"Next: {rnd}, from {when(parse(games[0]['when']))}", f"{n} games projected"]
    return pills


def handball():
    d = js_object("/handball/projections/", r"const D\s*=")
    sig = d["sig"]["signals"]
    done = [x for x in sig if x.get("status") in ("won", "lost")]
    return record(sum(x["status"] == "won" for x in done), sum(x["status"] == "lost" for x in done),
                  sum(x.get("profit") or 0 for x in done), sum(x.get("status") == "open" for x in sig))


def basketball():
    d = js_object("/basketball/", r"const D\s*=")
    rec = d.get("record") or {}
    won, lost, open_, units = (sum(r.get(k, 0) for r in rec.values()) for k in ("won", "lost", "open", "units"))
    if won or lost or open_:
        return record(won, lost, units, open_)
    games = sum(L.get("nResults") or 0 for L in d.get("leagues", []))
    return [f"{games} games this season"] if games else []


def basketball_overs():
    d = js_object("/basketball/overs/live.js", r"window\.LIVE\s*=")
    picks = d.get("picks", [])
    season = js_object("/basketball/overs/data.js", r"const DATA\s*=").get("cur", {}).get("bets", [])    # the page's 2026-27 record
    done = season + [p for p in picks if p.get("done") and p.get("ret") is not None]
    return record(sum(p["ret"] > 0 for p in done), sum(p["ret"] < 0 for p in done),
                  sum(p["ret"] for p in done), sum(not p.get("done") for p in picks))

CARDS = {                    # slug -> (card href on the homepage, reader)
    "superleague": ("/superleague/", superleague),
    "greek-cup": ("/football/greek-cup/", greek_cup),
    "eurocup": ("/eurocup/", lambda: basketball_cup("eurocup")),
    "fibaeuropecup": ("/fibaeuropecup/", lambda: basketball_cup("fibaeuropecup")),
    "handball": ("/handball/projections/", handball),
    "basketball": ("/basketball/", basketball),
    "basketball-overs": ("/basketball/overs/", basketball_overs),
    "paok-hub": ("/paok-hub/", paok_hub),
    "paok-basketball": ("/paok-basketball/", paok_basketball),
}


def render(slug, pills):
    def span(p):                                        # the ROI pill stands out, in the accent (red when negative)
        cls = ' class="roi neg"' if p.startswith("ROI -") else ' class="roi"' if p.startswith("ROI ") else ""
        return f"<span{cls}>{html.escape(p)}</span>"
    spans = "".join(span(p) for p in pills[:4])
    return (f"<!-- live:{slug}:start --><div class=\"meta\">{spans}</div><!-- live:{slug}:end -->\n")


def main():
    dry = "--dry-run" in sys.argv
    s = INDEX.read_text(encoding="utf-8")
    out = s
    for slug, (href, reader) in CARDS.items():
        try:
            pills = reader()
        except Exception as e:                           # one broken site never blocks the others
            print(f"{slug}: skipped ({type(e).__name__}: {e})")
            continue
        if not pills:
            print(f"{slug}: nothing to show, left as is")
            continue
        print(f"{slug}: " + " | ".join(pills[:4]))
        block = render(slug, pills)
        marked = re.compile(rf"<!-- live:{re.escape(slug)}:start -->.*?<!-- live:{re.escape(slug)}:end -->\n", re.S)
        if marked.search(out):
            out = marked.sub(lambda m: block, out, count=1)
        else:                                            # first run: add the pills above the card's "Open →"
            card = re.compile(rf'(<a class="card" href="{re.escape(href)}"[^>]*>.*?)(\s*<span class="go">)', re.S)
            out, n = card.subn(lambda m: m.group(1) + "\n          " + block.rstrip("\n") + m.group(2), out, count=1)
            if not n:
                print(f"{slug}: card not found on the homepage")
    if out == s:
        print("no change")
    elif dry:
        print("dry run: index.html not written")
    else:
        INDEX.write_text(out, encoding="utf-8")
        print("index.html updated")


if __name__ == "__main__":
    main()
