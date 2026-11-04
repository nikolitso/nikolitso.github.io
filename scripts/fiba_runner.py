"""Run the FIBA Europe Cup pipeline (nikolitso/BettingSignal, fibaeuropecup/) from a GitHub runner.

    python fiba_runner.py update    # update.py: results, fixtures, odds, projections, publish
    python fiba_runner.py odds      # matchday_odds.py: today's lines, projections, publish
    python fiba_runner.py probe     # print the bookmakers Flashscore shows this runner; publish nothing

The pipeline's matchday_odds.py takes a line only from a Greek bookmaker (Bwin.gr, Stoiximan.gr, PameStoixima,
Novibet, Interwetten): the books Flashscore lists depend on the visitor's country, and on the PC in Greece those are
the ones shown. A GitHub runner is in North America and sees 1xBet, Stake.com, Sports Interaction, bet365 and a few
Canadian or US books, so the scraper found no line for any game (2 Nov 2026, Round 5). This runner keeps the Greek
books first and, when none of them is on the page, takes the line from the first book in PREFER that quotes one,
then from any other book but bet365 (which quotes 1.83 / 1.83 on every line). Of a book's lines the main one is
still the one with the most even pair of odds, as in the pipeline.

FIBA_PIPELINE names the pipeline checkout (default: _bs/fibaeuropecup next to the site repo, as in the workflow).
"""
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PIPELINE = Path(os.environ.get("FIBA_PIPELINE", HERE.parent / "_bs" / "fibaeuropecup"))
PREFER = ["bwin", "Betsson", "Stake.com", "1xBet", "Sports Interaction", "Unibet", "Betway", "Pinnacle"]
SKIP = {"bet365"}


def widen(m):
    """m: the matchday_odds module. pick() tries the Greek books, then PREFER, then any other book but bet365."""
    original = m.pick

    def pick(rows, line):
        seen = list(dict.fromkeys(r[0] for r in rows if r and r[0]))           # books in page order
        for books in (m.BOOKS, PREFER, [b for b in seen if b not in SKIP]):
            saved = m.BOOKS[:]
            m.BOOKS[:] = books
            try:
                got = original(rows, line)
            finally:
                m.BOOKS[:] = saved
            if got:
                return got
        return None

    m.pick = pick
    return m


def probe(m):
    from playwright.sync_api import sync_playwright
    fx = m.read_js(m.SITE / "fixtures.js")["list"]
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(locale="en-GB", timezone_id="Europe/Athens")
        pg.goto(m.FIXTURES_URL, wait_until="domcontentloaded", timeout=60000)
        try:
            pg.wait_for_selector(".event__match", timeout=20000)
        except Exception as e:
            print("fixtures page:", type(e).__name__, str(e)[:200])
        al = lambda t: m.ALIASES.get(t, t)
        links = {(al(h), al(a)): (b, mid) for h, a, b, mid in pg.evaluate(m.LINKS) if b}
        print(len(links), "games with a match link on the fixtures page")
        for f in fx[:4]:
            if (f[2], f[3]) not in links:
                print(f, "not on the fixtures page")
                continue
            base, mid = links[(f[2], f[3])]
            for mk in ("asian-handicap", "over-under", "home-away"):
                rows = m.rows(pg, f"https://www.flashscore.com/match/basketball/{base}/odds/{mk}/ft-including-ot/?mid={mid}")
                books = sorted({r[0] for r in rows})
                print(f"{f[0]} {f[2]} - {f[3]} {mk}: {len(rows)} rows, books {books}, pick {m.pick(rows, mk != 'home-away')}")
        br.close()


def main():
    job = sys.argv[1] if len(sys.argv) > 1 else "update"
    sys.path.insert(0, str(PIPELINE))
    os.chdir(PIPELINE)                                     # the pipeline's relative paths (data/, predict.py)
    import matchday_odds
    widen(matchday_odds)
    sys.argv = [sys.argv[0]]                               # the pipeline reads flags from sys.argv
    if job == "probe":
        return probe(matchday_odds)
    if job == "odds":
        return matchday_odds.main()
    import update
    return update.main()


if __name__ == "__main__":
    sys.exit(main())
