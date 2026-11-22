"""The two ways home on a sports page (user, 22 Nov 2026).

- The projects menu opens with a big Home pill to the main site: <a class="an-navhome" href="/">Home</a>.
- The pill in the page header goes to the project's own home and carries its name (Volleyball → /volleyball/).
  On the project's home page itself the page title moves into that pill: <a class="an-home" href="/volleyball/"><h1>…</h1></a>.

Pages are patched in place and the patch is idempotent, so it can run after any build:

    python scripts/head_nav.py volleyball handball/index.html ...

scripts/seo_meta.py calls fix() too, so every pipeline that publishes pages applies it.
A template outside the site repo can be patched with fix(text, url="/volleyball/").
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAVHOME = '<a class="an-navhome" href="/">Home</a>'
NAV = re.compile(r'(<nav class="an-project-nav"[^>]*><div>)(.*?)(</div></nav>)', re.S)
CURRENT = re.compile(r'<a href="([^"]+)" aria-current="page">([^<]+)</a>')
OLD_PILL = re.compile(r'<a class="an-home" href="/"(?: aria-label="Back to the homepage")?>← Home</a>')
BRAND_H1 = re.compile(r'(<a class="an-brand"[^>]*>.*?)<h1>(.*?)</h1>(.*?</a>)', re.S)
TAGS = re.compile(r"<[^>]+>")


def url_of(path):
    """/volleyball/ for volleyball/index.html, /paok-hub/stats.html for paok-hub/stats.html."""
    rel = Path(path).resolve().relative_to(ROOT).as_posix()
    return "/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)


def same(a, b):
    norm = lambda s: " ".join(TAGS.sub("", s).replace("&#x27;", "'").replace("&#39;", "'").split()).lower()
    return norm(a) == norm(b)


def fix(text, path=None, url=None):
    nav = NAV.search(text)
    if not nav or '<header class="an-head">' not in text:
        return text
    if NAVHOME not in nav.group(2):
        sep = "\n" if nav.group(2).startswith("\n") else ""
        text = text[:nav.end(1)] + sep + NAVHOME + text[nav.end(1):]
        nav = NAV.search(text)
    cur = CURRENT.search(nav.group(2))
    old = OLD_PILL.search(text)
    if not cur or not old:
        return dedupe_kicker(text)
    href, label = cur.groups()
    if url is None and path is not None:
        try:
            url = url_of(path)
        except ValueError:
            url = None
    head = text.find('<header class="an-head">')
    brand = BRAND_H1.search(text, head)
    if brand and (url == href or same(brand.group(2), label)):
        pill = f'<a class="an-home" href="{href}"><h1>{brand.group(2)}</h1></a>'
        text = text[:brand.start()] + brand.group(1) + brand.group(3) + text[brand.end():]
    else:
        pill = f'<a class="an-home" href="{href}">{label}</a>'
    old = OLD_PILL.search(text)
    return dedupe_kicker(text[:old.start()] + pill + text[old.end():])


PILL = re.compile(r'<a class="an-home" href="[^"]*">(.*?)</a>', re.S)
KICKER = re.compile(r'<small class="an-kicker">([^<]*)</small>')
KICKER_JS = re.compile(r"""(\.an-kicker'\)\.textContent=)'([^']*?) · '\+""")


def words(s):
    s = TAGS.sub(" ", s).replace("&#x27;", "'").replace("&#39;", "'").replace("&amp;", "&").lower()
    return {w[:-2] if w.endswith("'s") else w for w in re.findall(r"[\w'.()&-]+", s)}


def dedupe_kicker(text):
    """Drop the parts of the small kicker line that only repeat the pill beside it (user, 22 Nov 2026):
    'Handball · Home' next to the Handball pill reads 'Home'; 'Basketball · Totals' next to 'Basketball totals' goes."""
    head = text.find('<header class="an-head">')
    pill = PILL.search(text, head) if head >= 0 else None
    if not pill:
        return text
    have = words(pill.group(1))
    dup = lambda seg: bool(words(seg)) and words(seg) <= have
    k = KICKER.search(text, pill.end())
    if k and k.start() < text.find("</header>", head):
        keep = [s for s in k.group(1).split(" · ") if not dup(s)]
        if keep != k.group(1).split(" · "):
            new = f'<small class="an-kicker">{" · ".join(keep)}</small>' if keep else ""
            text = text[:k.start()] + new + text[k.end():]
    return KICKER_JS.sub(lambda m: m.group(1) if dup(m.group(2)) else m.group(0), text)


def files(args):
    for a in args:
        p = Path(a)
        if p.is_dir():
            yield from sorted(p.rglob("*.html"))
        elif p.suffix == ".html" and p.is_file():
            yield p


def main(args):
    changed = seen = 0
    for p in files(args):
        seen += 1
        raw = p.read_bytes().decode("utf-8")
        new = fix(raw, p)
        if new != raw:
            p.write_bytes(new.encode("utf-8"))
            changed += 1
    print(f"head_nav: {changed} of {seen} pages updated")


if __name__ == "__main__":
    main(sys.argv[1:])
