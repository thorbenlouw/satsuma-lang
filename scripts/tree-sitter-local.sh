#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Using ROOT_DIR ${ROOT_DIR}"

CACHE_DIR="$ROOT_DIR/.cache"
STATE_DIR="$ROOT_DIR/.tree-sitter"
CONFIG_PATH="$STATE_DIR/config.json"

mkdir -p "$CACHE_DIR" "$CACHE_DIR/tree-sitter/lock" "$STATE_DIR"

if [ ! -f "$CONFIG_PATH" ]; then
  printf '{\n  "parser-directories": [\n    "%s/tooling"\n  ]\n}\n' "$ROOT_DIR" > "$CONFIG_PATH"
fi

export XDG_CACHE_HOME="$CACHE_DIR"
# Emscripten cache dir (for --wasm builds on macOS where Homebrew dir is read-only)
export EM_CACHE="${EM_CACHE:-$CACHE_DIR/emscripten}"
echo "Using XDG_CACHE_HOME ${XDG_CACHE_HOME}"

# Verify a working C compiler is available (tree-sitter compiles a native parser).
# Skip this check for generate (no compilation) or when --wasm is present.
_needs_cc() {
  case "$1" in generate|init|init-config|version|playground|complete) return 1 ;; esac
  return 0
}
if _needs_cc "${1:-}" && [[ ! " $* " =~ " --wasm " ]]; then
  if "${CC:-cc}" -x c -o /dev/null - <<< 'int main(){return 0;}' 2>/dev/null; then
    export CC="${CC:-cc}"
  elif /usr/bin/gcc -x c -o /dev/null - <<< 'int main(){return 0;}' 2>/dev/null; then
    export CC=/usr/bin/gcc
  else
    echo "ERROR: no working C compiler found. Run 'xcode-select --install' on macOS, or pass --wasm." >&2
    exit 1
  fi
fi

# Add locally-installed tree-sitter-cli to PATH
LOCAL_BIN="$ROOT_DIR/tooling/tree-sitter-stm/node_modules/.bin"
if [ -d "$LOCAL_BIN" ]; then
  export PATH="$LOCAL_BIN:$PATH"
fi

subcommand="${1:-}"

# Commands that accept --config-path
_accepts_config() {
  case "$1" in
    parse|highlight|query|tags|dump-languages|test) return 0 ;;
    *) return 1 ;;
  esac
}

# Commands that need --grammar-path extraction (cd into grammar dir)
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

# For all other subcommands, only inject --config-path if supported
shift
if _accepts_config "$subcommand"; then
  exec tree-sitter "$subcommand" --config-path "$CONFIG_PATH" "$@"
fi
exec tree-sitter "$subcommand" "$@"
