"""Refresh the screenshots on the homepage's project cards.

Run:  python scripts/update_shots.py
The "Update project pills" GitHub Action runs it every morning, so the cards always show
the current version of each page.

Pages that live in this repo are served from the checkout (so a change shows up at once);
the PAOK hubs live in their own repos and are captured from the live site.
Needs Chrome (or Chromium) and Pillow.
"""
import hashlib
import http.server
import os
import re
import shutil
import subprocess
import tempfile
import threading
from functools import partial
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LIVE = "https://antonisnikolitsopoulos.com"
SIZE = (1200, 675)

# (card link on the homepage, image file name)
SHOTS = [
    ("/wine/", "wine"),
    ("/superleague/", "superleague"),
    ("/eurocup/", "eurocup"),
    ("/fibaeuropecup/", "fibaeuropecup"),
    ("/handball/projections/", "handball"),
    ("/basketball/", "basketball"),
    ("/paok-hub/", "paok-hub"),
    ("/paok-basketball/", "paok-basketball"),
]


def find_chrome():
    for c in (os.environ.get("CHROME"), "google-chrome", "chromium", "chromium-browser",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe"):
        if c and (shutil.which(c) or Path(c).exists()):
            return shutil.which(c) or c
    raise SystemExit("Chrome not found (set CHROME=path)")


def serve_repo():
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_address[1]}"


def capture(chrome, url, out_png, profile):
    subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
                    "--force-device-scale-factor=1", "--virtual-time-budget=10000",
                    f"--window-size={SIZE[0]},{SIZE[1]}", f"--user-data-dir={profile}",
                    f"--screenshot={out_png}", url],
                   check=False, capture_output=True, timeout=120)
    return Path(out_png).exists() and Path(out_png).stat().st_size > 5000


def main():
    chrome = find_chrome()
    local = serve_repo()
    index = ROOT / "index.html"
    html = index.read_text(encoding="utf-8")
    tmp = Path(tempfile.mkdtemp())
    for href, name in SHOTS:
        if f'<a class="card" href="{href}">' not in html:
            print(f"skip {href}: no card on the homepage")
            continue
        in_repo = (ROOT / href.strip("/") / "index.html").exists()
        url = (local if in_repo else LIVE) + href
        png = tmp / f"{name}.png"
        if not capture(chrome, url, str(png), str(tmp / "profile")):
            print(f"FAILED {href} ({url}); keeping the old image")
            continue
        jpg = ROOT / f"{name}.jpg"
        Image.open(png).convert("RGB").resize(SIZE).save(jpg, quality=85, optimize=True)
        v = hashlib.md5(jpg.read_bytes()).hexdigest()[:8]
        html, n = re.subn(
            r'(<a class="card" href="' + re.escape(href) + r'">\s*<div class="card-shot"><img src=")[^"]*(")',
            lambda m: f"{m.group(1)}{name}.jpg?v={v}{m.group(2)}", html, count=1)
        print(f"{href}: {'updated' if n else 'image saved, card not matched'} ({'repo' if in_repo else 'live'})")
    index.write_text(html, encoding="utf-8")
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
