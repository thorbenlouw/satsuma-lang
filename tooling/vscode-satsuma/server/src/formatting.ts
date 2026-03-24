/**
 * formatting.ts — DocumentFormattingProvider for Satsuma LSP server
 *
 * Wires the shared format() function into the LSP formatting handler.
 * Returns a single TextEdit replacing the full document range.
 *
 * The canonical format() implementation lives in satsuma-cli/src/format.ts.
 *
 * Resolution strategy:
 * - **esbuild bundle**: require("satsuma-fmt") is resolved via an alias in
 *   esbuild.js to ../satsuma-cli/src/format.ts and inlined at build time.
 * - **tsc-compiled tests**: initFormatting() loads the CLI's compiled dist/
 *   module via dynamic import.
 */

import { TextEdit, Range, Position } from "vscode-languageserver";
import type { Tree } from "./parser-utils";

type FormatFn = (tree: unknown, source: string) => string;

let _formatFn: FormatFn | null = null;

// In the esbuild bundle, this require is resolved at build time via the alias.
// In tsc-compiled test output, it will fail (module not found) — that's fine,
// tests call initFormatting() which loads via dynamic import instead.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _mod = require("satsuma-fmt") as { format: FormatFn };
  _formatFn = _mod.format;
} catch {
  // Not in esbuild bundle context — initFormatting() will load it
}

/** Initialize the formatting module. Call in test setup to load the format function. */
export async function initFormatting(): Promise<void> {
  if (_formatFn) return;
  // Use a variable path so esbuild doesn't try to resolve this at bundle time.
  // This path is only used by tests running against tsc-compiled dist/ output.
  // CI must build satsuma-cli before running LSP tests.
  const modPath = ["../../../satsuma-cli", "dist", "format.js"].join("/");
  const mod = await import(modPath) as { format: FormatFn };
  _formatFn = mod.format;
}

/**
 * Compute formatting edits for a Satsuma document.
 * Returns a single TextEdit replacing the entire document if formatting
 * would change anything, or an empty array if already formatted.
 */
export function computeFormatting(tree: Tree, source: string): TextEdit[] {
  if (!_formatFn) return [];

  const formatted = _formatFn(tree, source);

  if (formatted === source) {
    return []; // Already formatted — no edits needed
  }

  // Replace the entire document
  const lines = source.split("\n");
  const lastLine = lines[lines.length - 1] ?? "";
  const fullRange = Range.create(
    Position.create(0, 0),
    Position.create(lines.length - 1, lastLine.length),
  );

  return [TextEdit.replace(fullRange, formatted)];
}
