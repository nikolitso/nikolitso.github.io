"""Build The Edge (antonisnikolitsopoulos.com/the-edge/) from _edge/books/*.md

Run locally:  python scripts/build_edge.py
A GitHub Action runs it on every change to _edge/ and commits the result.
Covers: downloaded once into the-edge/covers/ (on GitHub's runner); falls back to the remote URL.
"""
import html
import json
import os
import re
import shutil
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_edge" / "books"
OUT = ROOT / "the-edge"
COVERS = OUT / "covers"
SITE = "https://antonisnikolitsopoulos.com"
BASE = "/the-edge/"
CF_BEACON = "b67bbb76d0e24af196b24ded3ab71ad0"  # Cloudflare Web Analytics (cookieless)

TOPICS = [  # order shown on the site
    ("football", "Football", "#2f7d4f"),
    ("betting", "Betting & markets", "#b5562a"),
    ("sports-analytics", "Sports analytics", "#2b6cb0"),
    ("thinking", "Thinking & decisions", "#6b4fbb"),
    ("personal-development", "Personal development", "#b0476b"),
    ("work", "Work & leadership", "#3d6bff"),
]
TOPIC_BY_NAME = {n.lower(): (s, n, c) for s, n, c in TOPICS}

esc = lambda s: html.escape(str(s or ""), quote=True)


# ---------------------------------------------------------------- parsing
def parse(path):
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    meta, body = {}, text
    m = re.match(r"---\n(.*?)\n---\n?(.*)", text, re.S)
    if m:
        body = m.group(2)
        key = None
        for line in m.group(1).split("\n"):
            if re.match(r"^\s+-\s*", line) and key:
                meta.setdefault(key, [])
                if not isinstance(meta[key], list):
                    meta[key] = [meta[key]] if meta[key] else []
                meta[key].append(unq(re.sub(r"^\s+-\s*", "", line)))
            elif ":" in line and not line.startswith(" "):
                key, val = line.split(":", 1)
                key = key.strip()
                val = val.strip()
                meta[key] = unq(val) if val else []
    return meta, body.strip()


def unq(v):
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    return v


def md_inline(s):
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*(?!\*)(.+?)\*", r"<em>\1</em>", s)
    s = re.sub(r"\[(.+?)\]\((https?://[^)\s]+)\)", r'<a href="\2">\1</a>', s)
    return s


def to_html(body):
    """Body may be HTML (imported / CMS rich-text) or markdown."""
    if re.search(r"<(p|ul|ol|h\d)\b", body):
        return body
    out, para, items = [], [], []

    def flush():
        if para:
            out.append("<p>" + md_inline(" ".join(para)) + "</p>")
            para.clear()
        if items:
            out.append("<ul>" + "".join(f"<li>{md_inline(i)}</li>" for i in items) + "</ul>")
            items.clear()

    for line in body.split("\n"):
        s = line.strip()
        if not s:
            flush()
        elif re.match(r"^[-*]\s+", s):
            if para:
                flush()
            items.append(re.sub(r"^[-*]\s+", "", s))
        elif s.startswith("#"):
            flush()
            out.append(f"<h3>{md_inline(s.lstrip('#').strip())}</h3>")
        else:
            if items:
                flush()
            para.append(s)
    flush()
    return "\n".join(out)


def enrich(h):
    """Style the 'Key ideas' list and the 'Worth it if' verdict."""
    h = re.sub(r"<p>\s*<strong>\s*Key ideas:?\s*</strong>\s*</p>\s*(<ul>.*?</ul>)",
               r'<section class="key-ideas"><h2>Key ideas</h2>\1</section>', h, flags=re.S)
    h = re.sub(r"<p>\s*<strong>\s*Worth it if:?\s*</strong>\s*(.*?)</p>",
               r'<aside class="worth"><span>Worth it if</span><p>\1</p></aside>', h, flags=re.S)
    return h


def plain(h, n=None):
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()
    if n and len(t) > n:
        t = t[:n].rsplit(" ", 1)[0] + "…"
    return t


# ---------------------------------------------------------------- covers
_fail = {"n": 0}


