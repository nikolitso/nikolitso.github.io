"""Render the homepage hero's "Today's picks" card from the last daily X posts.

Reads _x/state.json (written by scripts/x_daily.py) and rewrites everything between
<!-- picks:start --> and <!-- picks:end --> in index.html. Runs in the Daily X posts
workflow right after each post, so the card always shows what was just shared.
"""
import html
import json
import re
from pathlib import Path

import update_posts as UP  # fetch() and page_image()
import x_daily as X        # books() and films() catalogues

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
STATE = ROOT / "_x" / "state.json"


def last(kind, state, catalogue):
    log = (state.get(kind) or {}).get("log") or []
    for entry in reversed(log):
        if entry["slug"] in catalogue:
            return entry["slug"], catalogue[entry["slug"]]
    return None, None


def item(kind, it):
    img = UP.page_image(it["url"])
    if not img and kind == "film":
        img = it["url"].replace("/films/", "/assets/backdrops/").rstrip("/") + ".jpg"
    label = "Book" if kind == "book" else "Film"
    sub = it["by"] if kind == "book" else ", ".join(x for x in (str(it.get("year") or ""), it["by"]) if x)
    ext = "" if it["url"].startswith(UP.SELF) else ' target="_blank" rel="noopener"'
    return (f'        <a class="pick {kind}" href="{html.escape(it["url"])}"{ext}>'
            f'<span class="pick-img"><img src="{html.escape(img)}" alt="" decoding="async"></span>'
            f'<span class="pick-text"><span class="pick-kind">{label}</span>'
            f'<span class="pick-title">{html.escape(it["title"])}</span>'
            f'<span class="pick-sub">{html.escape(sub)}</span></span></a>')


def render():
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    rows = []
    for kind, cat in (("book", X.books()), ("film", X.films())):
        slug, it = last(kind, state, cat)
        if it:
            rows.append(item(kind, it))
    if not rows:
        return ""
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
