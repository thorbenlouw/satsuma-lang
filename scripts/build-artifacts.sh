#!/usr/bin/env bash
# build-artifacts.sh — build distributable artifacts for all Satsuma tooling
#
# Produces three artifacts:
#   1. VS Code extension    → tooling/vscode-satsuma/vscode-satsuma.vsix
#   2. LSP standalone pack  → tooling/satsuma-lsp/satsuma-lsp.tgz
#   3. CLI standalone pack  → tooling/satsuma-cli/satsuma-cli.tgz
#
# Prerequisites: run `npm run install:all` from the repo root first.
#
# Usage:
#   ./scripts/build-artifacts.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

VSIX_DIR="$REPO_ROOT/tooling/vscode-satsuma"
LSP_DIR="$REPO_ROOT/tooling/satsuma-lsp"
CLI_DIR="$REPO_ROOT/tooling/satsuma-cli"

# --------------------------------------------------------------------------- #
# Shared dependencies: build packages consumed by CLI, LSP, and extension
# --------------------------------------------------------------------------- #

echo "==> Building satsuma-core..."
npm --prefix "$REPO_ROOT/tooling/satsuma-core" run build

echo "==> Building satsuma-viz-backend..."
npm --prefix "$REPO_ROOT/tooling/satsuma-viz-backend" run build

echo "==> Building satsuma-viz..."
npm --prefix "$REPO_ROOT/tooling/satsuma-viz" run build

# --------------------------------------------------------------------------- #
# 1. VS Code extension (.vsix)
# --------------------------------------------------------------------------- #

echo "==> Packaging VS Code extension..."
(cd "$VSIX_DIR" && npm run package)

VSIX_PATH="$VSIX_DIR/vscode-satsuma.vsix"
if [ ! -f "$VSIX_PATH" ]; then
  echo "ERROR: vsix not found at $VSIX_PATH" >&2
  exit 1
fi

# --------------------------------------------------------------------------- #
# 2. LSP standalone npm tarball
# --------------------------------------------------------------------------- #

echo "==> Building and packing LSP server..."
npm --prefix "$LSP_DIR" run build

# Replace file: symlinks with real copies so the tarball is self-contained.
# The LSP depends on @satsuma/core, @satsuma/viz-model, and
# @satsuma/viz-backend via file: links.
CORE_SRC="$REPO_ROOT/tooling/satsuma-core"
VIZ_MODEL_SRC="$REPO_ROOT/tooling/satsuma-viz-model"
VIZ_BACKEND_SRC="$REPO_ROOT/tooling/satsuma-viz-backend"

LSP_CORE_DEST="$LSP_DIR/node_modules/@satsuma/core"
LSP_VIZ_DEST="$LSP_DIR/node_modules/@satsuma/viz-model"
LSP_VIZ_BACKEND_DEST="$LSP_DIR/node_modules/@satsuma/viz-backend"

for pair in \
  "$CORE_SRC:$LSP_CORE_DEST" \
  "$VIZ_MODEL_SRC:$LSP_VIZ_DEST" \
  "$VIZ_BACKEND_SRC:$LSP_VIZ_BACKEND_DEST"; do
  src="${pair%%:*}"
  dest="${pair##*:}"
  if [ -L "$dest" ] || [ -d "$dest" ]; then
    rm -rf "$dest"
    cp -rf "$src" "$dest"
    echo "  replaced symlink at $dest with real copy"
  fi
done

(cd "$LSP_DIR" && npm pack)

# Rename the versioned tarball to a stable name.
LSP_TARBALL=$(find "$LSP_DIR" -maxdepth 1 -name 'satsuma-lsp-*.tgz' -o -name 'at-satsuma-lsp-*.tgz' | head -1)
if [ -z "$LSP_TARBALL" ]; then
  echo "ERROR: npm pack did not produce a tarball in $LSP_DIR" >&2
  exit 1
fi

LSP_STABLE="$LSP_DIR/satsuma-lsp.tgz"
mv -f "$LSP_TARBALL" "$LSP_STABLE"

# --------------------------------------------------------------------------- #
# 3. CLI standalone npm tarball
# --------------------------------------------------------------------------- #

echo "==> Building and packing CLI..."
npm --prefix "$CLI_DIR" run build
npm --prefix "$CLI_DIR" run pack

CLI_PATH="$CLI_DIR/satsuma-cli.tgz"
if [ ! -f "$CLI_PATH" ]; then
  echo "ERROR: CLI tarball not found at $CLI_PATH" >&2
  exit 1
fi

# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #

echo ""
echo "Build complete. Artifacts:"
echo "  VSIX : $VSIX_PATH"
echo "  LSP  : $LSP_STABLE"
echo "  CLI  : $CLI_PATH"
