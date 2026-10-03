"""One-off import: Substack export (posts.csv + posts/*.html) -> _edge/books/<slug>.md

Usage: python scripts/import_substack.py /path/to/export
"""
import csv
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_edge" / "books"

TOPICS = {
    "Football": """against-the-elements expected-goals football football-against-the-enemy football-hackers game-theory
        how-to-watch-football how-to-win-the-premier-league how-to-win-the-world-cup hunger-in-paradise hypnotised-by-numbers
        man-vs-big-data money-and-soccer net-gains smart-money soccer-analytics soccermatics soccernomics
        the-expected-goals-philosophy the-football-code the-numbers-game xgenius edge""",
    "Betting & markets": """becoming-a-winning-gambler betting-on-football beyond-the-odds changing-the-game fixed-odds-sports-betting
        interception mastering-betfair monte-carlo-or-bust smart-sports-betting sports-betting-basics sports-investing
        squares-and-sharps-suckers-and-sharks statistical-sports-models-in-excel statistical-sports-models-in-excel-d49 the-bookie
        the-definitive-guide-a-z-of-betting the-definitive-guide-to-betting-exchan the-definitive-guide-to-betting-on
        the-logic-of-sports-betting weighing-the-odds-in-sports-betting on-the-edge""",
    "Sports analytics": """basketball-beyond-paper basketball-on-paper mathletics scorecasting the-hidden-mathematics-of-sport
        how-to-watch-the-olympics the-gold-mine-effect the-greatest""",
    "Thinking & decisions": """alexs-adventures-in-numberland everything-is-predictable noise the-drunkards-walk the-signal-and-the-noise
        superforecasting the-success-equation think-twice thinking-fast-and-slow the-art-of-thinking-clearly the-real-story-of-risk
        the-scout-mindset storytelling-with-data outnumbered the-coming-wave the-anthology-of-balaji""",
    "Work & leadership": """a-job-to-love good-to-great hbr-guide-to-generative-ai how-to-find-fulfilling-work how-to-get-on-with-your-colleagues
        how-to-be-a-leader it-doesnt-have-to-be-crazy-at-work kind make-your-mark making-ideas-happen measure-what-matters remote
        the-culture-map the-emotionally-intelligent-office the-making-of-a-manager why-are-we-here unsubscribe""",
}
DEFAULT_TOPIC = "Personal development"
MISSING_AUTHORS = {"betting-on-football": ["Kevin Pullein"], "kind": ["Graham Allcott"]}


def topic_for(slug):
    for name, keys in TOPICS.items():
        for k in keys.split():
            if slug == k or slug.startswith(k + "-") or slug.startswith(k):
                return name
    return DEFAULT_TOPIC


def clean_body(t):
    t = re.sub(r'<div class="captioned-image-container">.*?</figure></div>', "", t, flags=re.S)
    t = re.sub(r'<div class="subscription-widget-wrap[^>]*>.*?</form>\s*</div>\s*</div>', "", t, flags=re.S)
    # author paragraph(s) made only of tag links
    t = re.sub(r'<p>(?:\s*<a href="https://analyticsports\.substack\.com/t/[^"]+">[^<]+</a>\s*(?:,|&amp;|and)?\s*)+</p>', "", t)
    t = re.sub(r'<a href="https://analyticsports\.substack\.com/t/[^"]+">([^<]+)</a>', r"\1", t)
    t = re.sub(r"<li><p>(.*?)</p></li>", r"<li>\1</li>", t, flags=re.S)
    t = re.sub(r"<p>\s*</p>", "", t)
    t = re.sub(r"\s+data-[\w-]+=\"[^\"]*\"", "", t)
    t = re.sub(r"(</p>|</ul>|</ol>|</blockquote>|</h\d>)", r"\1\n\n", t)
    return t.strip() + "\n"


def q(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main(export):
    export = Path(export)
    OUT.mkdir(parents=True, exist_ok=True)
    rows = list(csv.DictReader(open(export / "posts.csv", encoding="utf-8")))
    n = 0
    for r in rows:
        if r.get("is_published") != "true":
            continue
        pid = r["post_id"]
        slug = pid.split(".", 1)[1]
        raw = (export / "posts" / f"{pid}.html").read_text(encoding="utf-8")
        body0 = re.sub(r'<div class="captioned-image-container">.*?</figure></div>', "", raw, flags=re.S)
        first_p = re.match(r"\s*<p>(.*?)</p>", body0, flags=re.S)
        authors = [html.unescape(a) for a in re.findall(r'href="https://analyticsports\.substack\.com/t/[^"]+">([^<]+)</a>', first_p.group(1) if first_p else "")]
        split = []
        for a in authors:
            split += [x.strip() for x in re.split(r"\s+&\s+", a) if x.strip()]
        authors = split or MISSING_AUTHORS.get(slug, [])
        img = re.search(r'<img src="([^"]+)"', raw)
        fm = [
            "---",
            f"title: {q(html.unescape(r['title']).strip())}",
            f"subtitle: {q(html.unescape(r['subtitle']).strip())}",
            "authors:",
            *[f"  - {q(a)}" for a in authors],
            f"year: {r['post_date'][:4]}",
            f"date: {r['post_date'][:10]}",
            f"topic: {q(topic_for(slug))}",
            f"cover: {q(img.group(1) if img else '')}",
            f"substack: {q('https://analyticsports.substack.com/p/' + slug)}",
            "---",
        ]
        (OUT / f"{slug}.md").write_text("\n".join(fm) + "\n" + clean_body(raw), encoding="utf-8")
        n += 1
    print(f"imported {n} books -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
