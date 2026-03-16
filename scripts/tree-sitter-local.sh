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

# Add locally-installed tree-sitter-cli to PATH
LOCAL_BIN="$ROOT_DIR/tooling/tree-sitter-stm/node_modules/.bin"
if [ -d "$LOCAL_BIN" ]; then
  export PATH="$LOCAL_BIN:$PATH"
fi

subcommand="${1:-}"

if [ "$subcommand" = "parse" ] || [ "$subcommand" = "highlight" ] || [ "$subcommand" = "query" ] || [ "$subcommand" = "tags" ] || [ "$subcommand" = "dump-languages" ]; then
  grammar_dir=""
  args=()
  shift

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -p|--grammar-path)
        grammar_dir="$2"
        shift 2
        ;;
      *)
        args+=("$1")
        shift
        ;;
    esac
  done

  if [ -n "$grammar_dir" ]; then
    cd "$grammar_dir"
  fi

  exec tree-sitter "$subcommand" --config-path "$CONFIG_PATH" "${args[@]}"
fi

exec tree-sitter "$@"
