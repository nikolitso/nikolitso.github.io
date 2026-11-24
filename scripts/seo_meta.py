"""Fill in the social-preview tags and basic structured data that generated pages leave out.

Run by the project pipelines on the pages they publish, just before the commit:

    python scripts/seo_meta.py handball volleyball/index.html ...

For every .html file (folders are walked) it adds, only when missing and only from what the page already
says (og:title, og:description, og:image, <title>, meta description, canonical, <html lang>):

- og:site_name, og:locale, og:image:alt, og:image:width/height (for an image in this repo)
- the X card: twitter:card, twitter:site, twitter:creator, twitter:title, twitter:description,
  twitter:image, twitter:image:alt
- a schema.org WebPage tied to the homepage's Person (#person) and WebSite (#website), if the page has
  no structured data of its own
- the heading-level repairs listed in OUTLINE, for templates kept in other repos
- the full Person and WebSite records (read from the homepage) in the page's schema.org block

It never changes a tag that is there, so running it twice changes nothing. A page it cannot read is skipped.
"""
import html
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://antonisnikolitsopoulos.com"
NAME = "Antonis Nikolitsopoulos"
HANDLE = "@nikolitso"

import head_nav   # noqa: E402  (scripts/head_nav.py, next to this file)


def image_size(path):
    """(width, height) of a PNG or JPEG file, or None."""
    try:
        with open(path, "rb") as f:
            head = f.read(26)
            if head[:8] == b"\x89PNG\r\n\x1a\n":
                return struct.unpack(">II", head[16:24])
            if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
                f.seek(12)
                chunk = f.read(30)
                kind = chunk[:4]
                if kind == b"VP8X":      # extended: 24-bit width-1 and height-1
                    return 1 + int.from_bytes(chunk[12:15], "little"), 1 + int.from_bytes(chunk[15:18], "little")
                if kind == b"VP8L":      # lossless: 14-bit fields after a signature byte
                    bits = int.from_bytes(chunk[9:13], "little")
                    return 1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF)
                if kind == b"VP8 ":      # lossy: after the frame tag and start code
                    w, h = struct.unpack("<HH", chunk[14:18])
                    return w & 0x3FFF, h & 0x3FFF
                return None
            if head[:2] != b"\xff\xd8":
                return None
            f.seek(2)
            while True:
                marker = f.read(2)
                if len(marker) < 2 or marker[0] != 0xFF:
                    return None
                if marker[1] in (0xD8, 0x01) or 0xD0 <= marker[1] <= 0xD7:
                    continue
                size = struct.unpack(">H", f.read(2))[0]
                if marker[1] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">xHH", f.read(5))
                    return w, h
                f.seek(size - 2, 1)
    except (OSError, struct.error):
        return None


def meta(head, attr, key):
    m = re.search(rf'<meta\s+{attr}="{re.escape(key)}"\s+content="([^"]*)"', head)
    return m.group(1) if m else None


# Heading-level repairs for generated pages whose templates live elsewhere (the BettingSignal repo).
# Each is an exact piece of the built page and what it becomes; it applies only while the old piece is there,
# so it does nothing once the template itself is fixed (and can then be removed here).
HIDDEN = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"
OUTLINE = [
    # /basketball/: the Projections tab starts at <h3> straight under the page's <h1> (make_site.py). A visually
    # hidden <h2> gives it its level, and the page looks the same.
    ('<section id="projections" hidden>\n  <div class="tiles" id="bLeagues"></div>',
     f'<section id="projections" hidden>\n  <h2 style="{HIDDEN}">Projections</h2>\n  <div class="tiles" id="bLeagues"></div>'),
]


LD = re.compile(r'(<script type="application/ld\+json"[^>]*>)(.*?)(</script>)', re.S)
_OWNER = None


