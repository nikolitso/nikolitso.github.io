"""Super League referee data for /superleague/ (the Referees tab), from Flashscore.

Each finished league game is read once: referee, score, every card shown and the 1X2 odds. The games
are kept in superleague/referee-games.js, which is both this script's memory (games already in it are
skipped) and what the page reads: every referee table there is worked out from this list.

Seasons: 2024-25 onwards in full (the tables cover "since 2024-25"); 2021-22 to 2023-24 only the
games between two Big-4 teams (the Big-4 against Big-4 table goes back to 2021-22).

    python scripts/superleague_refs.py              # read up to 150 new games
    python scripts/superleague_refs.py --limit 600  # backfill faster
    --minutes 90 (the default) stops reading new games after that long, so the workflow can still publish

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
         "Iraklis": "Iraklis", "Iraklis 1908": "Iraklis", "Kalamata": "Kalamata", "Larisa": "Larisa", "AEL Larissa": "Larisa",
         "Lamia": "Lamia", "Panserraikos": "Panserraikos", "Athens Kallithea": "Kallithea"}
BIG4 = {"Olympiakos", "Panathinaikos", "AEK", "PAOK"}
# referee labels shown on the site, by surname (UEFA category)
LABELS = {"Fotias": "UEFA A", "Papapetrou": "UEFA A", "Matsoukas": "UEFA B", "Moschou": "UEFA B",
          "Polychronis": "UEFA B", "Tsakalidis": "UEFA B", "Vergetis": "UEFA B"}
# Flashscore spellings -> the ones in the diaititis.gr reports (Katopis is listed as "Eleftherios K.")
# referees from abroad (Flashscore gives no country): left out of the Greek-referee tables
FOREIGN = {"Aghayev", "Aytekin", "Bognar", "Branco Godinho", "Brisard", "Brych", "Colombo", "Dabanovic",
           "Daugbjerg Burchardt", "Del Cerro", "Delajod", "Dingert", "Fabbri", "Grinfeld", "Hernández", "Jablonski",
           "Jorgji", "Jug", "Kabakov", "Kikacheishvili", "Kruzliak", "Kulbakov", "Lambrechts", "Letexier", "Lindhout",
           "Makkelie", "Manzano", "Mariani", "Massa", "Meler", "Nobre", "Nogueira", "Obrenovic", "Osmers", "Pawson",
           "Peljto", "Pereira", "Pinheiro", "Redder", "Reinshreiber", "Saggi", "Sanchez", "Schlager", "Schroder",
           "Siebert", "Soares Dias", "Sozza", "Stegemann", "Stieler", "Storks", "Sylwestrzak", "Treimanis", "Vincic",
           "Zwayer"}
ALIASES = {"Hernandez Hernandez": "Hernández", "Hernandez": "Hernández", "Daoulas": "Ntaoulas",
           "Katoikos": "Katikos", "Eleftherios": "Katopis"}
CARD_ICONS = {"yellow-card", "red-card", "yellow-red-card", "red-yellow-card"}   # each one counts as a card
SKIP_FLAGS = ("Postponed", "Cancelled", "Awarded", "Abandoned")

LIST_JS = r"""() => [...document.querySelectorAll('.event__match')].map(e => {
  const t = e.innerText.split('\n').map(x => x.trim()).filter(Boolean);
  const q = s => (e.querySelector(s)?.innerText || '').split('\n')[0].trim();   // first line: no red-card count
  const a = e.querySelector('a');
  return {id: e.id.replace(/^g_\d+_/, ''), when: t[0], href: a ? a.href : '',
          flag: t.find(x => /^(AET|Pen|After|Postponed|Cancelled|Awarded|Abandoned)/.test(x)) || '',
          home: q('.event__homeParticipant'), away: q('.event__awayParticipant'),
          hs: q('.event__score--home'), as: q('.event__score--away')};
})"""
# the link under a season's results; its markup has changed over time, so try the known ones, then any "Show more"
MORE_JS = r"""() => {
  window.scrollTo(0, document.body.scrollHeight);
  const known = document.querySelector('a.event__more, .event__more, [data-testid="wcl-buttonLink"]');
  const any = [...document.querySelectorAll('a, button, [role="button"], span, div')]
    .filter(e => /^\s*show more( matches| games)?\s*$/i.test(e.innerText || '') && e.offsetParent !== null);
  const b = known && /show more/i.test(known.innerText || '') ? known : any[any.length - 1];
  if (!b) return false;
  (b.closest('a, button, [role="button"]') || b).click();
  return true;
}"""
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
    games = {g[0]: tidy(g) for g in d["games"]}
    return games, bool(d.get("complete"))


def team(name):
    name = name.split("\n")[0].strip()
    return TEAMS.get(name, name)


def tidy(g):
    """Apply the current team and referee names to a saved game, so fixes here reach old rows too."""
    g[3], g[4] = team(g[3]), team(g[4])
    if g[7]:
        base = re.sub(r" \(UEFA [AB]\)$", "", g[7])
        base = ALIASES.get(base, base)
        g[8] = 1 if (g[8] or base in FOREIGN) else 0
        surname = base.split()[-1]
        g[7] = f"{base} ({LABELS[surname]})" if surname in LABELS and not g[8] else base
    return g


def save(games, complete):
    rows = sorted(games.values(), key=lambda g: (g[2], g[3]), reverse=True)
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=2))).strftime("%Y-%m-%d %H:%M")
    body = ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows)
    OUT.write_text("// Written by scripts/superleague_refs.py from Flashscore: one row per league game.\n"
                   f"window.SLREFGAMES = {{\"updated\":\"{now}\",\"complete\":{json.dumps(complete)},\"cols\":{json.dumps(COLS)},\"games\":[\n{body}\n]}};\n",
                   encoding="utf-8")


def open_page(page, url, ready, timeout=30000):
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    try:
        page.click("#onetrust-reject-all-handler", timeout=3000)
    except Exception:
        pass
    page.wait_for_function(ready, timeout=timeout)
    page.wait_for_timeout(1200)


def read_list(page, slug):
    open_page(page, f"{BASE}{slug}/results/", "() => document.querySelector('.event__match')")
    clicks = 0
    for _ in range(40):                                     # a whole season: keep pressing "Show more matches"
        n = page.evaluate("() => document.querySelectorAll('.event__match').length")
        if not page.evaluate(MORE_JS):
            break
        try:
            page.wait_for_function(f"() => document.querySelectorAll('.event__match').length > {n}", timeout=15000)
        except Exception:
            break
        clicks += 1
        page.wait_for_timeout(800)
    lst = page.evaluate(LIST_JS)
    print(f"   list {slug}: {len(lst)} games after {clicks} 'show more' click(s)", flush=True)
    return lst


def whole_season(lst, season):
    """True if the list reaches back to the season's start (August-September): no "Show more" page was missed."""
    dates = [iso_date(g["when"], season) for g in lst if re.match(r"\d\d\.\d\d\.", g["when"])]
    return bool(dates) and min(dates) <= f"{season[:4]}-09-30"


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
    foreign = foreign or name in FOREIGN
    surname = name.split()[-1] if name else name
    if surname in LABELS and not foreign:
        name = f"{name} ({LABELS[surname]})"
    return name or None, foreign


