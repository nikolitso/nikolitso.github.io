# Share image for X link previews: python scripts/og/render.py scripts/og/thought-bank.html thought-bank/og.jpg (then bump ?v= in the page)
import sys, pathlib
from playwright.sync_api import sync_playwright
html, out = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"), sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1200,"height":630})
    pg.set_content(html, wait_until="networkidle"); pg.wait_for_timeout(1500)
    pg.evaluate("document.fonts.ready")
    pg.screenshot(path=out, type="jpeg", quality=88); b.close()
print("ok", out)
