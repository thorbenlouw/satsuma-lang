#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local label="$1"
  shift
  printf '\n[%s]\n' "$label"
  "$@"
}

# Run commands in parallel, fail if any fail.
run_parallel() {
  local label="$1"
  shift
  printf '\n[%s]\n' "$label"
  local pids=()
  for cmd in "$@"; do
    eval "$cmd" &
    pids+=($!)
  done
  local failed=0
  for pid in "${pids[@]}"; do
    wait "$pid" || failed=1
  done
  if [ "$failed" -ne 0 ]; then
    echo "FAIL: $label" >&2
    exit 1
  fi
}

cd "$ROOT_DIR"

# Verify Python lint tools are available before running any checks.
# Install with: pip install yamllint ruff
for tool in yamllint ruff; do
  if ! command -v "$tool" &>/dev/null; then
    echo "ERROR: '$tool' not found. Install it with: pip install $tool" >&2
    exit 1
  fi
done

run_step "repo lint" npm run lint

run_parallel "satsuma-core + satsuma-viz-model tests" \
  "npm --prefix tooling/satsuma-core test" \
  "npm --prefix tooling/satsuma-viz-model test"

run_step "satsuma-cli tests" npm --prefix tooling/satsuma-cli test

run_step "satsuma fmt --check examples" node tooling/satsuma-cli/dist/index.js fmt --check examples/

run_step "vscode-satsuma validate" npm --prefix tooling/vscode-satsuma run validate
run_parallel "vscode-satsuma tests + LSP" \
  "npm --prefix tooling/vscode-satsuma test" \
  "npm --prefix tooling/vscode-satsuma run test:lsp"

run_step "tree-sitter generate" npm --prefix tooling/tree-sitter-satsuma run generate
# tree-sitter test --wasm requires the CLI to be compiled with the wasm feature.
# Gracefully skip if unavailable; JS integration tests cover the corpus via the
# WASM parser already built by the previous generate step.
_wasm_test_output="$(cd "$ROOT_DIR/tooling/tree-sitter-satsuma" && tree-sitter test --wasm 2>&1)" || _wasm_test_exit=$?
if echo "$_wasm_test_output" | grep -q "does not include the wasm feature"; then
  printf '[tree-sitter corpus] SKIP — tree-sitter-cli built without wasm feature (JS tests cover corpus)\n'
elif [ "${_wasm_test_exit:-0}" -ne 0 ]; then
  printf '%s\n' "$_wasm_test_output"
  echo "FAIL: tree-sitter corpus (wasm)" >&2
  exit 1
else
  printf '[tree-sitter corpus (wasm)] OK\n'
  printf '%s\n' "$_wasm_test_output"
fi
run_parallel "Python tests (tree-sitter + excel skill)" \
  "python3 -m pytest '$ROOT_DIR/tooling/tree-sitter-satsuma/scripts/' -v" \
  "python3 -m pytest '$ROOT_DIR/skills/excel-to-satsuma/scripts/test_excel_tool.py' -v"

# Smoke tests call the live satsuma CLI against real fixture files.
# They require satsuma on PATH and the pytest-bdd package.
# Skip gracefully if satsuma is not installed; fail clearly if pytest-bdd is missing.
if command -v satsuma &>/dev/null; then
  if ! python3 -c "import pytest_bdd" 2>/dev/null; then
    echo "ERROR: pytest-bdd not found. Install it with: pip install -r smoke-tests/requirements.txt" >&2
    exit 1
  fi
  run_step "smoke tests (BDD)" \
    python3 -m pytest "$ROOT_DIR/smoke-tests/" -v --tb=short
else
  printf '\n[smoke tests] SKIP — satsuma not on PATH. Install it first (e.g. npm install -g tooling/satsuma-cli/).\n'
fi
