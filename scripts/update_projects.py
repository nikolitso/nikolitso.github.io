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


def when(dt, time=True):
    dt = dt.astimezone(ATHENS) if dt.tzinfo else dt
    day = f"{dt:%a} {dt.day} {dt:%b}"
    return f"{day}, {dt:%H:%M}" if time and (dt.hour or dt.minute) else day


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


def short(team):
    return team.replace("PAOK Thessaloniki FC", "PAOK").strip()


# ---- one function per card: returns a list of pill texts ------------------------------------------

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
    if not games:
        return []
    dt, home, away, comp = min(games)
    pills = [f"Next: {home} – {away}", when(dt)]
    if comp:
        pills.append(comp.replace("SL · ", "Super League ").replace("MD", "MD "))
    return pills


def paok_basketball():
    games, records = [], {}
    for name, f in (("Basket League", "gbl"), ("EuroCup", "eurocup")):
        d = json.loads(get(f"/paok-basketball/data/{f}.json"))
        for g in d.get("games", []):
            if not g.get("played"):
                games.append((parse(g["date"]), g["home"], g["opp"], name))
        me = next((t for t in d.get("standings", []) if t.get("paok")), None)
        if me:
            records[name] = f"{name} {me['w']}–{me['l']}"
    pills = []
    nxt = [g for g in games if g[0] >= NOW - timedelta(hours=2)]
    if nxt:
        dt, home, opp, comp = min(nxt)
        pills.append(f"Next: {'PAOK – ' + opp if home else opp + ' – PAOK'}")
        pills.append(when(dt, time=comp == "EuroCup"))        # Basket League tip-offs are often TBC
        if comp in records:                                 # the record in the competition of the next game
            pills.append(records[comp])
    return pills or list(records.values())


def superleague():
    d = js_object("/superleague/data.js", r"window\.SL\s*=")
    fx = upcoming(d.get("fixtures", []), lambda f: f["kickoff"])
    pills = [updated(d["updated"])]
    if fx:
        pills.append(f"{len(fx)} games projected")
        pills.append(f"Next: {fx[0]['home']} – {fx[0]['away']}")
    return pills


def basketball_cup(folder):
    d = js_object(f"/{folder}/projections.js", r"window\.PROJ\s*=")
    games = upcoming(d.get("list", []), lambda g: g["when"])
    pills = [updated(d["updated"])]
    if games:
        rnd = games[0]["round"]
        n = sum(1 for g in games if g["round"] == rnd)
        pills += [f"{rnd}: {n} games projected", "From " + when(parse(games[0]["when"]), time=False)]
    return pills


def handball():
    d = js_object("/handball/projections/", r"const D\s*=")
    sig = d["sig"]["signals"]
    pills = [updated(d["scraped"])]
    live = [s for s in sig if s.get("status") not in ("won", "lost", "push", "void")]
    won = sum(s.get("status") == "won" for s in sig)
    lost = sum(s.get("status") == "lost" for s in sig)
    pills.append(f"{len(live)} open signal{'s' if len(live) != 1 else ''}" if live else "No open signals")
    if won or lost:
        pills.append(f"Signals {won}–{lost}")
    return pills


def basketball():
    d = js_object("/basketball/", r"const D\s*=")
    pills = [updated(d["scraped"])]
    games = sum(L.get("nResults") or 0 for L in d.get("leagues", []))
    if games:
        pills.append(f"{games} games this season")
    rec = d.get("record") or {}
    won, lost, open_ = (sum(r.get(k, 0) for r in rec.values()) for k in ("won", "lost", "open"))
    if open_:
        pills.append(f"{open_} open signal{'s' if open_ != 1 else ''}")
    elif won or lost:
        pills.append(f"Signals {won}–{lost}")
    return pills


CARDS = {                    # slug -> (card href on the homepage, reader)
    "superleague": ("/superleague/", superleague),
    "eurocup": ("/eurocup/", lambda: basketball_cup("eurocup")),
    "fibaeuropecup": ("/fibaeuropecup/", lambda: basketball_cup("fibaeuropecup")),
    "handball": ("/handball/projections/", handball),
    "basketball": ("/basketball/", basketball),
    "paok-hub": ("/paok-hub/", paok_hub),
    "paok-basketball": ("/paok-basketball/", paok_basketball),
}


def render(slug, pills):
    spans = "".join(f"<span>{html.escape(p)}</span>" for p in pills[:3])
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
        print(f"{slug}: " + " | ".join(pills[:3]))
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
