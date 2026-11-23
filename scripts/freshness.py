"""Freshness signals for the homepage and the Books page (user, 24 Nov 2026; from the "Am I Visible on AI?" report).

    python scripts/freshness.py          # after the pages are built: update-projects.yml and build-edge.yml run it

Each page shows "Updated <date>" (a <span data-fresh> the page carries) and its main JSON-LD object gets the same date
as dateModified. The date moves only when the page's content changes, never on a rebuild that changes nothing:
a fingerprint of the content (with the date itself left out) is kept in assets/freshness.json with the date it was
first seen. Faked freshness works against a page, so a run that changes nothing leaves the date alone.
"""
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "assets" / "freshness.json"
PAGES = {"index.html": "WebPage", "books/index.html": "CollectionPage"}    # page -> the JSON-LD type that gets dateModified
SPAN = re.compile(r"(<span data-fresh>)(.*?)(</span>)")
LD = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)


def _canonical(m):
    """a JSON-LD block in one fixed form without dateModified, so re-writing it never looks like a content change"""
    try:
        data = json.loads(m.group(2))
    except ValueError:
        return m.group(0)
    def drop(x):
        if isinstance(x, dict):
            return {k: drop(v) for k, v in x.items() if k != "dateModified"}
        return [drop(v) for v in x] if isinstance(x, list) else x
    return m.group(1) + json.dumps(drop(data), sort_keys=True, separators=(",", ":"), ensure_ascii=False) + m.group(3)


def fingerprint(html):
    """the page's content with the date (visible and in the data) taken out; line endings ignored (Windows checkouts)"""
    return hashlib.sha256(LD.sub(_canonical, SPAN.sub(r"\1\3", html.replace("\r\n", "\n"))).encode("utf-8")).hexdigest()[:16]


def shown(day):
    d = datetime.fromisoformat(day)
    return f"{d.day} {d:%b %Y}"


def set_modified(html, ld_type, day):
    """dateModified on the JSON-LD object of ld_type (top level or in an @graph), keeping the block's own spacing"""
    def fix(m):
        try:
            data = json.loads(m.group(2))
        except ValueError:
            return m.group(0)
        items = data.get("@graph", [data]) if isinstance(data, dict) else data
        hit = False
        for x in items if isinstance(items, list) else [items]:
            if isinstance(x, dict) and x.get("@type") == ld_type:
                x["dateModified"] = day
                hit = True
        if not hit:
            return m.group(0)
        compact = '":"' in m.group(2) or '","' in m.group(2)
        body = json.dumps(data, ensure_ascii=False, separators=(",", ":") if compact else (", ", ": "))
        return m.group(1) + body + m.group(3)
    return LD.sub(fix, html)


def stamp(html, ld_type, state, key, today):
    """-> (new html, state entry): the date moves to today only if the content's fingerprint changed"""
    fp = fingerprint(html)
    entry = state.get(key) or {}
    if entry.get("fp") != fp:
        entry = {"fp": fp, "date": today}
    day = entry["date"]
    out = SPAN.sub(lambda m: m.group(1) + shown(day) + m.group(3), html)
    return set_modified(out, ld_type, day), entry


def main():
    today = datetime.now(ZoneInfo("Europe/Athens")).strftime("%Y-%m-%d")
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    for rel, ld_type in PAGES.items():
        p = ROOT / rel
        if not p.exists():
            continue
        html = p.read_text(encoding="utf-8")
        if not SPAN.search(html):
            print(f"{rel}: no <span data-fresh>, left as is")
            continue
        out, state[rel] = stamp(html, ld_type, state, rel, today)
        if out != html:
            p.write_text(out, encoding="utf-8", newline="\n")
        print(f"{rel}: updated {state[rel]['date']}")
    STATE.write_text(json.dumps(state, indent=1, sort_keys=True) + "\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    sys.exit(main())
