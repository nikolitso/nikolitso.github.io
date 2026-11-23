# A verifiable track record: when each pick first appeared on the site

Approved by the user on 23 Nov 2026 (option 1: times plus a public picks file, with old picks backfilled from the
site's public history).

## Purpose

The track record says every pick was made before the start. This makes that claim checkable by anyone: each pick is
listed with the time it first appeared on this site and a link to the public GitHub commit that published it. The
site repo is public; the ledgers (BettingSignal) are private, so the proof is what the site itself published.

## What is published

- `/track-record/picks.csv`: one row per pick for the tests on the track record (the same picks each test's record
  counts; pushes are listed as `push`). Columns: `test, league, game, start_utc, side, line, price,
  first_published_utc, commit, published_before_start, result, return`. Times are UTC, to match GitHub.
- `/track-record/picks-first.json`: the cache (each pick's first commit and the last commit read per file).
- On `/track-record/`: under each test's name, "N of M published before the start" (M = the Picks column, pushes
  out), and a note under the table linking to picks.csv and explaining the commit links.

## How "first published" is found

BettingSignal `proof.py`, called by `record.py --site` in the site's 2-hourly job (`update-projects.yml`, which now
checks out the full history, `fetch-depth: 0`). It reads every commit of each test's public data file, oldest first,
and notes the first commit whose pick list contains the pick. Each later run reads only new commits.

| Test | Public file(s) | Pick list | Matched by |
|---|---|---|---|
| European Basketball, full game | basketball/overs/live.js | `picks` | league, teams, Athens date |
| Women Basketball, full game / 1st half | basketball/women/live.js | `picks` / `h1.picks` | league, teams (ledger's " W" dropped), Athens date |
| Handball | handball/projections/index.html (from 18 Oct), handball/index.html (from about 11 Nov), handball/data.js (from 18 Nov) | `sig.signals`, `sig.testSignals` | the game's address (url) |
| Volleyball | volleyball/data.js | `picks` | match id |
| Greek Superleague | superleague/data.js | `value.bets`, `value.record.settled` | kick-off, home team, stat, side |

A pick keeps its earliest commit across all files. A pick not found says "not found in the site's history"; no
time is guessed. A pick first published after its start says `no`.

## Checks

- `test_proof.py` (BettingSignal): keys, Athens/UTC conversion, pages with embedded data, first commit before and after
  the start, missing picks, pushes, the cache keeping the earliest commit.
- Before launch: all 156 rows' commit links checked independently (the commit exists, has the CSV's time and names
  both teams in that sport's files), and two rows by hand against the commit before.

## Result at build time (23 Nov 2026)

155 of 156 picks published before the start. The exception: Handball, Alavarium W – ABC Braga W (8 Nov), flagged in
the ledger at 16:23 Athens, 23 minutes after the listed 16:00 start, and first published at 14:23 UTC.
