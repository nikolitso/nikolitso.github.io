"""Platform quality check: the rules the sports pages must keep, checked on every page in the repo.

    python scripts/qc.py            # prints every problem; exit code 1 if any

Checked on the sports pages (data-site other than books, plus PAOK Hub):
  wording   no units, no 'bookie'/'bookmaker' and no second book's name in visible text or page scripts
  menu      exactly one projects menu, the canonical 11 entries in order, exactly one marked as current
  home      the '← Home' link
  type      no font size under 14px in the page's own CSS (em/rem under 1 must be max(14px, ...))
  styles    the shared stylesheet at the current version
Checked everywhere:
  links     internal links (href/src) point at a file that exists (pages built by scripts in the browser are not followed)
  sitemaps  every <loc> in robots.txt's sitemaps exists
  head      every page has a <title>, a meta description and, if it names one, an og:image that exists
Redirect pages (meta refresh) are skipped."""
import os
import re
import subprocess
import sys
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://antonisnikolitsopoulos.com"
CSS_VERSION = "5"
MENU = ["/superleague/", "/football/greek-cup/", "/basketball/", "/basketball/overs/", "/basketball/women/",
        "/volleyball/", "/handball/", "/paok-hub/", "/paok-basketball/"]
# EuroCup and FIBA Europe Cup left the menu on 22 Nov 2026; their own (paused) pages keep the menu they were built with
HIDDEN = ("eurocup/", "fibaeuropecup/")
NO_CURRENT = ("track-record/",)   # site-wide pages: no project is current
MENU_HIDDEN = ["/superleague/", "/football/greek-cup/", "/basketball/", "/basketball/overs/", "/basketball/women/",
               "/eurocup/", "/fibaeuropecup/", "/paok-hub/", "/paok-basketball/", "/volleyball/", "/handball/"]
SKIP_PREFIXES = ("scripts/", "paok-basketball/data/")
SKIP_DIRS = {".git", ".claude", ".superpowers", "_bs", "node_modules", "__pycache__"}
WORDING = [
    (re.compile(r"\b\d+(?:\.\d+)? units?\b|\bunits?, peak to low|1 unit (?:a|per) (?:pick|bet)|[A-Za-z] \(units\)|>Units<|(?-i:['\"]Units['\"])|\} units\b|units</", re.I), "units"),
    (re.compile(r"\bbookies?\b|\bbookmakers?\b", re.I), "bookmaker wording"),
    (re.compile(r"\bthe books\b|\bbooks'|\bmain book\b|(?-i:\bBooks (?:1H|v |\())", re.I), "'the books' wording (say the market)"),   # 26 Nov 2026
    (re.compile(r"\bsuperbet\b", re.I), "the second book's name"),
]
NAV = re.compile(r'<nav class="an-project-nav".*?</nav>', re.S)
FONT_PX = re.compile(r'font(?:-size)?\s*:\s*(?:(?:italic|normal|bold|[1-9]00|small-caps)\s+)*(\d+(?:\.\d+)?)px')
FONT_REL = re.compile(r'font-size\s*:\s*(0?\.\d+)r?em\b')
COMMENT = re.compile(r"/\*.*?\*/|<!--.*?-->", re.S)
JS_LINE_COMMENT = re.compile(r"(?m)^\s*//.*$|(?<=[;{}])\s*//[^\n'\"`]*$")


def pages():
    """the published pages: tracked in git, outside the scripts' own templates and the data fragments"""
    out = subprocess.run(["git", "-C", ROOT, "ls-files", "*.html"], capture_output=True, text=True, encoding="utf-8").stdout.splitlines()
    for f in out:
        if f and not f.startswith(SKIP_PREFIXES) and not any(part in SKIP_DIRS for part in f.split("/")):
            yield os.path.join(ROOT, f)


def rel(p):
    return os.path.relpath(p, ROOT).replace("\\", "/")


def exists(url_path, base):
    """url_path as written in the page; base: the page's own path"""
    u = urlparse(url_path)
    if u.scheme in ("http", "https"):
        if not url_path.startswith(SITE):
            return True
        path = u.path
    elif u.scheme or url_path.startswith(("#", "mailto:", "tel:", "data:", "javascript:")) or not url_path.strip():
        return True
    else:
        path = u.path
    if not path:
        return True
    if not path.startswith("/"):
        path = os.path.dirname("/" + rel(base)) + "/" + path
    path = os.path.normpath(unquote(path)).replace("\\", "/")
    full = os.path.join(ROOT, path.lstrip("/"))
    return os.path.isfile(full) or os.path.isfile(os.path.join(full, "index.html")) or (path in ("/", ".") )


