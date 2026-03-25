#!/usr/bin/env bash
# bump-version.sh — bump the version across the entire repo
#
# Usage:
#   ./scripts/bump-version.sh <new-version>
#
# Example:
#   ./scripts/bump-version.sh 0.3.0
#
# The canonical version lives in the repo-root VERSION file.
# This script updates VERSION and propagates it to:
#   - tooling/satsuma-cli/package.json  (+lock)
#   - tooling/vscode-satsuma/package.json  (+lock)
#   - tooling/vscode-satsuma/server/package.json  (+lock)
#   - site/*.html  (hardcoded version badges — __VERSION__ placeholders are
#     handled at deploy time and left untouched)
#   - CHANGELOG.md  (adds a new section header)
#
# After running, review changes with `git diff` and commit.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new-version>" >&2
  echo "Example: $0 0.3.0" >&2
  exit 1
fi

NEW_VERSION="$1"

# Validate version format (semver without v prefix)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
  echo "Error: version must be semver (e.g. 0.3.0 or 1.0.0-beta.1)" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── 1. Update the canonical VERSION file ──────────────────────────────
VERSION_FILE="$REPO_ROOT/VERSION"
OLD_VERSION="$(cat "$VERSION_FILE" 2>/dev/null | tr -d '[:space:]' || echo 'unknown')"
printf '%s\n' "$NEW_VERSION" > "$VERSION_FILE"
echo "Bumping to v${NEW_VERSION} (was ${OLD_VERSION})..."
echo
echo "  VERSION: ${OLD_VERSION} → ${NEW_VERSION}"

# ── 2. Update all package.json files ──────────────────────────────────
PACKAGE_FILES=(
  "$REPO_ROOT/tooling/satsuma-cli/package.json"
  "$REPO_ROOT/tooling/vscode-satsuma/package.json"
  "$REPO_ROOT/tooling/vscode-satsuma/server/package.json"
)

for pkg in "${PACKAGE_FILES[@]}"; do
  if [ ! -f "$pkg" ]; then
    echo "  Warning: $pkg not found, skipping" >&2
    continue
  fi

  REL_PATH="${pkg#"$REPO_ROOT/"}"
  PKG_OLD=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$pkg','utf8')).version)")

  # Surgical replacement — preserves original formatting
  sed -i '' "s|\"version\": \"${PKG_OLD}\"|\"version\": \"${NEW_VERSION}\"|" "$pkg"

  echo "  ${REL_PATH}: ${PKG_OLD} → ${NEW_VERSION}"
done

# ── 3. Regenerate lock files ──────────────────────────────────────────
echo
echo "Regenerating package-lock.json files..."
for pkg in "${PACKAGE_FILES[@]}"; do
  PKG_DIR="$(dirname "$pkg")"
  REL_DIR="${PKG_DIR#"$REPO_ROOT/"}"
  if [ -f "$PKG_DIR/package-lock.json" ]; then
    (cd "$PKG_DIR" && npm install --package-lock-only --ignore-scripts 2>/dev/null)
    echo "  ${REL_DIR}/package-lock.json updated"
  fi
done

# ── 4. Replace hardcoded version strings in site HTML ─────────────────
# Only replaces literal old version occurrences (not __VERSION__ placeholders,
# which are substituted at deploy time from the git tag).
if [ "$OLD_VERSION" != "unknown" ] && [ "$OLD_VERSION" != "$NEW_VERSION" ]; then
  SITE_DIR="$REPO_ROOT/site"
  if [ -d "$SITE_DIR" ]; then
    CHANGED=0
    while IFS= read -r -d '' html; do
      if grep -qF "v${OLD_VERSION}" "$html"; then
        sed -i '' "s|v${OLD_VERSION}|v${NEW_VERSION}|g" "$html"
        REL="${html#"$REPO_ROOT/"}"
        echo "  ${REL}: v${OLD_VERSION} → v${NEW_VERSION}"
        CHANGED=$((CHANGED + 1))
      fi
    done < <(find "$SITE_DIR" -name '*.html' -print0)
    if [ "$CHANGED" -eq 0 ]; then
      echo "  (no hardcoded v${OLD_VERSION} found in site HTML)"
    fi
  fi
fi

# ── 5. Add CHANGELOG section if not already present ───────────────────
CHANGELOG="$REPO_ROOT/CHANGELOG.md"
if [ -f "$CHANGELOG" ]; then
  TODAY=$(date +%Y-%m-%d)
  HEADER="## v${NEW_VERSION} — ${TODAY}"
  if ! grep -qF "## v${NEW_VERSION}" "$CHANGELOG"; then
    node -e "
      const fs = require('fs');
      const text = fs.readFileSync('$CHANGELOG', 'utf8');
      const lines = text.split('\n');
      let insertAt = 1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# Changelog')) {
          insertAt = i + 1;
          while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt++;
          break;
        }
      }
      lines.splice(insertAt, 0, '', '${HEADER}', '', '<!-- Add release notes here -->', '');
      fs.writeFileSync('$CHANGELOG', lines.join('\n'));
    "
    echo
    echo "  CHANGELOG.md: added ${HEADER}"
  else
    echo
    echo "  CHANGELOG.md: v${NEW_VERSION} section already exists"
  fi
fi

echo
echo "Done. Review with: git diff"
echo "Then commit: git add -A && git commit -m 'chore: bump version to v${NEW_VERSION}'"
