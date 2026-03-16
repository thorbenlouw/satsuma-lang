#!/usr/bin/env bash
# test-fixtures.sh — parse every .stm file under examples/ and report results.
# Must be run from the tree-sitter-stm directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLES_DIR="$(cd "$SCRIPT_DIR/../../../examples" && pwd)"

# Return a known-gap explanation for a file, or empty string if not a known gap.
known_gap_reason() {
  case "$1" in
    db-to-db.stm) echo "tag value E.164 — digit-starting segment not supported by identifier regex" ;;
    *) echo "" ;;
  esac
}

pass=0
fail=0
known=0
errors=()

while IFS= read -r -d '' file; do
  rel="${file#$EXAMPLES_DIR/}"
  reason="$(known_gap_reason "$rel")"

  if tree-sitter parse --quiet "$file" > /dev/null 2>&1; then
    pass=$((pass + 1))
  elif [ -n "$reason" ]; then
    known=$((known + 1))
    echo "KNOWN  $rel  ($reason)"
  else
    fail=$((fail + 1))
    errors+=("$rel")
    echo "FAIL   $rel"
  fi
done < <(find "$EXAMPLES_DIR" -name "*.stm" -print0 | sort -z)

echo ""
echo "Results: $pass passed, $known known gaps, $fail unexpected failures"

if [ $fail -gt 0 ]; then
  echo ""
  echo "Unexpected failures:"
  for f in "${errors[@]}"; do
    echo "  $f"
    tree-sitter parse --quiet "$EXAMPLES_DIR/$f" 2>&1 | head -5 | sed 's/^/    /'
  done
  exit 1
fi
