# Volleyball game pages: a "Key factors" paragraph (pilot)

Approved by the user on 23 Nov 2026. This is the pilot for the other sports; Super League, Handball and the cups follow one by one.

## Purpose

Each game page already says *what* the model expects (win chance, fair odds, line, sets, team points). The new
paragraph says *why*, in plain words, using only the numbers the model itself uses. No generated prose: fixed sentence
templates, each used only when its condition holds, filled in from `data.js`. If an input is missing, the paragraph is left out.

## Where

- Upcoming game pages (`fixture_page`): a section `<h2>Key factors</h2>` straight after the opening paragraph.
- Played game pages (`result_page`): `<h2>Key factors before the game</h2>`, only for games whose inputs were saved
  before the start (from launch on). Older games get no paragraph.

## Inputs (all already in data.js; no change to update.py)

- League home edge: `leagues[].home_adv` (also `test.leagues`, `hcapx.leagues`), the share of rallies a home side wins
  against an equal side.
- Each team: `ratings[]` (also `test.ratings`, `hcapx.ratings`) by league and team: `rally` (share of rallies it would win
  against an average side of its league), `p`, `w`, `l` (league games this season) and `pts` (share of points won).
- The game: `ph` (home win chance as shown), `p3`, `p4`, `p5`, `fair` (the model's line) and, when posted, the market's line `mk.line`.

The inputs are saved in `data/games_log.json` under `kf` with the rest of the game, until the start, as the fair line already is.

## Sentences

H = home team, A = away team; "stronger" = higher `rally`; the rating gap is in percentage points of rallies.

1. **Ratings (always).**
   - Gap under 0.1 points: "The two are rated almost level: against an average {league} side {H} would win x% of rallies and {A} y%, from n and m league games."
   - Otherwise: "{Stronger} are rated (slightly) stronger: against an average {league} side they would win x% of rallies, {other} y%, from n and m league games (n each)." Use "slightly" when the gap is under 1 point.
2. **Ratings vs results (only when the weaker-rated team has the better win share).** "The model rates teams on the points they win and against whom, not on results: {stronger} are w–l but have won x% of their points, {other} w–l with y%."
3. **Home edge (always).** "Home sides in this league win x% of rallies", then:
   - if the home side is rated lower but is the favourite: ", enough to tip the match: {H} are p% to win."
   - if the home side is the favourite otherwise: ", and with that edge the model makes {H} p% to win."
   - if the away side is the favourite: ", not enough to close the gap: the model makes {A} p% to win."
4. **Length (always).**
   - P(4 or 5 sets) of 60% or more: "Two sides this close make a long match likely: 4 or 5 sets p% of the time, which is why the line sits at {fair}."
   - P(3 sets) of 50% or more: "A gap this size makes a short match likely: 3 sets p% of the time, which is why the line is only {fair}."
   - Otherwise: "The length is open: 3 sets p% of the time, 4 or 5 sets q%, and the line sits at {fair}."
5. **Gap with the market (only when a market line is posted and it is 3 or more points from the model's line).**
   - Model higher: "The model's line is d points above the market's {line}: in this model a higher line means a closer match, so it sees these two as more even than the market's line suggests."
   - Model lower: "The model's line is d points below the market's {line}: in this model a lower line means a more one-sided match, so it sees a bigger gap between the two than the market's line suggests."

Rally and points shares are shown to one decimal (51.9%), chances as whole percentages, as on the rest of the page.
Wording rules: "the market", never "bookmaker"; no first person.

## Checks before it goes live

- A test builds the paragraph for real games and checks that every number in it equals the data field it came from,
  and that each conditional sentence appears only when its condition holds.
- The pages are built locally into a scratch copy of the site; QC runs; sample pages go to the user before publishing.
- Live through the normal volleyball update (`update.py` calls `games.py`).
