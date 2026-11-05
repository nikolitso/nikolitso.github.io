# Super League game pages

Approved 5 Nov 2026. Purpose: search traffic. One static page per Super League game, written by the pipeline,
that answers "what does the model say about Olympiakos – PAOK" before the game and "what did it say, and what
happened" after it. English only. Pages live on at the same address after the game as results pages.

## Where

- `/superleague/games/<yyyy-mm-dd>-<home>-<away>/` — one per fixture and per result of the season
  (`2026-11-07-volos-kifisia`); team names slugged to ASCII lower case.
- `/superleague/games/` — the season's list: upcoming games, then played ones, newest first.
- `/superleague/sitemap.xml` — every game page plus the list; `robots.txt` names it next to the site's sitemap.

## How

`BettingSignal/superleague/games.py`, run by the Super League workflow right after `update.py`, reads the
`data.js` just written (`window.SL`) and writes every page afresh each run. No JavaScript on the pages: the
numbers are in the HTML. The workflow's `pages:` gains `superleague/games superleague/sitemap.xml`.
`scripts/build_edge.py` writes the second `Sitemap:` line into `robots.txt`.

## A fixture page (before kick-off)

Shared base (`data-site="football"`, `/assets/an.css`, the football mark), kicker "Super League ·
Sat 7 Nov 2026, 17:00", title "Volos – Kifisia". Then:

1. Three sentences in plain English, generated from the numbers: the favourite and the model's chance against
   the bookmaker's; the goals total and the over-2.5 chance; the stat where model and market disagree most.
2. Win · draw · win: model chance, bookmaker odds, bookmaker's fair chance.
3. The stats table, one row per stat in the model's order (goals, xG, shots, SoT, corners, cards, fouls,
   GK saves, possession): home, away, total, the main line, the model's over chance, the bookmaker's over odds.
   The row where the model and the market differ most is highlighted with the accent.
4. Referee (games, card and foul averages, his effect on the projection) and coaches (in charge since, games).
5. Previous and next game links, link to the main Super League page.

Head: title "Volos – Kifisia: projections, lines and odds · Super League 7 Nov 2026", a description with the
three numbers, canonical, OG tags with the Super League image.

## A results page (after the game)

Same address, same frame. Title "Volos 2–1 Kifisia · what the model said". The table gains Actual columns
(home, away, total) with a mark on each stat: ✓ when the actual total landed on the side the model projected
relative to the main line, ✗ otherwise, – where there was no line. The sentences turn to the past tense:
"The model had Volos at 45% and they won 2–1." Results carry no odds, so the odds columns go.

## Out of scope

Other sports (the same script pattern applies later), Greek text, bet recommendations on the pages, any change to
the main Super League page or the model.

## EuroCup (5 Nov 2026)

`BettingSignal/eurocup/games.py`, on the shared frame in `BettingSignal/gamepages.py`, writes `/eurocup/games/` the same way and
follows the same choices: played games show the score and the numbers, with no summary and no side column, and no game has a
closing note. Only games with a projection get a page: the frozen entries in `archive.js` (saved before tip-off with the
bookmaker's line) and the upcoming ones in `projections.js`. Rounds 1-4 of 2026-27 predate the archive and have no page.

## Basketball (5 Nov 2026)

`BettingSignal/basketball/projector/games.py` writes `/basketball/games/` for the Basket League and Cyprus Division A, from the page data
`make_site.py` wrote. Upcoming games show the bookmaker's lines, both records and European fatigue. The model's projection joins them only
when `config.SHOW_PROJECTIONS` is on, using the same numbers as the league page's Projections table; that tab is hidden while the setting is
off. Played games show the score, the lines and the match report. `lines_log.json` keeps `ours`, not the `strength` figure the site shows,
so games before 5 Nov 2026 never show a projection. From that date `games_log.json` saves the shown figure until tip-off, even while the
setting is off, and played games show it once the setting is on. Super League has its own `games_log.json` from the same date: played games
in it show the saved numbers, older ones stay recalculated.

## FIBA Europe Cup (5 Nov 2026)

`BettingSignal/fibaeuropecup/games.py` writes `/fibaeuropecup/games/` through `BettingSignal/cupgames.py`, the page code it shares with EuroCup.
Its archive is kept by day and holds two models; some "mix" games have no projected total and show a dash. In `odds.js` a home favourite is negative,
so the margin is `-sp`. The pipeline's own scripts publish a fixed list of files, so the workflow has a separate Game pages step. 87 of the 124
games played so far have a saved projection; the rest have no page.

## Handball (5 Nov 2026)

`BettingSignal/handball/projector/games.py` writes `/handball/games/` from the page data and `extra.json`. The model keeps projections only for the next
games and for flagged signals, so `games_log.json` saves each upcoming game until tip-off, and every game from 5 Nov 2026 keeps its page once played. Before
that only the 16 signals were saved. Pages show the published total (`ours`), not `ph` and `pa`, which are workings and do not add up to it. Women's
clubs end in " W" in `extra.json` and not in the published data, so results are normalised when loaded.

## Volleyball (5 Nov 2026)

Every game of the season on the page gets one, as in Super League: played games are walk-forward recalculations, so they give the median total
(`med`). Upcoming games give `fair`, the Projections tab's model line. `volleyball/data/games_log.json` saves each game's numbers until the start;
played games in it show the saved `fair` and line. Picks stay on the Picks tab, not on game pages. `update.py` calls `games.py`. Links: Projections
and Season tabs.
