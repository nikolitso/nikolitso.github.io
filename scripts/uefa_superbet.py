"""Market chances for upcoming UEFA games, from the book's public offer feed (the same feed the Super League pipeline
reads, BettingSignal/superleague/feed.py). User, 28 Nov 2026: past games from collected closing odds
(scripts/uefa_market_match.py), upcoming games from this feed.

Fetches the 1X2 ("Full Time") prices of the Champions League, Europa League and Conference League games in the next
three weeks, takes the margin out and stores only the fair home/draw/away chances in _uefa/market_upcoming.json, keyed by
Opta match id, with the time they were read. Each run overwrites a game's entry, so the last read before kick-off is
what stays; once the game is played the builder uses it as that game's market chances (when the collected closing odds
do not have the game). No prices and no bookmaker names are stored.

    python scripts/uefa_superbet.py
"""
import datetime as dt
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_uefa_referees as b  # noqa: E402
from uefa_market_match import sim  # noqa: E402

FEED = "https://production-superbet-offer-gr.freetls.fastly.net/v3/en-GR/events"
TOURNAMENTS = {80794: "UCL", 688: "UEL", 80813: "UECL"}   # found 28 Nov 2026 from known fixtures in the feed
OUT = ROOT / "_uefa" / "market_upcoming.json"


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept-Encoding": "identity"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def fetch(days=21):
    now = dt.datetime.now(dt.timezone.utc)
    span = f"startDate={now:%Y-%m-%dT00:00:00.000Z}&endDate={now + dt.timedelta(days=days):%Y-%m-%dT00:00:00.000Z}"
    games = []
    listing = [e for t in TOURNAMENTS for e in _get(f"{FEED}?{span}&index=active-prematch&tournaments={t}")["events"]]
    for e in listing:
        full = _get(f"{FEED}?events={e['event_id']}&includeOnly=fixture,markets")["events"][0]
        f = full["fixture"]
        if f.get("tournament_id") not in TOURNAMENTS:
            continue
        home, away = f["event_name"].split("·")
        for mk in full.get("markets") or []:
            if mk.get("name") == "Full Time":
                p = {o["metadata"]["name"]: o["price"] for o in mk["odds"]}
                if {"1", "X", "2"} <= set(p):
                    inv = [1 / p[k] for k in ("1", "X", "2")]
                    games.append({"comp": TOURNAMENTS[f["tournament_id"]], "home": home, "away": away,
                                  "kickoff": f["utc_date"], "fair": [round(x / sum(inv), 4) for x in inv]})
    return games


def main():
    now = dt.datetime.now(dt.timezone.utc)
    fixtures = [m for m in b.load() if m.get("status") in ("Fixture", "Playing")]
    store = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    matched, unmatched = 0, []
    for g in fetch():
        day = g["kickoff"][:10]
        cands = [m for m in fixtures if m["comp"] == g["comp"] and abs((dt.date.fromisoformat(b.day(m)) - dt.date.fromisoformat(day)).days) <= 1]
        best = max(cands, key=lambda m: min(sim(g["home"], m["home"]), sim(g["away"], m["away"])), default=None)
        if best and min(sim(g["home"], best["home"]), sim(g["away"], best["away"])) >= .6:
            store[best["id"]] = {"p": g["fair"], "read": now.strftime("%Y-%m-%dT%H:%MZ")}
            matched += 1
        else:
            unmatched.append(f'{day} {g["comp"]} {g["home"]} - {g["away"]}')
    OUT.write_text(json.dumps(store, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"{matched} upcoming UEFA games with market chances; {len(unmatched)} not matched to a fixture")
    for u in unmatched:
        print("  ", u)


if __name__ == "__main__":
    main()
