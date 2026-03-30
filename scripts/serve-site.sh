#!/usr/bin/env bash
# serve-site.sh — prep and serve the Satsuma site locally
#
# Mirrors what the deploy workflow does before handing off to Eleventy:
#   1. Copy satsuma-diaries/ into site/
#   2. Generate site/_data/diaries.json (sidebar manifest)
#   3. Generate site/satsuma-diaries/content/{date}.json (per-entry fetch targets)
#   4. Start the Eleventy dev server

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/site"
DIARIES_SRC="$REPO_ROOT/satsuma-diaries"
DIARIES_DEST="$SITE_DIR/satsuma-diaries"

echo "==> Copying diary entries into site/"
mkdir -p "$DIARIES_DEST"
cp -rf "$DIARIES_SRC/." "$DIARIES_DEST/"

echo "==> Generating manifest and per-entry content JSON"
python3 - <<PYEOF
import os, json

entries = []
content_dir = "$DIARIES_DEST/content"
os.makedirs(content_dir, exist_ok=True)

for root, dirs, files in os.walk("$DIARIES_DEST"):
    if "content" in root:
        continue
    dirs.sort()
    for f in sorted(files):
        if not f.endswith(".md"):
            continue
        date = f[:-3]
        with open(os.path.join(root, f), encoding="utf-8") as fp:
            markdown = fp.read()

        title = date
        for line in markdown.splitlines():
            if line.startswith("## "):
                title = line[3:].strip()
                break

        with open(os.path.join(content_dir, f"{date}.json"), "w", encoding="utf-8") as fp:
            json.dump({"date": date, "title": title, "markdown": markdown}, fp)

        entries.append({
            "date": date,
            "title": title,
            "contentPath": f"satsuma-diaries/content/{date}.json",
        })

entries.sort(key=lambda x: x["date"], reverse=True)

with open("$SITE_DIR/_data/diaries.json", "w", encoding="utf-8") as f:
    json.dump(entries, f, indent=2)

print(f"  {len(entries)} entries written")
PYEOF

echo "==> Starting Eleventy dev server — http://localhost:8080"
cd "$SITE_DIR" && npm run serve
