"""Market chances for the UEFA Referees games (user, 28 Nov 2026: "I want betting odds").

Reads a file of average 1X2 closing odds collected in the browser (kept outside this public repo), matches each game to
an Opta game in _uefa/raw by date, final score and team names, removes the bookmaker margin and writes only the fair
home/draw/away chances to _uefa/market.json, keyed by Opta match id. No prices and no bookmaker or source names are
stored here.

    python scripts/uefa_market_match.py <path to the collected odds json>
"""
import difflib
import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_uefa_referees as b  # noqa: E402

OUT = ROOT / "_uefa" / "market.json"
STOP = {"fc", "fk", "cf", "sc", "ac", "as", "afc", "cd", "club", "de", "kv", "sk", "nk", "bk", "if", "ff", "sv", "ss",
        "1", "the", "football", "calcio", "real", "sporting", "united", "city"}
ALIAS = {"psg": "paris saint germain", "inter": "internazionale", "man utd": "manchester united",
         "man city": "manchester city", "atl madrid": "atletico madrid", "atletico": "atletico madrid",
         "bayern munich": "bayern munchen", "sparta prague": "sparta praha", "slavia prague": "slavia praha",
         "crvena zvezda": "red star belgrade", "fcsb": "fcsb steaua", "nijmegen": "nec", "aarhus": "agf",
         "din zagreb": "dinamo zagreb", "nottingham": "nottingham forest",
         "lask linzer": "lask", "nec nijmegen": "nec", "az alkmaar": "az", "agf aarhus": "agf"}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = " ".join(s.split())
    return ALIAS.get(s, s)


def tokens(s):
    return {t for t in norm(s).split() if t not in STOP} or set(norm(s).split())


def sim(op_name, contestant):
    names = [contestant.get(k) for k in ("name", "shortName", "officialName", "code", "optaShortName") if contestant.get(k)]
    best = 0.0
    for n in names:
        a, c = norm(op_name), norm(n)
        ta, tc = tokens(op_name), tokens(n)
        jac = len(ta & tc) / len(ta | tc) if ta | tc else 0
        best = max(best, difflib.SequenceMatcher(None, a, c).ratio(), jac, 1.0 if a == c else 0)
    return best


def total(m):
    sc = m.get("scores") or {}
    t = sc.get("total") or sc.get("ft") or {}
    return t.get("home"), t.get("away")


def main(path):
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    rows = []
    for tag, games in raw["seasons"].items():
        for g in games:
            if g.get("odds") and "qualif" not in (g.get("stage") or "").lower():
                g["d"] = datetime.strptime(g["date"], "%d %b %Y").date()
                rows.append(g)
    by_day = defaultdict(list)
    for g in rows:
        by_day[g["d"]].append(g)
    matches = [m for m in b.load() if m.get("status") == "Played"]
    out, unmatched, used, mism = {}, [], set(), []
    for m in matches:
        d = date.fromisoformat(b.day(m))
        hs, as_ = total(m)
        best, best_s = None, 0.0
        for dd in (d, d - timedelta(days=1), d + timedelta(days=1)):
            for g in by_day.get(dd, []):
                if id(g) in used:
                    continue
                s = min(sim(g["home"], m["home"]), sim(g["away"], m["away"]))
                if (g["hs"], g["as"]) == (hs, as_):
                    s += .25
                if dd != d:
                    s -= .1
                if s > best_s:
                    best, best_s = g, s
        if best and best_s >= .75:
            used.add(id(best))
            if (best["hs"], best["as"]) != (hs, as_):
                mism.append(f'{b.day(m)} {m["home"]["name"]} - {m["away"]["name"]} {hs}-{as_} | {best["home"]} - {best["away"]} {best["hs"]}-{best["as"]}')
            inv = [1 / o for o in best["odds"]]
            out[m["id"]] = [round(x / sum(inv), 4) for x in inv]
        else:
            unmatched.append(f'{b.day(m)} {m["comp"]} {m["home"]["name"]} - {m["away"]["name"]} {hs}-{as_}'
                             + (f' | best: {best["home"]} - {best["away"]} {best["hs"]}-{best["as"]} ({best_s:.2f})' if best else ""))
    OUT.write_text(json.dumps(out, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"{len(out)} of {len(matches)} played games matched; {len(unmatched)} unmatched")
    for u in unmatched[:40]:
        print("  ", u)
    print(f"{len(mism)} matched with a different score (check):")
    for u in mism:
        print("  ", u)


if __name__ == "__main__":
    main(sys.argv[1])
