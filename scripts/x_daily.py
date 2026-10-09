"""Post one book (The Edge) or one film (What Algo Missed) to X.

Usage:  python scripts/x_daily.py book|film [--dry-run] [--force]

- New additions go first, newest first; otherwise a random pick from what this
  round hasn't posted yet. When everything has been posted, a new round starts.
- Posts at most once per kind per Athens calendar day, and only at or after the
  target hour, so the twice-hourly cron covers summer and winter time.
- Credentials come from env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET.
  Without them (or with --dry-run) it only prints the post.
- State lives in _x/state.json (committed by the workflow).
"""
import base64
import hashlib
import hmac
import json
import os
import random
import re
import secrets
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "_x" / "state.json"
BOOKS = ROOT / "_edge" / "books"
FILMS = Path(os.environ.get("WAM_DIR", ROOT.parent / "whatalgomissed")) / "content" / "films"
ATHENS = ZoneInfo("Europe/Athens")
TARGET_HOUR = {"book": 14, "film": 19}
URL_LEN = 23  # X counts every link as 23 characters


# ---------------------------------------------------------------- catalogue
def front(path):
    s = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    m = re.match(r"---\n(.*?)\n---\n?(.*)", s, re.S)
    meta, body = {}, (m.group(2) if m else "")
    key = None
    for line in (m.group(1) if m else "").split("\n"):
        kv = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if kv:
            key, val = kv.group(1), kv.group(2).strip().strip("\"'")
            meta[key] = val if val else []
        elif key and re.match(r"^\s*-\s+", line) and isinstance(meta.get(key), list):
            meta[key].append(re.sub(r"^\s*-\s+", "", line).strip().strip("\"'"))
    return meta, body


