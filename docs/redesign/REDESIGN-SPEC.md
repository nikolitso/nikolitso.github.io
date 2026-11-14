# Website redesign specification
**Review branch:** `redesign/site-wide-foundation-2026`
**Date:** 14 November 2026
**Scope:** antonisnikolitsopoulos.com, What Algo Missed, and the public-facing sports project pages generated from BettingSignal.

## Design intent
Build a coherent ecosystem without flattening distinct identities:
- Personal site: restrained, professional, research-led; dark navy foundation with a single blue accent.
- Sports projects: same information architecture and component grammar, with sport-specific accent tokens already defined in `/assets/an.css`.
- What Algo Missed: independent editorial identity; warm paper, near-black ink, restrained ochre/gold and film imagery.

## Shared analytical rules
1. Distinguish **model estimate**, **market reference**, and **actual outcome** in labels and visual groups.
2. Every performance number must carry its denominator or sample size nearby.
3. Separate historical backtest, prospective live test, actively tracked, established and archived records.
4. Report units and settlement rules beside metrics. Define ROI/yield and stake convention.
5. For probability forecasts, report calibration (reliability by probability bucket), Brier score and/or log loss where suitable.
6. For count/continuous forecasts, report MAE, RMSE, signed bias and prediction intervals where the model supports them.
7. Never derive confidence claims from ROI alone. Show sample size, uncertainty and drawdown.
8. Every automated data page shows last successful update, source and a visible stale-data state.
9. Colour must not be the only encoding: pair positive/negative colours with labels, signs or icons.
10. Make tables scroll within their own containers on small screens; do not shrink numeric columns to illegibility.

## Page-by-page redesign

### Personal website
- **Home (/):** Hero should answer who Antonis is and what the site contains in one screen. Primary action: Explore projects; secondary: About. Group projects by sport and label each card with purpose, status, latest update and one defensible metric. Separate Projects, Writing/Knowledge and Personal interests.
- **About (/about/):** Lead with a 2–3 sentence professional summary. Follow with current focus, career timeline, expertise and selected projects. Keep personal interests as a short final section. Provide a clear contact action.
- **Projects index / project directory:** Group by Football, Basketball, PAOK, Volleyball and Handball. Each entry gets a one-line question answered, status, season, update date and link. Avoid showing unqualified ROI as the principal summary.
- **Books (/books/):** Add filters for topic, author and reading status; searchable cover-led cards; book pages structured as premise, key ideas, passages, practical applications and related titles.
- **Thought Bank (/thought-bank/):** Search by quote text, author and topic; show source and attribution; link related ideas and associated books; use a featured quote plus compact browse list.
- **Wine (/wine/):** Lead with task-based pathways: dish, ingredient, grape and region. Result cards show producer, appellation, grape, style/body/acidity and a concise pairing rationale. Preserve English/Greek parity and show whether a wine record is incomplete.

### Football
- **Greek Super League (/superleague/):** Fixture selector → match projection cards → team/referee context → projection vs market → final actuals. Put expected goals, shots, SOT, corners, cards, fouls and saves in a stable market taxonomy. Add forecast error by metric and timestamp each update.
- **Greek Cup (/football/greek-cup/):** Separate competition-level overview, match statistics, team averages and Super League vs Super League 2 splits. Label full-match vs first-half consistently. Add sample counts for every team average.

### Basketball
- **Basketball hub (/basketball/):** Separate team strength, game projections, market tracking and historical testing. Explain Power, Net, Expected Wins, Luck, pace, fatigue and availability in a compact methodology panel.
- **Greek/Cyprus league pages:** Team ranking table with metric definitions and season filters; add team detail drawers/pages and clear data date.
- **Basketball projections (/basketball/projections/):** Use one match card per fixture showing model spread/total, market line, edge, projected pace and availability assumptions. Actual result and forecast error appear only after settlement.
- **Basketball totals (/basketball/overs/):** Separate backtest, live test and current picks. Show pick count, units, ROI, closing-line comparison and drawdown with a record-level ledger and filters.
- **Women's totals (/basketball/women/):** Same performance conventions as men's totals; make league/sample coverage explicit and distinguish thin samples.
- **Handicap (/basketball/handicap/):** Separate historical model validation from current picks. Show closing line and result with sample count and price convention.
- **EuroCup (/eurocup/):** Overview, fixtures/projections, vs-market, clubs, players and Elo methodology. Avoid dense unbroken tables; provide filters and mobile scroll wrappers.
- **FIBA Europe Cup (/fibaeuropecup/):** Same basketball competition template as EuroCup. Standardise season selector, club detail, vs-market tables, Elo history and calibration.

### PAOK
- **PAOK football hub:** Season snapshot, competition navigation, results/fixtures, squad, player ratings, team stats, opponent analysis, referee analysis, expected table and archive. Add per-90 and minutes context to player outputs; clearly define expected-table calculations.
- **PAOK basketball hub:** Match/season overview, player contributions, team ratings, opponent comparisons and historical seasons. Reuse the PAOK football navigation grammar but use basketball metrics.
- **Player pages:** Bio/role, minutes, per-90 or per-possession output, trend, availability and season comparison. Avoid ranking players on raw totals alone.

