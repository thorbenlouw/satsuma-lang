#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="$ROOT_DIR/.cache"
STATE_DIR="$ROOT_DIR/.tree-sitter"
CONFIG_PATH="$STATE_DIR/config.json"

mkdir -p "$CACHE_DIR" "$CACHE_DIR/tree-sitter/lock" "$STATE_DIR"

if [ ! -f "$CONFIG_PATH" ]; then
  printf '{\n  "parser-directories": [\n    "%s/tooling"\n  ]\n}\n' "$ROOT_DIR" > "$CONFIG_PATH"
fi

export XDG_CACHE_HOME="$CACHE_DIR"

subcommand="${1:-}"

if [ "$subcommand" = "parse" ] || [ "$subcommand" = "highlight" ] || [ "$subcommand" = "query" ] || [ "$subcommand" = "tags" ] || [ "$subcommand" = "dump-languages" ]; then
  exec tree-sitter "$subcommand" --config-path "$CONFIG_PATH" "${@:2}"
fi

exec tree-sitter "$@"
