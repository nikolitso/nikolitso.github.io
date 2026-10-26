"""Post one book (antonisnikolitsopoulos.com/books), one film (What Algo Missed) or one quote
(antonisnikolitsopoulos.com/Thought-Bank) to X.

Usage:  python scripts/x_daily.py auto [--dry-run]                (scheduled: post the current slot if not done)
        python scripts/x_daily.py book|film|quote --force [--dry-run]  (manual: post one now)

- New additions go first, newest first; otherwise a random pick from what this
  round hasn't posted yet. When everything has been posted, a new round starts.
- Quotes too long for one post go out as a short thread; the source and the link close it.
- Five slots a day (SLOTS, Athens time). Each slot posts once; a late run still posts the
  current slot, but missed earlier slots are skipped rather than posted in a burst.
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
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "_x" / "state.json"
BOOKS = ROOT / "_edge" / "books"
FILMS = Path(os.environ.get("WAM_DIR", ROOT.parent / "whatalgomissed")) / "content" / "films"
ATHENS = ZoneInfo("Europe/Athens")
# Five slots a day (Athens time): book and film every 6 hours, plus one quote a day
SLOTS = [(2, "book"), (8, "film"), (11, "quote"), (14, "book"), (20, "film")]
QUOTES = ROOT / "Thought-Bank" / "quotes.json"
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


def sentences(text):
    return [x.strip() for x in re.findall(r"[^.!?]+[.!?]+(?:[\"'”’)]+)?", clean(text)) if len(x.strip()) > 2]


def book_parts(body):
    """(priority, sentence) in reading order: the review's opening claim, then its 'Worth it if' line."""
    paras = [x for x in body.strip().split("\n\n") if clean(x) and "Worth it if" not in x and "Key ideas" not in x]
    opening = (sentences(paras[0]) or [""])[0] if paras else ""
    parts = [(2, opening)] if opening else []
    w = worth_it(body)
    parts.append((1, w) if w else (1, (sentences(paras[0])[1:2] or [""])[0] if paras else ""))
    return [p for p in parts if p[1]]


def film_parts(body):
    """(priority, sentence) in reading order: the setup, then the closing verdict (last two sentences)."""
    paras = [x for x in body.strip().split("\n\n") if clean(x)]
    if not paras:
        return []
    setup = (sentences(paras[0]) or [""])[0]
    last = sentences(paras[-1]) or [clean(paras[-1])]
    parts = [(3, setup)] if len(paras) > 1 or len(last) > 2 else []
    if len(last) > 1:
        parts.append((2, last[-2]))
    parts.append((1, last[-1]))
    return [p for p in parts if p[1]]


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
            hook=worth_it(body) or first_sentence(body), parts=book_parts(body),
            topic=str(m.get("topic") or ""), logline=str(m.get("logline") or ""),
            date=str(m.get("date") or ""), url=f"https://antonisnikolitsopoulos.com/books/{p.stem}/")
    return items


def films():
    items = {}
    for p in sorted(FILMS.glob("*.md")):
        m, body = front(p)
        slug = slugify(m.get("slug") or p.stem)
        items[slug] = dict(
            title=m.get("title") or slug, year=m.get("year") or "", by=m.get("director") or "",
            hook=verdict(body) or first_sentence(body), parts=film_parts(body), date=str(m.get("added") or ""),
            country=str(m.get("country") or ""), rating=float(m.get("rating") or 0),
            logline=str(m.get("logline") or ""),
            url=f"https://whatalgomissed.com/films/{slug}/")
    return items


def quotes():
    """The quotes page (Thought-Bank/quotes.json, edited in Pages CMS), keyed by quote number."""
    if not QUOTES.exists():
        return {}
    items = {}
    for i, q in enumerate(json.loads(QUOTES.read_text(encoding="utf-8")), 1):
        if not q or not q.get("text") or q.get("draft"):
            continue
        n = q.get("id") or i
        src = (q.get("author") or q.get("source") or "").strip()   # Pages CMS field is "author"
        src = re.sub(r"^(un|non[- ]?)?attributed( to)?:?\s*", "", src, flags=re.I)   # just the name, never "attributed"
        src = re.sub(r'^["“].*?["”]\s+by\s+', "", src)    # '"Article title" by Author' -> 'Author'
        items[str(n)] = dict(text=q["text"].strip(), source=src, date=str(q.get("date") or ""),
                             url=f"https://antonisnikolitsopoulos.com/Thought-Bank/?q={n}#q-{n}")   # ?q= gives X a fresh link preview
    return items