# odds pages this run: Flashscore hides odds from some places (the runner's IP), and then every
# odds page times out. After 5 misses in a row with none found, stop asking for this run; games are
# saved without odds and a later run fills them in (see main).
ODDS = {"ok": 0, "miss": 0}


def odds_off():
    return ODDS["ok"] == 0 and ODDS["miss"] >= 5


def home_odds(page, base, mid):
    if odds_off():
        return None
    vals = []
    try:
        open_page(page, f"{base}/odds/1x2-odds/full-time/?mid={mid}", "() => document.querySelector('.ui-table__row')", 10000)
        for row in page.evaluate(ODDS_JS):
            nums = [x for x in row if re.fullmatch(r"\d+\.\d+", x)]
            if len(nums) >= 3:
                vals.append(float(nums[-3]))
    except Exception:
        pass
    if not vals:
        ODDS["miss"] += 1
        if ODDS["miss"] == 1:                              # once a run: what the page showed instead
            try:
                txt = re.sub(r"\s+", " ", page.evaluate("() => document.body.innerText"))[:300]
            except Exception:
                txt = "?"
            print(f"   no odds at {page.url}: {txt}", flush=True)
        if odds_off():
            print("   odds pages answer nothing from here: no more odds this run", flush=True)
        return None
    ODDS["ok"] += 1
    ODDS["miss"] = 0
    return round(statistics.median(vals), 2)


def read_game(page, g, season):
    base, mid = g["href"].split("/?mid=")
    open_page(page, f"{base}/?mid={mid}", "() => document.querySelector('.smv__participantRow') || /REFEREE:/i.test(document.body.innerText)")
    sm = page.evaluate(SUMMARY_JS)
    ref, foreign = referee(sm["ref"]) if sm["ref"] else (None, False)
    home, away = team(g["home"]), team(g["away"])
    return [mid, season[:5] + season[7:], iso_date(g["when"], season), home, away, int(g["hs"]), int(g["as"]),
            ref, 1 if foreign else 0, sm["cards"][0], sm["cards"][1], home_odds(page, base, mid)]


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 150
    minutes = float(sys.argv[sys.argv.index("--minutes") + 1]) if "--minutes" in sys.argv else 90
    stop_at = time.monotonic() + minutes * 60          # the workflow is cut off at 120 min and would lose the run
    games, complete = load()
    print(f"{len(games)} games saved")
    done, left, failed, filled = 0, 0, False, 0
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
            if season != SEASONS[0][0] and not whole_season(lst, season):
                print(f"{season}: the list does not reach the season's start; not complete yet")
                failed = True
            todo = [g for g in lst if g["id"] not in games and g["href"] and "/?mid=" in g["href"] and g["hs"] != ""
                    and not g["flag"].startswith(SKIP_FLAGS)]
            if which == "big4":
                todo = [g for g in todo if team(g["home"]) in BIG4 and team(g["away"]) in BIG4]
            print(f"{season}: {len(lst)} results, {len(todo)} to read", flush=True)
            for g in todo:
                if done >= limit or time.monotonic() > stop_at:
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
            # games saved without odds (their odds page didn't answer): try again
            for g in lst:
                row = games.get(g["id"])
                if row is None or row[11] is not None or odds_off() or time.monotonic() > stop_at or "/?mid=" not in g["href"]:
                    continue
                row[11] = home_odds(page, *g["href"].split("/?mid="))
                if row[11] is not None:
                    filled += 1
        b.close()
    # the backfill is done once a run has seen every season's list and left nothing unread; it stays done
    complete = complete or (not failed and left == 0)
    save(games, complete)
    print(f"read {done} new game(s), odds added to {filled}; {len(games)} saved; {left} still to read; "
          f"{sum(r[11] is None for r in games.values())} without odds; complete: {complete}")


if __name__ == "__main__":
    main()
