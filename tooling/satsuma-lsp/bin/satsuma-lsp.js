#!/usr/bin/env node

/**
 * Standalone entry point for the Satsuma Language Server.
 *
 * Usage:
 *   npx satsuma-lsp --stdio
 *
 * When invoked with --stdio, the server communicates over stdin/stdout using
 * the Language Server Protocol. This allows editors other than VS Code (e.g.
 * Neovim, Helix, Emacs) to use the Satsuma LSP directly.
 *
 * The bundled server.js is built by esbuild and already handles both IPC
 * (used by the VS Code extension) and stdio (used by --stdio) transport
 * via vscode-languageserver's createConnection(). When launched outside
 * VS Code, vscode-languageserver defaults to stdio transport.
 */

require("../dist/server.js");
