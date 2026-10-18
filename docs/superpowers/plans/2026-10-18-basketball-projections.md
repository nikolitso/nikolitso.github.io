# Basketball Projections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `/basketball/projections/` (plus Turkey TBL and Czech NBL league pages) that project total points per match, compare them with bookmaker lines, and flag/settle matches for leagues whose backtest shows an edge.

**Architecture:** A small Python pipeline in `P` (outside this repo, like handball) scrapes results, fixtures and lines, fits the handball-style attack/defence model on points, tunes each league on past seasons, logs and settles flags, and renders one HTML page. `make_site.py` copies that page into this repo as three static pages. Handball code is read for reference and never modified.

**Tech Stack:** Python 3.14 (stdlib `urllib`, `unittest`), numpy, scipy, static HTML/CSS/JS with data embedded as JSON.

**Spec:** `docs/superpowers/specs/2026-10-18-basketball-projections-design.md`

## Paths
- `P` = `C:\Users\antonis\Desktop\BettingSignal\basketball\projector\` (new; not a git repo, so no commits there)
- `H` = `C:\Users\antonis\Desktop\BettingSignal\handball\projector\` (reference only; do not edit)
- `S` = `C:\Users\antonis\Desktop\nikolitso.github.io\` (this git repo; commit here)
- Tests run from `P`: `python -m unittest discover -s tests -v`

## Global Constraints
- Leagues at launch: `tr_tbl` = "Turkey · TBL" (path `turkey/tbl`), `cz_nbl` = "Czech Republic · NBL" (path `czech-republic/nbl`). Both verified live on Flashscore and BetExplorer.
- Current season `2026-2027`; tuning seasons `2022-2023`, `2023-2024`, `2024-2025`; independent test season `2025-2026`.
- Regular season only (Flashscore rows whose round label matches `Round \d+`); playoffs excluded. Overtime points count.
- Projection only once both teams have played at least 6 games (`START = 6`).
- Projected total = `muH*att[home]*de[away] + muA*att[away]*de[home] + shift`.
- Flags need a bookmaker line; a match without a line is never flagged. Stake 1 unit; win pays `odds-1`, loss `-1`, push `0` (total equals line).
- Do not copy handball's 2-goal gap: basketball gap is tuned in points, grid `[3, 4, 5, 6, 8]`.
- Never modify anything in `H` or `BettingSignal\basketball\greek\`.
- Site: same CSS tokens/fonts as `S\handball\projections\index.html`, basketball accent `#d9631e` (dark mode `#ff8a4c`), light and dark themes, readable at 375px width, `data-base="/basketball/"`.
- All dates are UTC `YYYY-MM-DD`, times `HH:MM` UTC (Flashscore epoch seconds).

## Review Focus
- Team spelled differently on Flashscore and BetExplorer (e.g. "Buyukcekmece" vs a URL slug): the match gets no line rather than a wrong one.
- Postponed/awarded/unplayed rows (no score, or score present but status not finished) must not count as results.
- Playoff/play-in rows in a regular-season league must not enter ratings.
- Integer bookmaker line and total equal to the line: settles as a push, return 0.
- A league with no tuning (or failed validation) shows projections and gaps but zero flags and no record, and says why.

---

### Task 1: Scaffold, league config, test fixtures

**Files:**
- Create: `P\config.py`, `P\tests\__init__.py`, `P\tests\fixtures\fs_tbl_results.html`, `P\tests\fixtures\fs_tbl_fixtures.html`
- Test: `P\tests\test_config.py`

**Interfaces:**
- Produces: `config.LEAGUES: dict[str, dict]` with keys `tr_tbl`, `cz_nbl`; each value has `name: str`, `slug: str` (e.g. `turkey/tbl`), `page: str` (site folder, `turkey` / `czech-republic`). `config.CURRENT: str`, `config.TUNE_SEASONS: list[str]`, `config.TEST_SEASON: str`, `config.START: int`, `config.GAP_GRID: list[float]`.