def cover_for(slug, url):
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        if (COVERS / f"{slug}{ext}").exists():
            return f"{BASE}covers/{slug}{ext}"
    if not url or url.startswith("/"):
        return url or ""
    if _fail["n"] < 6:
        ext = os.path.splitext(url.split("?")[0])[1].lower()
        ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"
        # direct first; then via a public image proxy, as Substack's hosts can refuse GitHub's servers
        sources = [url, "https://images.weserv.nl/?url=" + urllib.parse.quote(url.split("://", 1)[-1], safe="")]
        for src in sources:
            try:
                req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0 (the-edge build)"})
                with urllib.request.urlopen(req, timeout=25) as r:
                    data = r.read()
                if len(data) > 1500 and data[:4] != b"<!DO" and data[:5] != b"<html":
                    COVERS.mkdir(parents=True, exist_ok=True)
                    (COVERS / f"{slug}{ext}").write_bytes(data)
                    return f"{BASE}covers/{slug}{ext}"
            except Exception:
                pass
        _fail["n"] += 1
    return url


# ---------------------------------------------------------------- load
def load():
    books = []
    for p in sorted(SRC.glob("*.md")):
        meta, body = parse(p)
        if str(meta.get("draft", "")).lower() == "true":
            continue
        slug = p.stem
        authors = meta.get("authors") or []
        if isinstance(authors, str):
            authors = [a.strip() for a in re.split(r",|&", authors) if a.strip()]
        tname = str(meta.get("topic") or "Personal development")
        tslug, tname, tcol = TOPIC_BY_NAME.get(tname.lower(), ("other", tname, "#5d6474"))
        date = str(meta.get("date") or f"{meta.get('year', '2000')}-01-01")[:10]
        body_html = enrich(to_html(body))
        books.append(dict(
            slug=slug, title=str(meta.get("title") or slug), subtitle=str(meta.get("subtitle") or ""),
            authors=authors, year=str(meta.get("year") or date[:4]), date=date,
            topic=tname, tslug=tslug, tcol=tcol,
            cover=cover_for(slug, str(meta.get("cover") or "")),
            body=body_html, excerpt=plain(body_html, 220), url=f"{BASE}{slug}/",
        ))
    books.sort(key=lambda b: (b["date"], b["title"]), reverse=True)
    return books


# ---------------------------------------------------------------- layout
ICONS = """<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></symbol>
  <symbol id="i-in" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></symbol>
  <symbol id="i-lb" viewBox="0 0 24 24"><circle cx="4.6" cy="12" r="4.1"/><circle cx="12" cy="12" r="4.1" opacity=".75"/><circle cx="19.4" cy="12" r="4.1" opacity=".5"/></symbol>
</svg>"""


def layout(title, body, path, desc, image=None, active="books"):
    full = f"{title} — The Edge" if title != "The Edge" else "The Edge — Book takeaways by Antonis Nikolitsopoulos"
    img = image if (image or "").startswith("http") else SITE + (image or "/og.png")
    nav = lambda key, href, label: f'<a href="{href}"{" class=on" if active == key else ""}>{label}</a>'
    return f"""<!doctype html>
<html lang="en">
<head>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{{"token": "{CF_BEACON}"}}'></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(full)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:title" content="{esc(full)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:type" content="website">
<meta property="og:image" content="{esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@nikolitso">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="The Edge" href="{SITE}{BASE}feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:ital,wght@0,300..700;1,400&display=swap">
<link rel="stylesheet" href="{BASE}edge.css?v={CSS_V}">
</head>
<body>
{ICONS}
<header class="site-head">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="Antonis Nikolitsopoulos, home">
      <span class="mono">A<i>N</i></span>
      <span class="wordmark"><span>Antonis <em>Nikolitsopoulos</em></span><small>Trading · Sports Analytics · Books · Films</small></span>
    </a>
    <nav class="menu" aria-label="The Edge">
      {nav("books", BASE, "The Edge")}
      {nav("authors", BASE + "authors/", "Authors")}
    </nav>
    <ul class="social" aria-label="Social links">
      <li><a href="https://www.linkedin.com/in/antonis-nikolitsopoulos/" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn"><svg><use href="#i-in"/></svg></a></li>
      <li><a href="https://x.com/nikolitso" target="_blank" rel="noopener" aria-label="X (Twitter)" title="X"><svg><use href="#i-x"/></svg></a></li>
      <li><a href="https://letterboxd.com/nikolitso/" target="_blank" rel="noopener" aria-label="Letterboxd" title="Letterboxd"><svg><use href="#i-lb"/></svg></a></li>
    </ul>
  </div>
</header>
<main>
{body}
</main>
<footer class="site-foot">
  <div class="wrap foot-in">
    <nav class="foot-menu" aria-label="Footer"><a href="/">Home</a><a href="{BASE}">The Edge</a><a href="{BASE}authors/">Authors</a><a href="{BASE}feed.xml">RSS</a></nav>
    <span class="copy">© {datetime.now().year} Antonis Nikolitsopoulos</span>
  </div>
</footer>
</body>
</html>
"""


