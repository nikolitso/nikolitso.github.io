# Calibration table on the track record (24 Nov 2026)

## Why
"Beat the close" judges the prices against the market. Nothing yet judges the model's own chances
against what happened. A calibration table does: when the model says 57%, does it happen about 57%
of the time? Idea taken from a public sports-ratings site's walk-forward check (ideas only, nothing copied).

## Decided by the user
- Every game the model priced, not only the picks (option a, 24 Nov).
- A plain HTML table under the existing track-record table, written by record.py (approach 1).
- Publish basketball as it stands, even though its upper band runs below what the model said.

## Approaches considered
1. **Table under the existing one, written by record.py (chosen).** Fits where readers already look,
   visible to crawlers, refreshes every two hours with the rest.
2. Separate calibration page with a chart per sport. More visual, but a new page and chart code,
   and sparse with one sport live.
3. One accuracy score per sport in the existing table. Compact, but hides where the model goes wrong.

## Design
- **Which chance:** basketball uses the last snapshot before tip-off (`last.p`, the over chance at
  `last.line`), the chance on the page closest to the start. Testing leagues are left out, as in the
  rest of the record. Pushes (total = line) are left out.
- **Folding:** each game counts once, for the side the model favoured, so every chance is 50% or more.
- **Bands:** 50–55%, 55–60%, 60%+. A band with fewer than 20 games merges into the band below it
  (today: 60%+ has 15 games, so the bands are 50–55% and 55%+).
- **Columns:** Model said (average chance in the band) · Games · Happened · 95% range of Happened.
  The range stops a 15-game band from reading as proof either way.
- **Minimum per sport:** 200 games. Below it, one line: "Volleyball: 129 games so far, shown from 200."
- **Placement:** inside the existing `record:start`/`record:end` marks, after the main table and
  before the picks.csv note, so the existing writer replaces it on every run.

Sketch (numbers as of 24 Nov, counted leagues only):

```
How honest are the model's chances?
Every game the model priced, not only the picks. Each game counts once, for the side the
model favoured. If the chances are right, Happened matches Model said.

European Basketball · 371 games
Model said   Games   Happened   95% range
52.3%          258     53.9%    47.8–60.0%
57.5%          113     53.1%    43.9–62.3%    (55%+ merged)
```

Wording above is a draft for the user's approval before publishing (site rule).

## Other sports
- **Volleyball:** the log keeps the chance from before the 23 Nov correction, but the site shows the
  corrected one. From now on games_log also saves the chance as shown (`p_shown`); volleyball counts
  only games with `p_shown`, and shows the "so far" line until 200.
- **Handball:** saves a projected total but no chance. Not in scope; shows nothing for now.
- **Super League:** 14 logged games. Not in scope; shows nothing for now.
- **Women's basketball:** too few games; not shown.

## Non-goals
- No chart, no new page, no score against the market.
- No change to the model or to the picks.

## Testing
- Unit tests for folding, push exclusion, band merging and the 95% range.
- A check script recounting the basketball bands straight from the log, matched against the page.

## Left to the builder
- Exact CSS reuses the existing `.rec` table styles; font at least 14px.
