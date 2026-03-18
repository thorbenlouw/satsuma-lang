#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local label="$1"
  shift
  printf '\n[%s]\n' "$label"
  "$@"
}

cd "$ROOT_DIR"

run_step "repo lint" npm run lint

run_step "stm-cli tests" npm --prefix tooling/stm-cli test

run_step "vscode-stm validate" npm --prefix tooling/vscode-stm run validate
run_step "vscode-stm tests" npm --prefix tooling/vscode-stm test

run_step "tree-sitter generate" npm --prefix tooling/tree-sitter-stm run generate
run_step "tree-sitter corpus" bash -lc 'cd "$1/tooling/tree-sitter-stm" && "$1/scripts/tree-sitter-local.sh" test' -- "$ROOT_DIR"
run_step "tree-sitter fixtures" python3 "$ROOT_DIR/tooling/tree-sitter-stm/scripts/test_fixtures.py"
run_step "tree-sitter CST tests" python3 "$ROOT_DIR/tooling/tree-sitter-stm/scripts/test_cst_summary.py"
run_step "tree-sitter smoke" python3 "$ROOT_DIR/tooling/tree-sitter-stm/scripts/test_smoke_summary.py"