- [ ] **Step 1: Write `test_config.py`** asserting: both league keys exist; every slug has the form `country/league`; `CURRENT == "2026-2027"`; `TEST_SEASON == "2025-2026"`; `START == 6`; `GAP_GRID == [3, 4, 5, 6, 8]`.
- [ ] **Step 2: Run it** (`python -m unittest tests.test_config -v`). Expected: ImportError/FAIL.
- [ ] **Step 3: Create `config.py`** with the constants above.
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Save two real fixtures.** Download `https://www.flashscore.com/basketball/turkey/tbl/results/` and `.../fixtures/` with the browser User-Agent used in `H\fs.py` into `tests\fixtures\`. Both are large; keep them whole. Confirm the results file contains `~AA÷` blocks with `ER÷Round` labels.

### Task 2: Flashscore results and fixtures parser

**Files:**
- Create: `P\fs.py`
- Test: `P\tests\test_fs.py`

**Interfaces:**
- Consumes: fixtures from Task 1.
- Produces: match dict `{"id": str, "season": str, "round": int, "date": str, "time": str, "home": str, "away": str, "hp": int|None, "ap": int|None}`; `fs.parse(page: str, season: str) -> list[dict]`; `fs.league(slug: str, season: str) -> tuple[list[dict], list[dict]]` returning `(results, fixtures)`; results have scores, fixtures have `hp is None`. `fs.archive_url(slug, season)`: current season uses `.../{slug}/`, past seasons `.../{league}-{season}/` where `league` is the last path part (Flashscore archive format, verify on `turkey/tbl-2024-2025`).

- [ ] **Step 1: Write failing tests** against the saved fixtures: `parse(results_html, "2026-2027")` returns rows where every `round` is an int, every result has int `hp`/`ap`, no `id` repeats (Flashscore repeats recent matches), the first row's `home` and `away` equal the names in the file's first `AE÷`/`AF÷` fields; a synthetic block with `ER÷Quarter-finals` or without `ER÷Round` is dropped; a block with no `AG÷` is returned with `hp is None`; a synthetic block whose status code `AB÷` is not `3` (finished) but has scores is not a result (postponed/live).
- [ ] **Step 2: Run to verify FAIL.**
- [ ] **Step 3: Implement `parse`** by adapting `H\fs.py::parse` (same `~AA÷` / `¬` / `÷` format): final score fields `AG`/`AH`, round from `ER÷Round (\d+)`, finished status from `AB÷3`. Drop non-`Round N` rows. Implement `league` with `urllib` and the same User-Agent as `H\fs.py`.
- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Live check:** `python -c "import fs; r,f=fs.league('turkey/tbl','2026-2027'); print(len(r),len(f))"`. Expected: both nonzero (about 7 rounds played). Repeat for `czech-republic/nbl`.

### Task 3: Rating model and walk-forward

**Files:**
- Create: `P\model.py`
- Test: `P\tests\test_model.py`

**Interfaces:**
- Produces: `ratings(rows: list[dict], k: float, opp_iter: int) -> dict|None` (rows need `home, away, hp, ap`; returns `muH, muA, att, de, games, n`); `project(R, home: str, away: str) -> tuple[float, float]`; `total(R, home, away, shift: float) -> float`; `walk(season_rows: list[dict], k, opp_iter, start: int) -> list[dict]` returning one dict per match `{id, date, home, away, raw: float, actual: int, gh: int, ga: int}` where `raw = ph + pa` computed only from matches on strictly earlier dates, and only for matches where `min(gh, ga) >= start`.

- [ ] **Step 1: Write failing tests:** (a) `ratings` on a 2-team, 4-match symmetric set gives `att == de == 1.0` for both; (b) a team that scores more than average has `att > 1`; (c) `project` for an unknown team falls back to 1.0 multipliers; (d) `walk` never uses the match's own result or same-day results (build a case where including the same-day game would change `raw`); (e) `walk` skips matches until both teams have `start` games; (f) `ratings([])` returns `None`.
- [ ] **Step 2: Run to verify FAIL.**
- [ ] **Step 3: Implement** by porting `H\model.py::ratings` and `project` with `h1h`/`h1a` renamed to `hp`/`ap`. `walk` iterates distinct dates in order, recomputing ratings from all earlier-dated rows once per date.
- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Smoke check** on live Turkey data: mean of `raw` is within 15% of the mean actual total of those matches.

### Task 4: Bookmaker lines (BetExplorer) and manual lines

**Files:**
- Create: `P\lines.py`, `P\manual_lines.json` (content `[]`)
- Test: `P\tests\test_lines.py`, `P\tests\fixtures\be_ou_sample.json`

**Interfaces:**
- Produces: `be_fixtures(slug: str, season: str) -> list[dict]` of `{url, home, away, date, time}` (BetExplorer fixtures page; adapt `H\scrape.py::parse_rows`, change `/handball/` to `/basketball/`); `be_results(slug, season) -> list[dict]` same shape plus `hp, ap` (for historical lines, Task 5); `fetch_ou(url: str) -> dict|None` returning `{line: float, over: float, under: float, books: int}`; `main_line(odds_html: str) -> dict|None` (pure, tested); `attach_lines(fixtures: list[dict], be: list[dict], manual: list[dict]) -> list[dict]` adding `line, over, under, books, source` ("betexplorer" or "manual") to each fixture it can match by `(date, home, away)`; unmatched fixtures are returned unchanged.

- [ ] **Step 1: Find the odds endpoint.** Open one upcoming TBL match on BetExplorer and confirm the total-points ajax URL (handball uses `/match-odds-old/{id}/1/ou/1/en/`; basketball may need a different segment for "incl. overtime"). Record the working URL in the module docstring. Save one response to `tests\fixtures\be_ou_sample.json`.
- [ ] **Step 2: Write failing tests:** `main_line(sample)` returns the line whose over and under average odds are closest and requires at least 3 bookmakers (falls back to any line if none has 3); `main_line("")` returns `None`; `attach_lines` matches on date and names, prefers BetExplorer lines, uses a manual entry when no BetExplorer line exists, and leaves a name mismatch unmatched (Review Focus 1).
- [ ] **Step 3: Run to verify FAIL.**
- [ ] **Step 4: Implement** `main_line` by porting the parsing in `H\ou.py::fetch_ou`; `fetch_ou` retries 3 times with 0.3 s sleeps; BetExplorer unavailable (`Availability Notice` / redirect) returns `None` without raising.
- [ ] **Step 5: Run to verify PASS.** Then live check: `be_fixtures('turkey/tbl','2026-2027')` returns rows and `fetch_ou` on the first one returns a dict or `None` without crashing.

### Task 5: Historical data and per-league tuning

**Files:**
- Create: `P\tune.py`, `P\history.py`
- Test: `P\tests\test_tune.py`

**Interfaces:**
- Consumes: `fs.league`, `lines.be_results`, `lines.fetch_ou`, `model.walk`.
- Produces: `history.load(league_key) -> list[dict]` (cached in `P\history_{key}.json`; every historical result for the four seasons with `season, id, date, home, away, hp, ap`, plus `line, over, under` when available); `tune.simulate(preds: list[dict], gap: float, side: str) -> dict` where `preds` are walk rows with `line, over, under`, returning `{n, won, lost, push, units, roi}`; `tune.tune_league(key) -> dict` writing/returning `{key, k, opp, shift, side, gap, train: {...}, test: {...}, status}` to `P\tuning.json` under that key, where `status` is `"live"` or `"tracking"`.

Selection rule (decided here, from the spec's "tuned on 2022-25, checked on 2025-26"):
1. `k` in `[0, 2, 4, 8]`, `opp` in `[0, 3]`: pick the pair with lowest mean absolute total error over the tuning seasons (`start=6`).
2. `shift` = mean(actual - raw) over the tuning seasons.
3. For `side` in `over`, `under`, `both` and `gap` in `GAP_GRID`: simulate on tuning seasons; consider combinations with `n >= 30`; pick the highest `units`.
4. `status = "live"` only if the chosen combination on the test season has `n >= 15` and `units > 0`; otherwise `"tracking"`. If no combination has `n >= 30` or fewer than 3 seasons have lines, `status = "tracking"` and `reason` states which.

- [ ] **Step 1: Write failing tests** on synthetic walk rows: `simulate` counts a win, a loss and an integer-line push correctly for both sides (win pays `odds-1`, push is 0, loss is -1); `side="both"` picks over when `raw > line` and under otherwise; selection chooses the combination with the most units among those with `n >= 30`; a league whose test season has `n < 15` is `"tracking"`; a league with no lines is `"tracking"` with a reason.
- [ ] **Step 2: Run to verify FAIL.**
- [ ] **Step 3: Implement `simulate` and `tune_league`** as specified. `history.load` fetches each past season with `fs.league(slug, season)` and fetches BetExplorer lines only for matches where both teams had 6 prior games (4 threads, incremental cache, same idea as `H..\scan\scan2.py::step_ou`).
- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Run `python tune.py` for both leagues** (long-running; run in background). Open `tuning.json` and report each league's status, side, gap, n and units for train and test. If BetExplorer history is blocked, both leagues are `"tracking"` with that reason; that is an acceptable outcome, not a failure.

### Task 6: Flag ledger and settlement

**Files:**
- Create: `P\signals.py`
- Test: `P\tests\test_signals.py`

**Interfaces:**
- Consumes: tuning entries from Task 5; candidate rows `{league, id, date, time, home, away, gh, ga, ours, line, over, under, books}`; result rows from `fs.league`.
- Produces: `qualifies(c: dict, t: dict) -> str|None` returns `"over"`, `"under"` or `None` (requires `t["status"] == "live"`, `min(gh, ga) >= START`, a line, and the gap rule for `t["side"]`); `update(ledger: dict, candidates: list[dict], tuning: dict, results: dict, now: str) -> tuple[list, list]` mutating `ledger` (keyed by match id) and returning `(new, settled)`; `record(ledger: dict) -> dict` per league `{open, won, lost, push, units}`; ledger file `P\signals.json`.

- [ ] **Step 1: Write failing tests:** a live league with gap beyond the rule is logged once and not re-logged on the next call; a `"tracking"` league never produces flags (Review Focus 5); a candidate without `line` never flags; settlement: total above line with side over is `won` with profit `odds-1`, below is `lost` -1, equal to the line is `push` 0; an unplayed match stays `open`; a result whose date is more than 3 days from the flagged date does not settle it.
- [ ] **Step 2: Run to verify FAIL.**
- [ ] **Step 3: Implement** by porting the logic of `H\signals.py::main` into the pure functions above (no file reads inside them; a thin `main()` handles files).
- [ ] **Step 4: Run to verify PASS.**

### Task 7: Page data, template and site pages

**Files:**
- Create: `P\build.py`, `P\template.html`, `P\make_site.py`
- Test: `P\tests\test_build.py`

**Interfaces:**
- Consumes: everything above.
- Produces: `build.build_data() -> dict` D with `scraped: str`, `leagues: list` (each `{key, name, page, status, reason, side, gap, k, opp, shift, gamesMin, gamesMax, avg: {muH, muA, total}, teams: [...], upcoming: [{id, date, time, home, away, gh, ga, ours, ph, pa, line?, gap?, flagged: bool}]}`), `signals: list`, `record: dict`; `build.main()` writes `P\basketball-projections.html` by replacing the single `/*DATA*/` marker in `template.html` with `const D=<json>;`; `make_site.py [out_dir]` writes `basketball/index.html` (redirect to `/basketball/projections/`), `basketball/projections/index.html`, `basketball/projections/turkey/index.html`, `basketball/projections/czech-republic/index.html`, each with `<div class="wrap" data-page="..." data-base="/basketball/">` (one `.wrap` tag in the template, as in `H..\site\make_site.py`).

Template: copy the `<style>` block from `S\handball\projections\index.html` (tokens, tables, tiles, tabs, chips, `how3` cards), change `--accent`/`--accent-soft` to the basketball accent, title "Basketball", header `Basketball` with the logo linking to `/basketball/`, a single `Projections` tab. Sections, in order: tiles (flagged now, record, return, matches with a line, leagues), league tiles linking to league pages, "Flagged now", "Projections: next matches" (next 8 days, model total, line, gap; flagged rows highlighted), "Season record" and log, team averages table, three-card explainer (how it is built, the correction, early in the season). A league with `status != "live"` shows a note: "Tracking only: {reason}. No matches are flagged." Empty states for no flags, no lines and no fixtures. Page JS sorts tables and renders league pages when `data-page` is a league folder.

- [ ] **Step 1: Write failing tests:** `build_data` on a small synthetic set puts `flagged: true` only for a live league's qualifying row; every `upcoming` row for a match with fewer than 6 games for either team is absent; `make_site` into a temp dir writes exactly the 4 files with the right `data-page` values (`projections`, `turkey`, `czech-republic`) and a redirect page; the template contains exactly one `/*DATA*/` and one `<div class="wrap">`.
- [ ] **Step 2: Run to verify FAIL.**
- [ ] **Step 3: Implement `build.py`, `template.html`, `make_site.py`** as specified.
- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Look at it.** Run `python make_site.py <scratchpad>\site`, serve that folder, open `/basketball/projections/` and both league pages in the built-in browser at desktop width and at 375px width, in light and dark theme. Check no horizontal page scroll, tables scroll inside their box, no console errors.

### Task 8: Orchestration, first run, publish to this repo

**Files:**
- Create: `P\run_update.py`, `P\README.md`
- Modify: `S\sitemap.xml`, `S\index.html` (add a Basketball card next to the Handball card at line 393; reuse the card markup, use a placeholder screenshot only if you capture one with the browser tool, otherwise no image)
- Create (via `make_site.py`): `S\basketball\...`

**Interfaces:**
- Produces: `run_update.py` runs, in order, `fs.league` for each league and `lines` attach, `model` projections for upcoming fixtures, `signals.update`, `build.main`, and prints one `SUMMARY {json}` line (per league: games played, fixtures, fixtures with a line, flags). Exit code non-zero on any exception; never overwrites `signals.json` with an empty ledger.

- [ ] **Step 1: Implement `run_update.py`** (tune only when `tuning.json` has no entry for a league or `--tune` is passed).
- [ ] **Step 2: Run it end to end** and read the SUMMARY line. Expected: both leagues have fixtures; lines present for some or none (report which).
- [ ] **Step 3: Write `README.md`** in `P`: what each file does, how to run, how to add a league (add an entry to `config.LEAGUES`, run `python run_update.py --tune`), where manual lines go.
- [ ] **Step 4: Publish.** `python make_site.py "C:\Users\antonis\Desktop\nikolitso.github.io\basketball"`; add the four URLs to `sitemap.xml`; add the home-page card.
- [ ] **Step 5: Verify in the browser** against `http://localhost` serving `S` (not the scratchpad copy): `/basketball/` redirects, all three pages render, nav and league links work, home card links to `/basketball/`.
- [ ] **Step 6: Commit** in `S` only the spec, plan, `basketball\`, `sitemap.xml`, `index.html` (do not add the three untracked handball HTML files already in the working tree). Message: `Basketball: projections for Turkey TBL and Czech NBL`, ending with the Co-Authored-By line. Do not push until the user says so.

---

## Self-review notes
- Spec coverage: site structure (Tasks 7, 8), pipeline files (2, 4, 3, 6, 7, 8), model (3), flagging and tuning (5, 6), page contents (7), out-of-scope items not planned. The spec's "Results from BetExplorer with Flashscore fallback" was changed to Flashscore for results and fixtures; the spec was amended to match.
- The spec said "A league is flagged only after the backtest shows an edge on the independent season." Task 5's `status` rule (test `n >= 15` and `units > 0`) is the concrete definition.
- Possible outcome to expect: with thin second-tier coverage, both leagues may launch as tracking only. The plan treats that as a valid result, with projections and gaps still shown.