def split_text(text, limit):
    """Cut text into pieces of at most `limit` characters, at paragraph and sentence breaks where possible."""
    units = []                                            # (joiner before it, piece of text)
    for para in [x.strip() for x in text.split("\n\n") if x.strip()]:
        for j, line in enumerate(x.strip() for x in para.split("\n") if x.strip()):   # list lines stay lines
            for i, sent in enumerate(re.split(r"(?<=[.!?…])\s+", line)):
                units.append(("\n\n" if j == 0 and i == 0 else "\n" if i == 0 else " ", sent))
    pieces, cur = [], ""
    for sep, sent in units:
        while len(sent) > limit:                          # a single very long sentence: cut at a word
            cut = sent[:limit].rsplit(" ", 1)[0] or sent[:limit]
            if cur:
                pieces.append(cur); cur = ""
            pieces.append(cut); sent = sent[len(cut):].strip()
        sep = sep if cur else ""
        if len(cur) + len(sep) + len(sent) <= limit:
            cur += sep + sent
        else:
            pieces.append(cur); cur = sent
    if cur:
        pieces.append(cur)
    return pieces


def compose_quote(it):
    """One post if it fits (quote, source, link); otherwise a thread whose last post carries the source and link."""
    tail = (f"\n\n— {it['source']}" if it["source"] else "") + "\n" + it["url"]
    tail_len = len(tail) - len(it["url"]) + URL_LEN
    if len(it["text"]) + tail_len <= 280:
        return [it["text"] + tail]
    posts = split_text(it["text"], 275)
    if len(posts[-1]) + tail_len <= 280:
        posts[-1] += tail
    else:
        posts.append(tail.strip())
    return posts


TOPIC_PHRASE = {
    "Betting & markets": "betting and markets", "Football": "football", "Sports analytics": "sports analytics",
    "Thinking & decisions": "decision-making", "Personal development": "personal growth",
    "Work & leadership": "work and leadership",
}

