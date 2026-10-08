"""Pull the latest posts from both blogs' RSS feeds into index.html.

Rewrites everything between <!-- posts:start --> and <!-- posts:end -->.
Run locally with `python scripts/update_posts.py`; a GitHub Action runs it daily.
"""
import html
import re
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

FEEDS = [
    ("The Edge", "", "https://antonisnikolitsopoulos.com/the-edge/feed.xml"),
    ("What Algo Missed", "film", "https://whatalgomissed.com/feed.xml"),
]
PER_FEED = 3
INDEX = Path(__file__).resolve().parent.parent / "index.html"


ROOT = Path(__file__).resolve().parent.parent
SELF = "https://antonisnikolitsopoulos.com/"


def fetch(url):
    if url.startswith(SELF):  # our own feed: read the freshly built file, no network needed
        local = ROOT / url[len(SELF):]
        if local.exists():
            return local.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (portfolio feed updater)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()



def latest(url):
    root = ET.fromstring(fetch(url))
    posts = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        date = item.findtext("pubDate")
        if not title or not link or not date:
            continue
        posts.append((parsedate_to_datetime(date), title, link))
    posts.sort(reverse=True)
    return posts[:PER_FEED]


def ext_attrs(link):
    """Open other sites in a new tab; keep our own pages in the same tab."""
    return "" if link.startswith(("/", SELF)) else ' target="_blank" rel="noopener"'


def current_block(page, name):
    """The feed's block as it is on the page now, used when its feed can't be reached."""
    m = re.search(
        r'      <div class="feed">\n        <p class="[^"]*">' + re.escape(html.escape(name)) + r"</p>.*?\n      </div>",
        page,
        flags=re.S,
    )
    return m.group(0) if m else None


def render(page):
    cols = []
    for name, kind, url in FEEDS:
        try:
            posts = latest(url)
        except Exception as e:  # e.g. the blog host blocks GitHub's servers for a while
            old = current_block(page, name)
            if old is None:
                raise
            print(f"::warning::{name}: could not read {url} ({e}); keeping current posts")
            cols.append(old)
            continue
        items = "\n".join(
            f'          <li><a href="{html.escape(link)}"{ext_attrs(link)}>'
            f'<time datetime="{d:%Y-%m-%d}">{d.day} {d:%b %Y}</time>'
            f'<span>{html.escape(title)}</span></a></li>'
            for d, title, link in posts
        )
        tag_class = f"tag {kind}".strip()
        cols.append(
            f'      <div class="feed">\n'
            f'        <p class="{tag_class}">{html.escape(name)}</p>\n'
            f'        <ul>\n{items}\n        </ul>\n'
            f'      </div>'
        )
    return "\n".join(cols)


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
