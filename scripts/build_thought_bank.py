"""Thought Bank: writes the quotes into thought-bank/index.html as plain HTML, so the page reads without its script.

    python scripts/build_thought_bank.py

quotes.js draws the page from quotes.json and replaces this copy on load; the copy is what a reader or a crawler
without JavaScript sees. Run by the Site · Thought Bank workflow whenever quotes.json changes."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "thought-bank" / "index.html"
START, END = "<!-- static:start -->", "<!-- static:end -->"
E = html.escape


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def chapters():
    """The seven folders and their one-line summaries, in order: read from quotes.js, where they are kept."""
    js = (ROOT / "thought-bank" / "quotes.js").read_text(encoding="utf-8")
    block = js[js.index("var CHAPTERS = ["):js.index("];", js.index("var CHAPTERS = ["))]
    return re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', block)


def quote(q):
    paras = "".join(f"<p>{E(p.strip())}</p>" for p in re.split(r"\n\s*\n", str(q["text"]).strip()) if p.strip())
    by = ", ".join(E(str(q[k])) for k in ("author", "title") if q.get(k))
    return f'<blockquote id="q{q["id"]}">{paras}' + (f"<footer>{by}</footer>" if by else "") + "</blockquote>"


def main():
    quotes = [q for q in json.loads((ROOT / "thought-bank" / "quotes.json").read_text(encoding="utf-8")) if q and q.get("text") and not q.get("draft")]
    quotes.sort(key=lambda q: q.get("id", 0))
    order = chapters()
    names = [c for c, _ in order] + sorted({q["category"] for q in quotes} - {c for c, _ in order})
    summary = dict(order)
    out = ""
    for c in names:
        mine = [q for q in quotes if q.get("category") == c]
        if mine:
            out += (f'<section class="q-chapter" id="{slug(c)}"><h2>{E(c)}</h2>' + (f'<p class="q-sum">{E(summary[c])}</p>' if c in summary else "")
                    + "".join(quote(q) for q in mine) + "</section>")
    page = PAGE.read_text(encoding="utf-8")
    block = START + out + END
    if START in page:
        page = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda m: block, page, count=1, flags=re.S)
    else:
        old = re.search(r'<noscript><p class="q-empty">[^<]*</p></noscript>', page)
        assert old, "the q-list placeholder was not found"
        page = page[:old.start()] + block + page[old.end():]
    PAGE.write_text(page, encoding="utf-8", newline="")
    print(f"thought bank: {len(quotes)} quotes in {sum(1 for c in names if any(q.get('category') == c for q in quotes))} folders")


if __name__ == "__main__":
    main()
