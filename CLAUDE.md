# antonisnikolitsopoulos.com

## Homepage rule: no betting picks

Never publish betting picks on the homepage (`index.html`): no bets, tips, model odds, edges or
"picks this round" blocks, from any sport or pipeline. They belong only on their own project pages.
The hero's "Today's picks" card (a book and a film, written by `scripts/update_picks.py`) is not
betting and is fine.

The BettingSignal pipeline action (`.github/actions/pipeline/action.yml`) enforces this: if a
pipeline writes betting picks into `index.html`, its homepage changes are dropped, not published.
Don't remove that check.
