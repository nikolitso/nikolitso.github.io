"""UEFA Referees (/football/uefa-referees/): referee card and foul records in the Champions League, Europa League and
Conference League, main competition only (league phase onwards), 2024-25 onwards.

Data: Opta match feed, read in the browser by scripts/uefa_referees_collect.js and saved to _uefa/raw/*.json.

    python scripts/build_uefa_referees.py            # settles every match and writes the pages
    python scripts/build_uefa_referees.py --check    # settles and prints the totals, writes nothing

Card count, as bookmakers settle card markets (user, 27-28 Nov 2026):
- a yellow card counts 1, a red card 2; a second yellow is ignored and only its red counts, so a player's
  maximum is 3 (yellow 1 + red 2);
- cards to non-players do not count: managers and staff, substitutes who have not come on, and players already
  substituted off (checked against the lineups and the substitution timestamps);
- the scheduled 90 minutes only (first and second half, stoppage time included); cards after the full-time whistle,
  in extra time or in a shoot-out never count (Opta puts these in periods other than 1 and 2).
"""
import html
import json
import math
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "_uefa" / "raw"
# each referee's football association, by Opta referee id (user, 28 Nov 2026: country next to the name). Not in the
# Opta feed: Wikidata nationality, set to the association UEFA lists (England/Scotland, not United Kingdom), the rest
# by hand; checked against the data: no referee ever had a game with a club from that country. Add new referees here.
COUNTRIES = ROOT / "_uefa" / "referee_countries.json"
OUT = ROOT / "football" / "uefa-referees"
URL = "/football/uefa-referees/"
SITE = "https://antonisnikolitsopoulos.com"
sys.path.insert(0, str(ROOT / "scripts"))

COMPS = {"UCL": "Champions League", "UEL": "Europa League", "UECL": "Conference League"}
POINTS = {"YC": 1, "Y2C": 2, "RC": 2}
NORMAL_TIME = {1, 2, 10}          # 10 = the half-time break: a card shown then is still a normal-time card
BUCKETS = ["1–15", "16–30", "31–45+", "46–60", "61–75", "76–90+"]
SHRINK = 10                       # matches of league-average record added to every referee's card index
LINES = (3.5, 4.5, 5.5)


# ---------------------------------------------------------------- data

def load():
    """Every match from _uefa/raw, newest file winning for a match read twice."""
    seen = {}
    for f in sorted(RAW.glob("*.json"), key=lambda p: p.stat().st_mtime):
        d = json.loads(f.read_text(encoding="utf-8"))
        for block in d.get("files", [d]):
            for m in block.get("matches") or []:
                if m and m.get("id"):
                    seen[m["id"]] = m
    return list(seen.values())


def _key(ev):
    return ev.get("timestamp") or f"{ev.get('periodId', 0):02d}:{ev.get('timeMinSec', '')}"


def on_pitch(m, card):
    """True if the carded person was a player on the pitch at that moment; None if the lineups are missing."""
    pid, cid = card.get("playerId"), card.get("contestantId")
    if not pid:
        return False                                    # a manager or member of staff
    team = (m.get("teams") or {}).get(cid)
    if not team:
        return None
    t = _key(card)
    subs = [s for s in m.get("subs") or [] if s.get("contestantId") == cid]
    came_on = any(s.get("playerOnId") == pid and _key(s) <= t for s in subs)
    went_off = any(s.get("playerOffId") == pid and _key(s) < t for s in subs)
    return (pid in team["start"] or came_on) and not went_off


def bucket(card):
    mins, per = card.get("timeMin") or 0, card.get("periodId")
    if per == 1:
        return 0 if mins <= 15 else 1 if mins <= 30 else 2
    return 3 if mins <= 60 else 4 if mins <= 75 else 5


def settle(m):
    """One played match -> its card count by team, half and quarter-hour, plus fouls and the cards left out."""
    home, away = m["home"]["id"], m["away"]["id"]
    side = {home: "h", away: "a"}
    r = {"pts": {"h": 0, "a": 0}, "yc": {"h": 0, "a": 0}, "rc": {"h": 0, "a": 0},
         "half": [0, 0], "buckets": [0] * 6, "excluded": [], "extra_time": 0, "first": None, "unchecked": 0}
    for c in sorted(m.get("cards") or [], key=_key):
        s = side.get(c.get("contestantId"))
        p = POINTS.get(c.get("type"))
        if s is None or p is None:
            continue
        if c.get("periodId") not in NORMAL_TIME:
            r["extra_time"] += p
            continue
        ok = on_pitch(m, c)
        if ok is False:
            r["excluded"].append(c.get("playerName") or c.get("officialName") or "staff")
            continue
        if ok is None:
            r["unchecked"] += 1
        r["pts"][s] += p
        r["yc" if c["type"] == "YC" else "rc"][s] += 1
        r["half"][0 if c.get("periodId") == 1 else 1] += p
        r["buckets"][bucket(c)] += p
        if r["first"] is None:
            r["first"] = c.get("timeMin")
    teams = m.get("teams") or {}
    r["fouls"] = {s: (teams.get(cid) or {}).get("fouls") for cid, s in side.items()}
    return r


def main_ref(m):
    for o in m.get("officials") or []:
        if o.get("type") == "Main" and o.get("name"):
            return o
    return None


_countries = None


def country(rid):
    global _countries
    if _countries is None:
        _countries = json.loads(COUNTRIES.read_text(encoding="utf-8")) if COUNTRIES.exists() else {}
    return (_countries.get(rid) or {}).get("country", "")


def with_country(name, rid):
    c = country(rid)
    return f'{esc(name)}{f" <span class=\"ctry\">{esc(c)}</span>" if c else ""}'