def cover_img(b, cls="", eager=False):
    if not b["cover"]:
        return f'<div class="cover-ph {cls}"><span>{esc(b["title"])}</span></div>'
    return (f'<img class="{cls}" src="{esc(b["cover"])}" alt="{esc(b["title"])} cover" '
            f'{"" if eager else "loading=lazy "}decoding="async" width="326" height="500">')


def card(b):
    authors = ", ".join(b["authors"])
    key = f'{b["title"]} {b.get("subtitle","")} {authors}'.lower()
    return f"""<a class="book" href="{b['url']}" data-topic="{b['tslug']}" data-key="{esc(key)}" data-date="{b['date']}" data-title="{esc(b['title'].lower())}">
  <div class="book-cover">{cover_img(b)}</div>
  <div class="book-meta">
    <span class="book-topic" style="--t:{b['tcol']}">{esc(b['topic'])}</span>
    <h3>{esc(b['title'])}</h3>
    <p>{esc(authors)}</p>
  </div>
</a>"""


# ---------------------------------------------------------------- pages
def page_index(books, n_authors):
    counts = defaultdict(int)
    for b in books:
        counts[b["tslug"]] += 1
    chips = f'<button class="chip on" data-t="">All <b>{len(books)}</b></button>' + "".join(
        f'<button class="chip" data-t="{s}" style="--t:{c}">{esc(n)} <b>{counts[s]}</b></button>'
        for s, n, c in TOPICS if counts[s])
    body = f"""<section class="hero">
  <div class="wrap">
    <p class="kicker">Book takeaways</p>
    <h1>The <em>Edge</em></h1>
    <p class="lede">Every good book leaves a few ideas worth keeping. These are the ones worth keeping from books on sports analytics, betting, decision-making and personal development: what each book argues, the key ideas, and who it is for.</p>
    <div class="stats"><span><b>{len(books)}</b> books</span><span><b>{n_authors}</b> authors</span><span><b>{len([1 for s,_,_ in TOPICS if counts[s]])}</b> topics</span></div>
  </div>
</section>
<section class="shelf">
  <div class="wrap">
    <div class="controls">
      <div class="chips" role="tablist">{chips}</div>
      <div class="tools">
        <input id="q" type="search" placeholder="Search title or author…" aria-label="Search books">
        <select id="sort" aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="az">A–Z</option></select>
      </div>
    </div>
    <p class="count" id="count"></p>
    <div class="books" id="books">
{chr(10).join(card(b) for b in books)}
    </div>
    <p class="empty" id="empty" hidden>No books match that search.</p>
  </div>
</section>
<script>
(function(){{
  var grid=document.getElementById('books'),cards=[].slice.call(grid.children),q=document.getElementById('q'),
      sort=document.getElementById('sort'),chips=[].slice.call(document.querySelectorAll('.chip')),
      count=document.getElementById('count'),empty=document.getElementById('empty'),topic='';
  function apply(){{
    var s=q.value.trim().toLowerCase(),n=0;
    cards.forEach(function(c){{var ok=(!topic||c.dataset.topic===topic)&&(!s||c.dataset.key.indexOf(s)>-1);c.hidden=!ok;if(ok)n++;}});
    count.textContent=n+(n===1?' book':' books');empty.hidden=n>0;
    chips.forEach(function(c){{c.classList.toggle('on',c.dataset.t===topic);}});
  }}
  function order(){{
    var v=sort.value;cards.sort(function(a,b){{
      if(v==='az')return a.dataset.title.localeCompare(b.dataset.title);
      var r=a.dataset.date<b.dataset.date?-1:a.dataset.date>b.dataset.date?1:0;return v==='old'?r:-r;}});
    cards.forEach(function(c){{grid.appendChild(c);}});
  }}
  chips.forEach(function(c){{c.addEventListener('click',function(){{topic=c.dataset.t;history.replaceState(null,'',topic?'#'+topic:location.pathname);apply();}});}});
  q.addEventListener('input',apply);sort.addEventListener('change',function(){{order();apply();}});
  var h=location.hash.slice(1);if(h&&chips.some(function(c){{return c.dataset.t===h;}}))topic=h;
  apply();
}})();
</script>"""
    write(BASE, layout("The Edge", body, BASE,
                       f"Practical takeaways from {len(books)} books on sports analytics, betting, decision-making and personal development, by Antonis Nikolitsopoulos."))


