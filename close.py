"""Closing odds for the Super League value bets, run by GitHub Actions on the main branch
(.github/workflows/superleague-closing-odds.yml) every 30 minutes.

Pulls the book's odds for the games kicking off within the next MINUTES (45 by default) into
data/odds/odds-*.json on this branch. The Super League pipeline copies them into its own data/odds
before each update, where they are each game's closing odds. The odds module (feed) and the log
filter (quiet) come from the private pipeline repo, checked out by the workflow at _bs.
python close.py [MINUTES]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "_bs", "superleague"))

import feed   # noqa: E402
import quiet  # noqa: E402


def main():
    within = int(sys.argv[1]) if len(sys.argv) > 1 else 45
    feed.HERE = HERE              # save the pull in this branch's data/odds
    games = feed.fetch(days=8, within=within)
    print(f"{len(games)} game(s) kicking off within {within} min")
    for g in games:
        print("closing odds:", g["home"], "-", g["away"], g["kickoff"])


if __name__ == "__main__":
    quiet.run(main)
