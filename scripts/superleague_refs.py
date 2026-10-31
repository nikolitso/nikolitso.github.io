"""Super League referee data for /superleague/ (the Referees tab), from Flashscore.

Each finished league game is read once: referee, score, every card shown and the 1X2 odds. The games
are kept in superleague/referee-games.js, which is both this script's memory (games already in it are
skipped) and what the page reads: every referee table there is worked out from this list.

Seasons: 2024-25 onwards in full (the tables cover "since 2024-25"); 2021-22 to 2023-24 only the
games between two Big-4 teams (the Big-4 against Big-4 table goes back to 2021-22).

    python scripts/superleague_refs.py              # read up to 150 new games
    python scripts/superleague_refs.py --limit 600  # backfill faster

Run by the "Super League referees" workflow (.github/workflows/superleague-referees.yml).
"""
import datetime as dt
import json
import re
import statistics
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "superleague" / "referee-games.js"
BASE = "https://www.flashscore.com/football/greece/"
# (season, Flashscore slug, which games): the current season first, then the backfill, newest first
SEASONS = [("2026-2027", "super-league", "all"), ("2025-2026", "super-league-2025-2026", "all"),
           ("2024-2025", "super-league-2024-2025", "all"), ("2023-2024", "super-league-2023-2024", "big4"),
           ("2022-2023", "super-league-2022-2023", "big4"), ("2021-2022", "super-league-2021-2022", "big4")]
COLS = ["mid", "season", "date", "home", "away", "hg", "ag", "ref", "foreign", "hc", "ac", "odds"]

# Flashscore team names -> the names used on the site (others are kept as they are)
TEAMS = {"Olympiacos Piraeus": "Olympiakos", "Olympiacos": "Olympiakos", "AEK Athens FC": "AEK", "AEK Athens": "AEK",
         "PAOK": "PAOK", "Panathinaikos": "Panathinaikos", "Aris": "Aris", "Asteras Tripolis": "Asteras",
         "Asteras Aktor": "Asteras", "Atromitos": "Atromitos", "Panetolikos": "Panetolikos", "OFI Crete": "OFI",
         "Volos": "Volos", "Volos NFC": "Volos", "Kifisia": "Kifisia", "Levadiakos": "Levadiakos",
         "Iraklis": "Iraklis", "Kalamata": "Kalamata", "Larisa": "Larisa", "AEL Larissa": "Larisa",
         "Lamia": "Lamia", "Panserraikos": "Panserraikos", "Athens Kallithea": "Kallithea"}
BIG4 = {"Olympiakos", "Panathinaikos", "AEK", "PAOK"}
# referee labels shown on the site, by surname (UEFA category)
LABELS = {"Fotias": "UEFA A", "Papapetrou": "UEFA A", "Matsoukas": "UEFA B", "Moschou": "UEFA B",
          "Polychronis": "UEFA B", "Tsakalidis": "UEFA B", "Vergetis": "UEFA B"}
ALIASES = {"Hernandez Hernandez": "Hernández", "Hernandez": "Hernández"}
CARD_ICONS = {"yellow-card", "red-card", "yellow-red-card", "red-yellow-card"}   # each one counts as a card
SKIP_FLAGS = ("Postponed", "Cancelled", "Awarded", "Abandoned")

LIST_JS = r"""() => [...document.querySelectorAll('.event__match')].map(e => {
  const t = e.innerText.split('\n').map(x => x.trim()).filter(Boolean);
  const q = s => e.querySelector(s)?.innerText.trim() || '';
  const a = e.querySelector('a');
  return {id: e.id.replace(/^g_\d+_/, ''), when: t[0], href: a ? a.href : '',
          flag: t.find(x => /^(AET|Pen|After|Postponed|Cancelled|Awarded|Abandoned)/.test(x)) || '',
          home: q('.event__homeParticipant'), away: q('.event__awayParticipant'),
          hs: q('.event__score--home'), as: q('.event__score--away')};
})"""
MORE_JS = r"""() => { const b = [...document.querySelectorAll('a, button, span')].find(e => /^show more matches$/i.test(e.innerText.trim()));
  if (!b) return false; b.scrollIntoView(); b.click(); return true; }"""
SUMMARY_JS = r"""() => {
  const cards = [0, 0];
  document.querySelectorAll('.smv__participantRow').forEach(e => {
    const side = e.className.includes('away') ? 1 : 0;
    e.querySelectorAll('[data-testid^="wcl-icon-incidents"]').forEach(i => {
      const k = i.dataset.testid.replace('wcl-icon-incidents-', '');
      if (ICONS.includes(k)) cards[side]++;
    });
  });
  const m = document.body.innerText.match(/REFEREE:\s*\n?\s*([^\n]+)/i);
  return {cards, ref: m ? m[1].trim() : '', rows: document.querySelectorAll('.smv__participantRow').length};
}""".replace("ICONS", json.dumps(sorted(CARD_ICONS)))
ODDS_JS = r"""() => [...document.querySelectorAll('.ui-table__row')].map(r => r.innerText.split('\n').map(s => s.trim()).filter(Boolean))"""


def load():
    """(games by match id, complete): complete once every game of every season has been read."""
    if not OUT.exists():
        return {}, False
    txt = OUT.read_text(encoding="utf-8")
    d = json.loads(txt[txt.index("{"):txt.rstrip().rstrip(";").rindex("}") + 1])
    return {g[0]: g for g in d["games"]}, bool(d.get("complete"))