def page_book(b, books, by_date):
    i = by_date.index(b)
    newer = by_date[i - 1] if i > 0 else None
    older = by_date[i + 1] if i + 1 < len(by_date) else None
    same = [x for x in books if x["tslug"] == b["tslug"] and x is not b]
    same.sort(key=lambda x: abs(int(x["year"] or 0) - int(b["year"] or 0)))
    related = same[:4]
    authors_html = ", ".join(f'<a href="{BASE}authors/#{slug(a)}">{esc(a)}</a>' for a in b["authors"])
    pn = "".join([
        f'<a class="pn prev" href="{older["url"]}"><small>← Previous</small><span>{esc(older["title"])}</span></a>' if older else "<span></span>",
        f'<a class="pn next" href="{newer["url"]}"><small>Next →</small><span>{esc(newer["title"])}</span></a>' if newer else "<span></span>",
    ])
    rel = ""
    if related:
        rel = f"""<section class="related">
  <div class="wrap">
    <div class="rel-head"><h2>More in {esc(b['topic'])}</h2><a href="{BASE}#{b['tslug']}">See all →</a></div>
    <div class="books books-4">{''.join(card(x) for x in related)}</div>
  </div>
</section>"""
    body = f"""<article>
  <section class="book-hero">
    <div class="wrap book-hero-in">
      <div class="book-hero-cover">{cover_img(b, eager=True)}</div>
      <div class="book-hero-text">
        <nav class="crumbs"><a href="{BASE}">The Edge</a><span>/</span><a href="{BASE}#{b['tslug']}" style="--t:{b['tcol']}">{esc(b['topic'])}</a></nav>
        <h1>{esc(b['title'])}</h1>
        {f'<p class="sub">{esc(b["subtitle"])}</p>' if b["subtitle"] else ''}
        <p class="by">{('by ' + authors_html) if authors_html else ''}{' · ' if authors_html and b['year'] else ''}{esc(b['year'])}</p>
        <a class="share-x" data-owner hidden href="{esc(share_x(b))}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-x"/></svg>Share on X</a><script>(function(){{try{{var k='owner';if(location.hash==='#me')localStorage.setItem(k,'1');if(location.hash==='#notme')localStorage.removeItem(k);if(localStorage.getItem(k)==='1')document.querySelectorAll('[data-owner]').forEach(function(e){{e.hidden=false}});}}catch(e){{}}}})();</script>
      </div>
    </div>
  </section>
  <section class="read">
    <div class="wrap read-in prose">
{b['body']}
    </div>
    <div class="wrap pns">{pn}</div>
  </section>
</article>
{rel}"""
    write(b["url"], layout(b["title"], body, b["url"], b["subtitle"] or b["excerpt"], b["cover"]))


def share_x(b):
    import urllib.parse
    by = f" by {', '.join(b['authors'])}" if b["authors"] else ""
    text = f"{b['title']}{by}" + (f" — {b['subtitle']}" if b["subtitle"] and len(b["subtitle"]) < 150 else "")
    return "https://x.com/intent/post?" + urllib.parse.urlencode({"text": text, "url": SITE + b["url"], "via": "nikolitso"})