def sports(html, path):
    m = re.search(r'<html[^>]*data-site="([^"]+)"', html)
    return (m and m.group(1) != "books") or rel(path).startswith("paok-hub/")


def check_page(path, problems):
    try:
        html = open(path, encoding="utf-8", errors="replace").read()
    except FileNotFoundError:                 # removed while the check ran (another job rewriting pages)
        return
    if 'http-equiv="refresh"' in html[:3000]:
        return
    r = rel(path)
    say = lambda kind, msg: problems.append(f"{kind:9} {r}: {msg}")
    if not re.search(r"<title>[^<]+</title>", html):
        say("head", "no <title>")
    if r != "404.html" and not re.search(r'<meta name="description" content="[^"]+', html):
        say("head", "no meta description")
    og = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    if og and not exists(og.group(1), path):
        say("head", f"og:image missing: {og.group(1)}")
    body = COMMENT.sub("", html)
    for m in re.finditer(r'(?:href|src)="([^"$`{}]+)"', body):
        if not exists(m.group(1), path):
            say("links", f"broken: {m.group(1)}")
    if not sports(html, path):
        return
    text = JS_LINE_COMMENT.sub("", body)
    for rx, what in WORDING:
        hit = rx.search(text)
        if hit:
            say("wording", f"{what}: …{' '.join(text[max(0, hit.start() - 40):hit.end() + 20].split())}…")
    navs = NAV.findall(html)
    if len(navs) != 1:
        say("menu", f"{len(navs)} projects menus")
    elif r != "404.html":
        hidden = r.replace("\\", "/").startswith(HIDDEN)
        if hidden:
            hrefs = re.findall(r'<a (?:class="an-navchip" )?href="([^"]+)"', navs[0])
            if hrefs != MENU_HIDDEN:
                say("menu", f"entries differ: {hrefs}")
        else:   # every project in one row, grouped by sport (22 Nov 2026)
            hrefs = re.findall(r'<a (?:class="an-navchip" )?href="([^"]+)"', navs[0])
            if hrefs != MENU:
                say("menu", f"entries differ: {hrefs}")
        if '<a class="an-navhome" href="/">Home</a>' not in navs[0]:
            say("menu", "no Home pill first in the menu")
        cur = re.findall(r'aria-current="page"', navs[0])
        if len(cur) != 1 and not r.replace("\\", "/").startswith(NO_CURRENT):
            say("menu", f"{len(cur)} entries marked current")
    if 'class="an-home"' not in html and r != "404.html":
        say("home", "no ← Home link")
    for m in re.finditer(r"<style[^>]*>(.*?)</style>|style=\"([^\"]*)\"", html, re.S):
        css = COMMENT.sub("", m.group(1) or m.group(2) or "")
        for f in FONT_PX.finditer(css):
            if 8 <= float(f.group(1)) < 14:
                say("type", f"{f.group(0)}")
                break
        for f in FONT_REL.finditer(css):
            if 0.5 <= float(f.group(1)) < 1:
                say("type", f"{f.group(0)} (use max(14px, …))")
                break
    for v in re.findall(r"an\.css\?v=(\d+)", html):
        if v != CSS_VERSION:
            say("styles", f"an.css?v={v}, expected v={CSS_VERSION}")


def check_sitemaps(problems):
    robots = open(os.path.join(ROOT, "robots.txt"), encoding="utf-8").read()
    for sm in re.findall(r"Sitemap:\s*(\S+)", robots):
        p = os.path.join(ROOT, urlparse(sm).path.lstrip("/"))
        if not os.path.isfile(p):
            problems.append(f"sitemaps  robots.txt names a missing sitemap: {sm}")
            continue
        for loc in re.findall(r"<loc>([^<]+)</loc>", open(p, encoding="utf-8").read()):
            if not exists(loc, os.path.join(ROOT, "index.html")):
                problems.append(f"sitemaps  {rel(p)}: missing page {loc}")


def main():
    problems = []
    n = 0
    for p in pages():
        n += 1
        check_page(p, problems)
    check_sitemaps(problems)
    for line in sorted(problems):
        print(line)
    kinds = {}
    for line in problems:
        kinds[line.split()[0]] = kinds.get(line.split()[0], 0) + 1
    print(f"\n{n} pages checked, {len(problems)} problems" + (f": {kinds}" if kinds else ""))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as fh:
            fh.write(f"### Site check\n{n} pages, {len(problems)} problems\n\n" + "".join(f"- {l}\n" for l in sorted(problems)[:200]))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