def owner():
    """[Person, WebSite]: the full records from the homepage's schema.org block, the one source for every page."""
    global _OWNER
    if _OWNER is None:
        person = {"@type": "Person", "@id": SITE + "/#person", "name": NAME, "url": SITE + "/"}
        website = {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": NAME}
        try:
            m = LD.search((ROOT / "index.html").read_text(encoding="utf-8"))
            nodes = json.loads(m.group(2).replace("<\\/", "</"))["@graph"]
            person = next(n for n in nodes if n.get("@type") == "Person" and n.get("@id") == person["@id"])
            website = next(n for n in nodes if n.get("@type") == "WebSite" and n.get("@id") == website["@id"])
        except (OSError, AttributeError, KeyError, StopIteration, ValueError):
            pass
        _OWNER = [person, website]
    return _OWNER


def with_owner(text):
    """Keep the page's schema.org data in step with the homepage: the full Person and WebSite, exactly as the
    homepage has them, in the page's first block (as one @graph). A copy of either that differs is replaced, one
    that is missing is added. Pages with no block, blocks that do not parse, and the homepage itself are left alone."""
    blocks = list(LD.finditer(text))
    if not blocks or '<link rel="canonical" href="' + SITE + '/">' in text:
        return text
    person, website = owner()
    parsed = []
    for b in blocks:
        try:
            d = json.loads(b.group(2).replace("<\\/", "</"))
        except ValueError:
            return text
        if not isinstance(d, dict):
            return text
        parsed.append(d)
    def nodes_of(d):
        return d["@graph"] if isinstance(d.get("@graph"), list) else None
    changed = False
    # replace stale copies wherever they are (top-level nodes only)
    for d in parsed:
        g = nodes_of(d)
        for i, n in enumerate(g or []):
            for ref in (person, website):
                if isinstance(n, dict) and n.get("@type") == ref["@type"] and n.get("@id") == ref["@id"] and n != ref:
                    g[i] = ref; changed = True
    # add whatever is still missing to the first block
    have = {(n.get("@type"), n.get("@id")) for d in parsed for n in (nodes_of(d) or [d]) if isinstance(n, dict)}
    first = parsed[0]
    missing = [r for r in (person, website) if (r["@type"], r["@id"]) not in have]
    if missing:
        if nodes_of(first) is None:
            ctx = first.get("@context", "https://schema.org")
            parsed[0] = first = {"@context": ctx, "@graph": [{k: v for k, v in first.items() if k != "@context"}]}
        first["@graph"].extend(missing); changed = True
    if not changed:
        return text
    out = text
    for b, d in sorted(zip(blocks, parsed), key=lambda x: -x[0].start(2)):
        out = out[:b.start(2)] + json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + out[b.end(2):]
    return out


# /wine/: the app hides the page title (<h1 id="title">) with `hidden` on the opening view, the Wine list and Estates
# (the tab says where you are), which also hides the page's only <h1> from screen readers and crawlers. This rule keeps
# a hidden title in the page, visually hidden, so the page looks the same. It goes in the page's <head> whenever it is
# missing (wine/ edits made from older copies have dropped it twice), and Site · Person sync runs on every wine/ change.
WINE_H1 = ('<style id="keep-h1">h1#title[hidden]{display:block!important;position:absolute!important;width:1px;height:1px;'
           'margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}</style>')


def fix_outline(text):
    for old, new in OUTLINE:
        if old in text and new not in text:
            text = text.replace(old, new, 1)
    if ('<link rel="canonical" href="' + SITE + '/wine/">') in text and 'id="title"' in text and 'id="keep-h1"' not in text:
        end = text.find("</head>")
        if end > 0:
            text = text[:end] + WINE_H1 + "\n" + text[end:]
    return text


def head_end(text):
    """Where to add tags: before </head>; else before <body>; else (both tags are optional in HTML)
    after the last <meta> that comes before the page's first visible element."""
    for tag in ("</head>", "<body"):
        i = text.find(tag)
        if i >= 0:
            return i
    first = re.search(r"<(header|main|nav|div|section|article|h1|svg|p)\b", text)
    stop = first.start() if first else len(text)
    metas = list(re.finditer(r"<meta\b[^>]*>", text[:stop]))
    return metas[-1].end() if metas else -1


def fix(text):
    end = head_end(text)
    if end < 0:
        return text
    head = text[:end]
    if re.search(r'<meta\s+http-equiv="refresh"', head, re.I):
        return text   # a redirect page: nothing to preview
    lead = "" if text[end - 1:end] == "\n" or text.startswith("</head>", end) or text.startswith("<body", end) else "\n"
    title = meta(head, "property", "og:title")
    if title is None:
        m = re.search(r"<title>([^<]*)</title>", head)
        title = m.group(1).strip() if m else None
    if not title:
        return text   # nothing to describe the page with
    desc = meta(head, "property", "og:description") or meta(head, "name", "description")
    image = meta(head, "property", "og:image")
    m = re.search(r'<link rel="canonical" href="([^"]+)"', head)
    url = m.group(1) if m else meta(head, "property", "og:url")
    m = re.search(r'<html[^>]*\blang="([a-zA-Z-]+)"', text[:2000])
    lang = (m.group(1) if m else "en").split("-")[0].lower()

    add = []
    def put(attr, key, value):
        if value and meta(head, attr, key) is None:
            add.append(f'<meta {attr}="{key}" content="{value}">')

    put("property", "og:site_name", NAME)
    put("property", "og:locale", "el_GR" if lang == "el" else "en_US")
    if image:
        put("property", "og:image:alt", title)
        if meta(head, "property", "og:image:width") is None and image.startswith(SITE + "/"):
            size = image_size(ROOT / image[len(SITE) + 1:].split("?")[0])
            if size:
                put("property", "og:image:width", str(size[0]))
                put("property", "og:image:height", str(size[1]))
    put("name", "twitter:card", "summary_large_image" if image else "summary")
    put("name", "twitter:site", HANDLE)
    put("name", "twitter:creator", HANDLE)
    put("name", "twitter:title", title)
    put("name", "twitter:description", desc)
    if image:
        put("name", "twitter:image", image)
        put("name", "twitter:image:alt", title)

    if "application/ld+json" not in text and url and url.startswith(SITE + "/"):
        page = {"@context": "https://schema.org", "@type": "WebPage", "@id": html.unescape(url) + "#page",
                "url": html.unescape(url), "name": html.unescape(title), "inLanguage": lang,
                "isPartOf": {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/"},
                "author": {"@type": "Person", "@id": SITE + "/#person", "name": NAME, "url": SITE + "/"}}
        if desc:
            page["description"] = html.unescape(desc)
        if image:
            page["primaryImageOfPage"] = {"@type": "ImageObject", "url": html.unescape(image)}
        add.append('<script type="application/ld+json">'
                   + json.dumps(page, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>")

    if not add:
        return text
    return text[:end] + lead + "\n".join(add) + "\n" + text[end:]


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
        try:
            text = p.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        new = head_nav.fix(with_owner(fix_outline(fix(text))), p)   # the two ways home, see head_nav.py
        if new != text:
            p.write_text(new, encoding="utf-8")
            changed += 1
    print(f"seo_meta: {changed} of {seen} pages updated")


if __name__ == "__main__":
    main(sys.argv[1:])
