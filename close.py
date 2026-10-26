"""Closing odds for the Super League value bets, run by GitHub Actions on the main branch
(.github/workflows/superleague-closing-odds.yml) every 15 minutes.

Pulls Superbet's odds for the games kicking off within the next MINUTES (45 by default) into
data/odds on this branch. The pipeline on the PC (superleague-site-data) copies them into its own
data/odds before each update, where they are each game's closing odds. superbet.py is a copy of
the pipeline's.
python close.py [MINUTES]
"""
import sys

import superbet

if __name__ == "__main__":
    within = int(sys.argv[1]) if len(sys.argv) > 1 else 45
    games = superbet.fetch(days=8, within=within)
    print(f"{len(games)} game(s) kicking off within {within} min")
    for g in games:
        print("closing odds:", g["home"], "-", g["away"], g["kickoff"])
