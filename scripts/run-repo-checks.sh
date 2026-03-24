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

run_step "satsuma-cli tests" npm --prefix tooling/satsuma-cli test

run_step "vscode-satsuma validate" npm --prefix tooling/vscode-satsuma run validate
run_step "vscode-satsuma tests" npm --prefix tooling/vscode-satsuma test
run_step "vscode-satsuma LSP tests" npm --prefix tooling/vscode-satsuma run test:lsp

run_step "tree-sitter generate" npm --prefix tooling/tree-sitter-satsuma run generate
if cc -x c -o /dev/null - <<< 'int main(){return 0;}' 2>/dev/null; then
  run_step "tree-sitter corpus" bash -lc 'cd "$1/tooling/tree-sitter-satsuma" && "$1/scripts/tree-sitter-local.sh" test' -- "$ROOT_DIR"
else
  run_step "tree-sitter corpus (wasm)" bash -lc 'cd "$1/tooling/tree-sitter-satsuma" && "$1/scripts/tree-sitter-local.sh" test --wasm' -- "$ROOT_DIR"
fi
run_step "tree-sitter fixtures" python3 "$ROOT_DIR/tooling/tree-sitter-satsuma/scripts/test_fixtures.py"
run_step "tree-sitter CST tests" python3 "$ROOT_DIR/tooling/tree-sitter-satsuma/scripts/test_cst_summary.py"
run_step "tree-sitter smoke" python3 "$ROOT_DIR/tooling/tree-sitter-satsuma/scripts/test_smoke_summary.py"
