# antonisnikolitsopoulos.com

The personal site of Antonis Nikolitsopoulos, served by GitHub Pages from this repository. Every
section is a static folder; the data-driven ones are rebuilt by a GitHub Actions workflow on a
schedule, and **Update all sites** runs the whole set at 09:00, 14:00 and 23:59 Athens.

## Sites

| Section | Folder | Workflow | Runs (Athens) | Scripts |
|---|---|---|---|---|
| [Homepage](https://antonisnikolitsopoulos.com/) | `/` | Homepage · Latest posts, Homepage · Project pills and screenshots | 07:17, 06:23 | `scripts/` |
| [Books](https://antonisnikolitsopoulos.com/books/) | `books/` | Site · Books | on push | `scripts/build_edge.py` |
| [Thought Bank](https://antonisnikolitsopoulos.com/thought-bank/) | `thought-bank/` | — | — | static |
| [Basketball](https://antonisnikolitsopoulos.com/basketball/) | `basketball/` | Site · Basketball | 09:00, 16:00 | BettingSignal `basketball/projector` |
| [Basketball totals](https://antonisnikolitsopoulos.com/basketball/overs/) | `basketball/overs/` | Feed · Basketball totals live test | hourly | BettingSignal `basketball-overs` |
| [EuroCup](https://antonisnikolitsopoulos.com/eurocup/) | `eurocup/` | Site · EuroCup | 09:30 Mon–Thu | BettingSignal `eurocup` |
| [FIBA Europe Cup](https://antonisnikolitsopoulos.com/fibaeuropecup/) | `fibaeuropecup/` | Site · FIBA Europe Cup | 07:35, then hourly to 20:05 | BettingSignal `fibaeuropecup` |
| [Super League](https://antonisnikolitsopoulos.com/superleague/) | `superleague/` | Site · Super League, Feed · Super League closing odds | 09:00, 14:00, 18:00; odds every 30 min 12:00–23:30 | BettingSignal `superleague`; `odds` branch |
| [Greek Cup](https://antonisnikolitsopoulos.com/football/greek-cup/) | `football/greek-cup/` | Site · Greek Cup | 10:00, 23:45 | BettingSignal `greek-cup` |
| [Handball](https://antonisnikolitsopoulos.com/handball/projections/) | `handball/` | Site · Handball | 03:00, 09:00, 15:00, 21:00 | BettingSignal `handball/projector` |
| [Volleyball](https://antonisnikolitsopoulos.com/volleyball/) | `volleyball/` | Site · Volleyball | 09:00, 13:00 | BettingSignal `volleyball` |
| [PAOK Hub](https://antonisnikolitsopoulos.com/paok-hub/) | `paok-hub/` | Site · PAOK Hub | 10:00, 23:45 | BettingSignal `paok-hub` |
| [PAOK Basketball](https://antonisnikolitsopoulos.com/paok-basketball/) | `paok-basketball/` | Site · PAOK Basketball | by Update all sites | BettingSignal `paok-basketball` |
| [Wine](https://antonisnikolitsopoulos.com/wine/) | `wine/` | Site · Wine | 06:41 | `scripts/` |
| [About](https://antonisnikolitsopoulos.com/about/) | `about/` | — | — | static |

[What Algo Missed](https://whatalgomissed.com/) has its own repository, [whatalgomissed](https://github.com/nikolitso/whatalgomissed);
Post · Daily X posts its films and this site's books on X.

## How a pipeline works

`.github/actions/pipeline` is one composite action: it checks out the scripts (from the private
BettingSignal repository unless the workflow says otherwise), installs the requirements, runs the
update, and commits only the pages the workflow lists. Pushes retry with a rebase, because several
pipelines publish at once. Each workflow has a **Run workflow** button for a manual refresh.

Runs are kept for 7 days.
