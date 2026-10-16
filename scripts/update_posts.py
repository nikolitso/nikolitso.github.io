"""Pull the latest books and films into the homepage's Latest section, with images.

Rewrites everything between <!-- posts:start --> and <!-- posts:end -->.
Run locally with `python scripts/update_posts.py`; a GitHub Action runs it daily.

- Books: newest posts first.
- What Algo Missed: newest releases first (2026, then 2025, ...), and within a year
  the most recently posted first, so a new film beats an older one posted the same week.
- Each card uses the image of the item's own page (its og:image).
"""
import html
import re
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
SELF = "https://antonisnikolitsopoulos.com/"
PER_FEED = 3
FEEDS = [
    dict(name="Books", kind="book", url=SELF + "books/feed.xml", all_url="/books/", all_label="All books"),
    dict(name="What Algo Missed", kind="film", url="https://whatalgomissed.com/feed.xml",
         all_url="https://whatalgomissed.com/films/", all_label="All films"),
]


def fetch(url):
    if url.startswith(SELF):  # our own pages: read the freshly built files, no network needed
        rel = url[len(SELF):]
        local = ROOT / (rel + "index.html" if rel.endswith("/") or not rel else rel)
        if local.exists():
            return local.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (portfolio feed updater)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def page_image(link):
    try:
        page = fetch(link).decode("utf-8", "replace")
        m = re.search(r'<meta property="og:image" content="([^"]+)"', page)
        return m.group(1) if m else ""
    except Exception:
        return ""


def latest(feed):
    root = ET.fromstring(fetch(feed["url"]))
    posts = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        date = item.findtext("pubDate")
        if not title or not link or not date:
            continue
        year = ""
        m = re.match(r"^(.*?)\s*\((\d{4})\)$", title)
        if feed["kind"] == "film" and m:
            title, year = m.group(1), m.group(2)
        posts.append(dict(title=title, year=year, link=link, date=parsedate_to_datetime(date)))
    if feed["kind"] == "film":
        posts.sort(key=lambda p: (p["year"], p["date"]), reverse=True)
    else:
        posts.sort(key=lambda p: p["date"], reverse=True)
    posts = posts[:PER_FEED]
    for p in posts:
        p["img"] = page_image(p["link"])
        m = re.search(r"whatalgomissed\.com/films/([^/]+)/", p["link"])
        if not p["img"] and m:  # page unreachable: fall back to the film's still by its usual address
            p["img"] = f"https://whatalgomissed.com/assets/backdrops/{m.group(1)}.jpg"
    return posts


def ext_attrs(link):
    """Open other sites in a new tab; keep our own pages in the same tab."""
    return "" if link.startswith(("/", SELF)) else ' target="_blank" rel="noopener"'


def current_block(page, name):
    """The feed's block as it is on the page now, used when its feed can't be reached."""
    m = re.search(r'      <div class="feed-row" data-feed="' + re.escape(html.escape(name)) + r'">.*?\n      </div><!-- /feed-row -->',
                  page, flags=re.S)
    return m.group(0) if m else None


def card(feed, p):
    meta = p["year"] if feed["kind"] == "film" else f'{p["date"].day} {p["date"]:%b %Y}'
    img = (f'<span class="pc-img"><img src="{html.escape(p["img"])}" alt="" loading="lazy" decoding="async"></span>'
           if p["img"] else '<span class="pc-img"></span>')
    return (f'          <li><a class="pc" href="{html.escape(p["link"])}"{ext_attrs(p["link"])}>{img}'
            f'<span class="pc-meta">{html.escape(meta)}</span>'
            f'<span class="pc-title">{html.escape(p["title"])}</span></a></li>')


def render(page):
    rows = []
    for feed in FEEDS:
        try:
            posts = latest(feed)
        except Exception as e:  # e.g. a host blocks GitHub's servers for a while
            old = current_block(page, feed["name"])
            if old is None:
                raise
            print(f"::warning::{feed['name']}: could not read {feed['url']} ({e}); keeping current posts")
            rows.append(old)
            continue
        tag = "tag film" if feed["kind"] == "film" else "tag"
        rows.append(
            f'      <div class="feed-row" data-feed="{html.escape(feed["name"])}">\n'
            f'        <div class="feed-head"><p class="{tag}">{html.escape(feed["name"])}</p>'
            f'<a href="{feed["all_url"]}"{ext_attrs(feed["all_url"])}>{feed["all_label"]} →</a></div>\n'
            f'        <ul class="pcards {feed["kind"]}">\n' + "\n".join(card(feed, p) for p in posts) + '\n        </ul>\n'
            f'      </div><!-- /feed-row -->'
        )
    return "\n".join(rows)


def main():
    page = INDEX.read_text(encoding="utf-8").replace("\r\n", "\n")
    new = re.sub(
        r"(<!-- posts:start -->).*?(\n[ \t]*<!-- posts:end -->)",
        lambda m: m.group(1) + "\n" + render(page) + m.group(2),
        page,
        flags=re.S,
    )
    if new != page:
        INDEX.write_text(new, encoding="utf-8", newline="\n")
        print("index.html updated")
    else:
        print("no changes")


if __name__ == "__main__":
    main()
