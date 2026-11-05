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