def slugify(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def day(m):
    return (m.get("date") or "")[:10]


def kickoff(m):
    """'2026-12-08T20:00Z' style UTC datetime of the match."""
    t = (m.get("time") or "00:00:00Z").rstrip("Z")[:5]
    try:
        return datetime.fromisoformat(f"{day(m)}T{t}").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


# ---------------------------------------------------------------- numbers

def build_rows(matches):
    """Played matches with a referee, settled: the rows every page is made from."""
    rows = []
    for m in matches:
        if m.get("status") != "Played":
            continue
        ref = main_ref(m)
        if not ref:
            continue
        s = settle(m)
        ft = ((m.get("scores") or {}).get("ft") or {})
        fh, fa = s["fouls"]["h"], s["fouls"]["a"]
        rows.append({
            "id": m["id"], "comp": m["comp"], "season": m["season"], "stage": m.get("stage") or "",
            "date": day(m), "home": m["home"]["name"], "away": m["away"]["name"],
            "score": f"{ft.get('home', '')}–{ft.get('away', '')}" if ft else "",
            "ref_id": ref["id"], "ref": ref["name"],
            "hp": s["pts"]["h"], "ap": s["pts"]["a"], "pts": s["pts"]["h"] + s["pts"]["a"],
            "yc": s["yc"]["h"] + s["yc"]["a"], "rc": s["rc"]["h"] + s["rc"]["a"],
            "p1": s["half"][0], "p2": s["half"][1], "b": s["buckets"],
            "fouls": (fh + fa) if fh is not None and fa is not None else None,
            "excluded": s["excluded"], "et": s["extra_time"], "first": s["first"], "unchecked": s["unchecked"],
        })
    rows.sort(key=lambda r: (r["date"], r["home"]))
    return rows


def baselines(rows):
    """Average card count per match in each competition-season: what a referee's games are compared with."""
    acc = defaultdict(lambda: [0, 0])
    for r in rows:
        a = acc[(r["comp"], r["season"])]
        a[0] += r["pts"]; a[1] += 1
    return {k: v[0] / v[1] for k, v in acc.items()}


def summary(rs, base):
    """A referee's (or any set of games') record."""
    n = len(rs)
    if not n:
        return None
    pts = [r["pts"] for r in rs]
    exp = sum(base[(r["comp"], r["season"])] for r in rs)
    avg_exp = exp / n
    mean = sum(pts) / n
    sd = math.sqrt(sum((x - mean) ** 2 for x in pts) / (n - 1)) if n > 1 else 0.0
    fouled = [r for r in rs if r["fouls"] is not None]
    fouls = sum(r["fouls"] for r in fouled)
    cards_in_fouled = sum(r["yc"] + r["rc"] for r in fouled)
    dist = [0] * 10
    for x in pts:
        dist[min(x, 9)] += 1
    return {
        "n": n, "pts": sum(pts), "avg": mean, "sd": sd,
        "yc": sum(r["yc"] for r in rs) / n, "rc": sum(r["rc"] for r in rs) / n,
        "hp": sum(r["hp"] for r in rs) / n, "ap": sum(r["ap"] for r in rs) / n,
        "p1": sum(r["p1"] for r in rs) / n, "p2": sum(r["p2"] for r in rs) / n,
        "fouls": fouls / len(fouled) if fouled else None,
        "per_foul": cards_in_fouled / fouls if fouls else None,
        "over": {ln: sum(x > ln for x in pts) / n for ln in LINES},
        "dist": dist, "b": [sum(r["b"][i] for r in rs) / n for i in range(6)],
        "exp": avg_exp, "index_raw": mean / avg_exp if avg_exp else None,
        "index": (sum(pts) + SHRINK * avg_exp) / (exp + SHRINK * avg_exp) if avg_exp else None,
        "first": sorted(r["first"] for r in rs if r["first"] is not None),
    }


def reliability(n):
    if n < 10:
        return "Small sample: treat these numbers as a first impression."
    if n < 25:
        return "Moderate sample: averages can still move by half a card or more."
    return "Solid sample for UEFA games, though one referee's card average still carries real noise."


# ---------------------------------------------------------------- html

esc = html.escape


def f1(x):
    return "–" if x is None else f"{x:.1f}"


def f2(x):
    return "–" if x is None else f"{x:.2f}"


def pct(x):
    return "–" if x is None else f"{round(100 * x)}%"


def fdate_short(d):
    try:
        return datetime.fromisoformat(d).strftime("%d %b %Y").lstrip("0")
    except ValueError:
        return d


CSS = """
:root{--an-wrap:1180px}*{box-sizing:border-box}body{margin:0;background:var(--an-paper);color:var(--an-ink);font:19px/1.6 var(--an-body)}a{color:inherit}
.wrap{max-width:1180px;margin:auto;padding:28px 16px 80px}
.eyebrow{font:600 14px/1.4 var(--an-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--an-muted)}
.intro h2{font:400 40px/1.08 var(--an-display);margin:4px 0 10px}.lede{color:var(--an-muted);max-width:72ch;margin:0}
.section{margin-top:44px}.section-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-head h2{font:400 32px/1.1 var(--an-display);margin:0}.desc{font-size:16px;color:var(--an-muted);margin:0 0 14px;max-width:80ch}
.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.metric,.panel{background:var(--an-soft);border:1px solid var(--an-rule);border-radius:10px}
.metric{padding:15px 16px}.metric strong{display:block;font:400 34px/1.1 var(--an-display);margin:6px 0 2px}.metric small{color:var(--an-muted);font-size:15px}
.panel{padding:20px;min-width:0}.panel h3{font:400 26px var(--an-display);margin:0 0 6px}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th{text-align:left;color:var(--an-muted);font:600 13.5px var(--an-mono);letter-spacing:.07em;text-transform:uppercase;padding:10px 8px;border-bottom:1px solid var(--an-rule);white-space:nowrap}
td{padding:10px 8px;border-bottom:1px solid color-mix(in srgb,var(--an-rule) 70%,transparent);font-size:17px}
td.n,th.n{text-align:right;font-family:var(--an-mono);font-size:16px;white-space:nowrap}
th.sort{cursor:pointer}th.sort:hover{color:var(--an-ink)}th.sort[aria-sort]{color:var(--an-accent)}
td a{text-decoration:none;border-bottom:1px solid var(--an-accent-line)}td a:hover{color:var(--an-accent)}
.ctry{color:var(--an-muted);font-size:.78em;font-weight:400;margin-left:.35em;white-space:nowrap}.muted{color:var(--an-muted)}.small{font-size:15px}
.controls{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:0 0 14px}
.seg{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:none;border:1px solid var(--an-rule);border-radius:999px;color:var(--an-muted);font:500 15px var(--an-mono);padding:6px 13px;cursor:pointer}
.chip:hover{color:var(--an-ink)}.chip.on{background:var(--an-accent);border-color:var(--an-accent);color:var(--an-on-accent)}
select,input[type=search],input[type=number]{background:var(--an-paper);color:var(--an-ink);border:1px solid var(--an-rule);border-radius:8px;padding:8px 11px;font:16px var(--an-body)}
input[type=search]{min-width:min(340px,100%)}
.bars{display:grid;gap:6px}.bars .row{display:grid;grid-template-columns:76px minmax(0,1fr) 64px;gap:10px;align-items:center;font:15px var(--an-mono);color:var(--an-muted)}
.bars .track{height:14px;background:color-mix(in srgb,var(--an-rule) 55%,transparent);border-radius:4px;overflow:hidden}
.bars .fill{display:block;height:100%;background:var(--an-accent);border-radius:0 4px 4px 0}
.bars .v{text-align:right;color:var(--an-ink)}
.cols-chart{display:flex;align-items:flex-end;gap:4px;height:150px;padding-top:8px;border-bottom:1px solid var(--an-rule)}
.cols-chart span{flex:1;background:var(--an-accent);border-radius:4px 4px 0 0;min-height:2px;position:relative}
.cols-chart span:hover{opacity:.8}
.cols-x{display:flex;gap:4px;font:13.5px var(--an-mono);color:var(--an-muted);margin-top:5px}.cols-x span{flex:1;text-align:center}
.tag{display:inline-block;font:500 13px var(--an-mono);letter-spacing:.05em;border:1px solid var(--an-rule);border-radius:6px;padding:1px 7px;color:var(--an-muted);margin-right:4px}
.idx-up{color:var(--an-ink)}.idx-down{color:var(--an-muted)}
.note{color:var(--an-muted);font-size:15px;line-height:1.6;margin:12px 0 0}
.method p,.method li{max-width:78ch}.method h3{font:400 24px var(--an-display);margin:22px 0 6px}
.dir{columns:3 240px;column-gap:24px;padding:0;margin:0;list-style:none}.dir li{break-inside:avoid;padding:5px 0;border-bottom:1px solid color-mix(in srgb,var(--an-rule) 60%,transparent);font-size:17px}
.dir a{text-decoration:none}.dir a:hover{color:var(--an-accent)}.dir small{color:var(--an-muted);font:14px var(--an-mono);margin-left:6px}
.appt{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:12px}
.appt .panel h3{font-size:23px}.appt .facts{display:flex;flex-wrap:wrap;gap:6px 16px;font:15px var(--an-mono);color:var(--an-muted);margin-top:8px}.appt .facts b{color:var(--an-ink);font-weight:500}
.foot{margin-top:50px;color:var(--an-muted);font-size:15px;border-top:1px solid var(--an-rule);padding-top:16px}
@media(max-width:860px){.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cols,.cols3{grid-template-columns:1fr}.intro h2{font-size:32px}}
"""

TABS = [("overview", URL, "Overview"), ("appointments", URL + "appointments/", "Appointments"),
        ("referees", URL + "#referees", "Referees"), ("method", URL + "#method", "Method")]


def page(*, path, title, h1, desc, body, tab, script="", kicker="Football · UEFA Referees"):
    from head_nav import menu
    canonical = SITE + path
    tabs = "".join(f'<a{" class=\"on\"" if k == tab else ""} href="{h}">{l}</a>' for k, h, l in TABS)
    home_h1 = f"<h1>{esc(h1)}</h1>" if path == URL else "UEFA Referees"
    ld = {"@context": "https://schema.org", "@type": "WebPage", "url": canonical, "name": title, "description": desc,
          "inLanguage": "en", "isPartOf": {"@id": SITE + "/#website"}}
    return f"""<!doctype html>
<html lang="en" data-site="football">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:type" content="website">
<meta property="og:image" content="{SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/assets/an.css?v=5">
<style>{CSS}</style>
</head>
<body>
<nav class="an-sitebar" aria-label="Main site"><div><a href="/books/">Books</a><a href="/#projects">Projects</a><a href="/about/">About</a><a href="/" aria-label="Main site">⌂</a></div></nav>
{menu(URL)}
<header class="an-head"><div><a class="an-home" href="{URL}">{home_h1}</a><a class="an-brand" href="{URL}"><svg class="an-mark" aria-hidden="true"><use href="/assets/marks.svg#football"/></svg><span><small class="an-kicker">{esc(kicker)}</small></span></a><nav class="an-tabs" aria-label="Sections">{tabs}</nav></div></header>
<main class="wrap">
{body}
</main>
{script}
</body></html>
"""


def bars(values, labels, fmt=f1, title=""):
    top = max(values) or 1
    rows = "".join(
        f'<div class="row" title="{esc(title)}{esc(l)}: {fmt(v)}"><span>{esc(l)}</span><span class="track">'
        f'<span class="fill" style="width:{100 * v / top:.1f}%"></span></span><span class="v">{fmt(v)}</span></div>'
        for v, l in zip(values, labels))
    return f'<div class="bars">{rows}</div>'


def columns(counts, labels, unit="games"):
    top = max(counts) or 1
    total = sum(counts) or 1
    cols = "".join(f'<span style="height:{100 * c / top:.1f}%" title="{esc(l)} cards: {c} {unit} ({round(100 * c / total)}%)"></span>'
                   for c, l in zip(counts, labels))
    xs = "".join(f"<span>{esc(l)}</span>" for l in labels)
    return f'<div class="cols-chart" role="img" aria-label="Distribution of match card counts">{cols}</div><div class="cols-x">{xs}</div>'


def comp_tags(comps):
    return "".join(f'<span class="tag">{c}</span>' for c in ["UCL", "UEL", "UECL"] if c in comps)


# ---------------------------------------------------------------- pages

def build(matches):
    rows = build_rows(matches)
    base = baselines(rows)
    by_ref = defaultdict(list)
    names = {}
    for r in rows:
        by_ref[r["ref_id"]].append(r)
        names[r["ref_id"]] = r["ref"]
    # one slug per referee; a clash (two referees with one name) gets the Opta id's start
    slugs, used = {}, defaultdict(list)
    for rid, nm in names.items():
        used[slugify(nm)].append(rid)
    for s, ids in used.items():
        for rid in ids:
            slugs[rid] = s if len(ids) == 1 else f"{s}-{rid[:5]}"

    now = datetime.now(timezone.utc)
    upcoming = []
    for m in matches:
        ko = kickoff(m)
        if m.get("status") in ("Fixture", "Playing") and ko and ko >= now.replace(hour=0, minute=0, second=0):
            upcoming.append((ko, m, main_ref(m)))
    upcoming.sort(key=lambda x: x[0])
    nxt = {}
    for ko, m, ref in upcoming:
        if ref and ref["id"] not in nxt:
            nxt[ref["id"]] = (ko, m)
            if ref["id"] not in names:
                names[ref["id"]] = ref["name"]
                slugs.setdefault(ref["id"], slugify(ref["name"]))

    seasons = sorted({r["season"] for r in rows})
    updated = now.strftime("%d %b %Y").lstrip("0")
    written = []

    # ---- referee profiles
    for rid, rs in by_ref.items():
        written.append(profile(rid, names[rid], slugs[rid], rs, base, nxt.get(rid), seasons, updated))

    # ---- appointments
    written.append(appointments_page(upcoming, by_ref, base, slugs, updated))

    # ---- dashboard
    written.append(dashboard(rows, base, by_ref, names, slugs, seasons, upcoming, updated))
    return rows, written


def write(rel, text):
    p = OUT / rel / "index.html" if rel else OUT / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8", newline="\n")
    return p


def appt_card(ko, m, ref, by_ref, base, slugs):
    comp = COMPS.get(m["comp"], m["comp"])
    head = f'<p class="eyebrow">{comp} · {esc(m.get("stage") or "")}</p><h3>{esc(m["home"]["name"])} – {esc(m["away"]["name"])}</h3>'
    when = ko.strftime("%a %d %b, %H:%M UTC").replace(" 0", " ")
    if not ref:
        return f'<article class="panel">{head}<div class="facts"><span>{when}</span><span>Referee not announced</span></div></article>'
    rs = by_ref.get(ref["id"], [])
    s = summary(rs, base) if rs else None
    link = (f'<a href="{URL}{slugs[ref["id"]]}/">{esc(ref["name"])}</a>' if ref["id"] in slugs and rs else esc(ref["name"]))
    link += f' <span class="ctry">{esc(country(ref["id"]))}</span>' if country(ref["id"]) else ""
    facts = (f'<span>Games <b>{s["n"]}</b></span><span>Cards/game <b>{f1(s["avg"])}</b></span>'
             f'<span>Index <b>{f2(s["index"])}</b></span><span>Over 4.5 <b>{pct(s["over"][4.5])}</b></span>') if s else \
        '<span>No UEFA main-competition games since 2024–25</span>'
    return f'<article class="panel">{head}<p style="margin:6px 0 0">Referee {link}</p><div class="facts"><span>{when}</span>{facts}</div></article>'


def appointments_page(upcoming, by_ref, base, slugs, updated):
    announced = [(ko, m, ref) for ko, m, ref in upcoming if ref]
    soon = upcoming[:24]
    if announced:
        cards = "".join(appt_card(ko, m, ref, by_ref, base, slugs) for ko, m, ref in announced)
        lead = f"<p class=\"desc\">{len(announced)} upcoming UEFA game{'s' if len(announced) != 1 else ''} with a referee named.</p>"
    else:
        cards = ""
        lead = ('<p class="desc">No referees have been named yet for the next UEFA matchday. UEFA usually announces them '
                'two or three days before kick-off; the page updates when the data does.</p>')
    nxt = "".join(appt_card(ko, m, ref, by_ref, base, slugs) for ko, m, ref in soon if not ref)
    body = f"""<section class="intro"><p class="eyebrow">Updated {updated}</p><h2>Upcoming referee appointments</h2>
<p class="lede">Who referees the next Champions League, Europa League and Conference League games, with each referee's card record in UEFA's main competitions since 2024–25.</p></section>
<section class="section"><div class="section-head"><h2>Announced</h2></div>{lead}<div class="appt">{cards}</div></section>
{f'<section class="section"><div class="section-head"><h2>Next games, referee to come</h2></div><div class="appt">{nxt}</div></section>' if nxt else ''}
<p class="foot">Card counts: yellow 1, red 2, a second yellow counts only as its red. Normal time only. <a href="{URL}#method">How the numbers are made →</a></p>"""
    return write("appointments", page(path=URL + "appointments/", title="UEFA referee appointments: who referees the next European games",
                                       h1="Appointments", desc="Referee appointments for upcoming Champions League, Europa League and Conference League games, with each referee's card record.",
                                       body=body, tab="appointments"))


def profile(rid, name, slug, rs, base, nxt, seasons, updated):
    s = summary(rs, base)
    comps = {r["comp"] for r in rs}
    # by competition and season
    groups = defaultdict(list)
    for r in rs:
        groups[(r["season"], r["comp"])].append(r)
    split_rows = ""
    for (season, comp) in sorted(groups, key=lambda k: (k[0], ["UCL", "UEL", "UECL"].index(k[1])), reverse=True):
        g = summary(groups[(season, comp)], base)
        split_rows += (f'<tr><td>{season.replace("-", "–")}</td><td>{COMPS[comp]}</td><td class="n">{g["n"]}</td>'
                       f'<td class="n">{f1(g["avg"])}</td><td class="n">{f1(g["exp"])}</td><td class="n">{f2(g["yc"])}</td>'
                       f'<td class="n">{f2(g["rc"])}</td><td class="n">{f1(g["fouls"])}</td></tr>')
    # match history
    hist = ""
    for r in sorted(rs, key=lambda r: r["date"], reverse=True):
        ex = f' title="Not counted: {esc(", ".join(r["excluded"]))}"' if r["excluded"] else ""
        hist += (f'<tr><td class="n" style="text-align:left">{fdate_short(r["date"])}</td><td><span class="tag">{r["comp"]}</span></td>'
                 f'<td>{esc(r["home"])} – {esc(r["away"])} <span class="muted small">{esc(r["score"])}</span></td>'
                 f'<td class="n">{r["hp"]}</td><td class="n">{r["ap"]}</td><td class="n"{ex}><b>{r["pts"]}</b>{"*" if r["excluded"] else ""}</td>'
                 f'<td class="n">{r["yc"]}</td><td class="n">{r["rc"]}</td><td class="n">{r["p1"]}–{r["p2"]}</td><td class="n">{"–" if r["fouls"] is None else r["fouls"]}</td></tr>')
    last10 = summary(sorted(rs, key=lambda r: r["date"])[-10:], base)
    se = s["sd"] / math.sqrt(s["n"]) if s["n"] > 1 else None
    rng = f'{f1(s["avg"] - 1.645 * se)}–{f1(s["avg"] + 1.645 * se)}' if se else "–"
    nxt_html = ""
    if nxt:
        ko, m = nxt
        nxt_html = (f'<div class="panel" style="margin-top:18px"><p class="eyebrow">Next appointment</p><h3>{esc(m["home"]["name"])} – {esc(m["away"]["name"])}</h3>'
                    f'<p class="muted" style="margin:0">{COMPS[m["comp"]]} · {esc(m.get("stage") or "")} · {ko.strftime("%a %d %b %Y, %H:%M UTC").replace(" 0", " ")}</p></div>')
    idx = s["index"]
    idx_text = ("about average" if abs(idx - 1) < .05 else
                f"{round(abs(idx - 1) * 100)}% {'more' if idx > 1 else 'fewer'} cards than the average referee in the same competitions")
    first = s["first"]
    med_first = first[len(first) // 2] if first else None
    body = f"""<section class="intro"><p class="eyebrow">Referee profile · Updated {updated}</p><h2>{with_country(name, rid)}</h2>
<p class="lede">{esc(name)}'s card and foul record in UEFA's main club competitions since 2024–25: {s["n"]} game{'s' if s['n'] != 1 else ''} {comp_tags(comps)}</p></section>
{nxt_html}
<section class="section"><div class="metric-grid">
<div class="metric"><span class="eyebrow">Cards per game</span><strong>{f1(s["avg"])}</strong><small>competition average {f1(s["exp"])}</small></div>
<div class="metric"><span class="eyebrow">Card index</span><strong>{f2(idx)}</strong><small>1.00 = average · raw {f2(s["index_raw"])}</small></div>
<div class="metric"><span class="eyebrow">Yellows · reds</span><strong>{f2(s["yc"])} · {f2(s["rc"])}</strong><small>per game</small></div>
<div class="metric"><span class="eyebrow">Fouls per game</span><strong>{f1(s["fouls"])}</strong><small>{f2(s["per_foul"])} cards per foul</small></div>
</div>
<p class="note">Adjusted for the competitions refereed, {esc(name)} shows {idx_text}. Last 10 games: {f1(last10["avg"])} cards a game. {reliability(s["n"])} A 90% range for the true average: {rng} cards.</p></section>

<section class="section"><div class="cols">
<div class="panel"><h3>Match card totals</h3><p class="desc">How many cards the referee's games produced (yellow 1, red 2).</p>{columns(s["dist"], [str(i) for i in range(9)] + ["9+"])}
<p class="note">Over 3.5 in {pct(s["over"][3.5])} · over 4.5 in {pct(s["over"][4.5])} · over 5.5 in {pct(s["over"][5.5])} of the referee's games.</p></div>
<div class="panel"><h3>When the cards come</h3><p class="desc">Cards per game by quarter-hour, stoppage time in the last block of each half.</p>{bars(s["b"], BUCKETS, f2)}
<p class="note">First half {f1(s["p1"])} · second half {f1(s["p2"])} per game{f" · median first card in minute {med_first}" if med_first is not None else ""}.</p></div>
</div></section>

<section class="section"><div class="cols">
<div class="panel"><h3>Home and away</h3><p class="desc">Cards per game to each side.</p>{bars([s["hp"], s["ap"]], ["Home", "Away"], f2)}</div>
<div class="panel"><h3>Fouls and sanctions</h3><p class="desc">How often a foul becomes a card in these games.</p>
<div class="metric-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="metric"><span class="eyebrow">Fouls per game</span><strong>{f1(s["fouls"])}</strong><small>both teams</small></div>
<div class="metric"><span class="eyebrow">Fouls per card</span><strong>{f1(1 / s["per_foul"]) if s["per_foul"] else "–"}</strong><small>yellows and reds</small></div></div></div>
</div></section>

<section class="section"><div class="section-head"><h2>By season and competition</h2></div>
<div class="scroll"><table><thead><tr><th>Season</th><th>Competition</th><th class="n">Games</th><th class="n">Cards/g</th><th class="n">Comp. avg</th><th class="n">YC/g</th><th class="n">RC/g</th><th class="n">Fouls/g</th></tr></thead><tbody>{split_rows}</tbody></table></div></section>

<section class="section"><div class="section-head"><h2>Every game</h2><span class="muted small">Cards: home · away · total · YC · RC · 1st–2nd half</span></div>
<div class="scroll"><table class="sortable"><thead><tr><th>Date</th><th></th><th>Game</th><th class="n">Home</th><th class="n">Away</th><th class="n">Cards</th><th class="n">YC</th><th class="n">RC</th><th class="n">Halves</th><th class="n">Fouls</th></tr></thead><tbody>{hist}</tbody></table></div>
<p class="note">* a card was shown that does not count (to a manager, a substitute on the bench or a player already substituted off); hover the total to see whose.</p></section>
<p class="foot"><a href="{URL}">← All UEFA referees</a> · <a href="{URL}#method">How the numbers are made</a> · Data: Opta match feed.</p>"""
    nat = f" ({country(rid)})" if country(rid) else ""
    title = f"{name}{nat}: referee stats in the Champions League, Europa League and Conference League"
    desc = f"{name}{nat}: UEFA referee record since 2024-25: {s['n']} games, {s['avg']:.1f} cards per game, card timing, home and away, fouls and every game."
    return write(slug, page(path=f"{URL}{slug}/", title=title, h1=name, desc=desc, body=body, tab="referees"))


DASH_JS = r"""
<script>
(() => {
const D = window.UEFA, C = {UCL:'Champions League', UEL:'Europa League', UECL:'Conference League'};
let season = D.seasons[D.seasons.length - 1], comp = 'all', minN = 3, sortKey = 'n', sortDir = -1;
const $ = s => document.querySelector(s), f1 = x => x == null || isNaN(x) ? '–' : x.toFixed(1), f2 = x => x == null || isNaN(x) ? '–' : x.toFixed(2);
const pick = () => D.m.filter(r => (season === 'all' || r[1] === season) && (comp === 'all' || r[0] === comp));
const base = {}; { const a = {}; D.m.forEach(r => { const k = r[0] + r[1]; (a[k] = a[k] || [0, 0]); a[k][0] += r[3] + r[4]; a[k][1]++; }); for (const k in a) base[k] = a[k][0] / a[k][1]; }
function agg(rs) {
  const n = rs.length; if (!n) return null;
  let p = 0, e = 0, hp = 0, ap = 0, p1 = 0, p2 = 0, yc = 0, rc = 0, f = 0, fn = 0, o45 = 0;
  rs.forEach(r => { const t = r[3] + r[4]; p += t; e += base[r[0] + r[1]]; hp += r[3]; ap += r[4]; p1 += r[5]; p2 += r[6]; yc += r[7]; rc += r[8]; if (r[9] != null) { f += r[9]; fn++; } if (t > 4.5) o45++; });
  return {n, avg: p / n, exp: e / n, idx: (p + 10 * e / n) / (e + 10 * e / n), hp: hp / n, ap: ap / n, p1: p1 / n, p2: p2 / n, yc: yc / n, rc: rc / n, fouls: fn ? f / fn : null, o45: o45 / n};
}
function render() {
  const rs = pick(), a = agg(rs) || {};
  const refs = new Set(rs.map(r => r[2]));
  $('#k-m').textContent = rs.length; $('#k-r').textContent = refs.size; $('#k-c').textContent = f1(a.avg); $('#k-f').textContent = f1(a.fouls);
  $('#k-cs').textContent = a.n ? `home ${f1(a.hp)} · away ${f1(a.ap)} · reds ${f2(a.rc)}` : '';
  $('#k-fs').textContent = a.n && a.fouls ? `one card every ${f1(a.fouls / (a.yc + a.rc))} fouls` : '';
  // rankings
  const by = {}; rs.forEach(r => (by[r[2]] = by[r[2]] || []).push(r));
  let list = Object.entries(by).map(([i, xs]) => ({i: +i, ...agg(xs)})).filter(x => x.n >= minN);
  list.sort((x, y) => sortKey === 'name' ? sortDir * D.refs[x.i][0].localeCompare(D.refs[y.i][0]) : sortDir * ((x[sortKey] ?? -1) - (y[sortKey] ?? -1)));
  $('#rank tbody').innerHTML = list.map(x => `<tr><td><a href="${D.url}${D.refs[x.i][1]}/">${D.refs[x.i][0]}</a>${D.refs[x.i][2] ? ` <span class="ctry">${D.refs[x.i][2]}</span>` : ''}</td><td class="n">${x.n}</td><td class="n">${f1(x.avg)}</td><td class="n">${f2(x.yc)}</td><td class="n">${f2(x.rc)}</td><td class="n">${f1(x.hp)}–${f1(x.ap)}</td><td class="n">${f1(x.p1)}–${f1(x.p2)}</td><td class="n">${f1(x.fouls)}</td><td class="n">${Math.round(100 * x.o45)}%</td><td class="n"><b class="${x.idx >= 1 ? 'idx-up' : 'idx-down'}">${f2(x.idx)}</b></td></tr>`).join('') || '<tr><td colspan="10" class="muted">No referee has that many games in this selection.</td></tr>';
  $('#rank-note').textContent = `${list.length} referee${list.length === 1 ? '' : 's'} with ${minN}+ game${minN === 1 ? '' : 's'} · ${season === 'all' ? 'all seasons' : season.replace('-', '–')} · ${comp === 'all' ? 'all three competitions' : C[comp]}`;
  document.querySelectorAll('#rank th.sort').forEach(th => th.dataset.k === sortKey ? th.setAttribute('aria-sort', sortDir < 0 ? 'descending' : 'ascending') : th.removeAttribute('aria-sort'));
  // competitions
  const cs = season === 'all' ? D.m : D.m.filter(r => r[1] === season);
  $('#comp tbody').innerHTML = ['UCL', 'UEL', 'UECL'].map(c => { const x = agg(cs.filter(r => r[0] === c)); return x ? `<tr><td>${C[c]}</td><td class="n">${x.n}</td><td class="n">${f1(x.avg)}</td><td class="n">${f2(x.yc)}</td><td class="n">${f2(x.rc)}</td><td class="n">${f1(x.hp)}–${f1(x.ap)}</td><td class="n">${f1(x.p1)}–${f1(x.p2)}</td><td class="n">${f1(x.fouls)}</td><td class="n">${Math.round(100 * x.o45)}%</td></tr>` : ''; }).join('');
  // distribution and timing
  const dist = Array(10).fill(0); rs.forEach(r => dist[Math.min(r[3] + r[4], 9)]++); const top = Math.max(...dist, 1);
  $('#dist').innerHTML = dist.map((c, i) => `<span style="height:${100 * c / top}%" title="${i === 9 ? '9+' : i} cards: ${c} games (${rs.length ? Math.round(100 * c / rs.length) : 0}%)"></span>`).join('');
  const b = [0, 0, 0, 0, 0, 0]; rs.forEach(r => r[10].forEach((v, i) => b[i] += v)); const bt = Math.max(...b, 1);
  $('#timing').innerHTML = b.map((v, i) => `<div class="row" title="${D.buckets[i]}: ${f2(v / (rs.length || 1))} cards per game"><span>${D.buckets[i]}</span><span class="track"><span class="fill" style="width:${100 * v / bt}%"></span></span><span class="v">${f2(v / (rs.length || 1))}</span></div>`).join('');
  // seasons trend
  $('#trend tbody').innerHTML = D.seasons.map(s => { const x = agg(D.m.filter(r => r[1] === s && (comp === 'all' || r[0] === comp))); return x ? `<tr><td>${s.replace('-', '–')}</td><td class="n">${x.n}</td><td class="n">${f1(x.avg)}</td><td class="n">${f1(x.hp)}–${f1(x.ap)}</td><td class="n">${f1(x.p1)}–${f1(x.p2)}</td><td class="n">${f1(x.fouls)}</td></tr>` : ''; }).join('');
}
document.querySelectorAll('[data-season]').forEach(b => b.addEventListener('click', () => { season = b.dataset.season; document.querySelectorAll('[data-season]').forEach(x => x.classList.toggle('on', x === b)); render(); }));
document.querySelectorAll('[data-comp]').forEach(b => b.addEventListener('click', () => { comp = b.dataset.comp; document.querySelectorAll('[data-comp]').forEach(x => x.classList.toggle('on', x === b)); render(); }));
$('#minn').addEventListener('input', e => { minN = Math.max(1, +e.target.value || 1); render(); });
document.querySelectorAll('#rank th.sort').forEach(th => th.addEventListener('click', () => { const k = th.dataset.k; sortDir = sortKey === k ? -sortDir : (k === 'name' ? 1 : -1); sortKey = k; render(); }));
const q = $('#q'); q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); document.querySelectorAll('#dir li').forEach(li => li.hidden = v && !li.dataset.s.includes(v)); });
render();
})();
</script>"""


def dashboard(rows, base, by_ref, names, slugs, seasons, upcoming, updated):
    ref_ids = sorted(by_ref, key=lambda r: names[r])
    idx = {rid: i for i, rid in enumerate(ref_ids)}
    data = {
        "url": URL, "seasons": seasons, "buckets": BUCKETS,
        "refs": [[names[r], slugs[r], country(r)] for r in ref_ids],
        # comp, season, referee, home cards, away cards, 1st half, 2nd half, yellows, reds, fouls, quarter-hours
        "m": [[r["comp"], r["season"], idx[r["ref_id"]], r["hp"], r["ap"], r["p1"], r["p2"], r["yc"], r["rc"], r["fouls"], r["b"]] for r in rows],
    }
    announced = [(ko, m, ref) for ko, m, ref in upcoming if ref][:6]
    appt = "".join(appt_card(ko, m, ref, by_ref, base, slugs) for ko, m, ref in announced)
    if not appt:
        nxt = upcoming[0] if upcoming else None
        when = f' The next UEFA games are on {nxt[0].strftime("%a %d %b").replace(" 0", " ")}.' if nxt else ""
        appt = f'<p class="desc">No referees named yet for the next matchday: UEFA usually announces them two or three days before kick-off.{when}</p>'
    season_btns = "".join(f'<button class="chip{" on" if s == seasons[-1] else ""}" data-season="{s}">{s.replace("-", "–")}</button>' for s in seasons) + \
        '<button class="chip" data-season="all">All seasons</button>'
    comp_btns = '<button class="chip on" data-comp="all">All</button>' + "".join(
        f'<button class="chip" data-comp="{c}">{COMPS[c]}</button>' for c in ["UCL", "UEL", "UECL"])
    directory = "".join(
        f'<li data-s="{esc(slugify(names[r]).replace("-", " "))} {esc(slugify(country(r)).replace("-", " "))} {" ".join(sorted({x["comp"].lower() for x in by_ref[r]}))}">'
        f'<a href="{URL}{slugs[r]}/">{esc(names[r])}</a>{f" <span class=\"ctry\">{esc(country(r))}</span>" if country(r) else ""}<small>{len(by_ref[r])} · {"/".join(c for c in ["UCL", "UEL", "UECL"] if any(x["comp"] == c for x in by_ref[r]))}</small></li>'
        for r in ref_ids)
    total_pts = sum(r["pts"] for r in rows)
    excluded = sum(len(r["excluded"]) for r in rows)
    et = sum(1 for r in rows if r["et"])
    body = f"""<section class="intro"><p class="eyebrow">Updated {updated} · {len(rows)} games · {len(by_ref)} referees</p><h2>UEFA Referees</h2>
<p class="lede">Statistical profiles, match appointments and disciplinary trends across European club competitions: every referee in the Champions League, Europa League and Conference League since 2024–25, league phase onwards.</p></section>

<section class="section"><div class="controls"><div class="seg" role="group" aria-label="Season">{season_btns}</div><div class="seg" role="group" aria-label="Competition">{comp_btns}</div></div>
<div class="metric-grid">
<div class="metric"><span class="eyebrow">Games</span><strong id="k-m">–</strong><small>played, with a referee</small></div>
<div class="metric"><span class="eyebrow">Referees</span><strong id="k-r">–</strong><small>in charge of at least one</small></div>
<div class="metric"><span class="eyebrow">Cards per game</span><strong id="k-c">–</strong><small id="k-cs"></small></div>
<div class="metric"><span class="eyebrow">Fouls per game</span><strong id="k-f">–</strong><small id="k-fs"></small></div>
</div></section>

<section class="section"><div class="section-head"><h2>Upcoming appointments</h2><a class="small" href="{URL}appointments/">All appointments →</a></div><div class="appt">{appt}</div></section>

<section class="section" id="rankings"><div class="section-head"><h2>Referee rankings</h2><label class="small muted">Min. games <input id="minn" type="number" min="1" value="3" style="width:76px"></label></div>
<p class="desc">Cards per game count a yellow as 1 and a red as 2. The index compares each referee with the average game in the same competitions and seasons (1.00 = average), pulled toward 1.00 for short records. Click a heading to sort.</p>
<div class="scroll"><table id="rank"><thead><tr><th class="sort" data-k="name">Referee</th><th class="n sort" data-k="n">Games</th><th class="n sort" data-k="avg">Cards/g</th><th class="n sort" data-k="yc">YC/g</th><th class="n sort" data-k="rc">RC/g</th><th class="n">Home–away</th><th class="n">1st–2nd half</th><th class="n sort" data-k="fouls">Fouls/g</th><th class="n sort" data-k="o45">Over 4.5</th><th class="n sort" data-k="idx">Index</th></tr></thead><tbody></tbody></table></div>
<p class="note" id="rank-note"></p></section>

<section class="section"><div class="section-head"><h2>Competition comparison</h2></div>
<div class="scroll"><table id="comp"><thead><tr><th>Competition</th><th class="n">Games</th><th class="n">Cards/g</th><th class="n">YC/g</th><th class="n">RC/g</th><th class="n">Home–away</th><th class="n">1st–2nd half</th><th class="n">Fouls/g</th><th class="n">Over 4.5</th></tr></thead><tbody></tbody></table></div></section>

<section class="section"><div class="section-head"><h2>Statistics and trends</h2></div><div class="cols">
<div class="panel"><h3>Cards per game</h3><p class="desc">How many games ended with each card count.</p><div class="cols-chart" id="dist" role="img" aria-label="Distribution of match card counts"></div><div class="cols-x">{"".join(f"<span>{x}</span>" for x in [str(i) for i in range(9)] + ["9+"])}</div></div>
<div class="panel"><h3>When the cards come</h3><p class="desc">Cards per game by quarter-hour; stoppage time sits in the last block of each half.</p><div class="bars" id="timing"></div></div>
</div>
<div class="panel" style="margin-top:14px"><h3>Season by season</h3><div class="scroll"><table id="trend"><thead><tr><th>Season</th><th class="n">Games</th><th class="n">Cards/g</th><th class="n">Home–away</th><th class="n">1st–2nd half</th><th class="n">Fouls/g</th></tr></thead><tbody></tbody></table></div></div></section>

<section class="section" id="referees"><div class="section-head"><h2>Explore referees</h2><input id="q" type="search" placeholder="Search by name, country or competition (ucl, uel, uecl)" aria-label="Search referees"></div>
<ul class="dir" id="dir">{directory}</ul></section>

<section class="section method" id="method"><div class="section-head"><h2>Methodology</h2></div>
<h3>Which games</h3><p>The Champions League, Europa League and Conference League from 2024–25 on, league phase onwards: the knockout play-offs and every knockout round, no qualifying rounds. Only the referee in charge counts; assistants, fourth officials and VAR are not credited with cards.</p>
<h3>How cards are counted</h3><p>As bookmakers settle card markets: a yellow card counts 1 and a red card 2. A second yellow is ignored and only its red counts, so one player can add at most 3 (yellow 1 + red 2). Cards shown to non-players do not count: managers and staff, substitutes who have not come on, and players already substituted off. Whether a carded player was on the pitch is checked against the lineups and the exact time of each substitution. Only the scheduled 90 minutes count, stoppage time included: cards shown after the full-time whistle, in extra time or in a penalty shoot-out are left out. In these {len(rows)} games, {excluded} card{'s' if excluded != 1 else ''} to non-players {'were' if excluded != 1 else 'was'} left out and {et} game{'s' if et != 1 else ''} had cards in extra time or a shoot-out that were left out.</p>
<h3>The card index</h3><p>Referees do not choose their games. A Conference League referee and a Champions League referee face different matches, so each referee's games are compared with the average game in the same competition and season. The index is the referee's cards divided by that average, after adding {SHRINK} average games to every record: a referee with few games sits close to 1.00 until their own games say otherwise. Above 1.00 means more cards than expected, below means fewer.</p>
<h3>Reading the numbers</h3><p>One referee's average carries a lot of noise. Each profile shows a 90% range for the referee's true average and a sample label; with fewer than 10 games treat everything as a first impression. These are descriptive statistics, not predictions: the games a referee is given, the teams and what is at stake all shape the cards.</p>
<h3>Data</h3><p>Match data from the Opta feed: referee, every card with its type, minute and player, substitutions, lineups and fouls. Referee appointments appear when UEFA announces them, usually two or three days before kick-off. Fouls are the fouls committed by both teams. A referee's country is the football association they referee for, which is not in the feed and is added separately.</p>
</section>
<p class="foot">Updated {updated} · {len(rows)} games, {total_pts} counted cards · Data: Opta match feed.</p>"""
    script = f"<script>window.UEFA={json.dumps(data, separators=(',', ':'), ensure_ascii=False)}</script>" + DASH_JS
    return write("", page(path=URL, title="UEFA Referees: referee stats for the Champions League, Europa League and Conference League",
                          h1="UEFA Referees",
                          desc="Statistical profiles, match appointments and disciplinary trends for every referee in the Champions League, Europa League and Conference League since 2024-25.",
                          body=body, tab="overview", script=script))


LIVE = re.compile(r"(<!-- live:uefa-referees:start -->).*?(<!-- live:uefa-referees:end -->)", re.S)
SITEMAP_URL = re.compile(r"<url><loc>" + re.escape(SITE + URL) + r"[^<]*</loc>(?:<lastmod>[^<]*</lastmod>)?</url>")


def update_home(rows, n_refs, upcoming):
    """The homepage card's stats line (between its live markers) and this section's entries in the root sitemap.
    scripts/build_edge.py rebuilds the sitemap with every page of this folder too; this keeps it right in between."""
    home = ROOT / "index.html"
    text = home.read_text(encoding="utf-8")
    last = max(r["date"] for r in rows)
    nxt = next((ko for ko, m, ref in upcoming), None)
    spans = [f"Last: {fdate_short(last)}", f"{len(rows):,} games", f"{n_refs} referees"]
    if nxt:
        spans.append(f"Next: {nxt.strftime('%a %d %b').replace(' 0', ' ')}")
    meta = '<div class="meta">' + "".join(f"<span>{esc(s)}</span>" for s in spans) + "</div>"
    new = LIVE.sub(lambda m: m.group(1) + meta + m.group(2), text)
    if new != text:
        home.write_text(new, encoding="utf-8", newline="")
    sm = ROOT / "sitemap.xml"
    if sm.exists():
        s = sm.read_text(encoding="utf-8")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        pages = sorted("/" + f.parent.relative_to(ROOT).as_posix() + "/" for f in OUT.rglob("index.html"))
        urls = "".join(f"<url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod></url>" for p in pages)
        s = SITEMAP_URL.sub("", s)
        anchor = f"<url><loc>{SITE}/football/greek-cup/</loc>"
        at = s.find(anchor)
        at = s.find("</url>", at) + len("</url>") if at >= 0 else s.rfind("</urlset>")
        sm.write_text(s[:at] + urls + s[at:], encoding="utf-8", newline="")


def main():
    matches = load()
    if not matches:
        sys.exit(f"no data in {RAW}")
    if "--check" in sys.argv:
        rows = build_rows(matches)
        base = baselines(rows)
        print(len(matches), "matches,", len(rows), "settled,", len({r['ref_id'] for r in rows}), "referees")
        for k, v in sorted(base.items()):
            print(k, f"{v:.2f}")
        print("excluded cards:", sum(len(r["excluded"]) for r in rows), "· unchecked:", sum(r["unchecked"] for r in rows),
              "· games with extra-time cards:", sum(1 for r in rows if r["et"]))
        return
    rows, written = build(matches)
    print(f"{len(rows)} games, {len(written)} pages written to {OUT.relative_to(ROOT)}")
    if "--no-home" not in sys.argv:
        now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        upcoming = sorted(((kickoff(m), m) for m in matches
                           if m.get("status") in ("Fixture", "Playing") and kickoff(m) and kickoff(m) >= now), key=lambda x: x[0])
        update_home(rows, len({r["ref_id"] for r in rows}), [(k, m, main_ref(m)) for k, m in upcoming])
        print("homepage card and sitemap updated")


if __name__ == "__main__":
    main()
