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
| [FIBA Europe Cup](https://antonisnikolitsopoulos.com/fibaeuropecup/) | `fibaeuropecup/` | Site · FIBA Europe Cup | 07:35, then hourly to 20:05 | [FIBA-Europe-Cup](https://github.com/nikolitso/FIBA-Europe-Cup) |
| [Super League](https://antonisnikolitsopoulos.com/superleague/) | `superleague/` | Site · Super League, Feed · Super League closing odds | 09:00, 14:00, 18:00; odds every 30 min 12:00–23:30 | BettingSignal `superleague`; `odds` branch |
| [Greek Cup](https://antonisnikolitsopoulos.com/football/greek-cup/) | `football/greek-cup/` | Site · Greek Cup | 10:00, 23:45 | BettingSignal `greek-cup` |
| [Handball](https://antonisnikolitsopoulos.com/handball/projections/) | `handball/` | Site · Handball | 03:00, 09:00, 15:00, 21:00 | BettingSignal `handball/projector` |
| [Volleyball](https://antonisnikolitsopoulos.com/volleyball/) | `volleyball/` | Site · Volleyball | 09:00, 13:00 | BettingSignal `volleyball` |
| [Challenge Cup Women](https://antonisnikolitsopoulos.com/volleyball/challenge-cup-women/) | `volleyball/challenge-cup-women/` | Site · Challenge Cup Women | 10:30, 15:30, 19:30, 23:45 | BettingSignal `volleyball/challenge-cup` |
| [Wine](https://antonisnikolitsopoulos.com/wine/) | `wine/` | Site · Wine | 06:41 | `scripts/` |
| [About](https://antonisnikolitsopoulos.com/about/) | `about/` | — | — | static |

Sites in their own repositories, served under the same domain or their own:

| Site | Repository | Workflow here |
|---|---|---|
| [PAOK Hub](https://antonisnikolitsopoulos.com/paok-hub/) | [paok-hub](https://github.com/nikolitso/paok-hub) | Site · PAOK Hub (10:00, 23:45), scripts in BettingSignal `paok-hub` |
| [PAOK Basketball](https://antonisnikolitsopoulos.com/paok-basketball/) | [paok-basketball](https://github.com/nikolitso/paok-basketball) | run by Update all sites |
| [What Algo Missed](https://whatalgomissed.com/) | [whatalgomissed](https://github.com/nikolitso/whatalgomissed) | Post · Daily X posts its films and books on X |

## How a pipeline works

`.github/actions/pipeline` is one composite action: it checks out the scripts (from the private
BettingSignal repository unless the workflow says otherwise), installs the requirements, runs the
update, and commits only the pages the workflow lists. Pushes retry with a rebase, because several
pipelines publish at once. Each workflow has a **Run workflow** button for a manual refresh.

Runs are kept for 7 days.
