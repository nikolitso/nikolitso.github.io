"""python -m unittest test_freshness (from scripts/): the 'Updated' date moves only when the page's content changes."""
import json
import re
import unittest

import freshness as F

PAGE = ('<p class="updated">Updated <span data-fresh>1 Jan 2026</span></p><p>Content A</p>\n'
        '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Person","name":"X"},'
        '{"@type":"WebPage","name":"Home"}]}</script>')


def ld(html):
    return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1))


class Freshness(unittest.TestCase):
    def test_first_run_dates_today_on_the_page_and_in_the_data(self):
        out, e = F.stamp(PAGE, "WebPage", {}, "index.html", "2026-11-24")
        self.assertIn("<span data-fresh>24 Nov 2026</span>", out)
        page = [x for x in ld(out)["@graph"] if x["@type"] == "WebPage"][0]
        self.assertEqual(page["dateModified"], "2026-11-24")
        self.assertNotIn("dateModified", [x for x in ld(out)["@graph"] if x["@type"] == "Person"][0])
        self.assertEqual(e["date"], "2026-11-24")

    def test_unchanged_content_keeps_the_old_date(self):
        out, e = F.stamp(PAGE, "WebPage", {}, "index.html", "2026-11-24")
        again, e2 = F.stamp(out, "WebPage", {"index.html": e}, "index.html", "2026-11-30")
        self.assertEqual(e2["date"], "2026-11-24")
        self.assertEqual(again, out)

    def test_changed_content_moves_the_date(self):
        out, e = F.stamp(PAGE, "WebPage", {}, "index.html", "2026-11-24")
        _, e2 = F.stamp(out.replace("Content A", "Content B"), "WebPage", {"index.html": e}, "index.html", "2026-11-30")
        self.assertEqual(e2["date"], "2026-11-30")

    def test_a_rebuild_that_resets_the_date_is_not_a_change(self):
        out, e = F.stamp(PAGE, "WebPage", {}, "index.html", "2026-11-24")
        rebuilt = PAGE.replace("1 Jan 2026", "31 Dec 2025")          # a template's placeholder date, no dateModified
        again, e2 = F.stamp(rebuilt, "WebPage", {"index.html": e}, "index.html", "2026-11-30")
        self.assertEqual(e2["date"], "2026-11-24")
        self.assertIn("<span data-fresh>24 Nov 2026</span>", again)

    def test_line_endings_and_json_spacing_do_not_count(self):
        out, e = F.stamp(PAGE, "WebPage", {}, "index.html", "2026-11-24")
        spaced = out.replace("\n", "\r\n").replace('{"@type":"WebPage"', '{"@type": "WebPage"')
        _, e2 = F.stamp(spaced, "WebPage", {"index.html": e}, "index.html", "2026-11-30")
        self.assertEqual(e2["date"], "2026-11-24")

    def test_collection_page_at_top_level(self):
        page = ('<span data-fresh></span><script type="application/ld+json">{"@context": "https://schema.org", '
                '"@type": "CollectionPage", "name": "Books"}</script>')
        out, _ = F.stamp(page, "CollectionPage", {}, "books/index.html", "2026-11-23")
        self.assertEqual(ld(out)["dateModified"], "2026-11-23")
        self.assertIn('"@type": "CollectionPage"', out)                 # keeps the block's spaced style


if __name__ == "__main__":
    unittest.main()