def slug(s):
    s = html.unescape(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def surname(a):
    if a.startswith("The "):          # organisations: "The School of Life" -> S
        return a[4:].lower()
    parts = a.split()
    return (parts[-1] if parts else a).lower()


def page_authors(books):
    by = defaultdict(list)
    for b in books:
        for a in b["authors"]:
            by[a].append(b)
    names = sorted(by, key=lambda a: (surname(a), a.lower()))
    letters = sorted({surname(a)[0].upper() for a in names})
    rows = []
    for a in names:
        bl = sorted(by[a], key=lambda b: b["year"], reverse=True)
        links = "".join(f'<li><a href="{b["url"]}">{esc(b["title"])}</a><span>{esc(b["year"])}</span></li>' for b in bl)
        rows.append(f'<div class="author" id="{slug(a)}" data-l="{surname(a)[0].upper()}"><h3>{esc(a)}</h3><ul>{links}</ul></div>')
    jump = "".join(f'<a href="#l-{l}">{l}</a>' for l in letters)
    grouped, cur = [], None
    for a, r in zip(names, rows):
        l = surname(a)[0].upper()
        if l != cur:
            if cur is not None:
                grouped.append("</div></div>")
            grouped.append(f'<div class="letter" id="l-{l}"><h2>{l}</h2><div class="authors">')
            cur = l
        grouped.append(r)
    grouped.append("</div></div>")
    body = f"""<section class="hero hero-sm">
  <div class="wrap">
    <p class="kicker">The Edge</p>
    <h1>Authors</h1>
    <p class="lede">{len(names)} authors, from Kahneman to the people building football's data departments.</p>
  </div>
</section>
<section class="shelf">
  <div class="wrap">
    <nav class="jump">{jump}</nav>
    {''.join(grouped)}
  </div>
</section>"""
    write(BASE + "authors/", layout("Authors", body, BASE + "authors/", f"The {len(names)} authors behind the books on The Edge.", active="authors"))
    return len(names)


def feed(books):
    def rfc(d):
        try:
            y, m, dd = (int(x) for x in d.split("-"))
            return format_datetime(datetime(y, m, dd, 9, 0, tzinfo=timezone.utc))
        except Exception:
            return format_datetime(datetime.now(timezone.utc))
    items = "".join(
        f"<item><title>{esc(b['title'])}</title><link>{SITE}{b['url']}</link><guid>{SITE}{b['url']}</guid>"
        f"<pubDate>{rfc(b['date'])}</pubDate><description>{esc(b['subtitle'] or b['excerpt'])}</description></item>"
        for b in books[:20])
    (OUT / "feed.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>The Edge</title>'
        f"<link>{SITE}{BASE}</link><description>Book takeaways by Antonis Nikolitsopoulos</description>{items}</channel></rss>",
        encoding="utf-8")


def write(path, content):
    f = ROOT / path.strip("/") / "index.html"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(content, encoding="utf-8")


CSS_V = "0"


def main():
    global CSS_V
    # clean generated html (keep covers + css source)
    if OUT.exists():
        for p in OUT.iterdir():
            if p.is_dir() and p.name != "covers":
                shutil.rmtree(p)
            elif p.suffix in (".html", ".xml"):
                p.unlink()
    OUT.mkdir(parents=True, exist_ok=True)
    css = (ROOT / "scripts" / "edge.css").read_text(encoding="utf-8")
    (OUT / "edge.css").write_text(css, encoding="utf-8")
    import hashlib
    CSS_V = hashlib.md5(css.encode()).hexdigest()[:8]
    books = load()
    by_date = sorted(books, key=lambda b: (b["date"], b["title"]), reverse=True)
    n_auth = page_authors(books)
    page_index(books, n_auth)
    for b in books:
        page_book(b, books, by_date)
    feed(by_date)
    local = sum(1 for b in books if b["cover"].startswith(BASE))
    print(f"The Edge: {len(books)} books, {n_auth} authors, covers local {local}/{len(books)} -> {OUT}")


if __name__ == "__main__":
    main()
