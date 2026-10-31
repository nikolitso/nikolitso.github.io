"""Show handball match times in Athens time.

The handball pipeline (BettingSignal handball/projector, built by handball/site/make_site.py) stores each
match's start as Flashscore's UTC "date"/"time" pair, so the pages showed kick-offs 2 hours early in
winter (3 in summer). This rewrites every "date": "YYYY-MM-DD", "time": "HH:MM" pair in the built pages
to Europe/Athens, moving the date too when a late game crosses midnight.

Runs after make_site.py in .github/workflows/handball.yml. A page it has converted gets a marker in
<head>, so running it again on the same page does nothing.

    python scripts/handball_athens_times.py [handball-dir]
"""

import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ATHENS = ZoneInfo("Europe/Athens")
MARKER = '<meta name="match-times" content="Europe/Athens">'
PAIR = re.compile(r'"date": "(\d{4}-\d{2}-\d{2})", "time": "(\d{1,2}):(\d{2})"')


def to_athens(m: re.Match) -> str:
    utc = datetime.strptime(f"{m[1]} {m[2]}:{m[3]}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
    local = utc.astimezone(ATHENS)
    return f'"date": "{local:%Y-%m-%d}", "time": "{local:%H:%M}"'


def convert(page: Path) -> int:
    html = page.read_text(encoding="utf-8")
    if MARKER in html or "<head>" not in html:
        return 0
    html, n = PAIR.subn(to_athens, html)
    if n:
        page.write_text(html.replace("<head>", "<head>" + MARKER, 1), encoding="utf-8")
    return n


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "handball")
    total = 0
    for page in sorted(root.rglob("index.html")):
        n = convert(page)
        total += n
        if n:
            print(f"{page.relative_to(root.parent)}: {n} match times -> Athens")
    print(f"handball: {total} match times converted to Europe/Athens")


if __name__ == "__main__":
    main()
