"""Write wine/songs.json: the video IDs of the "Music for the table" YouTube playlist, for the music bar on /wine/.

Runs daily from .github/workflows/update-songs.yml. Needs a YouTube Data API v3 key in the YT_API_KEY secret;
without it the script leaves songs.json as it is. Private and deleted videos are left out.
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

PLAYLIST = "PLnVf7Ah71lsLs-PHZdQdkZtNUAXMhDXKt"
OUT = Path(__file__).resolve().parent.parent / "wine" / "songs.json"

key = os.environ.get("YT_API_KEY", "").strip()
if not key:
    print("YT_API_KEY is not set; songs.json left unchanged")
    sys.exit(0)

ids, token = [], ""
while True:
    q = {"part": "snippet,status", "playlistId": PLAYLIST, "maxResults": 50, "key": key}
    if token:
        q["pageToken"] = token
    url = "https://www.googleapis.com/youtube/v3/playlistItems?" + urllib.parse.urlencode(q)
    with urllib.request.urlopen(url, timeout=30) as r:
        data = json.load(r)
    for item in data.get("items", []):
        vid = item["snippet"].get("resourceId", {}).get("videoId")
        if vid and item.get("status", {}).get("privacyStatus") in ("public", "unlisted") and vid not in ids:
            ids.append(vid)
    token = data.get("nextPageToken")
    if not token:
        break

if not ids:
    print("playlist came back empty; songs.json left unchanged")
    sys.exit(0)

old = json.loads(OUT.read_text(encoding="utf-8"))["ids"] if OUT.exists() else []
if ids == old:
    print(f"no change ({len(ids)} songs)")
    sys.exit(0)
OUT.write_text(json.dumps({"playlist": PLAYLIST, "ids": ids}, indent=1) + "\n", encoding="utf-8")
print(f"songs.json: {len(ids)} songs (was {len(old)})")
