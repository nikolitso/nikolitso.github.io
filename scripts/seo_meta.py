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


def image_size(path):
    """(width, height) of a PNG or JPEG file, or None."""
    try:
        with open(path, "rb") as f:
            head = f.read(26)
            if head[:8] == b"\x89PNG\r\n\x1a\n":
                return struct.unpack(">II", head[16:24])
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
        new = fix(text)
        if new != text:
            p.write_text(new, encoding="utf-8")
            changed += 1
    print(f"seo_meta: {changed} of {seen} pages updated")


if __name__ == "__main__":
    main(sys.argv[1:])