def save(games, complete):
    rows = sorted(games.values(), key=lambda g: (g[2], g[3]), reverse=True)
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=2))).strftime("%Y-%m-%d %H:%M")
    body = ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows)
    OUT.write_text("// Written by scripts/superleague_refs.py from Flashscore: one row per league game.\n"
                   f"window.SLREFGAMES = {{\"updated\":\"{now}\",\"complete\":{json.dumps(complete)},\"cols\":{json.dumps(COLS)},\"games\":[\n{body}\n]}};\n",
                   encoding="utf-8")


def open_page(page, url, ready):
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    try:
        page.click("#onetrust-reject-all-handler", timeout=3000)
    except Exception:
        pass
    page.wait_for_function(ready, timeout=30000)
    page.wait_for_timeout(1200)


def read_list(page, slug):
    open_page(page, f"{BASE}{slug}/results/", "() => document.querySelector('.event__match')")
    for _ in range(40):                                     # a whole season: keep pressing "Show more matches"
        n = page.evaluate("() => document.querySelectorAll('.event__match').length")
        if not page.evaluate(MORE_JS):
            break
        try:
            page.wait_for_function(f"() => document.querySelectorAll('.event__match').length > {n}", timeout=15000)
        except Exception:
            break
        page.wait_for_timeout(800)
    return page.evaluate(LIST_JS)


def iso_date(when, season):
    """'28.10. 20:30' or '28.10.2024' -> ISO date; without a year, July-December is the season's first year."""
    m = re.match(r"(\d\d)\.(\d\d)\.(\d{4})?", when)
    d, mo = int(m[1]), int(m[2])
    y = int(m[3]) if m[3] else int(season[:4]) + (0 if mo >= 7 else 1)
    return f"{y}-{mo:02d}-{d:02d}"


def referee(raw):
    """'Evangelou A.' -> ('Evangelou', False); 'Zwayer F. (Ger)' -> ('Zwayer', True)."""
    raw = re.sub(r"\s+", " ", raw).strip()
    c = re.search(r"\((\w{3})\)\s*$", raw)
    foreign = bool(c and c[1].lower() != "gre")
    name = re.sub(r"\s*\(\w{3}\)\s*$", "", raw)
    name = re.sub(r"(\s+[A-ZÀ-Ž][a-zà-ž]?\.)+$", "", name).strip()         # drop initials
    name = ALIASES.get(name, name)
    surname = name.split()[-1] if name else name
    if surname in LABELS and not foreign:
        name = f"{name} ({LABELS[surname]})"
    return name or None, foreign


def home_odds(page, base, mid):
    try:
        open_page(page, f"{base}/odds/1x2-odds/full-time/?mid={mid}", "() => document.querySelector('.ui-table__row')")
    except Exception:
        return None
    vals = []
    for row in page.evaluate(ODDS_JS):
        nums = [x for x in row if re.fullmatch(r"\d+\.\d+", x)]
        if len(nums) >= 3:
            vals.append(float(nums[-3]))
    return round(statistics.median(vals), 2) if vals else None


def read_game(page, g, season):
    base, mid = g["href"].split("/?mid=")
    open_page(page, f"{base}/?mid={mid}", "() => document.querySelector('.smv__participantRow') || /REFEREE:/i.test(document.body.innerText)")
    sm = page.evaluate(SUMMARY_JS)
    ref, foreign = referee(sm["ref"]) if sm["ref"] else (None, False)
    home, away = TEAMS.get(g["home"], g["home"]), TEAMS.get(g["away"], g["away"])
    return [mid, season[:5] + season[7:], iso_date(g["when"], season), home, away, int(g["hs"]), int(g["as"]),
            ref, 1 if foreign else 0, sm["cards"][0], sm["cards"][1], home_odds(page, base, mid)]


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 150
    games, complete = load()
    print(f"{len(games)} games saved")
    done, left, failed = 0, 0, False
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(locale="en-GB", timezone_id="Europe/Athens")
        page.set_default_timeout(30000)
        for season, slug, which in SEASONS:
            if done >= limit and complete:
                break
            try:
                lst = read_list(page, slug)
            except Exception as e:
                print(f"{season}: list failed ({e.__class__.__name__}: {str(e)[:100]})")
                failed = True
                continue
            todo = [g for g in lst if g["id"] not in games and g["href"] and "/?mid=" in g["href"] and g["hs"] != ""
                    and not g["flag"].startswith(SKIP_FLAGS)]
            if which == "big4":
                todo = [g for g in todo if TEAMS.get(g["home"], g["home"]) in BIG4 and TEAMS.get(g["away"], g["away"]) in BIG4]
            print(f"{season}: {len(lst)} results, {len(todo)} to read", flush=True)
            for g in todo:
                if done >= limit:
                    left += 1
                    continue
                try:
                    row = read_game(page, g, season)
                except Exception as e:                       # not ready yet or a page change: next run tries again
                    print(f"   skipped {g['home']} - {g['away']}: {e.__class__.__name__} {str(e)[:100]}")
                    left += 1
                    continue
                games[row[0]] = row
                done += 1
                print(f"   {row[2]} {row[3]} {row[5]}-{row[6]} {row[4]} | {row[7]} | cards {row[9]}-{row[10]} | odds {row[11]}", flush=True)
                if done % 20 == 0:
                    save(games, complete)
                time.sleep(0.5)
        b.close()
    # the backfill is done once a run has seen every season's list and left nothing unread; it stays done
    complete = complete or (not failed and left == 0)
    save(games, complete)
    print(f"read {done} new game(s); {len(games)} saved; {left} still to read; complete: {complete}")


if __name__ == "__main__":
    main()
