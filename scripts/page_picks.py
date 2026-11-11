"""New picks on a basketball site's Picks tab, for the phone push (EuroCup, FIBA Europe Cup).

    python page_picks.py SITE_FOLDER SEEN_JSON

Opens SITE_FOLDER/index.html in headless Chromium (served from a local web server, outside requests
blocked) and runs the page's own pickList(), so the alert follows exactly the rule the page shows.
Every open pick whose game has not tipped off and is not in SEEN_JSON yet is printed on one line
`NEWPICKS <json list>` and added to SEEN_JSON (kept in BettingSignal). A pick is the game plus the
side, so it is announced once, even if it drops out and comes back as the line moves.
"""
import datetime as dt
import functools
import http.server
import json
import os
import sys
import threading
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright

site, seen_path = os.path.abspath(sys.argv[1]), sys.argv[2]
now = dt.datetime.now(ZoneInfo("Europe/Athens")).strftime("%Y-%m-%d %H:%M")

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


handler = functools.partial(Quiet, directory=site)
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

try:   # an alert problem must never stop the site update: no picks, nothing recorded
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.route("**/*", lambda r: r.continue_() if r.request.url.startswith("http://127.0.0.1") else r.abort())
        page.goto(f"http://127.0.0.1:{server.server_address[1]}/index.html", wait_until="domcontentloaded")
        page.wait_for_function("typeof pickList === 'function' && window.ARCHIVE")
        picks = page.evaluate("""() => pickList().filter(p => !p.r).map(p => ({date: p.date, time: p.time.slice(-5),
            h: p.h, a: p.a, bet: p.bet, home: p.home, pr: p.pr, logged: p.logged, gap: p.gap, market: p.market, club: p.club}))""")
        browser.close()
except Exception as e:
    print("picks not read:", e)
    print("NEWPICKS []")
    sys.exit(0)
finally:
    server.shutdown()

first = not os.path.exists(seen_path)
seen = [] if first else json.load(open(seen_path, encoding="utf-8"))
have = {(s["date"], s["h"], s["a"], s["home"]) for s in seen}
new = [p for p in picks if f"{p['date']} {p['time']}" > now and (p["date"], p["h"], p["a"], p["home"]) not in have]
seen += [dict(p, alerted=now) for p in new]
if first:   # the first run only records the picks already on the page: they were logged before alerts existed
    new = []
os.makedirs(os.path.dirname(os.path.abspath(seen_path)), exist_ok=True)
json.dump(seen, open(seen_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(picks), "open picks,", len(new), "new")
print("NEWPICKS " + json.dumps(new, ensure_ascii=False))