### Volleyball
- **Volleyball hub (/volleyball/):** League selector, upcoming fixtures, model set/points projection, market line, historical test and calibration. Separate women's and men's competitions and state league-level sample sizes. Explain low-line over model assumptions.

### Handball
- **Handball hub (/handball/):** Overview, live test, projections, backtest, league coverage and team studies. Distinguish goal totals from first-half markets and over/under directions. Show closing line, bookmaker price, line movement, sample size and drawdown. Archive inactive leagues without implying live coverage.

### What Algo Missed
- **Homepage:** Editorial hero, Film Finder, featured review, browse by country, lists, decade/year and latest additions. Keep film count/date visible and automatically sourced.
- **Film Finder:** Progressive questions, clear reset, explain recommendation basis, link results to film pages and related lists.
- **Film page:** Poster/hero, title/original title, year, director, country, runtime, genre, cast, awards, your rating and review. Separate factual synopsis from editorial opinion. Add director/country links and three related films with an explicit rationale.
- **Country pages:** Intro essay, film count, decade browsing, directors, featured films and related lists.
- **Lists:** Explain selection criteria, show count/ordering, filters and links to individual film pages.
- **Year archive:** Fast decade/year navigation, consistent poster crops and compact metadata.
- **Awards archive:** Separate award body, year, category, nominees and winners; link all films/directors.

## Colour and type
### Personal / sports
Use the existing tokens in `assets/an.css` as the source of truth. Preserve per-sport accents; use green/red only for positive/negative outcome semantics. Do not apply a second, competing palette at component level.
- Background: `#0d1220`; surface: `#141a2b`; text: `#f3f4f7`; muted: `#9aa1b2`; rule: `#262e42`.
- Sport accents already defined: football green, basketball orange, handball rose, volleyball blue, PAOK neutral white.
- Type: Instrument Serif for editorial/display headings, Hanken Grotesk for body, system monospace for numbers and metadata.
### What Algo Missed
Keep its independent editorial palette and typography. Do not import sports dashboard colours. Use warm paper, near-black, ochre/gold and restrained photographic colour.

## Implementation sequence
1. Correct stale-data messaging and update timestamps.
2. Refactor shared components and page navigation.
3. Redesign project landing pages and match cards.
4. Standardise analytical tables and performance reporting.
5. Refine book/Thought Bank/Wine discovery.
6. Redesign What Algo Missed templates.
7. Run mobile, accessibility, link and build checks.

## Non-goals / safeguards
- Do not change model calculations, prediction values, source feeds or settlement rules as part of a visual redesign.
- Do not replace existing data with illustrative metrics.
- Do not remove historical records or alter URLs without redirects.
- Do not publish to production until the owner reviews and approves the pull request.


## Knowledge and wine — implementation follow-up

### Books (/books/)
- The generated search index should cover title, author, topic, subtitle and summary/key ideas, not only title and author.
- Topic filters behave as accessible tabs with `aria-selected`; the live count explains how many results remain.
- Keep the existing author index as a separate browse route rather than duplicating it in the filter bar.
- Book detail pages retain the existing structure: summary, key ideas, worth-it verdict, author links and related titles.
- Build source: `scripts/build_edge.py`. The builder and current generated index must be kept in sync.

### Thought Bank (/thought-bank/)
- Search across quote title, body, context, note, author and folder.
- Keep the two independent filters (folder and author); make their counts respond to the active search and other filter.
- Preserve shareable `topic`, `by` and `q` URL parameters.
- Selecting an author from a quote card clears the text query and folder filter, showing all entries attributed to that person.
- Preserve original quote text and attribution; do not paraphrase or infer missing sources.

### Wine & Food Pairing (/wine/)
Recommended page hierarchy:
1. Task-led entry: **Dish**, **Ingredient**, **Grape**, **Region**.
2. Search and filters remain available without hiding the main task choices.
3. Result summary: matching wines, active filters and a clear reset.
4. Wine result card: producer, wine name, appellation/region, grape(s), style, body/acidity, vintage where known, and one sentence explaining the pairing.
5. Wine detail: the food match, why it works (acidity, body, tannin, sweetness, texture), serving suggestions and related dishes/wines.
6. English/Greek switch must preserve the current search and filters; missing translations should be visibly flagged rather than silently omitted.
7. Incomplete records should say which attributes are unavailable; do not infer grape, vintage, price or producer data.

**Implementation status:** Books and Thought Bank improvements are implemented in this branch. Wine is specified but not edited. The repository stores the entire finder/catalogue in one 1.5 MB `wine/index.html` blob and has no separate Wine builder or source modules. The connected GitHub file reader returned no contents for that oversized blob, so patching it without the complete source would risk replacing or damaging its wine catalogue and existing interactions. To implement the Wine redesign safely, the original `wine/index.html` source needs to be provided in a readable split/export (or reorganised into smaller HTML/CSS/JS/data files first).