# Several ways to say it, rotated post by post so the feed never reads like a bot.
# {hook} is built from the review's own sentences (see book_parts / film_parts).
BOOK_VOICES = [
    "My notes on {title} by {by}.\n\n{hook}",
    "{title} by {by}.\n\n{hook}",
    "A book I'd recommend on {topic}: {title} by {by}.\n\n{hook}",
    "From my reading list: {title} by {by}.\n\n{hook}",
    "If you're into {topic}, this one's for you: {title} by {by}.\n\n{hook}",
]
FILM_VOICES = [
    "{title} ({year}), {by}.\n\n{hook}",
    "One for the watchlist: {title} ({year}) by {by}, from {country}.\n\n{hook}",
    "A film the algorithm probably never showed you: {title} ({year}) by {by}.\n\n{hook}",
    "My notes on {title} ({year}), {country}. {stars}\n\n{hook}",
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
    if it.get("logline"):  # the hand-written one-line pitch, then the link
        line = it["logline"]
        room = 280 - URL_LEN - 1
        return (line if len(line) <= room else shorten(line, room)) + "\n" + it["url"]
    voices = BOOK_VOICES if kind == "book" else FILM_VOICES
    tpl = voices[variant % len(voices)]
    if not it.get("by"):
        tpl = tpl.replace(" by {by}", "").replace(", {by}", "")
    fields = dict(it, topic=TOPIC_PHRASE.get(it.get("topic", ""), "this"), stars=stars(it.get("rating", 0)))
    hook = fields.pop("hook")
    parts = fields.pop("parts", None) or [(1, hook)]
    shell = tpl.replace("{hook}", "\x00").format(**fields)
    room = 280 - URL_LEN - 1 - (len(shell) - 1)
    keep = list(parts)
    while len(keep) > 1 and len(" ".join(t for _, t in keep)) > room:
        keep.remove(max(keep, key=lambda p: p[0]))      # drop the least important sentence
    hook = " ".join(t for _, t in keep)
    if len(hook) > room:
        hook = shorten(hook, room)
    return shell.replace("\x00", hook) + "\n" + it["url"]


# ---------------------------------------------------------------- X API (OAuth 1.0a, user context)
def post_to_x(text, reply_to=None):
    key, sec = os.environ["X_API_KEY"], os.environ["X_API_KEY_SECRET"]
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
    body = {"text": text}
    if reply_to:
        body["reply"] = {"in_reply_to_tweet_id": reply_to}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": header, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())["data"]["id"]
    except urllib.error.HTTPError as e:
        sys.exit(f"X rejected the post ({e.code}): {e.read().decode(errors='replace')[:400]}")


# ---------------------------------------------------------------- scheduling
def pick_and_post(state, kind, dry, slot_key):
    catalogue = {"book": books, "film": films, "quote": quotes}[kind]()
    if not catalogue:
        sys.exit(f"No {kind}s found")
    st = state.setdefault(kind, {})
    if "seen" not in st:  # first run: today's catalogue is the backlog, not "new"
        st.update(seen=sorted(catalogue), round=1, posted=[], log=[])

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

    posts = compose_quote(catalogue[slug]) if kind == "quote" else [compose(kind, catalogue[slug], len(st["log"]))]
    print(f"--- {kind}: {slug} (round {st['round']}, {len(st['posted'])}/{len(catalogue)} posted)\n" + "\n--- reply:\n".join(posts) + "\n---")
    if dry:
        print("dry run: nothing posted, state unchanged")
        return False
    tweet_id = post_to_x(posts[0])
    reply = tweet_id
    for extra in posts[1:]:                         # long quotes: the rest as a thread under the first post
        reply = post_to_x(extra, reply_to=reply)
    today = datetime.now(ATHENS).date().isoformat()
    st["seen"] = sorted(set(st["seen"]) | {slug})
    st["posted"].append(slug)
    st["last_day"] = today
    st["log"].append({"day": today, "slot": slot_key, "slug": slug, "id": tweet_id})
    print(f"posted: https://x.com/nikolitso/status/{tweet_id}")
    return True


def current_slot(now):
    """The latest slot that has started (Athens time), as ("YYYY-MM-DD HH", kind)."""
    for hour, kind in sorted(SLOTS, reverse=True):
        if now.hour >= hour:
            return f"{now.date().isoformat()} {hour:02d}", kind
    hour, kind = max(SLOTS)                      # before the first slot: yesterday's last one
    return f"{(now - timedelta(days=1)).date().isoformat()} {hour:02d}", kind


def main():
    args = sys.argv[1:]
    mode = next((a for a in args if a in ("auto", "book", "film", "quote")), None)
    if not mode:
        sys.exit("usage: x_daily.py auto | book|film|quote --force [--dry-run]")
    dry = "--dry-run" in args or not os.environ.get("X_API_KEY")
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    now = datetime.now(ATHENS)

    if mode == "auto":
        key, kind = current_slot(now)
        if "last_slot" not in state:  # switching from once-a-day: don't repost a kind already out today
            if (state.get(kind) or {}).get("last_day") == now.date().isoformat():
                state["last_slot"] = key
        if state.get("last_slot") == key:
            print(f"slot {key} ({kind}): already posted"); return
        if pick_and_post(state, kind, dry, key):
            state["last_slot"] = key
    else:
        if "--force" not in args:
            sys.exit("book/film/quote posts immediately; add --force to confirm (scheduled posting uses: auto)")
        if not pick_and_post(state, mode, dry, f"manual {now:%Y-%m-%d %H:%M}"):
            return

    if not dry:
        STATE.parent.mkdir(exist_ok=True)
        STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