def first_sentence(text, limit=180):
    t = re.sub(r"<[^>]+>", " ", text)
    t = re.sub(r"[*_`#>\[\]]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    m = re.match(r"(.+?[.!?])(\s|$)", t)
    s = m.group(1) if m else t
    return s if len(s) <= limit else s[: limit - 1].rsplit(" ", 1)[0] + "…"


def clean(text):
    t = re.sub(r"<[^>]+>", " ", text)
    t = re.sub(r"[*_`#>\[\]]", "", t)
    return re.sub(r"\s+", " ", t).strip()


def worth_it(body):
    """The book review's own 'Worth it if: ...' line, as a sentence."""
    m = re.search(r"Worth it if:?\s*(?:</strong>)?\s*(.+?)(?:</p>|\n\n|$)", body, re.S)
    if not m:
        return ""
    clause = clean(m.group(1)).rstrip(".") + "."
    return "Worth it if " + clause


def verdict(body):
    """The film review's closing line; a very short closer keeps the sentence before it."""
    paras = [clean(x) for x in body.strip().split("\n\n") if clean(x)]
    if not paras:
        return ""
    sents = [x.strip() for x in re.findall(r"[^.!?]+[.!?]+", paras[-1])] or [paras[-1]]
    out = sents[-1]
    if len(out) < 45 and len(sents) > 1:
        out = sents[-2] + " " + out
    return out


def slugify(t):  # same rule as What Algo Missed's build.py
    t = str(t).lower()
    t = (t.replace("ά", "α").replace("έ", "ε").replace("ή", "η").replace("ί", "ι")
          .replace("ό", "ο").replace("ύ", "υ").replace("ώ", "ω"))
    t = re.sub(r"[^\w\s-]", "", t, flags=re.U)
    return re.sub(r"[\s_-]+", "-", t).strip("-")


def books():
    items = {}
    for p in sorted(BOOKS.glob("*.md")):
        m, body = front(p)
        if str(m.get("draft", "")).lower() == "true":
            continue
        authors = m.get("authors") or []
        authors = authors if isinstance(authors, list) else [authors]
        items[p.stem] = dict(
            title=m.get("title") or p.stem, by=", ".join(a for a in authors if a),
            hook=worth_it(body) or first_sentence(body),
            topic=str(m.get("topic") or ""),
            date=str(m.get("date") or ""), url=f"https://antonisnikolitsopoulos.com/the-edge/{p.stem}/")
    return items


def films():
    items = {}
    for p in sorted(FILMS.glob("*.md")):
        m, body = front(p)
        slug = slugify(m.get("slug") or p.stem)
        items[slug] = dict(
            title=m.get("title") or slug, year=m.get("year") or "", by=m.get("director") or "",
            hook=verdict(body) or first_sentence(body), date=str(m.get("added") or ""),
            country=str(m.get("country") or ""), rating=float(m.get("rating") or 0),
            url=f"https://whatalgomissed.com/films/{slug}/")
    return items


TOPIC_PHRASE = {
    "Betting & markets": "betting and markets", "Football": "football", "Sports analytics": "sports analytics",
    "Thinking & decisions": "decision-making", "Personal development": "personal growth",
    "Work & leadership": "work and leadership",
}

# Several ways to say it, rotated day by day so the feed never reads like a bot.
# {hook} is the reviewer's own line: "Worth it if ..." for books, the closing verdict for films.
BOOK_VOICES = [
    "Notes on {title} by {by}.\n\n{hook}",
    "{title} by {by}.\n\n{hook}\n\nMy notes:",
    "If you're into {topic}: {title} by {by}.\n\n{hook}",
    "One from my shelf: {title} by {by}.\n\n{hook}",
    "Recommended reading on {topic}: {title} by {by}.\n\n{hook}",
]
FILM_VOICES = [
    "{title} ({year}), {by}.\n\n{hook}",
    "Tonight's pick: {title} ({year}) from {country}.\n\n{hook}",
    "A film the algorithm probably never showed you: {title} ({year}) by {by}.\n\n{hook}",
    "{hook}\n\n{title} ({year}), {country}. {stars}",
    "If you haven't seen {title} ({year}) by {by} yet:\n\n{hook}",
]


def stars(r):
    return "★" * int(r) + ("½" if r - int(r) >= .5 else "")


def shorten(text, room):
    """Cut at the last natural pause (dash, semicolon, comma) that fits; else at a word, with an ellipsis."""
    for sep in (" — ", " – ", "; ", ", "):
        cut = text[:room - 1].rfind(sep)
        if cut > room * 0.45:
            return text[:cut].rstrip(" ,;—–") + "."
    return text[: max(room - 1, 0)].rsplit(" ", 1)[0] + "…"


def compose(kind, it, variant=0):
    voices = BOOK_VOICES if kind == "book" else FILM_VOICES
    tpl = voices[variant % len(voices)]
    if not it.get("by"):
        tpl = tpl.replace(" by {by}", "").replace(", {by}", "")
    fields = dict(it, topic=TOPIC_PHRASE.get(it.get("topic", ""), "this"), stars=stars(it.get("rating", 0)))
    hook = fields.pop("hook")
    shell = tpl.replace("{hook}", "\x00").format(**fields)
    room = 280 - URL_LEN - 1 - (len(shell) - 1)
    if len(hook) > room:
        hook = shorten(hook, room)
    return shell.replace("\x00", hook) + "\n" + it["url"]


# ---------------------------------------------------------------- X API (OAuth 1.0a, user context)
def post_to_x(text):
    key, sec = os.environ["X_API_KEY"], os.environ["X_API_SECRET"]
    tok, tsec = os.environ["X_ACCESS_TOKEN"], os.environ["X_ACCESS_TOKEN_SECRET"]
    url = "https://api.x.com/2/tweets"
    oauth = {
        "oauth_consumer_key": key, "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1", "oauth_timestamp": str(int(time.time())),
        "oauth_token": tok, "oauth_version": "1.0",
    }
    q = lambda s: urllib.parse.quote(str(s), safe="~")
    params = "&".join(f"{q(k)}={q(v)}" for k, v in sorted(oauth.items()))
    base = "&".join(["POST", q(url), q(params)])
    sig = base64.b64encode(hmac.new(f"{q(sec)}&{q(tsec)}".encode(), base.encode(), hashlib.sha1).digest()).decode()
    oauth["oauth_signature"] = sig
    header = "OAuth " + ", ".join(f'{q(k)}="{q(v)}"' for k, v in sorted(oauth.items()))
    req = urllib.request.Request(url, data=json.dumps({"text": text}).encode(), method="POST",
                                 headers={"Authorization": header, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())["data"]["id"]
    except urllib.error.HTTPError as e:
        sys.exit(f"X rejected the post ({e.code}): {e.read().decode(errors='replace')[:400]}")


# ---------------------------------------------------------------- scheduling
def main():
    args = sys.argv[1:]
    kind = next((a for a in args if a in ("book", "film")), None)
    if not kind:
        sys.exit("usage: x_daily.py book|film [--dry-run] [--force]")
    dry = "--dry-run" in args or not os.environ.get("X_API_KEY")
    force = "--force" in args

    catalogue = books() if kind == "book" else films()
    if not catalogue:
        sys.exit(f"No {kind}s found")
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    st = state.setdefault(kind, {})
    if "seen" not in st:  # first run: today's catalogue is the backlog, not "new"
        st.update(seen=sorted(catalogue), round=1, posted=[], log=[])

    now = datetime.now(ATHENS)
    today = now.date().isoformat()
    if not force:
        if st.get("last_day") == today:
            print(f"{kind}: already posted today"); return
        if now.hour < TARGET_HOUR[kind]:
            print(f"{kind}: too early ({now:%H:%M} Athens, target {TARGET_HOUR[kind]}:00)"); return

    new = [s for s in catalogue if s not in st["seen"]]
    if new:
        slug = max(new, key=lambda s: catalogue[s]["date"])
    else:
        left = [s for s in catalogue if s not in st["posted"]]
        if not left:
            st["round"] += 1
            st["posted"] = []
            left = list(catalogue)
        slug = random.choice(left)

    text = compose(kind, catalogue[slug], len(st["log"]))
    print(f"--- {kind}: {slug} (round {st['round']}, {len(st['posted'])}/{len(catalogue)} posted)\n{text}\n---")
    if dry:
        print("dry run: nothing posted, state unchanged"); return

    tweet_id = post_to_x(text)
    st["seen"] = sorted(set(st["seen"]) | {slug})
    st["posted"].append(slug)
    st["last_day"] = today
    st["log"].append({"day": today, "slug": slug, "id": tweet_id})
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"posted: https://x.com/nikolitso/status/{tweet_id}")


if __name__ == "__main__":
    main()
