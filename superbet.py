"""Superbet.gr odds for the Super League, from its public offer feed.

Match-total over/under lines for the stats we project, plus 1X2. Each pull is saved to
data/odds/superbet-YYYY-MM-DD-HHMM.json so we can later check how the projections did
against the market.
python superbet.py  -> fetch and print the round's lines
"""
import datetime as dt
import glob
import json
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
FEED = "https://production-superbet-offer-gr.freetls.fastly.net/v3/en-GR/events"
TOURNAMENT = 168  # Greece Super League

NAMES = {"Iraklis FC": "Iraklis", "Asteras Tripolis": "Asteras", "Olympiacos": "Olympiakos"}

# Superbet market name -> our stat (match totals only)
MARKETS = {"Total Goals": "goals", "Total Corners": "corners", "Total Cards": "cards",
           "Total Shots on Target": "sot", "Total Shots": "shots", "Total Fouls": "fouls",
           "Total Throw Ins": "throw_ins", "Total Goal Kicks": "goal_kicks",
           "Total Goalkeeper Saves": "saves", "Total Hit Woodwork": "woodwork"}


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept-Encoding": "identity"})
    return json.load(urllib.request.urlopen(req, timeout=30))


def fair(over, under):
    """Bookmaker's chance of over with its margin taken out (proportional)."""
    a, b = 1 / over, 1 / under
    return a / (a + b)


def parse(event):
    f = event["fixture"]
    home, away = (NAMES.get(n, n) for n in f["event_name"].split("·"))
    out = {"home": home, "away": away, "kickoff": f["utc_date"], "id": event["event_id"], "stats": {}}
    for mk in event["markets"]:
        if mk["name"] == "Full Time":
            p = {o["metadata"]["name"]: o["price"] for o in mk["odds"]}
            if {"1", "X", "2"} <= set(p):
                inv = {k: 1 / p[k] for k in ("1", "X", "2")}
                s = sum(inv.values())
                out["result"] = {"odds": [p["1"], p["X"], p["2"]],
                                 "fair": [round(inv[k] / s, 3) for k in ("1", "X", "2")]}
        stat = MARKETS.get(mk["name"])
        if not stat:
            continue
        pairs = {}
        for o in mk["odds"]:
            side, line = o["metadata"]["name"].split(" ", 1)
            pairs.setdefault(float(line), {})[side] = o["price"]
        out["stats"][stat] = [[ln, v["Over"], v["Under"], round(fair(v["Over"], v["Under"]), 3)]
                              for ln, v in sorted(pairs.items()) if "Over" in v and "Under" in v]
    return out


def fetch(days=14, within=None):
    """[{home, away, kickoff, result, stats: {stat: [[line, over odds, under odds, fair over]]}}]
    within=minutes: only games kicking off that soon (the closing pull, see close.py)."""
    now = dt.datetime.now(dt.timezone.utc)
    span = f"startDate={now:%Y-%m-%dT00:00:00.000Z}&endDate={now + dt.timedelta(days=days):%Y-%m-%dT00:00:00.000Z}"
    listing = _get(f"{FEED}?{span}&index=active-prematch&tournaments={TOURNAMENT}")["events"]
    if within is not None:
        soon = lambda e: dt.datetime.fromisoformat(e["fixture"]["utc_date"].replace("Z", "+00:00")) - now
        listing = [e for e in listing if dt.timedelta(0) < soon(e) <= dt.timedelta(minutes=within)]
        if not listing:
            return []
    games = []
    for e in listing:
        full = _get(f"{FEED}?events={e['event_id']}&includeOnly=fixture,markets")["events"][0]
        games.append(parse(full))
    snap = os.path.join(HERE, "data", "odds")
    os.makedirs(snap, exist_ok=True)
    with open(os.path.join(snap, f"superbet-{now:%Y-%m-%d-%H%M}.json"), "w", encoding="utf-8") as fh:
        json.dump({"fetched": now.isoformat(), "games": games}, fh)
    return games


def closing(home, away, kickoff):
    """The game's odds in the last saved pull before kick-off (an aware datetime), or None."""
    snap = os.path.join(HERE, "data", "odds")
    for f in sorted(glob.glob(os.path.join(snap, "superbet-*.json")), reverse=True):
        d = json.load(open(f, encoding="utf-8"))
        if dt.datetime.fromisoformat(d["fetched"]) >= kickoff:
            continue
        g = next((g for g in d["games"] if g["home"] == home and g["away"] == away), None)
        if g:
            return dict(g, fetched=d["fetched"])
    return None


if __name__ == "__main__":
    for g in fetch(days=4):
        print(g["home"], "-", g["away"], g.get("result", {}).get("odds"))
        for s, ls in g["stats"].items():
            mid = min(ls, key=lambda x: abs(x[3] - .5))
            print(f"   {s:10} {len(ls)} lines, nearest 50/50: {mid}")
