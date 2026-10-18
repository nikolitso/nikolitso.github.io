# Basketball projections: design

Date: 2026-10-18. Site: https://antonisnikolitsopoulos.com/basketball/

## Goal
A basketball counterpart of https://antonisnikolitsopoulos.com/handball/projections/. It projects each match's total points, compares it with the bookmakers' total-points line, and flags matches where the gap is large enough. One section for now, **Projections**. More leagues are added as the season progresses.

## Leagues at launch
| Key | League | Flashscore / BetExplorer path |
|---|---|---|
| `tr_tbl` | Turkey · TBL (second tier, as requested) | `basketball/turkey/tbl` |
| `cz_nbl` | Czech Republic · NBL | `basketball/czech-republic/nbl` |

Turkey's top league is the BSL (`basketball/turkey/super-lig`, to be verified). It is not in scope. Switching or adding it is one config entry.

## Site structure (this repo)
- `/basketball/` redirects to `/basketball/projections/`.
- `/basketball/projections/`: overview (tiles, leagues, flagged now, next matches, season record). Same single-file static page pattern as handball, data embedded as JSON, `data-base="/basketball/"`.
- `/basketball/projections/turkey/` and `/basketball/projections/czech-republic/`: per-league pages, same template.
- Nav tabs: Projections only. Same CSS tokens as handball, with a basketball accent colour (orange); light and dark themes.
- Add the pages to `sitemap.xml` and link them where handball is linked from the home page.

## Pipeline (outside this repo, like handball)
Lives in `C:\Users\antonis\Desktop\BettingSignal\basketball\projector\`, mirroring `handball\projector\`. The existing `basketball\greek\` folder is unrelated and left alone.

| Step | File | Adapted from |
|---|---|---|
| Results and fixtures: BetExplorer (full seasons), Flashscore fallback (it only lists the most recent ~80 matches, so it is merged into a local store) | `lines.py`, `fs.py`, `data.py` | handball `scrape.py`, `fs.py` |
| Bookmaker total-points line (main line = over/under priced most evenly, at least 3 books); team names matched after stripping accents and case | `lines.py`, `names.py` | handball `ou.py` |
| Manual lines when none are fetched | `manual_lines.json` | handball `manual_lines.json` |
| Ratings and projections | `model.py` | handball `model.py` (full game only) |
| Flag log and settlement | `signals.py` | handball `signals.py` |
| Build page | `build.py`, `template.html`, `make_site.py` | handball equivalents |
| Orchestration | `run_update.py` | handball `run_update.py` |

`make_site.py` writes the pages into this repo. Committing and pushing them stays a manual step, as for handball.

## Model
- Current season only (2026-27). Regular season; playoff stages are excluded.
- League average points for home and away sides; each team's attack and defence against that average, shrunk toward the league average by `k` pseudo-games, with `opp` opponent-adjustment passes.
- Projected total = league home average x home attack x away defence + the same for the other side + a league `shift`.
- Overtime points are counted: bookmaker totals include them.
- A match is projected once both teams have played at least 6 games (handball's value; re-tuned if the backtest says otherwise).

## Flagging
- A match is flagged when |model total - line| is at least `gap` points, on the side the league is tuned for (over, under or both).
- `k`, `opp`, `shift`, `gap` and side are tuned per league on 2022-23 to 2024-25 and checked on 2025-26, the same procedure as `handball\scan\scan2.py`.
- Until a league has been tuned, its page shows projections and gaps only: no flags and no record. A league is flagged only after the backtest shows an edge on the independent season.
- A flagged match is logged once, the first time it qualifies, and settled after the match as win, loss or push, with a 1-unit stake. A match without a line is never flagged.

## Page contents (Projections)
Tiles (flagged now, record, return, matches with a line, leagues), league tiles linking to the league pages, flagged now, next matches over 8 days (model total, line, gap), season record and log. A three-card explainer ("How it is built", "The correction", "Early in the season") is adapted from handball's.

## Out of scope
Backtesting pages, other leagues, first-half or team-total markets, a scheduled daily refresh (a follow-up once the manual run works).

## Risks
- Historical lines for tuning may be hard to get; BetExplorer is blocked from Greece at times, and Flashscore has no lines. If so, tuning uses whatever seasons of lines can be fetched, and the page says how large the sample is.
- Second-tier and small leagues have thin bookmaker coverage, so some matches may never get a line.
- Basketball scores are higher and less variable than handball's. The gap threshold must not be copied from handball's 2 goals.
