"""Render the homepage hero's "Today's picks" card: one book and one film a day, from the whole collections.

Each new day (Athens time) it picks a book from the Books notes and a film from What Algo Missed, at random among
those not yet shown, so nothing comes back until everything has had a turn; then a new round starts. Old and new
alike. The day's pair and what has been shown live in _x/picks.json (committed by the Daily X workflow, which runs
this script on every run: the first run of a new day changes the pair, later runs keep it). Rewrites everything
between <!-- picks:start --> and <!-- picks:end --> in index.html.

Until 19 Nov 2026 the card showed the last book and film posted on X; films are no longer posted there.
"""
import html
import json
import random
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import update_posts as UP  # fetch() and page_image()
import x_daily as X        # books() and films() catalogues

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
PICKS = ROOT / "_x" / "picks.json"
ATHENS = ZoneInfo("Europe/Athens")


def choose(kind, catalogue, picks, today):
    """Today's slug for kind: kept if already chosen today, else a random one not shown this round."""
    if picks.get("day") == today and picks.get(kind) in catalogue:
        return picks[kind]
    shown = [x for x in picks.get("shown", {}).get(kind, []) if x in catalogue]
    left = sorted(set(catalogue) - set(shown))
    if not left:                                   # everything has had a turn: a new round
        shown, left = [], sorted(catalogue)
        if picks.get(kind) in left and len(left) > 1:
            left.remove(picks[kind])               # never the same one two days running
    pick = random.Random(f"{kind} {today}").choice(left)
    picks.setdefault("shown", {})[kind] = shown + [pick]
    picks[kind] = pick
    return pick


def item(kind, it):
    img = UP.page_image(it["url"])
    if not img and kind == "film":
        img = it["url"].replace("/films/", "/assets/backdrops/").rstrip("/") + ".jpg"
    label = "Book" if kind == "book" else "Film"
    sub = it["by"] if kind == "book" else ", ".join(x for x in (str(it.get("year") or ""), it["by"]) if x)
    ext = "" if it["url"].startswith(UP.SELF) else ' target="_blank" rel="noopener"'
    return (f'        <a class="pick {kind}" href="{html.escape(it["url"])}"{ext}>'
            f'<span class="pick-img"><img src="{html.escape(img)}" alt="{html.escape(("Cover of " if kind == "book" else "Still from ") + it["title"])}" '
            f'{'width="400" height="600"' if kind == "book" else 'width="640" height="400"'} decoding="async"></span>'
            f'<span class="pick-text"><span class="pick-kind">{label}</span>'
            f'<span class="pick-title">{html.escape(it["title"])}</span>'
            f'<span class="pick-sub">{html.escape(sub)}</span></span></a>')


def render(today=None):
    today = today or datetime.now(ATHENS).date().isoformat()
    picks = json.loads(PICKS.read_text(encoding="utf-8")) if PICKS.exists() else {}
    rows = []
    for kind, cat in (("book", X.books()), ("film", X.films())):
        if cat:                                    # no films if the What Algo Missed checkout is missing
            rows.append(item(kind, cat[choose(kind, cat, picks, today)]))
    if not rows:
        return ""
    picks["day"] = today
    PICKS.write_text(json.dumps(picks, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    return ('      <aside class="picks" aria-label="Today\'s picks">\n'
            '        <p class="picks-head">Today\'s picks</p>\n'
            + "\n".join(rows) + "\n"
            '      </aside>')


def main():
    page = INDEX.read_text(encoding="utf-8").replace("\r\n", "\n")
    new = re.sub(r"(<!-- picks:start -->).*?(\n[ \t]*<!-- picks:end -->)",
                 lambda m: m.group(1) + "\n" + render() + m.group(2), page, flags=re.S)
    if new != page:
        INDEX.write_text(new, encoding="utf-8", newline="\n")
        print("picks updated")
    else:
        print("picks unchanged")


if __name__ == "__main__":
    main()
