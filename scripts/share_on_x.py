"""For each newly added Edge book, open a GitHub issue (assigned to the owner, so GitHub emails it)
with a one-tap link that opens X with the post already written.

Usage (in the Action): python scripts/share_on_x.py _edge/books/new-book.md [...]
"""
import os
import subprocess
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_edge import parse  # noqa: E402

SITE = "https://antonisnikolitsopoulos.com/the-edge/"
OWNER = os.environ.get("SHARE_ASSIGNEE", "nikolitso")


def post_text(meta):
    title = str(meta.get("title") or "").strip()
    authors = meta.get("authors") or []
    if isinstance(authors, str):
        authors = [authors]
    by = f" by {', '.join(authors)}" if authors else ""
    sub = str(meta.get("subtitle") or "").strip()
    text = f"New on The Edge: {title}{by}"
    if sub:
        room = 280 - 24 - len(text) - 4          # 23 chars for the link + spacing
        if room > 20:
            sub = sub if len(sub) <= room else sub[: room - 1].rsplit(" ", 1)[0] + "…"
            text += f" — {sub}"
    return text


def main(paths):
    for p in paths:
        path = Path(p)
        if not path.exists():
            continue
        meta, _ = parse(path)
        if str(meta.get("draft", "")).lower() == "true":
            print(f"skip draft {p}")
            continue
        url = SITE + path.stem + "/"
        text = post_text(meta)
        intent = "https://x.com/intent/post?" + urllib.parse.urlencode({"text": text, "url": url})
        body = (
            f"A new book is live on The Edge: **{meta.get('title')}**\n\n"
            f"### [👉 Post it on X]({intent})\n\n"
            f"Opens X with this post ready (edit anything before posting):\n\n> {text} {url}\n\n"
            f"Page: {url}\n\n_Close this issue once posted._"
        )
        title = f"Share on X: {meta.get('title')}"
        print(title, "\n", intent)
        if os.environ.get("GITHUB_ACTIONS"):
            subprocess.run(["gh", "issue", "create", "--title", title, "--body", body, "--assignee", OWNER], check=False)


if __name__ == "__main__":
    main(sys.argv[1:])
